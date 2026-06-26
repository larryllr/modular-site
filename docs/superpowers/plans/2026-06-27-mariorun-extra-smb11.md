# Mariorun Extra SMB 1-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the user-provided Godot SMB 1-1 remake as an Extra entry under `/llr-mariorun/`.

**Architecture:** Export the supplied Godot project as a standalone Web build under `public/llr-mariorun/extra/smb-1-1/`. Add a launcher card on the Mariorun page that opens the extra build without altering the SM63 Redux runtime or designer levels.

**Tech Stack:** Godot 4 Web export, Cloudflare Workers static assets, existing Mariorun HTML/CSS tests.

---

### Task 1: Guard the Extra entry

**Files:**
- Modify: `tests/llr-mariorun.test.mjs`
- Modify: `public/llr-mariorun/index.html`
- Modify: `public/llr-mariorun/game.css`

- [ ] Add a failing test asserting that `/llr-mariorun/` exposes an Extra card for `extra/smb-1-1/index.html`.
- [ ] Add the card with a short description and “打开 Extra 1-1” link.
- [ ] Style the card to fit the current prelaunch panel.

### Task 2: Export the Godot remake

**Files:**
- Create: `public/llr-mariorun/extra/smb-1-1/*`

- [ ] Add a Web export preset to the extracted Godot project.
- [ ] Export with Godot 4.4 if available, otherwise try Godot 4.3 compatibility export.
- [ ] Copy the generated `.html`, `.js`, `.wasm`, `.pck` and support files into `public/llr-mariorun/extra/smb-1-1/`.

### Task 3: Verify and ship

**Files:**
- Test: `tests/llr-mariorun.test.mjs`

- [ ] Run `npm test -- tests/llr-mariorun.test.mjs`.
- [ ] Run `npm run check`.
- [ ] Deploy with Wrangler.
- [ ] Smoke-check the live extra URL and main game page.
- [ ] Commit and push only this feature's files.
