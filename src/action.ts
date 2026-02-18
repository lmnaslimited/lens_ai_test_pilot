import { clDataTypeFactory } from "./dataType";
import { clPropertiesFactory } from "./properties";
import { fnGetDelay } from "../src/delay";
import { ifActionHandler, ifDataType, TTactionsData, TactionData,
    TtestHeaderData, TtestLabScript,
    ifConnection,
    ifTestAction
 } from "./types"

/** @class clAction - Base abstract class for executing actions on data fields. */
//clAction base class which implements the ifHandler interface
abstract class clAction implements ifActionHandler {
    action: string;
    actionData: TTactionsData;
    dataType: ifDataType;
    actionRow: TactionData;
    fieldSlector: string;
    fieldProp: string;

    constructor(iAction: string, iaActionData: TTactionsData) {
        this.actionData = iaActionData;
        this.action = iAction;
    }
    checkFieldValue(): void {
        this.dataType.validate();
    }
    checkFieldProperties(): void {
        const LApropertyValidators = clPropertiesFactory.createAllFor(this);
        LApropertyValidators.forEach((ldValidator) => ldValidator.validate());
    }
    executeAction(): void {
        const LAgroupTab = this.actionData.reduce((LAacc, ldRow) => {
            const Ltab = ldRow.tab || " ";
            (LAacc[Ltab] ||= []).push(ldRow);
            return LAacc;
        }, []);
        Object.entries(LAgroupTab).forEach(([lTabName, laRows]) => {
            if (lTabName !== " ") {
                const LOtabClick = clActionFactory.createAction("On Tab", [laRows[0]]);
                LOtabClick.executeAction();
            }
            laRows.forEach(ldRow => {
                if (!ldRow.data_type) return;
                this.actionRow = ldRow;
                this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this);
                this.checkFieldValue();
                this.checkFieldProperties();
            });
        });
    }
}
/** @class clActionExpandSection is extended class from the clAction*/
/* Expand Section class is used to expand the section mentioned in the configurator
*/
export class clActionExpandSection extends clAction {
    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
    executeAction(): void {
        this.actionRow = this.actionData[0];
        if (this.actionRow.tab) {
            const LOtabClick = clActionFactory.createAction("On Tab", [this.actionRow]);
            LOtabClick.executeAction();
        }
        const LsectionTitle = this.actionRow.section;
        if (!LsectionTitle) {
            return;
        }
        cy.get('.section-head').each(($el) => {
            const Ltext = Cypress.$($el).text().trim();
            if (Ltext === LsectionTitle) {
                const $parent = Cypress.$($el).parent();
                const LisCollapsed = $parent.find('.section-body').css('display') === 'none';
                if (LisCollapsed) {
                    cy.wrap($el).wait(fnGetDelay("medium")).click({ force: true });
                }
            }
        });
        this.actionData.forEach(ldRow => {
            if (!ldRow.data_type) return;
            this.actionRow = ldRow;
            this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
            this.checkFieldValue();
            this.checkFieldProperties();
        });
    }
}

