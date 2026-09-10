# Verification report

Validated locally on 10 September 2026, using Windows, Node.js 24.14.0 and Chrome through Playwright. All implementation changes are confined to `C:\PrepVista-AI\aceapt\aceapt-unified`.

## Executed checks

| Check | Actual result |
|---|---|
| Dependency installation | PASS: npm installation completed and a lockfile was produced. |
| `npm run lint` | PASS: ESLint completed with exit code 0. |
| `npm run typecheck` | PASS: TypeScript completed with exit code 0. |
| `npm test` | PASS: 97 tests across 8 files. Includes inherited diagnostic tests and integration coverage for learning evidence, training, retention, formulas, daily planning, provider handling and public-origin validation behind Render. |
| `npm run build` | PASS: optimized Next.js production build, TypeScript and all 12 generated pages completed. |
| Production start | PASS: the production Next.js server started on port 3210; browser tests exercised this build. |
| `npm run test:e2e` | PASS: 13 browser journeys, 18.3 seconds on the final run. |
| `npm run verify:originals` | PASS: all 3,098 files across 56 original parts match the recorded hashes. |
| Deployment configuration | `vercel.json` parses and its install/build commands match the package scripts. Hosting deployment has not been executed. |

The browser command used the locally installed Chrome executable through `ACEAPT_BROWSER_PATH`. That variable is optional and test-only. No live provider key was needed for these checks.

## Browser coverage

- Immediate anonymous entry, actual answer feedback, bookmarks, reload persistence and progress.
- Adaptive daily path focus persists and opens the selected practice; lesson domain links refresh a previous selection correctly.
- All nine navigation routes at widths 390, 768 and 1440, with no horizontal overflow or uncaught page errors in those journeys.
- Topic selection while an existing session is open, and starting a simulation from a topic selection.
- Practice timing excludes time spent on another screen.
- Assessment assistance remains hidden until completion, then the report appears.
- Guided solution steps and formula feedback, plus distinct recall, mapping, transfer and delayed-retention activities.
- Incorrect shortcut rejection, valid shortcut saving, fresh-value execution drills and persisted measured timing.
- AI failure recovery and safe rendering of a controlled successful response.

Visual inspection artifacts: [desktop dashboard](screenshots/desktop.png) and [mobile dashboard](screenshots/mobile.png). These are dashboard captures, not screenshots of every feature.

## Requested verification matrix

| Requirement | Evidence or qualification |
|---|---|
| PrepVista untouched | No implementation writes were made outside the unified folder. Existing root Git changes were preserved; final status matches the initial status. |
| Original ACEAPT parts untouched; copied rather than moved | Original hash audit passes. Copied source provenance is recorded in `copy-manifest.json`. |
| Standalone unified folder | Own package, lockfile, routes, assets, configuration and local persistence. No runtime imports from original part folders or PrepVista. The optional source audit alone needs sibling originals. |
| No mandatory name, email, login or signup | Product opens directly. Learning preferences are optional; no identity gateway is installed. |
| Relevant feature integration | Capabilities and dispositions are listed in [the integration report](INTEGRATION.md). Exhaustive specialist-engine parity is not complete. |
| Navigation and primary actions | All 13 browser journeys pass. They cover principal flows, not every possible interaction. |
| OpenAI and Anthropic removed from unified runtime | Central server-side Gemini implementation is used; runtime source searches found no legacy provider references. Original source parts are intentionally unchanged. |
| Gemini/Groq works | Gemini request/response handling is implemented and tested with controlled responses. Live Gemini access and output remain unverified because no key is configured. Groq is not used by the unified app. |
| Secrets and AI errors | Key is read on the server. Input/output validation, request limits, timeouts, cancellation and safe failure responses are implemented. No credentials were copied. |
| Responsive layout and console errors | Tested routes have no overflow at the three tested widths and no uncaught page errors. |
| Lint, types, tests, build and production runtime | Executed results appear above. |
| Deployment, environment documentation and README | Vercel configuration, `.env.example` and [README](../README.md) are present. Actual deployment remains unperformed. |

## Remaining limits

Render origin regression: reproduced the incorrect 403 when the browser origin was the public HTTPS URL and Next.js used its internal listener URL. The fix accepts the exact `RENDER_EXTERNAL_URL` automatically and an optional configured custom-domain `APP_ORIGIN`. Tests cover a mocked provider success, invalid configuration, unrelated origins and forwarded-header spoofing. The rebuilt production server also passed three HTTP checks: the configured public origin reached input validation (400 for the deliberately empty payload), and two unrelated origins returned 403. Lint and production build passed. The 13-browser-journey result above is from the preceding full run; these additional checks target the server-only change.

Live AI success needs `GEMINI_API_KEY` and an accessible `GEMINI_MODEL`. Provider behavior tests and browser stubs do not validate credentials, account quotas or live teaching quality.

The full specialist forecast/intervention orchestration, authoring/moderation pipelines and population difficulty calibration were not ported wholesale. Career workflows and the separate graph administration interface are outside this student aptitude prototype. See the source dispositions in the integration report.

Progress is local to the browser, with backup export/import. Rate limits are per server process. These properties are documented rather than presented as hosted account synchronization or distributed enforcement.
