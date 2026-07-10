import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

function readBundle(group) {
  const directory = new URL(`public/site-assets/${group}/`, root);
  const names = readdirSync(directory).filter((name) => name.endsWith(".js"));
  return {
    names,
    source: names.map((name) => source(`public/site-assets/${group}/${name}`)).join("\n"),
    bytes: names.reduce((total, name) => total + statSync(new URL(name, directory)).size, 0)
  };
}

test("public and admin pages load separate hashed bundles", () => {
  const index = source("public/index.html");
  const headers = source("public/_headers");
  const worker = source("src/index.ts");
  const wrangler = source("wrangler.jsonc");
  const publicEntry = source("client/public-entry.js");
  const adminEntry = source("client/admin-entry.js");
  const publicBundle = readBundle("public");
  const adminBundle = readBundle("admin");

  assert.match(index, /site-assets\/public\/app-[A-Z0-9]+\.js/);
  assert.match(index, /site-assets\/admin\/app-[A-Z0-9]+\.js/);
  assert.match(index, /site-assets\/styles-[a-f0-9]+\.css/);
  assert.match(headers, /\/site-assets\/\*[\s\S]*?max-age=31536000, immutable/);
  assert.match(worker, /pathname\.startsWith\("\/site-assets\/"\)/);
  assert.match(wrangler, /"\/site-assets\/\*"/);
  assert.match(publicEntry, /startPublicApp/);
  assert.match(adminEntry, /startAdminApp/);
  assert.ok(publicBundle.names.some((name) => /^app-[A-Z0-9]+\.js$/.test(name)));
  assert.ok(adminBundle.names.some((name) => /^app-[A-Z0-9]+\.js$/.test(name)));
  assert.ok(publicBundle.bytes < adminBundle.bytes);
});

test("public bundle excludes game and site administration code", () => {
  const publicBundle = readBundle("public").source;
  const adminBundle = readBundle("admin").source;

  assert.doesNotMatch(publicBundle, /\/api\/admin\/game/);
  assert.doesNotMatch(publicBundle, /\/api\/admin\/logs/);
  assert.match(adminBundle, /\/api\/admin\/game/);
  assert.match(adminBundle, /\/api\/admin\/logs/);
});
