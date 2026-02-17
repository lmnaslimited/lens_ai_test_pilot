// Import all action classes that are being tested
import {
  clActionFactory, // Factory that decides which action to create
  clActionOnLoad, // Action that runs on page load
  clActionBanner, // Action that validates banner messages
  clActionValidateGroupButtonOptions, // Action that checks dropdown menu options
  clActionClickInnerGroupButton, // Action that clicks a menu item inside a button
  clActionCreation, // Action used when creating a document
  clActionUpdate, // Action used when updating a document
  clActionAssignments,
  clActionAttachments,
  clActionBreadcrumbs, //Action used to check document id
} from "../src/action";

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
    };

    cyMock = {
      get: jest.fn(() => cyChain),
      contains: jest.fn(() => cyChain),
      wait: jest.fn(),
      log: jest.fn(),
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
      expect(cy.get).toHaveBeenCalledWith(
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
});
