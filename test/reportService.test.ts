// 1) Import the service class which we are going to unit test (SUT - System Under Test)
import { clReportService } from "../src/services/reportService";

// 2) Import Jest expect explicitly to avoid Cypress/Chai expect type conflicts
//    This allows matchers like: toBe, toHaveBeenCalledWith, toHaveBeenCalledTimes
import { expect } from "@jest/globals";

// 3) describe() groups all tests related to ReportService into one test suite
describe("reportService", () => {
  // 4) Dummy input values for constructor (these are test doubles: DUMMIES)
  //    They are just placeholders to create the service instance.
  const targetUrl = "http://localhost:3000";

  // 5) Dummy headers used in every request
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "token 123",
  };

  // 6) Dummy test run name for getTestRun() method
  const testRunName = "Daily Run 01";

  // 7) Create variable to hold service instance (re-created fresh before each test)
  let reportService: clReportService;

  // 8) beforeEach() runs before every it() block
  //    It ensures each test starts with clean setup and no shared state.
  beforeEach(() => {
    // 9) Mock global Cypress object because Jest environment does not have Cypress runtime
    //    We create a fake cy object with request method.
    //    jest.fn() creates a Mock function (Spy + Stub).
    (global as any).cy = {
      request: jest.fn(),
    };

    // 10) Create a fresh ReportService instance for every test
    reportService = new clReportService(targetUrl, headers, testRunName);
  });

  // ==================== postRunLog() TESTS ====================

  // 11) Test case: Verify POST request is made correctly
  it("postRunLog() - should send POST request with correct url, headers and body", () => {
    // 12) Arrange: create payload for API call
    const payload = { a: 1 };

    // 13) Act: call the method under test
    reportService.postRunLog(payload);

    // 14) Assert: check cy.request was called with exact configuration
    expect(cy.request).toHaveBeenCalledWith({
      method: "POST",
      url: `${targetUrl}/api/resource/Run Log`,
      headers,
      body: JSON.stringify(payload),
    });
  });

  // 15) Test case: Verify payload is stringified using JSON.stringify
  it("postRunLog() - should stringify payload correctly", () => {
    // 16) Arrange: payload
    const payload = { run: "R1", status: "PASS" };

    // 17) Spy: track JSON.stringify calls without replacing its behavior
    const stringifySpy = jest.spyOn(JSON, "stringify");

    // 18) Act: call method
    reportService.postRunLog(payload);

    // 19) Assert: confirm stringify was called with correct payload
    expect(stringifySpy).toHaveBeenCalledWith(payload);

    // 20) Cleanup: restore original JSON.stringify
    stringifySpy.mockRestore();
  });

  // 21) Test case: Verify cy.request called exactly once
  it("postRunLog() - should call cy.request exactly once", () => {
    // 22) Act
    reportService.postRunLog({ x: 1 });

    // 23) Assert: call count
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  // 24) Test case: Works with empty payload
  it("postRunLog() - should work with empty payload", () => {
    // 25) Act
    reportService.postRunLog({});

    // 26) Assert: use objectContaining to check only body field
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: JSON.stringify({}),
      })
    );
  });

  // 27) Test case: Verify method returns cy.request return value (chainable)
  it("postRunLog() - should return cy.request return value", () => {
    // 28) Arrange: stub return value from cy.request
    const stubReturn = { ok: true };

    // 29) Stub: make cy.request return stubReturn
    (cy.request as jest.Mock).mockReturnValue(stubReturn);

    // 30) Act
    const result = reportService.postRunLog({ hello: "world" });

    // 31) Assert: return value should match stubReturn
    expect(result).toBe(stubReturn);
  });

  // ==================== getTestRun() TESTS ====================

  // 32) Test case: Verify GET request is made correctly
  it("getTestRun() - should send GET request with correct url and headers", () => {
    // 33) Act
    reportService.getTestRun();

    // 34) Assert
    expect(cy.request).toHaveBeenCalledWith({
      method: "GET",
      url: `${targetUrl}/api/resource/Test Run/${testRunName}`,
      headers,
    });
  });

  // 35) Test case: Verify cy.request called once
  it("getTestRun() - should call cy.request exactly once", () => {
    // 36) Act
    reportService.getTestRun();

    // 37) Assert
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  // 38) Test case: Verify return value is cy.request return value
  it("getTestRun() - should return cy.request return value", () => {
    // 39) Arrange: stub return value
    const stubReturn = { data: { name: "TR-001" } };

    // 40) Stub cy.request
    (cy.request as jest.Mock).mockReturnValue(stubReturn);

    // 41) Act
    const result = reportService.getTestRun();

    // 42) Assert
    expect(result).toBe(stubReturn);
  });

  // 43) Test case: URL formation with spaces in run name
  it("getTestRun() - should build correct URL even if testRunName has spaces", () => {
    // 44) Arrange: create new service instance with different run name
    const runName = "My Test Run 02";
    reportService = new clReportService(targetUrl, headers, runName);

    // 45) Act
    reportService.getTestRun();

    // 46) Assert: check URL contains runName
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${targetUrl}/api/resource/Test Run/${runName}`,
      })
    );
  });

  // 47) Test case: headers reference check
  it("getTestRun() - should pass headers correctly", () => {
    // 48) Act
    reportService.getTestRun();

    // 49) Capture arguments passed to cy.request
    const args = (cy.request as jest.Mock).mock.calls[0][0];

    // 50) Assert: headers should be same object reference
    expect(args.headers).toBe(headers);
  });

  // ==================== updateTestLog() TESTS ====================

  // 51) Test case: Verify PUT request is made correctly
  it("updateTestLog() - should send PUT request with correct url, headers and body", () => {
    // 52) Arrange
    const testLogId = "TL-001";
    const payload = { status: "PASS" };

    // 53) Act
    reportService.updateTestLog(testLogId, payload);

    // 54) Assert
    expect(cy.request).toHaveBeenCalledWith({
      method: "PUT",
      url: `${targetUrl}/api/resource/Test Log/${testLogId}`,
      headers,
      body: JSON.stringify(payload),
    });
  });

  // 55) Test case: Verify stringify called for update payload
  it("updateTestLog() - should stringify payload correctly", () => {
    // 56) Arrange
    const payload = { nested: { a: 10 } };

    // 57) Spy on JSON.stringify
    const stringifySpy = jest.spyOn(JSON, "stringify");

    // 58) Act
    reportService.updateTestLog("TL-777", payload);

    // 59) Assert
    expect(stringifySpy).toHaveBeenCalledWith(payload);

    // 60) Cleanup
    stringifySpy.mockRestore();
  });

  // 61) Test case: Verify cy.request called once
  it("updateTestLog() - should call cy.request exactly once", () => {
    // 62) Act
    reportService.updateTestLog("TL-999", { ok: true });

    // 63) Assert
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  // 64) Test case: Works with empty payload
  it("updateTestLog() - should work with empty payload", () => {
    // 65) Act
    reportService.updateTestLog("TL-123", {});

    // 66) Assert
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: JSON.stringify({}),
      })
    );
  });

  // 67) Test case: Verify return value
  it("updateTestLog() - should return cy.request return value", () => {
    // 68) Arrange
    const stubReturn = { updated: true };

    // 69) Stub
    (cy.request as jest.Mock).mockReturnValue(stubReturn);

    // 70) Act
    const result = reportService.updateTestLog("TL-555", { done: true });

    // 71) Assert
    expect(result).toBe(stubReturn);
  });
});
