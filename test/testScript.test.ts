jest.mock("../src/action", () => ({
  clActionFactory: {
    executeAction: jest.fn(),
    filterActionData: jest.fn(),
    createAction: jest.fn(),
  },
  clConnectionFactory: {
    connection: jest.fn(),
  },
}));

jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500),
}));

import { clTestRunnerFactory, clTestRunnerService } from "../src/services/testScript";
import { ifTestContext } from "../src/types";
import { clAuthService } from "../src/services/authService";
import { clReportService } from "../src/services/reportService";
import { clActionFactory, clConnectionFactory } from "../src/action";
import { fnGetDelay } from "../src/delay";
import { expect } from "@jest/globals";

const targetURL = "http://localhost:3000";

// -------- Helpers for Cypress chain simulation --------
const createCyThenable = <T>(value: T) => ({
  then: (cb: any) => cb(value),
});

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

    // Mock Cypress global object
    (global as any).Cypress = {
      env: jest.fn(() => "TR-001"),
    };

    // Mock cy global object
    (global as any).cy = {
      visit: jest.fn(),
      wait: jest.fn(),
      url: jest.fn(),
    };
  });

  // ============================================================
  //                      FACTORY TESTS
  // ============================================================
  describe("clTestRunnerFactory", () => {
    let idScript: any;
    let ldAuth: clAuthService;
    let ldReport: clReportService;
    let ldTestLabData: any;
    let ldMestMasterData: any;
    let ldLoginData: any;

    beforeEach(() => {
      idScript = { test_type: "UI" };

      // Mock AuthService and ReportService
      ldAuth = {
        login: jest.fn(),
        logout: jest.fn(),
      } as unknown as clAuthService;

      ldReport = {
        postRunLog: jest.fn(),
        getTestRun: jest.fn(),
        updateTestLog: jest.fn(),
      } as unknown as clReportService;

      ldTestLabData = {};
      ldMestMasterData = {};
      ldLoginData = {};
    });

    it("should create a clTestRunnerService instance for UI test_type", () => {
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

    it("should create API runner instance for API test_type", () => {
      idScript = { test_type: "API" };

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

      expect(runner).toBeDefined();
      expect(typeof runner.executeScript).toBe("function");
      expect(typeof runner.finalizeScript).toBe("function");
    });

    it("should throw error for unsupported test_type", () => {
      idScript = { test_type: "UNKNOWN" };

      expect(() =>
        clTestRunnerFactory.create(
          idScript,
          context,
          ldAuth,
          ldReport,
          targetURL,
          ldTestLabData,
          ldMestMasterData,
          ldLoginData
        )
      ).toThrow("Unsupported test type: UNKNOWN");
    });

    it("should pass correct dependencies to UI runner", () => {
      const runner = clTestRunnerFactory.create(
        { test_type: "UI" },
        context,
        ldAuth,
        ldReport,
        targetURL,
        ldTestLabData,
        ldMestMasterData,
        ldLoginData
      ) as any;

      // check internal injection (not recommended usually, but okay for learning)
      expect(runner["ldContext"]).toBe(context);
      expect(runner["ldAuth"]).toBe(ldAuth);
      expect(runner["ldReport"]).toBe(ldReport);
      expect(runner["lTargetUrl"]).toBe(targetURL);
    });

    it("should throw error when idScript.test_type is missing", () => {
      idScript = {}; // no test_type

      expect(() =>
        clTestRunnerFactory.create(
          idScript,
          context,
          ldAuth,
          ldReport,
          targetURL,
          ldTestLabData,
          ldMestMasterData,
          ldLoginData
        )
      ).toThrow("Unsupported test type: undefined");
    });
  });

  // ============================================================
  //                 RUNNER SERVICE TESTS (UI)
  // ============================================================
  describe("clTestRunnerService", () => {
    let auth: clAuthService;
    let report: clReportService;
    let service: clTestRunnerService;

    const headers = { Accept: "application/json" };

    beforeEach(() => {
      auth = {
        login: jest.fn(),
        logout: jest.fn(),
      } as unknown as clAuthService;

      report = {
        postRunLog: jest.fn(),
        getTestRun: jest.fn(),
        updateTestLog: jest.fn(),
      } as unknown as clReportService;

      // Mock action factory behaviour
      (clActionFactory.executeAction as jest.Mock).mockReturnValue({
        executeTestAction: jest.fn(),
      });

      (clActionFactory.filterActionData as jest.Mock).mockReturnValue({ filtered: true });

      (clActionFactory.createAction as jest.Mock).mockReturnValue({
        executeAction: jest.fn(),
      });

      // Mock connection factory behaviour
      (clConnectionFactory.connection as jest.Mock).mockReturnValue({
        handleConnection: jest.fn(() => createCyThenable("DOC-001")),
      });

      // default cy.url stub
      (cy.url as jest.Mock).mockReturnValue(createCyThenable(`${targetURL}/app/test/doctype/DOC-URL-001`));

      const testLabData = {
        test_lab_script: [
          { master_data: "Script1", idx: 1, test_script: "TS-001" },
          { master_data: "Script2", idx: 2, test_script: "TS-002" },
        ],
      };

      const loginData = {
        Script1: { email: "a@test.com", password: "123" },
        Script2: { email: "b@test.com", password: "456" },
      };

      service = new clTestRunnerService(
        context,
        auth,
        report,
        targetURL,
        testLabData,
        {}, // mest master
        loginData
      );
    });

    // ---------------- executeScript() ----------------

    it("executeScript() - should set currentScript in context", () => {
      const script = { name: "Script1" };

      service.executeScript(script);

      expect(context.currentScript).toBe(script);
    });

    it("executeScript() - should login with correct creds", () => {
      const script = { name: "Script1" };

      service.executeScript(script);

      expect(auth.login).toHaveBeenCalledWith("a@test.com", "123");
    });

    it("executeScript() - should throw error if creds not found", () => {
      const script = { name: "UnknownScript" };

      expect(() => service.executeScript(script)).toThrow(
        "No login credentials for UnknownScript"
      );
    });

    it("executeScript() - should visit application url", () => {
      const script = { name: "Script1" };

      service.executeScript(script);

      expect(cy.visit).toHaveBeenCalledWith(`${targetURL}/app`);
    });

    it("executeScript() - should logout at end", () => {
      const script = { name: "Script1" };

      service.executeScript(script);

      expect(auth.logout).toHaveBeenCalled();
    });

    // ---------------- runScriptActions() behaviour via executeScript ----------------

    it("executeScript() - should execute script actions when actual_test_data exists", () => {
      const script:any = {
        name: "Script1",
        actual_test_data: [{ action: "Click" }],
      };

      service.executeScript(script);

      expect(clActionFactory.executeAction).toHaveBeenCalledWith(script);
      expect(clActionFactory.createAction).toHaveBeenCalled();
    });

    it("executeScript() - should wait medium delay after running actions", () => {
      const script = {
        name: "Script1",
        actual_test_data: [{ action: "Click" }],
      };

      service.executeScript(script);

      expect(fnGetDelay).toHaveBeenCalledWith("medium");
      expect(cy.wait).toHaveBeenCalledWith(500);
    });


    //the error part
    it("executeScript() - should not run actions if actual_test_data missing", () => {
      const script: any = { name: "Script1",actual_test_data: undefined };

      service.executeScript(script);

      expect(clActionFactory.executeAction).not.toHaveBeenCalled();
      expect(clActionFactory.createAction).not.toHaveBeenCalled();
      expect(cy.wait).not.toHaveBeenCalled();
    });

    // ---------------- Connection creation ----------------

    it("executeScript() - should store created docname when connection is Create", () => {
      const script = {
        name: "Script1",
        idx: 1,
        actual_test_data: [{ action: "Click" }],
        connection: "Create",
        connection_doctype: "Sales Order",
      };

      service.executeScript(script);

      expect(context.createdDocnames).toContain("DOC-001");
      expect(context.createdDocsByIndex).toEqual([{ 1: "DOC-001" }]);
    });

    //the error part
    it("executeScript() - should not call connection factory when connection is not Create", () => {
      const script: any = {
        name: "Script1",
        
        actual_test_data: [{ action: "Click" }],
        connection: "update",
        connection_doctype:"Sales Order",
        idx: 1,

      };

      service.executeScript(script);

      expect(clConnectionFactory.connection).not.toHaveBeenCalled();
    });

    // ---------------- Capture created document from URL ----------------

    it("executeScript() - should capture docname from URL and store in storeDocname", () => {
      const script = { name: "Script1" };

      service.executeScript(script);

      expect(context.storeDocname.length).toBe(1);
      expect(context.storeDocname[0]).toMatchObject({
        idx: 1,
        docname: "DOC-URL-001",
      });
    });

    it("executeScript() - should not store docname if testLabRow not found", () => {
      // override service with testLabData without Script1
      const testLabData = { test_lab_script: [] };

      service = new clTestRunnerService(
        context,
        auth,
        report,
        targetURL,
        testLabData,
        {},
        { Script1: { email: "a@test.com", password: "123" } }
      );

      const script = { name: "Script1" };
      service.executeScript(script);

      expect(context.storeDocname.length).toBe(0);
    });

    // ---------------- finalizeScript() ----------------

    it("finalizeScript() - should do nothing if no currentScript", () => {
      context.currentScript = null;

      service.finalizeScript();

      expect(report.postRunLog).not.toHaveBeenCalled();
    });

    it("finalizeScript() - should reset context after finalize", () => {
      context.currentScript = { name: "Script1" } as any;
      context.isTestPassed = false;
      context.capturedErrors = ["E1"];
      context.capturedLogs = ["L1"];

      // stub report calls to avoid errors
      (report.postRunLog as jest.Mock).mockReturnValue(createCyThenable({ body: { data: { name: "RL-1" } } }));
      (report.getTestRun as jest.Mock).mockReturnValue(createCyThenable({ body: { data: { test_log: [] } } }));

      service.finalizeScript();

      expect(context.capturedErrors).toEqual([]);
      expect(context.capturedLogs).toEqual([]);
      expect(context.isTestPassed).toBe(true);
      expect(context.currentScript).toBe(null);
    });
  });
});
