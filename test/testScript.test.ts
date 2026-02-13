import { clTestRunnerFactory, clTestRunnerUiService, clTestRunnerApiService } from "../src/services/testScript";
import { ifTestContext } from "../src/types";
import { clAuthService } from "../src/services/authService";
import { clReportService } from "../src/services/reportService";
import { jest, beforeEach, describe, expect, it } from "@jest/globals";
import { clConnectionFactory } from "../src/action";


// Target base URL used by the test runner
const LTargetUrl = "http://localhost:3000";

/**GLOBAL CYPRESS MOCKS
* Cypress APIs exist only in browser runtime.
* Jest runs in Node, so we mock ONLY what is used.
* Purpose:
* - prevent real browser execution
* - allow assertions on navigation and timing intent*/
(globalThis as any).cy = {
visit: jest.fn(), // used for navigation after login
wait: jest.fn(), // used for execution delays
url: jest.fn(),// used for capturing created documents
 log: jest.fn(),  
};

/**Cypress.env is accessed during execution.
* Mocking avoids runtime crashes inside Jest.*/
(globalThis as any).Cypress = {
env: jest.fn(),
};

describe("Test Script Module", () => {
let ldContext: ifTestContext;

// Creates a fresh test context for every test case
// It stores things like created documents, logs, errors,& test status
// A new context is created each time to ensure:
// - no leftover data from previous tests
// - tests do not affect each other
// - results remain predictable and reliable
const LdCreateContext = (): ifTestContext =>
({
currentScript: null, // script currently under execution
createdDocnames: [], // documents created via UI actions
storeDocname: [], // stored docnames for later reference
createdDocsByIndex: [], // indexed document storage
capturedLogs: [], // logs captured during run
capturedErrors: [], // errors captured during run
isTestPassed: true, // execution result flag
} as ifTestContext);

/**Auth service mock
* - avoids real login/logout
* - allows call & argument verification */
const LdCreateAuthMock = (): clAuthService =>
({
login: jest.fn(),// verifies login invocation & arguments
logout: jest.fn(), // verifies logout is triggered once
} as unknown as clAuthService);

/** Report service mock
* - avoids backend calls
* - validates interaction only */
const LdCreateReportMock = (): clReportService =>
({
postRunLog: jest.fn(), // run summary logging
getTestRun: jest.fn(), // fetch existing test run
updateTestLog: jest.fn(), // update test execution result
} as unknown as clReportService);

beforeEach(() => {
ldContext = LdCreateContext(); // Given: a clean execution context
// Reset all mocks to avoid call leakage across tests
jest.clearAllMocks();
});

// Factory & Construction
describe("clTestRunnerFactory", () => {
let ldScript: any;
let ldAuth: clAuthService;
let ldReport: clReportService;

beforeEach(() => {
// Given: a valid UI test script definition
ldScript = { test_type: "UI" };
// Given: mocked dependencies
ldAuth = LdCreateAuthMock();
ldReport = LdCreateReportMock();
});

it("should create a UI TestRunnerService instance", () => {
// When: factory is asked to create a runner
const LdRunner = clTestRunnerFactory.create(
ldScript,
ldContext,
ldAuth,
ldReport,
LTargetUrl,
{}, // test lab data (not relevant for this test)
{}, // test master data
{} // connection configuration
);
// Then: correct service implementation is returned
expect(LdRunner).toBeInstanceOf(clTestRunnerUiService);
});

it("should inject the same context reference into the service", () => {
// When: runner is created
const LdRunner = clTestRunnerFactory.create(
ldScript,
ldContext,
ldAuth,
ldReport,
LTargetUrl,
{},
{},
{}
) as clTestRunnerUiService;
// Then: the exact same context object is used
// This verifies dependency wiring, not execution behavior
expect((LdRunner as any).ldContext).toBe(ldContext);
});

it("should throw error for unsupported test type", () => {
// Given: an invalid / unsupported test type
ldScript = { test_type: "UNKNOWN" };
expect(() => {
clTestRunnerFactory.create(
ldScript,
ldContext,
ldAuth,
ldReport,
LTargetUrl,
{},
{},
{}
);
}).toThrow(`Unsupported test type: ${ldScript.test_type}`);
});
});

// Script Execution & Internals
describe("clTestRunnerUiService", () => {
let ldService: clTestRunnerUiService;
// executeScript()
describe("clTestRunnerUiService - executeScript ()", () => { 
let ldAuth: clAuthService;
let ldReport: clReportService;

const LLoginData = {
TestScript1: {
email: "test@example.com",
password: "secret",
},
};

const LdCreateContext = () =>
new clTestRunnerUiService(
ldContext,
ldAuth,
ldReport,
LTargetUrl,
{ test_lab_script: [] },
{},
LLoginData
);

const LdRunScript = () =>
ldService.executeScript({ name: "TestScript1" } as any);

beforeEach(() => {
ldAuth = LdCreateAuthMock();
ldReport = LdCreateReportMock();
ldService = LdCreateContext();
});

it("sets currentScript on execution start", () => {
const LdScript = { name: "TestScript1" };
ldService.executeScript(LdScript as any);
expect(ldContext.currentScript).toBe(LdScript);
});

it("overwrites previously set currentScript", () => {
ldContext.currentScript = { name: "OldScript" } as any;
LdRunScript();
expect(ldContext.currentScript?.name).toBe("TestScript1");
});

it("calls login exactly once per execution", () => {
LdRunScript();
expect(ldAuth.login).toHaveBeenCalledTimes(1);
});

it("navigates to /app after login", () => {
LdRunScript();
expect(cy.visit).toHaveBeenCalledWith(`${LTargetUrl}/app`);
});

it("logs out after script execution", () => {
LdRunScript();
expect(ldAuth.logout).toHaveBeenCalled();
});

it("throws error if script name is missing", () => {
expect(() => ldService.executeScript({} as any)).toThrow();
});

it("throws meaningful error when login credentials are missing", () => {
expect(() =>
ldService.executeScript({ name: "UnknownScript" } as any)
).toThrow("No login credentials for UnknownScript");
});

it("does not modify createdDocnames when no documents are created", () => {
LdRunScript();
expect(ldContext.createdDocnames.length).toBe(0);
});

it("does not modify createdDocsByIndex when no data is present", () => {
LdRunScript();
expect(ldContext.createdDocsByIndex.length).toBe(0);
});

it("does not mark test as failed on successful execution", () => {
LdRunScript();
expect(ldContext.isTestPassed).toBe(true);
});

it("does not push errors when execution is clean", () => {
LdRunScript();
expect(ldContext.capturedErrors.length).toBe(0);
});

it("does not crash when actual_test_data is null", () => {
expect(() =>
ldService.executeScript({
name: "TestScript1",
actual_test_data: null,
} as any)
).not.toThrow();
});

it("does not mutate loginData during execution", () => {
const LSnapshot = JSON.stringify(LLoginData);
LdRunScript();
expect(JSON.stringify(LLoginData)).toBe(LSnapshot);
});

it("can be executed multiple times with same script safely", () => {
LdRunScript();
LdRunScript();
expect(ldAuth.login).toHaveBeenCalledTimes(2);
expect(ldAuth.logout).toHaveBeenCalledTimes(2);
});

it("calls injectDocumentIfRequired", () => {
const LSpy = jest.spyOn(ldService as any, "injectDocumentIfRequired");
LdRunScript();
expect(LSpy).toHaveBeenCalled();
});

it("calls runScriptActions", () => {
const LSpy = jest.spyOn(ldService as any, "runScriptActions");
LdRunScript();
expect(LSpy).toHaveBeenCalled();
});

it("calls captureCreatedDocument", () => {
const LSpy = jest.spyOn(ldService as any, "captureCreatedDocument");
LdRunScript();
expect(LSpy).toHaveBeenCalled();
});
});
describe("clTestRunnerUiService - document injection, lookup & capture", () => {
let ldContext: ifTestContext;

/**
* WHY cy.url is mocked:
* - captureCreatedDocument depends on Cypress runtime
* - Jest does not run inside Cypress
* - We simulate Cypress's thenable behavior manually
*/
const LdMockCyUrl = (url?: string) => {
(cy.url as jest.Mock).mockImplementation(() => ({
then: (cb: (val?: string) => void) => cb(url),
}));
};

beforeEach(() => {
ldContext = {
currentScript: {
name: "TestScript1",
actual_test_data: [
{
master_data: "Quotation",
row_index: 1,
},
],
},

/**
* storeDocname is mocked because:
* - injectDocumentIfRequired reads from it using use_docname index
* - We need deterministic document injection
*/
storeDocname: [{ idx: 1, docname: "QUO-001" }],

createdDocnames: [],
createdDocsByIndex: [],
capturedLogs: [],
capturedErrors: [],
isTestPassed: true,
} as ifTestContext;

ldService = new clTestRunnerUiService(
ldContext,
{} as any, // auth service not needed for these tests
{} as any, // logger not needed
LTargetUrl,
{
/**
* test_lab_script mocked to:
* - support injectDocumentIfRequired
* - support findTestLabRow
* - support captureCreatedDocument row matching
*/
test_lab_script: [
{ master_data: "TestScript1", use_docname: 1 },
{ master_data: "Quotation", row_index: 1 },
{ master_data: "Customer", row_index: 2 },
],
},
{},
{}
);
});

// injectDocumentIfRequired */

it("injects document when use_docname exists", () => {
const LdScript: any = {
name: "TestScript1",
actual_test_data: [],
};

(ldService as any).injectDocumentIfRequired(LdScript);

expect(LdScript.document).toBe("QUO-001");
});

it("does nothing when actual_test_data is missing", () => {
expect(() => {
(ldService as any).runScriptActions({ name: "TestScript1" });
}).not.toThrow();
});

// findTestLabRow */

it("returns matching test lab row when master data exists", () => {
const LdRow = (ldService as any).findTestLabRow("Quotation");

expect(LdRow).toBeDefined();
expect(LdRow.master_data).toBe("Quotation");
});

it("returns undefined when master data does not exist", () => {
const LdRow = (ldService as any).findTestLabRow("Invoice");

expect(LdRow).toBeUndefined();
});

it("does not throw when test_lab_script is empty", () => {
const LdEmptyService = new clTestRunnerUiService(
ldContext,
{} as any,
{} as any,
LTargetUrl,
{ test_lab_script: [] },
{},
{}
);

expect(() => {
(LdEmptyService as any).findTestLabRow("Quotation");
}).not.toThrow();
});

it("does not mutate test_lab_script data", () => {
const LSnapshot = JSON.stringify(
(ldService as any).ldTestLabData.test_lab_script
);

(ldService as any).findTestLabRow("Quotation");

expect(
JSON.stringify((ldService as any).ldTestLabData.test_lab_script)
).toBe(LSnapshot);
});

// captureCreatedDocument */

it("does nothing when URL does not contain a document name", () => {
LdMockCyUrl("http://localhost/app");

(ldService as any).captureCreatedDocument("Quotation");

expect(ldContext.createdDocnames.length).toBe(0);
});

it("does not throw when cy.url resolves to undefined", () => {
LdMockCyUrl(undefined);

expect(() => {
(ldService as any).captureCreatedDocument("Quotation");
}).not.toThrow();
});

it("does not throw when test lab row is missing", () => {
LdMockCyUrl("http://localhost/app/invoice/INV-0001");

expect(() => {
(ldService as any).captureCreatedDocument("Invoice");
}).not.toThrow();
});
});

describe("clTestRunnerUiService - handleConnectionCreation, extractDocnameFromUrl, inalizeScript", () => { 
beforeEach(() => {
ldService = new clTestRunnerUiService(
ldContext,
{} as any,
{} as any,
LTargetUrl,
{ test_lab_script: [] },
{},
{}
);
});

it("does nothing when connection is not Create", () => {
(ldService as any).handleConnectionCreation({
connection: "Read",
});

expect(ldContext.createdDocnames.length).toBe(0);
});

it("pushes docname when connection returns string", async () => {
jest
.spyOn(clConnectionFactory, "connection")
.mockReturnValue({
handleConnection: () => Promise.resolve("INV-001"),
} as any);

const LdScript: any = {
connection: "Create",
connection_doctype: "Invoice",
idx: 1,
};

await (ldService as any).handleConnectionCreation(LdScript);

expect(ldContext.createdDocnames).toContain("INV-001");
});

// extractDocnameFromUrl()

it("extracts document name from valid URL", () => {
const LdResult = (ldService as any).extractDocnameFromUrl(
"http://localhost/app/quotation/QUO-0001"
);

expect(LdResult).toBe("QUO-0001");
});

it("returns undefined for invalid URL", () => {
const LdResult = (ldService as any).extractDocnameFromUrl("");

expect(LdResult).toBeUndefined();
});
// finalizeScript()

it("does nothing when no currentScript exists", () => {
ldContext.currentScript = null;

expect(() => {
ldService.finalizeScript();
}).not.toThrow();
});

it("resets context after finalize", () => {
ldContext.currentScript = { name: "TestScript1" } as any;
ldContext.capturedLogs.push("log");
ldContext.capturedErrors.push("err");
ldContext.isTestPassed = false;

ldService.finalizeScript();

expect(ldContext.capturedLogs.length).toBe(0);
expect(ldContext.capturedErrors.length).toBe(0);
expect(ldContext.isTestPassed).toBe(true);
expect(ldContext.currentScript).toBeNull();
});
});

})
})

