import { clActionFactory, clConnectionFactory } from "../action";
import { fnGetDelay } from "../delay";
import { ifTestContext, ifTestRunner } from "../types";
import { clAuthService } from "./authService";
import { clReportService } from "./reportService";

/* ============================================================
   BASE CLASS
   ============================================================ */

/**
 * Base Test Runner Service
 * Contains common execution finalization logic
 */
export abstract class clTestRunnerService implements ifTestRunner {

  /**
   * Base constructor
   * Injects shared dependencies
   */
  constructor(
    protected ldContext: ifTestContext,
    protected ldReport: clReportService,
    protected ldTestLabData: any
  ) {}

  /**
   * Abstract execution method
   * Must be implemented by subclasses
   */
  abstract executeScript(idScript: any): void;

  /**
   * Finalize script execution
   * Responsible for logging & updating test run
   */
  finalizeScript() {

    // Exit if no active script
    if (!this.ldContext.currentScript) return;

    // Build combined log entries
    const LdLogs = this.buildLogEntries();

    // Determine result
    const LdResult = this.ldContext.isTestPassed ? "Pass" : "Fail";

    // Resolve multiple script names (if connected via &)
    const LaScriptNames = this.resolveScriptNames(
      this.ldContext.currentScript.name
    );

    // Iterate through each resolved script
    LaScriptNames.forEach((iName) => {

      // Find corresponding Test Lab row
      const LdScriptRow = this.findTestLabRow(iName);
      if (!LdScriptRow) return;

      // Post run log & update child test log rows
      this.postAndUpdateRunLog(LdScriptRow, iName, LdLogs, LdResult);
    });

    // Reset context after completion
    this.resetContext();
  }

  /**
   * Build combined logs
   */
  protected buildLogEntries() {
    return [
      ...this.ldContext.capturedLogs.map((msg) => ({
        type: "Log",
        message: msg,
      })),
      ...this.ldContext.capturedErrors.map((msg) => ({
        type: "Error",
        message: msg,
      })),
    ];
  }

  /**
   * Resolve script names (handles A & B)
   */
  protected resolveScriptNames(iName: string): string[] {
    return iName.includes("&")
      ? iName.split("&").map((iTrim) => iTrim.trim())
      : [iName];
  }

  /**
   * Find test lab row by master data
   */
  protected findTestLabRow(iMasterDataName: string) {
    return this.ldTestLabData.test_lab_script.find(
      (idRow: any) => idRow.master_data === iMasterDataName
    );
  }

  /**
   * Post run log & update test log rows
   */
  protected postAndUpdateRunLog(
    idScriptRow: any,
    iName: string,
    laLogs: any[],
    lResult: string
  ) {

    // Create Run Log
    this.ldReport
      .postRunLog({
        script_id: idScriptRow.test_script,
        master_data_id: iName,
        test_run_id: Cypress.env("FETCHED_TEST_RUN"),
        log_entries: laLogs,
      })
      .then((ldRunLogResponse: Cypress.Response<any>) => {

        // Extract Run Log ID
        const LRunLogId = ldRunLogResponse.body.data.name;

        // Fetch Test Run
        return this.ldReport.getTestRun().then(
          (ldTestRunResponse: Cypress.Response<any>) => {

            // Filter matching Test Log child rows
            const laMatchingLogs =
              ldTestRunResponse.body.data.test_log.filter(
                (ldEntry: any) =>
                  ldEntry.test_script === idScriptRow.test_script &&
                  ldEntry.master_data === iName
              );

            // Update each Test Log row
            laMatchingLogs.forEach((idEntry: any) => {
              this.ldReport.updateTestLog(idEntry.name, {
                run_log: LRunLogId,
                result: lResult,
              });
            });
          }
        );
      });
  }

  /**
   * Reset execution context
   */
  protected resetContext() {
    this.ldContext.capturedErrors = [];
    this.ldContext.capturedLogs = [];
    this.ldContext.isTestPassed = true;
    this.ldContext.currentScript = null;
  }
}

/* ============================================================
   UI RUNNER
   ============================================================ */

export class clTestRunnerUiService extends clTestRunnerService {