/** @class clActionOnLoad - Handles actions on page load. */
export class clActionOnLoad extends clAction {
    executeAction(): void { super.executeAction() }
    checkFieldValue(): void { super.checkFieldValue(); }
    checkFieldProperties(): void { super.checkFieldProperties(); }
    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
}
/** @class clActionOnChange - Handles actions like On Change */
export class clActionOnChange extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        if (this.actionRow.tab) {
            const LOtabClick = clActionFactory.createAction("On Tab", [this.actionRow]);
            LOtabClick.executeAction();
        }
        if (this.actionRow.is_child) {
            const LOchildAction = new clActionOnChangeChild(this.action, this.actionData);
            LOchildAction.executeAction();
            return;
        }
        this.dataType = clDataTypeFactory.createDataType(this.actionRow.data_type, this);
        this.dataType.input();
        super.executeAction();
    }
    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
}
export class clActionOnChangeChild extends clActionOnChange {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        if (this.actionRow.tab) {
            const LOtabClick = clActionFactory.createAction("On Tab", [this.actionRow]);
            LOtabClick.executeAction();
        }
        this.dataType = clDataTypeFactory.createDataType(this.actionRow.data_type, this);
        this.dataType.input();
        this.actionData.forEach(ldRow => {
            if (!ldRow.data_type) return;
            this.actionRow = ldRow;
            this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
            this.checkFieldValue();
            this.checkFieldProperties();
        });
    }
}
export class clActionAddRow extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        if (this.actionRow.tab) {
            const LOtabClick = clActionFactory.createAction("On Tab", [this.actionRow]);
            LOtabClick.executeAction();
        }
        cy.get(`[data-fieldname="${this.actionRow.child_name}"]`, { timeout: 10000 })
            .should('exist')
            .should('be.visible')
            .within(() => {
                cy.contains('button', 'Add Row', { matchCase: false })
                    .should('be.visible')
                    .click({ force: true });
            });
        this.actionData.forEach(ldRow => {
            if (!ldRow.data_type) return;
            this.actionRow = ldRow;
            this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
            this.checkFieldValue();
        });
    }
}
export class clActionEditDetails extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        if (this.actionRow.tab) {
            const LOtabClick = clActionFactory.createAction("On Tab", [this.actionRow]);
            LOtabClick.executeAction();
        }
        const LrowIndex = (this.actionRow.child_index || 1) - 1;
        const LchildSelector = `[data-fieldname="${this.actionRow.child_name}"] .grid-body .grid-row`;
        cy.get(LchildSelector).eq(LrowIndex).within(() => {
            cy.get('.btn-open-row').first().click({ force: true });
        });
        cy.wait(fnGetDelay("medium"));
        this.actionData.forEach(ldRow => {
            if (!ldRow.data_type) return;
            this.actionRow = ldRow;
            this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
            this.checkFieldValue();
        });
        cy.get(LchildSelector).eq(LrowIndex).within(() => {
            cy.get('.btn-open-row').first().click({ force: true });
        });
    }
}
/** @class clActionOnTab - Handles tab switching. */
export class clActionOnTab extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        const Ltab = this.actionRow.tab;
        if (!Ltab) return;
        cy.get('.form-tabs .nav-item a').filter(`:contains("${Ltab}")`).first().click({ force: true });
        cy.wait(fnGetDelay('medium'));
        
    }
    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
}

/** @class clActionSave Saves the current document/form.*/
export class clActionSave extends clAction {
    executeAction(): void {
        cy.get('body').then(($body: JQuery<HTMLElement>) => {
            const $saveBtn = $body.find('.primary-action:visible');
            if ($saveBtn.length > 0) {
                cy.wrap($saveBtn)
                    .scrollIntoView()
                    .click({ force: true });
                cy.log(`saved successfully.`);
                cy.wait(fnGetDelay("short"));
            } else {
                throw new Error("No visible Save button (.primary-action) found in DOM.");
            }
        });
    }
}

