import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("public config and unlocked page data do not keep stale blog articles", () => {
  assert.match(workerSource, /"cache-control": "no-store"/);
  assert.match(appSource, /cache: "no-store"/);
  assert.match(appSource, /api\.getJson\(`\/api\/site-config\$\{query\}`,\s*false,\s*"no-cache"\)/);
  assert.match(workerSource, /conditionalJson\(request,\s*{\s*config:/);
  assert.match(workerSource, /headers\.set\("cache-control", "private, no-cache, must-revalidate"\)/);
  assert.match(workerSource, /headers\.set\("etag", etag\)/);
  assert.match(workerSource, /return new Response\(null, \{ status: 304, headers \}\)/);
  assert.match(appSource, /function clearUnlockedPageCache\(\)/);
  assert.match(appSource, /key\?\.startsWith\(pageAccessKeyPrefix\)/);
  assert.match(appSource, /sessionStorage\.removeItem\(key\)/);
  assert.match(appSource, /state\.savedConfig = cloneConfig\(config\);[\s\S]*?clearUnlockedPageCache\(\);/);
  assert.match(appSource, /api\.postJson\("\/api\/admin\/config", \{ config \}, true\);[\s\S]*?clearUnlockedPageCache\(\);[\s\S]*?setLoadedConfig\(payload\.config\)/);
});

test("public config is route-scoped and embedded media moves to immutable KV assets", () => {
  assert.match(appSource, /const query = route \? `\?route=\$\{encodeURIComponent\(route\)\}` : ""/);
  assert.match(workerSource, /function toScopedCurrentPage\(page: SitePage, requestedArticleId: string\)/);
  assert.match(workerSource, /body: "",\s*bodyHtml: ""/);
  assert.match(workerSource, /function toPublicPageSummary\(page: SitePage, referencedArticles: Set<string>\)/);
  assert.match(workerSource, /const siteMediaKvPrefix = "site-media\/"/);
  assert.match(workerSource, /materializeSiteConfigMedia\(config, env\)/);
  assert.match(workerSource, /"public, max-age=31536000, immutable"/);
  assert.match(workerSource, /url\.pathname\.startsWith\(siteMediaPathPrefix\)/);
});

test("the initial page renders a lightweight shell before dynamic config arrives", () => {
  assert.match(indexSource, /<script type="module" data-site-bootstrap>[\s\S]*?site-assets\/admin\/app-[A-Z0-9]+\.js[\s\S]*?site-assets\/public\/app-[A-Z0-9]+\.js[\s\S]*?<\/script>[\s\S]*?<body>/);
  assert.match(indexSource, /site-assets\/styles-[a-f0-9]+\.css/);
  assert.match(indexSource, /class="boot-shell"/);
  assert.match(appSource, /homeEntryLayout: localStorage\.getItem\(homeLayoutKey\) === "one" \? "one" : "two"/);
  assert.match(appSource, /async function loadModulesForPage\(page\)/);
});
