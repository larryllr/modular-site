export function createConfigPatch(base, next) {
  return diffValue(base, next, "");
}

function diffValue(base, next, path) {
  if (deepEqual(base, next)) {
    return [];
  }

  if (Array.isArray(base) && Array.isArray(next)) {
    return isKeyedObjectArray(base) && isKeyedObjectArray(next)
      ? diffKeyedArray(base, next, path)
      : [{ op: "replace", path, value: cloneValue(next) }];
  }

  if (isPlainObject(base) && isPlainObject(next)) {
    return diffObject(base, next, path);
  }

  return [{ op: path ? "replace" : "add", path, value: cloneValue(next) }];
}

function diffObject(base, next, path) {
  const operations = [];
  const baseKeys = Object.keys(base);
  const nextKeys = Object.keys(next);

  for (const key of baseKeys) {
    if (!path && key === "updatedAt") {
      continue;
    }
    if (!Object.hasOwn(next, key)) {
      operations.push({ op: "remove", path: joinPath(path, key) });
    }
  }

  for (const key of nextKeys) {
    if (!path && key === "updatedAt") {
      continue;
    }
    const childPath = joinPath(path, key);
    if (!Object.hasOwn(base, key)) {
      operations.push({ op: "add", path: childPath, value: cloneValue(next[key]) });
    } else {
      operations.push(...diffValue(base[key], next[key], childPath));
    }
  }

  return operations;
}

function diffKeyedArray(base, next, path) {
  const operations = [];
  const baseById = new Map(base.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  const working = base.map((item) => item.id);
  const added = new Set();

  for (let index = working.length - 1; index >= 0; index -= 1) {
    if (!nextIds.has(working[index])) {
      operations.push({ op: "remove", path: joinPath(path, index) });
      working.splice(index, 1);
    }
  }

  next.forEach((item, targetIndex) => {
    const currentIndex = working.indexOf(item.id);
    if (currentIndex === -1) {
      operations.push({
        op: "add",
        path: joinPath(path, targetIndex),
        value: cloneValue(item)
      });
      working.splice(targetIndex, 0, item.id);
      added.add(item.id);
    } else if (currentIndex !== targetIndex) {
      operations.push({
        op: "move",
        from: joinPath(path, currentIndex),
        path: joinPath(path, targetIndex)
      });
      const [id] = working.splice(currentIndex, 1);
      working.splice(targetIndex, 0, id);
    }
  });

  next.forEach((item, index) => {
    if (!added.has(item.id)) {
      operations.push(...diffValue(baseById.get(item.id), item, joinPath(path, index)));
    }
  });

  return operations;
}

function isKeyedObjectArray(value) {
  if (value.length === 0) {
    return true;
  }

  const ids = new Set();
  for (const item of value) {
    if (!isPlainObject(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) {
      return false;
    }
    ids.add(item.id);
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function joinPath(path, segment) {
  return `${path}/${escapePointerSegment(String(segment))}`;
}

function escapePointerSegment(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function cloneValue(value) {
  return structuredClone(value);
}

function deepEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== typeof right || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}
