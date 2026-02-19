/** @interface ifActionHandler - Represents a handler for performing various actions with associated data.*/
export interface ifActionHandler {
    action: string
    actionData: TTactionsData
    actionRow: TactionData
    executeAction(): void
    checkFieldValue(): void
    checkFieldProperties(): void
    dataType: ifDataType
}
/**@interface ifDataType - Defines for handling different data types. */
export interface ifDataType {
    dataType: string
    action: ifActionHandler
    validate(): void
    input(): void
}
export interface ifProperties {
    is_read_only: boolean;
    is_mandatory: boolean;
    is_hidden: boolean;
    action: ifActionHandler
    validate(): void
    fieldSelector: string;
    fieldProp: string;
    getSelector(): string;
}
/**@type TtestHeaderData - Represents test header data structure.
 *  Contains details about the doctype_to_be_tested and relevant test field data. */
export type TtestHeaderData = {
    name: string;
    owner: string;
    creation: Date;
    modified: Date;
    modified_by: string;
    docstatus: number;
    idx: number;
    title: string;
    sequence: number;
    site: string;
    doctype_to_be_tested: string;
    client_name: string;
    json_response: string;
    doctype: string;
    action: string;
    document: string;
    test_script: string;
    actual_test_data: TTactionsData;
};
/**@type TactionData - Represents the action data.
 * Stores information about an action performed on a field, 
 */
export type TactionData = {
    doctype_to_be_tested: any
    name: string;
    owner: string;
    creation: Date;
    modified: Date;
    modified_by: string;
    docstatus: number;
    idx: number;
    pos: number;
    field_name: string;
    is_child: boolean;
    child_name: string;
    child_index: number;
    add_row: boolean;
    action: string;
    value: string;
    data_type: string;
    allow_on_submit: boolean;
    is_read_only: boolean;
    is_mandatory: boolean;
    is_hidden: boolean;
    parent: string;
    parentfield: string;
    parenttype: string;
    doctype: string;
    section: string;
    tab: string;
    row_index: 1;
    message_type: string;
    message: string;
    menus : string;
};
/**@type TTactionsData - Represents an array of action data. */
export type TTactionsData = TactionData[]

// type TcreateRow = {
//   doctype_to_be_tested: string;
//   action: string;
//   document: string;
// };


export type TrunLogResponse = {
    body: {
        data: {
            name: string;
            script_id: string;
            test_run_id: string;
            master_data_id: string;
        };
    };
};

export type TtestRunResponse = {
    body: {
        data: {
            test_log: {
                name: string;
                test_script: string;
                master_data: string;
                linked_document: string;
            }[];
        };
    };
};

/** @type TtestLabScript - Represents a single Test Lab Script item */
export type TtestLabScript = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  test_plan: string;
  test_script: string;
  master_data: string;
  connection: string;
  connection_doctype: string;
  connection_from: number;
  linked_document: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
};

export interface ifTestContext {
    currentScript: any;
    currentScriptRowIdx: number; 
    createdDocnames: string[];
    storeDocname: { idx: number; docname: string }[];
    createdDocsByIndex: { [key: number]: string }[];
    capturedLogs: string[];
    capturedErrors: string[];
    isTestPassed: boolean;
  }

/**@interface  ifTestRunner - defined for orchistrating 
 * the Entire Cypress IT execution*/
export interface ifTestRunner {
    executeScript(script: any): void;
    finalizeScript(): void;
  }

/**@instance ifTestAction - Defined for Header level Action
 * functionality in the Test Script */
export interface ifTestAction {
    testScripts : TtestHeaderData
    executeTestAction():void
}

/**@instance ifConnection - defined for Connection behaviour */
export interface ifConnection {
    testLab: TtestLabScript
    handleConnection(): Cypress.Chainable<string | null>;
}