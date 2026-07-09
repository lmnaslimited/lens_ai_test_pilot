# LMNAs LENS AI Test Pilot — Current Product State (Repo-grounded)

## A. Executive summary

- The `lens_ai_test_pilot` repo is the Cypress runtime/orchestrator that:
  - fetches run configuration from a Frappe server method (`ai_test_pilot_handle_request`),
  - executes UI/API actions from `master_data` rows,
  - and writes test outcomes back to Frappe (`Run Log`, `Test Log`, `Test Run`).
- `lens-test-pilot-config` is treated as external content/setup payload, not runtime logic; this repo is referenced and cloned by setup scripts, then upload scripts are delegated to it.
- Frappe-side executable logic (server script + doctypes + fixtures) is **not present in this repo**; only API contracts and document shapes are evidenced.
- BPMN artifacts exist as draw.io SVG files and appear documentary (not wired into execution).

## B. Product boundary map

### What lives in `lens_ai_test_pilot`

- Cypress orchestration + runtime:
  - environment bootstrap and remote data fetch in `cypress.config.ts` (`setupNodeEvents`).
  - test execution spec in `cypress/e2e/test.cy.ts`.
  - execution engine in `src/services/testScript.ts` (`clTestRunnerUiService`).
  - action abstraction in `src/action.ts` (`clActionFactory`, `clConnectionFactory`, action classes).
  - datatype abstraction in `src/dataType.ts` (`clDataTypeFactory`).
  - property validators in `src/properties.ts` (`clPropertiesFactory`).
  - auth/report/log services in `src/services/*.ts`.

### What lives in `lens-test-pilot-config` (evidenced boundary)

- The repo is referenced by name and cloned from GitHub in `setup.sh` and `replace.js`.
- Expected payload paths inside that repo are:
  - `document/Site Details/host-site.json`
  - `document/Test Case Configurator/Sample Test.json`
- Upload commands are delegated to that repo scripts (`npm run upload_testlab_setup`, `npm run upload_testdata`).
- **Not evidenced in this workspace**: actual contents of `lens-test-pilot-config` (clone attempt returned HTTP 403 in this environment).

### What lives inside Frappe (as consumed by current runtime)

Evidenced by API usage/contracts:

- server method:
  - `ai_test_pilot_handle_request` with actions `get_test_data` and `get_test_lab`.
- doctypes/documents referenced by REST:
  - `Test Lab`, `Test Lab Script`, `Test Run`, `Test Log`, `Run Log`.
- fixture-like sample shape in `cypress/fixtures/testlab.json` mirrors `Test Lab` + child `Test Lab Script`.
- **Not evidenced**: doctype JSON definitions, client scripts, server scripts, fixtures source files, seed scripts from Frappe app/repo.

## C. Runtime architecture

1. **Boot/config phase (Node side):**
   - `cypress.config.ts` loads `.env`, pulls both `get_test_data` and `get_test_lab`, stores into Cypress env (`FETCHED_TEST_RUN`, `FETCHED_MASTER_DATA`, `FETCHED_LOGIN_DATA`, `FETCHED_TEST_LAB`).

2. **Spec orchestration phase (Cypress browser side):**
   - `cypress/e2e/test.cy.ts` creates a single shared context (`createDefaultContext()`), registers log capture, and creates one `it(...)` per fetched master script.

3. **Execution engine phase:**
   - `clTestRunnerUiService.executeScript()` performs: set current script → login by script name mapping → visit app → inject docname if configured → run header + row actions → capture docname from URL → logout.
   - `finalizeScript()` computes pass/fail, optionally posts `Run Log`, updates matching `Test Log` child rows on `Test Run`, increments script row index, resets in-memory context.

4. **Action/datatype/property layers:**
   - `clActionFactory` maps configured action labels to concrete classes.
   - action classes delegate field interaction/validation to `clDataTypeFactory` + `clPropertiesFactory`.

5. **Result persistence:**
   - `clReportService` performs `POST /api/resource/Run Log`, `GET /api/resource/Test Run/{name}`, `PUT /api/resource/Test Log/{id}`.

## D. Data model / doctype map

## D1. Script/test payload model (runtime TS model)

