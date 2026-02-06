import {
  clActionFactory,
  clActionOnLoad,
  clActionBanner,
  clActionValidateGroupButtonOptions,
  clActionClickInnerGroupButton,
  clActionCreation,
  clActionUpdate,
} from "../src/action";
// Update the import path to match the actual file name, e.g. test-action or test_action if that's correct;
import { fnGetDelay } from "../src/delay";
import { TactionData,  TTactionsData, TtestHeaderData, } from "../src/types";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

/* -------------------------------------------------
   Delay mock
-------------------------------------------------- */
jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500),
}));

/* -------------------------------------------------
   Cypress env mock
-------------------------------------------------- */
(globalThis as any).Cypress = {
  env: () => 0,
};

describe("Action Classes Unit Tests", () => {
  let cyMock: any;
  let ldBannerChain: any;
  let ldButtonChain: any;
  let ldMenuChain: any;

  /* -------------------------------------------------
     GLOBAL MOCK ACTION DATA (single source of truth)
  -------------------------------------------------- */
  let laMockActionData: TactionData[];

  beforeEach(() => {
    /* ---------- Cypress chain mocks ---------- */

    ldBannerChain = {
      last: jest.fn(() => ldBannerChain),
      should: jest.fn(() => ldBannerChain),
    };

    ldButtonChain = {
      should: jest.fn(() => ldButtonChain),
      click: jest.fn(() => ldButtonChain),
    };

    ldMenuChain = {
      contains: jest.fn(() => ldMenuChain),
      should: jest.fn(() => ldMenuChain),
      click: jest.fn(() => ldMenuChain),
    };

    cyMock = {
      get: jest.fn((selector: string) => {
        if (selector?.includes(".form-message")) return ldBannerChain;
        if (selector === "a.dropdown-item") return ldMenuChain;
        return ldMenuChain;
      }),

      contains: jest.fn((selector: string) => {
        if (selector === "button") return ldButtonChain;
        if (selector === "a.dropdown-item") return ldMenuChain;
        return ldButtonChain;
      }),

      wait: jest.fn(),
      log: jest.fn(),
    };

    (globalThis as any).cy = cyMock;

    /* ---------- Global action data ---------- */

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
        is_read_only: false,
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
        value: "orange",
        menus: "",
      } as TactionData,
    ];
  });
  describe("clActionFactory", () => {
      const ldMockActionsData: TTactionsData = [
    { pos: 10 } as TactionData,
    { pos: 10.5 } as TactionData,
    { pos: 20 } as TactionData,
    { pos: 30 } as TactionData,
  ];

    //  createAction()

    it("creates correct action instance for valid action type", () => {
      const LdInstance = clActionFactory.createAction(
        "On Intro Banner",
        ldMockActionsData
      );

      expect(LdInstance).toBeInstanceOf(clActionBanner);
    });

    it("throws error for invalid action type", () => {
      expect(() =>
        clActionFactory.createAction("Invalid Action", ldMockActionsData)
      ).toThrow("Invalid action type: Invalid Action");
    });

      // filterActionData()

    it("filters actions within same pos bucket", () => {
      const LdResult = clActionFactory.filterActionData(
        ldMockActionsData,
        { pos: 10 } as TactionData
      );

      expect(LdResult).toHaveLength(2);
      expect(LdResult.map(r => r.pos)).toEqual([10, 10.5]);
    });

    it("excludes actions outside pos range", () => {
      const LdResult = clActionFactory.filterActionData(
        ldMockActionsData,
        { pos: 20 } as TactionData
      );

      expect(LdResult.map(r => r.pos)).toEqual([20]);
    });

    it("returns empty array when no actions match", () => {
      const LdResult = clActionFactory.filterActionData(
        ldMockActionsData,
        { pos: 100 } as TactionData
      );

      expect(LdResult).toEqual([]);
    });

      // executeAction()

    it("creates correct test action instance for Create", () => {
      const LdScript: TtestHeaderData = {
        action: "Create",
        doctype_to_be_tested: "Sales Order",
      } as TtestHeaderData;

      const LdInstance = clActionFactory.executeAction(LdScript);
      expect(LdInstance).toBeInstanceOf(clActionCreation);
    });

    it("creates correct test action instance for Update", () => {
      const LdScript: TtestHeaderData = {
        action: "Update",
        doctype_to_be_tested: "Sales Order",
        document: "SO-0001",
      } as TtestHeaderData;

      const LdInstance = clActionFactory.executeAction(LdScript);
      expect(LdInstance).toBeInstanceOf(clActionUpdate);
    });

    it("throws error for invalid test script action", () => {
      const LdScript: TtestHeaderData = {
        action: "Invalid Script Action",
      } as TtestHeaderData;

      expect(() =>
        clActionFactory.executeAction(LdScript)
      ).toThrow("Invalid Test Script action type: Invalid Script Action");
    });

      // Sanity / wiring check

    it("passes correct arguments to action constructor", () => {
      const LdInstance = clActionFactory.createAction(
        "Onload",
        ldMockActionsData
      );

      expect(LdInstance).toBeInstanceOf(clActionOnLoad);
    });
});

    //  clActionBanner

  describe("clActionBanner", () => {
    let ldInstance: clActionBanner;

    beforeEach(() => {
      ldInstance = new clActionBanner("Banner", structuredClone(laMockActionData));
    });

    it("selects the banner element", () => {
      ldInstance.executeAction();
      expect(cyMock.get).toHaveBeenCalledWith(
        ".form-message.orange:visible"
      );
    });

    it("validates banner message content", () => {
      ldInstance.executeAction();
      expect(ldBannerChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP"
      );
    });

    it("waits with medium delay", () => {
      ldInstance.executeAction();
      expect(cyMock.wait).toHaveBeenCalledWith(500);
      expect(fnGetDelay).toHaveBeenCalledWith("medium");
    });

    it("throws error when banner message is missing", () => {
      laMockActionData[0].message = "";
      ldInstance = new clActionBanner("Banner", structuredClone(laMockActionData));

      expect(() => ldInstance.executeAction()).toThrow(
        "Banner message is missing"
      );
    });

    it("uses only first action row", () => {
      laMockActionData.push({
        ...laMockActionData[0],
        message: "Second message",
        value: "red",
      });

      ldInstance = new clActionBanner("Banner", structuredClone(laMockActionData));
      ldInstance.executeAction();

      expect(ldBannerChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP"
      );
    });
  });

    //  clActionValidateGroupButtonOptions

  describe("clActionValidateGroupButtonOptions", () => {
    let ldInstance: clActionValidateGroupButtonOptions;

    beforeEach(() => {
      laMockActionData[0].value = "Create";
      laMockActionData[0].menus = "Single Variant, Multiple Variants";

      ldInstance = new clActionValidateGroupButtonOptions(
        {} as any,
        structuredClone(laMockActionData)
      );
    });

    it("opens dropdown and validates menu options", () => {
      ldInstance.executeAction();

      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");
      expect(ldButtonChain.should).toHaveBeenCalledWith("have.length", 1);
      expect(ldButtonChain.click).toHaveBeenCalledWith({ force: true });

      expect(ldMenuChain.should).toHaveBeenCalledWith("exist");
      expect(cyMock.get).toHaveBeenCalledWith("a.dropdown-item");
    });
    it('calls cy.wait before opening dropdown', () => {
      ldInstance.executeAction();
      expect(cyMock.wait).toHaveBeenCalled();
    });
  });

    //  clActionClickInnerGroupButton

  describe("clActionClickInnerGroupButton", () => {
    let ldInstance: clActionClickInnerGroupButton;

    beforeEach(() => {
      laMockActionData[0].value = "Create";
      laMockActionData[0].menus = "Sales Order";
      laMockActionData[0].is_hidden = false;
      laMockActionData[0].is_read_only = false;

      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );
    });

    it("clicks button and selects menu item", () => {
      ldInstance.executeAction();

      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");
      expect(ldButtonChain.click).toHaveBeenCalled();
      expect(cyMock.log).toHaveBeenCalledWith("Sales Order");
      expect(ldMenuChain.click).toHaveBeenCalledWith({ force: true });
    });

    it("does not click when button is hidden", () => {
      laMockActionData[0].is_hidden = true;
      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );

      ldInstance.executeAction();
      expect(ldButtonChain.click).not.toHaveBeenCalled();
    });

    it("does not click when button is read-only", () => {
      laMockActionData[0].is_read_only = true;
      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );

      ldInstance.executeAction();
      expect(ldButtonChain.click).not.toHaveBeenCalled();
    });
  });
});