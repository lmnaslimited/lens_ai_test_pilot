// Import all action classes that are being tested
import {
  clActionFactory,
  clActionApiPut, // Factory that decides which action to create
} from "../src/action";
import { ifTestContext } from "../src/types";
// Import delay helper (used to simulate waiting in UI)
import { fnGetDelay } from "../src/delay";

// Import shared data types used by actions
import { TactionData, TTactionsData, TtestHeaderData } from "../src/types";

// Import Jest helpers for writing tests
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Delay mock-In real application, fnGetDelay returns different wait times
// For testing, we force it to always return 500ms
// This keeps tests predictable and fast
jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500),
}));

// Cypress env mock-Cypress normally provides environment values at runtime
// Since we are running unit tests (not real Cypress tests),
// we mock the minimum behaviour needed
(globalThis as any).Cypress = {
  env: () => "test-token",
};

// This suite groups all Action-related unit tests
describe("Action Classes Unit Tests", () => {
  // These variables simulate Cypress command chains
  // They allow us to verify that certain UI actions were triggered
  let cyMock: any;
  let cyChain: any;

  // GLOBAL MOCK ACTION DATA
  // This array represents action configuration rows
  // Think of this as test input coming from a test case setup screen
  let laMockActionData: TactionData[];

  // beforeEach runs before EVERY test
  beforeEach(() => {
    /*Generic Cypress chain mock
Why:
- Cypress commands are chainable
- Tests verify intent, not DOM structure */
    cyChain = {
      should: jest.fn(() => cyChain),
      click: jest.fn(() => cyChain),
      last: jest.fn(() => cyChain),
      contains: jest.fn(() => cyChain),
      filter: jest.fn(() => cyChain),
      and: jest.fn(() => cyChain),
    };

    cyMock = {
      get: jest.fn(() => cyChain),
      contains: jest.fn(() => cyChain),
      wait: jest.fn(),
      log: jest.fn(),
      wrap: jest.fn()
    };

    // Make the mocked Cypress object globally available
    (globalThis as any).cy = cyMock;

    /* ---------- Action data setup ---------- */
    // This represents one row of action configuration
    // Example: show a banner message during test execution
    laMockActionData = [
      {
        doctype_to_be_tested: "Quotation",
        name: "field_001",
        owner: "test.user@example.com",
        creation: new Date(),
        modified: new Date(),
        modified_by: "test.user@example.com",
        docstatus: 0,
        idx: 1,
        pos: 10, // Position defines execution order
        is_child: false,
        child_name: "",
        child_index: 0,
        add_row: false,
        field_name: "mock_field_1",
        action: "API PUT", // Action type
        data_type: "",
        allow_on_submit: false,
        is_read_only: false,
        is_mandatory: false,
        is_hidden: false,
        parent: "",
        parentfield: "",
        parenttype: "Test Case Configurator",
        doctype: "Test Fields",
        section: "",
        tab: "",
        row_index: 1 as const,
        message_type: "",
        message: "",
        value: "Quotation/20250002-test", // Banner color
        menus: "",
      } as TactionData,
      {
        doctype_to_be_tested: "Quotation",
        name: "field_001",
        owner: "test.user@example.com",
        creation: new Date(),
        modified: new Date(),
        modified_by: "test.user@example.com",
        docstatus: 0,
        idx: 1,
        pos: 10.01, // Position defines execution order
        is_child: false,
        child_name: "",
        child_index: 0,
        add_row: false,
        field_name: "project_name",
        action: "", // Action type
        data_type: "Data",
        allow_on_submit: false,
        is_read_only: false,
        is_mandatory: false,
        is_hidden: false,
        parent: "",
        parentfield: "",
        parenttype: "Test Case Configurator",
        doctype: "Test Fields",
        section: "",
        tab: "",
        row_index: 1 as const,
        message_type: "",
        message: "",
        value: "API Test", // Banner color
        menus: "",
      } as TactionData,
    ];
  });
describe("clActionApiPut", () => {

  let ldInstance: clActionApiPut;
  let ldContext: ifTestContext;
  let ldTestLab: any;

  beforeEach(() => {
    ldContext = {
      currentScript: null,
      currentScriptRowIdx: 1,
      createdDocnames: [],
      storeDocname: [],
      createdDocsByIndex: [],
      capturedLogs: [],
      capturedErrors: [],
      isTestPassed: true
    };

    ldTestLab = {
      test_lab_script: []
    };

    ldInstance = new clActionApiPut(
      "API PUT",
      laMockActionData as TactionData[],
      ldContext,
      ldTestLab
    );
  });
  //  FACTORY VALIDATION
  it("creates correct action instance for valid action type", () => {
    // GIVEN: Action type "API PUT" from configuration
    // WHEN: Factory creates action instance
    const LdInstance = clActionFactory.createAction(
      "API PUT",
      laMockActionData
    );

    // THEN: Factory must return clActionApiPut implementation
    expect(LdInstance).toBeInstanceOf(clActionApiPut);
  });

    //  HTTP METHOD VALIDATION
  it("uses PUT method for update execution", () => {
    // GIVEN: API PUT action configured for update operation
    // WHEN: Framework resolves HTTP method
    // NOTE: getMethod() is protected, so cast to 'any' for testing
    const method = (ldInstance as any).getMethod();

    // THEN: Method must be "PUT"
    expect(method).toBe("PUT");
  });

    //  STATUS CODE CONTRACT
  it("returns valid success status codes [200, 201]", () => {
    // GIVEN: API PUT action instance
    // WHEN: Valid status codes are requested
    const codes = (ldInstance as any).getValidStatusCodes();

    // THEN: Only 200 and 201 should be accepted
    expect(codes).toEqual([200, 201]);
  });

  it("does not allow 204 as valid status code", () => {
    // GIVEN: API PUT action instance
    // WHEN: Checking allowed status codes
    const codes = (ldInstance as any).getValidStatusCodes();

    // THEN: 204 must not be included (strict API contract)
    expect(codes.includes(204)).toBe(false);
  });

    //  RESPONSE VALIDATION BEHAVIOR
  it("disables response validation for PUT operation", () => {
    // GIVEN: PUT update action
    // WHEN: Checking if response validation is enabled
    const validate = (ldInstance as any).shouldValidateResponse();

    // THEN: Response validation must be disabled for update
    expect(validate).toBe(false);
  });

    //  HEADER BUILDING VALIDATION
  it("builds correct headers for authenticated PUT request", () => {
    // GIVEN: Cypress.env returns authentication token
    // WHEN: Headers are generated
    const headers = (ldInstance as any).getHeaders();

    // THEN: Headers must contain Authorization and JSON content type
    expect(headers).toEqual({
      Authorization: "test-token",
      Cookie:
        "full_name=Guest; sid=Guest; system_user=no; user_id=Guest; user_image=",
      "Content-Type": "application/json",
    });
  });

    //  REQUEST BODY MERGING LOGIC

  it("merges flat and grouped fields into single request body", () => {
    // GIVEN: Expected payload with parent and child fields
    (ldInstance as any).buildExpectedPayload = jest.fn(() => ({
      LdFlatFields: { project_name: "API Test" },
      LdGroupedFields: { items: [{ qty: 1 }] },
    }));

    // WHEN: Building request body
    const body = (ldInstance as any).buildRequestBody();

    // THEN: Parent and child fields must be merged
    expect(body).toEqual({
      project_name: "API Test",
      items: [{ qty: 1 }],
    });
  });

  it("allows grouped fields to override flat fields when keys collide", () => {
    // GIVEN: Same key present in both flat and grouped fields
    (ldInstance as any).buildExpectedPayload = jest.fn(() => ({
      LdFlatFields: { name: "Doc1" },
      LdGroupedFields: { name: "Overwritten" },
    }));

    // WHEN: Request body is built
    const body = (ldInstance as any).buildRequestBody();

    // THEN: Grouped field must override (spread precedence rule)
    expect(body.name).toBe("Overwritten");
  });
  it("returns empty object when no flat or grouped fields exist", () => {

    // GIVEN: buildExpectedPayload returns empty flat and grouped fields
    (ldInstance as any).buildExpectedPayload = jest.fn(() => ({
      LdFlatFields: {},
      LdGroupedFields: {},
    }));

    // WHEN: Request body is constructed
    const body = (ldInstance as any).buildRequestBody();

    // THEN: Final payload must be an empty object
    // AND: No crash should occur during spread operation
    expect(body).toEqual({});
  });
  it("handles undefined grouped fields without crashing", () => {

    // GIVEN: Grouped fields are undefined (edge case scenario)
    (ldInstance as any).buildExpectedPayload = jest.fn(() => ({
      LdFlatFields: { name: "Doc1" },
      LdGroupedFields: undefined,
    }));

    // WHEN: Building request body
    const build = () => (ldInstance as any).buildRequestBody();

    // THEN: System should not throw runtime error
    expect(build).not.toThrow();
  });
  it("preserves array structure for grouped child table fields", () => {

    // GIVEN: Grouped fields contain child table array structure
    (ldInstance as any).buildExpectedPayload = jest.fn(() => ({
      LdFlatFields: { title: "Order1" },
      LdGroupedFields: {
        items: [
          { qty: 1 },
          { qty: 2 }
        ]
      },
    }));

    // WHEN: Request body is generated
    const body = (ldInstance as any).buildRequestBody();

    // THEN: Child table array must remain intact
    // AND: Array structure should not be flattened or mutated
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
  });
  it("disables response validation for PUT operation", () => {

    // GIVEN: PUT action instance
    // WHEN: Checking validation flag
    const shouldValidate = (ldInstance as any).shouldValidateResponse();

    // THEN: Response validation must be disabled
    // AND: Only status code confirmation should be enforced
    expect(shouldValidate).toBe(false);

  });

});
});