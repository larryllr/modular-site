import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

test("public config and unlocked page data do not keep stale blog articles", () => {
  assert.match(workerSource, /"cache-control": "no-store"/);
  assert.match(appSource, /cache: "no-store"/);
  assert.match(appSource, /function clearUnlockedPageCache\(\)/);
  assert.match(appSource, /key\?\.startsWith\(pageAccessKeyPrefix\)/);
  assert.match(appSource, /sessionStorage\.removeItem\(key\)/);
  assert.match(appSource, /state\.savedConfig = cloneConfig\(config\);[\s\S]*?clearUnlockedPageCache\(\);/);
  assert.match(appSource, /api\.postJson\("\/api\/admin\/config", \{ config \}, true\);[\s\S]*?clearUnlockedPageCache\(\);[\s\S]*?setLoadedConfig\(payload\.config\)/);
});