/** @class clActionSubmit Submits the current document/form and confirms submission via modal. */
export class clActionSubmit extends clAction {
    executeAction(): void {
        cy.contains('button', 'Submit').scrollIntoView().should('exist').click({ force: true });
        cy.wait(fnGetDelay("short"));
        cy.contains('button', 'Yes').scrollIntoView().should('exist').click({ force: true });
        cy.wait(fnGetDelay("long"));
        cy.get('.btn-modal-close').click({ force: true });
        cy.log("Document Submitted sucessfully");
        cy.wait(fnGetDelay("long"));
    }
}
/** @class clActionCancel Cancels the current document/form and confirms via modal.*/
export class clActionCancel extends clAction {
    executeAction(): void {
        cy.contains('button', 'Cancel').scrollIntoView().should('exist').click({ force: true });
        cy.wait(fnGetDelay("medium"));
        cy.get('.modal:visible').within(() => {
            cy.contains('button', /^Yes$/).should('be.visible').click({ force: true });
        });
        cy.wait(fnGetDelay("long"));
        // Optional: Close modal if it's still there
        // cy.get('.modal:visible').within(() => {
        // cy.get('.btn-modal-close').click({ force: true });
        // });                                                        
        cy.log("Document Cancelled Successfully");
    }
}
export class clActionAmend extends clAction {
    executeAction(): void {

    }
}
/** @class clActionDelete Deletes the current document/form with confirmation modal.*/
export class clActionDelete extends clAction {
    executeAction(): void {
        cy.get('.menu-btn-group > .btn').click({ force: true });
        cy.contains('a.dropdown-item', 'Delete').should('be.visible').click({ force: true });
        cy.wait(fnGetDelay("medium"));
        cy.get('.modal:visible').within(() => {
            cy.contains('button', /^Yes$/).should('be.visible').click({ force: true });
        });
        cy.log("Document Deleted Successfully");
        cy.wait(fnGetDelay("long"));
    }
}
/** @class clActionClickButton Clicks a specified button on the form.*/
export class clActionClickButton extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        const LbuttonLabel = this.actionRow.value;
        cy.contains('button, a', LbuttonLabel, { matchCase: false }).scrollIntoView().click({ force: true });
        cy.log(`Clicked custom button: ${LbuttonLabel}`);
        cy.wait(fnGetDelay("medium"));
        // Check if clicking the button triggered a visible modal popup.
        cy.get('body').then(($body: JQuery<HTMLElement>) => {
            const hasModal = $body.find('.modal:visible').length > 0;
            if (hasModal) {
                // If the modal popup is present, click the 'Yes' button inside the modal.
                cy.get('.modal:visible').within(() => {
                    cy.contains('button', /^Yes$/)
                        .click({ force: true });
                    cy.log('Clicked Yes in modal');
                });
            }
        });
    }
}
/** @class clActionActionMenuTriggers an item from the "Actions" dropdown menu.*/
export class clActionActionMenu extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        const actionLabel = this.actionRow.value;
        cy.get('button, a')
            .contains(/^Actions$/i)
            .scrollIntoView()
            .click({ force: true });
        cy.get(".actions-btn-group")
          .contains(".dropdown-menu li, .dropdown-item, .grey-link", actionLabel, {
            matchCase: false,
          })
          .should("be.visible")
          .click({ force: true });
        // cy.log(`Clicked Action menu item: ${actionLabel}`);
        cy.wait(fnGetDelay("medium"));
    }
}
/** @class clActionBanner Validate the Banner message and its colour.*/
export class clActionBanner extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];

        const LBannerMessage = this.actionRow.message?.trim();
        const LBannerColor = this.actionRow.value;

        if (!LBannerMessage) {
            throw new Error("Banner message is missing");
        }

        cy.get(`.form-message.${LBannerColor}:visible`)
            .last()
            .should('contain.text', LBannerMessage);

        cy.wait(fnGetDelay("medium"));
    }
}

/** @class clActionAttachments Validate attachment count and attachment name(s). 
 * in the document
*/
export class clActionAttachments extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];

        const LaAttachmentNames = this.actionRow.message
            ?.split(', ')
            .map(name => name.trim())
            .filter(Boolean);

        if (!LaAttachmentNames || LaAttachmentNames.length === 0) {
            throw new Error("Attachment name(s) are missing");
        }

        // Validate attachment count
        cy.get('ul.form-attachments li.attachment-row')
            .should('have.length', LaAttachmentNames.length);

        // Validate attachment name(s)
        LaAttachmentNames.forEach(iFileName => {
            cy.contains(
                'ul.form-attachments li.attachment-row',
                iFileName
            ).should('be.visible');
        });

        cy.wait(fnGetDelay("medium"));
    }
}

