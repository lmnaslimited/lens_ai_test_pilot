import { clActionFactory, clConnectionFactory } from "../action";
import { fnGetDelay } from "../delay";
import { ifTestContext, ifTestRunner } from "../types";
import { clAuthService } from "./authService";
import { clReportService } from "./reportService";

// UI Test Runner Service
// Handles complete UI-based test execution lifecycle
export class clTestRunnerUiService {

  // Constructor injects UI-specific dependencies along with shared base dependencies
  constructor(
    protected ldContext: ifTestContext,                // Runtime execution context
    protected ldAuth: clAuthService,                   // Authentication service for login/logout
    protected ldReport: clReportService,               // Reporting service
    protected lTargetUrl: string,                      // Base application URL
    protected ldTestLabData: any,                      // Test Lab configuration data
    private readonly ldMestMasterData: any,  // Master data for UI execution
    protected ldLoginData: any                         // Script-wise login credential mapping
  ) {}

  // Main entry method to execute a UI script
  executeScript(idScript: any) {
    // Store current script in shared execution context
    this.setCurrentScript(idScript);
    // Perform login using mapped credentials
    this.loginForScript(idScript);
    // Navigate to application landing page
    this.visitApplication();

    // Inject stored document name if script depends on previous document
    this.injectDocumentIfRequired(idScript);
    // Execute defined UI actions for the script
    this.runScriptActions(idScript);
    // Capture newly created document name from URL
    this.captureCreatedDocument(idScript);

    // Logout after script execution completes
    this.ldAuth.logout();
  }

  // Store the currently executing script reference in context
  private setCurrentScript(idScript: any) {
    this.ldContext.currentScript = idScript;
  }

  // Perform login using credentials mapped by script name
  private loginForScript(idScript: any) {
    // Fetch credentials using script name as key
    const LdCreds = this.ldLoginData[idScript.name];

    // Throw error if credentials are not configured
    if (!LdCreds) {
      throw new Error(`No login credentials for ${idScript.name}`);
    }

    // Execute login using authentication service
    this.ldAuth.login(LdCreds.email, LdCreds.password);
  }

  // Navigate to the main application page after login
  private visitApplication() {
    cy.visit(`${this.lTargetUrl}/app`);
    this.waitForUiReady();
  }

  // Locate matching Test Lab configuration row by master data name
  protected findTestLabRow(iMasterDataName: string) {
  
    // Resolve script names if combined using "&"
    const laResolvedNames = this.resolveScriptNames(iMasterDataName);
  
    // Always use only the first script name for Test Lab lookup
    const lPrimaryName = laResolvedNames[0];
  
    // Search test_lab_script array for matching master_data field
    return this.ldTestLabData.test_lab_script.find(
      (idRow: any) =>
        idRow.master_data === lPrimaryName &&
        idRow.idx === this.ldContext.currentScriptRowIdx
    );
  }

  // Inject previously stored document name into script before execution
  private injectDocumentIfRequired(idScript: any) {
    // Skip if script has no action data
    if (!idScript.actual_test_data) return;

    // Retrieve corresponding Test Lab configuration
    const LdTestLabRow = this.findTestLabRow(idScript.name);
    // Skip if script does not require document name reuse
    if (!LdTestLabRow?.use_docname) return;

    // Locate stored document based on configured index
    const LdStoredDoc = this.ldContext.storeDocname.find(
      (iIndex) => Number(iIndex.idx) === Number(LdTestLabRow.use_docname)
    );
    
    // Inject document name into script if found
    if (LdStoredDoc?.docname) {
      idScript.document = LdStoredDoc.docname;
    }
  }

  // Execute full UI action flow defined for the script
  private runScriptActions(idScript: any) {
    // Skip if no test data rows exist
    if (!idScript.actual_test_data) return;
    // Execute script-level initialization action
    this.initializeActions(idScript);
    // Execute each defined action row
    this.executeActionRows(idScript);
    // Handle connection-based document creation if required
    this.handleConnectionCreation(idScript);

    // Wait to allow UI stabilization after execution
    // cy.wait(fnGetDelay("medium"));
    this.waitForUiReady();
  }

