// Import all action classes that are being tested
import {
  clActionAssignments, 
  clActionAttachments
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
    it("should assign document to configured user when assignment rule exists", () => {
  

      // WHEN
      ldInstance.executeAction();

      // THEN
      expect(cyChain.should).toHaveBeenCalledWith("have.length",1);
      expect(cyChain.filter).toHaveBeenCalledWith(`[title="finance.user@example.com"]`);
      expect(cyChain.should).toHaveBeenCalledWith("be.visible");
    });
    it("should throw error when no assignee is configured", () => {
        // GIVEN: Assignment rule exists but no user defined
        laMockActionData[0].action = "Validate Assignee";
        laMockActionData[0].message = ""          
      ldInstance = new clActionAssignments(
        "Validate Assignee",
        structuredClone(laMockActionData)
      );
        // WHEN + THEN
        expect(() => ldInstance.executeAction()).toThrow(
          "Assigned user name(s) are missing"
        );
    });
  });
  describe("clActionAttachments - Exact Attachment Validation", () => {

    let ldInstance: any;
    
    beforeEach(() => {
      laMockActionData[0].action = "validateattachment";
      laMockActionData[0].message =
        "Technical Datasheet_en.pdf, Technical Datasheet_fr.pdf, Technical Datasheet_de.pdf, invoice_pdf.pdf";
    
      ldInstance = new clActionAttachments (
        "validateattachment",
        structuredClone(laMockActionData)
      );
    });
    
    it("should pass when all expected attachments are present", () => {
      cyMock.get = jest.fn(() => ({
        each: (callback: any) => {
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_fr.pdf" });
          callback({ innerText: "Technical Datasheet_de.pdf" });
          callback({ innerText: "invoice_pdf.pdf" });
        }
      }));
    
      ldInstance.executeAction();
    
      expect(cyMock.log).toHaveBeenCalledWith(
        "All expected attachments are present"
      );
    });
    
    it("should fail when one expected attachment is missing", () => {
      cyMock.get = jest.fn(() => ({
        each: (callback: any) => {
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_fr.pdf" });
          callback({ innerText: "invoice_pdf.pdf" });
        }
      }));
    
      expect(() => ldInstance.executeAction()).toThrow(
        "Missing expected attachment: Technical Datasheet_de.pdf"
      );
    });
    
    it("should fail when no attachments are present", () => {
      cyMock.get = jest.fn(() => ({
        each: (_callback: any) => {}
      }));
    
      expect(() => ldInstance.executeAction()).toThrow(
        "No attachments found for validation"
      );
    });
    
    it("should fail when duplicate attachments exist", () => {
      cyMock.get = jest.fn(() => ({
        each: (callback: any) => {
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_fr.pdf" });
          callback({ innerText: "Technical Datasheet_de.pdf" });
          callback({ innerText: "invoice_pdf.pdf" });
        }
      }));
    
      expect(() => ldInstance.executeAction()).toThrow(
        "Duplicate attachment detected: Technical Datasheet_en.pdf"
      );
    });
    
    it("should ignore attachment order", () => {
      cyMock.get = jest.fn(() => ({
        each: (callback: any) => {
          callback({ innerText: "invoice_pdf.pdf" });
          callback({ innerText: "Technical Datasheet_de.pdf" });
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_fr.pdf" });
        }
      }));
    
      ldInstance.executeAction();
    
      expect(cyMock.log).toHaveBeenCalledWith(
        "All expected attachments are present"
      );
    });
    
    it("should fail if unexpected extra attachment exists when strict mode enabled", () => {
      laMockActionData[0].is_mandatory = true; // interpret as strict mode
    
      cyMock.get = jest.fn(() => ({
        each: (callback: any) => {
          callback({ innerText: "Technical Datasheet_en.pdf" });
          callback({ innerText: "Technical Datasheet_fr.pdf" });
          callback({ innerText: "Technical Datasheet_de.pdf" });
          callback({ innerText: "invoice_pdf.pdf" });
          callback({ innerText: "extra_file.pdf" });
        }
      }));
    
      expect(() => ldInstance.executeAction()).toThrow(
        "Unexpected attachment detected: extra_file.pdf"
      );
    });
    
    it("should wait before validating attachments", () => {
      ldInstance.executeAction();
    
      expect(fnGetDelay).toHaveBeenCalled();
      expect(cyMock.wait).toHaveBeenCalledWith(500);
    });
    
    });
    
});