  constructor(
    ldContext: ifTestContext,
    private ldAuth: clAuthService,
    ldReport: clReportService,
    private readonly lTargetUrl: string,
    ldTestLabData: any,
    private readonly ldMestMasterData: any,
    private readonly ldLoginData: any
  ) {
    super(ldContext, ldReport, ldTestLabData);
  }

  /**
   * Execute UI Script
   */
  executeScript(idScript: any) {
    this.setCurrentScript(idScript);
    this.loginForScript(idScript);
    this.visitApplication();

    this.injectDocumentIfRequired(idScript);
    this.runScriptActions(idScript);
    this.captureCreatedDocument(idScript);

    this.ldAuth.logout();
  }
  /**
   * 
   * Context & setup
   */

  // Store the currently executing script in context
  private setCurrentScript(idScript: any) {
    this.ldContext.currentScript = idScript;
  }

  // Login using credentials mapped to the script
  private loginForScript(idScript: any) {
    const LdCreds = this.ldLoginData[idScript.name];

    if (!LdCreds) {
      throw new Error(`No login credentials for ${idScript.name}`);
    }

    this.ldAuth.login(LdCreds.email, LdCreds.password);
  }

  // Navigate to the application after login
  private visitApplication() {
    cy.visit(`${this.lTargetUrl}/app`);
  }

  /**
   * 
   * Script execution helpers
   */

  // Inject previously created document name into the script
  // (used for getting document name test flows)
  private injectDocumentIfRequired(idScript: any) {
    if (!idScript.actual_test_data) return;

    const LdTestLabRow = this.findTestLabRow(idScript.name);
    if (!LdTestLabRow?.use_docname) return;

    const LdStoredDoc = this.ldContext.storeDocname.find(
      (x) => Number(x.idx) === Number(LdTestLabRow.use_docname)
    );

    if (LdStoredDoc?.docname) {
      idScript.document = LdStoredDoc.docname;
    }
  }

  // Execute all actions defined for the script
  private runScriptActions(idScript: any) {
    if (!idScript.actual_test_data) return;

    this.initializeActions(idScript);
    this.executeActionRows(idScript);
    this.handleConnectionCreation(idScript);

    cy.wait(fnGetDelay("medium"));
  }

  // Initialize script-level actions
  private initializeActions(idScript: any) {
    // navigate to new form or required document
    clActionFactory.executeAction(idScript).executeTestAction()
  }
  // Execute each action row defined in the script
  private executeActionRows(idScript: any) {
    idScript.actual_test_data
      .filter((idRow: any) => idRow.action)
      .forEach((idRow: any) => {
        const LdData = clActionFactory.filterActionData(
          idScript.actual_test_data,
          idRow
        );

        clActionFactory.createAction(idRow.action, LdData).executeAction();
      });
  }

  // Handle document creation for connection Test Cases
  private handleConnectionCreation(idScript: any) {
    if (idScript.connection !== "Create" || !idScript.connection_doctype) return;

    clConnectionFactory.connection(idScript).handleConnection().then((docname) => {
      if (typeof docname !== "string") return;
      // updating the document name created from connection
      // for next test script
      this.ldContext.createdDocnames.push(docname);
      this.ldContext.createdDocsByIndex.push({
        [idScript.idx]: docname,
      });
    });
  }

  /**
   * 
   * Document & URL handling
   */

  // Capture created document name from the URL
  // and store it for later reuse
  private captureCreatedDocument(idScript: any) {
    const LdTestLabRow = this.findTestLabRow(idScript.name);
    if (!LdTestLabRow) return;

    cy.url().then((url: string) => {
      const docname = this.extractDocnameFromUrl(url);
      if (!docname) return;

      this.ldContext.storeDocname.push({
        idx: LdTestLabRow.idx,
        docname,
      });
    });
  }

  // Extract document name from URL
  private extractDocnameFromUrl(url: string): string | undefined {
    const LParts = url.split("/");
    return LParts.pop() || LParts.pop();
  }

}

/* ============================================================
   API RUNNER
   ============================================================ */

export class clTestRunnerApiService extends clTestRunnerService {

  constructor(
    ldContext: ifTestContext,
    private readonly lTargetUrl: string,
    private readonly ldLoginData: any,
    ldTestLabData: any,
    ldReport: clReportService
  ) {
    super(ldContext, ldReport, ldTestLabData);
  }

