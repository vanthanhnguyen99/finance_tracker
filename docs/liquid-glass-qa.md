# Liquid Glass: implementation and release handoff

The finance routes now share an authenticated `(finance)` layout. Page authentication
and all existing financial API/schema contracts remain in place. The presentation
flag defaults to classic and the root resolves it at request time for all routes. Appearance (system/light/dark) and transparency (system/standard/reduced) now share one root resolver; offline features and new reports remain outside this release.

## Architecture and behavior

- `app/styles/tokens.css` owns the semantic palette, radii, shadows and motion. Tailwind
  aliases use those variables. `glass.css` opts only floating header/navigation surfaces into blur, with opaque
  fallbacks, high contrast and reduced motion/transparency. Financial cards, forms and dialogs stay solid. Browser chrome/manifest colors are literal
  platform metadata; keep them aligned with the background/accent tokens.
- `AppPage` separates the sticky header from `MotionContent`. A small WAAPI controller
  reads CSS duration/easing tokens and claims each pathname once in the persistent shell.
  Refreshes/query changes do not replay entry motion. There is no View Transitions API
  dependency, exit snapshot, or additional motion library. Loading boundaries do not claim
  entry motion before the actual page renders.
- `FormActions` portals the mobile footer outside transformed route content. A focused
  input plus a visual viewport shrink greater than 120px moves it into normal form flow.
  Desktop actions stay inline. Native pickers, text zoom and the existing money helpers
  are preserved.
- Drafts are separate for expense/income/exchange, versioned and scoped to the authenticated
  user in `sessionStorage`. Memory is the fallback when storage is blocked. Discard and
  successful save clear only the current draft; failures keep it. No automatic POST retry.
  A synchronous ref prevents simultaneous submits. Late responses after logout cannot write drafts for the previous account. Logout/auth pages/account switches clear
  UI storage. No draft uses `localStorage`.
- History URLs own applied filters. Only the bottom nav resumes the last history URL;
  explicit links and Reset keep their own destinations. An in-memory cache retains loaded
  pages, anchor and scroll for up to 12 query/timezone/user entries. Financial data versions
  and changed server first pages invalidate cached results; replay follows fresh cursors up
  to the previously loaded page count. Aborted/stale responses cannot append to new results.
  Browser storage contains UI metadata and drafts, never cached financial API responses.
- Budget mutations reload computed budget views from the existing GET API before finishing;
  the UI does not depend solely on a router refresh to display a newly saved limit.
- Native modal dialogs provide focus containment, inert background and Escape support;
  app code locks body scrolling and restores the opener. Budget edit/create, profile and
  time filtering share this overlay. The filter accordion keeps collapsed controls inert
  while preserving their values for form submission.

## Reproduce automated QA

Use an isolated PostgreSQL instance. In this workspace `finance-glass-test-db` already exists
and is stopped after QA; use `docker start finance-glass-test-db` instead of the first
`docker run` command below. The loopback preview processes were also stopped after verification.

The integration suite clears the dedicated database;
never point it at application data. UI configuration/fixtures reject nonlocal databases
and names other than `finance_tracker_test`.

```bash
docker run -d --name finance-glass-test-db \
  -e POSTGRES_USER=glass_test -e POSTGRES_PASSWORD=glass_test_local \
  -e POSTGRES_DB=finance_tracker_test -p 127.0.0.1:55439:5432 postgres:15
export TEST_DATABASE_URL='postgresql://glass_test:glass_test_local@127.0.0.1:55439/finance_tracker_test'
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm test
npm run lint
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration
npx playwright install chromium webkit
npx tsc --noEmit --incremental false
npm run test:ui
```

For a production preview, build with the isolated URL, start on loopback, then point
Playwright at that running instance. `UI_TEST_BASE_URL` explicitly opts into reuse;
without it Playwright starts its own glass-enabled development server.

