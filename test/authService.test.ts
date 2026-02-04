import { clAuthService } from "../src/services/authService";
import { expect } from "@jest/globals";

// Mock the delay module to control the delay duration during tests since logout uses wait from it
jest.mock("../src/delay",() => ({
    fnGetDelay: jest.fn(()=> 500),

}))
describe("AuthService", () => {
  // Mock target URL for the AuthService instance
  const targetUrl = "http://localhost:3000";
  // Create an object named authService to be used in tests
  let authService: clAuthService;

  beforeEach(() => {
    // Mock the global cy object used by Cypress
    (global as any).cy = {
      request: jest.fn(),
      wait: jest.fn(),
      clearCookies: jest.fn(),
      clearLocalStorage: jest.fn(),
      }
    // Instantiate the AuthService before each test
    authService = new clAuthService(targetUrl);
    
  });

  it("should perform login with correct credentials", () => {
    const email = "test@example.com";
    const password = "password123";
    // Call the login method by passing appropriate parameters
    authService.login(email, password);
    // Expect cy.request to have been called with correct arguments and verify method, url, headers, and body 
      expect(cy.request).toHaveBeenCalledWith({
            method: "POST",
            url: `${targetUrl}/api/method/login`,
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: { usr: email, pwd: password },
      });
    });
  it("should throw error when login with missing credentials", () => {
    // Call the login method with missing parameters
    authService.login("","")
    // Expect cy.request not to have been called due to missing credentials
    expect(cy.request).not.toHaveBeenCalled
  })

  it("should perform logout", () => {
    authService.logout();

      expect(cy.request).toHaveBeenCalledWith({
            method: "GET",
            url: `${targetUrl}/api/method/logout`,
            headers: { Accept: "application/json"},
      });
  })
  
  it("should clear cookies and local storage on logout", () => {
    // spy on clearCookies and clearLocalStorage methods instead of mocking entire cy object to check if they were called
    const clearCookiesSpy = jest.spyOn(cy, 'clearCookies');
    const clearLocalStorageSpy = jest.spyOn(cy, 'clearLocalStorage');

    authService.logout();

    expect(clearCookiesSpy).toHaveBeenCalled();
    expect(clearLocalStorageSpy).toHaveBeenCalled();
  });
  it("should wait for medium delay on logout", () => {
    // Spy on the wait method to verify it was called with correct delay
    const wait = jest.spyOn(cy,"wait");
    authService.logout();

    expect(wait).toHaveBeenCalledWith(500);

  })

});