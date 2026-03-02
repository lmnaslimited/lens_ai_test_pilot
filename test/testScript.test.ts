import { clTestRunnerUiService } from "../src/services/testScript";
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
/**Example:
 * cy.visit(), cy.wait(), cy.url(), cy.log()
 * Every above cypress commands are mocked with jest functions.
 */
(globalThis as any).cy = {
    visit: jest.fn(), // used for navigation after login
    wait: jest.fn(), // used for execution delays
    url: jest.fn(),// used for capturing created documents
    log: jest.fn(),
    wrap: (arr: any[]) => ({       // Fake cy.wrap
    each: async (cb: Function) => {  // Fake cy.each
        for (const item of arr) {   // Loop items one by one
        await cb(item);             // Wait for async callback
        }
        return Promise.resolve();  // Return resolved promise
    }
    }),
    request: jest.fn()  // Mock cy.request
};

/**Cypress.env is accessed during execution.
* Mocking avoids runtime crashes inside Jest.*/
/**Example: cypress.env() */
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
        currentScriptRowIdx:1, // increment pointer
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

    /**
     * Report Service Mock
     * - Prevents real backend calls
     * - Provides fixed test data for execution flow
     * - Allows validation of service interaction
     */
    const LdCreateReportMock = (): clReportService =>
    ({
        // Simulates run log creation and returns a mock 
        // run log ID
        postRunLog: jest.fn().mockReturnValue({
            then: (cb: any) =>
              cb({
                body: { data: { name: "RL-001" } }
              })
          }), 
        // Simulates fetching test run configuration
        getTestRun: jest.fn().mockReturnValue({
            then: (cb: any) =>
                cb({
                    body: {data:{test_log:[{name: "testScript1", test_script: "testScript1", master_data: "testScript1", idx:1}]}}
                })
        }),
        // Simulates updating execution result in Test Log
        // Used to verify that execution status is recorded correctly
        updateTestLog: jest.fn(),
    } as unknown as clReportService);

    beforeEach(() => {
        ldContext = LdCreateContext(); // Given: a clean execution context
        // Reset all mocks to avoid call leakage across tests
        jest.clearAllMocks();
    });

    // Script Execution & Internals
    describe("clTestRunnerUiService", () => {
        let ldService: clTestRunnerUiService;
        /**
         * Verifies UI script execution lifecycle:
         * login → navigate → execute → capture → logout
         * Ensures proper context handling and error safety.
         */
        describe("clTestRunnerUiService - executeScript ()", () => { 
            // Test dependencies
            let ldAuth: clAuthService
            let ldReport : clReportService
            // Given login credentials for the test script
            const LLoginData = {
                TestScript1: {
                email: "test@example.com",
                password: "secret",
                },
            };
            // Helper to execute the default test script
            const LdRunScript = () => ldService.executeScript({ name: "TestScript1" } as any);
            beforeEach(() => {
                // Mocked authentication and Reporting service
                ldAuth = LdCreateAuthMock();
                ldReport =  LdCreateReportMock();
                // A fresh UI Test Runner service instance
                ldService = 
                new clTestRunnerUiService(
                    ldContext,
                    ldAuth,
                    ldReport,
                    LTargetUrl,
                    { test_lab_script: [] },
                    {},
                    LLoginData
                );
            });

            it("sets currentScript on execution start", () => {
                // Given a valid script
                const LdScript = { name: "TestScript1" };
                // When execution starts
                ldService.executeScript(LdScript as any)
                // Then it becomes the active script in context
                expect(ldContext.currentScript).toBe(LdScript);
            });

            it("overwrites previously set currentScript", () => {
                 // Given an already active script
                ldContext.currentScript = { name: "OldScript" } as any;
                // When a new script is executed
                LdRunScript()
                // Then the current script is replaced
                expect(ldContext.currentScript?.name).toBe("TestScript1");
            });

            it("calls login exactly once per execution", () => {
                // Given valid login configuration
                // When script executes
                LdRunScript()
                // Then login is triggered once
                expect(ldAuth.login).toHaveBeenCalledTimes(1);
            });

            it("navigates to /app after login", () => {
                // Given successful login
                // When execution continues
                LdRunScript();
                // Then user is redirected to application page
                expect(cy.visit).toHaveBeenCalledWith(`${LTargetUrl}/app`);
            });

            it("logs out after script execution", () => {
                // Given script execution completes
                // When flow ends
                LdRunScript();
                // Then logout is performed
                expect(ldAuth.logout).toHaveBeenCalled();
            });

            it("throws error if script name is missing", () => {
                // Given missing script name
                // When execution is attempted
                // Then an error is raised
                expect(() => ldService.executeScript({} as any)).toThrow();
            });

            it("throws meaningful error when login credentials are missing", () => {
                // Given no login credentials configured
                // When execution is attempted
                // Then No login credentials for UnknownScript error is shown
                expect(() =>
                    ldService.executeScript({ name: "UnknownScript" } as any)
                ).toThrow("No login credentials for UnknownScript");
            });

            it("does not modify createdDocnames when no documents are created", () => {
                // Given no document creation steps
                // When execution completes
                LdRunScript();
                // Then no document names are stored
                expect(ldContext.createdDocnames.length).toBe(0);
            });

            it("does not modify createdDocsByIndex when no data is present", () => {
                // Given no indexed document data
                // When execution completes
                LdRunScript();
                // Then no created document index mapping is stored
                expect(ldContext.createdDocsByIndex.length).toBe(0);
            });

            it("The current script Row index should be 1", () => {
                // Given script execution begins
                // When context initializes
                LdRunScript();
                // Then row index starts at 1
                expect(ldContext.currentScriptRowIdx).toBe(1);
            })

            it("does not mark test as failed on successful execution", () => {
                // Given successful execution
                // When flow completes
                LdRunScript();
                // Then test remains marked as passed
                expect(ldContext.isTestPassed).toBe(true);
            });

            it("does not push errors when execution is clean", () => {
                // Given clean execution
                // When no failures occur
                LdRunScript();
                // Then no errors are captured
                expect(ldContext.capturedErrors.length).toBe(0);
            });

            it("does not crash when actual_test_data is null", () => {
                // Given null test data
                // When execution runs
                // Then it handles safely without crashing
                expect(() =>
                    ldService.executeScript({
                    name: "TestScript1",
                    actual_test_data: null,
                    } as any)
                ).not.toThrow();
            });

            it("can be executed multiple times with same script safely", () => {
                // Given the same script
                // When executed multiple times
                LdRunScript();
                LdRunScript();
                // Then each execution runs independently
                expect(ldAuth.login).toHaveBeenCalledTimes(2);
                expect(ldAuth.logout).toHaveBeenCalledTimes(2);
            });

            it("calls injectDocumentIfRequired", () => {
                // Given watch the injectDocumentIfRequired
                // method in the class
                const LSpy = jest.spyOn(ldService as any, "injectDocumentIfRequired");
                // When execution runs
                LdRunScript();
                // Then injectDocumentIfRequired method is triggered
                expect(LSpy).toHaveBeenCalled();
            });

            it("calls runScriptActions", () => {
                // Given watch the runScriptActions
                // method in the class
                const LSpy = jest.spyOn(ldService as any, "runScriptActions");
                // When execution runs
                LdRunScript();
                // Then runScriptActions method is triggered
                expect(LSpy).toHaveBeenCalled();
            });

            it("calls captureCreatedDocument", () => {
                // Given watch the runScriptActions
                // method in the class
                const LSpy = jest.spyOn(ldService as any, "captureCreatedDocument");
                // When execution runs
                LdRunScript();
                // Then captureCreatedDocument method is triggered
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
                    currentScriptRowIdx:1,
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
                            { master_data: "TestScript1", use_docname: 1, idx:1 },
                            { master_data: "Quotation", row_index: 1, idx:2 },
                            { master_data: "Customer", row_index: 2, idx:3 },
                        ],
                    },
                    {},
                    {}
                );
            });

            // injectDocumentIfRequired */

            it("injects document when use_docname exists", () => {
                // Given a script with meta data information
                const LdScript: any = {
                    name: "TestScript1",
                    actual_test_data: [],
                };
                // When document injection is triggered
                (ldService as any).injectDocumentIfRequired(LdScript);
                // Then the document value is populated into the script
                expect(LdScript.document).toBe("QUO-001");
            });

            it("does nothing when actual_test_data is missing", () => {
                // Given the script has no action data
                // When script execution logic runs
                // Then execution safely skips action processing
                expect(() => {
                    (ldService as any).runScriptActions({ name: "TestScript1" });
                }).not.toThrow();
            });

            // findTestLabRow */

            it("returns matching test lab row when master data exists with current Script Row Index", () => {
                // Given current script row index is set
                ldContext.currentScriptRowIdx = 2
                // When searching for matching master data
                const LdRow = (ldService as any).findTestLabRow("Quotation");
                // Then matching test lab row is returned
                expect(LdRow).toBeDefined();
                expect(LdRow.master_data).toBe("Quotation");
            });

            it("returns undefined when master data does not exist", () => {
                // Given no matching master data
                // When searching test lab rows
                const LdRow = (ldService as any).findTestLabRow("Invoice");
                // Then undefined is returned
                expect(LdRow).toBeUndefined();
            });

            it("does not throw when test_lab_script is empty", () => {
                // Given clTestRunnerUiService class is instantiated 
                // with an empty test lab configuration
                const LdEmptyService = new clTestRunnerUiService(
                    ldContext,
                    {} as any,
                    {} as any,
                    LTargetUrl,
                    { test_lab_script: [] },
                    {},
                    {}
                );
                // When searching for a test lab row
                // Then execution handles safely
                expect(() => {
                    (LdEmptyService as any).findTestLabRow("TestScript1");
                }).not.toThrow();
            });

            // captureCreatedDocument */

            it("does not throw when cy.url resolves to undefined", () => {
                // Given URL is not available
                LdMockCyUrl(undefined);
                // When capturing created document from url
                // Then execution continues safely
                expect(() => {
                    (ldService as any).captureCreatedDocument({"name":"TestScript1"});
                }).not.toThrow();
            });

            it("does not throw when test lab row is missing", () => {
                // Given URL contains a valid endpoint but no matching test lab row
                // to get its idx for mapping the docname from endpoint
                LdMockCyUrl("http://localhost/app/invoice/INV-0001");
                // When capturing created document
                // Then execution handles safely
                expect(() => {
                    (ldService as any).captureCreatedDocument({"name":"TestScript1"});
                }).not.toThrow();
            });

            it("when URL contain a document name", () => {
                // Given URL contains a created document reference with matching Test Lab row
                ldContext.storeDocname = []
                LdMockCyUrl("http://localhost/app/invoice/INV-0001");
                // When document capture runs
                (ldService as any).captureCreatedDocument({ name: "TestScript1"});
                // Then document name is stored in context
                expect(ldContext.storeDocname.length).toBe(1);
            });
        });

        describe("clTestRunnerUiService - handleConnectionCreation, extractDocnameFromUrl, finalizeScript", () => { 
            // Given a mocked report service to avoid real backend interaction
            let ldReportMock: clReportService
            // And a Test Runner service configured with test lab script mapping:
            // - TestScript1 → configured to reuse stored document
            // - Quotation   → mapped to row index 1
            // - Customer    → mapped to row index 2
            beforeEach(() => {
                ldReportMock = LdCreateReportMock()
                ldService = new clTestRunnerUiService(
                    ldContext,
                    {} as any,
                    ldReportMock,
                    LTargetUrl,
                    { test_lab_script: 
                        [
                            { master_data: "TestScript1", use_docname: 1, idx:1 },
                            { master_data: "Quotation", row_index: 1, idx:2 },
                            { master_data: "Customer", row_index: 2, idx:3 },
                        ]
                    },
                    {},
                    {}
                );
            });

            it("does nothing when connection is not Create", () => {
                // Given the Test Lab is not configured for a Read connection
                // When connection handling runs
                (ldService as any).handleConnectionCreation({
                    connection: "Read",
                });
                // Then no document is stored in context
                expect(ldContext.createdDocnames.length).toBe(0);
            });

            it("pushes docname when connection returns string", async () => {
                // Given a mocked connection factory
                // Because we only want to simulate document creation
                // without calling real backend services
                jest
                    .spyOn(clConnectionFactory, "connection")
                    .mockReturnValue({
                        handleConnection: () => Promise.resolve("INV-001"),
                        } as any);
                // And a script configured to Create an Invoice
                const LdScript: any = {
                    connection: "Create",
                    connection_doctype: "Invoice",
                    idx: 1,
                };
                // When the connection creation is handled
                await (ldService as any).handleConnectionCreation(LdScript);
                // Then the created document name should be stored in context
                expect(ldContext.createdDocnames).toContain("INV-001");
            });

            // extractDocnameFromUrl()

            it("extracts document name from valid URL", () => {
                // Given a valid application URL containing a document name
                // When extracting the document name
                const LdResult = (ldService as any).extractDocnameFromUrl(
                    "http://localhost/app/quotation/QUO-0001"
                );
                // Then the document name should be returned
                expect(LdResult).toBe("QUO-0001");
            });

            it("returns undefined for invalid URL", () => {
                // Given an empty or invalid URL
                // When extracting the document name
                const LdResult = (ldService as any).extractDocnameFromUrl("");
                // Then no document name should be returned
                expect(LdResult).toBeUndefined();
            });
            // finalizeScript()

            it("Should do nothing when no currentScript information exists", () => {
                // Given there is no active script
                ldContext.currentScript = null;
                // When finalizeScript method is executed
                // Then it should complete safely without error
                expect(() => {
                    ldService.finalizeScript();
                }).not.toThrow();
            });

            it("Should resets context after finalizeScript executed", () => {
                // Given an active script with logs and errors
                ldContext.currentScript = { name: "TestScript1" } as any;
                ldContext.capturedLogs.push("log");
                ldContext.capturedErrors.push("err");
                ldContext.isTestPassed = false;
                // And Run Log posting is mocked
                // Because we only verify context reset, not report service behavior
                jest.spyOn(ldService as any, "postAndUpdateRunLog")
                .mockImplementation(() => {});
                // When finalizeScript is executed
                ldService.finalizeScript();
                // Then execution context should be reset for next script
                expect(ldContext.capturedErrors.length).toBe(0);
                expect(ldContext.isTestPassed).toBe(true);
                expect(ldContext.currentScript).toBeNull();
            });

            //buildLogEntries()
            it("Should collect error log only", ()=>{
                // Given captured logs and errors
                ldContext.capturedLogs.push("log");
                ldContext.capturedErrors.push("err");
                // When building log entries
                // Then only error logs should be prepared for reporting
                const LaCapturedLog = [{"type": "Error", "message":"err"}]
                expect((ldService as any).buildLogEntries()).toEqual(LaCapturedLog)
            })

            //resolveScriptNames()
            it("Should break ScriptName separatly for name containing '&'", ()=>{
                // Given multiple script names combined with '&'
                const LScriptName = "TestScript1&Quotation&Customer"
                const LaScriptNames = ["TestScript1", "Quotation", "Customer"]
                // When resolving script names
                // Then each script should be separated correctly
                expect((ldService as any).resolveScriptNames(LScriptName)).toEqual(LaScriptNames)
            })

            it("Should not break scriptname when name does not contain '&'", ()=>{
                // Given a single script name without '&' special case
                // When resolving script names
                // Then it should return the same name as single entry
                expect((ldService as any).resolveScriptNames("TestScript1")).toEqual(["TestScript1"])
            })

            it("currentScriptRowIdx should be 4 for Three Script run", ()=>{
                // Given three scripts combined in execution
                ldContext.currentScript = {"name":"TestScript1&Quotation&Customer"}
                // And Run Log posting is mocked
                // Because we only verify row index progression
                jest.spyOn(ldService as any, "postAndUpdateRunLog")
                .mockImplementation(() => {});
                // When finalizeScript completes execution
                ldService.finalizeScript()
                // Then script row index should move to next position after all three
                 /**
                 * Initial idx = 1
                 * After TestScript1, idx = 2
                 * After Quotation, idx = 3
                 * After Customer, idx = 4
                 */
                expect(ldContext.currentScriptRowIdx).toBe(4)
            })

            //postAndUpdateRunLog
            it("Should Create Run Log only for Failed test script", ()=>{
            // Given a failed test script with error logs
            // When posting run log
            (ldService as any).postAndUpdateRunLog({
                test_script: "testScript1",
                idx: 1
              },
              "testScript1",
              [{ message: "err", type: "error" }],
              "Fail")
              // Then a Run Log should be created
              expect(ldReportMock.postRunLog).toHaveBeenCalledTimes(1)
            })

            it("Should update the Test Run with result and Run Log", ()=>{
                // Given a failed script with logs
                // When posting and updating run log
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [{ message: "err", type: "error" }],
                  "Fail")
                // Then test run should be updated with Fail result and Run Log reference
                expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Fail",
                        run_log: "RL-001"})
            })
            it("Should not Create Run Log when there is no logs", ()=>{
                // Given a failed script without captured logs
                // When posting run log
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Fail")
                // Then no Run Log should be created
                expect(ldReportMock.postRunLog).toHaveBeenCalledTimes(0)
            })

            it("Should only update the result in Test Run when no logs were captured for fail test script", ()=>{
                // Given a failed script without logs
                // When updating test run
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Fail")
                // Then only result should be updated without Run Log reference
                expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Fail",
                    run_log: null})
            })

            it("Should only update the result in Test Run when test script is Pass", ()=>{
                // Given a passed test script
                // When updating test run
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Pass")
                // Then only Pass result should be updated without Run Log
                expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Pass",
                    run_log: null})
            })
        });

    });
})