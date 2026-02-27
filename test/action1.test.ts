// Import all action classes that are being tested
import {
  clActionFactory,
  clActionApiGet,
  clActionApiPut, // Factory that decides which action to create
} from "../src/action";
import { ifTestContext } from "../src/types";
// Import shared data types used by actions
import { TactionData } from "../src/types";

// Import Jest helpers for writing tests
import { expect } from "@jest/globals";

// Mock Cypress
(global as any).cy = {
  request: jest.fn(),
  wrap: jest.fn((val) => ({
    then: (cb: any) => cb(val),
  })),
  log: jest.fn(),
} as any;
// Cypress env mock-Cypress normally provides environment values at runtime
// Since we are running unit tests (not real Cypress tests),
// we mock the minimum behaviour needed
(globalThis as any).Cypress = {
  env: jest.fn(),
};

// This suite groups all Action-related unit tests
describe("Action Classes Unit Tests", () => {
  // These variables simulate Cypress command chains
  // They allow us to verify that certain UI actions were triggered
  let ldContext: ifTestContext;
  let ldTestLab: any;
  // GLOBAL MOCK ACTION DATA
  // This array represents action configuration rows
  // Think of this as test input coming from a test case setup screen
  let laMockActionData: TactionData[];

  // beforeEach runs before EVERY test
  beforeEach(() => {
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

  });
  describe("clActionApiPut", () => {
    let ldInstance: clActionApiPut;

    beforeEach(() => {
    ((globalThis as any).Cypress.env as jest.Mock)
    .mockReturnValue("test-token");
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
 
  describe("clActionApiGet - executeAction", () => {
  let ldInstance: clActionApiGet;
      const mockApiResponse = (status: number, body: any = { data: {} }) => {
      (cy.request as jest.Mock).mockReturnValue({
        then: (cb: any) =>
          cb({ status, body }),
      });
    };
    beforeEach(() => {

      // GIVEN: TARGET_URL is required to build endpoint
      // We mock Cypress.env because in Jest there is no real Cypress runtime.
      ((globalThis as any).Cypress.env as jest.Mock)
        .mockReturnValue("http://qsgbtest");

      // GIVEN: Fresh instance of API GET action
      // We recreate instance before every test to avoid shared state.
      ldInstance = new clActionApiGet(
        "API GET",
        laMockActionData as TactionData[],
        ldContext,
        ldTestLab
      );

      // Mock buildEndpoint()
      // We mock this because it internally depends on Cypress chain logic.
      // We only want to test executeAction behavior, not endpoint builder logic.
      jest.spyOn(ldInstance as any, "buildEndpoint").mockReturnValue({
        then: (cb: any) =>
          cb("http://qsgbtest/api/resource/Customer/TEST-0001"),
      });
    });
    /**
     * AFTER EACH TEST
     * Clear mocks to prevent leakage between test cases.
     */
    afterEach(() => jest.clearAllMocks());
    /**
     * GIVEN valid configuration
     * WHEN API returns 200
     * THEN request executes and response validation runs
     */
    it("should execute GET request successfully when status is 200",async () => {

      mockApiResponse(200);
      // Spy on validateResponse()
      // We verify that response validation is triggered.
      const validateSpy = jest
        .spyOn(ldInstance as any, "validateResponse")
        .mockImplementation(() => {});

      // WHEN: executeAction is called
    await ldInstance.executeAction();

      // THEN: API request must be triggered
      expect(cy.request).toHaveBeenCalled();
      // THEN: Response validation must run
      expect(validateSpy).toHaveBeenCalled();
    });
    /**
     * GIVEN valid configuration
     * WHEN API returns non-200 status
     * THEN error should be thrown
     */
    it("should throw error when status is not 200", () => {
      // Simulate API failure (404)
      mockApiResponse(404);
      // WHEN & THEN:
      // executeAction should throw because 404 is not valid.
      expect(() => ldInstance.executeAction()).toThrow();
    });

    it("should throw error if no action row provided", () => {

      // GIVEN no action row
      ldInstance.actionData = [];
      // WHEN executeAction runs THEN configuration error should be thrown
      expect(() => ldInstance.executeAction()).toThrow(
        "API Action: No action row provided."
      );
    });
    it("should throw error when API returns 500", () => {
    // WHEN API returns 500 status
    mockApiResponse(500);
    //  THEN error should be thrown
      expect(() => ldInstance.executeAction()).toThrow();
    });

    /**
     * GIVEN valid configuration
     * WHEN response validation is disabled
     * THEN validateResponse should not execute
     */
    it("should skip response validation when shouldValidateResponse returns false",async () => {

      jest.spyOn(ldInstance as any, "shouldValidateResponse")
        .mockReturnValue(false);
      mockApiResponse(200);
      const validateSpy = jest
        .spyOn(ldInstance as any, "validateResponse")
        .mockImplementation(() => {});

      await ldInstance.executeAction();

      expect(validateSpy).not.toHaveBeenCalled();
    });
    /**
     * GIVEN response without body.data
     * WHEN validation runs
     * THEN error should be thrown for invalid response structure
     */
    it("should throw error when response structure is invalid", () => {
      mockApiResponse(200, { invalid: "structure" });
      // (cy.request as jest.Mock).mockReturnValue({
      //   then: (cb: any) =>
      //     cb({ status: 200, body: {} }),
      // });
      expect(() => ldInstance.executeAction()).toThrow();
    });
    /**
     * GIVEN expected flat field configuration
     * WHEN response contains matching flat fields
     * THEN validation should pass
     */
    it("should validate flat fields correctly",async () => {

      ldInstance.actionData = [
        { value: "TEST-0001", assisting_doctype: "Customer" },
        { field_name: "customer_name", value: "John", data_type: "Data" }
      ] as any;
      mockApiResponse(200, { data: { customer_name: "John" } });
      await ldInstance.executeAction();

      expect(cy.request).toHaveBeenCalled();
    });



    /**
     * GIVEN expected flat field configuration
     * WHEN response value does not match
     * THEN validation should throw error
     */
    it("should throw error when flat field validation fails", () => {

      ldInstance.actionData = [
        { value: "TEST-0001", assisting_doctype: "Customer" },
        { field_name: "customer_name", value: "John", data_type: "Data" }
      ] as any;
      mockApiResponse(200, { data: { customer_name: "Jane" } });

      expect(() => ldInstance.executeAction()).toThrow();
    });
    /**
     * GIVEN response contains child table
     * WHEN child table values match expected
     * THEN grouped validation should pass
     */
    it("should validate grouped child table fields correctly",async () => {

      ldInstance.actionData = [
        { value: "TEST-0001", assisting_doctype: "Customer" },
        {
          field_name: "item_code",
          value: "ITEM-001",
          child_index: 1,
          child_name: "items",
          data_type: "Data"
        }
      ] as any;
      mockApiResponse(200, { data: { items: [{ item_code: "ITEM-001" }] } });
      await ldInstance.executeAction();
      expect(cy.request).toHaveBeenCalled();
    });
    /**
     * GIVEN child table expected
     * WHEN response child table is missing
     * THEN validation should throw error
     */
    it("should throw error when child table is missing", () => {

      ldInstance.actionData = [
        { value: "TEST-0001", assisting_doctype: "Customer" },
        {
          field_name: "item_code",
          value: "ITEM-001",
          child_index: 1,
          child_name: "items",
          data_type: "Data"
        }
      ] as any;
      mockApiResponse(200, { data: { } });

      expect(() => ldInstance.executeAction()).toThrow();
    });
    /**
     * GIVEN getMethod implementation
     * WHEN executeAction runs
     * THEN method should be GET
     */
    it("should call API using GET method", async() => {

      const methodSpy = jest.spyOn(ldInstance as any, "getMethod");
    // Disable validation completely
      jest.spyOn(ldInstance as any, "shouldValidateResponse")
          .mockReturnValue(false);
      // Mock successful API
      mockApiResponse(200, { data: {} });
      await ldInstance.executeAction();
      expect(methodSpy).toHaveBeenCalled();
      expect(methodSpy).toHaveReturnedWith("GET");
    });

    /**
     * GIVEN valid status code list
     * WHEN response status matches valid list
     * THEN no error should be thrown
     */
    it("should accept status 200 as valid", () => {

      const statusList = (ldInstance as any).getValidStatusCodes();

      expect(statusList).toContain(200);
    });
    /**
     * GIVEN GET request
     * WHEN buildRequestBody is called
     * THEN body should be undefined
     */
    it("should not send request body for GET method", () => {

      const body = (ldInstance as any).buildRequestBody();

      expect(body).toBeUndefined();
    });

  });

});