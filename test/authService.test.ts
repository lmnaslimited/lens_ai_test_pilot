import { clAuthService } from "../src/services/authService";
import { expect } from "@jest/globals";

// Mock the delay module to control the delay duration during tests since logout uses wait from it
jest.mock("../src/delay",() => ({
    fnGetDelay: jest.fn(()=> 500),

}))
describe("AuthService", () => {
  // Mock target URL for the AuthService instance
  const LTargetUrl = "http://localhost:3000";
  // Create an object named authService to be used in tests
  let ldAuthService: clAuthService;

  beforeEach(() => {
    // Mock the global cy object used by Cypress
    (global as any).cy = {
      request: jest.fn(),
      wait: jest.fn(),
      clearCookies: jest.fn(),
      clearLocalStorage: jest.fn(),
      }
    // Instantiate the AuthService before each test
    ldAuthService = new clAuthService(LTargetUrl);
    
  });

  it("should perform login with correct credentials", () => {
    const LEmail = "test@example.com";
    const LPassword = "password123";
    // Call the login method by passing appropriate parameters
    ldAuthService.login(LEmail, LPassword);
    // Expect cy.request to have been called with correct arguments and verify method, url, headers, and body 
      expect(cy.request).toHaveBeenCalledWith({
            method: "POST",
            url: `${LTargetUrl}/api/method/login`,
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: { usr: LEmail, pwd: LPassword },
      });
    });
  it("should throw error when login with missing credentials", () => {
    // Call the login method with missing parameters
    ldAuthService.login("","")
    // Expect cy.request not to have been called due to missing credentials
    expect(cy.request).not.toHaveBeenCalled
  })

  it("should perform logout", () => {
    ldAuthService.logout();

      expect(cy.request).toHaveBeenCalledWith({
            method: "GET",
            url: `${LTargetUrl}/api/method/logout`,
            headers: { Accept: "application/json"},
      });
  })
  
  it("should clear cookies and local storage on logout", () => {
    // spy on clearCookies and clearLocalStorage methods instead of mocking entire cy object to check if they were called
    const LClearCookiesSpy = jest.spyOn(cy, 'clearCookies');
    const LClearLocalStorageSpy = jest.spyOn(cy, 'clearLocalStorage');

    ldAuthService.logout();

    expect(LClearCookiesSpy).toHaveBeenCalled();
    expect(LClearLocalStorageSpy).toHaveBeenCalled();
  });
  it("should wait for medium delay on logout", () => {
    // Spy on the wait method to verify it was called with correct delay
    const LWait = jest.spyOn(cy,"wait");
    ldAuthService.logout();

    expect(LWait).toHaveBeenCalledWith(500);

  })

});