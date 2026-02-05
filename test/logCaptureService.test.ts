// Import the TestContext type which defines the shared test execution state
import { ifTestContext } from "../src/types";

// Import the service under test which captures Cypress logs and errors
import { clLogCaptureService } from "../src/services/logCaptureService";

// Import Jest's assertion utility
import { expect } from "@jest/globals";

describe("LogCaptureService", () => {

  // Holds runtime test information like logs, errors, pass/fail status
  let context: ifTestContext;

  // Instance of the service we are testing
  let service: clLogCaptureService;

  // Stores Cypress event handlers registered via Cypress.on(...)
  // This allows us to manually trigger Cypress events in unit tests
  let cypressHandlers: Record<string, Function>;


  //  Arrange phase. This runs before every test case

  beforeEach(() => {

    // Initialize a fresh test context for each test
    // This mimics the runtime state during a Cypress test execution
    context = {
      currentScript: null,
      createdDocnames: [],
      storeDocname: [],
      createdDocsByIndex: [],
      capturedLogs: [],     // Stores captured Cypress logs/assertions
      capturedErrors: [],   // Stores captured Cypress errors
      isTestPassed: true    // Default test status is "passed"
    };

    // Reset Cypress handler storage before each test
    cypressHandlers = {};

    /**
     * Mock the global Cypress object.
     * In real Cypress, Cypress.on(...) registers event listeners.
     * Here, we intercept those registrations and store the handlers
     * so we can trigger them manually in unit tests.
     */
    (global as any).Cypress = {
      on: jest.fn((event: string, handler: Function) => {
        cypressHandlers[event] = handler;
      })
    };

    // Create the service instance with the test context
    service = new clLogCaptureService(context);

    // Register Cypress event listeners (log, fail, uncaught exception)
    service.register();
  });

  // Test: Capture standard Cypress log events
  it("should capture Cypress log events", () => {

    // Act: Manually trigger the "log:added" event
    // This simulates Cypress logging a normal message
    cypressHandlers["log:added"]({
      name: "log",
      message: "Test log message"
    });

    // Assert: Verify the log is stored in the expected formatted way
    expect(context.capturedLogs).toEqual([
      "[log] Test log message"
    ]);
  });

  // Test: Capture Cypress assertion logs
  it("should capture Cypress assertion events", () => {

    // Act: Trigger assertion-related log event
    cypressHandlers["log:added"]({
      name: "assert",
      message: "Assertion passed"
    });

    //  Assert: Assertion logs should also be captured
    expect(context.capturedLogs).toEqual([
      "[assert] Assertion passed"
    ]);
  });

  // Test: Ignore unsupported Cypress log types
  it("should ignore unsupported Cypress log event types", () => {

    // Act: Trigger a Cypress log type that is not relevant for capture
    cypressHandlers["log:added"]({
      name: "route",
      message: "Should be ignored"
    });

    // Assert: Unsupported log types should not pollute captured logs
    expect(context.capturedLogs).toEqual([]);
  });

    // Test: Handle Cypress test failure
  it("should rethrow the error on Cypress fail handler", () => {

    // Create a mock error similar to what Cypress throws on failure
    const error = new Error("Something went wrong");

    // Mock runnable metadata containing test title
    const runnable = { title: "should do something important" };

    // Act + Assert:
    // Cypress fail handler is expected to rethrow the error
    expect(() => {
      cypressHandlers["fail"](error, runnable);
    }).toThrow("Something went wrong");

  });

    it("should mark test as failed ", () => {

    const error = new Error("Something went wrong");
    const runnable = { title: "should do something important" };
    // Act
    try {
      cypressHandlers["fail"](error, runnable);
    } catch {
      // swallow error so we can assert state change
    }

    // Assert: Test status should be marked as failed
    expect(context.isTestPassed).toBe(false);


  });
  //   it("should capture error on Cypress fail", () => {

  //   const error = new Error("Something went wrong");
  //   const runnable = { title: "should do something important" };

  //   // Act
  //   try {
  //     cypressHandlers["fail"](error, runnable);
  //   } catch {
  //     // swallow error so we can assert state change
  //   }
  //   // Error should be logged with test title and error message
  //   expect(context.capturedErrors).toEqual([
  //     "Test Failed: should do something important - Something went wrong"
  //   ]);
  // });

  // Test: Suppress uncaught exceptions
  it("should suppress uncaught exceptions", () => {

    // Act:Trigger uncaught exception handler
    // Cypress expects returning false to prevent test crash
    const result = cypressHandlers["uncaught:exception"](
      new Error("Random crash")
    );

    //Assert: Returning false tells Cypress to ignore the exception
    expect(result).toBe(false);
  });
});