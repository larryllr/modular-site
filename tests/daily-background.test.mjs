import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const workerSource = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("page config preserves the daily background switch across old and new configs", () => {
  assert.match(workerSource, /type SitePage = \{[\s\S]*?dailyBackgroundEnabled: boolean;/);
  assert.match(workerSource, /dailyBackgroundEnabled: typeof record\.dailyBackgroundEnabled === "boolean" \? record\.dailyBackgroundEnabled : false/);
  assert.match(appSource, /dailyBackgroundEnabled: Boolean\(page\.dailyBackgroundEnabled\)/);
  assert.match(appSource, /dailyBackgroundEnabled: false/);
});

test("admin page settings expose a daily background checkbox without rebuilding the editor", () => {
  assert.match(appSource, /checkbox\("每日自动背景", page\.dailyBackgroundEnabled/);
  assert.match(appSource, /page\.dailyBackgroundEnabled = checked;[\s\S]*?markConfigDirty\(\)/);
});

test("worker proxies and caches a validated Bing daily image", () => {
  assert.match(workerSource, /"\/api\/daily-background": fetchDailyBackground/);
  assert.match(workerSource, /const bingOrigin = "https:\/\/www\.bing\.com"/);
  assert.match(workerSource, /HPImageArchive\.aspx\?format=js&idx=0&n=1&mkt=zh-CN/);
  assert.match(workerSource, /urlbase[\s\S]*?_UHD\.jpg/);
  assert.match(workerSource, /metadataImage\.url/);
  assert.match(workerSource, /url\.origin !== bingOrigin/);
  assert.match(workerSource, /content-type[\s\S]*?startsWith\("image\/"\)/);
  assert.match(workerSource, /caches\.default\.match\(request\)/);
  assert.match(workerSource, /caches\.default\.put\(request, response\.clone\(\)\)/);
});

test("daily backgrounds decode before the boot gate reveals the page", () => {
  assert.match(indexSource, /<html[^>]*class="app-booting"/);
  assert.match(stylesSource, /html\.app-booting[\s\S]*?background: #[0-9a-f]{6}/i);
  assert.match(stylesSource, /html\.app-booting #app[\s\S]*?visibility: hidden/);
  assert.match(appSource, /async function prepareDailyBackground\(page\)/);
  assert.match(appSource, /image\.decode\(\)/);
  assert.match(appSource, /5000/);
  assert.match(appSource, /preparedPageBackground: new Map\(\)/);
  assert.match(appSource, /document\.documentElement\.classList\.remove\("app-booting"\)/);
});

test("prepared daily images take precedence and manual images remain the fallback", () => {
  assert.match(appSource, /function resolvePageBackground\(page\)/);
  assert.match(appSource, /page\.dailyBackgroundEnabled[\s\S]*?state\.preparedPageBackground\.get\(page\.slug\)/);
  assert.match(appSource, /return prepared \|\| page\.backgroundImage \|\| ""/);
  assert.match(appSource, /applyPageBackground\(main, resolvePageBackground\(page\)\)/);
});
