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

    });

    describe("clTestRunnerApiService - Full API Execution Flow", () => {
        // Service dependencies
        let ldAuth: clAuthService;
        let ldReport: clReportService;
        let ldLoginData: any;
        let ldService: clTestRunnerApiService;
    
        // Helper to simulate API response structure
        const LdMockResponse = (status: number, body: any) => ({
            status,
            body,
        });
    
        beforeEach(() => {
            // Create fresh mocked dependencies before every test
            ldAuth = LdCreateAuthMock();
            ldReport = LdCreateReportMock();
    
            // Mock login credentials configuration
            ldLoginData = {
                ApiScript1: {
                    email: "api@test.com",
                    password: "secret",
                },
            };
    
            // Create new instance of service under test
            ldService = new clTestRunnerApiService(
                ldContext,
                LTargetUrl,
                ldLoginData,
                ldAuth,
                {},
                ldReport
            );
    
            // Ensure login resolves immediately (simulate successful authentication)
            (ldAuth.login as jest.Mock).mockImplementation(() => Promise.resolve());
    
            // Mock Cypress request to simulate successful HTTP 200 API response
            (cy.request as jest.Mock).mockImplementation(() => ({
                then: (cb: any) =>
                    cb(
                        LdMockResponse(200, {
                            data: [{ name: "TEST-001" }],
                            message: { name: "TEST-001" },
                        })
                    ),
            }));
        });
    
        // ----------------------------
        // SUCCESS FLOW - RESOURCE API
        // ----------------------------
    
        it("executes resource GET API successfully", async () => {
            // Simulate resource-based GET API script
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
            };
    
            ldService.executeScript(LdScript as any);
    
            // Verify authentication was triggered with correct credentials
            expect(ldAuth.login).toHaveBeenCalledWith(
                "api@test.com",
                "secret"
            );
    
            // Verify API request was executed
            expect(cy.request).toHaveBeenCalled();
    
            // Verify test context marked as passed
            expect(ldContext.isTestPassed).toBe(true);
        });
    
        // ----------------------------
        // SUCCESS FLOW - METHOD API
        // ----------------------------
    
        it("executes method API successfully", () => {
            // Simulate method-based POST API script
            const LdScript = {
                name: "ApiScript1",
                action: "POST",
                api_type: "method",
            };
    
            // Verify API call was executed
            ldService.executeScript(LdScript as any);
    
            expect(cy.request).toHaveBeenCalled();
            // Verify execution marked as successful
            expect(ldContext.isTestPassed).toBe(true);
        });
    
        // ----------------------------
        // URL BUILDING VALIDATION
        // ----------------------------
    
        it("builds correct URL for resource API with document", () => {
            // Resource API with document ID should append document to URL
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
                document: "INV-001",
            };
    
            ldService.executeScript(LdScript as any);
    
            const requestArgs = (cy.request as jest.Mock).mock.calls[0][0] as {
                url: string;
                method: string;
                body?: any;
            };
    
            // Validate URL contains correct resource path with document
            expect(requestArgs.url).toContain(
                `${LTargetUrl}/api/resource/Invoice/INV-001`
            );
        });
    
        it("builds correct URL for method API", () => {
            // Method APIs should hit /api/method endpoint
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "method",
            };
    
            ldService.executeScript(LdScript as any);
    
            const requestArgs = (cy.request as jest.Mock).mock.calls[0][0]as {
                url: string;
                method: string;
                body?: any;
            };
    
            // Validate correct method endpoint
            expect(requestArgs.url).toContain(
                `${LTargetUrl}/api/method`
            );
        });
    
        // ----------------------------
        // PARAM HANDLING
        // ----------------------------
    
        it("adds query parameters correctly", () => {
            // Query parameters should be appended to URL
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
                params: "limit=1",
            };
    
            ldService.executeScript(LdScript as any);
    
            const requestArgs = (cy.request as jest.Mock).mock.calls[0][0]as {
                url: string;
                method: string;
                body?: any;
            };
    
            // Validate query string presence
            expect(requestArgs.url).toContain("?limit=1");
        });
    
        // ----------------------------
        // PAYLOAD PARSING
        // ----------------------------
    
        it("parses JSON payload correctly for POST request", () => {
            // POST should attach parsed JSON payload to body
            const LdScript = {
                name: "ApiScript1",
                action: "POST",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
                actual_test_data: [
                    {
                        description: JSON.stringify({ amount: 100 }),
                    },
                ],
            };
    
            ldService.executeScript(LdScript as any);
    
            const requestArgs = (cy.request as jest.Mock).mock.calls[0][0]as {
                url: string;
                method: string;
                body?: any;
            };
    
            // Validate payload parsing
            expect(requestArgs.body).toEqual({ amount: 100 });
        });
    
        it("does not attach body for GET requests", () => {
            // GET requests must not send request body
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
                actual_test_data: [
                    {
                        description: JSON.stringify({ amount: 100 }),
                    },
                ],
            };
    
            ldService.executeScript(LdScript as any);
    
            const requestArgs = (cy.request as jest.Mock).mock.calls[0][0]as {
                url: string;
                method: string;
                body?: any;
            };
    
            // Validate no body attached
            expect(requestArgs.body).toBeUndefined();
        });
    
        // ----------------------------
        // VALIDATION LOGIC - GET MATCH
        // ----------------------------
    
        it("validates GET response fields correctly", () => {
            // GET validation should compare expected values against response
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
                actual_test_data: [
                    {
                        description: JSON.stringify({ name: "TEST-001" }),
                    },
                ],
            };
    
            ldService.executeScript(LdScript as any);
    
            // Validate test marked as passed after response comparison
            expect(ldContext.isTestPassed).toBe(true);
        });
    
        // ----------------------------
        // ERROR FLOW - 400+
        // ----------------------------
    
        it("marks test as failed when API returns 400+", () => {
            // Simulate server error response
            (cy.request as jest.Mock).mockImplementation(() => ({
                then: (cb: any) =>
                    cb(
                        LdMockResponse(500, {
                            message: "Internal Error",
                        })
                    ),
            }));
    
            const LdScript = {
                name: "ApiScript1",
                action: "GET",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
            };
    
            // Execution should throw on error status
            expect(() =>
                ldService.executeScript(LdScript as any)
            ).toThrow();
    
            // Validate context updated to failed state
            expect(ldContext.isTestPassed).toBe(false);
            expect(ldContext.capturedErrors.length).toBeGreaterThan(0);
        });
    
        // ----------------------------
        // DEFENSIVE: NO PAYLOAD
        // ----------------------------
    
        it("handles missing actual_test_data safely", () => {
            // Script without payload should not crash
            const LdScript = {
                name: "ApiScript1",
                action: "POST",
                api_type: "resource",
                doctype_to_be_tested: "Invoice",
            };
    
            expect(() =>
                ldService.executeScript(LdScript as any)
            ).not.toThrow();
        });
    });    
})