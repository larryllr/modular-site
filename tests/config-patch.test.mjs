import assert from "node:assert/strict";
import test from "node:test";
import { createConfigPatch } from "../public/config-patch.js";

test("returns no operations for equal configs", () => {
  const config = { updatedAt: "v1", homeTitle: "首页", pages: [] };
  assert.deepEqual(createConfigPatch(config, structuredClone(config)), []);
});

test("replaces scalar and nested fields without replacing their parents", () => {
  const base = {
    updatedAt: "v1",
    homeTitle: "旧标题",
    announcement: { enabled: false, title: "公告" }
  };
  const next = {
    ...base,
    homeTitle: "新标题",
    announcement: { ...base.announcement, enabled: true }
  };

  assert.deepEqual(createConfigPatch(base, next), [
    { op: "replace", path: "/homeTitle", value: "新标题" },
    { op: "replace", path: "/announcement/enabled", value: true }
  ]);
});

test("adds and removes keyed array items", () => {
  const base = { pages: [{ id: "a", title: "A" }, { id: "b", title: "B" }] };
  const next = { pages: [{ id: "b", title: "B" }, { id: "c", title: "C" }] };

  assert.deepEqual(createConfigPatch(base, next), [
    { op: "remove", path: "/pages/0" },
    { op: "add", path: "/pages/1", value: { id: "c", title: "C" } }
  ]);
});

test("moves keyed array items and patches the moved object", () => {
  const base = {
    pages: [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" }
    ]
  };
  const next = {
    pages: [
      { id: "c", title: "C updated" },
      { id: "a", title: "A" },
      { id: "b", title: "B" }
    ]
  };

  assert.deepEqual(createConfigPatch(base, next), [
    { op: "move", from: "/pages/2", path: "/pages/0" },
    { op: "replace", path: "/pages/0/title", value: "C updated" }
  ]);
});

test("replaces small scalar arrays as one value", () => {
  const base = { navOrder: ["page:a", "page:b"] };
  const next = { navOrder: ["page:b", "page:a"] };

  assert.deepEqual(createConfigPatch(base, next), [
    { op: "replace", path: "/navOrder", value: ["page:b", "page:a"] }
  ]);
});

test("does not include unchanged large article bodies when editing a nested title", () => {
  const bodyHtml = `<p>${"large body ".repeat(10000)}</p>`;
  const base = {
    pages: [{
      id: "blog",
      sections: [{
        id: "blog-section",
        type: "blog",
        articles: [{ id: "article", title: "Old", bodyHtml }]
      }]
    }]
  };
  const next = structuredClone(base);
  next.pages[0].sections[0].articles[0].title = "New";

  const patch = createConfigPatch(base, next);
  assert.deepEqual(patch, [{
    op: "replace",
    path: "/pages/0/sections/0/articles/0/title",
    value: "New"
  }]);
  assert.equal(JSON.stringify(patch).includes("large body"), false);
});
