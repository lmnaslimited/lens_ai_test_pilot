import { clActionFactory, clConnectionFactory } from "../action";
import { fnGetDelay } from "../delay";
import { ifTestContext, ifTestRunner } from "../types";
import { clAuthService } from "./authService";
import { clReportService } from "./reportService";

export class clTestRunnerUiService implements ifTestRunner {
  constructor(
    private ldContext: ifTestContext,
    private ldAuth: clAuthService,
    private ldReport: clReportService,
    private readonly lTargetUrl: string,
    private readonly ldTestLabData: any,
    private readonly ldMestMasterData: any,
    private readonly ldLoginData: any
  ) {}

  // Entry point to execute a single test script
  executeScript(idScript: any) {
    this.setCurrentScript(idScript);
    this.loginForScript(idScript);
    this.visitApplication();

    this.injectDocumentIfRequired(idScript);
    this.runScriptActions(idScript);
    this.captureCreatedDocument(idScript);

    this.ldAuth.logout();
  }

  // Finalize execution and update test run logs
  finalizeScript() {
    if (!this.ldContext.currentScript) return;

    const LdLogs = this.buildLogEntries();
    const LdResult = this.ldContext.isTestPassed ? "Pass" : "Fail";
    const LaScriptNames = this.resolveScriptNames(this.ldContext.currentScript.name);

    LaScriptNames.forEach((iName) => {
      const LdScriptRow = this.findTestLabRow(iName);
      if (!LdScriptRow) return;

      this.postAndUpdateRunLog(LdScriptRow, iName, LdLogs, LdResult);
    });

    this.resetContext();
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

  /**
   * 
   * Reporting & logging
   */

  // Build combined log entries from context
  private buildLogEntries() {
    return [
      ...this.ldContext.capturedLogs.map((iMessage) => ({ type: "Log", message: iMessage })),
      ...this.ldContext.capturedErrors.map((iMessage) => ({ type: "Error", message: iMessage })),
    ];
  }

  // Resolve script names when multiple scripts are combined
  private resolveScriptNames(iName: string): string[] {
    return iName.includes("&")
      ? iName.split("&").map((iTrim) => iTrim.trim())
      : [iName];
  }

  // Post run log and update test log entries
  private postAndUpdateRunLog(
    idScriptRow: any,
    iName: string,
    laLogs: any[],
    lResult: string
  ) {
    // create the Run Log first
    this.ldReport
      .postRunLog({
        script_id: idScriptRow.test_script,
        master_data_id: iName,
        test_run_id: Cypress.env("FETCHED_TEST_RUN"),
        log_entries: laLogs,
      })
      .then((ldRunLogResponse: Cypress.Response<any>) => {
        const LRunLogId = ldRunLogResponse.body.data.name;

        return this.ldReport.getTestRun().then((ldTestRunResponse: Cypress.Response<any>) => {
          const laMatchingLogs = ldTestRunResponse.body.data.test_log.filter(
            (ldEntry: any) =>
              ldEntry.test_script === idScriptRow.test_script &&
              ldEntry.master_data === iName
          );
          // update the Test Log child table of the Test Run
          // with Run LOg id and Test Result (Pass / Fail)
          laMatchingLogs.forEach((idEntry: any) => {
            this.ldReport.updateTestLog(idEntry.name, {
              run_log: LRunLogId,
              result: lResult,
            });
          });
        });
      });
  }

  /**
   * Cleanup & utilities
   */

  // Reset execution context after script completion
  private resetContext() {
    this.ldContext.capturedErrors = [];
    this.ldContext.capturedLogs = [];
    this.ldContext.isTestPassed = true;
    this.ldContext.currentScript = null;
  }

  // Find test lab row by master data name
  private findTestLabRow(iMasterDataName: string) {
    return this.ldTestLabData.test_lab_script.find(
      (idRow: any) => idRow.master_data === iMasterDataName
    );
  }
}

/** API Test Type */
export class clTestRunnerApiService implements ifTestRunner {
  constructor(
    private ldContext: ifTestContext,
    private readonly lTargetUrl: string,
    private readonly ldLoginData: any,
    private readonly ldTestLabData: any,
    private ldReport: clReportService
  ) {}

