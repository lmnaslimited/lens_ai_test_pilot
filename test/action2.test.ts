import * as _ from "lodash";
import { expect as jestExpect } from "@jest/globals";

import {
  clActionApiMethodGet,
  clActionApiMethodPost,
  clActionFactory,
} from "../src/action";

import {
  ifTestContext,
  TactionData,
} from "../src/types";

// ---------------------------------------------------
// MOCK CYPRESS
// ---------------------------------------------------

(global as any).cy = {
  request: jest.fn(),

  wrap: jest.fn((val) => ({
    then: (cb: any) => cb(val),
  })),

  log: jest.fn(),
} as any;

(globalThis as any).Cypress = {
  env: jest.fn(),

  _: {
    isMatch: _.isMatch,
  },
};

(global as any).expect = (value: any) => ({
    to: {
      be: {
        get true() {
  
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

  let ldContext: ifTestContext;

  let ldTestLab: any;

  let laMockActionData: TactionData[];

  let ldGetInstance: clActionApiMethodGet;

  let ldPostInstance: clActionApiMethodPost;

  beforeEach(() => {

    jest.clearAllMocks();

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

    ldTestLab = {
      test_lab_script: [],
    };

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

    ((globalThis as any).Cypress.env as jest.Mock)
      .mockImplementation((iKey: string) => {

        if (iKey === "TARGET_URL") {
          return "http://localhost:8000";
        }

        if (iKey === "TARGET_KEY") {
          return "token-123";
        }

        return null;
      });

    ldGetInstance = new clActionApiMethodGet(
      "API Method GET",
      laMockActionData,
      ldContext,
      ldTestLab
    );

    (ldGetInstance as any).actionRow =
      laMockActionData[0];

    ldPostInstance = new clActionApiMethodPost(
      "API Method POST",
      laMockActionData,
      ldContext,
      ldTestLab
    );

    (ldPostInstance as any).actionRow =
      laMockActionData[0];
  });

  // ===================================================
  // FACTORY TESTS
  // ===================================================

  describe("Factory", () => {

    it("should create clActionApiMethodGet instance", () => {

      const LdInstance =
        clActionFactory.createAction(
          "API Method GET",
          laMockActionData
        );

      jestExpect(LdInstance)
        .toBeInstanceOf(clActionApiMethodGet);
    });

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
  // API METHOD GET
  // ===================================================

  describe("clActionApiMethodGet", () => {

    // ---------------------------------------------------
    // buildEndpoint
    // ---------------------------------------------------

    describe("buildEndpoint", () => {

      it("should build correct endpoint", () => {

        const LEndpoint =
          (ldGetInstance as any).buildEndpoint();

        LEndpoint.then((iValue: string) => {

          jestExpect(iValue).toBe(
            "http://localhost:8000/api/method/frappe.auth.get_logged_user"
          );
        });
      });

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

      it("should throw when TARGET_URL missing", () => {

        ((globalThis as any).Cypress.env as jest.Mock)
          .mockReturnValue(undefined);

        jestExpect(() =>
          (ldGetInstance as any).buildEndpoint()
        ).toThrow(
          "API METHOD: TARGET_URL not configured."
        );
      });

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

      it("should throw when menus undefined", () => {

        (ldGetInstance as any).actionRow = {};

        jestExpect(() =>
          (ldGetInstance as any).buildEndpoint()
        ).toThrow();
      });

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
    // validateResponse
    // ---------------------------------------------------

    describe("validateResponse", () => {

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

      it("should throw when response missing", () => {

        jestExpect(() =>
          (ldGetInstance as any).validateResponse(
            { body: null },
            "/api/test"
          )
        ).toThrow();
      });

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

      it("should log expected subset on failure", () => {

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

        } catch {

          jestExpect(cy.log).toHaveBeenCalledWith(
            "Expected Subset:",
            JSON.stringify({
              message: "Guest",
            })
          );
        }
      });

      it("should log actual object on failure", () => {

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

        } catch {

          jestExpect(cy.log).toHaveBeenCalledWith(
            "Actual Object:",
            JSON.stringify({
              message: "Administrator",
            })
          );
        }
      });

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
  // API METHOD POST
  // ===================================================

  describe("clActionApiMethodPost", () => {

    describe("getMethod", () => {

      it("should return POST", () => {

        jestExpect(
          (ldPostInstance as any).getMethod()
        ).toBe("POST");
      });

    });

    describe("getValidStatusCodes", () => {

      it("should allow 200", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).toContain(200);
      });

      it("should allow 201", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).toContain(201);
      });

      it("should not allow 404", () => {

        const codes =
          (ldPostInstance as any)
            .getValidStatusCodes();

        jestExpect(codes).not.toContain(404);
      });

    });

    describe("shouldValidateResponse", () => {

      it("should disable validation", () => {

        jestExpect(
          (ldPostInstance as any)
            .shouldValidateResponse()
        ).toBe(false);
      });

    });

    describe("getHeaders", () => {

      it("should return authorization header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers.Authorization)
          .toBe("token-123");
      });

      it("should return content type header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers["Content-Type"])
          .toBe("application/json");
      });

      it("should return cookie header", () => {

        const headers =
          (ldPostInstance as any).getHeaders();

        jestExpect(headers.Cookie)
          .toContain("Guest");
      });

    });

    describe("buildRequestBody", () => {

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

      it("should throw when payload missing", () => {

        (ldPostInstance as any).actionRow = {
          description: "",
        };

        jestExpect(() =>
          (ldPostInstance as any)
            .buildRequestBody()
        ).toThrow();
      });

      it("should throw for invalid JSON", () => {

        (ldPostInstance as any).actionRow = {
          description: "{ invalid }",
        };

        jestExpect(() =>
          (ldPostInstance as any)
            .buildRequestBody()
        ).toThrow();
      });

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