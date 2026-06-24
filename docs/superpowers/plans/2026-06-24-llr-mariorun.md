# LLR Mario Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/llr-mariorun`, a Mario-like teacher adventure with selectable/editable asset packs, editable long levels, R2-backed uploads, desktop/mobile controls, Cloudflare deploy, and GitHub push.

**Architecture:** Add a focused Worker game API for manifest, admin metadata, asset upload/read/delete, and level saves. Add a self-contained static Canvas game under `public/llr-mariorun/`, and extend the existing admin SPA with a compact game editor that edits metadata through the API.

**Tech Stack:** Cloudflare Workers, KV, R2, vanilla JavaScript, Canvas 2D, CSS responsive/rotation layout, Node test runner, Wrangler.

---

## Files

- Modify `wrangler.jsonc`: add `GAME_ASSETS` R2 binding and run Worker first for `/llr-mariorun`.
- Modify `src/index.ts`: add game types, default asset packs/levels, API routes, R2 asset serving, hydration of `/llr-mariorun` entry.
- Modify `public/app.js`: add fallback config entry and admin game editor.
- Modify `public/styles.css`: add admin game editor styles.
- Create `public/llr-mariorun/index.html`, `public/llr-mariorun/game.css`, `public/llr-mariorun/game.js`.
- Create `tests/llr-mariorun.test.mjs`: source-level tests for config/API/frontend contracts.
- Modify `HANDOFF.md`: record game, R2 bucket, deployment version, and operating notes.

### Task 1: RED tests

- [ ] Add `tests/llr-mariorun.test.mjs` with assertions that:
  - `wrangler.jsonc` contains `GAME_ASSETS` bound to `llr-mariorun-assets`.
  - `src/index.ts` contains `GAME_ASSETS?: R2Bucket`, `gameAssetPacksKey`, `gameLevelsKey`, `defaultGameAssetPacks`, `defaultGameLevels`, `fetchGameManifest`, `handleAdminGame`, `handleGameAssetUpload`, and `/api/game/assets/`.
  - There are exactly ten default level IDs and no default level contains a trap object type.
  - `public/llr-mariorun/index.html`, `game.css`, and `game.js` exist.
  - `game.js` contains material UI strings/functions for asset pack selection, level selection, desktop key hints, virtual controls, portrait-compat rotation, checkpoints, and start flow.
  - `public/app.js` contains the default `/llr-mariorun` entry and admin game editor functions.
- [ ] Run `node --test tests/llr-mariorun.test.mjs`; expected failure because implementation is absent.

### Task 2: Worker config and API

- [ ] Add R2 binding in `wrangler.jsonc`.
- [ ] Add `GAME_ASSETS?: R2Bucket` to `AppEnv`.
- [ ] Add default game entry with id `builtin-llr-mariorun`, path `/llr-mariorun`, title `老师大冒险`.
- [ ] Add default asset slot definitions and one built-in asset pack with generated SVG placeholders.
- [ ] Add ten default long level records with `segments`, `checkpoints`, and fair object types only.
- [ ] Add public routes:
  - `GET /api/game/manifest`
  - `GET /api/game/assets/:key`
- [ ] Add full-admin routes:
  - `GET /api/admin/game`
  - `PUT /api/admin/game/asset-packs`
  - `POST /api/admin/game/assets`
  - `DELETE /api/admin/game/assets/:key`
  - `PUT /api/admin/game/levels`
- [ ] Run focused test and fix until Worker contract passes.

### Task 3: Static game page

- [ ] Create `public/llr-mariorun/index.html` with a root app, title, and script/css links.
- [ ] Create `game.css` with menu, canvas shell, portrait-compat rotation, and virtual controls.
- [ ] Create `game.js` with:
  - Manifest loading.
  - Asset pack and level selection.
  - Desktop key hint display.
  - Canvas 2D platform runtime.
  - Keyboard action map.
  - Touch virtual controls with multi-touch.
  - Portrait compatibility mode using rotated stage.
  - Checkpoint respawn.
  - Pause/restart/back to menu.
- [ ] Run focused test and `node --check public/llr-mariorun/game.js`.

### Task 4: Admin editor

- [ ] Add fallback link entry in `public/app.js`.
- [ ] Add a game editor card in the full-admin home/settings area.
- [ ] Implement loading `/api/admin/game`.
- [ ] Implement asset pack list/edit/save.
- [ ] Implement level list/edit/save with compact JSON import/export textarea.
- [ ] Implement single-slot file upload using `/api/admin/game/assets`.
- [ ] Add minimal CSS for editor grid, slots, and level rows.
- [ ] Run focused tests.

### Task 5: Verification and deploy

- [ ] Run `node --check public/app.js`.
- [ ] Run `node --check public/llr-mariorun/game.js`.
- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run `git diff --check`.
- [ ] Create or confirm R2 bucket: `llr-mariorun-assets`.
- [ ] Deploy with `WRANGLER_SEND_METRICS=false`.
- [ ] Smoke test `https://neyc.de5.net/api/health`, `/api/game/manifest`, and `/llr-mariorun`.
- [ ] Browser QA desktop and 390×844 mobile.
- [ ] Update `HANDOFF.md` with Version ID and R2 notes.
- [ ] Commit implementation and push through `http://127.0.0.1:10808`.

## Self-review

- Coverage: the plan covers the URL, R2, KV metadata, admin online editing, asset packs, level selection/editing, ten default long levels, optional traps, desktop controls, mobile forced landscape, tests, deploy, handoff, commit, and push.
- Placeholders: no placeholder steps remain; each step names files and behaviors.
- Scope risk: this is a large first version, so the runtime/editor are intentionally MVP-level but complete enough to deploy and iterate.
