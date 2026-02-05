import { clTestRunnerFactory, clTestRunnerService } from "../src/services/testScript";
import { ifTestContext } from "../src/types";
import { clAuthService } from "../src/services/authService";
import { clReportService } from "../src/services/reportService";
import { expect } from "@jest/globals";
import { clConnectionFactory } from "../src/action";

const targetURL = "http://localhost:3000";

/**
 * Global Cypress mocks
 * We mock Cypress APIs because:
 * - Unit tests should not open browsers
 * - We only want to verify *intent* (calls), not real UI behavior
 */
(global as any).cy = {
  visit: jest.fn(), // used when navigating to app URL
  wait: jest.fn(),  // may be used inside scripts
  url: jest.fn(),   // may be used to capture runtime context
};

/**
 * Cypress.env is accessed inside test execution
 * Mocking prevents runtime failures in Jest
 */
(global as any).Cypress = {
  env: jest.fn(),
};

describe("Test Script Module", () => {
  let context: ifTestContext;
  beforeEach(() => {
    context = {
      currentScript: null,
      createdDocnames: [],
      storeDocname: [],
      createdDocsByIndex: [],
      capturedLogs: [],
      capturedErrors: [],
      isTestPassed: true,
    } as ifTestContext;
  });

//   PART 1 — Factory & Construction

    describe("clTestRunnerFactory", () => {
        let idScript: any;
        let ldAuth: clAuthService;
        let ldReport: clReportService;
        let ldTestLabData: any;
        let ldMestMasterData: any;
        let ldLoginData: any;

        beforeEach(() => {
        idScript = { test_type: "UI" };

        /**
         * Auth service is mocked because:
         * - We don't want real login/logout
         * - We only assert calls & arguments
         */
        ldAuth = {
            login: jest.fn(),
            logout: jest.fn(),
        } as unknown as clAuthService;

        /**
         * Report service is mocked because:
         * - No real backend calls should happen
         * - Only interaction verification is needed
         */
        ldReport = {
            postRunLog: jest.fn(),
            getTestRun: jest.fn(),
            updateTestLog: jest.fn(),
        } as unknown as clReportService;

        ldTestLabData = {};
        ldMestMasterData = {};
        ldLoginData = {};
        });

        it("should create a UI TestRunnerService instance", () => {
        const runner = clTestRunnerFactory.create(
            idScript,
            context,
            ldAuth,
            ldReport,
            targetURL,
            ldTestLabData,
            ldMestMasterData,
            ldLoginData
        );

        expect(runner).toBeInstanceOf(clTestRunnerService);
        });

        it("should inject the same context reference into the service", () => {
        const runner = clTestRunnerFactory.create(
            idScript,
            context,
            ldAuth,
            ldReport,
            targetURL,
            ldTestLabData,
            ldMestMasterData,
            ldLoginData
        ) as clTestRunnerService;

        /**
         * Accessing private/internal field intentionally
         * Unit tests are allowed to break encapsulation
         * to validate wiring correctness
         */
        expect((runner as any).ldContext).toBe(context);
        });

        it("should throw error for unsupported test type", () => {
        idScript = { test_type: "UNKNOWN" };

        expect(() => {
            clTestRunnerFactory.create(
            idScript,
            context,
            ldAuth,
            ldReport,
            targetURL,
            ldTestLabData,
            ldMestMasterData,
            ldLoginData
            );
        }).toThrow(`Unsupported test type: ${idScript.test_type}`);
        });
    });

  /**
   * PART 2 — Script Execution Behavior
   */
    describe("clTestRunnerService", () => {
        describe("clTestRunnerService - executeScript ()", () => {
        let service: clTestRunnerService;
        let ldAuth: clAuthService;
        let ldReport: clReportService;

        const loginData = {
            TestScript1: {
            email: "test@example.com",
            password: "secret",
            },
        };

        beforeEach(() => {


            ldAuth = {
            login: jest.fn(),
            logout: jest.fn(),
            } as unknown as clAuthService;

            ldReport = {
            postRunLog: jest.fn(),
            getTestRun: jest.fn(),
            updateTestLog: jest.fn(),
            } as unknown as clReportService;

            service = new clTestRunnerService(
            context,
            ldAuth,
            ldReport,
            targetURL,
            { test_lab_script: [] },
            {},
            loginData
            );

            jest.clearAllMocks();
        });

        it("sets currentScript on execution start", () => {
            const script = { name: "TestScript1" };

            service.executeScript(script as any);

            expect(context.currentScript).toBe(script);
        });

        it("overwrites previously set currentScript", () => {
            context.currentScript = { name: "OldScript" } as any;
            const script = { name: "TestScript1" };

            service.executeScript(script as any);

            expect(context.currentScript).toBe(script);
        });

        it("calls login exactly once per execution", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(ldAuth.login).toHaveBeenCalledTimes(1);
        });

        it("passes correct email to login", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(ldAuth.login).toHaveBeenCalledWith(
            "test@example.com",
            expect.any(String)
            );
        });

        it("passes correct password to login", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(ldAuth.login).toHaveBeenCalledWith(
            expect.any(String),
            "secret"
            );
        });

        it("navigates to /app after login", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(cy.visit).toHaveBeenCalledWith(`${targetURL}/app`);
        });

        it("does not navigate to a random URL", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(cy.visit).not.toHaveBeenCalledWith("/login");
        });

        it("logs out after script execution", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(ldAuth.logout).toHaveBeenCalled();
        });

        it("calls logout only once", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(ldAuth.logout).toHaveBeenCalledTimes(1);
        });

        it("throws error if script name is missing", () => {
            expect(() => {
            service.executeScript({} as any);
            }).toThrow();
        });

        it("throws meaningful error when login credentials are missing", () => {
            expect(() => {
            service.executeScript({ name: "UnknownScript" } as any);
            }).toThrow("No login credentials for UnknownScript");
        });

        it("does not modify createdDocnames when no documents are created", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(context.createdDocnames.length).toBe(0);
        });

        it("does not modify createdDocsByIndex when no data is present", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(context.createdDocsByIndex.length).toBe(0);
        });

        it("does not mark test as failed on successful execution", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(context.isTestPassed).toBe(true);
        });

        it("does not push errors when execution is clean", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(context.capturedErrors.length).toBe(0);
        });

        it("does not push logs when no explicit logging happens", () => {
            service.executeScript({ name: "TestScript1" } as any);

            expect(context.capturedLogs.length).toBe(0);
        });

        it("does not crash when actual_test_data is null", () => {
            expect(() => {
            service.executeScript({
                name: "TestScript1",
                actual_test_data: null,
            } as any);
            }).not.toThrow();
        });

        it("does not crash when actual_test_data is undefined", () => {
            expect(() => {
            service.executeScript({
                name: "TestScript1",
            } as any);
            }).not.toThrow();
        });

        it("does not depend on test_lab_script content when empty", () => {
            expect(() => {
            service.executeScript({ name: "TestScript1" } as any);
            }).not.toThrow();
        });

        it("does not mutate loginData during execution", () => {
            const snapshot = JSON.stringify(loginData);

            service.executeScript({ name: "TestScript1" } as any);

            expect(JSON.stringify(loginData)).toBe(snapshot);
        });

        it("can be executed multiple times with same script safely", () => {
            const script = { name: "TestScript1" };

            service.executeScript(script as any);
            service.executeScript(script as any);

            expect(ldAuth.login).toHaveBeenCalledTimes(2);
            expect(ldAuth.logout).toHaveBeenCalledTimes(2);
        });
        it("calls injectDocumentIfRequired", () => {
            const spy = jest.spyOn(service as any, "injectDocumentIfRequired");

            service.executeScript({ name: "TestScript1" } as any);

            expect(spy).toHaveBeenCalled();
        });

        it("calls runScriptActions", () => {
            const spy = jest.spyOn(service as any, "runScriptActions");

            service.executeScript({ name: "TestScript1" } as any);

            expect(spy).toHaveBeenCalled();
        });

        it("calls captureCreatedDocument", () => {
            const spy = jest.spyOn(service as any, "captureCreatedDocument");

            service.executeScript({ name: "TestScript1" } as any);

            expect(spy).toHaveBeenCalled();
        });


        }); 
        describe("injectDocumentIfRequired()", () => {
        let service: clTestRunnerService;

        beforeEach(() => {
            const context: ifTestContext = {
            currentScript: null,
            storeDocname: [{ idx: 1, docname: "QUO-001" }],
            createdDocnames: [],
            createdDocsByIndex: [],
            capturedLogs: [],
            capturedErrors: [],
            isTestPassed: true,
            };

            service = new clTestRunnerService(
            context,
            {} as any,
            {} as any,
            targetURL,
            {
                test_lab_script: [
                { master_data: "TestScript1", use_docname: 1 },
                ],
            },
            {},
            {}
            );
        });

        it("injects document when use_docname exists", () => {
            const script: any = {
            name: "TestScript1",
            actual_test_data: [],
            };

            (service as any).injectDocumentIfRequired(script);

            expect(script.document).toBe("QUO-001");
        });

        it("does nothing when actual_test_data is missing", () => {
            expect(() => {
            (service as any).runScriptActions({ name: "TestScript1" });
            }).not.toThrow();
        });
        });

        describe("clTestRunnerService -  findTestLabRow()", () => {
        let service: clTestRunnerService;
        let context: ifTestContext;

        beforeEach(() => {
            context = {
            currentScript: null,
            createdDocnames: [],
            storeDocname: [],
            createdDocsByIndex: [],
            capturedLogs: [],
            capturedErrors: [],
            isTestPassed: true,
            } as ifTestContext;

            service = new clTestRunnerService(
            context,
            {} as any,
            {} as any,
            targetURL,
            {
                test_lab_script: [
                { master_data: "Quotation", row_index: 1 },
                { master_data: "Customer", row_index: 2 },
                ],
            },
            {},
            {}
            );
        });

        it("returns matching test lab row when master data exists", () => {
            const row = (service as any).findTestLabRow("Quotation");

            expect(row).toBeDefined();
            expect(row.master_data).toBe("Quotation");
        });

        it("returns undefined when master data does not exist", () => {
            const row = (service as any).findTestLabRow("Invoice");

            expect(row).toBeUndefined();
        });

        it("does not throw when test_lab_script is empty", () => {
            const emptyService = new clTestRunnerService(
            context,
            {} as any,
            {} as any,
            targetURL,
            { test_lab_script: [] },
            {},
            {}
            );

            expect(() => {
            (emptyService as any).findTestLabRow("Quotation");
            }).not.toThrow();
        });

        it("does not mutate test_lab_script data", () => {
            const snapshot = JSON.stringify(
            (service as any).ldTestLabData.test_lab_script
            );

            (service as any).findTestLabRow("Quotation");

            expect(
            JSON.stringify((service as any).ldTestLabData.test_lab_script)
            ).toBe(snapshot);
        });
        });
        describe("clTestRunnerService - captureCreatedDocument()", () => {
        let service: clTestRunnerService;
        let context: ifTestContext;

        /**
         * Helper to mock cy.url() as a Cypress-style thenable
         */
        const mockCyUrl = (url?: string) => {
            (cy.url as jest.Mock).mockImplementation(() => ({
            then: (cb: (val?: string) => void) => cb(url),
            }));
        };

        beforeEach(() => {
            context = {
            currentScript: {
                name: "TestScript1",
                actual_test_data: [
                {
                    master_data: "Quotation",
                    row_index: 1,  
                },
                ],
            },
            createdDocnames: [],
            storeDocname: [],
            createdDocsByIndex: [],
            capturedLogs: [],
            capturedErrors: [],
            isTestPassed: true,
            } as ifTestContext;


        (global as any).cy = {
            url: jest.fn(),
        };

        service = new clTestRunnerService(
            context,
            {} as any,
            {} as any,
            targetURL,
            {
            test_lab_script: [
                { master_data: "Quotation", row_index: 1 },
            ],
            },
            {},
            {}
        );
        });

        it("does nothing when URL does not contain a document name", () => {
            mockCyUrl("http://localhost/app");

            (service as any).captureCreatedDocument("Quotation");

            expect(context.createdDocnames.length).toBe(0);
        });

        it("does not throw when cy.url resolves to undefined", () => {
            mockCyUrl(undefined);

            expect(() => {
            (service as any).captureCreatedDocument("Quotation");
            }).not.toThrow();
        });

        it("does not throw when test lab row is missing", () => {
            mockCyUrl("http://localhost/app/invoice/INV-0001");

            expect(() => {
            (service as any).captureCreatedDocument("Invoice");
            }).not.toThrow();
        });
        });
        describe("handleConnectionCreation()", () => {
        let service: clTestRunnerService;

        beforeEach(() => {
            service = new clTestRunnerService(
            context,
            {} as any,
            {} as any,
            targetURL,
            { test_lab_script: [] },
            {},
            {}
            );
        });

        it("does nothing when connection is not Create", () => {
            (service as any).handleConnectionCreation({
            connection: "Read",
            });

            expect(context.createdDocnames.length).toBe(0);
        });

        it("pushes docname when connection returns string", async () => {
            jest
            .spyOn(clConnectionFactory, "connection")
            .mockReturnValue({
                handleConnection: () => Promise.resolve("INV-001"),
            } as any);

            const script: any = {
            connection: "Create",
            connection_doctype: "Invoice",
            idx: 1,
            };

            await (service as any).handleConnectionCreation(script);

            expect(context.createdDocnames).toContain("INV-001");
        });

        // extractDocnameFromUrl()

          it("extracts document name from valid URL", () => {
            const result = (service as any).extractDocnameFromUrl(
            "http://localhost/app/quotation/QUO-0001"
            );

            expect(result).toBe("QUO-0001");
        });

        it("returns undefined for invalid URL", () => {
            const result = (service as any).extractDocnameFromUrl("");

            expect(result).toBeUndefined();
        });
        // finalizeScript()

        it("does nothing when no currentScript exists", () => {
            context.currentScript = null;

            expect(() => {
            service.finalizeScript();
            }).not.toThrow();
        });

        it("resets context after finalize", () => {
            context.currentScript = { name: "TestScript1" } as any;
            context.capturedLogs.push("log");
            context.capturedErrors.push("err");
            context.isTestPassed = false;

            service.finalizeScript();

            expect(context.capturedLogs.length).toBe(0);
            expect(context.capturedErrors.length).toBe(0);
            expect(context.isTestPassed).toBe(true);
            expect(context.currentScript).toBeNull();
        });
        });
    });



 
});

