import { property } from "cypress/types/lodash";
import { fnGetDelay } from "../src/delay";
import { clPropertiesFactory } from "./properties";

/**
 * @class clDataType -Abstract base class for handling different data types.  
 * @method validate - Abstract method for validation logic.  
 * @method input - Abstract method for input handling.  
 * @method execute - Abstract method for executing actions.  
 * @method getSelector - Returns the field selector string.  
 */
abstract class clDataType implements ifDataType {
    dataType: string;
    action: ifActionHandler;
    fieldSlector: string
    fieldProp: string
    childSelector: string
    rowSelector: number
    constructor(iDataType: string, ioAction: ifActionHandler) {
        this.dataType = iDataType;
        this.action = ioAction;
        this.fieldSlector = `[data-fieldname="${this.action.actionRow.field_name}"]`;
        this.childSelector = `[data-fieldname="${this.action.actionRow.child_name}"] .grid-body .grid-row`;
        this.rowSelector = this.action.actionRow.child_index ? this.action.actionRow.child_index - 1 : 0;;
    }
    abstract validate(): void
    abstract input(): void
    getSelector(): string {
        return `${this.fieldSlector}${this.fieldProp}`
    }
    getfieldchild(): string {
        return `${this.fieldSlector}`
    }
    getchildSelector(): string {
        return `${this.childSelector}`
    }
    getchildRow(): number {
        return this.rowSelector
    }
}
/** @class clDataTypeData - Handles validation and input actions for generic data types. */
class clDataTypeData extends clDataType {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
        this.fieldProp = `input:visible`
    }
    validate(): void {
        if (this.action.actionRow.is_hidden) {
            return;
        }
        if (this.action.actionRow.is_read_only) {
            this.fieldProp = ' > .form-group > .control-input-wrapper > .control-value';
            cy.get(this.getSelector()).should('exist').and('be.visible').and('have.text', this.action.actionRow.value);
        } else {
            cy.get(this.getSelector()).wait(fnGetDelay("medium")).should('exist').and('be.visible').and('have.value', this.action.actionRow.value);
        }
    }
    input(): void {
        const { value } = this.action.actionRow;
        cy.get(this.getSelector()).wait(fnGetDelay("short")).clear({ force: true }).wait(fnGetDelay("medium")).type(value).wait(fnGetDelay("medium")).should('have.value', value).wait(fnGetDelay("medium"))
            .type('{enter}', { force: true })
            .wait(fnGetDelay("medium"));
    }
}

/** @class clDataTypeDataChild - Handles child data input logic. */
class clDataTypeDataChild extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }

    input(): void {
        const { is_child, value, child_name } = this.action.actionRow;
        if (!is_child || !child_name) return;
        cy.get(this.getchildSelector()).eq(this.getchildRow()).within(() => {
            cy.get(this.getfieldchild()).then($field => {
                const $el = $field as unknown as JQuery<HTMLElement>;
                const $input = $el.find('input:visible');
                if ($input.length > 0) {
                    cy.wrap($input).should('be.visible').wait(600).first().clear({ force: true }).type(value, { force: true }).wait(100).blur({ force: true });
                }
                else {
                    cy.wrap($field).dblclick();
                    cy.wait(300);
                    cy.wrap($field).find('input:visible').should('exist').wait(600).clear({ force: true }).type(value, { force: true }).wait(100).blur({ force: true });
                }
            });
        });
    }
    validate(): void {
        const { is_child, value, child_name } = this.action.actionRow;
        if (is_child && child_name) {
            cy.get(this.getchildSelector()).eq(this.getchildRow()).within(() => {
                cy.get(this.getfieldchild()).then($field => {
                    const $el = $field as unknown as JQuery<HTMLElement>;
                    const $input = $el.find('input');
                    if ($input.length) {
                        cy.wrap($input).should('have.value', value);
                    } else {
                        cy.wrap($field).should('contain.text', value);
                    }
                });
            });
        }
    }
}