  // Execute top-level(Parent) script initialization action
  private initializeActions(idScript: any) {
    // Create and execute primary navigation/form open action
    clActionFactory.executeAction(idScript).executeTestAction()
  }
  // Execute each row-level action defined inside script
  private executeActionRows(idScript: any) {
    // Filter rows that contain valid action definitions
    idScript.actual_test_data
      .filter((idRow: any) => idRow.action)
      .forEach((idRow: any) => {  // Iterate through each action row
        // Extract required data subset for current action
        const LdData = clActionFactory.filterActionData(
          idScript.actual_test_data,
          idRow
        );

        // Create action instance dynamically and execute it
        clActionFactory.createAction(idRow.action, LdData, this.ldContext, this.ldTestLabData).executeAction();
      });
  }

  // Handle document creation logic for connection-based test cases
  private handleConnectionCreation(idScript: any) {
    // Skip if script is not configured for connection creation
    if (idScript.connection !== "Create" || !idScript.connection_doctype) return;

    // Execute connection handler to create document
    clConnectionFactory.connection(idScript).handleConnection().then((iDocname) => {
      // Ensure returned value is a valid document name
      if (typeof iDocname !== "string") return;
      // Store created document name for reuse in later scripts
      this.ldContext.createdDocnames.push(iDocname);
      // Store created document mapped by script index
      this.ldContext.createdDocsByIndex.push({
        [idScript.idx]: iDocname,
      });
    });
  }

  // Capture created document name from current URL and store for reuse
  private captureCreatedDocument(idScript: any) {
    // Retrieve Test Lab configuration row
    const LdTestLabRow = this.findTestLabRow(idScript.name);
    // Skip if configuration not found
    if (!LdTestLabRow) return;

    // Read current browser URL after execution
    // cy.url().then((iUrl: string) => {
    // Read current browser path after execution.
    // Using pathname keeps extraction consistent and avoids query/hash noise.
    cy.location("pathname", { timeout: fnGetDelay("long") }).then((iUrl: string) => {
      // Extract document identifier from URL path
      if(!iUrl) {return}
      const docname = this.extractDocnameFromUrl(iUrl);
      // Skip if extraction failed
      if (!docname) return;

      // Store document name in context mapped by Test Lab index
      // this.ldContext.storeDocname.push({
      //   idx: LdTestLabRow.idx,
      //   docname,
      // });
      this.upsertStoredDocname(LdTestLabRow.idx, docname);
    });
    cy.wait(fnGetDelay("long"));
  }

