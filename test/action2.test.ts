import * as _ from "lodash";
import { expect as jestExpect } from "@jest/globals";

// ---------------------------------------------------
// Import action classes under test
// ---------------------------------------------------

import {
  clActionApiMethodGet,
  clActionApiMethodPost,
  clActionFactory,
} from "../src/action";

// ---------------------------------------------------
// Import TypeScript interfaces used in tests
// ---------------------------------------------------

import {
  ifTestContext,
  TactionData,
} from "../src/types";

// ---------------------------------------------------
// MOCK CYPRESS
// ---------------------------------------------------

// ---------------------------------------------------
// Mock global Cypress `cy` object
// Used for request, wrap, and logging in tests
// ---------------------------------------------------

(global as any).cy = {

  // Mock HTTP request
  request: jest.fn(),

  // Mock cy.wrap() to immediately resolve value
  // wrap: jest.fn((val) => ({
  //   then: (cb: any) => cb(val),
  // })),

  wrap: jest.fn((val) => ({
    then(cb: any) {
      const result = cb(val);
  
      return {
        then(cb2: any) {
          return cb2(result);
        },
      };
    },
  })),

  // Mock logging function
  log: jest.fn(),

} as any;

// ---------------------------------------------------
// Mock global Cypress namespace
// Provides env variables and lodash utilities
// ---------------------------------------------------

(globalThis as any).Cypress = {

  // Mock Cypress environment variables
  env: jest.fn(),

  // Provide lodash isMatch for internal validation
  _: {
    isMatch: _.isMatch,
    isMatchWith: _.isMatchWith,
    isObject: _.isObject,
  },

};

// ---------------------------------------------------
// Mock Chai-style expect
// Used because production code uses expect().to.be.true
// ---------------------------------------------------

(global as any).expect = (value: any) => ({

  to: {

    be: {

      // Getter for `.true` assertion
      get true() {

        // Throw error if value is not true
        if (value !== true) {
          throw new Error(
            `expected ${value} to be true`
          );
        }

        return true;
      },

    },

  },

});

// ---------------------------------------------------
// TEST SUITE
// ---------------------------------------------------