/** 
 * @class clActionAssignments 
 * Validate assigned user count and assigned user name(s)
 * in the document.
 */
export class clActionAssignments extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];

        const LaAssignedUsers = this.actionRow.message
            ?.split(',')
            .map(user => user.trim())
            .filter(Boolean);

        if (!LaAssignedUsers || LaAssignedUsers.length === 0) {
            throw new Error("Assigned user name(s) are missing");
        }

        // Validate assignment count
        cy.get('ul.form-assignments .assignments .avatar')
            .should('have.length', LaAssignedUsers.length);

        // Validate assigned user names
        LaAssignedUsers.forEach(iUserName => {
            cy.get('ul.form-assignments .assignments .avatar')
                .filter(`[title="${iUserName}"]`)
                .should('be.visible');
        });

        cy.wait(fnGetDelay("medium"));
    }
}
// Validates breadcrumb navigation in forms
export class clActionBreadcrumbs extends clAction {

    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
    executeAction(): void {

        this.actionRow = this.actionData[0];
        const LIdValue: string = this.actionRow.value;
        if(!LIdValue) {
            throw new Error('No value was configured for Breadcrumbs')
        }
        cy.wait(fnGetDelay("medium"));

        // Validate expected breadcrumb value inside container
        cy.contains('#navbar-breadcrumbs', LIdValue)
        .should('be.visible');
    }
}

/** @class clActionOnValidate validate the error message*/
export class clActionOnValidate extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];
        cy.wait(fnGetDelay("medium"));

        if (this.actionRow.message_type === 'Error') {
            // Wait for the close button to be visible and click it directly
            cy.get('.btn-modal-close:visible', { timeout: 3000 })
            .should('be.visible')
            .click({ force: true });
            cy.wait(fnGetDelay("short"));

        }
    }

    constructor(iAction: string, iaActionData: TTactionsData) {
        super(iAction, iaActionData);
    }
}
// Validates that a group button displays the expected dropdown menu options
export class clActionValidateGroupButtonOptions extends clAction {    
    executeAction(): void {
        this.actionRow = this.actionData[0];
        const LbuttonLabel = this.actionRow.value; // Extract group button label
        const LaMenus = this.getMenuList(this.actionRow.menus); // Parse expected menu items list    
        cy.wait(fnGetDelay("medium"));        
        this.openDropdown(LbuttonLabel); // Open the target group button dropdown
        this.validateMenuItems(LaMenus); // Verify all expected menu items exist
    }    
    // Converts comma-separated menu string into a trimmed string array
    private getMenuList(LRawMenus: string): string[] {
        return LRawMenus.split(",").map(m => m.trim());
    }
    // Opens the group button dropdown using its visible label
    private openDropdown(LLabel: string): void 
    {
        cy.contains('button', LLabel)
            .should('have.length', 1)
            .click({ force: true });       
        cy.wait(fnGetDelay("long"));
    }
    // Validates that each expected dropdown menu item is present
    private validateMenuItems(LMenuList: string[]): void {
        for (const item of LMenuList) {
            cy.get("a.dropdown-item").contains(item).should("exist");
        }
    }
}