  // Extract last path segment from URL as document name
  private extractDocnameFromUrl(iUrl: string): string | undefined {
    // Split URL into segments
    // const LParts = iUrl.split("/");
    // // Return last non-empty segment
    // return LParts.pop() || LParts.pop();
    // Normalize input (supports full URL and pathname)
    const LCleanedPath = iUrl
      .replace(/^[a-z]+:\/\/[^/]+/i, "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    // Split and remove empty segments
    const LParts = LCleanedPath.split("/").filter(Boolean);

    // Valid document pages follow /app/<doctype>/<docname>
    if (LParts.length < 3 || LParts[0] !== "app") {
      return undefined;
    }

    // Return document name segment only
    return decodeURIComponent(LParts[2]);
  }

  // Insert or update stored document reference by idx
    private upsertStoredDocname(iIdx: number, iDocname: string): void {
      const LExistingIndex = this.ldContext.storeDocname.findIndex(
        (iItem) => Number(iItem.idx) === Number(iIdx)
      );

      if (LExistingIndex >= 0) {
        this.ldContext.storeDocname[LExistingIndex] = {
          idx: iIdx,
          docname: iDocname,
        };
        return;
      }

      this.ldContext.storeDocname.push({
        idx: iIdx,
        docname: iDocname,
      });
  }
  private waitForUiReady() {
    // Ensure DOM is fully parsed/rendered
    cy.document().its("readyState").should("eq", "complete");

    // Wait for common frappe loading overlays/spinners to disappear
    cy.get("body", { timeout: fnGetDelay("long") * 10 }).should(($body) => {
      expect($body.find(".freeze, .freeze-ui, .modal-backdrop.show").length).to.eq(0);
    });

    // Small settle buffer after app becomes interactive
    cy.wait(fnGetDelay("short"));
  }
  // Finalizes execution of the currently active script
  finalizeScript() {

    // Prevent execution if no script is currently stored in context
    if (!this.ldContext.currentScript) return;

    // Combine captured logs and errors into a structured log array
    const LdLogs = this.buildLogEntries();

    // Determine overall result based on context pass/fail state
    const LdResult = this.ldContext.isTestPassed ? "Pass" : "Fail";

    // Resolve script names in case multiple scripts are combined using '&'
    const LaScriptNames = this.resolveScriptNames(
      this.ldContext.currentScript.name
    );

    // Iterate through each resolved script name
    LaScriptNames.forEach((iName) => {
      
      // Locate the corresponding Test Lab row using master data name
      const LdScriptRow = this.findTestLabRow(iName);
      // Skip processing if no matching Test Lab configuration is found
      if (!LdScriptRow) return;
      
      // Create run log entry and update associated Test Log child records
      // this.postAndUpdateRunLog(LdScriptRow, iName, LdLogs, LdResult);
      this.ldContext.currentScriptRowIdx++;
    });

    // Clear execution state to prepare context for next script
    this.resetContext();
  }

  // Build structured log entries from captured errors
  private buildLogEntries() {
    // Transform captured error logs into standardized error objects
    return [
      ...this.ldContext.capturedErrors.map((iMessage) => ({
        type: "Error", // Mark entry as error log
        message: iMessage,  // Store original error message
      })),
    ];
  }

  // Resolve script names, supporting multiple combined names separated by "&"
  private resolveScriptNames(iName: string): string[] {
    // Check if script name contains multiple entries
    // If multiple scripts exist, split and trim each name
    // Otherwise return single script name as array
    return iName.includes("&")
      ? iName.split("&").map((iTrim) => iTrim.trim())
      : [iName];
  }

  // Create Run Log entry and update related Test Log child rows
  protected postAndUpdateRunLog(
    idScriptRow: any,
    iName: string,
    laLogs: any[],
    lResult: string
  ) {

    // Determine whether the test execution has failed
    const LIsFailed = lResult === "Fail";

    // Fetch the full Test Run document in order to access
    // the child table "test_log"
    return this.ldReport.getTestRun().then(
      (ldTestRunResponse: Cypress.Response<any>) => {

        // Identify matching child Test Log rows corresponding
        // to the current script + master data + index
        const laMatchingLogs =
          ldTestRunResponse.body.data.test_log.filter(
            (ldEntry: any) =>
              ldEntry.test_script === idScriptRow.test_script &&
              ldEntry.master_data === iName &&
              Number(ldEntry.idx) === Number(idScriptRow.idx)
          );
      // Common function to update child rows
        const updateChildRows = (runLogId: string | null) => {
        const payload = {
          result: LIsFailed ? "Fail" : "Pass",
          run_log: runLogId,
        };

        return cy.wrap(laMatchingLogs).each((idEntry: any) => {
            return this.ldReport.updateTestLog(idEntry.name, payload);
          });
      };
      // PASS → just update result
        if (!LIsFailed) {
          return updateChildRows(null);
        }
     // FAIL without logs (uncaught error case)
     // Still mark as Fail, but do not create Run Log
        if (!laLogs?.length) {
          return updateChildRows(null);
        }
        // FAIL with logs → create Run Log first
        return this.ldReport
          .postRunLog({
            script_id: idScriptRow.test_script,      // Link to Test Script
            master_data_id: iName,                   // Link to Master Data
            test_run_id: Cypress.env("FETCHED_TEST_RUN"), // Current Test Run
            log_entries: laLogs,                     // Captured error logs
          })
          .then((ldRunLogResponse: Cypress.Response<any>) => {

            // Extract newly created Run Log document ID
            const LRunLogId = ldRunLogResponse.body.data.name;

              return updateChildRows(LRunLogId)
            });
      }
    );
  }

  // Reset execution state in context to prepare for next script
  private resetContext() {
    // Clear captured error messages
    this.ldContext.capturedErrors = [];
    // Clear captured informational logs
    this.ldContext.capturedLogs = [];
    // Reset pass/fail status to default true
    this.ldContext.isTestPassed = true;
    // Remove reference to current executing script
    this.ldContext.currentScript = null;
  }
}
