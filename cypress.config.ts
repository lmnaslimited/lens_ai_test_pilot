import { defineConfig } from "cypress";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  e2e: {

  /**
   * setupNodeEvents(on, config)
   *
   * This function runs in the Node.js process before tests start.
   * - `on` is used to register Cypress events and tasks (like `task`, `before:run`, etc.).
   * - `config` contains the resolved Cypress configuration and can be read or modified.
   *
   * It allows customizing Cypress behavior outside the browser.
   */

    async setupNodeEvents(on, config) {
      // Set default running mode
      config.env.RUNNING_MODE =
        config.env.RUNNING_MODE || process.env.RUNNING_MODE || "UI";

      // General environment variables
      config.env = {
        ...config.env,
        ...process.env, // pull all keys from .env
      };

      // Load delay values for CLI and UI modes
      ["UI", "CLI"].forEach((mode) => {
        ["SHORT", "MEDIUM", "LONG"].forEach((level) => {
          const L_key = `DELAY_${mode}_${level}`;
          config.env[L_key] = process.env[L_key];
        });
      });

      // First fetch: Get test data
      const LdGetTestData = await fetch(
        `${process.env.HOST_URL}/api/method/ai_test_pilot_handle_request?i_test_lab=${process.env.TEST_LAB}&i_action=get_test_data`,
        {
          headers: {
            Authorization: `${process.env.HOST_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const LdTestData = await LdGetTestData.json();

      config.env.FETCHED_TEST_RUN = LdTestData.message.test_run.name;
      config.env.FETCHED_MASTER_DATA = LdTestData.message.master_data;
      config.env.FETCHED_LOGIN_DATA = LdTestData.message.login_data;

      // Second fetch: Get test lab details
      const LdGetTestLab = await fetch(
        `${process.env.HOST_URL}/api/method/ai_test_pilot_handle_request?i_test_lab=${process.env.TEST_LAB}&i_action=get_test_lab`,
        {
          headers: {
            Authorization: `${process.env.HOST_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const LdTestLabData = await LdGetTestLab.json();

      config.env.FETCHED_TEST_LAB = LdTestLabData.message.test_lab;

      return config;
    },
  },
});