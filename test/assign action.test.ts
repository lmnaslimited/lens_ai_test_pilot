// Import all action classes that are being tested
import {
  clActionAssignments, 
  clActionAttachments,
  clActionFactory
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
    
});
