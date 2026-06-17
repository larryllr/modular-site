import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("page backgrounds are softened behind readable content", () => {
  assert.match(
    appSource,
    /linear-gradient\(180deg, rgba\(251, 250, 246, 0\.9\), rgba\(251, 250, 246, 0\.82\)\)/
  );
  assert.match(stylesSource, /\.workspace\.has-page-background \.module-card[\s\S]*?backdrop-filter: blur\(10px\)/);
});

test("background page modules form an equal and compact grid", () => {
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid\s*{[\s\S]*?align-items: stretch/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid > \.module-card[\s\S]*?height: clamp\(220px, 24vw, 280px\)/);
  assert.match(stylesSource, /@media \(max-width: 520px\)[\s\S]*?\.workspace\.has-page-background \.page-module-grid > \.module-card\s*{[^}]*height: 220px/);
});
