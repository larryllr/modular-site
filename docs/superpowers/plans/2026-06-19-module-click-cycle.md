# Module Click Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe three-state click cycle for ordinary public page module cards: default → expanded row → fullscreen → default, without scroll misfires.

**Architecture:** Keep state in DOM classes and data attributes only, bound by `renderPage()` after public modules are inserted. Pointer and keyboard handlers live in `public/app.js`; layout/state visuals live in `public/styles.css`; source-level tests lock the behavior and CSS overrides.

**Tech Stack:** Vanilla JavaScript, Pointer Events, CSS Grid/fixed overlay, Node built-in test runner.

---

## File Structure

- Modify `public/app.js`: add constants/helpers for module interaction targets, pointer gesture cancellation, one-active-card state, keyboard handling, and call the binding function from `renderPage()`.
- Modify `public/styles.css`: add clickable, expanded, fullscreen, scroll-lock, background-page override, and mobile override rules.
- Create `tests/module-click-cycle.test.mjs`: source-level regression tests for binding, state cycle, gesture safeguards, keyboard support, and CSS overrides.
- Modify `HANDOFF.md` after deploy: record implemented behavior and Cloudflare Version ID.

### Task 1: Source Tests for Interaction Contract

**Files:**
- Create: `tests/module-click-cycle.test.mjs`
- Read: `public/app.js`
- Read: `public/styles.css`

- [ ] **Step 1: Write the failing test**

