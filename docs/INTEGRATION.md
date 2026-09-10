# Integration decisions

The source workspace contains 56 independent parts (1–58, with 49 and 52 absent), rather than one evolving application. Many reuse the same product concepts but define incompatible student identities, tenants, APIs, seeded histories, databases and integration stubs.

The unified app keeps the existing React/TypeScript stack and Next.js already used by several parts. There is one npm lockfile, one browser persistence schema, one application shell and one server AI endpoint. Original parts remain untouched. This is a focused student prototype, not 56 separately hosted applications behind a menu.

## Actual integrated capabilities

| Capability | Source and implementation |
|---|---|
| Direct anonymous entry | Identity/onboarding gates are omitted; optional goals and daily intentions live in Preferences. No identity database, demo student, signup guard or marketing page. |
| Adaptive question selection | Part 2's question bank, skill hierarchy, selection, evidence, prerequisite and stopping logic copied and adapted to the shared attempt history. 44 authored MCQs across 13 skills. |
| Advanced diagnostics | Part 42's profile builder, evidence weighting, consistency, confidence calibration, speed/accuracy profiles, bottlenecks and recommendation dependencies copied. One adapter maps actual local attempts into its blueprint. |
| Adaptive daily path | Part 26's diagnosis, candidate action, priority and time-budget planning engines are copied and adapted to the canonical bank. The dashboard links to targeted concepts, prerequisite review, practice, recall, transfer and pacing. A persisted skill focus and recorded question time affect the plan. Independent evidence counts distinct items; delayed observations can replace old results after at least 24 hours without exposure. Assisted and immediate repeated success do not inflate breadth. Unknown retention/transfer stays unknown. Ranking weights and activity durations are explicitly planning estimates. |
| Practice and assessment | Common question runner consolidates practice, diagnostic, simulation, revision, transfer, speed and accuracy flows. Answers are graded against authored keys. Simulation: 10 questions / 12 minutes / +1, −0.25, 0. |
| Speed and accuracy | Part 50's training policy, scoped personal baselines and accuracy guardrail adapt targets, detect rushing, ease pressure, and distinguish hesitation from low accuracy. Targets compare the same skill, difficulty and novelty category. Part 51's stability engine summarizes actual session consistency. Timing pauses away from a question. |
| Guided solving and hints | Part 48's trusted multi-step percentage, probability and seating problems, deterministic mistake classifier and hint policy. Steps must be answered correctly before proceeding. |
| Socratic teaching | Part 46's percentage and transfer generators and teach-back criteria. New problem → base value → increase → total → explanation → independent variation. Keyword-based teach-back is identified as a coverage check. |
| Learning and skill map | A single concept library, prerequisite links, authored worked examples and practice entry points using the canonical hierarchy. No seeded skill scores. |
| Retention and review | Part 19's evidence diversity, sufficiency and retention-strength logic runs on real local attempts. Missed, skipped, assisted and low-confidence questions feed revision. A corrected item clears immediately and returns on a transparent 1/3/7/14-day recall schedule. No fabricated readiness percentage. |
| Formula learning | Part 56's canonical formula content, derived-form validation and causal error classifier. Speed/distance/time, simple interest and compound interest support all eight activities: recognition, recall, selection, variable mapping, application, verification, transfer and delayed retention. Recall equations are checked numerically; delayed retention requires an earlier success at least 24 hours old. Results persist separately from diagnostic evidence. |
| Personal methods | Student notes and bookmarks persist locally. Part 57's pure numerical property validator and seeded sampling compare bounded arithmetic shortcuts against known relationships. Sample agreement is explicitly not algebraic proof. Fresh-value execution drills record correctness and timing; Part 57's trust lifecycle requires enough successful uses and an earlier measured baseline before claiming reliable time savings, and regresses after repeated failures. |
| Decision intelligence | Part 58's expected-value and break-even mathematics power a scoring-rule exploration tool. Confidence is explicitly an assumption in this exercise. |
| AI assistance | One Gemini route replaces the need for the separate provider-specific clients. Hint, reasoning, explanation and similar-exercise actions share schema validation, safe errors, timeouts and cancellation. Generated exercises never silently enter the scored bank. |

## Source disposition and boundaries

- **1:** identity gateway removed; non-identifying preparation preferences retained in the common workspace.
- **2, 3, 42, 43:** diagnostic/evidence overlap resolved through Part 2 selection and Part 42 multidimensional reporting.
- **4, 7, 12, 15, 16, 21, 22, 30, 44:** next-action and path experiences consolidated into shared recommendations, topic practice, goals and revision. Their individual orchestration services and seeded adapters are not deployed.
- **26:** diagnosis, action selection, priority and budget-packing engines run in the unified daily path with real local evidence. The source's seeded state, execution server and invented impact percentages are not shown as measured outcomes. Source fallback labels are adapted so missing evidence cannot establish stability; opening a lesson does not establish an intervention's effectiveness.
- **5, 6, 9, 13, 20, 31:** practice/simulation overlap consolidated into one runner; no separate score or session stores.
- **8, 14, 17, 18, 19, 23, 24, 25, 28, 46, 47, 48:** teaching, verification, transfer and review experiences consolidated into learning, guided solving, independent practice and retention evidence. A supported completion is never labelled unaided mastery.
- **10, 11, 27, 32:** real activity, consistency, confidence and timing signals appear in progress. Forecasts based on seeded demo cohorts are omitted; no unsupported future exam score is shown.
- **29, 33–41:** career targeting, positioning, applications, professional proof and career strategy are outside the requested aptitude-only product. Their originals remain available and unchanged.
- **45:** prerequisite navigation uses the canonical skill graph shared with the diagnostic, avoiding incompatible duplicate skill IDs. Its separate admin graph editor is outside the student prototype.
- **50, 51:** speed and accuracy practice share actual attempts and diagnostics; separate backend training-state stores are not exposed as additional products.
- **53–55:** only authored, structurally validated questions enter the scored bank. No AI-generated publication pipeline, author moderation portal or cohort-calibration claims are exposed.
- **56–58:** formula, methods and decision tools are integrated as described above.

## Precise remaining limits

This is **not exhaustive engine-by-engine parity** with every specialist service in the original parts. The full forecast/intervention orchestration, authoring/moderation pipelines and population difficulty calibration were not ported wholesale. Their seeded/demo implementations were not presented as live student functionality. The source inventory makes those boundaries reviewable instead of labelling them complete.

AI provider success was validated with controlled test responses. No Gemini/Groq key is present in the process environment, so live Gemini output and account/model access remain unverified. Configure the server key and an available model before an AI-enabled demonstration.

Rate limiting is per server process. A public multi-instance deployment should also configure hosting-level rate/budget controls. Local progress is not a secure examination record and does not synchronize across devices unless exported/imported.

The application does not read any PrepVista configuration or runtime source, and it does not copy any existing secrets.
