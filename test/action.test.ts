import { clActionBanner } from "../src/action";
import { fnGetDelay } from "../src/delay";
import {expect} from "@jest/globals";

jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500)
}));

describe("Action Classes", () => {
  let lMockAction: string;
  let laMockActionData: any;

  beforeEach(() => {
    (global as any).cy = {
      get: jest.fn().mockReturnThis(),
      should: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      within: jest.fn((cb: Function) => cb()),
      contains: jest.fn(),
      wait: jest.fn()
    };

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
        pos: 10,
        is_child: false,
        child_name: "",
        child_index: 0,
        add_row: false,
        field_name: "mock_field_1",
        action: "Onload",
        data_type: "",
        allow_on_submit: false,
        is_read_only: true,
        is_mandatory: false,
        is_hidden: false,
        parent: "mock_test_case",
        parentfield: "test_fields",
        parenttype: "Test Case Configurator",
        doctype: "Test Fields",
        section: "",
        tab: "",
        row_index: 1 as const,
        message_type: "",
        message: "This customer is not yet registred in SAP",
        value: "orange"
      }
    ];
  });

  describe("clActionBanner", () => {
    let ldBannerAction: clActionBanner;

    beforeEach(() => {
      lMockAction = "Banner";
      ldBannerAction = new clActionBanner(lMockAction, laMockActionData);
    });

    it("should select the banner element", () => {
      ldBannerAction.executeAction();
      expect(cy.get).toHaveBeenCalledWith(".form-message");
    });

    it("should assert banner visibility", () => {
      ldBannerAction.executeAction();
      expect(cy.should).toHaveBeenCalledWith("be.visible");
    });

    it("should apply banner color class", () => {
      ldBannerAction.executeAction();
      expect(cy.and).toHaveBeenCalledWith("have.class", "orange");
    });

    it("should validate banner message content", () => {
      ldBannerAction.executeAction();
      expect(cy.contains).toHaveBeenCalledWith(
        "This customer is not yet registred in SAP"
      );
    });

    it("should wait with medium delay", () => {
      ldBannerAction.executeAction();
      expect(cy.wait).toHaveBeenCalledWith(500);
    });

    it("should call fnGetDelay with medium", () => {
      ldBannerAction.executeAction();
      expect(fnGetDelay).toHaveBeenCalledWith("medium");
    });

    it("should use only first action row", () => {
      (ldBannerAction as any).actionData = [
        { message: "First", value: "info" },
        { message: "Second", value: "error" }
      ];

      ldBannerAction.executeAction();
      expect(cy.contains).toHaveBeenCalledWith("First");
    });

    it("should throw error when banner message is missing", () => {
      (ldBannerAction as any).actionData = [
        { message: "", value: "danger" }
      ];

      expect(() => ldBannerAction.executeAction()).toThrow(
        "Banner message is missing"
      );
    });

    it("should not execute Cypress commands when message is missing", () => {
      (ldBannerAction as any).actionData = [
        { message: null, value: "danger" }
      ];

      try {
        ldBannerAction.executeAction();
      } catch {}

      expect(cy.get).not.toHaveBeenCalled();
    });
  });
});