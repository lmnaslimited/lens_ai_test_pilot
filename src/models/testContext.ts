import { ifTestContext } from "../types";   

// Creates a fresh default test context for each test run
export const createDefaultContext = (): ifTestContext => ({
    currentScript: null, // Currently running script
    currentScriptRowIdx: 1,   // Start from row 1
    createdDocnames: [], // Names of created documents
    storeDocname: [], // Stored document references
    createdDocsByIndex: [], // Documents by execution order
    capturedLogs: [], // Collected logs
    capturedErrors: [], // Collected errors
    isTestPassed: true, // Overall test status
    });