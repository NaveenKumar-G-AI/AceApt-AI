# ACEAPT

An anonymous aptitude learning workspace: understand concepts, practise, examine mistakes, and build independent problem-solving ability. The application opens directly into the product.

## Run

Requires Node.js 22+ and npm. Run commands **inside this folder**.

This repository contains the complete unified application at its root. The original prototype parts and PrepVista are not included.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Practice, diagnostics, guided learning, progress, formulas, bookmarks and numerical shortcut checks work without a key or database.

The dashboard's adaptive daily path uses your recorded answers, chosen skill focus and remaining daily practice intention to suggest linked learning actions. It refreshes after practice. Reading a lesson does not automatically record completion or mastery.

## Optional AI tutor

Set these server environment variables, or create an ignored `.env.local` using the names in `.env.example`:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables the server-side tutor. Never prefix this with `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | Model available to your Gemini project; defaults to `gemini-3.5-flash`. |

No existing credentials were copied. Without a key, the tutor reports unavailability; authored solutions and deterministic teaching remain usable. The integration uses Google's [Generate Content API](https://ai.google.dev/api/generate-content).

## Production

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The Next.js server listens on port 3000 by default. Override with `npm start -- --port 3210`. This is a server application, not a static export: `/api/tutor` requires the Node runtime.

## Deploy to Vercel

Import `NaveenKumar-G-AI/AceApt-AI` and leave the project root at the **repository root** (`./`). Choose Next.js and Node 22 or newer. Install: `npm ci`. Build: `npm run build`. Leave the output directory at the framework default (`.next`). Configure the two AI environment variables in the hosting dashboard and redeploy. The included `vercel.json` sets the framework and install/build commands using the [documented Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json). Next.js handles direct internal routes; no SPA rewrites or external databases are required. Deployment itself has not been performed.

## Deploy to Render

Create a **Node Web Service** linked to this repository and branch `main`. Leave Root Directory blank. Build command: `npm ci --include=dev && npm run build`. Start command: `npm start -- --hostname 0.0.0.0 --port $PORT`. Set `NODE_VERSION=24.14.0`, `NODE_ENV=production`, `GEMINI_API_KEY` and `GEMINI_MODEL` in Render's Environment settings. Health check path: `/`.

Render terminates HTTPS before forwarding traffic to Next.js. The tutor recognizes the public origin using Render's automatically supplied `RENDER_EXTERNAL_URL`; do not manually override it. If you add a custom domain, set optional `APP_ORIGIN` to its exact origin (for example, `https://learn.example.com`, with no path). Other origins remain rejected; forwarded headers alone cannot authorize a request. Save environment changes and redeploy. See [Render web services](https://render.com/docs/web-services) and [default environment variables](https://render.com/docs/environment-variables).

## Validation

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Browser tests launch production on port 3210, or reuse a server already listening there. `ACEAPT_BROWSER_PATH` optionally selects an installed browser executable. It is a test-only variable. See [the verification report](docs/VERIFICATION.md) for actual results and limits.

## Architecture and data

- `src/components`: shared product shell and learning screens.
- `src/lib/learning.ts`: canonical question bank, progress schema and adapters.
- `src/engines`: copied and adapted ACEAPT domain logic; no standalone demo servers or identity stores.
- `src/ai`: one validated server-side Gemini integration and browser client.
- `src/app/api/tutor`: payload limits, same-origin checks, bounded requests and safe errors.
- `tests`: inherited diagnostic tests, integration tests and browser journeys.

Browser progress is versioned and validated. Export/import backups from Preferences. Ordinary practice time pauses away from the question; simulation deadlines keep running. Assisted answers are excluded from independent capability evidence. Records are local, editable learning evidence, not secure exam results. Importing a backup replaces the local workspace. Multiple tabs synchronize the latest saved workspace; they do not support simultaneous collaborative editing.

No runtime imports or assets point outside this application. Copy this directory alone, excluding generated files (`node_modules`, `.next`, `.npm-cache`, test output), install its locked dependencies, and run it independently.

The [integration report](docs/INTEGRATION.md) records the consolidation choices and remaining scope. Original-file hashes and copy provenance are retained under `docs`. `npm run verify:originals` is an optional workspace audit; it needs the original sibling parts and is **not** required for installation, build, runtime, or deployment.
