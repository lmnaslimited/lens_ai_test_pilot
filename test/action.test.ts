import { clActionBanner } from "../src/action";
import {
  clActionValidateGroupButtonOptions,
  clActionClickInnerGroupButton,
} from '../src/action';
import { TactionData } from '../src/types';
import { fnGetDelay } from "../src/delay";
import {expect} from "@jest/globals";

jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500)
}));
(globalThis as any).Cypress = {
  env: () => 0,
};

describe("Action Classes", () => {
  let lMockAction: string;
  let laMockActionData: any;
  let cyMock: any;
  let buttonChain: any;
  let menuChain: any;

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

  describe('clActionValidateGroupButtonOptions', () => {
    let instance: clActionValidateGroupButtonOptions;

    beforeEach(() => {
      instance = new clActionValidateGroupButtonOptions({} as any, {} as any);
      instance.actionData = [
        {
          value: 'Create',
          menus: 'Single Variant, Multiple Variants',
        } as TactionData,
      ];
    });

    it('calls cy.wait before opening dropdown', () => {
      instance.executeAction();
      expect(cyMock.wait).toHaveBeenCalled();
    });

    it('opens dropdown using button label', () => {
      instance.executeAction();
      expect(cyMock.contains).toHaveBeenCalledWith('button', 'Create');
    });

    it('asserts button uniqueness before clicking', () => {
      instance.executeAction();
      expect(buttonChain.should).toHaveBeenCalledWith('have.length', 1);
    });

    it('clicks the group button', () => {
      instance.executeAction();
      expect(buttonChain.click).toHaveBeenCalledWith({ force: true });
    });

    it('validates existence of all menu items', () => {
      instance.executeAction();

      expect(menuChain.should).toHaveBeenCalledWith('exist');
      expect(cyMock.get).toHaveBeenCalledWith('a.dropdown-item');
    });
  });

  // clActionClickInnerGroupButton

  describe('clActionClickInnerGroupButton', () => {
    let instance: clActionClickInnerGroupButton;

    beforeEach(() => {
      instance = new clActionClickInnerGroupButton({} as any, {} as any);
      instance.actionData = [
        {
          value: 'Create',
          menus: 'Sales Order',
          is_hidden: false,
          is_read_only: false,
        } as TactionData,
      ];
    });

    it('waits before performing any action', () => {
      instance.executeAction();
      expect(cyMock.wait).toHaveBeenCalled();
    });

    it('clicks button when not hidden or readonly', () => {
      instance.executeAction();
      expect(cyMock.contains).toHaveBeenCalledWith('button', 'Create');
      expect(buttonChain.click).toHaveBeenCalled();
    });

    it('logs menu name before selecting it', () => {
      instance.executeAction();
      expect(cyMock.log).toHaveBeenCalledWith('Sales Order');
    });

    it('selects the dropdown menu item', () => {
      instance.executeAction();
      expect(cyMock.contains).toHaveBeenCalledWith(
        'a.dropdown-item',
        'Sales Order'
      );
      expect(menuChain.click).toHaveBeenCalledWith({ force: true });
    });

    it('does not click button when is_hidden is true', () => {
      instance.actionData[0].is_hidden = true;
      instance.executeAction();

      expect(buttonChain.should).toHaveBeenCalledWith('not.exist');
      expect(buttonChain.click).not.toHaveBeenCalled();
    });

    it('does not click button when is_read_only is true', () => {
      instance.actionData[0].is_read_only = true;
      instance.executeAction();

      expect(buttonChain.should).toHaveBeenCalledWith(
        'have.attr',
        'disabled'
      );
      expect(buttonChain.click).not.toHaveBeenCalled();
    });
  });
});