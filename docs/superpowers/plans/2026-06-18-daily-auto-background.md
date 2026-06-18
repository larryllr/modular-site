# Daily Auto Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-page Bing daily background switch with a same-origin cached image proxy and decode-before-reveal loading.

**Architecture:** `SitePage.dailyBackgroundEnabled` is normalized on both Worker and browser boundaries. A Worker API endpoint resolves Bing metadata, fetches UHD first with a 1920 fallback, validates the Bing origin, and edge-caches the image response. The frontend preloads the endpoint for the active page, stores only a prepared URL in memory, and renders once the image has decoded or a bounded timeout selects the manual-background fallback.

**Tech Stack:** Cloudflare Workers, Workers Cache API, vanilla JavaScript, CSS, Node.js test runner, TypeScript.

---

### Task 1: Configuration Contract And Admin Switch

**Files:**
- Create: `tests/daily-background.test.mjs`
- Modify: `src/index.ts`
- Modify: `public/app.js`

- [x] **Step 1: Write failing source-contract tests**

Add tests that require `dailyBackgroundEnabled: boolean` on `SitePage`, default `false` values, Worker normalization with `typeof record.dailyBackgroundEnabled === "boolean"`, browser hydration with `Boolean(page.dailyBackgroundEnabled)`, and a labeled admin checkbox that updates the page without rebuilding the editor.

- [x] **Step 2: Verify the focused test fails**

Run: `node --test tests/daily-background.test.mjs`

Expected: FAIL because `dailyBackgroundEnabled` and “每日自动背景” do not exist.

- [x] **Step 3: Implement the minimal configuration path**

Add the field to `SitePage`, both default pages, `normalizeSiteConfig()`, `fallbackConfig`, `hydratePage()`, and `createPage()`. In the page settings next to “分页面背景”, append a checkbox whose `change` handler sets `page.dailyBackgroundEnabled`, calls `markConfigDirty()`, and refreshes only the background preview state needed by the control.

- [x] **Step 4: Verify the focused test passes**

Run: `node --test tests/daily-background.test.mjs`

Expected: PASS for the configuration and admin-control tests.

### Task 2: Bing Daily Image Proxy And Cache

**Files:**
- Modify: `tests/daily-background.test.mjs`
- Modify: `src/index.ts`

- [x] **Step 1: Add failing endpoint contract tests**

Require `/api/daily-background`, a fixed metadata URL using `format=js&idx=0&n=1&mkt=zh-CN`, exact-origin validation for `https://www.bing.com`, UHD construction from `urlbase`, fallback to the returned `url`, image content-type validation, and `caches.default` reuse.

- [x] **Step 2: Verify the endpoint tests fail**

Run: `node --test tests/daily-background.test.mjs`

Expected: FAIL because the endpoint and resolver are absent.

- [x] **Step 3: Implement the Worker endpoint**

Add `fetchDailyBackground(request)` and register it in `apiRoutes`. First return `caches.default.match(request)` when present. Fetch metadata with an abort timeout, parse the first image, build only Bing-origin candidate URLs, request `${urlbase}_UHD.jpg` first and the supplied 1920 URL second, accept only successful `image/*` responses, then return a copied response with `Cache-Control: public, max-age=3600, s-maxage=21600` and `X-Content-Type-Options: nosniff`. Put a clone in `caches.default`. Return JSON `502` when metadata or both image candidates fail.

- [x] **Step 4: Verify focused tests and TypeScript**

Run: `node --test tests/daily-background.test.mjs`

Run: `npm run check`

Expected: both commands PASS.

### Task 3: Decode-Before-Reveal Frontend

**Files:**
- Modify: `tests/daily-background.test.mjs`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [x] **Step 1: Add failing loading and fallback tests**

Require an initial `app-booting` document class, a deep-teal boot background, `prepareDailyBackground(page)` using `Image.decode()` with a five-second timeout, an in-memory prepared URL keyed by page slug, automatic-background precedence over `backgroundImage`, and a `finally` path that removes the boot class.

- [x] **Step 2: Verify the frontend tests fail**

Run: `node --test tests/daily-background.test.mjs`

Expected: FAIL because boot gating and daily image preparation are absent.

- [x] **Step 3: Implement bounded preloading**

Add `preparedPageBackground` to state. In `init()`, after loading public config and before `renderPublicSite()`, identify the active visible page and call `prepareDailyBackground()` when enabled. The helper loads `/api/daily-background?day=${new Date().toISOString().slice(0, 10)}`, waits for `image.decode()` or rejects after 5000 ms, and stores the URL only on success. Ensure `document.documentElement.classList.remove("app-booting")` runs after every admin, special-page, success, and failure render path.

- [x] **Step 4: Apply the resolved background everywhere**

Add `resolvePageBackground(page)` returning the prepared daily URL when enabled and available, otherwise `page.backgroundImage`. Use it in normal pages and blog pages. When a password-protected page is unlocked, prepare its daily background before rendering; a failed preparation must still render with the manual fallback.

- [x] **Step 5: Add boot styling and verify**

Set `<html class="app-booting">` in `public/index.html`. Add CSS that hides `#app` during boot, uses a deep-teal viewport background, and reveals the application without transition after the class is removed.

Run: `node --test tests/daily-background.test.mjs`

Run: `node --check public/app.js`

Expected: both commands PASS.

### Task 4: Integrate Existing Visual Work And Release

**Files:**
- Modify: `tests/background-page-layout.test.mjs`
- Modify: `public/styles.css`
- Modify: `HANDOFF.md`
- Modify: `docs/superpowers/plans/2026-06-18-daily-auto-background.md`

- [x] **Step 1: Finish the already-approved teal visual contract**

Bring the existing failing background test and CSS into agreement: the image layer uses a light cyan screen blend, no blur, `saturate(0.85) brightness(1.15) contrast(0.9)`, the directional overlay uses the approved lighter alpha values, headers are white, and cards remain 90% white with the restrained cool shadow.

- [x] **Step 2: Run focused and complete automated verification**

Run: `node --test tests/background-page-layout.test.mjs tests/daily-background.test.mjs`

Run: `npm test`

Run: `node --check public/app.js`

Run: `npm run check`

Run: `git diff --check`

Expected: all commands PASS with no syntax, type, test, or whitespace errors.

- [x] **Step 3: Browser QA locally**

Start the Worker locally, enable the feature on a test page, and verify desktop plus `390x844`: no white flash, decoded daily image shown behind the approved teal treatment, equal card dimensions, and a forced endpoint failure rendering the manual background within five seconds.

- [x] **Step 4: Deploy and verify production**

Run: `npm run deploy`

Record the emitted Cloudflare Version ID. Verify the production daily-background endpoint returns `image/*`, then verify the enabled production page on desktop and mobile.

- [x] **Step 5: Update handoff and publish source**

Update `HANDOFF.md` with the feature behavior, failure fallback, current Version ID, and Bing-source limitation. Stage only intended source, test, spec, plan, and handoff files; exclude `.playwright-cli/` and `output/`.

Run: `git commit -m "Add daily page backgrounds"`

Set `HTTP_PROXY` and `HTTPS_PROXY` to `http://127.0.0.1:10808`, run `git push`, then run `git status --short`.

Expected: push succeeds and only intentionally untracked local QA artifacts, if any, remain.
