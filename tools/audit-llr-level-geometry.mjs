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
    deepStructural: metadata(node.block, "_llr_deep_structural_terrain") === true,
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
  const flowNode = nodes.find((node) => node.name === "LLRFlowMetrics");
  const campaignVersion = flowNode ? metadata(flowNode.block, "_llr_campaign_version") : null;
  const isV4 = campaignVersion === 4;

  for (let room = 1; !isV4 && room < 10; room += 1) {
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
    const invalidDepth = surface.deepStructural
      ? surface.depth < 400 || surface.depth > 540
      : surface.depth < 130 || surface.depth > 210;
    if (invalidDepth) {
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
        const invalidStep = isV4
          ? Math.abs(dx) > 215 || dy < -92 || dy > 180 || Math.hypot(dx, dy) > 235
          : dx <= 0 || dx > 235 || dy < -95 || dy > 190;
        if (invalidStep) {
          violations.push({ type: "unreachable-route-step", key, dx, dy });
        }
      }
    }
  }
  const expectedMainRoutes = isV4 ? 8 : 10;
  if (mainRoutes !== expectedMainRoutes) {
    violations.push({ type: "main-route-count", expected: expectedMainRoutes, actual: mainRoutes });
  }
  if (recoveryRoutes < 2) {
    violations.push({ type: "recovery-route-count", expectedMinimum: 2, actual: recoveryRoutes });
  }

  const roomMarkers = nodes.filter((node) =>
    isV4 ? /^LLRBeat\d{2}_/.test(node.name) : /^LLRSegment\d{2}_/.test(node.name)
  );
  const setPieces = roomMarkers.map((node) => metadata(node.block, "_llr_set_piece"));
  const acts = new Set(roomMarkers.map((node) => metadata(node.block, "_llr_act")));
  const cadences = new Set(roomMarkers.map((node) => metadata(node.block, "_llr_cadence")));
  const forms = new Set(roomMarkers.map((node) =>
    node.name.replace(isV4 ? /^LLRBeat\d{2}_/ : /^LLRSegment\d{2}_/, "")
  ));
  const mechanicSets = roomMarkers.map((node) => metadata(node.block, "_llr_mechanics") || "");
  const mechanicTags = new Set(
    mechanicSets.flatMap((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
  );
  const expectedMarkerCount = isV4 ? 8 : 10;
  if (roomMarkers.length !== expectedMarkerCount) {
    violations.push({ type: isV4 ? "beat-marker-count" : "room-marker-count", expected: expectedMarkerCount, actual: roomMarkers.length });
  }
  if (new Set(setPieces).size !== expectedMarkerCount || setPieces.some((value) => !value)) {
    violations.push({ type: "set-piece-variety", expected: expectedMarkerCount, actual: new Set(setPieces).size });
  }
  if (acts.size !== 3 || ![1, 2, 3].every((act) => acts.has(act))) {
    violations.push({ type: "act-structure", acts: [...acts] });
  }
  if (!["introduction", "development", "twist", "resolution"].every((phase) => cadences.has(phase))) {
    violations.push({ type: "cadence-structure", cadences: [...cadences] });
  }
  const minimumForms = isV4 ? 8 : 6;
  if (forms.size < minimumForms) {
    violations.push({ type: isV4 ? "beat-topology-variety" : "room-form-variety", expectedMinimum: minimumForms, actual: forms.size });
  }
  if (new Set(mechanicSets).size < 8) {
    violations.push({ type: "mechanic-set-variety", expectedMinimum: 8, actual: new Set(mechanicSets).size });
  }
  if (mechanicTags.size < 6) {
    violations.push({ type: "mechanic-tag-variety", expectedMinimum: 6, actual: mechanicTags.size });
  }
  for (const marker of roomMarkers) {
    if (metadata(marker.block, "_llr_geometry_version") !== (isV4 ? 4 : 3)) {
      violations.push({ type: "geometry-version", room: marker.name });
    }
  }

  if (isV4) {
    const spans = roomMarkers.map((marker) => ({
      start: metadata(marker.block, "_llr_start_x"),
      end: metadata(marker.block, "_llr_end_x")
    }));
    const widths = spans.map((span) => span.end - span.start);
    if (new Set(widths).size < 6) {
      violations.push({ type: "beat-width-variety", expectedMinimum: 6, actual: new Set(widths).size });
    }
    for (let index = 0; index < spans.length; index += 1) {
      const span = spans[index];
      if (typeof span.start !== "number" || typeof span.end !== "number" || span.end <= span.start) {
        violations.push({ type: "invalid-beat-span", beat: index + 1, span });
      }
      if (index > 0 && spans[index - 1].end !== span.start) {
        violations.push({ type: "beat-span-gap", beat: index + 1, previousEnd: spans[index - 1].end, start: span.start });
      }
    }
    for (const marker of roomMarkers) {
      if (!metadata(marker.block, "_llr_player_event") || !metadata(marker.block, "_llr_failure_route")) {
        violations.push({ type: "missing-event-contract", beat: marker.name });
      }
      if (metadata(marker.block, "_llr_input_budget") !== "direction+one-action") {
        violations.push({ type: "mobile-input-budget", beat: marker.name });
      }
    }
    if (!roomMarkers.some((marker) => metadata(marker.block, "_llr_state_change") === true)) {
      violations.push({ type: "missing-state-change" });
    }
    if (!nodes.some((node) => (resourcePaths.get(node.instance) || "").includes("llr_set_piece_director"))) {
      violations.push({ type: "missing-set-piece-director" });
    }
    const b2Recovery = nodes.find((node) => node.name === "B2SafeRecoveryContract");
    if (
      !b2Recovery ||
      metadata(b2Recovery.block, "_llr_vertical_step_count") !== 4 ||
      metadata(b2Recovery.block, "_llr_max_upward_rise") > 70 ||
      metadata(b2Recovery.block, "_llr_void_required") !== false
    ) {
      violations.push({ type: "missing-b2-conservative-recovery" });
    }
    const b2RecoverySteps = [1, 2, 3, 4]
      .map((index) => nodes.find((node) => node.name === `B2RecoveryStack${index}`))
      .filter(Boolean);
    if (b2RecoverySteps.length !== 4) {
      violations.push({ type: "missing-b2-recovery-step", actual: b2RecoverySteps.length });
    }
    for (let index = 1; index < b2RecoverySteps.length; index += 1) {
      if (b2RecoverySteps[index - 1].position.y - b2RecoverySteps[index].position.y > 70) {
        violations.push({ type: "high-b2-recovery-step", node: b2RecoverySteps[index].name });
      }
    }
    const safeTraversal = nodes.find((node) => node.name === "B3SafeTraversalContract");
    if (
      !safeTraversal ||
      metadata(safeTraversal.block, "_llr_max_open_gap") > 96 ||
      metadata(safeTraversal.block, "_llr_max_upward_rise") > 72 ||
      metadata(safeTraversal.block, "_llr_min_landing_width") < 144 ||
      metadata(safeTraversal.block, "_llr_water_return_stairs") !== true ||
      metadata(safeTraversal.block, "_llr_void_required") !== false
    ) {
      violations.push({ type: "missing-conservative-water-crossing" });
    }
    for (const bankName of ["B3LeftWaterStairBank", "B3RightWaterStairBank"]) {
      const bank = surfaceMap.get(bankName);
      if (!bank || !bank.deepStructural || bank.top.length < 16) {
        violations.push({ type: "missing-sealed-water-stair-bank", node: bankName });
      }
    }
    const creekWater = nodes.find((node) => node.name === "B3CreekWater");
    const creekHeight = creekWater?.polygon.length
      ? Math.max(...creekWater.polygon.map((point) => point.y)) - Math.min(...creekWater.polygon.map((point) => point.y))
      : null;
    if (creekHeight !== 380) {
      violations.push({ type: "unsafe-water-depth", node: "B3CreekWater", creekHeight });
    }
    if (creekWater?.position && creekWater.polygon.length) {
      const waterLeft = creekWater.position.x + Math.min(...creekWater.polygon.map((point) => point.x));
      const waterRight = creekWater.position.x + Math.max(...creekWater.polygon.map((point) => point.x));
      const waterBottom = creekWater.position.y + Math.max(...creekWater.polygon.map((point) => point.y));
      for (const [bankName, expectedSide] of [
        ["B3LeftWaterStairBank", "left"],
        ["B3RightWaterStairBank", "right"]
      ]) {
        const bankNode = nodes.find((node) => node.name === bankName);
        if (!bankNode?.position || bankNode.polygon.length < 6) continue;
        const bankBottom = bankNode.position.y + Math.max(...bankNode.polygon.map((point) => point.y));
        const bankLeft = bankNode.position.x + Math.min(...bankNode.polygon.map((point) => point.x));
        const bankRight = bankNode.position.x + Math.max(...bankNode.polygon.map((point) => point.x));
        if (bankBottom !== waterBottom || (expectedSide === "left" ? bankLeft > waterLeft : bankRight < waterRight)) {
          violations.push({ type: "unsealed-water-bank", node: bankName, bankBottom, waterBottom });
        }
        const top = bankNode.polygon.slice(0, -2);
        for (let index = 1; index < top.length; index += 1) {
          const dx = top[index].x - top[index - 1].x;
          const dy = top[index].y - top[index - 1].y;
          if (Math.abs(dy) < 0.01 && dx > 0 && dx < 55) {
            violations.push({ type: "narrow-water-stair-tread", node: bankName, dx });
          }
          if (Math.abs(dx) < 0.01 && Math.abs(dy) > 55) {
            violations.push({ type: "high-water-stair-rise", node: bankName, dy });
          }
        }
      }
    }
    const towerExitContract = nodes.find((node) => node.name === "B4SafeTowerExitContract");
    if (
      !towerExitContract ||
      metadata(towerExitContract.block, "_llr_exit_stairs") !== true ||
      metadata(towerExitContract.block, "_llr_stair_count") !== 7 ||
      metadata(towerExitContract.block, "_llr_max_step_rise") > 50 ||
      metadata(towerExitContract.block, "_llr_min_tread_width") < 70 ||
      metadata(towerExitContract.block, "_llr_dynamic_mechanism_required") !== false ||
      metadata(towerExitContract.block, "_llr_void_required") !== false
    ) {
      violations.push({ type: "missing-safe-tower-exit-contract" });
    }
    const towerExit = surfaceMap.get("B4TowerExitStairBank");
    const towerExitNode = nodes.find((node) => node.name === "B4TowerExitStairBank");
    if (!towerExit || !towerExit.deepStructural || !towerExitNode || towerExit.top.length < 16) {
      violations.push({ type: "missing-sealed-tower-exit-stairs" });
    } else {
      const top = towerExitNode.polygon.slice(0, -2);
      let upwardSteps = 0;
      for (let index = 1; index < top.length; index += 1) {
        const dx = top[index].x - top[index - 1].x;
        const dy = top[index].y - top[index - 1].y;
        if (Math.abs(dy) < 0.01 && dx > 0 && dx < 70) {
          violations.push({ type: "narrow-tower-exit-tread", dx });
        }
        if (Math.abs(dx) < 0.01 && dy < 0) {
          upwardSteps += 1;
          if (Math.abs(dy) > 50) {
            violations.push({ type: "high-tower-exit-step", dy });
          }
        }
        if (dx < 0 || (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01)) {
          violations.push({ type: "invalid-tower-exit-stair-edge", dx, dy });
        }
      }
      const first = towerExit.top[0];
      const last = towerExit.top.at(-1);
      if (
        upwardSteps !== 7 ||
        first.x !== 9100 || first.y !== 510 ||
        last.x !== 10000 || last.y !== 180
      ) {
        violations.push({
          type: "tower-exit-stairs-do-not-bridge-basin",
          upwardSteps,
          first,
          last
        });
      }
    }
    for (const contractName of ["B6SafeRecoveryContract", "B8SafeRecoveryContract"]) {
      const contract = nodes.find((node) => node.name === contractName);
      if (
        !contract ||
        metadata(contract.block, "_llr_vertical_rescue") !== true ||
        metadata(contract.block, "_llr_void_required") !== false ||
        metadata(contract.block, "_llr_min_landing_width") < 144
      ) {
        violations.push({ type: "missing-vertical-rescue", node: contractName });
      }
    }
    const creekContract = nodes.find((node) => node.name === "B7SafeCreekContract");
    if (
      !creekContract ||
      metadata(creekContract.block, "_llr_continuous_creek_bed") !== true ||
      metadata(creekContract.block, "_llr_exit_step_count") !== 5 ||
      metadata(creekContract.block, "_llr_void_required") !== false
    ) {
      violations.push({ type: "missing-creek-recovery-contract" });
    }
    for (const bedName of ["B7CreekBed1", "B7CreekBed2", "B7CreekBed3", "B7CreekBed4", "B7CreekBed5"]) {
      if (!surfaceMap.has(bedName)) violations.push({ type: "missing-creek-bed", node: bedName });
    }
    const creekBeds = [1, 2, 3, 4, 5]
      .map((index) => surfaceMap.get(`B7CreekBed${index}`))
      .filter(Boolean);
    for (let index = 1; index < creekBeds.length; index += 1) {
      if (creekBeds[index].x0 > creekBeds[index - 1].x1) {
        violations.push({ type: "creek-bed-gap", after: creekBeds[index - 1].name });
      }
    }
    for (let index = 1; index <= 5; index += 1) {
      if (!nodes.some((node) => node.name === `B7CreekExitStep${index}`)) {
        violations.push({ type: "missing-creek-exit-step", node: `B7CreekExitStep${index}` });
      }
    }
    for (const removedNode of ["B6RecoveryMushroom", "B8RecoveryMushroom", "B8RecoveryCloud2"]) {
      if (nodes.some((node) => node.name === removedNode)) {
        violations.push({ type: "legacy-softlock-node", node: removedNode });
      }
    }
    for (const liftName of ["B6RecoveryLift", "B8RecoveryLift"]) {
      const lift = nodes.find((node) => node.name === liftName);
      const travel = lift ? parseVector(lift.block, "travel") : null;
      if (!lift || !travel || travel.y > -600 || metadata(lift.block, "_llr_walkable_width") < 144) {
        violations.push({ type: "invalid-recovery-lift", node: liftName, travel });
      }
    }
    for (const node of nodes) {
      const walkableWidth = metadata(node.block, "_llr_walkable_width");
      const resourcePath = resourcePaths.get(node.instance) || "";
      if (typeof walkableWidth === "number" && walkableWidth < 144 && !/\/log\/log_fall\.tscn$/.test(resourcePath)) {
        violations.push({ type: "narrow-declared-landing", node: node.name, walkableWidth });
      }
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
    ["challenge-gate", /\/llr_(?:pound|coin)_gate\/llr_(?:pound|coin)_gate\.tscn$/],
    ["director", /\/llr_set_piece_director\/llr_set_piece_director\.tscn$/]
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

  const mainSeconds = flowNode ? metadata(flowNode.block, "_llr_main_seconds") : null;
  const recoverySeconds = flowNode ? metadata(flowNode.block, "_llr_recovery_seconds") : null;
  if (typeof mainSeconds !== "number" || mainSeconds < 180) {
    violations.push({ type: "main-flow-too-short", mainSeconds });
  }
  const minimumNodes = isV4 ? 140 : 250;
  if (nodes.length < minimumNodes || nodes.length > 700) {
    violations.push({ type: "runtime-node-budget", nodes: nodes.length, minimum: minimumNodes, limit: 700 });
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
    campaignVersion,
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
    campaignVersion: report.campaignVersion,
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