```bash
DATABASE_URL="$TEST_DATABASE_URL" GLASS_UI_ENABLED=true npm run build
DATABASE_URL="$TEST_DATABASE_URL" GLASS_UI_ENABLED=true npm run start -- --hostname 127.0.0.1 --port 3107
# Separate shell with TEST_DATABASE_URL exported:
UI_TEST_BASE_URL=http://127.0.0.1:3107 npm run test:ui
```

Playwright seeds only fixture user data. Screenshots of all five views are saved in
`test-results`; HTML results, failure traces and failure videos are generated locally.
The one-off before/after evidence and recorded walkthrough live under
`artifacts/liquid-glass` (ignored, not application assets).

## Verification record

Baseline on 2026-10-17: 24 unit/regression tests and 28 PostgreSQL integration tests
passed; production build passed. Existing working-tree changes were archived to
`/tmp/finance-glass-baseline/working-tree.tar.gz` with the tracked patch alongside it. A persistent copy is also in
`artifacts/liquid-glass/baseline/`.

Final verification on 2026-10-17:

| Check | Result |
| --- | --- |
| Unit/regression, including UI storage privacy | 29 passed |
| PostgreSQL integration, isolated database | 28 passed |
| Production build, ESLint CLI, TypeScript, diff whitespace | Passed |
| Browser scenarios on production build | 34 passed: 17 Chromium, 17 WebKit |
| Budget-save repetition after fixing refresh behavior | 12 passed: 6 per browser |
| axe WCAG AA checks | Passed on all five views and shared dialogs |
| Overview at 320/375/393/430px and desktop, 200% text; all five views at phone profile | Passed |
| Runtime presentation flag on authentication and all five finance routes | Glass and classic passed with the same build |

Browser cases include rapid navigation/current-tab refresh/Back/Forward, pending feedback,
per-type draft restoration (including long notes), blocked storage, logout/account isolation,
submit deduplication, decimal DKK/VND/exchange fees/credit cards, cursor/scroll restoration,
off-page edits/deletions, CSV, budget creation/copy, dialog focus, reduced motion and opaque
fallback. The keyboard viewport test simulates viewport contraction; it is not hardware QA.

The persistent before/after gallery is `artifacts/liquid-glass/index.html`; the generated
Playwright report is `playwright-report/index.html`. Neither is committed as application code.

## iPhone device QA — manual checks still required

Browser WebKit emulation does not establish real Safari keyboard, safe area, VoiceOver,
standalone installation or device performance. Complete the following on physical hardware after deployment; browser emulation does not replace these checks:

- [ ] Test on an iPhone with a home indicator, portrait and landscape; record model/iOS.
- [ ] Safari tab: toolbar expansion/collapse, native date/select pickers, scroll to final item.
- [ ] Keyboard: amount/note/custom time, scroll to Save, dismiss keyboard, no covered fields/CTA.
- [ ] Add to Home Screen: launch, resume, Back and safe area with the existing manifest.
- [ ] VoiceOver: tab labels, field names, validation, dialog entry/trap/exit and focus restoration.
- [ ] Larger Text/200% zoom; reduced motion and opaque fallback; verify contrast over scrolled content.
- [ ] Web Inspector: capture rapid tab changes, 100+ rows, filter expansion and form opening;
      inspect frame times/long tasks/paint. 60fps remains a target, not an automated claim.

## Rollout / rollback

1. Keep the previous application image/tag. Build a preview against an isolated database
   and set `GLASS_UI_ENABLED=true` there. Complete automated QA and record physical-device checks separately.
2. To enable the existing Docker deployment, set the server flag in its `.env` and recreate
   only `app` after building the reviewed code (`docker compose up -d --no-deps --build app`).
   No database migration is introduced by the UI change; pre-existing migrations belong
   to the baseline feature work and require their own deployment handling.
3. Verify the five routes and a real authenticated workflow. Use existing console/server
   logs and failed-save feedback to monitor. Do not log amounts, notes or session secrets.
4. For visual rollback set `GLASS_UI_ENABLED=false` and recreate `app`. Draft/navigation
   improvements still exist in classic mode. For a behavior regression use the previous
   image/tag; do not roll back the database for this UI change.

Production deployment and the physical-device checks are separate from local implementation.