describe("API Method Action Classes", () => {

  // ---------------------------------------------------
  // Test execution context (shared state per run)
  // ---------------------------------------------------

  let ldContext: ifTestContext;

  // ---------------------------------------------------
  // Test lab configuration object
  // ---------------------------------------------------

  let ldTestLab: any;

  // ---------------------------------------------------
  // Mock action data used for GET/POST tests
  // ---------------------------------------------------

  let laMockActionData: TactionData[];

  // ---------------------------------------------------
  // GET action instance
  // ---------------------------------------------------

  let ldGetInstance: clActionApiMethodGet;

  // ---------------------------------------------------
  // POST action instance
  // ---------------------------------------------------

  let ldPostInstance: clActionApiMethodPost;

  // ---------------------------------------------------
  // Runs before each test
  // Resets mocks and initializes fresh instances
  // ---------------------------------------------------

  beforeEach(() => {

    // Reset all Jest mocks
    jest.clearAllMocks();

    // ---------------------------------------------------
    // Initialize test execution context
    // ---------------------------------------------------

    ldContext = {
      currentScript: null,
      currentScriptRowIdx: 1,
      createdDocnames: [],
      storeDocname: [],
      createdDocsByIndex: [],
      capturedLogs: [],
      capturedErrors: [],
      isTestPassed: true,
    };

    // ---------------------------------------------------
    // Initialize test lab container
    // ---------------------------------------------------

    ldTestLab = {
      test_lab_script: [],
    };

    // ---------------------------------------------------
    // Mock API action row data
    // Represents a single test configuration row
    // ---------------------------------------------------

    laMockActionData = [
      {
        doctype_to_be_tested: "Customer",
        name: "field_001",
        owner: "test@example.com",
        creation: new Date(),
        modified: new Date(),
        modified_by: "test@example.com",
        docstatus: 0,
        idx: 1,
        pos: 1,
        is_child: false,
        child_name: "",
        child_index: 0,
        add_row: false,
        field_name: "api_method",
        action: "API Method GET",
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
        value: "",
        menus: "frappe.auth.get_logged_user",
        description: JSON.stringify({
          message: "Administrator",
        }),
      } as TactionData,
    ];

    // ---------------------------------------------------
    // Mock Cypress environment variables
    // ---------------------------------------------------

    ((globalThis as any).Cypress.env as jest.Mock)
      .mockImplementation((iKey: string) => {

        // Base URL for API calls
        if (iKey === "TARGET_URL") {
          return "http://localhost:8000";
        }

        // Authentication token
        if (iKey === "TARGET_KEY") {
          return "token-123";
        }

        // Default fallback
        return null;

      });

    // ---------------------------------------------------
    // Create GET action instance
    // ---------------------------------------------------

    ldGetInstance = new clActionApiMethodGet(
      "API Method GET",
      laMockActionData,
      ldContext,
      ldTestLab
    );

    // Attach action row to instance
    (ldGetInstance as any).actionRow =
      laMockActionData[0];

    // ---------------------------------------------------
    // Create POST action instance
    // ---------------------------------------------------

    ldPostInstance = new clActionApiMethodPost(
      "API Method POST",
      laMockActionData,
      ldContext,
      ldTestLab
    );

    // Attach action row to instance
    (ldPostInstance as any).actionRow =
      laMockActionData[0];

  });

  // ===================================================
  // FACTORY TESTS
  // ===================================================

  describe("Factory", () => {

    // ---------------------------------------------------
    // Verify GET action factory creation
    // ---------------------------------------------------

    it("should create clActionApiMethodGet instance", () => {

      const LdInstance =
        clActionFactory.createAction(
          "API Method GET",
          laMockActionData
        );

      jestExpect(LdInstance)
        .toBeInstanceOf(clActionApiMethodGet);

    });

    // ---------------------------------------------------
    // Verify POST action factory creation
    // ---------------------------------------------------

    it("should create clActionApiMethodPost instance", () => {

      const LdInstance =
        clActionFactory.createAction(
          "API Method POST",
          laMockActionData
        );

      jestExpect(LdInstance)
        .toBeInstanceOf(clActionApiMethodPost);

    });

  });

  // ===================================================
  // API METHOD GET TEST SUITE
  // This block tests all behavior related to GET API action class
  // including endpoint building and response validation logic
  // ===================================================

  describe("clActionApiMethodGet", () => {

    // ---------------------------------------------------
    // buildEndpoint TESTS
    // Tests URL construction logic for GET API method
    // ---------------------------------------------------

    describe("buildEndpoint", () => {

      // Test: correct endpoint is constructed from base URL + method path
      it("should build correct endpoint", () => {

        const LEndpoint =
          (ldGetInstance as any).buildEndpoint();

        LEndpoint.then((iValue: string) => {

          jestExpect(iValue).toBe(
            "http://localhost:8000/api/method/frappe.auth.get_logged_user"
          );
        });
      });

      // Test: trailing slash in TARGET_URL should be removed
      it("should remove trailing slash from host", () => {

        ((globalThis as any).Cypress.env as jest.Mock)
          .mockImplementation((iKey: string) => {

            if (iKey === "TARGET_URL") {
              return "http://localhost:8000/";
            }

            return null;
          });

        const LEndpoint =
          (ldGetInstance as any).buildEndpoint();

        LEndpoint.then((iValue: string) => {

          jestExpect(iValue).toBe(
            "http://localhost:8000/api/method/frappe.auth.get_logged_user"
          );
        });
      });

      // Test: menus field should be trimmed before forming endpoint
      it("should trim menus field", () => {

        (ldGetInstance as any).actionRow = {
          menus:
            "   frappe.auth.get_logged_user   ",
        };

        const LEndpoint =
          (ldGetInstance as any).buildEndpoint();

        LEndpoint.then((iValue: string) => {

          jestExpect(iValue).toBe(
            "http://localhost:8000/api/method/frappe.auth.get_logged_user"
          );
        });
      });

      // Test: missing TARGET_URL should throw configuration error
      it("should throw when TARGET_URL missing", () => {

        ((globalThis as any).Cypress.env as jest.Mock)
          .mockReturnValue(undefined);

        jestExpect(() =>
          (ldGetInstance as any).buildEndpoint()
        ).toThrow(
          "API METHOD: TARGET_URL not configured."
        );
      });

      // Test: empty menus field should throw validation error
      it("should throw when menus missing", () => {

        (ldGetInstance as any).actionRow = {
          menus: "",
        };

        jestExpect(() =>
          (ldGetInstance as any).buildEndpoint()
        ).toThrow(
          "API METHOD: menus field is missing."
        );
      });

      // Test: completely missing actionRow should throw error
      it("should throw when menus undefined", () => {

        (ldGetInstance as any).actionRow = {};

        jestExpect(() =>
          (ldGetInstance as any).buildEndpoint()
        ).toThrow();
      });

      // Test: nested method paths should still be supported
      it("should allow nested method paths", () => {

        (ldGetInstance as any).actionRow = {
          menus:
            "frappe.desk.form.load.getdoc",
        };

        const LEndpoint =
          (ldGetInstance as any).buildEndpoint();

        LEndpoint.then((iValue: string) => {

          jestExpect(iValue).toContain(
            "/api/method/frappe.desk.form.load.getdoc"
          );
        });
      });

    });

    // ---------------------------------------------------
    // validateResponse TESTS
    // Tests response validation logic for GET API method
    // ---------------------------------------------------

    describe("validateResponse", () => {

      // Test: response should pass when expected subset matches actual
      it("should pass subset validation", () => {

        const LdResponse = {
          body: {
            message: "Administrator",
            full_name: "Admin",
          },
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            LdResponse,
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: successful validation should log confirmation message
      it("should log validation passed", () => {

        const LdResponse = {
          body: {
            message: "Administrator",
          },
        };

        (ldGetInstance as any).validateResponse(
          LdResponse,
          "/api/test"
        );

        jestExpect(cy.log).toHaveBeenCalledWith(
          "✔ validation passed"
        );
      });

      // Test: missing payload should throw error
      it("should throw when payload missing", () => {

        (ldGetInstance as any).actionRow = {
          description: "",
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            { body: {} },
            "/api/test"
          )
        ).toThrow();
      });

      // Test: missing response body should throw error
      it("should throw when response missing", () => {

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            { body: null },
            "/api/test"
          )
        ).toThrow();
      });

      // Test: mismatch between expected and actual values should fail validation
      it("should fail validation when values mismatch", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            message: "Guest",
          }),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                message: "Administrator",
              },
            },
            "/api/test"
          )
        ).toThrow();
      });

      // Test: comparison details should be logged on validation failure
      it("should log comparison details on failure", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            message: "Guest",
          }),
        };

        try {

          (ldGetInstance as any).validateResponse(
            {
              body: {
                message: "Administrator",
              },
            },
            "/api/test"
          );

        } catch {}

        const LLogs = (cy.log as jest.Mock).mock.calls
        .map(call => call[0]);

      const LComparisonLog = LLogs.find(log =>
        typeof log === "string" &&
        log.includes("COMPARING message")
      );

      jestExpect(LComparisonLog).toContain('EXPECTED: "Guest"');
      jestExpect(LComparisonLog).toContain('ACTUAL:   "Administrator"');

      });

      // Test: array order validation message should be logged
      it("should log array order validation message", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            message: "Guest",
          }),
        };

        try {

          (ldGetInstance as any).validateResponse(
            {
              body: {
                message: "Administrator",
              },
            },
            "/api/test"
          );

        } catch {}

        jestExpect(cy.log).toHaveBeenCalledWith(
          "Array Order is NOT strictly validated (Lodash isMatchWith ignores array index strictness"
        );

      });
      // Test: nested object validation should pass when subset matches
      it("should validate nested objects", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            data: {
              user: {
                name: "Administrator",
              },
            },
          }),
        };

        const LdResponse = {
          body: {
            data: {
              user: {
                name: "Administrator",
                role: "Admin",
              },
            },
          },
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            LdResponse,
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: array subset validation should pass
      it("should validate arrays", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            roles: ["System Manager"],
          }),
        };

        const LdResponse = {
          body: {
            roles: [
              "System Manager",
              "Accounts User",
            ],
          },
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            LdResponse,
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: invalid JSON in expected payload should throw error
      it("should throw for invalid JSON", () => {

        (ldGetInstance as any).actionRow = {
          description: "{ invalid json }",
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                message: "Admin",
              },
            },
            "/api/test"
          )
        ).toThrow();
      });

      // Test: boolean values should be validated correctly
      it("should validate boolean values", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            success: true,
          }),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                success: true,
                extra: "value",
              },
            },
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: numeric values should match exactly
      it("should validate numeric values", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            count: 10,
          }),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                count: 10,
              },
            },
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: numeric mismatch should fail validation
      it("should fail for numeric mismatch", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            count: 10,
          }),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                count: 5,
              },
            },
            "/api/test"
          )
        ).toThrow();
      });

      // Test: empty object validation should pass
      it("should validate empty objects", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({}),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {},
            },
            "/api/test"
          )
        ).not.toThrow();
      });

      // Test: null value validation should pass
      it("should validate null fields", () => {

        (ldGetInstance as any).actionRow = {
          description: JSON.stringify({
            value: null,
          }),
        };

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            {
              body: {
                value: null,
              },
            },
            "/api/test"
          )
        ).not.toThrow();
      });

    });

  });

  // ===================================================
  // API METHOD POST TEST SUITE
  // This block tests POST API action class behavior
  // including request building, headers, and validation settings
  // ===================================================

  describe("clActionApiMethodPost", () => {

    // ---------------------------------------------------
    // getMethod TESTS
    // Verifies HTTP method type returned by POST class
    // ---------------------------------------------------

    describe("getMethod", () => {

      // Test: method should always return POST
      it("should return POST", () => {

        jestExpect(
          (ldPostInstance as any).getMethod()
        ).toBe("POST");
      });

    });

    // ---------------------------------------------------
    // getValidStatusCodes TESTS
    // Validates allowed HTTP status codes for POST requests
    // ---------------------------------------------------

    describe("getValidStatusCodes", () => {

      // Test: 200 OK should be valid
      it("should allow 200", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).toContain(200);
      });

      // Test: 201 Created should be valid
      it("should allow 201", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).toContain(201);
      });

      // Test: 404 Not Found should NOT be valid
      it("should not allow 404", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).not.toContain(404);
      });

    });

    // ---------------------------------------------------
    // shouldValidateResponse TESTS
    // Controls whether POST response validation is enabled
    // ---------------------------------------------------

    describe("shouldValidateResponse", () => {

      // Test: POST validation should be disabled
      it("should disable validation", () => {

        jestExpect(
          (ldPostInstance as any)
            .shouldValidateResponse()
        ).toBe(false);
      });

    });

    // ---------------------------------------------------
    // getHeaders TESTS
    // Validates HTTP headers generated for POST request
    // ---------------------------------------------------

    describe("getHeaders", () => {

      // Test: Authorization header should contain token
      it("should return authorization header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers.Authorization)
          .toBe("token-123");
      });

      // Test: Content-Type should be JSON
      it("should return content type header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers["Content-Type"])
          .toBe("application/json");
      });

      // Test: Cookie header should include guest session
      it("should return cookie header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers.Cookie)
          .toContain("Guest");
      });

    });

    // ---------------------------------------------------
    // buildRequestBody TESTS
    // Validates request body parsing and transformation logic
    // ---------------------------------------------------

    describe("buildRequestBody", () => {

      // Test: valid JSON should be parsed correctly
      it("should parse payload JSON", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            title: "Test",
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody).toEqual({
          title: "Test",
        });
      });

      // Test: empty payload should throw error
      it("should throw when payload missing", () => {

        (ldPostInstance as any).actionRow = {
          description: "",
        };

        jestExpect(() =>
          (ldPostInstance as any)
            .buildRequestBody()
        ).toThrow();
      });

      // Test: invalid JSON should throw error
      it("should throw for invalid JSON", () => {

        (ldPostInstance as any).actionRow = {
          description: "{ invalid }",
        };

        jestExpect(() =>
          (ldPostInstance as any)
            .buildRequestBody()
        ).toThrow();
      });

      // Test: nested object structure should be preserved
      it("should parse nested objects", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            data: {
              name: "test",
            },
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody.data.name)
          .toBe("test");
      });

      // Test: arrays should be parsed correctly
      it("should parse arrays", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            items: [
              { qty: 1 },
              { qty: 2 },
            ],
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody.items).toHaveLength(2);
      });

      // Test: boolean values should be preserved
      it("should preserve boolean values", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            success: true,
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody.success).toBe(true);
      });

      // Test: null values should be preserved
      it("should preserve null values", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            value: null,
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody.value).toBeNull();
      });

      // Test: numeric values should be preserved
      it("should preserve numeric values", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({
            count: 100,
          }),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody.count).toBe(100);
      });

      // Test: empty object should be handled correctly
      it("should parse empty object", () => {

        (ldPostInstance as any).actionRow = {
          description: JSON.stringify({}),
        };

        const LdBody =
          (ldPostInstance as any)
            .buildRequestBody();

        jestExpect(LdBody).toEqual({});
      });

    });

  });

});