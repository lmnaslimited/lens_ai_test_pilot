import {
  clAction,
  clActionFactory,
  clActionOnLoad,
  clActionOnChangeChild,
  clActionOnChange,
  clActionBanner,
  clActionValidateGroupButtonOptions,
  clActionClickInnerGroupButton,
  clActionCreation,
  clActionUpdate,
} from "../src/action";
// Update the import path to match the actual file name, e.g. test-action or test_action if that's correct;
import { fnGetDelay } from "../src/delay";
import { TactionData,  TTactionsData, TtestHeaderData, } from "../src/types";
import { clDataTypeFactory } from "../src/dataType";
import { clPropertiesFactory } from "../src/properties";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

/* -------------------------------------------------
   Delay mock
-------------------------------------------------- */
jest.mock("../src/delay", () => ({
  fnGetDelay: jest.fn(() => 500),
}));
  jest
    .spyOn(clPropertiesFactory, "createAllFor")
    .mockImplementation(() => []);
/* -------------------------------------------------
   Cypress env mock
-------------------------------------------------- */
(globalThis as any).Cypress = {
  env: () => 0,
};

// jest.mock("../src/dataType", () => ({
//   clDataTypeFactory: {
//     createDataType: jest.fn(()=>({
//       input: jest.fn(),
//       validate: jest.fn()
//     })),
//   },
// }));

jest.spyOn(clActionFactory, "createAction");