// Handles click and validation actions for inner group button menu items
export class clActionClickInnerGroupButton extends clAction {
    // Executes conditional validation or click flow for a group button
    executeAction(): void {
        this.actionRow = this.actionData[0];
        const { value: LbuttonLabel, menus: LMenus, is_hidden: LIshidden, is_read_only: LReadonly } = this.actionRow;        
        cy.wait(fnGetDelay("medium"));        
        if (LIshidden) {
            this.validateButtonIsHidden(LbuttonLabel); // Assert button is not visible in UI
            return;
        }        
        if (LReadonly) {
            this.validateButtonIsReadonly(LbuttonLabel); // Assert button is disabled
            return;
        }        
        this.clickButton(LbuttonLabel); // Click the group button to open dropdown
        this.selectMenu(LMenus); // Select the specified dropdown menu item
    }
    // Validates that the group button does not exist in the DOM
    private validateButtonIsHidden(LLabel: string): void {
        cy.contains('button', LLabel).should("not.exist");
    }
    // Validates that the group button is disabled (read-only)
    private validateButtonIsReadonly(LLabel: string): void {
        cy.contains('button', LLabel).should("have.attr", "disabled");
    }
    // Clicks the group button
    private clickButton(LLabel: string): void {
        cy.contains('button', LLabel)
            .should('have.length', 1)
            .click({ force: true });        
        cy.wait(fnGetDelay("long"));
    }
    // Selects a specific dropdown menu item by its label
    private selectMenu(LMenu: string): void {
        cy.log(LMenu);
        cy.contains("a.dropdown-item", LMenu).click({ force: true });
        cy.wait(fnGetDelay("long"));
    }
}

/**
 * Action class responsible for validating Frappe alert behavior.
 * 
 * Supports:
 *  - Alert presence validation
 *  - Alert absence validation (when is_hidden = true)
 *  - Message, color, and position verification
 */
export class clActionValidateAlert extends clAction {

    /**
     * Entry point of the action.
     * Decides whether to validate alert presence or absence
     * based on configuration.
     */
    executeAction(): void {
        this.actionRow = this.actionData[0];

        const LdConfig = this.buildConfig();

        if (LdConfig.isHidden) {
            return this.validateAbsence(LdConfig);
        }

        return this.validatePresence(LdConfig);
    }

    /**
     * Constructs normalized alert configuration
     * from test data row.
     */
    private buildConfig() {
        return {
            message: this.actionRow.message?.trim(),
            color: this.actionRow.value?.trim()?.toLowerCase(),
            position: this.actionRow.description?.trim()?.replace(/"/g, '')?.toLowerCase(),
            isHidden: this.actionRow.is_hidden === true
        };
    }

    /**
     * Validates that no visible alert exists on screen.
     * Used when is_hidden flag is enabled.
     */
    private validateAbsence(idConfig: any): void {
        cy.contains('.alert-title-container', idConfig.message, { timeout: 2000 })
            .should('not.exist');

        cy.log("Alert absence validated successfully.");
    }

    /**
     * Validates that alert is visible and matches expected values.
     */
    private validatePresence(idConfig: any): void {

        if (!idConfig.message) {
            throw new Error("Alert validation failed: Expected message not configured.");
        }

        cy.contains('.alert-title-container', idConfig.message, { timeout: 10000 })
            .should('be.visible')
            .then(($title: JQuery<HTMLElement>) => {

                // 2️⃣ Move up to alert root container
                const $alertRoot = $title.closest('.alert-message-container').parent();

                if (!$alertRoot.length) {
                    throw new Error('Alert root container (.frappe-alert) not found.');
                }

                const LdActual = this.extractActualValues($alertRoot);

                const LaErrors = [
                    this.compare("Message", idConfig.message, LdActual.message),
                    this.compare("Color", idConfig.color, LdActual.color),
                    //this.compare("Position", idConfig.position, LdActual.position)
                ].filter(Boolean);

                if (LaErrors.length) {
                    throw new Error("Alert Validation Failed:\n" + LaErrors.join("\n"));
                }

                cy.log("Alert validation passed successfully.");
            });
    }

    /**
     * Extracts actual alert properties from DOM element.
     */
    private extractActualValues($alert: JQuery<HTMLElement>) {
        const LaClassList = $alert.attr('class') || "";

        return {
            message: $alert.find('.alert-title-container').text().trim(),
            color: this.extractColor(LaClassList),
            //position: this.extractPosition(LaClassList)
        };
    }

    /**
     * Compares expected and actual field values.
     * Returns formatted error string if mismatch occurs.
     */
    private compare(
        iLabel: string,
        iExpected?: string,
        iActual?: string
    ): string | null {

        if (!iExpected) return null;

        return iExpected !== iActual
            ? `${iLabel} Mismatch → Expected: "${iExpected}" | Actual: "${iActual}"`
            : null;
    }

    /**
     * Resolves alert color based on CSS class names.
     */
    private extractColor(iaClasses: string): string {
        if (iaClasses.includes('green')) return 'green';
        if (iaClasses.includes('red')) return 'red';
        if (iaClasses.includes('orange')) return 'orange';
        if (iaClasses.includes('blue')) return 'blue';
        if (iaClasses.includes('alert-success')) return 'green';
        if (iaClasses.includes('alert-danger')) return 'red';
        if (iaClasses.includes('alert-warning')) return 'orange';
        if (iaClasses.includes('alert-info')) return 'blue';
        return 'unknown';
    }

    /**
     * Resolves alert screen position based on CSS class names.
     */
    // Not Working for position
    // private extractPosition(iaClasses: string): string {
    //     if (iaClasses.includes("bottom-right")) return "bottom-right";
    //     if (iaClasses.includes("top-right")) return "top-right";
    //     if (iaClasses.includes("bottom-left")) return "bottom-left";
    //     if (iaClasses.includes("top-left")) return "top-left";
    //     return "unknown";
    // }
}

// abstract class for Test SCript Header level
// to determin Create or UPdate on UI test and
// GET, PUT, POST on API test
abstract class clTestAction implements ifTestAction {
    testScripts: TtestHeaderData;
    doctype: string