// describe("clTestRunnerApiService", () => {
//   let ldContext: ifTestContext;
//   let ldAuth: clAuthService;
//   let ldReport: clReportService;
//   let ldService: clTestRunnerApiService;

//   const LLoginData = {
//     TestApiScript1: {
//       email: "api@example.com",
//       password: "secretApi",
//     },
//   };

//   const LdCreateContext = () =>
//     new clTestRunnerApiService(
//       ldContext,
//       "http://localhost:3000",
//       LLoginData,
//       ldAuth,
//       { test_lab_script: [] },
//       ldReport
//     );

//   beforeEach(() => {
//     ldContext = {
//       currentScript: null,
//       createdDocnames: [],
//       storeDocname: [],
//       createdDocsByIndex: [],
//       capturedLogs: [],
//       capturedErrors: [],
//       isTestPassed: true,
//     } as ifTestContext;

//     // Auth mock
//     ldAuth = {
//       login: jest.fn().mockResolvedValue(undefined),
//       logout: jest.fn(),
//     } as unknown as clAuthService;

//     // Report mock
//     ldReport = {
//       postRunLog: jest.fn(),
//       getTestRun: jest.fn(),
//       updateTestLog: jest.fn(),
//     } as unknown as clReportService;

//     // Create API service instance
//     ldService = LdCreateContext();
//   });