## Live deployment correction — 2026-10-17

The application on port 5050 was still serving its previous Docker image and had no
enabled presentation flag. The new UI had only been exercised in local previews.
The app service has now been rebuilt and recreated with `GLASS_UI_ENABLED=true`;
the database and admin service were not restarted and no migrations were run.

Live browser verification also exposed a production-only timing bug: CSS optimization
serialized `220ms` as `.22s`, which `parseFloat` passed to Web Animations as 0.22ms.
`lib/ui-motion.ts` now converts both CSS time units to milliseconds. The new regression
tests cover optimized tokens and actual browser animation durations; earlier navigation
checks did not assert the duration.

- 30 unit/regression tests, ESLint, TypeScript, production Docker build and diff check passed.
- Four focused navigation/timing cases passed on Chromium and WebKit using the isolated DB.
- Separate read-only checks visited all five live finance routes in both browsers:
  glass enabled, nav blur 14px, translucent background, 220ms page entry, 280ms form entry,
  and no browser JavaScript errors. The temporary QA session was removed after verification.
- Physical iPhone checks above remain outstanding; deployment does not establish 60fps,
  hardware keyboard behavior, VoiceOver or standalone PWA acceptance.
- `.dockerignore` excludes local env files, dependencies, build output, backups and QA
  artifacts from the image build context.

Private rollback configuration, prior image tag, screenshots and live verification JSON
are saved at `/root/finance_tracker_release_backups/20261017T062136Z/`. The previous image
is retained as `finance-tracker-rollback:20261017T062136Z`. Use the generated `rollback.sh`
there to restore the previous app image and environment without touching the database.


## Apple-inspired theme completion — 2026-10-17

The research specification is the visual source of truth where earlier UI documents differ.
The five finance routes and login/register/password reset share the same semantic light/dark
palette, system font stack, native input color scheme and solid content surfaces.

### Theme contract

- `ThemeProvider` owns `appearance: system | light | dark` and
  `transparency: system | standard | reduced` (both default to `system`).
- The profile dialog exposes both settings. Preferences are device/browser choices, not
  financial/account records. `finance_appearance` and `finance_transparency` are validated,
  non-sensitive cookies with Path=/, SameSite=Lax, one-year lifetime and Secure on HTTPS.
  When cookies are blocked, selections still work in memory for the current document.
- SSR reads validated cookies. The same self-contained resolver runs in the document head
  before paint and after hydration; it sets `data-color-mode` and `data-transparency` on html.
  Only root attributes use hydration-warning suppression because system preferences cannot
  be known on the server. No page content uses suppression. Media changes update the theme
  without navigation. Invalid preferences fall back to system.
- Explicit reduced transparency always uses an opaque surface. System follows OS reduction;
  explicit standard permits glass, except high contrast always forces opacity. Unsupported
  blur starts from the same opaque base. Reduced motion is inherited from the OS.
- Browser theme-color follows the effective canvas. The static PWA launch color is the light
  canvas; installed-shell behavior still needs device verification.
- `GLASS_UI_ENABLED=false` disables glass presentation with the same components; theme
  preferences remain supported. Restore the previous image for a complete behavior rollback.

### Material and navigation contract

- Only the sticky header and a single floating dock blur. Solid dialogs have a plain alpha
  scrim; opening a dialog hides the underlying dock. No row, input or financial card blurs.
- Four links live in the navigation landmark. The centered 56px + is a separate button,
  outside the landmark, routing to `/add`. Native link pending feedback and current-route
  aria-current remain distinct. The button shows pending feedback while opening.
- ResizeObserver measures actual dock height; content padding includes this height, dock
  gap and safe area, including at 200% text. No per-scroll layout listener is added.
- History uses an explicit minmax(0, 1fr) group grid and a rem-based container query.
  Narrow rows/large text place the amount below the description, with wrapping rather than
  clipping. QA checks the amount geometry as well as page width on Chromium and WebKit.
- AppShell emits `finance-tracker:before-navigation` before route actions. History freezes
  its anchor before router scrolling for the + button as well as links, preserving return
  position after a save. The existing cursor cache and financial invalidation policy remain.
