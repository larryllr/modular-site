import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("page backgrounds are softened behind readable content", () => {
  assert.match(appSource, /setProperty\("--page-background-image", `url\("\$\{cssUrl\(image\)\}"\)`\)/);
  assert.match(stylesSource, /\.workspace\.has-page-background::before\s*{[^}]*background-color: rgba\(70, 157, 174, 0\.32\)[^}]*background-blend-mode: screen[^}]*filter: saturate\(0\.85\) brightness\(1\.15\) contrast\(0\.9\)/);
  assert.match(stylesSource, /\.workspace\.has-page-background::after\s*{[^}]*linear-gradient\(135deg, rgba\(3, 61, 70, 0\.38\) 0%, rgba\(3, 61, 70, 0\.12\) 38%, rgba\(3, 61, 70, 0\.02\) 72%, rgba\(3, 61, 70, 0\) 100%\)/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.workspace-header[\s\S]*?color: #ffffff/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.module-card\s*{[^}]*background: rgba\(255, 255, 255, 0\.9\)[^}]*box-shadow: 0 10px 28px rgba\(1, 36, 42, 0\.14\)/);
});

test("background page modules form an equal and compact grid", () => {
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid\s*{[\s\S]*?align-items: stretch/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid > \.module-card[\s\S]*?height: clamp\(220px, 24vw, 280px\)/);
  assert.match(stylesSource, /@media \(max-width: 520px\)[\s\S]*?\.workspace\.has-page-background \.page-module-grid > \.module-card\s*{[^}]*height: 220px/);
});


test("daily backgrounds do not block first render", () => {
  assert.match(appSource, /prepareDailyBackground\(page\)\.then/);
  assert.doesNotMatch(appSource, /await prepareDailyBackground\(page\)/);
  assert.match(appSource, /Daily background timed out[\s\S]*?1200/);
});