    constructor(iaScripts: TtestHeaderData) {
        this.testScripts = iaScripts;
        this.doctype = this.testScripts.doctype_to_be_tested.trim().toLowerCase().replace(/\s+/g, "-");
    }
    abstract executeTestAction(): void
}

/** @class clActionCreation. - this test script is for validating during creation */
export class clActionCreation extends clTestAction {
    // navigate to the desired document
    executeTestAction(): void {
        cy.location("origin").then(origin => {
            let LfullUrl = `${origin}/app/${this.doctype}/new`;
        cy.log(`Navigating to: ${LfullUrl}`);
        cy.visit(LfullUrl);
        cy.wait(fnGetDelay("medium"));
        })
    }
}

/** @class clActionUpdate. - this test script is for validating existing document */
export class clActionUpdate extends clTestAction {
    documentName: string
    constructor(iaScripts: TtestHeaderData) {
        super(iaScripts)
        this.documentName = this.testScripts.document.trim();
    }

    // Navigate to new form
    executeTestAction(): void {
        cy.location("origin").then(origin => {
            let LfullUrl = `${origin}/app/${this.doctype}/${this.documentName}`;
        cy.log(`Navigating to: ${LfullUrl}`);
        cy.visit(LfullUrl);
        cy.wait(fnGetDelay("medium"));
        })
    }
}

/** @class clActionFactory - Factory for creating action instances */
export class clActionFactory {
    private static actionsMap: {
        [key: string]: new (iAction: string, iaActionData: TTactionsData) => clAction
    } = {
            "Onload": clActionOnLoad,
            "On Change": clActionOnChange,
            "On Tab": clActionOnTab,
            "Add Row": clActionAddRow,
            "Edit Details": clActionEditDetails,
            "Expand Section": clActionExpandSection,
            "Save": clActionSave,
            "Submit": clActionSubmit,
            "Amend": clActionAmend,
            "Cancel": clActionCancel,
            "Delete": clActionDelete,
            "Click Button": clActionClickButton,
            "Action Menu": clActionActionMenu,
            "On Validate": clActionOnValidate,
            "Click Group Button": clActionClickInnerGroupButton,
            "Validate Group Button Options":clActionValidateGroupButtonOptions,
            "On Intro Banner": clActionBanner,
            "Validate Attachment": clActionAttachments,
            "Validate Assignee": clActionAssignments,
            "Validate Breadcrumbs": clActionBreadcrumbs,
            "Validate Alert": clActionValidateAlert
        };

