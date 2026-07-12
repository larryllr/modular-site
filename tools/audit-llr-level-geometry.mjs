import { readFileSync } from "node:fs";

const root = "vendor/Legacy_SM63Redux/scenes/levels/llr_complete";
const levels = Array.from({ length: 10 }, (_, index) => index + 1);
const roomWidth = 3200;

function parseVector(text, property = "position") {
  const match = text.match(new RegExp(`^${property} = Vector2\\((-?[\\d.]+), (-?[\\d.]+)\\)$`, "m"));
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

function parsePackedVector(text, property = "polygon") {
  const match = text.match(new RegExp(`^${property} = PackedVector2Array\\(([^)]*)\\)$`, "m"));
  if (!match) return [];
  const values = match[1].split(",").map((value) => Number(value.trim()));
  return Array.from({ length: values.length / 2 }, (_, index) => ({
    x: values[index * 2],
    y: values[index * 2 + 1]
  }));
}

function metadata(block, key) {
  const match = block.match(new RegExp(`^metadata\\/${key} = (.+)$`, "m"));
  if (!match) return null;
  const value = match[1];
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?[\d.]+$/.test(value)) return Number(value);
  if (value.startsWith('"')) return JSON.parse(value);
  return value;
}

function parseNodes(scene) {
  return scene
    .split(/\n(?=\[node )/)
    .map((block, order) => {
      const header = block.match(/^\[node name="([^"]+)"([^\]]*)\]/);
      if (!header) return null;
      return {
        order,
        name: header[1],
        type: header[2].match(/type="([^"]+)"/)?.[1] || "",
        parent: header[2].match(/parent="([^"]+)"/)?.[1] || "",
        instance: header[2].match(/instance=ExtResource\("([^"]+)"\)/)?.[1] || "",
        position: parseVector(block),
        polygon: parsePackedVector(block),
        routePoints: parsePackedVector(block, "metadata/_llr_points"),
        block
      };
    })
    .filter(Boolean);
}

function terrainSurface(node) {
  if (!node.position || node.polygon.length < 4) return null;
  const localTop = node.polygon.slice(0, -2);
  const top = localTop.map((point) => ({
    x: point.x + node.position.x,
    y: point.y + node.position.y
  }));
  return {
    name: node.name,
    x0: Math.min(...top.map((point) => point.x)),
    x1: Math.max(...top.map((point) => point.x)),
    width: Math.max(...top.map((point) => point.x)) - Math.min(...top.map((point) => point.x)),
    top,
    depth: Math.max(...node.polygon.map((point) => point.y)) - Math.min(...localTop.map((point) => point.y))
  };
}

function surfaceYAt(surface, x) {
  for (let index = 1; index < surface.top.length; index += 1) {
    const left = surface.top[index - 1];
    const right = surface.top[index];
    if (x < left.x || x > right.x) continue;
    const progress = (x - left.x) / Math.max(1, right.x - left.x);
    return left.y + (right.y - left.y) * progress;
  }
  return null;
}

function pointOnSurface(surface, t) {
  const x = surface.x0 + surface.width * t;
  return { x, y: surfaceYAt(surface, x) };
}

