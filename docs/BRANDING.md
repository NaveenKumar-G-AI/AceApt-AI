# PrepVista branding

Applied on 11 September 2026 to the complete application in `aceapt/aceapt-unified`. All changes and generated screenshots stay inside this directory.

## Source and coverage

- `src/app/prepvista-theme.css` copies the exact light/dark token values from the workspace's PrepVista `frontend/src/app/globals.css`. Component colors now reference these tokens for surfaces, navigation, text, borders, buttons, inputs, feedback, progress and learning screens.
- `public/prepvista.png` is a byte-for-byte copy of PrepVista's original public logo. SHA-256: `22C6BB17EC860DDE109F86BD9A8AC8039F937AFE885B1092767BCBE6624DAF36`.
- The logo and PrepVista wordmark appear in the responsive shared shell. Browser metadata, favicon, footer, tutor labels, tutor identity and visible backup error copy use PrepVista.
- The typography matches PrepVista's Segoe UI / Helvetica Neue system font stack. Dark mode is the default; both modes use `pv_theme`, including reload and browser-tab synchronization.
- ACEAPT storage keys, backup filenames, domain engines and original prototype parts retain their existing identities to preserve progress and source provenance.

## Verification

- Production build, ESLint, TypeScript and `git diff --check`: passed.
- Existing Playwright browser suite: 13 passed, including practice, assessment, learning, tutor and saved progress flows.
- Additional production browser inspection: all nine screens in light and dark mode at 1440, 800 and 390 pixels (54 combinations). Exact computed brand, page, text and sidebar colors checked; title, image loading and saved theme checked. No uncaught browser errors or horizontal page overflow.
- Original and bundled logo SHA-256 hashes match.
- Desktop and mobile screenshots visually reviewed. Captures are under `docs/screenshots/prepvista-{dark,light}-{desktop,tablet,mobile}.png`.

This is a local application update; it has not been deployed.
