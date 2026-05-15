// Import all action classes that are being tested
import {
  clActionFactory, // Factory that decides which action to create
  clActionOnLoad, // Action that runs on page load
  clActionBanner, // Action that validates banner messages
  clActionValidateGroupButtonOptions, // Action that checks dropdown menu options
  clActionClickInnerGroupButton, // Action that clicks a menu item inside a button
  clActionCreation, // Action used when creating a document
  clActionUpdate, // Action used when updating a document
  clActionAssignments, //Action used to check Assignments
  clActionAttachments, //Action Used to check Attachments
  clActionBreadcrumbs, //Action used to check document id
  clActionValidateEmailAttachments,
  clActionModalDialog, // Action used to validate Email Attachment
} from "../src/action";
import { clDataTypeFactory } from "../src/dataType";

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
  env: () => 0,
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
      each: jest.fn((cb: Function) => {
    const fakeElements = [
      { type: "checkbox1" },
      { type: "checkbox2" }
    ];

    fakeElements.forEach(el => cb(el));
    return cyChain; // allow chaining
  })
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
        action: "Onload", // Action type
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
        value: "orange", // Banner color
        menus: "",
      } as TactionData,
    ];
  });

  // clActionFactory tests
  describe("clActionFactory", () => {
    // Mock multiple action rows with different execution positions
    // These positions decide which actions run together and in what order
    const ldMockActionsData: TTactionsData = [
      { pos: 10 } as TactionData,
      { pos: 10.5 } as TactionData,
      { pos: 20 } as TactionData,
      { pos: 30 } as TactionData,
    ];

    /*createAction()
Purpose:
- Factory should return the correct Action class
- Based only on the action name provided */

    it("creates correct action instance for valid action type", () => {
      // GIVEN: An action name that represents a banner shown on page intro
      // AND: A list of configured actions from test setup
      const LdInstance = clActionFactory.createAction(
        "On Intro Banner",
        ldMockActionsData,
      );

      // THEN: Factory must decide that this is a Banner-related action
      // AND: Return the Banner action implementation
      expect(LdInstance).toBeInstanceOf(clActionBanner);
    });

    it("throws error for invalid action type", () => {
      // GIVEN: An action name that the system does not support
      // WHEN: Factory is asked to create an action
      // THEN: It must fail fast with a clear error
      expect(() =>
        clActionFactory.createAction("Invalid Action", ldMockActionsData),
      ).toThrow("Invalid action type: Invalid Action");
    });

    /* filterActionData()
Purpose:
- Group actions that belong to the same execution bucket
- Actions with pos 10 and 10.x must execute together */

    it("filters actions within same pos bucket", () => {
      // GIVEN: Action rows with mixed execution positions
      // WHEN: We request actions for position 10
      const LdResult = clActionFactory.filterActionData(ldMockActionsData, {
        pos: 10,
      } as TactionData);

      // THEN: Actions at 10 and 10.5 should be grouped together
      expect(LdResult).toHaveLength(2);
      expect(LdResult.map((r) => r.pos)).toEqual([10, 10.5]);
    });

    it("excludes actions outside pos range", () => {
      // GIVEN: Action rows with multiple positions
      // WHEN: We request actions only for position 20
      const LdResult = clActionFactory.filterActionData(ldMockActionsData, {
        pos: 20,
      } as TactionData);

      // THEN: Only actions exactly matching this bucket are returned
      expect(LdResult.map((r) => r.pos)).toEqual([20]);
    });

    it("returns empty array when no actions match", () => {
      // GIVEN: No actions exist for this execution position
      // WHEN: Filter is applied
      const LdResult = clActionFactory.filterActionData(ldMockActionsData, {
        pos: 100,
      } as TactionData);

      // THEN: Factory should safely return an empty list
      expect(LdResult).toEqual([]);
    });

    /*executeAction()
Purpose:
- Decide which high-level test action to run
- Based on test header configuration*/

    it("creates correct test action instance for Create", () => {
      // GIVEN: Test script header says user is creating a new document
      const LdScript: TtestHeaderData = {
        action: "Create",
        doctype_to_be_tested: "Sales Order",
      } as TtestHeaderData;

      // WHEN: Factory executes the test action
      const LdInstance = clActionFactory.executeAction(LdScript);

      // THEN: Creation flow must be triggered
      expect(LdInstance).toBeInstanceOf(clActionCreation);
    });

    it("creates correct test action instance for Update", () => {
      // GIVEN: Test script header says user is updating an existing document
      const LdScript: TtestHeaderData = {
        action: "Update",
        doctype_to_be_tested: "Sales Order",
        document: "SO-0001",
      } as TtestHeaderData;

      // WHEN: Factory executes the test action
      const LdInstance = clActionFactory.executeAction(LdScript);

      // THEN: Update flow must be triggered
      expect(LdInstance).toBeInstanceOf(clActionUpdate);
    });

    it("throws error for invalid test script action", () => {
      // GIVEN: Test script header contains an unsupported action
      const LdScript: TtestHeaderData = {
        action: "Invalid Script Action",
      } as TtestHeaderData;

      // THEN: System must reject it clearly
      expect(() => clActionFactory.executeAction(LdScript)).toThrow(
        "Invalid Test Script action type: Invalid Script Action",
      );
    });

    it("passes correct arguments to action constructor", () => {
      // GIVEN: A basic Onload action configuration
      // WHEN: Factory creates the action
      const LdInstance = clActionFactory.createAction(
        "Onload",
        ldMockActionsData,
      );

      // THEN: The correct Onload action implementation must be used
      expect(LdInstance).toBeInstanceOf(clActionOnLoad);
    });
  });

  describe("clActionBanner", () => {
    // Holds the Banner action instance under test
    let ldInstance: clActionBanner;

    beforeEach(() => {
      // Create a fresh Banner action before every test
      // structuredClone ensures test data is not mutated across tests
      ldInstance = new clActionBanner(
        "Banner",
        structuredClone(laMockActionData),
      );
    });

    it("selects the banner element", () => {
      // WHEN: Banner action is executed
      ldInstance.executeAction();

      // THEN: System must locate the visible banner element
      // AND: Banner color should be applied via CSS class (orange)
      expect(cyMock.get).toHaveBeenCalledWith(".form-message.orange:visible");
    });

    it("validates banner message content", () => {
      // WHEN: Banner action runs
      ldInstance.executeAction();

      // THEN: Banner must display the configured message text
      // This ensures the user sees the correct validation or warning message
      expect(cyChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP",
      );
    });

    it("waits with medium delay", () => {
      // WHEN: Banner is shown
      ldInstance.executeAction();

      // THEN: Execution should pause to allow user to read the banner
      // Delay duration is controlled centrally via fnGetDelay
      expect(fnGetDelay).toHaveBeenCalledWith("medium");
      expect(cyMock.wait).toHaveBeenCalledWith(500);
    });

    it("throws error when banner message is missing", () => {
      // GIVEN: Banner configuration exists but message is empty
      // This is an invalid test setup
      laMockActionData[0].message = "";

      ldInstance = new clActionBanner(
        "Banner",
        structuredClone(laMockActionData),
      );

      // THEN: Action must fail fast with a clear error
      // This prevents silent UI failures
      expect(() => ldInstance.executeAction()).toThrow(
        "Banner message is missing",
      );
    });

    it("uses only first action row", () => {
      // GIVEN: Multiple banner configurations exist
      // This can happen due to incorrect test data setup
      laMockActionData.push({
        ...laMockActionData[0],
        message: "Second message",
        value: "red",
      });

      ldInstance = new clActionBanner(
        "Banner",
        structuredClone(laMockActionData),
      );

      // WHEN: Banner action executes
      ldInstance.executeAction();

      // THEN: Only the first banner configuration should be applied
      // This ensures deterministic behavior and avoids UI conflicts
      expect(cyChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP",
      );
    });
  });

  // clActionValidateGroupButtonOptions-This test suite verifies behaviour of a grouped button
  // where clicking a primary button opens a dropdown with menu options.
  describe("clActionValidateGroupButtonOptions", () => {
    let ldInstance: clActionValidateGroupButtonOptions;

    beforeEach(() => {
      // Mock action data setup
      // value → button label
      // menus → expected dropdown menu items
      laMockActionData[0].value = "Create";
      laMockActionData[0].menus = "Single Variant, Multiple Variants";

      // Create instance with mocked action data
      // First argument is unused context, so mocked as empty object
      ldInstance = new clActionValidateGroupButtonOptions(
        {} as any,
        structuredClone(laMockActionData),
      );
    });

    it("opens dropdown and validates menu options", () => {
      // Execute the action under test
      ldInstance.executeAction();

      // Verify that Cypress searches for a button with label "Create"
      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");

      // Ensure exactly one matching button exists
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 1);

      // Verify forced click on the button to open dropdown
      expect(cyChain.click).toHaveBeenCalledWith({ force: true });

      // Validate that dropdown menu exists after click
      expect(cyChain.should).toHaveBeenCalledWith("exist");

      // Ensure dropdown items are queried
      expect(cyMock.get).toHaveBeenCalledWith("a.dropdown-item");
    });

    it("calls cy.wait before opening dropdown", () => {
      // Execute action
      ldInstance.executeAction();

      // Ensure a wait is added to allow UI to stabilize
      expect(cyMock.wait).toHaveBeenCalled();
    });
  });

  // clActionClickInnerGroupButton-This suite validates clicking a grouped button
  // and selecting an inner dropdown menu option.
  describe("clActionClickInnerGroupButton", () => {
    let ldInstance: clActionClickInnerGroupButton;

    beforeEach(() => {
      // Mock button configuration
      laMockActionData[0].value = "Create"; // Button label
      laMockActionData[0].menus = "Sales Order"; // Inner menu item
      laMockActionData[0].is_hidden = false; // Button visible
      laMockActionData[0].is_read_only = false; // Button enabled

      // Instantiate action with mocked data
      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData),
      );
    });

    it("clicks button and selects menu item", () => {
      // Execute action logic
      ldInstance.executeAction();

      // Verify Cypress locates the correct group button
      expect(cyMock.contains).toHaveBeenCalledWith("button", "Create");

      // Ensure button click is triggered
      expect(cyChain.click).toHaveBeenCalled();

      // Log the selected menu item for debugging / traceability
      expect(cyMock.log).toHaveBeenCalledWith("Sales Order");

      // Force click on inner dropdown menu item
      expect(cyChain.click).toHaveBeenCalledWith({ force: true });
    });

    it("does not click when button is hidden", () => {
      // Simulate hidden button scenario
      laMockActionData[0].is_hidden = true;

      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData),
      );

      // Execute action
      ldInstance.executeAction();

      // Ensure no click occurs when button is hidden
      expect(cyChain.click).not.toHaveBeenCalled();
    });

    it("does not click when button is read-only", () => {
      // Simulate read-only button scenario
      laMockActionData[0].is_read_only = true;

      ldInstance = new clActionClickInnerGroupButton(
        {} as any,
        structuredClone(laMockActionData),
      );

      // Execute action
      ldInstance.executeAction();

      // Ensure no click occurs when button is disabled
      expect(cyChain.click).not.toHaveBeenCalled();
    });
  });
  // clActionAssignments - This suite validates that the correct
  //  assignees are displayed in the document
  describe("clActionAssignments", () => {
    // Declare test subject instance
    let ldInstance: clActionAssignments;
    // Helper function to create a fresh instance per test case
    const createInstance = (message: any) => {
      // GIVEN: Action type is "Validate Assignee"
      laMockActionData[0].action = "Validate Assignee";
      // GIVEN: Assignee message is set for the current test scenario
      laMockActionData[0].message = message;
      // WHEN: A new clActionAssignments instance is created
      // THEN: structuredClone will clone mock data
      // so modifications in one test do not affect others
      return new clActionAssignments(
        "Validate Assignee",
        structuredClone(laMockActionData),
      );
    };

    beforeEach(() => {
      // BEFORE EACH TEST:
      // Reset all Jest mocks to ensure clean verification of interactions
      jest.clearAllMocks();
    });

    it("creates clActionAssignments when action is Validate Assignee", () => {
      // GIVEN: Action type is Validate Assignee
      // WHEN: Factory creates action
      const LResult = clActionFactory.createAction(
        "Validate Assignee",
        laMockActionData,
      );
      // THEN: Instance should be clActionAssignments
      expect(LResult).toBeInstanceOf(clActionAssignments);
    });

    it("validates that exactly one assignee is present", () => {
      // GIVEN: A valid assignee is configured
      ldInstance = createInstance("Finance User");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Exactly one assignee should be found
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 1);
    });

    it("checks that the expected assignee name is present", () => {
      // GIVEN: Assignee email is Finance User
      ldInstance = createInstance("Finance User");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: It should filter using correct assignee title
      expect(cyChain.filter).toHaveBeenCalledWith(`[title="Finance User"]`);
    });

    it("ensures the assignee is visible in the document", () => {
      // GIVEN: Assignee is configured
      ldInstance = createInstance("Finance User");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Assignee element should be visible
      expect(cyChain.should).toHaveBeenCalledWith("be.visible");
    });

    it("throws error when no assignee is configured", () => {
      // GIVEN: Empty assignee value
      ldInstance = createInstance("");
      // WHEN + THEN: executeAction is called
      expect(() => ldInstance.executeAction()).toThrow(
        "Assigned user name(s) are missing",
      );
    });

    it("throws error when assignee contains only spaces", () => {
      // GIVEN: Assignee contains only whitespace
      ldInstance = createInstance("   ");
      // WHEN + THEN: executeAction is called
      expect(() => ldInstance.executeAction()).toThrow(
        "Assigned user name(s) are missing",
      );
    });

    it("throws error when assignee is undefined", () => {
      // GIVEN: Assignee is undefined
      ldInstance = createInstance(undefined as any);
      // WHEN + THEN: executeAction is called
      expect(() => ldInstance.executeAction()).toThrow(
        "Assigned user name(s) are missing",
      );
    });

    it("validates correct count when multiple assignees configured", () => {
      // GIVEN: Two users separated by comma and space
      ldInstance = createInstance("First User , Second  User ");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: It should validate length as 2
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("handles comma without space between users", () => {
      // GIVEN: Two users separated by comma without space
      ldInstance = createInstance("First User ,Second  User ");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Should treat as 2 users
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("handles trailing comma correctly", () => {
      // GIVEN: Single user with trailing comma
      ldInstance = createInstance("First User , ");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Should treat as 1 valid user
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 1);
    });

    it("handles double comma in message", () => {
      // GIVEN: Double comma between users
      ldInstance = createInstance("First User ,, Second  User ");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Should ignore empty entry and count valid users only
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("handles duplicate users correctly", () => {
      // GIVEN: Same user listed twice
      ldInstance = createInstance("First User , First User ");
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: Should count both occurrences
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("uses correct avatar selector", () => {
      ldInstance = createInstance("Finance User");
      // WHEN executeAction runs
      ldInstance.executeAction();
      // THEN correct avatar selector is used
      expect(cyMock.get).toHaveBeenCalledWith(
        "ul.form-assignments .assignments .avatar",
      );
    });
  });
  // clActionAttachments - This suite validates that the document
  // has exactly the attachments defined in the action configuration
  describe("clActionAttachments - Exact Attachment Validation", () => {
    let ldInstance: clActionAttachments;
    const createInstance = (message: any) => {
      laMockActionData[0].action = "Validate Attachment";
      laMockActionData[0].message = message;
      // Create deep-cloned dataset to ensure test isolation
      return new clActionAttachments(
        "Validate Attachment",
        structuredClone(laMockActionData),
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
      ldInstance = createInstance(
        "Technical Datasheet_en.pdf, Technical Datasheet_fr.pdf, Technical Datasheet_de.pdf, invoice_pdf.pdf",
      );
    });
    it("creates clActionAttachments when action is Validate Attachment", () => {
      // GIVEN: Action type is Validate Attachment
      // WHEN: Factory creates action
      const LResult = clActionFactory.createAction(
        "Validate Attachment",
        laMockActionData,
      );
      // THEN: Instance should be clActionAttachments
      expect(LResult).toBeInstanceOf(clActionAttachments);
    });

    it("does not create clActionAttachments when action type is different", () => {
      // GIVEN: Action type is Onload
      // WHEN: Factory creates action
      const LResult = clActionFactory.createAction("Onload", laMockActionData);
      // THEN: It should NOT be clActionAttachments
      expect(LResult).not.toBeInstanceOf(clActionAttachments);
    });

    it("validates that the document has exactly 4 attachments", () => {
      // GIVEN: 4 attachment names are configured
      // WHEN: executeAction is called
      ldInstance.executeAction();
      // THEN: It should validate that 4 attachments exist
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 4);
    });

    it("throws error when no attachment names are configured", () => {
      // GIVEN: Attachment message is empty
      const instance = createInstance("");
      // WHEN + THEN
      expect(() => instance.executeAction()).toThrow(
        "Attachment name(s) are missing",
      );
    });

    it("throws error when attachment message is undefined", () => {
      // GIVEN: Attachment message is undefined
      const instance = createInstance(undefined as any);
      // WHEN + THEN
      expect(() => instance.executeAction()).toThrow(
        "Attachment name(s) are missing",
      );
    });

    it("checks that all expected attachment file names are present", () => {
      // GIVEN: Expected attachment file names
      const LaExpectedFiles = [
        "Technical Datasheet_en.pdf",
        "Technical Datasheet_fr.pdf",
        "Technical Datasheet_de.pdf",
        "invoice_pdf.pdf",
      ];
      // WHEN
      ldInstance.executeAction();
      // THEN
      LaExpectedFiles.forEach((iFile) => {
        expect(cyMock.contains).toHaveBeenCalledWith(
          "ul.form-attachments li.attachment-row",
          iFile,
        );
      });
      expect(cyMock.contains).toHaveBeenCalledTimes(4);
    });

    it("handles trailing comma correctly", () => {
      // GIVEN: Trailing comma in attachment list
      const instance = createInstance("file1.pdf, ");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 1);
    });

    it("validates single attachment correctly", () => {
      // GIVEN: Only one attachment
      const instance = createInstance("invoice.pdf");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 1);
    });

    it("handles double comma between attachment names", () => {
      // GIVEN: Double comma in list
      const instance = createInstance("file1.pdf,, file2.pdf");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("handles extra whitespace around attachment names", () => {
      // GIVEN: Extra whitespace around file names
      const instance = createInstance(" file1.pdf ,  file2.pdf ");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("handles duplicate attachment names correctly", () => {
      // GIVEN: Duplicate attachment names
      const instance = createInstance("file1.pdf, file1.pdf");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });

    it("uses correct selector to fetch attachment rows", () => {
      // GIVEN: Valid single attachment
      const instance = createInstance("file1.pdf");
      // WHEN
      instance.executeAction();
      // THEN
      expect(cyMock.get).toHaveBeenCalledWith(
        "ul.form-attachments li.attachment-row",
      );
    });

    it("ensures attachment section is visible", () => {
      // GIVEN: Attachments are configured
      // WHEN
      ldInstance.executeAction();
      // THEN: Attachment rows should be asserted as visible
      expect(cyChain.should).toHaveBeenCalledWith("be.visible");
    });

    it("validates attachment count matches provided names", () => {
      // GIVEN: Multiple attachments
      const instance = createInstance("file1.pdf, file2.pdf");
      // WHEN
      instance.executeAction();
      // THEN: Should validate correct number of attachment rows
      expect(cyChain.should).toHaveBeenCalledWith("have.length", 2);
    });
  });
  //clActionBreadCrumbs - This suite validate the document id in the
  // document
  describe("Test Suite for clActionBreadCrumbs", () => {
    let ldBreadInstance: clActionBreadcrumbs;
    beforeEach(() => {
      // Arrange
      // Test Action Data row for Bread Crumbs
      laMockActionData[0].action = "Validate BreadCrumb";
      laMockActionData[0].value = "DTTHZ2N20260004";

      ldBreadInstance = new clActionBreadcrumbs(
        "Validate Breadcrumbs",
        laMockActionData,
      );
    });
    it("Should call Breadcrumbs action class when action is Validate Breadcrumbs", () => {
      // Act
      const ldAction = clActionFactory.createAction(
        "Validate Breadcrumbs",
        laMockActionData,
      );
      // Assert
      // Expect the created action to be
      // an instance of clActionBreadCrumbs
      expect(ldAction).toBeInstanceOf(clActionBreadcrumbs);
    });
    it("Should not call Breadcrumbs action class when action is not Validate Breadcrumbs", () => {
      // Act
      const ldAction = clActionFactory.createAction("Onload", laMockActionData);
      // Assert
      // Expect the created action to be not
      // an instance of clActionBreadCrumbs
      expect(ldAction).not.toBeInstanceOf(clActionBreadcrumbs);
    });

    it("Should locate the document id in breadcrumbs", () => {
      ldBreadInstance.executeAction();
      expect(cyMock.contains).toHaveBeenCalledWith(
        "#navbar-breadcrumbs",
        "DTTHZ2N20260004",
      );
    });

    it("Should breadcrumb is visible", () => {
      ldBreadInstance.executeAction();
      expect(cyChain.should).toHaveBeenCalledWith("be.visible");
    });

    it("Should throw an error if no value was configured for breadcrumbs", () => {
      // arrange
      laMockActionData[0].value = "";
      ldBreadInstance = new clActionBreadcrumbs(
        "Validate Breadcrumbs",
        laMockActionData,
      );
      // Act + Assert
      expect(() => ldBreadInstance.executeAction()).toThrow(
        "No value was configured for Breadcrumbs",
      );
    });
  });
  // clActionValidateEmailAttachments - THis suite validate the attachment
  // in the new email dialag
  describe("Test Suite for clActionValidateEmailAttachments", ()=>{
    let ldEmailValidation: clActionValidateEmailAttachments
    
    beforeEach(()=>{
      jest.clearAllMocks();
      // Modified the cypress mock
      // done in parent beforeEach to accomodate chainable
      // excution
      cyChain.should = jest.fn().mockReturnThis()
      cyChain.and = jest.fn().mockReturnThis()
      
      cyMock.wrap = jest.fn().mockReturnValue(cyChain);
    
      ldEmailValidation = new clActionValidateEmailAttachments("Validate Email Attachments", laMockActionData)
    })
    it("Should Instantiate Email Vlaidation class when action is Validate Email Attachments", ()=>{
      const LdEmailInstance = clActionFactory.createAction("Validate Email Attachments", laMockActionData)

      // When the Action type is "Validate Email Attachments", it should
      // instantiate clActionValidateEmailAttachments class
      expect(LdEmailInstance).toBeInstanceOf(clActionValidateEmailAttachments)
    })

    it("Should throw error when no attachments in email", () => {

      // Mock the sidebar attachment list.
      // This simulates Cypress finding one attachment in the sidebar
      // and manually invokes the .each() callback with a fake element
      // whose title attribute returns "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement: any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
      
      // Mock the email attachment list.
      // This simulates Cypress finding NO attachments in the email dialog.
      // The .each() callback is never invoked, so the email attachment array remains empty.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "" });
        return {then: (fn: Function) => fn()}
      });

      // First time cy.get() is called → return sidebar mock
      // Second time cy.get() is called → return email mock
      // because we are taking the input from sidebar then validating 
      // it in email (which is chainable action)
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach });

      // Since the email has no attachments,
      // the executeAction() method should throw the expected error.
      expect(()=>ldEmailValidation.executeAction())
        .toThrow("Email does not contain all sidebar attachments.");
    });

    it("Should throw error when attachments are missing in email", () => {

      // Mock the sidebar attachment list.
      // This simulates Cypress finding TWO attachments in the sidebar
      // by manually invoking the .each() callback twice with
      // fake elements returning "file1.pdf" and "file2.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        idSidebarElement({ attr: () => "file2.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding ONLY ONE attachment in the email dialog.
      // The .each() callback is invoked once with "file1.pdf".
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // First cy.get() call returns the sidebar mock (2 attachments)
      // Second cy.get() call returns the email mock (1 attachment)
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach });
      
      // Since the number of sidebar attachments (2)
      // does not match the number of email attachments (1),
      // the executeAction() method should throw "Attachment count mismatch."
      expect(() => ldEmailValidation.executeAction())
        .toThrow("Email does not contain all sidebar attachments.");
    });

    it("Should pass when attachment count are same", () => {

      // Mock the sidebar attachment list.
      // This simulates Cypress finding TWO attachments in the sidebar
      // by manually invoking the .each() callback twice with
      // fake elements returning "file1.pdf" and "file2.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        idSidebarElement({ attr: () => "file2.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding the SAME TWO attachments
      // in the email dialog by invoking the callback twice
      // with identical file names.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        idEmailElement({ attr: () => "file2.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      const LaCheckboxEach = jest.fn((idCheckboxElement: any) => {
        idCheckboxElement({});   // simulate one checkbox
        return { then: (fn: Function) => fn() }; // keep Cypress chain
      });
      // First cy.get() call returns the sidebar mock (2 attachments)
      // Second cy.get() call returns the email mock (same 2 attachments)
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach })
        .mockReturnValueOnce({ each: LaCheckboxEach });
      
      // Since both sidebar and email contain the same number of attachments
      // and the same file names, the validation should pass without throwing any error.
      expect(() => ldEmailValidation.executeAction())
        .not.toThrow("Email Attachment count mismatch.");
    });

    it("Should throw error when email does not contain all sidebar attachments", () => {

      // Mock the sidebar attachment list.
      // This simulates Cypress finding ONE attachment in the sidebar
      // with the filename "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding ONE attachment in the email dialog,
      // but with a DIFFERENT filename ("file2.pdf").
      // Therefore, the email does not contain the sidebar attachment.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file2.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // First cy.get() call returns the sidebar mock
      // Second cy.get() call returns the email mock
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach });
      
      // Since the email attachment list does NOT include "file1.pdf",
      // the validation logic should fail and throw an error.
      expect(() => ldEmailValidation.executeAction())
        .toThrow("Email does not contain all sidebar attachments.");
    });

    it("Should log success when validation passes", () => {
      // Mock the sidebar attachment list.
      // This simulates Cypress finding ONE attachment in the sidebar
      // with filename "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding the SAME attachment
      // in the email dialog ("file1.pdf"), ensuring validation will pass.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the checkbox validation step.
      // This simulates Cypress locating the attachment checkbox
      // and executing the .each() callback to verify it exists
      const LaCheckboxEach = jest.fn((idCheckboxElement:any) => {
        idCheckboxElement({});
      });

      // First cy.get() call → sidebar attachments
      // Second cy.get() call → email attachments
      // Third cy.get() call → checkbox elements
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach })
        .mockReturnValueOnce({ each: LaCheckboxEach });
    
        // Execute the validation action.
        // Since attachments match and validation passes,
        // the success log should be triggered.
        ldEmailValidation.executeAction();
    
      expect(cyMock.log).toHaveBeenCalledWith(
        "Email attachment validation successful."
      );
    });

    it("Should validate checkbox exists for selecting attachment", () => {
      // Mock the sidebar attachment list.
      // This simulates Cypress finding one attachment in the sidebar
      // and invoking the .each() callback with a fake element
      // whose title attribute returns "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding the same attachment
      // in the email dialog so that validation logic passes.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the checkbox selection step.
      // This simulates Cypress locating a checkbox element
      // and executing the .each() callback once.
      const LaCheckboxEach = jest.fn((idCheckboxElement:any) => {
        idCheckboxElement({});
      });
    
      // First cy.get() → sidebar attachments
      // Second cy.get() → email attachments
      // Third cy.get() → checkbox elements
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach })
        .mockReturnValueOnce({ each: LaCheckboxEach });
    
      // Execute the validation action.
      // Since attachments match, the checkbox validation step runs.
      ldEmailValidation.executeAction();

      // Verify that cy.wrap() was called,
      // which confirms the checkbox was processed
      // for existence and enabled-state validation.
      expect(cyMock.wrap).toHaveBeenCalled();
    });

    it("Should validate checkbox in not disabled", () => {
      // Mock the sidebar attachment list.
      // This simulates Cypress finding one attachment in the sidebar
      // and invoking the .each() callback with a fake element
      // whose title attribute returns "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding the same attachment
      // in the email dialog so that validation logic passes.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the checkbox selection step.
      // This simulates Cypress locating a checkbox element
      // and executing the .each() callback once.
      const LaCheckboxEach = jest.fn((idCheckboxElement:any) => {
        idCheckboxElement({});
        return { then: (fn: Function) => fn() };
      });
    
      // First cy.get() → sidebar attachments
      // Second cy.get() → email attachments
      // Third cy.get() → checkbox elements
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach })
        .mockReturnValueOnce({ each: LaCheckboxEach });
    
      // Execute the validation action.
      // Since attachments match, the checkbox validation step runs.
      ldEmailValidation.executeAction();

      // Assert checkbox existence validation was triggered.
      // This confirms checkbox is not disabled.
      expect(cyChain.and).toHaveBeenCalledWith("not.be.disabled");
    });

    it("Should throw error when checkbox is disabled", () => {
      // Mock the sidebar attachment list.
      // This simulates Cypress finding one attachment in the sidebar
      // and invoking the .each() callback with a fake element
      // whose title attribute returns "file1.pdf".
      const LaSidebarEach = jest.fn((idSidebarElement:any) => {
        idSidebarElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the email attachment list.
      // This simulates Cypress finding the same attachment
      // in the email dialog so that validation logic passes.
      const LaEmailEach = jest.fn((idEmailElement:any) => {
        idEmailElement({ attr: () => "file1.pdf" });
        return { then: (fn: Function) => fn() };
      });
    
      // Mock the checkbox selection step.
      // This simulates Cypress locating a checkbox element
      // and executing the .each() callback once.
      const LaCheckboxEach = jest.fn((idCheckboxElement:any) => {
        idCheckboxElement({});
      });
    
      // Here we override the Cypress chain method `.and()`.
      // When the validation checks for "not.be.disabled",
      // we force it to throw an error.
      // This simulates the real-world case where the checkbox
      // is disabled and cannot be interacted with.
      // Returning cyChain maintains chainability for other conditions.
      cyChain.and.mockImplementation((condition: string) => {
        if (condition === "not.be.disabled") {
          throw new Error("Checkbox is disabled.");
        }
        return cyChain;
      });
      // First cy.get() → sidebar attachments
      // Second cy.get() → email attachments
      // Third cy.get() → checkbox elements
      (cyMock.get as jest.Mock)
        .mockReturnValueOnce({ each: LaSidebarEach })
        .mockReturnValueOnce({ each: LaEmailEach })
        .mockReturnValueOnce({ each: LaCheckboxEach });
    
      // Assert checkbox existence validation was triggered.
      // This confirms checkbox is not disabled.
      expect(() => ldEmailValidation.executeAction()).toThrow("Checkbox is disabled.");
    });
  });

  // Test suite for Modal Dialog action class
  describe("clActionModalDialog", () => {
    let ldInstance: clActionModalDialog;
  
    // Mock DOM event listener attached to modal
    let fnMockAddEventListener: jest.Mock<
      (
        _event: unknown,
        idCb: Function,
        useCapture?: boolean,
      ) => void
    >;

    // Mock datatype object returned from factory
    let ldMockDT: {
      input: jest.Mock;
      validate: jest.Mock;
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      // Reset reusable mocks
      fnMockAddEventListener = jest.fn();
  
      ldMockDT = {
        input: jest.fn(),
        validate: jest.fn(),
      };
  
      // Reset action data
      laMockActionData.length = 0;
  
      laMockActionData.push({
        action: "Modal Dialog",
        value: "Create",
      } as TactionData);
  
      laMockActionData.push({
        message: "lost_reason",
        value: "Lost to competition",
        data_type: "Data",
      } as TactionData);
  
      // Mock Cypress chain
      cyChain.within = jest.fn((idCb: Function) => {
        idCb();
        return cyChain;
      });
  
      cyChain.contains = jest.fn(() => cyChain);
  
      cyChain.click = jest.fn(() => cyChain);
  
      cyChain.should = jest.fn(() => cyChain);
  
      cyMock.wrap = jest.fn(() => cyChain);
  
      cyMock.wait = jest.fn();
  
      cyMock.get.mockReturnValue({
        should: jest.fn(() => ({
          then: (idCb: Function) => {
            idCb([
              {
                addEventListener: fnMockAddEventListener,
              },
            ]);
          },
        })),
        find: jest.fn(() => cyChain),
      });
  
      // Mock datatype factory
      jest
        .spyOn(clDataTypeFactory, "createDataType")
        .mockReturnValue(ldMockDT as any);
  
      // Mock delay
      (global as any).fnGetDelay = jest.fn(() => 500);
    });
  
    afterEach(() => {
      jest.restoreAllMocks();
    });
  
    it("creates clActionModalDialog when action is Modal Dialog", () => {
      // GIVEN + WHEN
      const LResult = clActionFactory.createAction(
        "Modal Dialog",
        laMockActionData,
      );
  
      // THEN
      expect(LResult).toBeInstanceOf(clActionModalDialog);
    });
  
    it("throws error for invalid action type", () => {
      // GIVEN + WHEN + THEN
      expect(() =>
        clActionFactory.createAction(
          "Invalid Action",
          laMockActionData,
        ),
      ).toThrow("Invalid action type: Invalid Action");
    });
  
    it("throws error when modal is not found", () => {
      // GIVEN
      cyMock.get.mockReturnValue({
        should: jest.fn(() => ({
          then: () => {
            throw new Error("Modal not found");
          },
        })),
      });
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN + THEN
      expect(() => ldInstance.executeAction()).toThrow(
        "Modal not found",
      );
    });
  
    it("gets visible modal during execution", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyMock.get).toHaveBeenCalledWith(
        ".modal:visible",
      );
    });
  
    it("attaches keydown listener to modal", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(fnMockAddEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        true,
      );
    });
  
    it("prevents Enter key default behavior", () => {
      // GIVEN
      let fnKeydownHandler!: Function;
  
      fnMockAddEventListener = jest.fn(
        (_event: unknown, idCb: Function) => {
          fnKeydownHandler = idCb;
        },
      );
  
      cyMock.get.mockReturnValue({
        should: jest.fn(() => ({
          then: (idCb: Function) => {
            idCb([
              {
                addEventListener: fnMockAddEventListener,
              },
            ]);
          },
        })),
        find: jest.fn(() => cyChain),
      });
  
      const ldPreventDefault = jest.fn();
  
      const ldStopImmediate = jest.fn();
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      fnKeydownHandler({
        key: "Enter",
        preventDefault: ldPreventDefault,
        stopImmediatePropagation: ldStopImmediate,
      });
  
      // THEN
      expect(ldPreventDefault).toHaveBeenCalled();
  
      expect(ldStopImmediate).toHaveBeenCalled();
    });
  
    it("does not block non-enter key events", () => {
      // GIVEN
      let fnKeydownHandler!: Function;
  
      fnMockAddEventListener = jest.fn(
        (_event: unknown, idCb: Function) => {
          fnKeydownHandler = idCb;
        },
      );
  
      cyMock.get.mockReturnValue({
        should: jest.fn(() => ({
          then: (idCb: Function) => {
            idCb([
              {
                addEventListener: fnMockAddEventListener,
              },
            ]);
          },
        })),
        find: jest.fn(() => cyChain),
      });
  
      const ldPreventDefault = jest.fn();
  
      const ldStopImmediate = jest.fn();
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      fnKeydownHandler({
        key: "Escape",
        preventDefault: ldPreventDefault,
        stopImmediatePropagation: ldStopImmediate,
      });
  
      // THEN
      expect(ldPreventDefault).not.toHaveBeenCalled();
  
      expect(ldStopImmediate).not.toHaveBeenCalled();
    });
  
    it("processes rows inside modal scope", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyChain.within).toHaveBeenCalled();
    });
  
    it("creates datatype using datatype factory", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(
        clDataTypeFactory.createDataType,
      ).toHaveBeenCalledWith(
        "Data",
        ldInstance,
        expect.any(Object),
      );
    });
  
    it("calls datatype input method", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(ldMockDT.input).toHaveBeenCalled();
    });
  
    it("calls validate when menus exist", () => {
      // GIVEN
      (laMockActionData[1] as any).menus = "Lost";
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(ldMockDT.validate).toHaveBeenCalled();
    });
  
    it("restores original value after validation", () => {
      // GIVEN
      (laMockActionData[1] as any).menus = "Lost";
  
      const ldInputSpy = jest.fn();
  
      jest
        .spyOn(clDataTypeFactory, "createDataType")
        .mockReturnValue({
          input: ldInputSpy,
          validate: jest.fn(),
        } as any);
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(ldInputSpy).toHaveBeenCalled();
  
      expect(laMockActionData[1].value).toBe(
        "Lost to competition",
      );
    });
  
    it("skips rows containing action property", () => {
      // GIVEN
      laMockActionData.push({
        action: "Onload",
      } as any);
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(ldMockDT.input).toHaveBeenCalledTimes(1);
    });
  
    it("clicks modal button when label exists", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyChain.contains).toHaveBeenCalledWith(
        "Create",
        { matchCase: false },
      );
  
      expect(cyChain.click).toHaveBeenCalledWith({
        force: true,
      });
    });
  
    it("does not click button when label is empty", () => {
      // GIVEN
      laMockActionData[0].value = "";
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyChain.click).not.toHaveBeenCalled();
    });
  
    it("does not click button when label is undefined", () => {
      // GIVEN
      (laMockActionData[0] as any).value = undefined;
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyChain.click).not.toHaveBeenCalled();
    });
  
    it("waits using medium delay after execution", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyMock.wait).toHaveBeenCalledWith(500);
    });
  
    it("handles empty actionData safely", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        [],
      );
  
      // WHEN + THEN
      expect(() => ldInstance.executeAction()).toThrow();
    });
  
    it("handles datatype factory returning invalid datatype", () => {
      // GIVEN
      jest
        .spyOn(clDataTypeFactory, "createDataType")
        .mockReturnValue(undefined as any);
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN + THEN
      expect(() => ldInstance.executeAction()).toThrow();
    });
  
    it("handles datatype input failure", () => {
      // GIVEN
      jest
        .spyOn(clDataTypeFactory, "createDataType")
        .mockReturnValue({
          input: jest.fn(() => {
            throw new Error("Input failed");
          }),
          validate: jest.fn(),
        } as any);
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN + THEN
      expect(() => ldInstance.executeAction()).toThrow(
        "Input failed",
      );
    });
  
    it("handles datatype validate failure", () => {
      // GIVEN
      (laMockActionData[1] as any).menus = "Lost";
  
      jest
        .spyOn(clDataTypeFactory, "createDataType")
        .mockReturnValue({
          input: jest.fn(),
          validate: jest.fn(() => {
            throw new Error("Validation failed");
          }),
        } as any);
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN + THEN
      expect(() => ldInstance.executeAction()).toThrow(
        "Validation failed",
      );
    });
  
    it("handles missing data_type gracefully", () => {
      // GIVEN
      (laMockActionData[1] as any).data_type = undefined;
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(
        clDataTypeFactory.createDataType as jest.Mock,
      ).toHaveBeenCalledWith(
        undefined,
        ldInstance,
        expect.any(Object),
      );
    });
  
    it("handles rows without menus", () => {
      // GIVEN
      (laMockActionData[1] as any).menus = undefined;
  
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        structuredClone(laMockActionData),
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(ldMockDT.validate).not.toHaveBeenCalled();
  
      expect(ldMockDT.input).toHaveBeenCalled();
    });
  
    it("finds button from visible modal only", () => {
      // GIVEN
      ldInstance = new clActionModalDialog(
        "Modal Dialog",
        laMockActionData,
      );
  
      // WHEN
      ldInstance.executeAction();
  
      // THEN
      expect(cyMock.get).toHaveBeenCalledWith(
        ".modal:visible",
      );
    });
  });
});
