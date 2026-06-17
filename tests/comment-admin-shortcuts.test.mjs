import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

test("public comments use admin session to expose inline management actions", () => {
  assert.match(appSource, /function canManageComments\(adminMode\)/);
  assert.match(appSource, /const canManage = canManageComments\(adminMode\);/);
  assert.match(appSource, /loadComments\(page\.slug, list, canManage\);/);
});

test("refreshing comment lists preserves each list management capability", () => {
  assert.match(appSource, /list\.dataset\.canManageComments === "1"/);
});