- `TtestHeaderData` includes script-level fields: `name`, `idx`, `doctype_to_be_tested`, `action` (Create/Update), `document`, `test_script`, `actual_test_data`.
- `TactionData` includes row-level fields: `pos`, `field_name`, `is_child`, `child_name`, `child_index`, `action`, `value`, `data_type`, property flags (`is_read_only`, `is_mandatory`, `is_hidden`), UI helpers (`section`, `tab`), message fields (`message_type`, `message`, `menus`, `description`), and API field `connecting_doctype`.
- `TtestLabScript` includes sequencing/connection fields: `idx`, `test_script`, `master_data`, `connection`, `connection_doctype`, `connection_from`, `linked_document`.

## D2. Frappe docs evidenced in runtime and fixture shape

- `Test Lab` (parent)
  - fields seen: `name`, `title`, `status`, `naming_series`.
  - child table `test_lab_script`.
- `Test Lab Script` (child)
  - fields seen: `idx`, `test_script`, `master_data`, `store_docname`, `use_docname`, `connection`, `connection_doctype`, `linked_document`, `connection_from`, `is_connection`.
- `Test Run`
  - fetched by name and read for child table `test_log`.
- `Test Log`
  - updated row-wise with `{ result, run_log }`.
- `Run Log`
  - created on failures with payload keys `script_id`, `master_data_id`, `test_run_id`, `log_entries`.

## D3. Relationship and sequencing logic

- Sequencing key is `currentScriptRowIdx` in in-memory context; lookup joins `test_lab_script` by (`master_data`, `idx`).
- `use_docname` points to prior script row idx; runtime resolves by searching `storeDocname` entries `{ idx, docname }`.
- Combined script names (`A & B`) are split in finalize flow and processed against current row index.
- Connection logic can create linked docs through Frappe form "Connections" UI and save resulting docname.

## E. Execution pipeline

1. Authoring/config setup:
   - User prepares `.env` (`npm run env`).
   - `npm run setup` executes `replace.js` then `setup.sh`.
   - `replace.js` mutates external config JSON (`host-site.json`, `Sample Test.json`) with `HOST_URL`/`HOST_KEY`.
   - `setup.sh` clones `lens-test-pilot-config` (if missing), optionally enables `server_script_enabled` in codespace backend, then runs upload scripts in config repo.

2. Runtime fetch:
   - Cypress startup fetches `get_test_data` (test run + master data + login data).
   - fetches `get_test_lab` (test lab details and child rows).

3. Script execution:
   - For each `master_data` script, create `it` block and execute runner.
   - header action navigates by script `action`:
     - `Create` ⇒ `/app/{doctype}/new`
     - `Update` ⇒ `/app/{doctype}/{document}`
   - row actions run by grouped `pos` windows and action labels.

4. Result handling:
   - capture fail/pass in context via Cypress fail/log hooks.
   - finalize updates `Test Log` rows; failure with logs also creates `Run Log` and links it.

## F. Supported actions and validations matrix

## F1. Header-level actions (script header `action`)

- `Create` → `clActionCreation`
- `Update` → `clActionUpdate`

## F2. Row-level actions (`clActionFactory.actionsMap`)

- Onload
- On Change
- On Tab
- Add Row
- Edit Details
- Expand Section
- Save
- Submit
- Amend
- Cancel
- Delete
- Click Button
- Action Menu
- On Validate
- Click Group Button
- Validate Group Button Options
- On Intro Banner
- Validate Attachment
- Validate Assignee
- Validate Breadcrumbs
- Button Visibility
- Validate Email Attachments
- Validate Alert
- API GET
- API PUT

## F3. Supported data types (`clDataTypeFactory.actionsMap`)

- Data
- Small Text
- Select
- Link
- Date
- Dynamic Link
- Currency
- Check
- HTML
- Datetime
- Text Editor
- Int
- Float

Child-aware behaviors:
- `Select` routes to child implementation when `is_child`.
- `Data|Link|Date|Dynamic Link|Currency` route to generic child implementation when `is_child`.

## F4. Property validations

- Is Read Only
- Is Mandatory
- Is Hidden

Resolved by row flags (`is_read_only`, `is_mandatory`, `is_hidden`) via `clPropertiesFactory.createAllFor(...)`.

## F5. API action capabilities

- `API GET`
  - dynamic endpoint template tokens supported in path: `{{ use_docname }}`, `{{ current_url }}`.
  - endpoint shape `/api/resource/{connecting_doctype}/{resolved_path}` + optional query (`menus`).
  - response validator supports flat parent fields + grouped child rows from action rows after index 0.
- `API PUT`
  - method override `PUT`, status `[200,201]`, payload built from expected flat/grouped fields.
  - response payload validation disabled for PUT in current implementation.

## F6. Connection/document chaining capabilities

