# CubeCity Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CubeCity as a full-screen static game at `/llrgamecubecity/` and add a default, administrator-hideable `放松一下` site entry.

**Architecture:** Keep CubeCity as an independently built Vite application whose output is copied into `public/llrgamecubecity`. Add one stable built-in link record during server normalization and client hydration when legacy KV data lacks it. Handle the slashless game URL in the Worker before static asset dispatch.

**Tech Stack:** Cloudflare Workers, Workers Static Assets, TypeScript, vanilla JavaScript, Vite, Vue 3, Three.js, PowerShell verification scripts.

---

### Task 1: Add Reproducible CubeCity Source and Build

**Files:**
- Create: `vendor/cubecity/` from upstream revision `0191f5170872382954c15b7316f2e34d020d6d49`
- Create: `vendor/cubecity/UPSTREAM.md`
- Modify: `vendor/cubecity/vite.config.js`
- Modify: `package.json`
- Modify: `.gitignore`
- Generate: `public/llrgamecubecity/`

- [ ] **Step 1: Write a failing build-output check**

Run:

```powershell
if (-not (Test-Path public/llrgamecubecity/index.html)) { throw "CubeCity build is missing" }
$html = Get-Content -Raw public/llrgamecubecity/index.html
if ($html -notmatch '/llrgamecubecity/assets/') { throw "CubeCity assets do not use the required base path" }
```

Expected: FAIL because the game has not been built into the site.

- [ ] **Step 2: Vendor the pinned upstream snapshot**

Clone `https://github.com/hexianWeb/CubeCity`, checkout
`0191f5170872382954c15b7316f2e34d020d6d49`, remove its `.git` directory, and
retain its `LICENSE`.

Create `vendor/cubecity/UPSTREAM.md` with:

```markdown
# CubeCity Upstream

- Source: https://github.com/hexianWeb/CubeCity
- Revision: 0191f5170872382954c15b7316f2e34d020d6d49
- License: MIT, retained in `LICENSE`
- Local change: Vite builds with `/llrgamecubecity/` as its base path.
```

- [ ] **Step 3: Configure the game subpath build**

Add `base: '/llrgamecubecity/'` to the exported Vite configuration in
`vendor/cubecity/vite.config.js`.

Add root scripts:

```json
"build:cubecity": "npm --prefix vendor/cubecity run build -- --outDir ../../public/llrgamecubecity --emptyOutDir",
"deploy": "npm run build:cubecity && node ./node_modules/wrangler/bin/wrangler.js deploy"
```

Ignore `vendor/cubecity/node_modules/` while committing the generated static
game output.

- [ ] **Step 4: Install and build**

Run:

```powershell
npm install --prefix vendor/cubecity
npm run build:cubecity
```

Expected: Vite succeeds and writes `public/llrgamecubecity/index.html` plus
hashed assets.

- [ ] **Step 5: Run the build-output check**

Run the Step 1 PowerShell check again.

Expected: PASS.

### Task 2: Add the Built-in `放松一下` Entry

**Files:**
- Modify: `src/index.ts`
- Modify: `public/app.js`
- Create: `public/llrgamecubecity-entry.webp`

- [ ] **Step 1: Write a failing source-level regression check**

Run:

```powershell
$worker = Get-Content -Raw src/index.ts
$client = Get-Content -Raw public/app.js
if ($worker -notmatch 'llrgamecubecity') { throw "Worker default link is missing" }
if ($client -notmatch 'llrgamecubecity') { throw "Client default link is missing" }
```

Expected: FAIL because neither configuration layer knows the game entry.

- [ ] **Step 2: Add a stable default link helper in the Worker**

Define a fixed link ID such as `builtin-cubecity` and a helper returning:

```ts
{
  id: "builtin-cubecity",
  title: "放松一下",
  description: "进入立方城，放松一下",
  targetUrl: "/llrgamecubecity",
  visible: true,
  iconText: "GAME",
  iconImage: "/llrgamecubecity-entry.webp",
  backgroundImage: "/llrgamecubecity-entry.webp"
}
```

Seed it in `defaultSiteConfig.links` and `defaultSiteConfig.navOrder`.
During `normalizeSiteConfig`, append it only when no link has the fixed ID and
no normalized target URL points to `/llrgamecubecity`. Preserve all existing
values when it already exists.

- [ ] **Step 3: Mirror compatibility hydration in the client**

Add the same fallback link data to `public/app.js`. In `hydrateConfig`, append
the built-in link only when neither its fixed ID nor target URL is present, then
pass the completed links list to `hydrateNavOrder`.

- [ ] **Step 4: Add the default image**

Capture or derive a local CubeCity gameplay image, crop it to a reusable
landscape WebP, and save it as `public/llrgamecubecity-entry.webp`. Confirm it
is suitable both as a card background and a square-cropped sidebar icon.

- [ ] **Step 5: Run the regression check**

Run the Step 1 check again and verify the built-in record contains `放松一下`,
`visible: true`, and both image fields.

Expected: PASS.

### Task 3: Route the Full-screen Game

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Write a failing routing check**

Run:

```powershell
$worker = Get-Content -Raw src/index.ts
if ($worker -notmatch 'url\.pathname === "/llrgamecubecity"') {
  throw "Slashless CubeCity redirect is missing"
}
```

Expected: FAIL.

- [ ] **Step 2: Add the canonical redirect**

Before access logging and `env.ASSETS.fetch`, return a `308` redirect from
`/llrgamecubecity` to `/llrgamecubecity/`, preserving the request origin.
Allow `/llrgamecubecity/` and its generated assets to flow directly through
Workers Static Assets.

- [ ] **Step 3: Run the routing check**

Run the Step 1 check again.

Expected: PASS.

### Task 4: Verify, Deploy, and Publish

**Files:**
- Modify: `README.md`
- Modify: `HANDOFF.md`

- [ ] **Step 1: Document the integration**

Add the game URL, upstream attribution, build command, and built-in entry
behavior to `README.md`. Update `HANDOFF.md` with the new feature and deployment
details without adding secrets.

- [ ] **Step 2: Run all local checks**

Run:

```powershell
npm run build:cubecity
node --check public/app.js
npm run check
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 3: Deploy to Cloudflare**

Run:

```powershell
npm run deploy
```

Expected: deployment succeeds and prints a new Cloudflare Version ID.

- [ ] **Step 4: Browser regression**

At desktop and mobile viewports verify:

- `/llrgamecubecity` redirects to `/llrgamecubecity/`.
- The game canvas and interface load without the modular-site sidebar.
- Game assets return successfully and the console has no fatal errors.
- `/` shows `放松一下` with the default image.
- `/admin` can hide the entry, save, and restore it.

- [ ] **Step 5: Commit and push through the required proxy**

Run:

```powershell
git add package.json package-lock.json .gitignore src/index.ts public/app.js public/llrgamecubecity public/llrgamecubecity-entry.webp vendor/cubecity README.md HANDOFF.md docs/superpowers/plans/2026-06-06-cubecity-integration.md
git commit -m "Integrate CubeCity game"
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
git push
git status --short
```

Expected: push succeeds and the final status is clean.