  /**
   * Execute API Script
   */
  executeScript(idScript: any) {

    // Store current script
    this.ldContext.currentScript = idScript;

    // Fetch credentials
    const LdCreds = this.ldLoginData[idScript.name];
    if (!LdCreds) {
      throw new Error(`No login credentials for ${idScript.name}`);
    }

    // Execute API builder
    ApiBuilderFactory.execute({
      targetUrl: this.lTargetUrl,
      script: idScript,
      auth: {
        user: LdCreds.email,
        pass: LdCreds.password,
      },
      context: this.ldContext,
    });
  }
}

/* ============================================================
   API BUILDER FACTORY
   ============================================================ */

class ApiBuilderFactory {

  static execute({
    targetUrl,
    script,
    auth,
    context,
  }: {
    targetUrl: string;
    script: any;
    auth: { user: string; pass: string };
    context: ifTestContext;
  }) {

    // Login first
    this.login(targetUrl, auth).then(() => {

      const url = this.buildUrl(targetUrl, script);
      const payload = this.buildPayload(script);

      const requestOptions: Partial<Cypress.RequestOptions> = {
        method: script.action,
        url,
        failOnStatusCode: false,
      };

      if (script.action !== "GET" && payload) {
        requestOptions.body = payload;
      }

      cy.request(requestOptions as Cypress.RequestOptions)
        .then((resp: Cypress.Response<any>) => {

          this.validateResponse(script, resp, payload, context);
        });
    });
  }

  private static login(targetUrl: string, auth: any) {
    return cy.request({
      method: "POST",
      url: `${targetUrl}/api/method/login`,
      form: true,
      body: {
        usr: auth.user,
        pwd: auth.pass,
      },
    });
  }

  private static buildUrl(targetUrl: string, script: any): string {
    const laParts: string[] = [targetUrl, "api", script.api_type];

    if (script.api_type !== "method") {
      laParts.push(script.doctype_to_be_tested);
    }

    if (script.document) {
      laParts.push(script.document);
    }

    return `${laParts.join("/")}${this.buildParams(script.params)}`;
  }

  private static buildParams(iParams?: string): string {
    if (!iParams) return "";
    if (iParams.startsWith("?")) return iParams;
    return `?${iParams}`;
  }

  private static buildPayload(script: any) {
    const ldDesc = script.actual_test_data?.[0]?.description;
    if (!ldDesc) return undefined;
    return typeof ldDesc === "string" ? JSON.parse(ldDesc) : ldDesc;
  }

  private static validateResponse(
    script: any,
    resp: Cypress.Response<any>,
    payload: any,
    context: ifTestContext
  ) {

    if (resp.status >= 400) {
      const msg = `API ${script.action} failed for ${script.name}`;
      cy.log(msg);
      context.isTestPassed = false;
      context.capturedErrors.push(msg);
      throw new Error(msg);
    }

    const actualRow =
      script.api_type === "resource"
        ? resp.body.data?.[0]
        : resp.body.message;

    if (script.action === "GET" && payload && actualRow) {
      Object.entries(payload).forEach(([key, expected]) => {
        expect(actualRow[key]).to.deep.equal(expected);
      });
    }

    cy.log(`API ${script.action} passed for ${script.name}`);
  }
}

/* ============================================================
   FACTORY
   ============================================================ */

export class clTestRunnerFactory {

  static create(
    idScript: any,
    ldContext: ifTestContext,
    ldAuth: clAuthService,
    ldReport: clReportService,
    lTargetUrl: string,
    ldTestLabData: any,
    ldMestMasterData: any,
    ldLoginData: any
  ): ifTestRunner {

    switch (idScript.test_type) {

      case "UI":
        return new clTestRunnerUiService(
          ldContext,
          ldAuth,
          ldReport,
          lTargetUrl,
          ldTestLabData,
          ldMestMasterData,
          ldLoginData
        );

      case "API":
        return new clTestRunnerApiService(
          ldContext,
          lTargetUrl,
          ldLoginData,
          ldTestLabData,
          ldReport
        );

      default:
        throw new Error(`Unsupported test type: ${idScript.test_type}`);
    }
  }
}