  executeScript(idScript: any) {
    this.ldContext.currentScript = idScript;

    const LdCreds = this.ldLoginData[idScript.name];
    if (!LdCreds) {
      throw new Error(`No login credentials for ${idScript.name}`);
    }

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

  finalizeScript() {
    // uses same finalize logic as UI runner (handled in caller)
    if (!this.ldContext.currentScript) return;

    const LdLogs = this.buildLogEntries();
    const LdResult = this.ldContext.isTestPassed ? "Pass" : "Fail";
    const LaScriptNames = this.resolveScriptNames(this.ldContext.currentScript.name);

    LaScriptNames.forEach((iName) => {
      const LdScriptRow = this.findTestLabRow(iName);
      if (!LdScriptRow) return;

      this.postAndUpdateRunLog(LdScriptRow, iName, LdLogs, LdResult);
    });

    this.resetContext();
  }

  private buildLogEntries() {
    return [
      ...this.ldContext.capturedLogs.map((iMessage) => ({ type: "Log", message: iMessage })),
      ...this.ldContext.capturedErrors.map((iMessage) => ({ type: "Error", message: iMessage })),
    ];
  }

  // Resolve script names when multiple scripts are combined
  private resolveScriptNames(iName: string): string[] {
    return iName.includes("&")
      ? iName.split("&").map((iTrim) => iTrim.trim())
      : [iName];
  }

  // Find test lab row by master data name
  private findTestLabRow(iMasterDataName: string) {
    return this.ldTestLabData.test_lab_script.find(
      (idRow: any) => idRow.master_data === iMasterDataName
    );
  }

  // Post run log and update test log entries
  private postAndUpdateRunLog(
    idScriptRow: any,
    iName: string,
    laLogs: any[],
    lResult: string
  ) {
    // create the Run Log first
    this.ldReport
      .postRunLog({
        script_id: idScriptRow.test_script,
        master_data_id: iName,
        test_run_id: Cypress.env("FETCHED_TEST_RUN"),
        log_entries: laLogs,
      })
      .then((ldRunLogResponse: Cypress.Response<any>) => {
        const LRunLogId = ldRunLogResponse.body.data.name;

        return this.ldReport.getTestRun().then((ldTestRunResponse: Cypress.Response<any>) => {
          const laMatchingLogs = ldTestRunResponse.body.data.test_log.filter(
            (ldEntry: any) =>
              ldEntry.test_script === idScriptRow.test_script &&
              ldEntry.master_data === iName
          );
          // update the Test Log child table of the Test Run
          // with Run LOg id and Test Result (Pass / Fail)
          laMatchingLogs.forEach((idEntry: any) => {
            this.ldReport.updateTestLog(idEntry.name, {
              run_log: LRunLogId,
              result: lResult,
            });
          });
        });
      });
  }

  /**
   * Cleanup & utilities
   */

  // Reset execution context after script completion
  private resetContext() {
    this.ldContext.capturedErrors = [];
    this.ldContext.capturedLogs = [];
    this.ldContext.isTestPassed = true;
    this.ldContext.currentScript = null;
  }
}

/**
 * ApiBuilderFactory
 * Single source of truth for API execution
 */
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
    // 1️⃣ Login using username & password (session-based)
    this.login(targetUrl, auth).then(() => {
      const url = this.buildUrl(targetUrl, script);
      const payload = this.buildPayload(script)

      const requestOptions: Partial<Cypress.RequestOptions> = {
        method: script.action,
        url,
        failOnStatusCode: false,
      };
      
      if (script.action !== "GET" && payload) {
        requestOptions.body = payload;
      }
      
      cy.request(requestOptions as Cypress.RequestOptions).then((resp: Cypress.Response<any>) => {
        this.validateResponse(script, resp, payload, context);
      });
    });
  }

/**
   * Frappe session login
   */
private static login(targetUrl: string, auth: { user: string; pass: string }) {
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

  /**
   * URL builder
   * Handles:
   * - api_type = method | resource
   * - optional document
   * - filters
   */
  private static buildUrl(targetUrl: string, script: any): string {
    const laParts: string[] = [
      targetUrl,
      "api",
      script.api_type,
    ];

    if (script.api_type !== "method") {
      laParts.push(script.doctype_to_be_tested);
    }

    if (script.document) {
      laParts.push(script.document);
    }

    return `${laParts.join("/")}${this.buildFilters(script.filters)}`;
  }

  /**
   * Converts:
   * name=Morgan&status=Active
   * ->
   * ?filters=[["name","=","Morgan"],["status","=","Active"]]
   */
  private static buildFilters(iFilters?: string): string {
    if (!iFilters) return "";

    const laFilters = iFilters.split("&").map((pair: string) => {
      const [key, value] = pair.split("=");
      return [key, "=", value];
    });

    return `?filters=${encodeURIComponent(JSON.stringify(laFilters))}`;
  }

  /**
   * Payload builder
   * - POST / PUT → body
   * - GET → validation reference
   */
  private static buildPayload(script: any) {
    const ldDesc = script.actual_test_data[0]?.description;
    if (!ldDesc) return undefined;

    return typeof ldDesc === "string" ? JSON.parse(ldDesc) : ldDesc;
  }

  /**
   * Response validation & context update
   */
  private static validateResponse(
    script: any,
    resp: Cypress.Response<any>,
    payload: any,
    context: ifTestContext
  ) {
    cy.then(() => {
      // ---- STATUS VALIDATION ----
      if (resp.status >= 400) {
        const msg = `API ${script.action} failed for ${script.name} (Status ${resp.status})`;
  
        // Cypress UI
        cy.log(msg);
  
        // Run Log
        context.isTestPassed = false;
        context.capturedErrors.push(msg);
  
        throw new Error(msg);
      }
  
      if (script.action === "GET" && payload) {
        cy.then(() => {
          // Validate structure
          expect(resp.body).to.have.property("data");
          expect(resp.body.data).to.be.an("array");
          expect(resp.body.data.length).to.be.greaterThan(0);
      
          // Pick the first matching row
          const actualRow = resp.body.data[0];
      
          // Strict field-level assertions
          Object.entries(payload).forEach(([key, expected]) => {
            const actual = actualRow[key];
      
            cy.log(`Validating field: ${key}`);
            cy.log(`Expected: ${JSON.stringify(expected)}`);
            cy.log(`Actual: ${JSON.stringify(actual)}`);
      
            if (actual === undefined) {
              throw new Error(`Field '${key}' not found in response`);
            }
      
            expect(actual).to.deep.equal(expected);
      
            context.capturedLogs.push(
              `GET validation passed → ${key}: ${JSON.stringify(expected)}`
            );
          });
        });
      }
      
      
  
      // ---- FINAL SUCCESS LOG ----
      const successMsg = `API ${script.action} passed for ${script.name}`;
  
      // Cypress UI
      cy.log(successMsg);
    });
  }
  
}

/**
 * TestRunnerFactory creates appropriate test runner instances
 * based on the test type (UI or API).
 */
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
        return new clTestRunnerApiService(ldContext, lTargetUrl, ldLoginData, ldTestLabData, ldReport);

      default:
        throw new Error(`Unsupported test type: ${idScript.test_type}`);
    }
  }
}