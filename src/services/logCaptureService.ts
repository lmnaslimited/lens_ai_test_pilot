import { ifTestContext } from "../types";

/**
 * Captures Cypress logs and test failures and stores them in the shared test context
 * for debugging and reporting purposes.
 */

export class clLogCaptureService {
    constructor(private ldContext: ifTestContext) {}

    /**
     * Sets up Cypress event handlers to centralize log collection,
     * track test failures, and prevent unrelated runtime exceptions
     * from interrupting test execution.
     */
    register() {
        Cypress.on("log:added", (idOptions) => {
            if (["log", "assert"].includes(idOptions.name)) {
                this.ldContext.capturedLogs.push(`[${idOptions.name}] ${idOptions.message}`);
            }
        });

        Cypress.on("fail", (idError, idRunnable) => {
            this.ldContext.isTestPassed = false;
            this.ldContext.capturedErrors.push(`Test Failed: ${idRunnable.title} — ${idError.message}`);
            throw idError;
        });

        Cypress.on("uncaught:exception", () => false);
    }
}