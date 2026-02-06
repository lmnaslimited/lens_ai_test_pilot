import { clReportService } from "../src/services/reportService";
import { expect } from "@jest/globals";

describe("reportService", () => {
  //  Dummy input values for constructor (these are test doubles: DUMMIES)
  //    They are just placeholders to create the service instance.
  const LTargetUrl = "http://localhost:3000";

  //  Dummy headers used in every request
  const LdHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "token 123",
  };

  // Dummy test run name for getTestRun() method
  const LTestRunName = "Daily Run 01";

  // Create variable to hold service instance (re-created fresh before each test)
  let ldReportService: clReportService;

  // beforeEach() runs before every it() block
  //    It ensures each test starts with clean setup and no shared state.
  beforeEach(() => {
    //  Mock global Cypress object because Jest environment does not have Cypress runtime
    //    We create a fake cy object with request method.
    //    jest.fn() creates a Mock function (Spy + Stub).
    (global as any).cy = {
      request: jest.fn(),
    };

    //  Create a fresh ReportService instance for every test
    ldReportService = new clReportService(LTargetUrl, LdHeaders, LTestRunName);
  });

  //  postRunLog() TESTS

  // Test case: Verify POST request is made correctly
  it("postRunLog() - should send POST request with correct url, headers and body", () => {
    // Arrange: create payload for API call
    const LdPayLoad = { a: 1 };

    // Act: call the method under test
    ldReportService.postRunLog(LdPayLoad);

    // Assert: check cy.request was called with exact configuration
    expect(cy.request).toHaveBeenCalledWith({
      method: "POST",
      url: `${LTargetUrl}/api/resource/Run Log`,
      headers: LdHeaders,
      body: JSON.stringify(LdPayLoad),
    });
  });

  // Test case: Verify payload is stringified using JSON.stringify
  it("postRunLog() - should stringify payload correctly", () => {
    // Arrange: payload
    const LdPayLoad = { run: "R1", status: "PASS" };

    // Spy: track JSON.stringify calls without replacing its behavior
    const LStringifySpy = jest.spyOn(JSON, "stringify");

    // Act: call method
    ldReportService.postRunLog(LdPayLoad);

    // Assert: confirm stringify was called with correct payload
    expect(LStringifySpy).toHaveBeenCalledWith(LdPayLoad);

    // Cleanup: restore original JSON.stringify
    LStringifySpy.mockRestore();
  });

  // Test case: Verify cy.request called exactly once
  it("postRunLog() - should call cy.request exactly once", () => {
    //  Act
    ldReportService.postRunLog({ x: 1 });

    // Assert: call count
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  //  Test case: Works with empty payload
  it("postRunLog() - should work with empty payload", () => {
    //  Act
    ldReportService.postRunLog({});

    // Assert: use objectContaining to check only body field
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: JSON.stringify({}),
      })
    );
  });

  // Test case: Verify method returns cy.request return value (chainable)
  it("postRunLog() - should return cy.request return value", () => {
    //  Arrange: stub return value from cy.request
    const LdStubReturn = { ok: true };

    //  Stub: make cy.request return LdStubReturn
    (cy.request as jest.Mock).mockReturnValue(LdStubReturn);

    // Act
    const LdResult = ldReportService.postRunLog({ hello: "world" });

    //  Assert: return value should match LdStubReturn
    expect(LdResult).toBe(LdStubReturn);
  });

  //  getTestRun() TESTS

  //  Test case: Verify GET request is made correctly
  it("getTestRun() - should send GET request with correct url and headers", () => {
    // Act
    ldReportService.getTestRun();

    // Assert
    expect(cy.request).toHaveBeenCalledWith({
      method: "GET",
      url: `${LTargetUrl}/api/resource/Test Run/${LTestRunName}`,
      headers: LdHeaders,
    });
  });

  // Test case: Verify cy.request called once
  it("getTestRun() - should call cy.request exactly once", () => {
    //  Act
    ldReportService.getTestRun();

    //  Assert
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  // Test case: Verify return value is cy.request return value
  it("getTestRun() - should return cy.request return value", () => {
    //  Arrange: stub return value
    const LdStubReturn = { data: { name: "TR-001" } };

    // Stub cy.request
    (cy.request as jest.Mock).mockReturnValue(LdStubReturn);

    //  Act
    const LdResult = ldReportService.getTestRun();

    //  Assert
    expect(LdResult).toBe(LdStubReturn);
  });

  // Test case: URL formation with spaces in run name
  it("getTestRun() - should build correct URL even if testRunName has spaces", () => {
    // Arrange: create new service instance with different run name
    const LRunName = "My Test Run 02";
    ldReportService = new clReportService(LTargetUrl, LdHeaders, LRunName);

    // Act
    ldReportService.getTestRun();

    // Assert: check URL contains runName
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${LTargetUrl}/api/resource/Test Run/${LRunName}`,
      })
    );
  });

  //  Test case: headers reference check
  it("getTestRun() - should pass headers correctly", () => {
    //  Act
    ldReportService.getTestRun();

    //  Capture arguments passed to cy.request
    const LdArgs = (cy.request as jest.Mock).mock.calls[0][0];

    //Assert: headers should be same object reference
    expect(LdArgs.headers).toBe(LdHeaders);
  });

  //updateTestLog() TESTS

  // Test case: Verify PUT request is made correctly
  it("updateTestLog() - should send PUT request with correct url, headers and body", () => {
    //  Arrange
    const LTestLogId = "TL-001";
    const LdPayLoad = { status: "PASS" };

    //  Act
    ldReportService.updateTestLog(LTestLogId, LdPayLoad);

    //  Assert
    expect(cy.request).toHaveBeenCalledWith({
      method: "PUT",
      url: `${LTargetUrl}/api/resource/Test Log/${LTestLogId}`,
      headers: LdHeaders,
      body: JSON.stringify(LdPayLoad),
    });
  });

  //  Test case: Verify stringify called for update payload
  it("updateTestLog() - should stringify payload correctly", () => {
    //  Arrange
    const LdPayLoad = { nested: { a: 10 } };

    // Spy on JSON.stringify
    const LStringifySpy = jest.spyOn(JSON, "stringify");

    //  Act
    ldReportService.updateTestLog("TL-777", LdPayLoad);

    //  Assert
    expect(LStringifySpy).toHaveBeenCalledWith(LdPayLoad);

    //  Cleanup
    LStringifySpy.mockRestore();
  });

  //  Test case: Verify cy.request called once
  it("updateTestLog() - should call cy.request exactly once", () => {
    //  Act
    ldReportService.updateTestLog("TL-999", { ok: true });

    //  Assert
    expect(cy.request).toHaveBeenCalledTimes(1);
  });

  // Test case: Works with empty payload
  it("updateTestLog() - should work with empty payload", () => {
    //  Act
    ldReportService.updateTestLog("TL-123", {});

    //  Assert
    expect(cy.request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: JSON.stringify({}),
      })
    );
  });

  //  Test case: Verify return value
  it("updateTestLog() - should return cy.request return value", () => {
    // Arrange
    const LdStubReturn = { updated: true };

    //  Stub
    (cy.request as jest.Mock).mockReturnValue(LdStubReturn);

    //  Act
    const LdResult = ldReportService.updateTestLog("TL-555", { done: true });

    //  Assert
    expect(LdResult).toBe(LdStubReturn);
  });
});