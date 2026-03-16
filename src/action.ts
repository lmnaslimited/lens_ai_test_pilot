import { clDataTypeFactory } from "./dataType";
import { clPropertiesFactory } from "./properties";
import { fnGetDelay } from "../src/delay";
import { ifActionHandler, ifDataType, TTactionsData, TactionData,
    TtestHeaderData, TtestLabScript,
    ifConnection,
    ifTestAction,
    ifTestContext
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

        const LrowIndex = (this.actionRow.child_index || 1) - 1;
        const LchildSelector = `[data-fieldname="${this.actionRow.child_name}"] .grid-body .grid-row`;

        // this.dataType = clDataTypeFactory.createDataType(this.actionRow.data_type, this);
        // this.dataType.input();

        this.actionData.forEach(ldRow => {

            if (!ldRow.data_type) return;

            this.actionRow = ldRow;

            cy.get('body').then(($body: JQuery<HTMLElement>) => {
                const LgridSelector = `${LchildSelector}:eq(${LrowIndex}) [data-fieldname="${ldRow.field_name}"]`;
                const LisGridField = $body.find(LgridSelector).length > 0;
            
                if (LisGridField) {
                    cy.wrap(true).as('isGridField');
                } else {
                    cy.wrap(false).as('isGridField');
                }
            });
            
            cy.get('@isGridField').then((LisGridField) => {
            
                if (LisGridField) {
            
                    // GRID FIELD
                    // this.dataType = clDataTypeFactory.createDataType(this.actionRow.data_type, this);
                    // this.dataType.input();
                    if (!ldRow.data_type) return;
                    this.actionRow = ldRow;
                    this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
                    this.dataType.input();
                    this.checkFieldValue();
                    this.checkFieldProperties();
            
                } else {
            
                    // OPEN EDIT ROW
                    cy.get(LchildSelector).eq(LrowIndex).within(() => {
                        cy.get('.btn-open-row').first().click({ force: true });
                    });
            
                    cy.wait(fnGetDelay("medium"));
            
                    if (this.actionRow.section) {
            
                        cy.get('.section-head').each(($el) => {
                            const Ltext = Cypress.$($el).text().trim();
                            if (Ltext === this.actionRow.section) {
                                const $parent = Cypress.$($el).parent();
                                const LisCollapsed = $parent.find('.section-body').css('display') === 'none';
                                if (LisCollapsed) {
                                    cy.wrap($el).wait(fnGetDelay("medium")).click({ force: true });
                                }
                            }
                        });
            
                    }
            
                    // this.dataType = clDataTypeFactory.createDataType(this.actionRow.data_type, this);
                    // this.dataType.input();
                    if (!ldRow.data_type) return;
                    this.actionRow = ldRow;
                    this.dataType = clDataTypeFactory.createDataType(ldRow.data_type, this, ldRow);
                    this.dataType.input();
                    this.checkFieldValue();
                    this.checkFieldProperties();
            
                    cy.get(LchildSelector).eq(LrowIndex).within(() => {
                        cy.get('.btn-open-row').first().click({ force: true });
                    });
            
                }
            
            });

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
    protected lActionMessage: string = "saved successfully.";
    executeAction(): void {
        cy.wait(fnGetDelay('long'))
        cy.get('body').then(($body: JQuery<HTMLElement>) => {
            const $saveBtn = $body.find('.primary-action:visible');
            if ($saveBtn.length > 0) {
                cy.wrap($saveBtn)
                    .scrollIntoView()
                    .wait(1000)
                    .click({ force: true });
                cy.log(this.lActionMessage);
                cy.wait(fnGetDelay("long"));
            } else {
                throw new Error(`No visible ${this.action} (.primary-action) found in DOM.`);
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
        cy.wait(fnGetDelay("long"));
        cy.log("Document Submitted sucessfully");
        cy.wait(fnGetDelay("long"));
    }
}
/** @class clActionCancel Cancels the current document/form and confirms via modal.*/
export class clActionCancel extends clAction {
    executeAction(): void {
        cy.contains('button', 'Cancel').scrollIntoView().should('exist').click({ force: true });
        cy.wait(fnGetDelay("short"));
        cy.contains('button', 'Yes').scrollIntoView().should('exist').click({ force: true });
        cy.wait(fnGetDelay("long"));
        cy.get('.btn-modal-close').click({ force: true });
        cy.wait(fnGetDelay("long"));
        cy.log("Document Cancelled sucessfully");
        cy.wait(fnGetDelay("long"));
    }
}
export class clActionAmend extends clActionSave {
    protected lActionMessage: string = "amend successfully.";
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

        // Click button
        cy.contains('button, a', LbuttonLabel, { matchCase: false })
            .scrollIntoView()
            .click({ force: true });

        cy.log(`Clicked custom button: ${LbuttonLabel}`);
        cy.wait(fnGetDelay("medium"));

        // Check if clicking triggered a visible modal
        cy.get('body').then(($body: JQuery<HTMLElement>) => {

            const $visibleModal = $body.find('.modal:visible');

            if ($visibleModal.length > 0) {

                const $yesButton = $visibleModal
                    .find('button')
                    .filter((_, btn) => btn.innerText.trim() === 'Yes');

                if ($yesButton.length > 0) {

                    cy.wrap($yesButton)
                        .click({ force: true });

                    cy.log('Clicked Yes in modal');

                } else {
                    cy.log('Modal present but no Yes button');
                }

            } else {
                cy.log('No modal present');
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

export class clActionValidateButton extends clAction {
    executeAction(): void {
        this.actionRow = this.actionData[0];

        const {
            value: LbuttonLabel,
            is_hidden: LIshidden,
            is_read_only: LReadonly
        } = this.actionRow;

        cy.wait(fnGetDelay("medium"));

        if (LIshidden) {
            cy.contains('button, a', LbuttonLabel)
              .should("not.exist");
            return;
        }

        cy.contains('button, a', LbuttonLabel)
          .should("exist")
          .and("be.visible");

        if (LReadonly) {
            cy.contains('button, a', LbuttonLabel)
              .should("have.attr", "disabled");
        } else {
            cy.contains('button, a', LbuttonLabel)
              .should("not.have.attr", "disabled");
        }
    }
}

/** @Class clActionValidateEmailAttachments Validate that all sidebar 
 * attachments are present in email attachment list */
export class clActionValidateEmailAttachments extends clAction {
    executeAction(): void {
        // Array to store attachment names from Sidebar
        const LaSidebarAttachments: string[] = [];
        // Array to store attachment names from Email
        const LaEmailAttachments: string[] = [];
        cy.wait(fnGetDelay("medium"));
        // STEP 1: Collect Sidebar Attachments
        // Select attachment links from sidebar and store title values
        cy.get('ul.form-attachments li.attachment-row a[title]')
            .each(($el) => {
                const Ltext = $el.attr("title")?.trim() || "";
                LaSidebarAttachments.push(Ltext);
            })
            .then(() => {
                // STEP 2: Collect Email Attachments
                // Select attachment labels from email "Select Attachments" section
                cy.get('[data-fieldname="select_attachments"] .attach-list label[title]')
                    .each(($el) => {
                        const Ltext = $el.attr("title")?.trim() || "";
                        LaEmailAttachments.push(Ltext);
                    })
                    .then(() => {
                        // STEP 3: Validate all sidebar attachments are present in email
                        // (Duplicates in email are allowed, only presence is checked)
                        // commented out because this cant be 
                        // tested in jest
                        // expect(LaEmailAttachments)
                        //     .to.include.members(LaSidebarAttachments);
                        if (!LaSidebarAttachments.every(file =>
                            LaEmailAttachments.includes(file)
                          )) {
                            throw new Error("Email does not contain all sidebar attachments.");
                          }
                        // STEP 4: Validate attachment checkboxes exist and are enabled
                        cy.get('[data-fieldname="select_attachments"] .attach-list input[type="checkbox"]')
                            .each(($checkbox) => {
                                cy.wrap($checkbox)
                                    .should('exist')
                                    .and('not.be.disabled');
                            });
                        cy.log("Email attachment validation successful.");
                    });
            });
    }
}

/**
 * Action Class: clActionValidateAlert
 *
 * Purpose:
 * Validates Frappe alert (toast) behavior based on test configuration data.
 *
 * Functional Behavior:
 * 1. Reads alert configuration from the first actionData row:
 *    - message     → Expected alert text
 *    - value       → Expected CSS class (color identifier)
 *    - description → Expected screen position (top-right, bottom-left, etc.)
 *    - is_hidden   → Flag to validate alert absence
 *
 * 2. If is_hidden = true:
 *    - Verifies that no alert containing the expected message exists.
 *
 * 3. If is_hidden = false:
 *    - Verifies alert is visible.
 *    - Validates:
 *        ✔ Message text matches exactly
 *        ✔ Alert element's class list contains expected color value
 *        ✔ Alert position matches computed CSS placement
 *
 * 4. Throws a detailed error if any mismatch occurs.
 *    Otherwise logs successful validation.
 */
export class clActionValidateAlert extends clAction {

    executeAction(): void {
        // Read first action row from test data
        this.actionRow = this.actionData[0];

        // Normalize expected alert configuration from test data
        const LdConfig = {
            message: this.actionRow.message?.trim(),    // Expected alert message
            color: this.actionRow.value?.trim()?.toLowerCase(),  // Expected CSS class identifier (color)
            position: this.actionRow.description?.trim()?.replace(/"/g, '')?.toLowerCase(),  // Expected toast position
            isHidden: this.actionRow.is_hidden  // Flag to validate absence instead of presence
        };
        // If alert is expected to be hidden, validate non-existence
        if (LdConfig.isHidden) {
            cy.contains('.alert-title-container', LdConfig.message, { timeout: 2000 })
                .should('not.exist');

            cy.log("Alert absence validated successfully.");
            return;
        }

        // Fail early if message is not configured for presence validation
        if (!LdConfig.message) {
            throw new Error("Alert validation failed: Expected message not configured.");
        }
        // Locate alert by its title text and validate visibility
        cy.contains('.alert-title-container', LdConfig.message, { timeout: 10000 })
            .should('be.visible')
            .then(($title: JQuery<HTMLElement>) => {

                // Navigate to main alert root container
                const $alertRoot = $title
                    .closest('.alert-message-container')
                    .parent();

                // Ensure alert container exists in DOM
                if (!$alertRoot.length) {
                    throw new Error('Alert root container (.frappe-alert) not found.');
                }

                // Capture full class list for color validation
                const LaClassList = $alertRoot.attr('class') || "";

                // Extract actual alert properties from DOM
                const LdActual = {
                    message: $alertRoot.find('.alert-title-container').text().trim(), // Actual message text
                    classList: LaClassList,                                           // Full class attribute string
                    position: (() => {
                        // Determine alert placement using computed CSS values
                        const LTop = $alertRoot.css('top');
                        const LBottom = $alertRoot.css('bottom');
                        const LLeft = $alertRoot.css('left');
                        const LRight = $alertRoot.css('right');

                        if (LBottom !== 'auto' && LRight !== 'auto') return 'bottom-right';
                        if (LBottom !== 'auto' && LLeft !== 'auto') return 'bottom-left';
                        if (LTop !== 'auto' && LRight !== 'auto') return 'top-right';
                        if (LTop !== 'auto' && LLeft !== 'auto') return 'top-left';

                        return 'unknown';
                    })()
                };

                // Log actual values for debugging and traceability
                cy.log(`Actual Message: ${LdActual.message}`);
                cy.log(`Actual Color: ${LdActual.classList}`);
                cy.log(`Actual Position: ${LdActual.position}`);
                const LaErrors: string[] = [];

                // Validate message equality
                if (LdConfig.message && LdConfig.message !== LdActual.message) {
                    LaErrors.push(
                        `Message Mismatch → Expected: "${LdConfig.message}" | Actual: "${LdActual.message}"`
                    );
                }

                // Validate that expected color value exists in alert class list
                if (LdConfig.color && !LdActual.classList.includes(LdConfig.color)) {
                    LaErrors.push(
                        `Color Mismatch → Expected class containing: "${LdConfig.color}" | Actual Classes: "${LdActual.classList}"`
                    );
                }

                // Validate calculated screen position
                if (LdConfig.position && LdConfig.position !== LdActual.position) {
                    LaErrors.push(
                        `Position Mismatch → Expected: "${LdConfig.position}" | Actual: "${LdActual.position}"`
                    );
                }

                // If any validation errors exist, fail with detailed report
                if (LaErrors.length) {
                    throw new Error("Alert Validation Failed:\n" + LaErrors.join("\n"));
                }

                // Success log if all validations pass
                cy.log("Alert validation passed successfully.");
            });
    }
}

export class clActionApiGet extends clAction {
  ldContext: ifTestContext;
  ldTestLab: any;

  constructor(
    iAction: string,
    iaActionData: TTactionsData,
    idContext: ifTestContext,
    idTestLab: any
  ) {
    super(iAction, iaActionData);
    this.ldContext = idContext;
    this.ldTestLab = idTestLab;
  }

  // Return HTTP method for this action
  protected getMethod(): Cypress.HttpMethod {
    return "GET";
  }

  // Return request headers
  protected getHeaders(): Record<string, any> {
    return {};
  }

  // Define valid HTTP status codes
  protected getValidStatusCodes(): number[] {
    return [200];
  }

  // Control whether response validation should execute
  protected shouldValidateResponse(): boolean {
    return true;
  }

  // Return request body (GET has no body)
  protected buildRequestBody(): Record<string, any> | undefined {
    return undefined;
  }

  // Locate matching Test Lab configuration row by master data name
  private findTestLabRow(iMasterDataName: string) {
    // Search test_lab_script array for matching master_data field
    return this.ldTestLab.test_lab_script.find(
      (idRow: any) =>
        idRow.master_data === iMasterDataName &&
        idRow.idx === this.ldContext.currentScriptRowIdx
    );
  }

  // Builds API endpoint dynamically instead of hardcoding URLs,
  // so test steps can remain configuration-driven and reusable.
  protected buildEndpoint(): Cypress.Chainable<string> {
    // Get target host from Cypress environment configuration
    const LTargetHost = Cypress.env("TARGET_URL");
    // Throw error if TARGET_URL is not configured
    if (!LTargetHost) {
    throw new Error("API: TARGET_URL not configured.");
    }
    // Endpoint path is stored in Test Case configuration,
    // so testers can control behavior without changing code.
    const LRawPath = this.actionRow.value?.trim();
    // Doctype is required because resource APIs
    // are always structured as /api/resource/{Doctype}/{name}
    const LDoctype = this.actionRow.connecting_doctype;
    const LMenus = this.actionRow.menus?.trim();
    
    // Validate that doctype is provided
    if (!LDoctype) {
    throw new Error("API: connecting_doctype is missing.");
    }

    // Token resolvers allow dynamic runtime values inside endpoint,
    // making test cases state-aware instead of static.
    const LdEndpointResolvers: Record<string, () => Cypress.Chainable<string>> = {
        // Allows API to reference a document created in a previous step.
        // This enables connected test flows (create → update → validate).
        use_docname: () => {
            // Get the current Test Lab information
            const LdTestLabRow = this.findTestLabRow(
            this.ldContext.currentScript.name
            );

            // extract the use_docname value from test lab
            // and get the document name stored in context
            const LdStoredDoc = LdTestLabRow?.use_docname
            ? this.ldContext.storeDocname.find(
                (item) =>
                    Number(item.idx) === Number(LdTestLabRow.use_docname)
                )
            : undefined;

            if (!LdStoredDoc?.docname) {
            throw new Error("Stored docname not found.");
            }

            return cy.wrap(LdStoredDoc.docname);
        },

        // Allows API to act on the document currently open in UI.
        // This keeps UI + API validations synchronized.
        current_url: () => {
            // get the current processing documnet name
            return cy.location("pathname").then((pathname: string) => {
            const LSegments = pathname.split("/").filter(Boolean);
            const LDocname = LSegments.pop();

            if (!LDocname || LDocname === "app") {
                throw new Error(
                `API: Could not extract Docname. Current AUT Path: ${pathname}`
                );
            }

            return decodeURIComponent(LDocname);
            });
        },
    };

    // Regex allows flexible token spacing,
    // so configuration mistakes (extra spaces) don’t break execution.
    const LEndpointPattern = /\{\{\s*(.*?)\s*\}\}/g;

    // This resolver function ensures path replacement happens
    // in Cypress chain order, preventing async timing issues.
    const LResolveEndpoint = (iPath: string): Cypress.Chainable<string> => {
        let lChain: Cypress.Chainable<string> = cy.wrap(iPath);

        const LaMatches = [...iPath.matchAll(LEndpointPattern)];

        LaMatches.forEach((iaMatch) => {
            const LFullMatch = iaMatch[0];   // "{{ current_url }}"
            const LEndpointName = iaMatch[1];   // "current_url"

            lChain = lChain.then((iCurrentPath: string) => {
                const LResolver = LdEndpointResolvers[LEndpointName];
                
                // We explicitly fail fast if unsupported token is used,
                // preventing silent logical errors in test configuration.
                if (!LResolver) {
                    throw new Error(`No resolver defined for token: ${LEndpointName}`);
                }

                return LResolver().then((iResolvedValue: string) => {
                    return iCurrentPath.replace(LFullMatch, iResolvedValue);
                });
            });
        });

        return lChain;
    };

    const LBaseEndpoint = `/api/resource/${LDoctype}`;

    if (!LRawPath) {

        const LQuery = LMenus ? `?${LMenus}` : "";

        return cy.wrap(
        `${LTargetHost.replace(/\/$/, "")}${LBaseEndpoint}${LQuery}`
        );
    }

    // Final construction ensures:
    // - Query parameters are appended safely
    // - URL formatting stays consistent
    // - Trailing slash issues are avoided
    return LResolveEndpoint(LRawPath).then((iResolvedPath: string) => {
        const LQuery = LMenus
        ? `${iResolvedPath.includes("?") ? "&" : "?"}${LMenus}`
        : "";

        const LEndpoint =
        `${LTargetHost.replace(/\/$/, "")}${LBaseEndpoint}/${iResolvedPath}${LQuery}`;

        return LEndpoint;
    });
  }


    /**
     * Build the expected payload structure from Test Case Configurator data.
     *
     * This method converts the raw `actionData` configuration into two structures:
     *
     * 1. LdFlatFields
     *    - Represents expected values for top-level (parent) fields.
     *    - Fields are grouped by `child_index` to support validation of multiple records
     *      returned by Filter APIs.
     *
     *      Example:
     *      LdFlatFields = {
     *        0: { price_list: "Standard Selling", price_list_rate: 23249.92 },
     *        1: { price_list: "Germany Selling EXW", price_list_rate: 25834 }
     *      }
     *
     * 2. LdGroupedFields
     *    - Represents expected values for child table rows.
     *    - Fields are grouped by child table name and row index.
     *
     *      Example:
     *      LdGroupedFields = {
     *        items: [
     *          { item_code: "ABC", qty: 2 },
     *          { item_code: "XYZ", qty: 5 }
     *        ]
     *      }
     *
     * Notes:
     * - `child_name` determines whether a field belongs to a child table.
     * - `child_index` determines the row grouping for both filter results
     *   and child table rows.
     * - Inline datatype conversion ensures numeric values match API response types.
     */
    protected buildExpectedPayload(): {
        LdFlatFields:  Record<number, Record<string, any>>;
        LdGroupedFields: Record<string, any[]>;
    } {
        
        const LdFlatFields: Record<number, Record<string, any>> = {};; // Store parent-level expected fields
        const LdGroupedFields: Record<string, any[]> = {}; // Store child table expectations

        this.actionData.slice(1).forEach((row) => {
            if (!row.field_name) return; // Skip rows without field name

            const LChildIndex = row.child_index;
            const LTableName = row.child_name;

            // Inline datatype conversion
            // to support int and float
            let LValue: any =
                row.data_type === "Int"
                ? Number(row.value)
                : row.data_type === "Float" || row.data_type === "Currency"
                ? parseFloat(row.value)
                : row.value;

            // Parent (flat) fields: no child table name means header-level field
            // Group by child_index so we can validate multiple records from filter APIs
            if (!LTableName) {
                // Initialize
                if (!LdFlatFields[LChildIndex]) {
                    LdFlatFields[LChildIndex] = {};
                }
                LdFlatFields[LChildIndex][row.field_name] = LValue;
                return;
            }

            // Initialize child table array if missing
            if (!LdGroupedFields[LTableName]) {
                LdGroupedFields[LTableName] = [];
            }

            // Initialize child row object if missing
            if (!LdGroupedFields[LTableName][LChildIndex - 1]) {
                LdGroupedFields[LTableName][LChildIndex - 1] = {};
            }

            // Assign expected child field value
            LdGroupedFields[LTableName][LChildIndex - 1][row.field_name] = LValue;
            });

        return { LdFlatFields, LdGroupedFields };
    }

  // Validate API response against expected payload
  protected validateResponse(
    idResponse: Cypress.Response<any>,
    iEndpoint: string
  ): void {
    // Ensure response contains expected data structure
    if (!idResponse.body || !idResponse.body.data) {
      throw new Error(`
        Invalid response structure.
        Full Response: ${JSON.stringify(idResponse.body, null, 2)}
        `);
    }

    const { LdFlatFields, LdGroupedFields } = this.buildExpectedPayload();

    const LdResponseData = idResponse.body.data;

    // If response is an array, treat it as a Filter API result
    // and validate each expected record against the response list
    if (Array.isArray(LdResponseData)) {
        const LaRows = Object.values(LdFlatFields);
        if (!LaRows.length) {
            throw new Error(`
            No expected fields configured for validation.
            Endpoint: ${iEndpoint}
            `);
        }

        LaRows.forEach((LdExpectedRow) => {
            // Find a response row that matches all configured fields
            // for the expected record
            const LdMatchedRow = LdResponseData.find((row:any) =>
                Object.entries(LdExpectedRow).every(
                    ([field,value]) => row[field] == value
                )
            );
            
            if (!LdMatchedRow) {
                throw new Error(`
                    Row Not Found
                    Expected Row: ${JSON.stringify(LdExpectedRow)}
                    Endpoint: ${iEndpoint}
                `);
            }
            //pass the matched row to flat field validator to check if all fields are correct
            this.validateFlatFields(LdMatchedRow, LdExpectedRow, iEndpoint);
        })
        return;
    }

    // If API returns single document (Docname API), so all the 
    // configured fields will be in first index of LdFlatFields
    this.validateFlatFields(LdResponseData, LdFlatFields[0], iEndpoint);
    this.validateGroupedFields(LdResponseData, LdGroupedFields, iEndpoint);
  }

  // Validate top-level (Parent Field) response fields
  private validateFlatFields(
    idResponseData: any,
    idFlatFields: Record<string, any>,
    iEndpoint: string
  ): void {
    Object.entries(idFlatFields).forEach(([LField, LExpected]) => {
      if (!(LField in idResponseData)) {
        throw new Error(`
            Field Missing: ${LField}
            Available Keys: ${Object.keys(idResponseData).join(", ")}
          `);
      }

      const LActual = idResponseData[LField]; // Extract actual value

      if (LActual != LExpected) {
        throw new Error(`
            Validation Failed
            Field: ${LField}
            Expected: ${LExpected}
            Actual: ${LActual}
            Endpoint: ${iEndpoint}
          `);
      }

      cy.log(`✔ ${LField} : ${LActual}`);
    });
  }

  // Validate child table response fields
  private validateGroupedFields(
    idResponseData: any,
    idGroupedFields: Record<string, any[]>,
    iEndpoint: string
  ): void {
    Object.entries(idGroupedFields).forEach(([LTableName, LaExpectedRows]) => {
      const LaResponseArray = idResponseData[LTableName]; // Extract child table array

      if (!Array.isArray(LaResponseArray)) {
        throw new Error(`Child Table Missing or Not Array: ${LTableName}`);
      }

      LaExpectedRows.forEach((LdExpectedRow, LIndex) => {
        const LdActualRow = LaResponseArray[LIndex]; // Extract actual row

        if (!LdActualRow) {
          throw new Error(`Missing row ${LIndex + 1} in ${LTableName}`);
        }

        Object.entries(LdExpectedRow).forEach(([LField, LExpected]) => {
          if (LdActualRow[LField] != LExpected) {
            throw new Error(`
                Child Table Validation Failed
                Table: ${LTableName}
                Row: ${LIndex + 1}
                Field: ${LField}
                Expected: ${LExpected}
                Actual: ${LdActualRow[LField]}
                Endpoint: ${iEndpoint}
              `);
          }

          cy.log(
            `✔ ${LTableName}[${LIndex + 1}].${LField} : ${LdActualRow[LField]}`
          );
        });
      });
    });
  }

    executeAction(): void {
        // Get first row as action configuration
        this.actionRow = this.actionData[0];

        if (!this.actionRow) {
            throw new Error("API Action: No action row provided.");
        }

        const method = this.getMethod(); // Resolve HTTP method

        // buildEndpoint now returns Cypress.Chainable<string>
        this.buildEndpoint().then((endpoint: string) => {
            cy.log(`Executing API ${method}: ${endpoint}`);

            cy.request({
                method,
                url: endpoint,
                headers: this.getHeaders(),       // Attach headers
                body: this.buildRequestBody(),    // Attach request body if any
                failOnStatusCode: false,          // Manually handle status validation
            }).then((response: Cypress.Response<any>) => {
                // Validate response status code
                if (!this.getValidStatusCodes().includes(response.status)) {
                    throw new Error(`
                        API ${method} Failed
                        Status Code: ${response.status}
                        Response Body: ${JSON.stringify(response.body, null, 2)}
                    `);
                }

                // Perform response validation if enabled
                if (this.shouldValidateResponse()) {
                    this.validateResponse(response, endpoint);
                }

                cy.log(`API ${method} Completed Successfully`);
            });
        });
    }
}

  // API PUT Action Class
  // Used to perform document update operations via API
  // Inherits endpoint construction and execution flow from API GET action
  export class clActionApiPut extends clActionApiGet{
    // Override HTTP method to execute an UPDATE request
    protected getMethod(): Cypress.HttpMethod {
        return "PUT";
    }
    // Define acceptable success status codes for PUT
    // 200 → Successfully updated existing document
    // 201 → Resource created/updated depending on backend behavior
    protected getValidStatusCodes(): number[] {
        return [200, 201];
      }
    // Disable response validation for PUT
    // Functional purpose: focus on successful update confirmation
    // without validating returned payload structure
    protected shouldValidateResponse(): boolean {
        return false;
    }
    // Provide required headers for authenticated API update execution
    // Includes authorization token and JSON content format
    protected getHeaders(): Record<string, any> {
        return {
          "Authorization": Cypress.env("TARGET_KEY"),
          "Cookie":
            "full_name=Guest; sid=Guest; system_user=no; user_id=Guest; user_image=",
          "Content-Type": "application/json",
        };
    }
    // Build request body for update operation
    // Converts configured Master Data fields into API-compatible JSON payload
    protected buildRequestBody(): Record<string, any> {
        // Get structured data from master mapping
        const { LdFlatFields, LdGroupedFields } = this.buildExpectedPayload();
        // Merge parent and child fields into single payload
        return {
            ...LdFlatFields,
            ...LdGroupedFields
        };
    }
  }
  
// abstract class for Test SCript Header level
// to determin Create or UPdate
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
        [key: string]: new (iAction: string, iaActionData: TTactionsData, ...args:any) => clAction
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
            "Button Visibility": clActionValidateButton,
            "Validate Email Attachments": clActionValidateEmailAttachments,
            "Validate Alert": clActionValidateAlert,
            "API GET": clActionApiGet,
            "API PUT": clActionApiPut
        };

    /** Action mentioned in the Test Script Header fields */
    private static testActionsMap: {
            [key: string] : new (idScript: TtestHeaderData) => clTestAction
        } = {
            "Create": clActionCreation,
            "Update": clActionUpdate
        }
    // Rest parameter )...args) ensures extensibility by allowing future action classes
    // to accept varying constructor dependencies without tightly coupling the factory.
    static createAction(iAction: string, iaActionData: TTactionsData, ...args:any): ifActionHandler {
        const LAactionClass = this.actionsMap[iAction];
        if (!LAactionClass) {
            throw new Error(`Invalid action type: ${iAction}`);
        }
        return new LAactionClass(iAction = iAction, iaActionData = iaActionData, ...args);
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