    /** Action mentioned in the Test Script Header fields */
    private static testActionsMap: {
            [key: string] : new (idScript: TtestHeaderData) => clTestAction
        } = {
            "Create": clActionCreation,
            "Update": clActionUpdate
        }

    static createAction(iAction: string, iaActionData: TTactionsData): ifActionHandler {
        const LAactionClass = this.actionsMap[iAction];
        if (!LAactionClass) {
            throw new Error(`Invalid action type: ${iAction}`);
        }
        return new LAactionClass(iAction = iAction, iaActionData = iaActionData);
    }
    static filterActionData(iaActionsData: TTactionsData, iActionRow: TactionData): TTactionsData {
        const LposNext = iActionRow.pos + 10;
        return iaActionsData.filter((ldItem) => (
            ldItem.pos >= iActionRow.pos && ldItem.pos < LposNext
        ));
    }

    // this method handle the control of naviagtion
    static executeAction(idScript: TtestHeaderData): ifTestAction {
        const LaTestActionClass = this.testActionsMap[idScript.action];
        if (!LaTestActionClass) {
            throw new Error(`Invalid Test Script action type: ${idScript.action}`);
        }
        return new LaTestActionClass(idScript);
    }
}

/** @class clConnection - Base abstract class for executing connection businnes logic. */
//clConnection base class which implements the ifConnection interface
abstract class clConnection implements ifConnection {
    testLab: TtestLabScript
    constructor(idTestLab: TtestLabScript) {
       this.testLab = idTestLab
    }
    handleConnection(): Cypress.Chainable<string | null>{
        return cy.wrap(null)
    }
    
}

/** @class clConnectionCreate. - create document from connection tab */
export class clConnectionCreate extends clConnection{
    handleConnection():Cypress.Chainable<string | null> {
        if (!this.testLab.connection_doctype) {
            cy.log("Missing connection_doctype, skipping.");
            return cy.wrap(null);
        }
        cy.log("Initiating connection creation from current document...");
        return cy.contains(".nav-item", "Connections", { timeout: fnGetDelay("long") })
            .should("be.visible")
            .click()
            .wait(fnGetDelay("medium"))
            .then(() => {
                return cy.get(".form-dashboard", { timeout: fnGetDelay("long") }).within(() => {
                    return cy.contains(".document-link-badge", this.testLab.connection_doctype, { timeout: fnGetDelay("long") })
                        .should("be.visible")
                        .parents(".document-link")
                        .within(() => {
                            cy.get("button.btn-open-row, button.btn")
                                .should("be.visible")
                                .click({ force: true });
                        });
                });
            })
            .then(() => {
                return cy.contains('button', 'Save')
                    .scrollIntoView()
                    .should('exist')
                    .click({ force: true })
                    .wait(fnGetDelay("short"))
                    .url()
                    .then((url: string) => {
                        const docname = url.split("/").pop() || null;
                        cy.log(`Created document: ${docname}`);
                        this.testLab.linked_document = docname || undefined;
                        // Wrap the value to avoid Cypress async/sync issue
                        return cy.wrap(docname);
                    });
            });
    }
}

/** @class clConnectionFactory - Factory for creating connection instances */
export class clConnectionFactory {
    private static connectionMap: {
        [key: string]: new (idTestLab: TtestLabScript) => ifConnection
    } = {
            "Create": clConnectionCreate,
    }

    static connection(idTestLab: TtestLabScript): ifConnection {
        const LaConnectionClass = this.connectionMap[idTestLab.connection];
        if (!LaConnectionClass) {
            throw new Error(`Invalid action type: ${idTestLab.connection}`);
        }
        return new LaConnectionClass(idTestLab);
    }
}