/** @class clDataTypeSmallText - Handles validation and input for small text data type. */
class clDataTypeSmallText extends clDataType {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
        this.fieldProp = `input:visible`;
    }

    validate(): void {
        if (this.action.actionRow.is_hidden) {
            return;
        }

        const normalizeText = (text: string): string =>
            text.replace(/\\n/g, '')   // remove escaped newlines
                .replace(/\s+/g, '');  // remove all whitespace including actual \n, space, \t, etc.

        const expectedText = normalizeText(this.action.actionRow.value);

        if (this.action.actionRow.is_read_only) {
            this.fieldProp = ' > .form-group > .control-input-wrapper > .control-value';
            cy.get(this.getSelector())
                .should('exist')
                .and('be.visible')
                .invoke('text')
                .then(normalizeText)
                .should('eq', expectedText);
        } else {
            cy.get(this.getSelector())
                .should('exist')
                .and('be.visible')
                .invoke('val')
                .then(normalizeText)
                .should('eq', expectedText);
        }
    }

    input(): void {
        const { value } = this.action.actionRow;
        cy.get(this.getSelector())
            .wait(fnGetDelay("short"))
            .clear()
            .type(value)
            .wait(fnGetDelay("medium"))
            .should('have.value', value)
            .wait(fnGetDelay("medium"))
            .type('{enter}', { force: true })
            .wait(fnGetDelay("short"));
    }
}

/** @class clDataTypeLink - Inherits from `clDataTypeData` to handle link-type fields. */
class clDataTypeLink extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }
    input(): void {
        cy.get(this.getSelector())
        .clear({ force: true })
        .wait(fnGetDelay("medium"))
        .clear({ force: true }).wait(fnGetDelay("medium"))
        .type(this.action.actionRow.value).wait(fnGetDelay("medium"))
        .should('have.value', this.action.actionRow.value).wait(fnGetDelay("long"))
    }
}
/** @class clDataTypeSelect - Handles select dropdown fields. */
class clDataTypeSelect extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
        this.fieldProp = `:visible select`
    }
    input(): void {
        cy.get(this.getSelector())
            .wait(fnGetDelay("medium"))
            .select(this.action.actionRow.value, { force: true })
            .wait(fnGetDelay("medium"));
    }
}
/** @class clDataTypeSelectChild - Handles child select field logic. */
class clDataTypeSelectChild extends clDataTypeSelect {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }
    input(): void {
        const { value } = this.action.actionRow;
        cy.get(this.getchildSelector()).eq(this.getchildRow()).within(() => {
            cy.get(this.getfieldchild()).then($field => {
                const $el = $field as unknown as JQuery<HTMLElement>;
                const $select = $el.find('select:visible');
                if ($select.length) {
                    cy.wrap($select)
                        .select(value, { force: true })
                        .should('have.value', value);
                } else {
                    cy.wrap($field).dblclick();
                    cy.wait(300);
                    cy.wrap($field)
                        .find('select')
                        .should('exist')
                        .select(value, { force: true })
                        .should('have.value', value);
                }
            });
        });
    }
    validate(): void {
        const { value } = this.action.actionRow;
        cy.get(this.getchildSelector()).eq(this.getchildRow()).within(() => {
            cy.get(this.getfieldchild()).then($field => {
                const $el = $field as unknown as JQuery<HTMLElement>;
                const $select = $el.find('select:visible');
                if ($select.length) {
                    cy.wrap($select).should('have.value', value);
                } else {
                    cy.wrap($field).should('contain.text', value);
                }
            });
        });
    }
}
/** @class clDataTypeDate -Handles date input fields. */
class clDataTypeDate extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }
    input(): void {
        const { value } = this.action.actionRow
        cy.get(this.getSelector()).clear().wait(fnGetDelay("short")).first().type(value).wait(fnGetDelay("short"))
    }
}
/** @class clDataTypeDynamiclink - Handles dynamic link fields. */
class clDataTypeDynamiclink extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }
}
/** @class clDataTypeCurrency - Handles currency fields. */
class clDataTypeCurrency extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);

    }
}

class clDataTypecheck extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
    }

    input(): void {
        const { value, field_name } = this.action.actionRow;
        const shouldCheck = value === "1";
        cy.get(`input[type="checkbox"][data-fieldname="${field_name}"]`)
            .first()
            .scrollIntoView()
            .then($checkbox => {
                const isChecked = ($checkbox[0] as HTMLInputElement).checked;

                (shouldCheck !== isChecked) &&
                    cy.wrap($checkbox)[shouldCheck ? 'check' : 'uncheck']({ force: true })
                        .then(() => cy.log(`${shouldCheck ? 'Checked' : 'Unchecked'} checkbox: ${field_name}`));
                cy.wait(fnGetDelay("medium"));
            });
    }

    validate(): void {
        const { value, field_name } = this.action.actionRow;
        const shouldBeChecked = value === "1";
        cy.get(`input[type="checkbox"][data-fieldname="${field_name}"]`)
            .first()
            .should(shouldBeChecked ? 'be.checked' : 'not.be.checked');
    }
}

