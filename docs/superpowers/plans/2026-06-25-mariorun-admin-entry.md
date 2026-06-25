# Mariorun Admin Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `/llr-mariorun` asset editor entry to the game page and hide the game editor from unrelated admin work.

**Architecture:** The static game page exposes an admin-only entry shell. `launcher.js` checks the existing admin token in `localStorage` by calling `/api/admin/config`, then reveals a link to `/admin?game=llr-mariorun`. `public/app.js` renders the game editor only when that URL parameter is present.

**Tech Stack:** Static HTML, vanilla JavaScript, existing admin bearer token API, Node tests.

---

### Task 1: Game page admin-only entry

**Files:**
- Modify: `public/llr-mariorun/index.html`
- Modify: `public/llr-mariorun/launcher.js`
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Add a hidden `[data-admin-asset-editor]` link to the game page.
- [ ] In `launcher.js`, read `cloudflare-modular-site.admin-token`; if present, call `/api/admin/config` with `Authorization: Bearer <token>`.
- [ ] Reveal the link only on successful admin config response.
- [ ] Update tests to assert the public link is not always visible and admin-only reveal code exists.

### Task 2: Hide admin editor by default

**Files:**
- Modify: `public/app.js`
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Add a helper that returns true only for `/admin?game=llr-mariorun`.
- [ ] Render `renderAdminGameEditor()` only when the helper is true.
- [ ] Add a small admin notice/link back to `/llr-mariorun` when the game editor is hidden.
- [ ] Update tests to assert default admin render does not append the game editor unconditionally.

### Task 3: Verify, deploy, commit

**Files:**
- Modify: `HANDOFF.md`

- [ ] Run `node --check public/app.js` and `node --check public/llr-mariorun/launcher.js`.
- [ ] Run `npm test`, `npm run check`, and `git diff --check`.
- [ ] Deploy with `npm run deploy`.
- [ ] Update `HANDOFF.md` with the new Version ID.
- [ ] Commit and push.
