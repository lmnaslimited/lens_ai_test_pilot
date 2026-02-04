import { clActionFactory, clConnectionFactory } from "../action";
import { fnGetDelay } from "../delay";
import { ifTestContext, ifTestRunner } from "../types";
import { clAuthService } from "./authService";
import { clReportService } from "./reportService";

export class clTestRunnerService implements ifTestRunner {
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
  // (used for connected test flows)
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

  // Handle document creation for connected scripts
  private handleConnectionCreation(idScript: any) {
    if (idScript.connection !== "Create" || !idScript.connection_doctype) return;

    clConnectionFactory.connection(idScript).handleConnection().then((docname) => {
      if (typeof docname !== "string") return;

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

class TestRunnerApiService implements ifTestRunner {
  constructor(private ldContext: ifTestContext) {}

  executeScript(idScript: any) {
    throw new Error("API Test Runner not implemented yet");
  }

  finalizeScript() {}
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
        return new clTestRunnerService(
          ldContext,
          ldAuth,
          ldReport,
          lTargetUrl,
          ldTestLabData,
          ldMestMasterData,
          ldLoginData
        );

      case "API":
        return new TestRunnerApiService(ldContext);

      default:
        throw new Error(`Unsupported test type: ${idScript.test_type}`);
    }
  }
}