- Existing CSS/WAAPI motion stays interruptible; no animation library, API/schema change,
  migration, synthetic chart data or money count-up was introduced.

### Verification and operations

Automated QA uses the isolated database on loopback port 55439 and production preview on
3107. No fixture seeding or financial writes are permitted against the live app on 5050.
Screenshot gallery and final check results follow below.

Private snapshot of the complete starting working tree, environment and previous image:
`/root/finance_tracker_release_backups/20261017T064351Z/`.
Use `rollback.sh` in that directory to restore the previous image and environment; it does
not touch the database. Recreate only `app` for deployment. Existing database/admin containers
must retain their identities and start times.


### Final verification and deployed result

| Check | Result |
| --- | --- |
| Unit/regression | 32 passed |
| PostgreSQL integration, dedicated test DB | 28 passed |
| Final production-build browser cases | 46 verified: 23 Chromium, 23 WebKit |
| Authentication light/dark axe audits | 12 passed: 3 pages x 2 modes x 2 engines |
| System-dark first frame and runtime classic/glass flag | 4 passed, both engines |
| ESLint, TypeScript, production/Docker build, diff check | Passed |
| Authenticated live routes on port 5050 | 20 passed: 5 routes x 2 modes x 2 engines |
| Live financial fingerprint / browser errors | Unchanged / zero |
| DB/admin container identities and start times | Unchanged |
| Physical iPhone Safari / VoiceOver / installed PWA | Not verified; manual checklist above remains |

Execution detail: the final full browser run passed 44 cases before its process ended with
SIGTERM. The remaining two WebKit cases (authentication/empty/error and large-text dock)
then passed in a focused run. All 46 scenarios were verified against the final build;
this count does not describe a single uninterrupted full-suite completion.

The app was recreated with `GLASS_UI_ENABLED=true`, without a migration or restarting DB/admin.
Live checks used a short-lived hashed session for an existing active account, blocked all
mutating HTTP API calls, and removed that session in cleanup. Amounts/account details were
not printed in QA logs. Live screenshots are private ignored artifacts, separate from the
fixture screenshot gallery. The LAN login also returned HTTP 200 at
`http://192.168.10.160:5050/login`.

- Fixture before/after light/dark gallery: `artifacts/liquid-glass/apple-inspired/index.html`.
- Browser execution, supplementary checks and deployment summary:
  `artifacts/liquid-glass/apple-inspired/verification.json`.
- Private live screenshot and computed-style verification:
  `artifacts/liquid-glass/apple-inspired/live/verification.json`.
- All five final WebKit screenshots in both modes:
  `artifacts/liquid-glass/apple-inspired/webkit/`.
- Final 320/393/430px and desktop large-text captures:
  `artifacts/liquid-glass/apple-inspired/large-text/`.

No device frame-rate, real software-keyboard behavior or installed-PWA acceptance is inferred
from WebKit emulation. Preview processes and the isolated database are stopped after QA.

Deployed app image: `sha256:6fdeee177ce0b444386bb02748efeddbcb524b81b2847813b26b032a6c6d6ab0`.


## iPhone 15 Pro / iOS 26 standalone refinement — 2026-10-17

The user supplied five screenshots from a Safari page installed on the Home Screen.
Those screenshots exposed visual shortcomings that the previous computed-style and
functional checks did not establish: an opaque-looking oversized dock, block selection,
heavy header shadow, Safari's small native selects, month overflow, and a blue horizontal
line on Reports. The target for this refinement is that installed-app context at 393x852.

### Revised visual and control contract

- The dock is a 72px capsule at normal text size, with 36px ends, a translucent regular
  material, 18px blur/saturation and a masked highlight on its rim. A single neutral
  selection indicator slides between four links; it has no second backdrop filter.
- The centered 56px + is still a separate action. Its visual label is omitted in glass
  mode to reduce height; its accessible name remains “Thêm giao dịch”. A small gradient
  and inset edge shape the button without introducing nested glass.
