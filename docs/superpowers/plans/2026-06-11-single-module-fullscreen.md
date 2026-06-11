# Single Module Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ordinary subpages with one rendered content module display that module across the full viewport without site chrome or card framing.

**Architecture:** Render page modules into a temporary list, count bottom comments as content, and apply a dedicated shell class only when the total is one. CSS tied to that class hides the sidebar and chrome while flattening the sole card.

**Tech Stack:** Vanilla JavaScript, CSS, Cloudflare Workers Static Assets.

---

### Task 1: Detect the Immersive Layout

**Files:**
- Modify: `public/app.js`

- [ ] Add a failing source regression check for `single-module-page`.
- [ ] Render valid section nodes before appending page chrome.
- [ ] Count module comments and bottom comments.
- [ ] Apply `app-shell single-module-page` only when total content equals one.
- [ ] Skip header and status strip in immersive mode.

### Task 2: Style the Fullscreen Module

**Files:**
- Modify: `public/styles.css`

- [ ] Add a failing source regression check for the immersive selectors.
- [ ] Hide `.public-sidebar` and collapse the shell to one column.
- [ ] Remove workspace and grid spacing.
- [ ] Give the sole module at least `100vh` and remove border, radius, and shadow.
- [ ] Keep responsive rules compatible.

### Task 3: Verify and Publish

**Files:**
- Modify: `HANDOFF.md`

- [ ] Run JavaScript, TypeScript, diff, and regression checks.
- [ ] Deploy to Cloudflare and record the Version ID.
- [ ] Verify a known single-module page through the deployed CSS/JS assets.
- [ ] Commit and push through the required `10808` proxy.
