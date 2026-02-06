import { clTestRunnerFactory, clTestRunnerService } from "../src/services/testScript";
import { ifTestContext } from "../src/types";
import { clAuthService } from "../src/services/authService";
import { clReportService } from "../src/services/reportService";
import { expect } from "@jest/globals";
import { clConnectionFactory } from "../src/action";

const LTargetUrl = "http://localhost:3000";

/**
 * GLOBAL CYPRESS MOCKS
 * Cypress APIs are available at runtime but NOT in Jest.
 * We mock only the APIs used by the test runner to:
 * - prevent browser execution
 * - assert navigation & URL intent
 */
(global as any).cy = {
  visit: jest.fn(),
  wait: jest.fn(),
  url: jest.fn(),
};

/**
 * Cypress.env is accessed during execution.
 * Mocking prevents runtime failures.
 */
(global as any).Cypress = {
  env: jest.fn(),
};

describe("Test Script Module", () => {
  let ldContext: ifTestContext;

  //  Creates a fresh execution context for each test.
  //  Prevents state leakage between test cases.
  const LdCreateContext = (): ifTestContext =>
    ({
      currentScript: null,
      createdDocnames: [],
      storeDocname: [],
      createdDocsByIndex: [],
      capturedLogs: [],
      capturedErrors: [],
      isTestPassed: true,
    } as ifTestContext);

  /**
   * Auth service mock
   * - avoids real login/logout
   * - allows call & argument verification
   */
  const LdCreateAuthMock = (): clAuthService =>
    ({
      login: jest.fn(),
      logout: jest.fn(),
    } as unknown as clAuthService);

  /**
   * Report service mock
   * - avoids backend calls
   * - validates interaction only
   */
  const LdCreateReportMock = (): clReportService =>
    ({
      postRunLog: jest.fn(),
      getTestRun: jest.fn(),
      updateTestLog: jest.fn(),
    } as unknown as clReportService);

  beforeEach(() => {
    ldContext = LdCreateContext();
    jest.clearAllMocks();
  });

  // Factory & Construction
  describe("clTestRunnerFactory", () => {
    let ldScript: any;
    let ldAuth: clAuthService;
    let ldReport: clReportService;

    beforeEach(() => {
      ldScript = { test_type: "UI" };
      ldAuth = LdCreateAuthMock();
      ldReport = LdCreateReportMock();
    });

    it("should create a UI TestRunnerService instance", () => {
      const LdRunner = clTestRunnerFactory.create(
        ldScript,
        ldContext,
        ldAuth,
        ldReport,
        LTargetUrl,
        {},
        {},
        {}
      );

      expect(LdRunner).toBeInstanceOf(clTestRunnerService);
    });

    it("should inject the same context reference into the service", () => {
      const LdRunner = clTestRunnerFactory.create(
        ldScript,
        ldContext,
        ldAuth,
        ldReport,
        LTargetUrl,
        {},
        {},
        {}
      ) as clTestRunnerService;

      // Verifies wiring, not behavior
      expect((LdRunner as any).ldContext).toBe(ldContext);
    });

    it("should throw error for unsupported test type", () => {
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
  describe("clTestRunnerService", () => {
    let ldService: clTestRunnerService;
    // executeScript()
    describe("clTestRunnerService - executeScript ()", () => {  
      let ldAuth: clAuthService;
      let ldReport: clReportService;

      const LLoginData = {
        TestScript1: {
          email: "test@example.com",
          password: "secret",
        },
      };

      const LdCreateContext = () =>
        new clTestRunnerService(
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

      it("passes correct email to login", () => {
        LdRunScript();
        expect(ldAuth.login).toHaveBeenCalledWith(
          "test@example.com",
          expect.any(String)
        );
      });

      it("passes correct password to login", () => {
        LdRunScript();
        expect(ldAuth.login).toHaveBeenCalledWith(
          expect.any(String),
          "secret"
        );
      });

      it("navigates to /app after login", () => {
        LdRunScript();
        expect(cy.visit).toHaveBeenCalledWith(`${LTargetUrl}/app`);
      });

      it("does not navigate to a random URL", () => {
        LdRunScript();
        expect(cy.visit).not.toHaveBeenCalledWith("/login");
      });

      it("logs out after script execution", () => {
        LdRunScript();
        expect(ldAuth.logout).toHaveBeenCalled();
      });

      it("calls logout only once", () => {
        LdRunScript();
        expect(ldAuth.logout).toHaveBeenCalledTimes(1);
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

      it("does not push logs when no explicit logging happens", () => {
        LdRunScript();
        expect(ldContext.capturedLogs.length).toBe(0);
      });

      it("does not crash when actual_test_data is null", () => {
        expect(() =>
          ldService.executeScript({
            name: "TestScript1",
            actual_test_data: null,
          } as any)
        ).not.toThrow();
      });

      it("does not crash when actual_test_data is undefined", () => {
        expect(() => LdRunScript()).not.toThrow();
      });

      it("does not depend on test_lab_script content when empty", () => {
        expect(() => LdRunScript()).not.toThrow();
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
    
    describe("clTestRunnerService - document injection, lookup & capture", () => {
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

        ldService = new clTestRunnerService(
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

      // injectDocumentIfRequired                                            */

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

      //  findTestLabRow                                                      */

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
        const LdEmptyService = new clTestRunnerService(
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

      // captureCreatedDocument                                              */

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

    describe("clTestRunnerService - handleConnectionCreation, extractDocnameFromUrl, inalizeScript", () => { 
    beforeEach(() => {
        ldService = new clTestRunnerService(
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