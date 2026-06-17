# Background Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make background-image pages clearer and more compact while keeping multi-module cards aligned to equal widths and heights.

**Architecture:** Reuse the existing `has-page-background` marker created by `applyPageBackground()`. Scope all visual changes to that marker, use grid stretching for row alignment, and constrain navigation cards to a consistent compact height with an internally scrolling list.

**Tech Stack:** Vanilla JavaScript, CSS Grid, Node.js test runner, Cloudflare Workers.

---

### Task 1: Layout Regression Contract

**Files:**
- Create: `tests/background-page-layout.test.mjs`
- Read: `public/app.js`
- Read: `public/styles.css`

- [ ] **Step 1: Write the failing test**

Add assertions for a lighter page overlay, background-scoped translucent cards, grid stretching, compact navigation height, and the mobile natural-height override.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/background-page-layout.test.mjs`
Expected: FAIL because the new CSS contract is not present.

### Task 2: Background Page Styling

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/background-page-layout.test.mjs`

- [ ] **Step 1: Implement the minimal layout rules**

Reduce the background prominence in `applyPageBackground()`. Add background-scoped CSS for translucent status/module cards, equal compact card sizing, and a mobile single-column equal-height override.

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/background-page-layout.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run the full verification suite**

Run: `node --check public/app.js`, `npm run check`, and `git diff --check`.
Expected: all commands exit successfully.

### Task 3: Browser Verification And Release

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: Verify the rendered page**

Inspect a background page at desktop and mobile widths. Confirm equal card sizing, readable text, visible background, and no excessive blank navigation space.

- [ ] **Step 2: Deploy and record the version**

Run: `npm run deploy`
Expected: successful Cloudflare deployment with a new Version ID, then update `HANDOFF.md`.

- [ ] **Step 3: Commit and push**

Commit only the changed files with a concise English message. Push `main` using `HTTP_PROXY` and `HTTPS_PROXY` set to `http://127.0.0.1:10808`, then confirm `git status --short` is empty.
