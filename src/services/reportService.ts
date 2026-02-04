export class clReportService {
    constructor(
        private readonly lHostUrl: string,
        private readonly ldHeaders: Record<string, string>,
        private readonly lTestRunName: string
    ) {}
    
    /**
     * Creates a new Run Log entry.
     */
    postRunLog(idPayload: any) {
        return cy.request({
            method: "POST",
            url: `${this.lHostUrl}/api/resource/Run Log`,
            headers: this.ldHeaders,
            body: JSON.stringify(idPayload),
        });
    }
    
    /**
     * Retrieves the Test Run details by Test Run name.
     */

    getTestRun() {
        return cy.request({
            method: "GET",
            url: `${this.lHostUrl}/api/resource/Test Run/${this.lTestRunName}`,
            headers: this.ldHeaders,
        });
    }
    
    /**
     * Updates an existing Test Log.
     */
    updateTestLog(lTestLogId: string, payload: any) {
        return cy.request({
            method: "PUT",
            url: `${this.lHostUrl}/api/resource/Test Log/${lTestLogId}`,
            headers: this.ldHeaders,
            body: JSON.stringify(payload),
        });
    }
}