/** @class clDataTypeHTML - Handles HTML fields. */
class clDataTypeHTML extends clDataType {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
        this.fieldProp = '';
    }
    validate(): void {
        if (this.action.actionRow.is_hidden) return;
        const expectedText = this.action.actionRow.value;
        cy.get(this.getfieldchild())
            .should('exist')
            .and('be.visible')
            .within(() => {
                cy.get('.address-box, .control-html, .html-field-content')
                    .filter(':visible')
                    .first()
                    .should('exist')
                    .invoke('text')
                    .then((text: string) => {
                        const actual = text.replace(/\s+/g, '').replace(/[·.,]/g, '');
                        const expected = expectedText.replace(/\\n/g, '').replace(/\s+/g, '').replace(/[·.,]/g, '');
                        expect(actual).to.equal(expected);
                    });
            });
    }
    input(): void {
        // No input logic needed for HTML fields
    }
}
/** @class clDataTypeDatetime - Handles datetime input fields (date + time). */
class clDataTypeDatetime extends clDataTypeData {
    constructor(iDataType: string, ioAction: ifActionHandler) {
        super(iDataType, ioAction);
        this.fieldProp = `input:visible`;
    }

    input(): void {
        const { value } = this.action.actionRow;

        cy.get(this.getSelector())
            .should('exist')
            .and('be.visible')
            .scrollIntoView()
            .clear({ force: true })
            .wait(fnGetDelay("short"))
            .type(value, { force: true })   // e.g. 02-10-2026 09:00:00
            .wait(fnGetDelay("short"))
            .type('{enter}', { force: true })
            .wait(fnGetDelay("medium"))
            .blur({ force: true });

        // final assert to ensure Frappe actually saved it
        cy.get(this.getSelector())
            .should('have.value', value);
    }

    validate(): void {
        if (this.action.actionRow.is_hidden) return;

        const expectedValue = this.action.actionRow.value;

        if (this.action.actionRow.is_read_only) {
            this.fieldProp = ' > .form-group > .control-input-wrapper > .control-value';
            cy.get(this.getSelector())
                .should('exist')
                .and('be.visible')
                .and('contain.text', expectedValue);
        } else {
            cy.get(this.getSelector())
                .should('exist')
                .and('be.visible')
                .should('have.value', expectedValue);
        }
    }
}


/**
 * 
 * @class clDataTypeFactory - Factory class for creating data type instances.   
 * @method createDataType - Creates a data type instance based on the given type.  
 */
export class clDataTypeFactory {
    private static actionsMap: { [key: string]: new (data_type: string, action: ifActionHandler) => clDataType } = {
        "Data": clDataTypeData,
        "Small Text": clDataTypeSmallText,
        "Select": clDataTypeSelect,
        "Link": clDataTypeLink,
        "Date": clDataTypeDate,
        "Dynamic Link": clDataTypeDynamiclink,
        "Currency": clDataTypeCurrency,
        "Check": clDataTypecheck,
        "HTML": clDataTypeHTML,
        "Datetime": clDataTypeDatetime
    };
    static createDataType(data_type: string, actiondata: ifActionHandler, row?: TactionData): clDataType {
        let lActualRow = row || actiondata.actionData[0];
        let laActionClass = this.actionsMap[data_type];
        if (!laActionClass) {
            throw new Error(`Invalid data type: ${data_type}`);
        }
        if (data_type === "Select" && lActualRow.is_child) {
            return new clDataTypeSelectChild(data_type, actiondata);
        }
        let laHandledChildTypes = ["Data", "Link", "Date", "Dynamic Link", "Currency"];
        if (lActualRow.is_child && laHandledChildTypes.includes(data_type)) {
            return new clDataTypeDataChild(data_type, actiondata);
        }
        return new laActionClass(data_type, actiondata);
    }
}



