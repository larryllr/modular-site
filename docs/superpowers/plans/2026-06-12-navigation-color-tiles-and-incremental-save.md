# Navigation Color Tiles And Incremental Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-width colorful decorative tiles to navigation modules and reduce administrator save traffic by sending versioned configuration patches.

**Architecture:** The navigation renderer assigns one of several stable CSS gradient classes from the section ID. The administrator client keeps a baseline config, produces a restricted JSON Patch against the edited config, and posts it to a new authenticated Worker endpoint. The Worker validates the version and operations, applies the patch, then reuses existing normalization and limited-admin merging before writing the complete KV value.

**Tech Stack:** Vanilla JavaScript, CSS, TypeScript Cloudflare Worker, Cloudflare KV.

---

### Task 1: Add Navigation Color Tiles

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [x] Add a failing source assertion requiring an empty `.navigation-color-tile` element and stable `navigationColorIndex(section.id)` class selection.
- [x] Run the assertion and confirm it fails because the element and helper do not exist.
- [x] Render the empty decorative element before the navigation title.
- [x] Add four full-width gradient variants, colored shadows, and a smaller mobile height.
- [x] Run the assertion, `node --check public/app.js`, and `git diff --check`.

### Task 2: Build And Test Restricted JSON Patch Generation

**Files:**
- Modify: `public/app.js`

- [x] Add a failing Node source test covering scalar replacement, nested field replacement, keyed-array add/remove/move, and unchanged configs.
- [x] Run the test and confirm it fails because `createConfigPatch()` is missing.
- [x] Implement `createConfigPatch(base, next)` with JSON Pointer escaping and ID-aware object-array comparison.
- [x] Add `state.savedConfig` and refresh it after login, admin config load, and successful saves.
- [x] Run the patch test and JavaScript syntax check.

### Task 3: Apply Versioned Patches In The Worker

**Files:**
- Modify: `src/index.ts`

- [x] Add a failing source test requiring `/api/admin/config-patch`, `applyConfigPatch()`, operation limits, and a `409` version-conflict response.
- [x] Run the test and confirm the endpoint is absent.
- [x] Implement safe JSON Pointer parsing and restricted `add`, `remove`, `replace`, and `move` operations.
- [x] Reject prototype keys, excessive operations, excessive path depth, invalid array indexes, malformed operations, and request bodies over `100 MB`.
- [x] Read current config, compare `baseUpdatedAt`, apply the patch, normalize, merge limited permissions, and write the complete KV value.
- [x] Return only `ok`, `role`, and `updatedAt`.
- [x] Run `npm run check` and the source test.

### Task 4: Route All Configuration Saves Through The Patch Helper

**Files:**
- Modify: `public/app.js`

- [x] Add `persistConfig(nextConfig)` to generate and send patches.
- [x] Treat an empty patch as a successful no-op.
- [x] Show a specific reload message for `409` conflicts.
- [x] Fall back to `/api/admin/config` only for `404` or `405` responses.
- [x] Replace administrator save, public article edit, publish, delete, and reorder calls with `persistConfig()`.
- [x] Update local `state.config.updatedAt` and `state.savedConfig` from the compact response without downloading the complete config.
- [x] Run patch tests, `node --check public/app.js`, and `npm run check`.

### Task 5: Verify, Deploy, And Publish

**Files:**
- Modify: `HANDOFF.md`

- [x] Run `node --check public/app.js`.
- [x] Run `npm run check`.
- [x] Run `git diff --check`.
- [x] Run focused patch source tests.
- [x] Deploy with Wrangler metrics disabled and record the Cloudflare Version ID.
- [x] Update `HANDOFF.md` with the incremental save behavior and Version ID.
- [ ] Commit with a concise English message.
- [ ] Push `main` with `HTTP_PROXY` and `HTTPS_PROXY` set to `http://127.0.0.1:10808`.
- [ ] Run `git status --short` and confirm the worktree is clean.