- `use_docname` docname injection before script execution.
- capture created docname from URL into `storeDocname` keyed by test lab row idx.
- optional connection action (`connection="Create"` + `connection_doctype`) opens Connections tab and saves linked doc.
- API endpoint token resolvers can consume stored docname/current URL docname.

## G. Current limitations

1. Architectural coupling
   - Tight coupling to Frappe UI DOM selectors and button labels in action classes.
   - Tight coupling to custom server method `ai_test_pilot_handle_request` and fixed doctype names (`Test Run`, `Test Log`, `Run Log`).

2. Packaging limitations (no separate Frappe app evidenced here)
   - Runtime assumes server scripts and doctypes already exist on target/host site; setup delegates to external config repo uploads.
   - Core Frappe customizations are outside this repo boundary, reducing reproducibility from a single artifact.

3. Portability/versioning
   - Setup hardcodes branch `develop` of external repo and mutates JSON in-place.
   - Credentials and site endpoints are injected via `.env` and direct JSON rewrite rather than versioned config contracts.

4. BPMN status
   - BPMN files are draw.io SVG assets in `BPMN/`; no execution hooks reference them in runtime code.
   - therefore BPMN is documentary, not executable workflow.

5. Traceability boundaries
   - Traceability begins at fetched test lab/master data and Cypress execution context, and ends at `Test Log`/`Run Log` updates.
   - Mapping to upstream requirement/task systems is not runtime-enforced (only incidental text appears in diagram SVG content).

## H. Reusable components for PRISM (current-state extraction only)

## Preserve as runtime building blocks

- `clTestRunnerUiService` orchestration pattern (script loop, finalize semantics).
- action factory pattern + datatype/property sub-factories.
- failure capture and Frappe result posting service abstractions.
- dynamic endpoint token resolution (`use_docname`, `current_url`) and docname chaining model.

## Lift into canonical model candidates

- The implicit script schema (`TtestHeaderData`, `TactionData`, `TtestLabScript`) as a typed canonical contract.
- Explicit enumeration registries now embedded in maps (header actions, row actions, datatypes, properties).
- run-log linkage semantics (`Test Log.result`, `Test Log.run_log`, `Run Log.log_entries`).

## Replace candidates

- hardcoded DOM/label selectors in action classes.
- setup-time mutation of external JSON files.
- branch-pinned external repo coupling and non-local Frappe customization packaging.

## I. Recommendation: evolve vs rewrite

- **Recommendation: evolve (not rewrite) the runtime layer**, because the current code already has modular seams (runner, action factory, datatype factory, properties, report/auth services).
- **But** treat external config packaging and Frappe customization distribution as the main instability zone; these are the first candidates for hardening.
- This recommendation is based only on evidenced current structure; deeper Frappe-side rewrite/evolution decisions are **not evidenced** in this workspace.

## J. Evidence appendix (primary references)

### Boundary + setup
- `package.json` scripts (`setup`, `env`, `ui_test`, `cli_test`)
- `setup.sh` (`REPO_NAME`, clone/upload flow, server_script_enabled)
- `replace.js` (external repo JSON mutation paths)
- `README.md` setup and run instructions, result viewing notes

### Runtime fetch/orchestration
- `cypress.config.ts` (`setupNodeEvents`, `get_test_data`, `get_test_lab`, env injection)
- `cypress/e2e/test.cy.ts` (context setup, one `it` per master script, finalize in `afterEach`)
- `src/models/testContext.ts` (context shape defaults)

### Runner + reporting + logging
- `src/services/testScript.ts` (`executeScript`, docname inject/capture, finalize, run log posting, test log updates)
- `src/services/reportService.ts` (Run Log/Test Run/Test Log API calls)
- `src/services/authService.ts` (login/logout API)
- `src/services/logCaptureService.ts` (fail/log capture)

### Action/data abstraction
- `src/action.ts` (`clActionFactory.actionsMap`, `testActionsMap`, `clConnectionFactory`, API GET/PUT classes)
- `src/dataType.ts` (`clDataTypeFactory.actionsMap` + child routing)
- `src/properties.ts` (`clPropertiesFactory`)
- `src/types.ts` (typed model for scripts/actions/test lab script)

### Frappe data shape sample + BPMN assets
- `cypress/fixtures/testlab.json` (sample Test Lab + Test Lab Script document shape)
- `BPMN/latp-architecture.drawio.svg` (diagram asset format/comments)

### Not-evidenced item (environment-limited)
- `lens-test-pilot-config` repository content (clone blocked with HTTP 403 in this environment).
