# PCK Editor and Level Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-pass browser PCK editor and make Level Designer levels easier to delete, import, select, and enter.

**Architecture:** Keep PCK parsing/repacking client-side in the admin app so Workers only store generated `.pck` files through the existing upload endpoint. Keep public designer levels in D1 through the existing game levels store, and keep ordinary-user imported/designed levels in localStorage.

**Tech Stack:** Cloudflare Worker TypeScript, browser JavaScript admin UI, native ArrayBuffer/DataView APIs, existing D1/KV game asset endpoints.

---

### Task 1: PCK archive utilities

**Files:**
- Modify: `public/app.js`
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Add tests that require PCK utility names and UI strings in the admin bundle.
- [ ] Implement `parseGodotPck`, `buildGodotPck`, `guessPckEntryType`, and download helpers in `public/app.js`.

### Task 2: Admin PCK editor

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Add a PCK editor card below the asset pack editor.
- [ ] Let admins choose an existing pack, inspect files, preview common formats, replace/delete/add files, download rebuilt PCK, and upload it as a new asset pack.

### Task 3: Designer level deletion and import

**Files:**
- Modify: `src/index.ts`
- Modify: `public/llr-mariorun/index.html`
- Modify: `public/llr-mariorun/launcher.js`
- Modify: `public/llr-mariorun/game.css`
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Add `DELETE /api/admin/game/designer-levels?id=...` for public SM63 designer levels.
- [ ] Add game-page controls to import designer level JSON/base64, delete local levels, and delete selected public levels when admin is logged in.
- [ ] Make the UI copy explain that users enter the imported/designed level by starting the game and selecting `Level Designer`.
