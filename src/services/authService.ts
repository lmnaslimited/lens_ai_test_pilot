import { fnGetDelay } from "../delay";

/**
 * AuthService handles authentication actions such as login and logout
 * against the target application using Cypress API requests.
 */

export class clAuthService {
    constructor(private readonly lTargetUrl: string) {}
    
    /**
     * Performs user login using email and password via API request.
     */
    login(iEmail: string, iPassword: string) {
        return cy.request({
            method: "POST",
            url: `${this.lTargetUrl}/api/method/login`,
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: { usr: iEmail, pwd: iPassword },
        });
    }
    
    /**
     * Logs out the current user, waits for session cleanup,
     * and clears cookies and local storage.
     */
    logout() {
        cy.request({
            method: "GET",
            url: `${this.lTargetUrl}/api/method/logout`,
            headers: { Accept: "application/json" },
        });
        
        cy.wait(fnGetDelay("medium"));
        cy.clearCookies();
        cy.clearLocalStorage();
    }
}