//   it("sets currentScript on execution start", () => {
//     const LdScript = { name: "TestApiScript1", test_type: "API", action: "GET", api_type: "method" };
//     ldService.executeScript(LdScript as any);
//     expect(ldContext.currentScript).toBe(LdScript);
//   });

//   it("throws error if login credentials are missing", () => {
//     const LdScript = { name: "UnknownScript", test_type: "API", action: "GET", api_type: "method" };
//     expect(() => ldService.executeScript(LdScript as any)).toThrow("No login credentials for UnknownScript");
//   });

//   it("calls login exactly once per execution", async () => {
//     const LdScript = { name: "TestApiScript1", test_type: "API", action: "GET", api_type: "method" };

//     // Spy on internal ApiBuilderFactory.execute to call login
//     const loginSpy = jest.spyOn(ldAuth, "login");
//     ldService.executeScript(LdScript as any);
//     expect(loginSpy).toHaveBeenCalledTimes(1);
//     expect(loginSpy).toHaveBeenCalledWith("api@example.com", "secretApi");
//   });

//   it("marks test as failed if API response status >= 400", async () => {
//     const LdScript = { name: "TestApiScript1", test_type: "API", action: "GET", api_type: "method" };
//     // Mock Cypress request
//     (global as any).cy.request = jest.fn().mockResolvedValue({ status: 500 });

