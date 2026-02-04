import { ifActionHandler, ifProperties } from "./types"

abstract class clProperties implements ifProperties {
    is_read_only: boolean;
    is_mandatory: boolean;
    is_hidden: boolean;
    action: ifActionHandler;
    fieldSelector: string;
    fieldProp: string ;

    constructor(
        is_read_only: boolean,
        is_mandatory: boolean,
        is_hidden: boolean,
        action: ifActionHandler
    ) {
        this.is_read_only = is_read_only;
        this.is_mandatory = is_mandatory;
        this.is_hidden = is_hidden;
        this.action = action;
        this.fieldSelector = `[data-fieldname="${this.action.actionRow.field_name}"]`;
        this.fieldProp = "";
    }
    getSelector(): string {
        return `${this.fieldSelector}${this.fieldProp}`;
    }
    abstract validate(): void;
}
// check the ReadOnly Property
export class clReadOnly extends clProperties {
    constructor(action: ifActionHandler) {
        super(true, false, false, action);
        this.fieldProp = ` > .form-group > .control-input-wrapper > .control-value`;
    }
    validate(): void {
        cy.get(this.getSelector()).should("be.visible");
    }
}

// check the Mandatory Property
export class clMandatory extends clProperties {
    constructor(action: ifActionHandler) {
        super(false, true, false, action);
    }
    validate(): void {
        cy.get(this.getSelector()).find(".control-label.reqd").should("exist");
    }
}

// check the Hidden Property 
export class clHidden extends clProperties {
    constructor(action: ifActionHandler) {
        super(false, false, true, action);
    }
    validate(): void {
        cy.get(this.getSelector()).should("exist").and("not.be.visible");
    }
}

//  Properties Factory class 
export class clPropertiesFactory {
    private static actionsMap: { [key: string]: new (action: ifActionHandler) => clProperties } = {
        "Is Read Only": clReadOnly,
        "Is Mandatory": clMandatory,
        "Is Hidden": clHidden,
    };
    static create(propertyType: string, action: ifActionHandler): clProperties {
        const LpropertyClass = this.actionsMap[propertyType];
        if (!LpropertyClass) throw new Error(`Unknown property type: ${propertyType}`);
        return new LpropertyClass(action);
    }
    static createAllFor(action: ifActionHandler): clProperties[] {
        const LAprops: clProperties[] = [];
        const LDrow = action.actionRow; // actionRow comes from the instance of clAction
        if (LDrow.is_read_only) LAprops.push(new clReadOnly(action));
        if (LDrow.is_mandatory) LAprops.push(new clMandatory(action));
        if (LDrow.is_hidden) LAprops.push(new clHidden(action));
        return LAprops;
    }
}