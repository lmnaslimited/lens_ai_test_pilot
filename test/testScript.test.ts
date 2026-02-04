import {TestRunnerFactory, TestRunnerService} from "../src/services/testScript"
import { TestContext } from "../src/types";
import { AuthService } from "../src/services/authService";
import { ReportService } from "../src/services/reportService";
import { expect } from "@jest/globals";

const targetURL=" http://localhost:3000";

describe("Test Script Module", () => {
    let context: TestContext;
    let service: TestRunnerService;
    let cypressHandlers: Record<string, Function>;

    beforeEach(() => {
        context = {
            currentScript: null,
            createdDocnames: [],
            storeDocname: [],
            createdDocsByIndex: [],
            capturedLogs: [],
            capturedErrors: [],
            isTestPassed: true,
        } as TestContext;

    });
    describe("TestRunnerFactory", () => {
    let  idScript: any;
    let ldContext: TestContext;
    let ldAuth: AuthService;
    let ldReport: ReportService;
    let lTargetUrl: string;
    let ldTestLabData: any;
    let ldMestMasterData: any;
    let ldLoginData: any;

    beforeEach(() => {
        idScript = { test_type: "UI" };
        ldContext = context;
        ldAuth=jest.fn() as unknown as AuthService;
        ldReport=jest.fn() as unknown as ReportService;
        lTargetUrl=targetURL;
        ldTestLabData={};
        ldMestMasterData={};
        ldLoginData={};
    })
    it("should create a TestRunnerService instance", () => {
        const runner = TestRunnerFactory.create(
        idScript,
        ldContext,
        ldAuth,
        ldReport,
        lTargetUrl,
        ldTestLabData,
        ldMestMasterData,
        ldLoginData
        );
        expect(runner).toBeDefined();
    });

    it("should throw error for unsupported runner type", () => {
        idScript = { type: "unknown" };
        expect(() => {
        TestRunnerFactory.create(idScript,
        ldContext,
        ldAuth,
        ldReport,
        lTargetUrl,
        ldTestLabData,
        ldMestMasterData,
        ldLoginData);
        }).toThrow(`Unsupported test type: ${idScript.test_type}`);
    });

    // it("should pass context to created runner", () => {
    //     const runner: any = TestRunnerFactory.create("service", context);
    //     expect(runner.context).toBe(context);
    // });
    });
    



})