Create `tests/module-click-cycle.test.mjs` with these assertions:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("renderPage binds click cycle only to non-immersive public module grids", () => {
  assert.match(appSource, /attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /if \(!immersive\)\s*{\s*attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /function attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /Array\.from\(grid\.children\)\.filter\(\(child\) => child\.classList\.contains\("module-card"\)\)/);
  assert.doesNotMatch(appSource, /renderPublicSite\(\)[\s\S]{0,300}moduleViewState/);
});

test("module click cycle uses DOM state classes for default expanded fullscreen default", () => {
  assert.match(appSource, /const moduleClickMoveThreshold = 10/);
  assert.match(appSource, /function cycleModuleCardState\(card, grid\)/);
  assert.match(appSource, /card\.dataset\.moduleViewState === "expanded"/);
  assert.match(appSource, /card\.dataset\.moduleViewState === "fullscreen"/);
  assert.match(appSource, /activateModuleCard\(card, grid, "expanded"\)/);
  assert.match(appSource, /activateModuleCard\(card, grid, "fullscreen"\)/);
  assert.match(appSource, /clearActiveModuleCard\(grid\)/);
  assert.match(appSource, /classList\.add\("is-module-expanded"\)/);
  assert.match(appSource, /classList\.add\("is-module-fullscreen"\)/);
  assert.match(appSource, /document\.documentElement\.classList\.add\("module-fullscreen-open"\)/);
});

test("module pointer handling cancels on controls movement scroll and lost pointer", () => {
  assert.match(appSource, /const moduleInteractionIgnoreSelector = "a, button, input, textarea, select, option, video, audio, details, summary, \[contenteditable\], \[role=\\"button\\"\], \[role=\\"link\\"\]"/);
  assert.match(appSource, /function isModuleInteractionTarget\(target\)/);
  assert.match(appSource, /target\.closest\(moduleInteractionIgnoreSelector\)/);
  assert.match(appSource, /event\.button !== 0/);
  assert.match(appSource, /event\.isPrimary === false/);
  assert.match(appSource, /Math\.hypot\(event\.clientX - gesture\.startX, event\.clientY - gesture\.startY\) > moduleClickMoveThreshold/);
  assert.match(appSource, /window\.scrollY !== gesture\.pageScrollY/);
  assert.match(appSource, /card\.scrollTop !== gesture\.cardScrollTop/);
  assert.match(appSource, /card\.addEventListener\("pointercancel", cancelGesture\)/);
  assert.match(appSource, /card\.addEventListener\("lostpointercapture", cancelGesture\)/);
});

test("module keyboard handling cycles with enter space and restores with escape", () => {
  assert.match(appSource, /card\.tabIndex = 0/);
  assert.match(appSource, /card\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(appSource, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(appSource, /event\.key === "Escape"/);
  assert.match(appSource, /card\.setAttribute\("aria-modal", "true"\)/);
  assert.match(appSource, /card\.removeAttribute\("aria-modal"\)/);
});

test("module click cycle styles override compact background cards and lock fullscreen scroll", () => {
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-clickable\s*{[^}]*cursor: pointer/);
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*grid-column: 1 \/ -1 !important[^}]*height: auto !important[^}]*min-height: clamp\(360px, 58vh, 720px\) !important/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*height: auto !important[^}]*overflow: visible/);
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-fullscreen\s*{[^}]*position: fixed[^}]*inset: 0[^}]*height: 100dvh !important[^}]*overflow: auto/);
  assert.match(stylesSource, /html\.module-fullscreen-open,\s*html\.module-fullscreen-open body\s*{[^}]*overflow: hidden/);
  assert.match(stylesSource, /@media \(max-width: 520px\)[\s\S]*?\.workspace\.has-page-background \.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*min-height: min\(72vh, 620px\) !important/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/module-click-cycle.test.mjs`

Expected: FAIL because `attachPageModuleCardInteractions`, state classes, pointer safeguards, and CSS rules do not exist yet.

### Task 2: JavaScript Module Interaction Binding

**Files:**
- Modify: `public/app.js`
- Test: `tests/module-click-cycle.test.mjs`

- [ ] **Step 1: Implement the minimal binding and state cycle**

Add near other top-level constants:

```js
const moduleClickMoveThreshold = 10;
const moduleInteractionIgnoreSelector = "a, button, input, textarea, select, option, video, audio, details, summary, [contenteditable], [role=\"button\"], [role=\"link\"]";
```

Call the binder in `renderPage()` after `grid.append(...renderedSections)`:

```js
  if (!immersive) {
    attachPageModuleCardInteractions(grid);
  }
```

Add functions that:

```js
function attachPageModuleCardInteractions(grid) { /* bind direct child module cards */ }
function isModuleInteractionTarget(target) { /* returns true for ignored controls */ }
function cycleModuleCardState(card, grid) { /* default→expanded→fullscreen→default */ }
function activateModuleCard(card, grid, viewState) { /* one active card and classes */ }
function clearActiveModuleCard(grid) { /* remove active classes and root scroll lock */ }
```

Pointer behavior must record pointer coordinates, page scroll, and card scroll, cancel when movement exceeds `10px` or any scroll changes, ignore interactive targets, and never call `preventDefault()` in `pointermove`.

- [ ] **Step 2: Run focused test**

Run: `node --test tests/module-click-cycle.test.mjs`

Expected: JS assertions pass or only CSS assertions fail.

### Task 3: CSS Expanded and Fullscreen Layout

**Files:**
- Modify: `public/styles.css`
- Test: `tests/module-click-cycle.test.mjs`

- [ ] **Step 1: Add styles**

Add rules after the existing `.workspace.has-page-background .navigation-list` block:

```css
.page-module-grid > .module-card.is-module-clickable { cursor: pointer; transition: transform 160ms ease, box-shadow 160ms ease, min-height 160ms ease; }
.page-module-grid > .module-card.is-module-expanded { grid-column: 1 / -1 !important; height: auto !important; min-height: clamp(360px, 58vh, 720px) !important; overflow: visible; }
.workspace.has-page-background .page-module-grid > .module-card.is-module-expanded { grid-column: 1 / -1 !important; height: auto !important; min-height: clamp(360px, 58vh, 720px) !important; overflow: visible; }
.page-module-grid > .module-card.is-module-fullscreen { position: fixed; inset: 0; z-index: 1000; width: 100vw; height: 100vh !important; height: 100dvh !important; min-height: 100dvh !important; overflow: auto; border: 0; border-radius: 0; box-shadow: none; padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }
html.module-fullscreen-open, html.module-fullscreen-open body { overflow: hidden; }
```

Add inside the existing `@media (max-width: 520px)` block:

```css
  .workspace.has-page-background .page-module-grid > .module-card.is-module-expanded {
    height: auto !important;
    min-height: min(72vh, 620px) !important;
  }
```

- [ ] **Step 2: Run focused test**

Run: `node --test tests/module-click-cycle.test.mjs`

Expected: PASS.

### Task 4: Full Automated Verification

**Files:**
- Read: `public/app.js`
- Read: `public/styles.css`

- [ ] **Step 1: Syntax check**

Run: `node --check public/app.js`

Expected: no output and exit code 0.

- [ ] **Step 2: Full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: TypeScript check**

Run: `npm run check`

Expected: no TypeScript errors.

- [ ] **Step 4: Whitespace check**

Run: `git diff --check`

Expected: no output and exit code 0.

### Task 5: Browser QA

**Files:**
- Read: browser output/screenshots only.

- [ ] **Step 1: Start local Worker**

Run local Wrangler on an unused port with proxies cleared and metrics disabled.

- [ ] **Step 2: Desktop QA**

Use Playwright or available browser tooling to verify:

- Click a non-interactive module area: default → expanded.
- Click the same module again: expanded → fullscreen.
- Click the same module again: fullscreen → default.
- Click a second module after expanding the first: first restores, second expands.
- Drag more than 10px or scroll page/card: state does not change.
- Click buttons, inputs, links, video/audio controls: state does not change.
- Escape restores an expanded/fullscreen module.

- [ ] **Step 3: Mobile QA**

Use a `390×844` viewport to verify:

- Vertical swiping over a card scrolls without expanding.
- A deliberate tap on title/text expands.
- Fullscreen uses viewport height and internal scroll.

### Task 6: Deploy, Handoff, Commit, Push

**Files:**
- Modify: `HANDOFF.md`
- Commit: `public/app.js`, `public/styles.css`, `tests/module-click-cycle.test.mjs`, `docs/superpowers/plans/2026-06-19-module-click-cycle.md`, `HANDOFF.md`

- [ ] **Step 1: Deploy**

Run: `npm run deploy` with proxies cleared and `WRANGLER_SEND_METRICS=false`.

Expected: deployment succeeds and prints a Cloudflare Version ID.

- [ ] **Step 2: Production health check**

Run: `curl.exe --ssl-no-revoke -x http://127.0.0.1:10808 -sS -D - https://neyc.de5.net/api/health`

Expected: HTTP 200 and healthy JSON.

- [ ] **Step 3: Update HANDOFF**

Record the module click cycle, checks, deployment date, and Version ID.

- [ ] **Step 4: Final verification**

Run: `npm test`, `npm run check`, `git diff --check`, and inspect `git status --short`.

- [ ] **Step 5: Commit**

Run:

```powershell
git add public/app.js public/styles.css tests/module-click-cycle.test.mjs docs/superpowers/plans/2026-06-19-module-click-cycle.md HANDOFF.md
git commit -m "Add module click cycle"
```

- [ ] **Step 6: Push**

Run:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
git push
```

Expected: push succeeds. Untracked `.playwright-cli/` and `output/` may remain local QA artifacts.

---

## Self-Review

- Spec coverage: scope, three-state cycle, one active module, gesture cancellation, controls ignored, keyboard accessibility, CSS overrides, browser QA, deployment, HANDOFF, commit, and push are covered.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type/name consistency: tests and implementation plan consistently use `attachPageModuleCardInteractions`, `cycleModuleCardState`, `activateModuleCard`, `clearActiveModuleCard`, `moduleClickMoveThreshold`, `moduleInteractionIgnoreSelector`, `is-module-expanded`, `is-module-fullscreen`, and `module-fullscreen-open`.
