import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("renderPage binds click cycle only to non-immersive public module grids", () => {
  assert.match(appSource, /attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /if \(!immersive\)\s*{\s*attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /function attachPageModuleCardInteractions\(grid\)/);
  assert.match(appSource, /Array\.from\(grid\.children\)\.filter\(\(child\) => child\.classList\.contains\("module-card"\)\)/);
  assert.doesNotMatch(appSource, /renderPublicSite\(\)[\s\S]{0,300}moduleViewState/);
});

test("module click cycle uses DOM state classes for default expanded fullscreen default", () => {
  assert.match(appSource, /const moduleClickMoveThreshold = 10/);
  assert.match(appSource, /function cycleModuleCardState\(card, grid\)/);
  assert.match(appSource, /card\.dataset\.moduleViewState === "expanded"/);
  assert.match(appSource, /card\.dataset\.moduleViewState === "fullscreen"/);
  assert.match(appSource, /activateModuleCard\(card, grid, "expanded"\)/);
  assert.match(appSource, /activateModuleCard\(card, grid, "fullscreen"\)/);
  assert.match(appSource, /clearActiveModuleCard\(grid\)/);
  assert.match(appSource, /classList\.add\("is-module-expanded"\)/);
  assert.match(appSource, /classList\.add\("is-module-fullscreen"\)/);
  assert.match(appSource, /document\.documentElement\.classList\.add\("module-fullscreen-open"\)/);
});

test("module pointer handling cancels on controls movement scroll and lost pointer", () => {
  assert.match(appSource, /const moduleInteractionIgnoreSelector = "a, button, input, textarea, select, option, video, audio, details, summary, \[contenteditable\], \[role=\\"button\\"\], \[role=\\"link\\"\]"/);
  assert.match(appSource, /function isModuleInteractionTarget\(target\)/);
  assert.match(appSource, /target\.closest\(moduleInteractionIgnoreSelector\)/);
  assert.match(appSource, /event\.button !== 0/);
  assert.match(appSource, /event\.isPrimary === false/);
  assert.match(appSource, /Math\.hypot\(event\.clientX - gesture\.startX, event\.clientY - gesture\.startY\) > moduleClickMoveThreshold/);
  assert.match(appSource, /window\.scrollY !== gesture\.pageScrollY/);
  assert.match(appSource, /card\.scrollTop !== gesture\.cardScrollTop/);
  assert.match(appSource, /card\.addEventListener\("pointercancel", cancelGesture\)/);
  assert.match(appSource, /card\.addEventListener\("lostpointercapture", cancelGesture\)/);
});

test("module keyboard handling cycles with enter space and restores with escape", () => {
  assert.match(appSource, /card\.tabIndex = 0/);
  assert.match(appSource, /card\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(appSource, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(appSource, /event\.key === "Escape"/);
  assert.match(appSource, /card\.setAttribute\("aria-modal", "true"\)/);
  assert.match(appSource, /card\.removeAttribute\("aria-modal"\)/);
});

test("module click cycle styles override compact background cards and lock fullscreen scroll", () => {
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-clickable\s*{[^}]*cursor: pointer/);
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*grid-column: 1 \/ -1 !important[^}]*height: auto !important[^}]*min-height: clamp\(360px, 58vh, 720px\) !important/);
  assert.match(stylesSource, /\.workspace\.has-page-background \.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*height: auto !important[^}]*overflow: visible/);
  assert.match(stylesSource, /\.page-module-grid > \.module-card\.is-module-fullscreen\s*{[^}]*position: fixed[^}]*inset: 0[^}]*height: 100dvh !important[^}]*overflow: auto/);
  assert.match(stylesSource, /html\.module-fullscreen-open,\s*html\.module-fullscreen-open body\s*{[^}]*overflow: hidden/);
  assert.match(stylesSource, /@media \(max-width: 520px\)[\s\S]*?\.workspace\.has-page-background \.page-module-grid > \.module-card\.is-module-expanded\s*{[^}]*min-height: min\(72vh, 620px\) !important/);
});
