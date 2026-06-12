export const maxConfigPatchOperations = 2000;
const maxConfigPatchPathDepth = 24;
const forbiddenPathSegments = new Set(["__proto__", "prototype", "constructor"]);

type ConfigPatchOperation =
  | { op: "add" | "replace"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "move"; from: string; path: string };

export class ConfigPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigPatchError";
  }
}

export function applyConfigPatch(source: unknown, value: unknown): unknown {
  if (!Array.isArray(value)) {
    throw new ConfigPatchError("补丁操作必须是数组。");
  }
  if (value.length > maxConfigPatchOperations) {
    throw new ConfigPatchError(`补丁操作不能超过 ${maxConfigPatchOperations} 条。`);
  }

  const target = structuredClone(source);
  for (const rawOperation of value) {
    const operation = normalizeOperation(rawOperation);
    if (operation.op === "move") {
      const moved = removeValue(target, parsePointer(operation.from));
      addValue(target, parsePointer(operation.path), moved);
    } else if (operation.op === "remove") {
      removeValue(target, parsePointer(operation.path));
    } else if (operation.op === "add") {
      addValue(target, parsePointer(operation.path), structuredClone(operation.value));
    } else {
      replaceValue(target, parsePointer(operation.path), structuredClone(operation.value));
    }
  }

  return target;
}

function normalizeOperation(value: unknown): ConfigPatchOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigPatchError("补丁操作格式不正确。");
  }

  const record = value as Record<string, unknown>;
  const op = record.op;
  const path = record.path;
  if (!["add", "remove", "replace", "move"].includes(String(op)) || typeof path !== "string") {
    throw new ConfigPatchError("补丁操作类型或路径不正确。");
  }

  if (op === "move") {
    if (typeof record.from !== "string") {
      throw new ConfigPatchError("移动操作缺少来源路径。");
    }
    return { op, from: record.from, path };
  }
  if (op === "remove") {
    return { op, path };
  }
  if (!Object.hasOwn(record, "value")) {
    throw new ConfigPatchError("补丁操作缺少值。");
  }
  return { op: op as "add" | "replace", path, value: record.value };
}

function parsePointer(pointer: string): string[] {
  if (!pointer.startsWith("/") || pointer === "/") {
    throw new ConfigPatchError("补丁路径必须指向配置字段。");
  }

  const segments = pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (segments.length > maxConfigPatchPathDepth) {
    throw new ConfigPatchError("补丁路径层级过深。");
  }
  if (segments.some((segment) => forbiddenPathSegments.has(segment))) {
    throw new ConfigPatchError("补丁路径包含禁止字段。");
  }
  return segments;
}

function getParent(root: unknown, segments: string[]): { parent: unknown; key: string } {
  let parent = root;
  for (const segment of segments.slice(0, -1)) {
    parent = getExistingValue(parent, segment);
    if (!parent || typeof parent !== "object") {
      throw new ConfigPatchError("补丁路径不存在。");
    }
  }
  return { parent, key: segments.at(-1) || "" };
}

function getExistingValue(parent: unknown, key: string): unknown {
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(key, parent.length - 1);
    return parent[index];
  }
  if (parent && typeof parent === "object" && Object.hasOwn(parent, key)) {
    return (parent as Record<string, unknown>)[key];
  }
  throw new ConfigPatchError("补丁路径不存在。");
}

function addValue(root: unknown, segments: string[], value: unknown): void {
  const { parent, key } = getParent(root, segments);
  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : parseArrayIndex(key, parent.length);
    parent.splice(index, 0, value);
    return;
  }
  if (parent && typeof parent === "object") {
    (parent as Record<string, unknown>)[key] = value;
    return;
  }
  throw new ConfigPatchError("补丁目标不是对象或数组。");
}

function replaceValue(root: unknown, segments: string[], value: unknown): void {
  const { parent, key } = getParent(root, segments);
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(key, parent.length - 1);
    parent[index] = value;
    return;
  }
  if (parent && typeof parent === "object" && Object.hasOwn(parent, key)) {
    (parent as Record<string, unknown>)[key] = value;
    return;
  }
  throw new ConfigPatchError("要替换的补丁路径不存在。");
}

function removeValue(root: unknown, segments: string[]): unknown {
  const { parent, key } = getParent(root, segments);
  if (Array.isArray(parent)) {
    const index = parseArrayIndex(key, parent.length - 1);
    return parent.splice(index, 1)[0];
  }
  if (parent && typeof parent === "object" && Object.hasOwn(parent, key)) {
    const record = parent as Record<string, unknown>;
    const removed = record[key];
    delete record[key];
    return removed;
  }
  throw new ConfigPatchError("要删除的补丁路径不存在。");
}

function parseArrayIndex(value: string, max: number): number {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new ConfigPatchError("数组补丁索引不正确。");
  }
  const index = Number(value);
  if (!Number.isSafeInteger(index) || index < 0 || index > max) {
    throw new ConfigPatchError("数组补丁索引超出范围。");
  }
  return index;
}