function auditLevel(level) {
  const path = `${root}/llr_complete_${level}.tscn`;
  const scene = readFileSync(path, "utf8");
  const nodes = parseNodes(scene);
  const resourcePaths = new Map(
    [...scene.matchAll(/^\[ext_resource type="PackedScene" path="([^"]+)" id="([^"]+)"\]$/gm)]
      .map((match) => [match[2], match[1]])
  );
  const surfaces = nodes
    .filter((node) => node.parent === "Terrain")
    .map(terrainSurface)
    .filter(Boolean);
  const surfaceMap = new Map(surfaces.map((surface) => [surface.name, surface]));
  const violations = [];

  for (let room = 1; room < 10; room += 1) {
    const left = surfaceMap.get(`S${room}End`);
    const right = surfaceMap.get(`S${room + 1}Start`);
    if (!left || !right) {
      violations.push({ type: "missing-seam-surface", room });
      continue;
    }
    const overlap = left.x1 - right.x0;
    const connectedSpan = right.x1 - left.x0;
    const boundaryX = room * roomWidth;
    const leftY = surfaceYAt(left, boundaryX);
    const rightY = surfaceYAt(right, boundaryX);
    if (Math.abs(overlap - 32) > 0.01 || Math.abs(leftY - rightY) > 0.01) {
      violations.push({ type: "bad-room-seam", room, overlap, leftY, rightY });
    }
    if (connectedSpan > 620) {
      violations.push({ type: "oversized-seam-rest", room, connectedSpan });
    }
  }

  const anchored = nodes.filter((node) => metadata(node.block, "_llr_anchor_surface"));
  for (const node of anchored) {
    const surfaceId = metadata(node.block, "_llr_anchor_surface");
    const t = metadata(node.block, "_llr_anchor_t");
    const offset = metadata(node.block, "_llr_anchor_offset");
    const surface = surfaceMap.get(surfaceId);
    if (!surface || !node.position || typeof t !== "number" || typeof offset !== "number") {
      violations.push({ type: "invalid-anchor", node: node.name, surfaceId });
      continue;
    }
    const expected = pointOnSurface(surface, t);
    const error = Math.hypot(node.position.x - expected.x, node.position.y - (expected.y + offset));
    if (error > 0.03) {
      violations.push({ type: "anchor-error", node: node.name, surfaceId, error });
    }
  }

  const requiredAnchors = nodes.filter((node) =>
    /(?:Tree|Flowers|LevelIntro|Goomba|Bobomb|Rock|Box|Bottle|Fludd)/.test(node.name) &&
    !metadata(node.block, "_llr_airborne")
  );
  for (const node of requiredAnchors) {
    if (!metadata(node.block, "_llr_anchor_surface")) {
      violations.push({ type: "missing-ground-anchor", node: node.name });
    }
  }

  for (const node of nodes) {
    if (!node.position || node.name === "VoidRescue") continue;
    if (node.position.y < -760 || node.position.y > 720) {
      violations.push({ type: "outside-camera", node: node.name, y: node.position.y });
    }
  }

  for (const surface of surfaces) {
    if (surface.depth < 130 || surface.depth > 210) {
      violations.push({ type: "terrain-depth", surface: surface.name, depth: surface.depth });
    }
    if (surface.width > 900 && !/LakeBasin$/.test(surface.name)) {
      violations.push({ type: "oversized-empty-terrain", surface: surface.name, width: surface.width });
    }
  }

  const routeNodes = nodes.filter((node) => node.parent === "Route" && node.routePoints.length >= 2);
  const routes = Map.groupBy(routeNodes, (node) =>
    `${metadata(node.block, "_llr_room")}:${metadata(node.block, "_llr_kind")}`
  );
  let mainRoutes = 0;
  let recoveryRoutes = 0;
  for (const [key, route] of routes) {
    const kind = key.split(":")[1];
    if (kind === "main") mainRoutes += 1;
    else if (kind === "recovery") recoveryRoutes += 1;
    for (const routeNode of route) {
      for (let index = 1; index < routeNode.routePoints.length; index += 1) {
        const previous = routeNode.routePoints[index - 1];
        const current = routeNode.routePoints[index];
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        if (dx <= 0 || dx > 235 || dy < -95 || dy > 190) {
          violations.push({ type: "unreachable-route-step", key, dx, dy });
        }
      }
    }
  }
  if (mainRoutes !== 10) {
    violations.push({ type: "main-route-count", expected: 10, actual: mainRoutes });
  }
  if (recoveryRoutes < 2) {
    violations.push({ type: "recovery-route-count", expectedMinimum: 2, actual: recoveryRoutes });
  }

  const roomMarkers = nodes.filter((node) => /^LLRSegment\d{2}_/.test(node.name));
  const setPieces = roomMarkers.map((node) => metadata(node.block, "_llr_set_piece"));
  const acts = new Set(roomMarkers.map((node) => metadata(node.block, "_llr_act")));
  const cadences = new Set(roomMarkers.map((node) => metadata(node.block, "_llr_cadence")));
  const forms = new Set(roomMarkers.map((node) => node.name.replace(/^LLRSegment\d{2}_/, "")));
  const mechanicSets = roomMarkers.map((node) => metadata(node.block, "_llr_mechanics") || "");
  const mechanicTags = new Set(
    mechanicSets.flatMap((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
  );
  if (roomMarkers.length !== 10) {
    violations.push({ type: "room-marker-count", expected: 10, actual: roomMarkers.length });
  }
  if (new Set(setPieces).size !== 10 || setPieces.some((value) => !value)) {
    violations.push({ type: "set-piece-variety", expected: 10, actual: new Set(setPieces).size });
  }
  if (acts.size !== 3 || ![1, 2, 3].every((act) => acts.has(act))) {
    violations.push({ type: "act-structure", acts: [...acts] });
  }
  if (!["introduction", "development", "twist", "resolution"].every((phase) => cadences.has(phase))) {
    violations.push({ type: "cadence-structure", cadences: [...cadences] });
  }
  if (forms.size < 6) {
    violations.push({ type: "room-form-variety", expectedMinimum: 6, actual: forms.size });
  }
  if (new Set(mechanicSets).size < 8) {
    violations.push({ type: "mechanic-set-variety", expectedMinimum: 8, actual: new Set(mechanicSets).size });
  }
  if (mechanicTags.size < 6) {
    violations.push({ type: "mechanic-tag-variety", expectedMinimum: 6, actual: mechanicTags.size });
  }
  for (const marker of roomMarkers) {
    if (metadata(marker.block, "_llr_geometry_version") !== 3) {
      violations.push({ type: "geometry-version", room: marker.name });
    }
  }

  const dynamicMatchers = [
    ["shuttle", /\/llr_shuttle\//],
    ["pivot", /\/moving_platform\/pivot\.tscn$/],
    ["rotating", /\/rotating_block\/rotating_block\.tscn$/],
    ["thwomp", /\/enemy\/thwomp\//],
    ["tipping", /\/tipping_log\/tipping_log\.tscn$/],
    ["warp", /\/interactable\/(?:pipe|door)\//],
    ["fludd", /\/fludd_box\/fludd_pickup_/],
    ["falling", /\/log\/log_fall\.tscn$/],
    ["spring", /\/llr_spring\/llr_spring\.tscn$/],
    ["conveyor", /\/llr_conveyor\/llr_conveyor\.tscn$/],
    ["challenge-gate", /\/llr_(?:pound|coin)_gate\/llr_(?:pound|coin)_gate\.tscn$/]
  ];
  const dynamicTypes = new Set();
  let dynamicNodes = 0;
  for (const node of nodes) {
    const resourcePath = resourcePaths.get(node.instance) || "";
    for (const [kind, matcher] of dynamicMatchers) {
      if (!matcher.test(resourcePath)) continue;
      dynamicTypes.add(kind);
      dynamicNodes += 1;
      break;
    }
  }
  if (dynamicTypes.size < 3) {
    violations.push({ type: "dynamic-mechanic-variety", expectedMinimum: 3, actual: [...dynamicTypes] });
  }
  if (dynamicNodes > 80) {
    violations.push({ type: "dynamic-node-budget", nodes: dynamicNodes, limit: 80 });
  }

  const flowNode = nodes.find((node) => node.name === "LLRFlowMetrics");
  const mainSeconds = flowNode ? metadata(flowNode.block, "_llr_main_seconds") : null;
  const recoverySeconds = flowNode ? metadata(flowNode.block, "_llr_recovery_seconds") : null;
  if (typeof mainSeconds !== "number" || mainSeconds < 180) {
    violations.push({ type: "main-flow-too-short", mainSeconds });
  }
  if (nodes.length < 250 || nodes.length > 700) {
    violations.push({ type: "runtime-node-budget", nodes: nodes.length, minimum: 250, limit: 700 });
  }

  const guideCoinCount = nodes.filter((node) => node.parent === "Items/Coins").length;
  if (guideCoinCount > 80) {
    violations.push({ type: "guide-coin-budget", nodes: guideCoinCount, limit: 80 });
  }

  const waterNodes = nodes.filter((node) => node.parent === "Water" && node.position && node.polygon.length >= 4);
  const waterborne = nodes.filter((node) => metadata(node.block, "_llr_waterborne"));
  for (const node of waterborne) {
    const inside = waterNodes.some((water) => {
      const xs = water.polygon.map((point) => point.x + water.position.x);
      const ys = water.polygon.map((point) => point.y + water.position.y);
      return node.position.x >= Math.min(...xs) && node.position.x <= Math.max(...xs) &&
        node.position.y >= Math.min(...ys) && node.position.y <= Math.max(...ys);
    });
    if (!inside) violations.push({ type: "waterborne-outside-water", node: node.name });
  }

  return {
    level,
    nodeCount: nodes.length,
    terrainCount: surfaces.length,
    anchoredCount: anchored.length,
    mainRoutes,
    recoveryRoutes,
    mainSeconds,
    recoverySeconds,
    setPieceCount: new Set(setPieces).size,
    formCount: forms.size,
    mechanicTagCount: mechanicTags.size,
    cadences: [...cadences],
    dynamicTypes: [...dynamicTypes],
    dynamicNodes,
    violations
  };
}

const reports = levels.map(auditLevel);
for (const report of reports) {
  console.log(JSON.stringify({
    level: report.level,
    nodes: report.nodeCount,
    terrain: report.terrainCount,
    anchored: report.anchoredCount,
    mainRoutes: report.mainRoutes,
    recoveryRoutes: report.recoveryRoutes,
    mainSeconds: report.mainSeconds,
    recoverySeconds: report.recoverySeconds,
    setPieces: report.setPieceCount,
    forms: report.formCount,
    mechanicTags: report.mechanicTagCount,
    cadences: report.cadences,
    dynamicTypes: report.dynamicTypes,
    dynamicNodes: report.dynamicNodes,
    violations: report.violations.length
  }));
}

const violations = reports.flatMap((report) =>
  report.violations.map((violation) => ({ level: report.level, ...violation }))
);
console.log(JSON.stringify({ totalViolations: violations.length }, null, 2));

if (process.argv.includes("--details") && violations.length) {
  console.log(JSON.stringify(violations, null, 2));
}
if (process.argv.includes("--strict") && violations.length) {
  process.exitCode = 1;
}
