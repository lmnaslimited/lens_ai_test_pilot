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
clActionBreadcrumbs //Action used to check document id
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
and: jest.fn(() => cyChain)
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
        ldMockActionsData
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
        clActionFactory.createAction("Invalid Action", ldMockActionsData)
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
        "Invalid Test Script action type: Invalid Script Action"
      );
    });

    it("passes correct arguments to action constructor", () => {
      // GIVEN: A basic Onload action configuration
      // WHEN: Factory creates the action
      const LdInstance = clActionFactory.createAction(
        "Onload",
        ldMockActionsData
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
        structuredClone(laMockActionData)
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
        "This customer is not yet registred in SAP"
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
        structuredClone(laMockActionData)
      );

      // THEN: Action must fail fast with a clear error
      // This prevents silent UI failures
      expect(() => ldInstance.executeAction()).toThrow(
        "Banner message is missing"
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
        structuredClone(laMockActionData)
      );

      // WHEN: Banner action executes
      ldInstance.executeAction();

      // THEN: Only the first banner configuration should be applied
      // This ensures deterministic behavior and avoids UI conflicts
      expect(cyChain.should).toHaveBeenCalledWith(
        "contain.text",
        "This customer is not yet registred in SAP"
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
        structuredClone(laMockActionData)
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
        structuredClone(laMockActionData)
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
        structuredClone(laMockActionData)
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
        structuredClone(laMockActionData)
      );

      // Execute action
      ldInstance.executeAction();

// Ensure no click occurs when button is disabled
expect(cyChain.click).not.toHaveBeenCalled();
});
});

  describe("clActionAssignments", () => {
    let ldInstance: clActionAssignments;
    beforeEach(() => {
      // Arrange
      // GIVEN: Action data contains assignment configuration
      laMockActionData[0].action = "Validate Assignee";
      laMockActionData[0].message = "finance.user@example.com";
      // Create a fresh Banner action before every test
      // structuredClone ensures test data is not mutated across tests
       
      ldInstance = new clActionAssignments(
        "Validate Assignee",
        structuredClone(laMockActionData)
      );

    });
    it("Should call the Assignment action class when action is Validate Assignee", () =>{
      // Act + Assert
      expect(clActionFactory.createAction("Validate Assignee", laMockActionData)).toBeInstanceOf(clActionAssignments)
    })
    it("Should not call the Assignment action class when action is not Validate Assignee", ()=>{
      // Act + Assert
      expect(clActionFactory.createAction("Onload", laMockActionData)).not.toBeInstanceOf(clActionAssignments)
    })
    it("Should valid number of assignee", () => {
      // Act
      ldInstance.executeAction();

      // Assert
      expect(cyChain.should).toHaveBeenCalledWith("have.length",1);
    });
  
    it("Should have expected Assignee fullname", () => {
      // Act
      ldInstance.executeAction();

      // Assert
      expect(cyChain.filter).toHaveBeenCalledWith(`[title="finance.user@example.com"]`);
    })
    it("Document should have assignee", () => {
      // Act
      ldInstance.executeAction();

      // Assert
      expect(cyChain.should).toHaveBeenCalledWith("be.visible");
    })

    it("should throw error when no assignee is configured", () => {
        // Arrange: Assignment rule exists but no user defined
        laMockActionData[0].action = "Validate Assignee";
        laMockActionData[0].message = ""    
        
        // Act
        ldInstance = new clActionAssignments(
          "Validate Assignee",
          structuredClone(laMockActionData)
        );
        //  Assert
        expect(() => ldInstance.executeAction()).toThrow(
          "Assigned user name(s) are missing"
        );
    });
  });

  describe("clActionAttachments - Exact Attachment Validation", () => {

    let ldInstance: clActionAttachments;
    
    beforeEach(() => {
      laMockActionData[0].action = "Validate Attachment";
      laMockActionData[0].message =
        "Technical Datasheet_en.pdf, Technical Datasheet_fr.pdf, Technical Datasheet_de.pdf, invoice_pdf.pdf";
    
      ldInstance = new clActionAttachments (
        "validateattachment",
        structuredClone(laMockActionData)
      );
    });

    it("Should call Attachment action class when action is Validate Attachment", () => {
      expect(clActionFactory.createAction("Validate Attachment", laMockActionData)).toBeInstanceOf(clActionAttachments)
    })
    it("Should call the Attachment action class when action is Validate Attachment", () =>{
      // Act + Assert
      expect(clActionFactory.createAction("Onload", laMockActionData)).not.toBeInstanceOf(clActionAttachments)
    })
    it("should have expected no. of attachment in the document", () => {
      ldInstance.executeAction();
    
      expect(cyChain.should).toHaveBeenCalledWith(
        "have.length", 4
      );
    });

    it("should throw error if no attachment file names are configured", ()=>{
      // Arrange
      laMockActionData[0].message = ""
      // Act
      ldInstance = new clActionAttachments(
        "Validate Assignee",
        structuredClone(laMockActionData)
      );
      // Assert
      expect(()=>ldInstance.executeAction()).toThrow("Attachment name(s) are missing")
    })

    it("should have expected filename", () => {
      // Arrange
      // Expected attachment names
      const LaExpectedFiles = [
        "Technical Datasheet_en.pdf",
        "Technical Datasheet_fr.pdf",
        "Technical Datasheet_de.pdf",
        "invoice_pdf.pdf"
      ];

      // Act
      ldInstance.executeAction()

      // Assert
      LaExpectedFiles.forEach(iFile => {
        expect(cyMock.contains).toHaveBeenCalledWith(
          'ul.form-attachments li.attachment-row',
          iFile
        )
      })
      
      expect(cyMock.contains).toHaveBeenCalledTimes(4)
    });

    it("Attachment should be visible", () => {
      // Act
      ldInstance.executeAction()
      // Assert
      expect(cyChain.should).toHaveBeenCalledWith(
        "be.visible"
      )
    });
     
    // it("should wait before validating attachments", () => {
    //   ldInstance.executeAction();
    
    //   expect(fnGetDelay).toHaveBeenCalled();
    //   expect(cyMock.wait).toHaveBeenCalledWith(500);
    // });
    
  });
    //clActionBreadCrumbs - This suite validate the document id in the
  // document
  describe("Test Suite for clActionBreadCrumbs", () => {
    let ldBreadInstance: clActionBreadcrumbs
    beforeEach(()=>{
        // Arrange
      // Test Action Data row for Bread Crumbs
      laMockActionData[0].action = "Validate BreadCrumb"
      laMockActionData[0].value = "DTTHZ2N20260004"

      ldBreadInstance = new clActionBreadcrumbs(
        "Validate Breadcrumbs",
        laMockActionData
      )
    })
    it("Should call Breadcrumbs action class when action is Validate Breadcrumbs",()=>{
        // Act
      const ldAction = clActionFactory.createAction(
        "Validate Breadcrumbs", laMockActionData
      )
      // Assert
      // Expect the created action to be 
      // an instance of clActionBreadCrumbs
      expect(ldAction).toBeInstanceOf(clActionBreadcrumbs)
    })
    it("Should not call Breadcrumbs action class when action is not Validate Breadcrumbs",()=>{
        // Act 
        const ldAction = clActionFactory.createAction(
            "Onload", laMockActionData
          )
        // Assert
        // Expect the created action to be not
        // an instance of clActionBreadCrumbs
        expect(ldAction).not.toBeInstanceOf(clActionBreadcrumbs)
      })

    it("Should locate the document id in breadcrumbs", () => {
      ldBreadInstance.executeAction();
      expect(cyMock.contains).toHaveBeenCalledWith(
        '#navbar-breadcrumbs',
        'DTTHZ2N20260004',
      );
    });

    it("Should breadcrumb is visible", () => {
      ldBreadInstance.executeAction();
      expect(cyChain.should).toHaveBeenCalledWith('be.visible');
    });

    it("Should throw an error if no value was configured for breadcrumbs", ()=>{
        // arrange
        laMockActionData[0].value = ""
        ldBreadInstance = new clActionBreadcrumbs(
            "Validate Breadcrumbs",
            laMockActionData
          )
        // Act + Assert
        expect(()=> ldBreadInstance.executeAction()).toThrow("No value was configured for Breadcrumbs")
    })
  })

});
