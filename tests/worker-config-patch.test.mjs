import assert from "node:assert/strict";
import test from "node:test";
import {
  applyConfigPatch,
  ConfigPatchError,
  maxConfigPatchOperations
} from "../src/config-patch.ts";

test("applies add remove replace and move operations without mutating the source", () => {
  const source = {
    title: "old",
    pages: [{ id: "a" }, { id: "b" }],
    announcement: { enabled: false }
  };
  const result = applyConfigPatch(source, [
    { op: "replace", path: "/title", value: "new" },
    { op: "move", from: "/pages/1", path: "/pages/0" },
    { op: "add", path: "/pages/2", value: { id: "c" } },
    { op: "remove", path: "/announcement/enabled" }
  ]);

  assert.deepEqual(result, {
    title: "new",
    pages: [{ id: "b" }, { id: "a" }, { id: "c" }],
    announcement: {}
  });
  assert.equal(source.title, "old");
  assert.deepEqual(source.pages, [{ id: "a" }, { id: "b" }]);
});

test("rejects prototype pollution paths", () => {
  assert.throws(
    () => applyConfigPatch({}, [{ op: "add", path: "/__proto__/polluted", value: true }]),
    ConfigPatchError
  );
  assert.equal({}.polluted, undefined);
});

test("rejects invalid array indexes", () => {
  assert.throws(
    () => applyConfigPatch({ pages: [] }, [{ op: "add", path: "/pages/4", value: {} }]),
    ConfigPatchError
  );
});

test("limits operation count", () => {
  const operations = Array.from({ length: maxConfigPatchOperations + 1 }, (_, index) => ({
    op: "add",
    path: `/field${index}`,
    value: index
  }));
  assert.throws(() => applyConfigPatch({}, operations), ConfigPatchError);
});
