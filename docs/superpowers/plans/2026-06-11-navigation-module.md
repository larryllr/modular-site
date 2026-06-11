# Navigation Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable navigation modules containing ordered website names and URLs, with automatic favicons and responsive single/multiple-module layouts.

**Architecture:** Introduce a `navigation` section in Worker normalization and client hydration. Reuse the existing page section lifecycle and immersive single-module shell, while giving navigation sections their own editor, renderer, favicon fallback, and CSS.

**Tech Stack:** TypeScript Cloudflare Worker, vanilla JavaScript, CSS, Workers Static Assets.

---

### Task 1: Normalize Navigation Sections

**Files:**
- Modify: `src/index.ts`
- Modify: `public/app.js`

- [ ] Add failing source checks for the `navigation` section and 100-item cap.
- [ ] Add Worker types and sanitization for title, item IDs, names, and URLs.
- [ ] Add client hydration and creation helpers.
- [ ] Verify JavaScript syntax and TypeScript compilation.

### Task 2: Build the Administrator Editor

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] Add a `导航模块` insertion button and editor dispatch.
- [ ] Add title editing and ordered item rows.
- [ ] Update names and URLs in memory without calling `renderAdminEditor()` while typing.
- [ ] Add structural add, delete, up, and down controls with undo snapshots.
- [ ] Add compact editor styling.

### Task 3: Render Public Navigation

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] Render icon and name inside `_blank` anchors with `noopener noreferrer`.
- [ ] Load origin `/favicon.ico` and replace failed images with initial badges.
- [ ] Render numbered vertical card lists in multi-module pages.
- [ ] Render responsive multi-column directory content in the existing immersive shell.
- [ ] Add mobile single-column and touch-target rules.

### Task 4: Verify and Publish

**Files:**
- Modify: `HANDOFF.md`

- [ ] Run source regression checks, `node --check`, TypeScript, and diff checks.
- [ ] Deploy with Wrangler metrics disabled and Cloudflare proxy variables cleared.
- [ ] Verify deployed JS/CSS contain the navigation module.
- [ ] Record the Version ID, commit, and push GitHub through `10808`.