//     // Override ApiBuilderFactory.validateResponse to call real logic
//     const consoleSpy = jest.spyOn(global.console, "log").mockImplementation(() => {});

//     await expect(() => ldService.executeScript(LdScript as any)).toThrow(
//       `API GET failed for TestApiScript1`
//     );

//     expect(ldContext.isTestPassed).toBe(false);
//     expect(ldContext.capturedErrors).toContain(`API GET failed for TestApiScript1`);

//     consoleSpy.mockRestore();
//   });

//  it("logs success when API response is OK", async () => {
//   const LdScript = { 
//     name: "TestApiScript1", 
//     test_type: "API", 
//     action: "GET", 
//     api_type: "method", 
//     actual_test_data: [{ description: { field1: "value1" } }] 
//   };

//   // Mock API response
//   (cy.request as jest.Mock).mockResolvedValue({
//     status: 200,
//     body: { message: { field1: "value1" } },
//   });

//   // Execute the API script
//   ldService.executeScript(LdScript as any);

//   // Verify test context state
//   expect(ldContext.isTestPassed).toBe(true);

//   // Verify Cypress log was called
//   expect(cy.log).toHaveBeenCalledWith("API GET passed for TestApiScript1");
// });


//   it("can be created via clTestRunnerFactory for API", () => {
//     const LdScript = { test_type: "API" };
//     const runner = clTestRunnerFactory.create(
//       LdScript,
//       ldContext,
//       ldAuth,
//       ldReport,
//       "http://localhost:3000",
//       {},
//       {},
//       LLoginData
//     );

//     expect(runner).toBeInstanceOf(clTestRunnerApiService);
//   });
// });
