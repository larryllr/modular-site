# Clear Teal Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the confirmed clear ocean background design while preserving the existing module grid and interactions.

**Architecture:** `applyPageBackground()` exposes the configured image through a CSS custom property. Background-image pages render the image and a directional teal overlay through workspace pseudo-elements, while cards and content remain in a separate stacking context.

**Tech Stack:** Vanilla JavaScript, CSS custom properties and pseudo-elements, Node.js test runner, Cloudflare Workers.

---

### Task 1: Visual Contract

**Files:**
- Modify: `tests/background-page-layout.test.mjs`
- Read: `public/app.js`
- Read: `public/styles.css`

- [ ] Change the focused test to require a clear, unblurred background filter, directional teal overlay, white background-page header text, and 90% translucent cards.
- [ ] Run `node --test tests/background-page-layout.test.mjs` and verify it fails against the warm editorial implementation.

### Task 2: Confirmed Background Treatment

**Files:**
- Modify: `public/app.js:5981-5992`
- Modify: `public/styles.css:295-345`
- Test: `tests/background-page-layout.test.mjs`

- [ ] Keep `--page-background-image` as the image transport and remove the old inline gradient.
- [ ] Render the image without blur using a light cyan screen blend plus `saturate(0.85) brightness(1.15) contrast(0.9)` so dark water becomes the target's clear blue-green tone.
- [ ] Add a diagonal teal overlay that is strongest behind the title and fades toward the water highlights.
- [ ] Set header copy to white, cards to `rgba(255, 255, 255, 0.9)`, and use fine white borders with a restrained cool shadow.
- [ ] Run the focused test and verify both tests pass.

### Task 3: Visual QA And Release

**Files:**
- Modify: `HANDOFF.md`
- Create: `design-qa.md`

- [ ] Run `node --check public/app.js`, `npm run check`, `npm test`, and `git diff --check`.
- [ ] Capture `/guide` at the reference desktop viewport and `390x844`, then compare the desktop implementation side by side with the confirmed visual target.
- [ ] Record a passing visual review in `design-qa.md` only when no P0/P1/P2 mismatch remains.
- [ ] Run `npm run deploy`, record the Cloudflare Version ID in `HANDOFF.md`, commit, and push `main` using the local `10808` HTTP proxy.