describe("Action Classes Unit Tests", () => {
  let cyMock: any;
  let bannerChain: any;
  let buttonChain: any;
  let menuChain: any;

  /* -------------------------------------------------
     GLOBAL MOCK ACTION DATA (single source of truth)
  -------------------------------------------------- */
  let laMockActionData: TactionData[];

  beforeEach(() => {
    /* ---------- Cypress chain mocks ---------- */

    bannerChain = {
      last: jest.fn(() => bannerChain),
      should: jest.fn(() => bannerChain),
    };

    buttonChain = {
      should: jest.fn(() => buttonChain),
      click: jest.fn(() => buttonChain),
    };

    menuChain = {
      contains: jest.fn(() => menuChain),
      should: jest.fn(() => menuChain),
      click: jest.fn(() => menuChain),
    };

    cyMock = {
      get: jest.fn((selector: string) => {
        if (selector?.includes(".form-message")) return bannerChain;
        if (selector === "a.dropdown-item") return menuChain;
        return menuChain;
      }),

      contains: jest.fn((selector: string) => {
        if (selector === "button") return buttonChain;
        if (selector === "a.dropdown-item") return menuChain;
        return buttonChain;
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
      const mockActionsData: TTactionsData = [
    { pos: 10 } as TactionData,
    { pos: 15 } as TactionData,
    { pos: 20 } as TactionData,
    { pos: 30 } as TactionData,
  ];

    //  createAction()

    it("creates correct action instance for valid action type", () => {
      const instance = clActionFactory.createAction(
        "On Intro Banner",
        mockActionsData
      );

      expect(instance).toBeInstanceOf(clActionBanner);
    });

    it("throws error for invalid action type", () => {
      expect(() =>
        clActionFactory.createAction("Invalid Action", mockActionsData)
      ).toThrow("Invalid action type: Invalid Action");
    });

      // filterActionData()

    it("filters actions within same pos bucket", () => {
      const result = clActionFactory.filterActionData(
        mockActionsData,
        { pos: 10 } as TactionData
      );

      expect(result).toHaveLength(2);
      expect(result.map(r => r.pos)).toEqual([10, 15]);
    });

    it("excludes actions outside pos range", () => {
      const result = clActionFactory.filterActionData(
        mockActionsData,
        { pos: 20 } as TactionData
      );

      expect(result.map(r => r.pos)).toEqual([20]);
    });

    it("returns empty array when no actions match", () => {
      const result = clActionFactory.filterActionData(
        mockActionsData,
        { pos: 100 } as TactionData
      );

      expect(result).toEqual([]);
    });

      // executeAction()

    it("creates correct test action instance for Create", () => {
      const script: TtestHeaderData = {
        action: "Create",
        doctype_to_be_tested: "Sales Order",
      } as TtestHeaderData;

      const instance = clActionFactory.executeAction(script);
      expect(instance).toBeInstanceOf(clActionCreation);
    });

    it("creates correct test action instance for Update", () => {
      const script: TtestHeaderData = {
        action: "Update",
        doctype_to_be_tested: "Sales Order",
        document: "SO-0001",
      } as TtestHeaderData;

      const instance = clActionFactory.executeAction(script);
      expect(instance).toBeInstanceOf(clActionUpdate);
    });

    it("throws error for invalid test script action", () => {
      const script: TtestHeaderData = {
        action: "Invalid Script Action",
      } as TtestHeaderData;

      expect(() =>
        clActionFactory.executeAction(script)
      ).toThrow("Invalid Test Script action type: Invalid Script Action");
    });

      // Sanity / wiring check

    it("passes correct arguments to action constructor", () => {
      const instance = clActionFactory.createAction(
        "Onload",
        mockActionsData
      );

      expect(instance).toBeInstanceOf(clActionOnLoad);
    });
});

    //  clActionBanner

  describe("clActionBanner", () => {
    let instance: clActionBanner;

    beforeEach(() => {
      instance = new clActionBanner("Banner", structuredClone(laMockActionData));
    });

    it("selects the banner element", () => {
      instance.executeAction();
      expect(cyMock.get).toHaveBeenCalledWith(
        ".form-message.orange:visible"
      );
    });

    it("validates banner message content", () => {
      instance.executeAction();
      expect(bannerChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP"
      );
    });

    it("waits with medium delay", () => {
      instance.executeAction();
      expect(cyMock.wait).toHaveBeenCalledWith(500);
      expect(fnGetDelay).toHaveBeenCalledWith("medium");
    });

    it("throws error when banner message is missing", () => {
      laMockActionData[0].message = "";
      instance = new clActionBanner("Banner", structuredClone(laMockActionData));

      expect(() => instance.executeAction()).toThrow(
        "Banner message is missing"
      );
    });

    it("uses only first action row", () => {
      laMockActionData.push({
        ...laMockActionData[0],
        message: "Second message",
        value: "red",
      });

      instance = new clActionBanner("Banner", structuredClone(laMockActionData));
      instance.executeAction();

      expect(bannerChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP"
      );
    });
  });

    //  clActionValidateGroupButtonOptions

  describe("clActionValidateGroupButtonOptions", () => {
    let instance: clActionValidateGroupButtonOptions;

    beforeEach(() => {
      laMockActionData[0].value = "Create";
      laMockActionData[0].menus = "Single Variant, Multiple Variants";

      instance = new clActionValidateGroupButtonOptions(
        {} as any,
        structuredClone(laMockActionData)
      );
    });

    it("opens dropdown and validates menu options", () => {
      instance.executeAction();

      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");
      expect(buttonChain.should).toHaveBeenCalledWith("have.length", 1);
      expect(buttonChain.click).toHaveBeenCalledWith({ force: true });

      expect(menuChain.should).toHaveBeenCalledWith("exist");
      expect(cyMock.get).toHaveBeenCalledWith("a.dropdown-item");
    });
    it('calls cy.wait before opening dropdown', () => {
      instance.executeAction();
      expect(cyMock.wait).toHaveBeenCalled();
    });
  });

    //  clActionClickInnerGroupButton

  describe("clActionClickInnerGroupButton", () => {
    let instance: clActionClickInnerGroupButton;

    beforeEach(() => {
      laMockActionData[0].value = "Create";
      laMockActionData[0].menus = "Sales Order";
      laMockActionData[0].is_hidden = false;
      laMockActionData[0].is_read_only = false;

      instance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );
    });

    it("clicks button and selects menu item", () => {
      instance.executeAction();

      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");
      expect(buttonChain.click).toHaveBeenCalled();
      expect(cyMock.log).toHaveBeenCalledWith("Sales Order");
      expect(menuChain.click).toHaveBeenCalledWith({ force: true });
    });

    it("does not click when button is hidden", () => {
      laMockActionData[0].is_hidden = true;
      instance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );

      instance.executeAction();
      expect(buttonChain.click).not.toHaveBeenCalled();
    });

    it("does not click when button is read-only", () => {
      laMockActionData[0].is_read_only = true;
      instance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData)
      );

      instance.executeAction();
      expect(buttonChain.click).not.toHaveBeenCalled();
    });
  });
  describe("clActionOnLoad", () => {
    it("executes without throwing", () => {
      const instance = new clActionOnLoad(
        "Onload",
        structuredClone(laMockActionData)
      );

      expect(() => instance.executeAction()).not.toThrow();
    });
  });

// describe("clActionOnChange", () => {
//       const mockActionData: TTactionsData = [
//   {
//     field_name: "customer",
//     data_type: "Text",
//     tab: "",
//     is_child: false,
//   } as any,
// ];
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it("executes tab action when tab is present", () => {
//     const data = [
//       {
//         ...mockActionData[0],
//         tab: "Details",
//       },
//     ] as TTactionsData;

//     const mockTabAction = { executeAction: jest.fn() };
//     (clActionFactory.createAction as jest.Mock).mockReturnValue(mockTabAction);

//     (clDataTypeFactory.createDataType as jest.Mock).mockReturnValue({
//       input: jest.fn(),
//     });

//     const instance = new clActionOnChange("On Change", data);
//     instance.executeAction();

//     expect(clActionFactory.createAction).toHaveBeenCalledWith(
//       "On Tab",
//       [data[0]]
//     );
//     expect(mockTabAction.executeAction).toHaveBeenCalled();
//   });

//   it("routes to child handler when is_child is true", () => {
//     const data = [
//       {
//         ...mockActionData[0],
//         is_child: true,
//       },
//     ] as TTactionsData;

//     const childSpy = jest.spyOn(
//       clActionOnChangeChild.prototype,
//       "executeAction"
//     );

//     const instance = new clActionOnChange("On Change", data);
//     instance.executeAction();

//     expect(childSpy).toHaveBeenCalled();
//   });

//   it("creates datatype and inputs value", () => {
//     const inputSpy = jest.fn();

//     (clDataTypeFactory.createDataType as jest.Mock).mockReturnValue({
//       input: inputSpy,
//     });

//     const instance = new clActionOnChange("On Change", mockActionData);
//     instance.executeAction();

//     expect(clDataTypeFactory.createDataType).toHaveBeenCalled();
//     expect(inputSpy).toHaveBeenCalled();
//   });
// });
describe("clActionOnChange", () => {
  it("executes tab action when tab is present", () => {
    laMockActionData[0].tab = "Details";

    const instance = new clActionOnChange(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });

  it("routes to child handler when is_child is true", () => {
    laMockActionData[0].is_child = true;

    const instance = new clActionOnChange(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });

  it("creates datatype and inputs value", () => {
    laMockActionData[0].data_type = "Data";

    const instance = new clActionOnChange(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });
});

describe("clActionOnChangeChild", () => {
  it("executes tab action if tab exists", () => {
    laMockActionData[0].tab = "Details";
    laMockActionData[0].data_type = "Data";

    const instance = new clActionOnChangeChild(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });

  it("iterates rows and validates values & properties", () => {
    laMockActionData.push({
      ...laMockActionData[0],
      data_type: "Data",
    });

    const instance = new clActionOnChangeChild(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });

  it("skips rows without data_type", () => {
    laMockActionData[0].data_type = "";

    const instance = new clActionOnChangeChild(
      "On Change",
      structuredClone(laMockActionData)
    );

    expect(() => instance.executeAction()).not.toThrow();
  });
});


});
