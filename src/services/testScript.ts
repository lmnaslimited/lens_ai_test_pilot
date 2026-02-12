import { clActionFactory, clConnectionFactory } from "../action";
import { fnGetDelay } from "../delay";
import { ifTestContext, ifTestRunner } from "../types";
import { clAuthService } from "./authService";
import { clReportService } from "./reportService";


// Base Test Runner Service
// Provides shared execution and finalization behavior for all test runner types
export abstract class clTestRunnerService implements ifTestRunner {

  // Constructor initializes shared dependencies required by all runners
  constructor(
    protected ldContext: ifTestContext, // Holds runtime execution state (logs, errors, script reference)
    protected ldReport: clReportService, // Service responsible for posting and updating run logs
    protected ldTestLabData: any, // Cached Test Lab configuration used for script mapping
    protected lTargetUrl: string,
    protected ldAuth: clAuthService,
    protected ldLoginData: any
  ) {}

  // Abstract method enforcing subclasses (UI/API) to implement execution logic
  abstract executeScript(idScript: any): void;

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
      this.postAndUpdateRunLog(LdScriptRow, iName, LdLogs, LdResult);
    });

    // Clear execution state to prepare context for next script
    this.resetContext();
  }

  // Build structured log entries from captured logs and errors
  protected buildLogEntries() {
    // Transform captured success logs into standardized log objects
    // Transform captured error logs into standardized error objects
    // Merge both informational and error logs into a single array
    return [
      ...this.ldContext.capturedLogs.map((msg) => ({
        type: "Log",  // Mark entry as informational log
        message: msg, // Store original log message
      })),
      ...this.ldContext.capturedErrors.map((msg) => ({
        type: "Error", // Mark entry as error log
        message: msg,  // Store original error message
      })),
    ];
  }

  // Resolve script names, supporting multiple combined names separated by "&"
  protected resolveScriptNames(iName: string): string[] {
    // Check if script name contains multiple entries
    // If multiple scripts exist, split and trim each name
    // Otherwise return single script name as array
    return iName.includes("&")
      ? iName.split("&").map((iTrim) => iTrim.trim())
      : [iName];
  }

  // Locate matching Test Lab configuration row by master data name
  protected findTestLabRow(iMasterDataName: string) {
    // Search test_lab_script array for matching master_data field
    return this.ldTestLabData.test_lab_script.find(
      (idRow: any) => idRow.master_data === iMasterDataName
    );
  }

  // Create Run Log entry and update related Test Log child rows
  protected postAndUpdateRunLog(
    idScriptRow: any,
    iName: string,
    laLogs: any[],
    lResult: string
  ) {

    // Initiate Run Log creation via report service
    this.ldReport
      .postRunLog({
        // Associate Run Log with test script ID
        script_id: idScriptRow.test_script,
        // Associate Run Log with master data reference
        master_data_id: iName,
        // Link Run Log to current Test Run session
        test_run_id: Cypress.env("FETCHED_TEST_RUN"),
        // Attach structured log entries
        log_entries: laLogs,
      })
      // Process response after Run Log creation
      .then((ldRunLogResponse: Cypress.Response<any>) => {

        // Extract generated Run Log document ID
        const LRunLogId = ldRunLogResponse.body.data.name;

        // Retrieve full Test Run document to access child table
        return this.ldReport.getTestRun().then(
          (ldTestRunResponse: Cypress.Response<any>) => {

            // Filter child Test Log rows matching current script and master data
            const laMatchingLogs =
              ldTestRunResponse.body.data.test_log.filter(
                (ldEntry: any) =>
                  ldEntry.test_script === idScriptRow.test_script &&
                  ldEntry.master_data === iName
              );

            // Iterate through each matching Test Log row
            laMatchingLogs.forEach((idEntry: any) => {
              // Update Test Log row with Run Log reference and execution result
              this.ldReport.updateTestLog(idEntry.name, {
                run_log: LRunLogId,
                result: lResult,
              });
            });
          }
        );
      });
  }

  // Reset execution state in context to prepare for next script
  protected resetContext() {
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

// UI Test Runner Service
// Handles complete UI-based test execution lifecycle
export class clTestRunnerUiService extends clTestRunnerService {

  // Constructor injects UI-specific dependencies along with shared base dependencies
  constructor(
    ldContext: ifTestContext,                // Runtime execution context
    ldAuth: clAuthService,           // Authentication service for login/logout
    ldReport: clReportService,               // Reporting service
    lTargetUrl: string,     // Base application URL
    ldTestLabData: any,                      // Test Lab configuration data
    private readonly ldMestMasterData: any,  // Master data for UI execution
    ldLoginData: any        // Script-wise login credential mapping
  ) {
    super(ldContext, ldReport, ldTestLabData, lTargetUrl, ldAuth, ldLoginData); // Call base constructor
  }

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
      (x) => Number(x.idx) === Number(LdTestLabRow.use_docname)
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
    cy.wait(fnGetDelay("medium"));
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
        clActionFactory.createAction(idRow.action, LdData).executeAction();
      });
  }

  // Handle document creation logic for connection-based test cases
  private handleConnectionCreation(idScript: any) {
    // Skip if script is not configured for connection creation
    if (idScript.connection !== "Create" || !idScript.connection_doctype) return;

    // Execute connection handler to create document
    clConnectionFactory.connection(idScript).handleConnection().then((docname) => {
      // Ensure returned value is a valid document name
      if (typeof docname !== "string") return;
      // Store created document name for reuse in later scripts
      this.ldContext.createdDocnames.push(docname);
      // Store created document mapped by script index
      this.ldContext.createdDocsByIndex.push({
        [idScript.idx]: docname,
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
    cy.url().then((url: string) => {
      // Extract document identifier from URL path
      const docname = this.extractDocnameFromUrl(url);
      // Skip if extraction failed
      if (!docname) return;

      // Store document name in context mapped by Test Lab index
      this.ldContext.storeDocname.push({
        idx: LdTestLabRow.idx,
        docname,
      });
    });
  }

  // Extract last path segment from URL as document name
  private extractDocnameFromUrl(url: string): string | undefined {
    // Split URL into segments
    const LParts = url.split("/");
    // Return last non-empty segment
    return LParts.pop() || LParts.pop();
  }

}

// API Test Runner Service
// Responsible for executing API-based test scripts
export class clTestRunnerApiService extends clTestRunnerService {

  // Constructor injects API-specific dependencies along with shared base services
  constructor(
    ldContext: ifTestContext,             // Runtime execution context (logs, state, script ref)
    lTargetUrl: string,  // Base backend URL for API execution
    ldLoginData: any,    // Script-wise credential mapping
    ldAuth: clAuthService,
    ldTestLabData: any,                   // Test Lab configuration data
    ldReport: clReportService             // Reporting service for run logs
  ) {
    super(ldContext, ldReport, ldTestLabData, lTargetUrl, ldAuth, ldLoginData); // Initialize base runner
  }

  // Main method to execute API script
  executeScript(idScript: any) {

    // Store currently executing script in shared context
    this.ldContext.currentScript = idScript;

    // Fetch credentials mapped to script name
    const LdCreds = this.ldLoginData[idScript.name];
    // Stop execution if credentials are missing
    if (!LdCreds) {
      throw new Error(`No login credentials for ${idScript.name}`);
    }

    // Delegate execution to API builder factory
    ApiBuilderFactory.execute({
      ldAuth: this.ldAuth,
      targetUrl: this.lTargetUrl, // Backend base URL
      script: idScript,           // Script configuration
      auth: {
        user: LdCreds.email,      // Username for authentication
        pass: LdCreds.password,   // Password for authentication
      },
      context: this.ldContext,    // Shared execution context
    });
  }
}

// Factory responsible for constructing and executing API requests dynamically
class ApiBuilderFactory {

  // Entry method to execute API flow
  static execute({
    ldAuth,
    targetUrl,
    script,
    auth,
    context,
  }: {
    ldAuth: clAuthService;
    targetUrl: string;
    script: any;
    auth: { user: string; pass: string };
    context: ifTestContext;
  }) {

    // Perform login before executing actual API
    ldAuth.login(auth.user, auth.pass).then(() => {

      // Dynamically construct request URL
      const url = this.buildUrl(targetUrl, script);
      // Build request payload if applicable
      const payload = this.buildPayload(script);

      // Prepare Cypress request configuration
      const requestOptions: Partial<Cypress.RequestOptions> = {
        method: script.action,    // HTTP method (GET, POST, PUT, DELETE)
        url,                      // Fully constructed endpoint
        failOnStatusCode: false,  // Allow manual status validation
      };

      // Attach body only for non-GET requests
      if (script.action !== "GET" && payload) {
        requestOptions.body = payload;
      }

      // Execute API request
      cy.request(requestOptions as Cypress.RequestOptions)
        .then((resp: Cypress.Response<any>) => {

          // Validate response after execution
          this.validateResponse(script, resp, payload, context);
        });
    });
  }

  // Construct API endpoint dynamically based on script configuration
  private static buildUrl(targetUrl: string, script: any): string {
    // Start with base URL and API prefix
    const laParts: string[] = [targetUrl, "api", script.api_type];

    // Append doctype for resource APIs
    if (script.api_type !== "method") {
      laParts.push(script.doctype_to_be_tested);
    }

    // Append document name if provided
    if (script.document) {
      laParts.push(script.document);
    }

    // Join URL parts and append query parameters if present
    return `${laParts.join("/")}${this.buildParams(script.params)}`;
  }

  // Normalize query parameters by ensuring proper prefix
  private static buildParams(iParams?: string): string {
    // Return empty string if no parameters defined
    if (!iParams) return "";
    // Return as-is if already prefixed with '?'
    if (iParams.startsWith("?")) return iParams;
    // Otherwise prefix with '?'
    return `?${iParams}`;
  }

  // Build request payload from script test data
  private static buildPayload(script: any) {
    // Extract description field from first test data row
    const ldDesc = script.actual_test_data?.[0]?.description;
    // Return undefined if no payload provided
    if (!ldDesc) return undefined;
    // Parse JSON string if necessary, otherwise return object directly
    return typeof ldDesc === "string" ? JSON.parse(ldDesc) : ldDesc;
  }

  // Validate API response and update execution context
  private static validateResponse(
    script: any,
    resp: Cypress.Response<any>,
    payload: any,
    context: ifTestContext
  ) {

    // Fail execution if HTTP status indicates error
    if (resp.status >= 400) {
      // Prepare failure message
      const msg = `API ${script.action} failed for ${script.name}`;
      // Log failure in Cypress UI
      cy.log(msg);
      // Mark test context as failed
      context.isTestPassed = false;
      // Store error in context for reporting
      context.capturedErrors.push(msg);
      // Throw error to stop execution
      throw new Error(msg);
    }

    // Determine validation target based on API type
    const actualRow =
      script.api_type === "resource"
        ? resp.body.data?.[0]  // Resource APIs return data array
        : resp.body.message;   // Method APIs return message object

        // Perform field-level validation for GET requests
    if (script.action === "GET" && payload && actualRow) {
      // Compare each expected field against actual response
      Object.entries(payload).forEach(([key, expected]) => {
        expect(actualRow[key]).to.deep.equal(expected);
      });
    }
    // Log success message in Cypress UI
    cy.log(`API ${script.action} passed for ${script.name}`);
  }
}

// Factory responsible for instantiating correct runner based on test type
export class clTestRunnerFactory {

  // Create appropriate runner instance dynamically
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

    // Decide runner type based on script configuration
    switch (idScript.test_type) {

      // Create UI runner instance
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

      // Create API runner instance
      case "API":
        return new clTestRunnerApiService(
          ldContext,
          lTargetUrl,
          ldLoginData,
          ldAuth,
          ldTestLabData,
          ldReport
        );

      // Throw error if unsupported test type is encountered
      default:
        throw new Error(`Unsupported test type: ${idScript.test_type}`);
    }
  }
}