- Header typography and logo are more compact; the wide drop shadow is removed. A distinct
  quiet translucent fill and outlined profile button replace the full-width white bar.
- Buttons and segmented controls use capsule geometry. The mobile Save CTA floats without
  an opaque full-width footer; keyboard-flow behavior is preserved. Form/content surfaces
  remain opaque. Reports uses a plain centered coming-soon state rather than a dashed box.
- Budget month/currency share a row on the target phone. Filter Apply is secondary, Add is
  primary, the copy action sits beside it, and the existing accounting explanation is in
  a native disclosure. API parameters, stored data and accounting rules are unchanged.
- Native month/date/datetime controls now share explicit inline sizing, appearance reset
  and a 3rem height (at least 48px). Selects use appearance:none and a theme-aware SVG chevron,
  while retaining the native select/picker behavior. Month filters explicitly constrain
  grid tracks; native intrinsic width cannot grow the form.
- The blue Reports line was reproduced before the fix as a programmatically focused
  `main` with a 2px accent outline and a 408px height. Only the main landmark outline is
  suppressed; interactive focus rings and the skip link remain available.
- Safe-area variables resolve from env() in production. Tests can override them explicitly
  with 59px top/34px bottom for standalone geometry. This is a simulation, not a capture
  of iOS browser chrome, hardware keyboard behavior or actual installation.

### Validation method and limitations

Playwright now uses the iPhone 15 Pro profile with an explicit 393x852 viewport. Three
additional cases per engine cover single-line labels, indicator placement, main focus,
native control geometry and submit behavior, and standalone safe areas/Save reachability.
Screenshots wait for client hydration and entry animation completion to avoid recording
half-opacity route frames. Baseline Chromium screenshots use the saved previous image
against the isolated test DB, so before/after comparisons use the same rendering engine.

A pixel comparison confirmed that Chromium renders the blur. In the current Linux headless
WebKit setup the header crop was pixel-identical with blur on and off even though CSS
reported blur; a compositing hint did not change that. Therefore WebKit screenshots are
used for geometry/functional checks, not proof of the native iOS 26 optical appearance.
Actual iPhone installed-app acceptance still depends on checking the deployed version on
the user's device. No claim of native Apple refraction or physical-device validation is made.

Rollback snapshot/image and unchanged DB/admin identities:
`/root/finance_tracker_release_backups/20261017T071615Z/`.
The rollback.sh script restores only the prior app image/environment.

Current refinement evidence lives at `artifacts/liquid-glass/ios26-refinement/`.
Final check counts and deployment results follow below.


### Refinement verification and deployment

- 32 unit/regression tests, ESLint, TypeScript, production/Docker builds and diff checks passed.
- 52 production-build browser cases passed in two complete runs: 26 Chromium and 26 WebKit,
  including all six new iPhone-shell cases. Structured results are saved separately for each
  engine; no timeout, retry, skipped or unfinished case is included in the count.
- 20 authenticated live route checks passed (5 routes x light/dark x both engines), including
  the compact dock and focused-main regression. No JavaScript/resource errors were recorded.
  The financial fingerprint was unchanged and the temporary QA session was deleted.
- Only app was recreated on port 5050. DB/admin IDs and start times stayed unchanged; no
  migration was run. The LAN login returned HTTP 200.
- Gallery: `artifacts/liquid-glass/ios26-refinement/index.html`; compact dock comparison:
  `artifacts/liquid-glass/ios26-refinement/dock-comparison.png`.
- Final result: `artifacts/liquid-glass/ios26-refinement/verification.json`; authenticated
  private live evidence: `artifacts/liquid-glass/ios26-refinement/live/verification.json`.
- To review on the installed iPhone app, close and reopen it to load the new hashed assets.
  Physical optical appearance, native picker presentation, keyboard, VoiceOver and installed
  app lifecycle remain device checks; they are not certified by the automated browser runs.
- Baseline preview container, local preview and the isolated QA database are stopped after QA.

Deployed refinement image: `sha256:8568338efbbcb5cd965be923beca616008ce058f41474f066d5eb0be5ce8965d`.
