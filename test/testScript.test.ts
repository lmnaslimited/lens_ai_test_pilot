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
    request: jest.fn()
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

    /** Report service mock
    * - avoids backend calls
    * - validates interaction only */
    const LdCreateReportMock = (): clReportService =>
    ({
        postRunLog: jest.fn().mockReturnValue({
            then: (cb: any) =>
              cb({
                body: { data: { name: "RL-001" } }
              })
          }), 
        getTestRun: jest.fn().mockReturnValue({
            then: (cb: any) =>
                cb({
                    body: {data:{test_log:[{name: "testScript1", test_script: "testScript1", master_data: "testScript1", idx:1}]}}
                })
        }),
        // fetch existing test run
        updateTestLog: jest.fn(), // update test execution result
    } as unknown as clReportService);

    beforeEach(() => {
        ldContext = LdCreateContext(); // Given: a clean execution context
        // Reset all mocks to avoid call leakage across tests
        jest.clearAllMocks();
    });

    // Script Execution & Internals
    describe("clTestRunnerUiService", () => {
        let ldService: clTestRunnerUiService;
        // executeScript()

        describe("clTestRunnerUiService - executeScript ()", () => { 
            let ldAuth: clAuthService
            let ldReport : clReportService

            const LLoginData = {
                TestScript1: {
                email: "test@example.com",
                password: "secret",
                },
            };
            const LdRunScript = () => ldService.executeScript({ name: "TestScript1" } as any);
            beforeEach(() => {
                ldAuth = LdCreateAuthMock();
                ldReport =  LdCreateReportMock();
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
                const LdScript = { name: "TestScript1" };
                ldService.executeScript(LdScript as any)
                expect(ldContext.currentScript).toBe(LdScript);
            });

            it("overwrites previously set currentScript", () => {
                ldContext.currentScript = { name: "OldScript" } as any;
                LdRunScript()
                expect(ldContext.currentScript?.name).toBe("TestScript1");
            });

            it("calls login exactly once per execution", () => {
                LdRunScript()
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

            it("The current script Row index should be 1", () => {
                LdRunScript();
                expect(ldContext.currentScriptRowIdx).toBe(1);
            })

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

            it("returns matching test lab row when master data exists with current Script Row Index", () => {
                ldContext.currentScriptRowIdx = 2

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
                    (LdEmptyService as any).findTestLabRow("TestScript1");
                }).not.toThrow();
            });

            // captureCreatedDocument */

            it("does not throw when cy.url resolves to undefined", () => {
                LdMockCyUrl(undefined);

                expect(() => {
                    (ldService as any).captureCreatedDocument({"name":"TestScript1"});
                }).not.toThrow();
            });

            it("does not throw when test lab row is missing", () => {
                LdMockCyUrl("http://localhost/app/invoice/INV-0001");

                expect(() => {
                    (ldService as any).captureCreatedDocument({"name":"TestScript1"});
                }).not.toThrow();
            });

            it("when URL contain a document name", () => {
                ldContext.storeDocname = []
                LdMockCyUrl("http://localhost/app/invoice/INV-0001");

                (ldService as any).captureCreatedDocument({ name: "TestScript1"});

                expect(ldContext.storeDocname.length).toBe(1);
            });
        });

        describe("clTestRunnerUiService - handleConnectionCreation, extractDocnameFromUrl, finalizeScript", () => { 
            let ldReportMock: clReportService
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
                // Prevent Run Log Post calls interfering
                jest.spyOn(ldService as any, "postAndUpdateRunLog")
                .mockImplementation(() => {});
                ldService.finalizeScript();

                expect(ldContext.capturedErrors.length).toBe(0);
                expect(ldContext.isTestPassed).toBe(true);
                expect(ldContext.currentScript).toBeNull();
            });

            //buildLogEntries()
            it("Should collect error log only", ()=>{
                ldContext.capturedLogs.push("log");
                ldContext.capturedErrors.push("err");
                const LaCapturedLog = [{"type": "Error", "message":"err"}]
                expect((ldService as any).buildLogEntries()).toEqual(LaCapturedLog)
            })

            //resolveScriptNames()
            it("Should break ScriptName separatly for name containing '&'", ()=>{
                const LScriptName = "TestScript1&Quotation&Customer"
                const LaScriptNames = ["TestScript1", "Quotation", "Customer"]
                expect((ldService as any).resolveScriptNames(LScriptName)).toEqual(LaScriptNames)
            })

            it("Should not break scriptname when name does not contain '&'", ()=>{
                
                expect((ldService as any).resolveScriptNames("TestScript1")).toEqual(["TestScript1"])
            })

            it("currentScriptRowIdx should be 4 for Three Script run", ()=>{
                /**
                 * Initial idx = 1
                 * After TestScript1, idx = 2
                 * After Quotation, idx = 3
                 * After Customer, idx = 4
                 */
                ldContext.currentScript = {"name":"TestScript1&Quotation&Customer"}
                // Prevent Run Log Post calls interfering
                jest.spyOn(ldService as any, "postAndUpdateRunLog")
                .mockImplementation(() => {});
                ldService.finalizeScript()
                expect(ldContext.currentScriptRowIdx).toBe(4)
            })

            //postAndUpdateRunLog
            it("Should Create Run Log only for Failed test script", ()=>{
                
            (ldService as any).postAndUpdateRunLog({
                test_script: "testScript1",
                idx: 1
              },
              "testScript1",
              [{ message: "err", type: "error" }],
              "Fail")
                expect(ldReportMock.postRunLog).toHaveBeenCalledTimes(1)
            })

            it("Should update the Test Run with result and Run Log", ()=>{
            
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [{ message: "err", type: "error" }],
                  "Fail")
                    expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Fail",
                        run_log: "RL-001"})
            })
            it("Should not Create Run Log when there is no logs", ()=>{
                
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Fail")
                expect(ldReportMock.postRunLog).toHaveBeenCalledTimes(0)
            })

            it("Should only update the result in Test Run when no logs were captured for fail test script", ()=>{
                
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Fail")
                expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Fail",
                    run_log: null})
            })

            it("Should only update the result in Test Run when test script is Pass", ()=>{
                
                (ldService as any).postAndUpdateRunLog({
                    test_script: "testScript1",
                    idx: 1
                  },
                  "testScript1",
                  [],
                  "Pass")
                expect(ldReportMock.updateTestLog).toHaveBeenCalledWith("testScript1", {result: "Pass",
                    run_log: null})
            })
        });

    });
})