import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicEntry = readFileSync(new URL("../client/public-entry.js", import.meta.url), "utf8");
const publicMotion = readFileSync(new URL("../client/public-motion.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

test("public app prepares GSAP motion before revealing the rendered page", () => {
  assert.match(publicEntry, /import\("\.\/public-motion\.js"\)/);
  assert.match(publicEntry, /beforeReveal:\s*async \(\) => \(await publicMotionReady\)\?\.prepare\(\)/);
  assert.match(publicEntry, /prefers-reduced-motion: reduce/);
  assert.match(appSource, /typeof options\.beforeReveal === "function"/);
  assert.match(appSource, /await options\.beforeReveal\(\)[\s\S]*?classList\.remove\("app-booting"\)/);
});

test("GSAP motion is scoped, responsive, accessible, and cleaned up", () => {
  assert.match(publicMotion, /import \{ gsap \} from "gsap"/);
  assert.match(publicMotion, /gsap\.matchMedia\(\)/);
  assert.match(publicMotion, /prefers-reduced-motion: reduce/);
  assert.match(publicMotion, /root\.classList\.contains\("single-module-page"\)/);
  assert.match(publicMotion, /clearProps: "transform,opacity,visibility,willChange"/);
  assert.match(publicMotion, /media\.revert\(\)/);
  assert.doesNotMatch(publicMotion, /ScrollTrigger|[,{]\s*(?:width|height|top|left)\s*:/);
});

test("entry cards retain readable fallback styling before lazy backgrounds load", () => {
  assert.match(stylesSource, /\.entry-card\.has-entry-background\s*{[^}]*background-color: #17332e;[^}]*background-image: linear-gradient/);
  assert.match(stylesSource, /\.entry-card \.button::after\s*{/);
});
