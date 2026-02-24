import { createDefaultContext } from "../../src/models/testContext";
import { clAuthService } from "../../src/services/authService";
import { clLogCaptureService } from "../../src/services/logCaptureService";
import { clReportService } from "../../src/services/reportService";
import { clTestRunnerUiService } from "../../src/services/testScript";
import { ifTestRunner } from "../../src/types";

const LdContext = createDefaultContext(); //initialize the default test context

//ENV Variable
const LTargetUrl = Cypress.env("TARGET_URL");
const LHostUrl = Cypress.env("HOST_URL");
const LHostKey = Cypress.env("HOST_KEY");
const LdTestRun = Cypress.env("FETCHED_TEST_RUN");
const LdTestLab = Cypress.env("FETCHED_TEST_LAB");
const LdMasterData = Cypress.env("FETCHED_MASTER_DATA");
const LdLoginData = Cypress.env("FETCHED_LOGIN_DATA");


const LdAuthService = new clAuthService(LTargetUrl);

const LdReportService = new clReportService(
  LHostUrl,
  {
    Authorization: LHostKey,
    Cookie:
      "full_name=Guest; sid=Guest; system_user=no; user_id=Guest; user_image=",
    "Content-Type": "application/json",
  },
  LdTestRun
);

// Cypress event hooks MUST be registered once
new clLogCaptureService(LdContext).register();

describe("Automated Test Run", () => {
  const LdScripts = Cypress.env("FETCHED_MASTER_DATA") as any[];
  //each master data in the Test Lab
  // become separate IT
  LdScripts.forEach((ldScript) => {
    
    let ldRunner: ifTestRunner = new clTestRunnerUiService(
      LdContext,
      LdAuthService,
      LdReportService,
      LTargetUrl,
      LdTestLab,
      LdMasterData,
      LdLoginData
    );
    it(`running ${ldScript.name}`, () => {
      ldRunner.executeScript(ldScript);
    });

    afterEach(() => {
      ldRunner.finalizeScript();
    });
  });
});