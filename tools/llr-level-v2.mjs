// Historical V2 generator. Deployment now imports llr-level-v3.mjs; keep this file only for diff/reference.
function fmt(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function vector(x, y) {
  return `Vector2(${fmt(x)}, ${fmt(y)})`;
}

function packed(points) {
  return `PackedVector2Array(${points.flat().map(fmt).join(", ")})`;
}

function plainNode(name, type, parent = ".") {
  return parent === ""
    ? `[node name="${name}" type="${type}"]\n`
    : `[node name="${name}" type="${type}" parent="${parent}"]\n`;
}

export function buildV2StageScene({
  stage,
  stages,
  resources,
  resourceIds,
  mainMenuResource,
  segmentWidth
}) {
  const levelWidth = segmentWidth * 10;
  const nodes = [];
  const surfaces = new Map();
  let routeSerial = 0;
  let mainEstimatedSeconds = 0;
  let recoveryEstimatedSeconds = 0;

  function instanceNode(name, parent, resource, properties = {}) {
    const lines = [
      `[node name="${name}" parent="${parent}" instance=ExtResource("${resourceIds[resource]}")]`
    ];
    for (const [key, value] of Object.entries(properties)) lines.push(`${key} = ${value}`);
    return `${lines.join("\n")}\n`;
  }

  function addTerrain(id, x, y, width, profile = [0, 0, 0, 0], depth = 170) {
    if (depth < 130 || depth > 210) throw new Error(`${id}: invalid terrain depth ${depth}`);
    const step = width / (profile.length - 1);
    const top = profile.map((offset, index) => [index * step, offset]);
    nodes.push(instanceNode(id, "Terrain", "terrain", {
      z_index: "1",
      position: vector(x, y),
      polygon: packed([...top, [width, depth], [0, depth]])
    }));
    surfaces.set(id, {
      x,
      width,
      points: profile.map((offset, index) => ({ x: x + index * step, y: y + offset }))
    });
    return id;
  }

  function surfacePoint(id, t) {
    const surface = surfaces.get(id);
    if (!surface) throw new Error(`Unknown surface ${id}`);
    const clamped = Math.max(0, Math.min(1, t));
    const targetX = surface.x + surface.width * clamped;
    for (let index = 1; index < surface.points.length; index += 1) {
      const left = surface.points[index - 1];
      const right = surface.points[index];
      if (targetX > right.x) continue;
      const progress = (targetX - left.x) / Math.max(1, right.x - left.x);
      return { x: targetX, y: left.y + (right.y - left.y) * progress };
    }
    return surface.points.at(-1);
  }

  function grounded(name, parent, resource, surfaceId, t, offset, properties = {}) {
    const anchor = surfacePoint(surfaceId, t);
    nodes.push(instanceNode(name, parent, resource, {
      position: vector(anchor.x, anchor.y + offset),
      ...properties,
      "metadata/_llr_anchor_surface": JSON.stringify(surfaceId),
      "metadata/_llr_anchor_t": fmt(t),
      "metadata/_llr_anchor_offset": fmt(offset)
    }));
  }

  function airborne(name, parent, resource, x, y, properties = {}) {
    if (y < -900 || y > 860) {
      throw new Error(`${name}: far outside camera-safe range at y=${y}`);
    }
    const sourceY = y;
    y = Math.max(-730, Math.min(700, y));
    nodes.push(instanceNode(name, parent, resource, {
      position: vector(x, y),
      ...properties,
      "metadata/_llr_airborne": "true",
      ...(sourceY !== y ? { "metadata/_llr_clamped_from_y": fmt(sourceY) } : {})
    }));
  }

  function routeRecord(room, route, kind) {
    routeSerial += 1;
    nodes.push(`${plainNode(`LLRRoute${String(routeSerial).padStart(3, "0")}`, "Node", "Route").trimEnd()}
metadata/_llr_room = ${room}
metadata/_llr_kind = ${JSON.stringify(kind)}
metadata/_llr_points = ${packed(route.map((point) => [point.x, point.y]))}
`);
  }

  function validateRoute(room, route, kind = "main") {
    if (route.length < 2) throw new Error(`Room ${room}: empty ${kind} route`);
    for (const point of route) {
      if (point.y < -740 || point.y > 700) {
        throw new Error(`Room ${room}: ${kind} route outside camera-safe range at y=${fmt(point.y)}`);
      }
    }
    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (dx <= 0 || dx > 235 || dy < -95 || dy > 190) {
        throw new Error(`Room ${room}: unreachable ${kind} step dx=${fmt(dx)} dy=${fmt(dy)}`);
      }
      const seconds = dx / 260 + 0.8 + (dy < -20 ? 0.35 : 0);
      if (kind === "main") mainEstimatedSeconds += seconds;
      else recoveryEstimatedSeconds += seconds;
    }
    routeRecord(room, route, kind);
  }

  function profileOffset(profile, progress, amplitude) {
    if (!amplitude) return 0;
    if (profile === "valley") return Math.sin(progress * Math.PI) * amplitude;
    if (profile === "double") return -Math.sin(progress * Math.PI * 2) * amplitude;
    if (profile === "zigzag") {
      return -Math.sin(progress * Math.PI) * amplitude * 0.35 +
        Math.sin(progress * Math.PI * 4) * amplitude * 0.48;
    }
    if (profile === "steps") {
      const stair = Math.floor(progress * 5) / 4;
      return (stair - progress) * amplitude;
    }
    if (profile === "crest") return -(Math.sin(progress * Math.PI) ** 2) * amplitude;
    return -Math.sin(progress * Math.PI) * amplitude;
  }

  function steppedPath(room, prefix, start, end, resource = "wood", wave = 0, options = {}) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const profile = options.profile || "arch";
    const spacing = options.spacing || 170;
    const initialCount = Math.max(
      1,
      Math.ceil(Math.max(dx / spacing, (Math.abs(dy) + Math.abs(wave) * 2) / 68))
    );
    const pointAt = (progress) => ({
      progress,
      x: start.x + dx * progress,
      y: start.y + dy * progress + profileOffset(profile, progress, wave)
    });
    let samples = Array.from({ length: initialCount + 1 }, (_, index) => pointAt(index / initialCount));
    for (let pass = 0; pass < 8; pass += 1) {
      const refined = [samples[0]];
      let changed = false;
      for (let index = 1; index < samples.length; index += 1) {
        const previous = samples[index - 1];
        const current = samples[index];
        const stepX = current.x - previous.x;
        const stepY = current.y - previous.y;
        if (stepX > 210 || stepY < -82 || stepY > 165) {
          refined.push(pointAt((previous.progress + current.progress) / 2));
          changed = true;
        }
        refined.push(current);
      }
      samples = refined;
      if (!changed) break;
    }
    const route = [start];
    for (let index = 1; index < samples.length - 1; index += 1) {
      const { x, y } = samples[index];
      const kind = resource === "mixed"
        ? (index % (options.cloudEvery || 3) === 0 ? "cloud" : "wood")
        : resource;
      nodes.push(instanceNode(`${prefix}Step${index}`, "Items/Platforms", kind, {
        position: vector(x, y + (kind === "cloud" ? 8 : 7)),
        ...(kind === "cloud" ? { width: fmt(options.cloudWidth ?? 2) } : {})
      }));
      route.push({ x, y });
    }
    route.push(end);
    return route;
  }

  function surfaceWalk(id, fromT = 0.04, toT = 0.96) {
    const surface = surfaces.get(id);
    if (!surface) throw new Error(`Unknown walking surface ${id}`);
    const distance = surface.width * Math.abs(toT - fromT);
    const count = Math.max(1, Math.ceil(distance / 180));
    const route = [];
    for (let index = 0; index <= count; index += 1) {
      route.push(surfacePoint(id, fromT + (toT - fromT) * (index / count)));
    }
    return route;
  }

  function sampledLine(start, end, spacing = 175) {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const dy = end.y - start.y;
    const count = Math.max(
      1,
      Math.ceil(distance / spacing),
      Math.ceil((end.x - start.x) / 210),
      dy < 0 ? Math.ceil(Math.abs(dy) / 82) : Math.ceil(dy / 165)
    );
    return Array.from({ length: count + 1 }, (_, index) => {
      const progress = index / count;
      return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress
      };
    });
  }

  function sampledPolyline(points, spacing = 175) {
    const route = [];
    for (let index = 1; index < points.length; index += 1) {
      const section = sampledLine(points[index - 1], points[index], spacing);
      route.push(...(route.length ? section.slice(1) : section));
    }
    return route;
  }

  function guideCoins(prefix, route) {
    route
      .filter((_, index) => index % 2 === 1)
      .slice(0, 12)
      .forEach((point, index) => {
        airborne(`${prefix}Coin${index + 1}`, "Items/Coins", "coin", point.x, Math.max(-740, point.y - 48));
      });
  }

  function bonusBranch(room, prefix, start, end, lift, resource = "mixed", profile = "arch") {
    const branchStart = {
      x: start.x + Math.min(150, (end.x - start.x) * 0.12),
      y: start.y - 18
    };
    const branchEnd = {
      x: end.x - Math.min(150, (end.x - start.x) * 0.12),
      y: end.y - 18
    };
    const branch = steppedPath(
      room,
      `${prefix}Bonus`,
      branchStart,
      branchEnd,
      resource,
      lift,
      { profile, spacing: 155, cloudEvery: 2, cloudWidth: 3 }
    );
    guideCoins(`${prefix}Bonus`, branch);
    const prize = branch[Math.floor(branch.length / 2)];
    airborne(`${prefix}BonusBlueCoin`, "Items/Pickups", "blueCoin", prize.x, prize.y - 54);
  }

  function roomVariant(index) {
    return stage.variants?.[index] || ["ridge", "valley", "double", "zigzag"][(stage.id + index) % 4];
  }

  function roomMarker(index, theme, entryY, exitY) {
    nodes.push(`${plainNode(`LLRSegment${String(index + 1).padStart(2, "0")}_${theme}`, "Node2D").trimEnd()}
position = ${vector(index * segmentWidth, entryY)}
metadata/_llr_entry_y = ${fmt(entryY)}
metadata/_llr_exit_y = ${fmt(exitY)}
metadata/_llr_geometry_version = 2
`);
  }

  function boundaries(index, entryY, exitY) {
    const x = index * segmentWidth;
    const start = addTerrain(`S${index + 1}Start`, x - 16, entryY, 300, [0, 0, 0, 0], 168);
    const end = addTerrain(`S${index + 1}End`, x + 2916, exitY, 300, [0, 0, 0, 0], 176);
    return {
      x,
      start,
      end,
      startPoint: { x: x + 250, y: entryY },
      endPoint: { x: x + 2950, y: exitY }
    };
  }

  function recovery(index, exitY, prefix, variant = "ridge", style = "sky") {
    const x = index * segmentWidth;
    const patterns = {
      ridge: [
        { dx: 260, y: 625, width: 600, profile: [0, -16, -34, -12, 0] },
        { dx: 1040, y: 566, width: 620, profile: [0, -12, 10, 0] },
        { dx: 1840, y: 616, width: 520, profile: [0, -10, 18, 0] }
      ],
      valley: [
        { dx: 260, y: 558, width: 590, profile: [0, 12, 28, 10, 0] },
        { dx: 1030, y: 638, width: 630, profile: [0, -8, 8, 0] },
        { dx: 1840, y: 574, width: 520, profile: [0, 16, -10, 0] }
      ],
      double: [
        { dx: 260, y: 620, width: 560, profile: [0, -26, 12, -18, 0] },
        { dx: 1000, y: 548, width: 650, profile: [0, 18, -22, 12, 0] },
        { dx: 1830, y: 628, width: 540, profile: [0, -18, 16, -8, 0] }
      ],
      zigzag: [
        { dx: 260, y: 642, width: 500, profile: [0, -18, 16, 0] },
        { dx: 930, y: 586, width: 560, profile: [0, 16, -14, 0] },
        { dx: 1660, y: 526, width: 700, profile: [0, -20, 18, -12, 0] }
      ],
      steps: [
        { dx: 260, y: 646, width: 470, profile: [0, 0, -8, -8] },
        { dx: 900, y: 602, width: 520, profile: [0, 0, -10, -10] },
        { dx: 1590, y: 552, width: 770, profile: [0, -8, -8, -16, -16] }
      ]
    };
    const specs = patterns[variant] || patterns.ridge;
    const surfaceIds = specs.map((spec, item) => addTerrain(
      `${prefix}Recovery${String.fromCharCode(65 + item)}`,
      x + spec.dx,
      spec.y,
      spec.width,
      spec.profile,
      174 + item * 5
    ));
    const bridgeResource = style === "sky" ? "cloud" : style === "flight" ? "mixed" : "wood";
    const low = [];
    for (let item = 0; item < surfaceIds.length; item += 1) {
      const walk = surfaceWalk(surfaceIds[item], 0.08, 0.92);
      if (low.length) {
        const bridge = steppedPath(
          index + 1,
          `${prefix}RecoveryBridge${item}`,
          low.at(-1),
          walk[0],
          bridgeResource,
          variant === "double" ? 34 : variant === "valley" ? 18 : 24,
          {
            profile: variant === "zigzag" ? "zigzag" : variant === "valley" ? "valley" : "arch",
            spacing: 140,
            cloudEvery: 2,
            cloudWidth: 3
          }
        );
        low.push(...bridge.slice(1));
      }
      low.push(...(low.length ? walk.slice(1) : walk));
    }
    const lowEnd = low.at(-1);
    const climbEnd = { x: x + 2940, y: exitY };
    const climbMid = {
      x: x + (variant === "double" ? 2570 : variant === "zigzag" ? 2510 : 2610),
      y: Math.max(
        -650,
        Math.min(
          560,
          lowEnd.y + (climbEnd.y - lowEnd.y) * 0.53 +
            (variant === "valley" ? 68 : variant === "ridge" ? -54 : variant === "steps" ? 28 : 0)
        )
      )
    };
    const climbResource = style === "sky" ? "cloud" : style === "gauntlet" ? "wood" : "mixed";
    const landingResource = climbResource === "wood" ? "wood" : "cloud";
    nodes.push(instanceNode(`${prefix}RecoveryLanding`, "Items/Platforms", landingResource, {
      position: vector(climbMid.x, climbMid.y + (landingResource === "cloud" ? 8 : 7)),
      ...(landingResource === "cloud" ? { width: "4" } : { width: "4" })
    }));
    const climbA = steppedPath(
      index + 1,
      `${prefix}RecoveryClimbA`,
      lowEnd,
      climbMid,
      climbResource,
      variant === "double" ? 66 : 38,
      { profile: variant === "valley" ? "valley" : "steps", spacing: 140, cloudEvery: 2, cloudWidth: 3 }
    );
    const climbB = steppedPath(
      index + 1,
      `${prefix}RecoveryClimbB`,
      climbMid,
      climbEnd,
      climbResource,
      variant === "zigzag" ? 58 : 34,
      { profile: variant === "double" ? "double" : variant === "ridge" ? "arch" : "steps", spacing: 140, cloudEvery: 2, cloudWidth: 3 }
    );
    const route = [...low, ...climbA.slice(1), ...climbB.slice(1)];
    validateRoute(index + 1, route, "recovery");
    guideCoins(`${prefix}Recovery`, route);
    grounded(`${prefix}RecoveryBottle`, "Items/Pickups", "bottle", surfaceIds[1], 0.48, -30);
    grounded(
      `${prefix}RecoveryEnemy`,
      "Items/Enemies",
      style === "rotor" || style === "gauntlet" ? "bobomb" : "goomba",
      surfaceIds[0],
      0.34,
      style === "rotor" || style === "gauntlet" ? -10 : -12
    );
    if (style === "sky" || style === "flight") {
      grounded(`${prefix}RecoveryTree`, "Items/Decoration", "smallTree", surfaceIds[0], 0.72, -38);
    } else {
      grounded(`${prefix}RecoveryRock`, "Items/Platforms", "bigRock", surfaceIds[0], 0.72, -32);
    }
    const boxCount = style === "gauntlet" ? 4 : style === "rotor" ? 2 : 1;
    for (let box = 0; box < boxCount; box += 1) {
      grounded(`${prefix}RecoveryBox${box + 1}`, "Items/Platforms", "box", surfaceIds[2], 0.5 + box * 0.1, -34);
    }
    if (variant === "valley") {
      nodes.push(instanceNode(`${prefix}RecoveryWater`, "Water", "water", {
        position: vector(x + 900, 566),
        polygon: packed([[0, 0], [900, 0], [900, 170], [0, 170]])
      }));
      airborne(`${prefix}RecoveryCheep`, "Items/Enemies", "cheep", x + 1340, 620, {
        "metadata/_llr_waterborne": "true"
      });
    }
    if (style === "rotor" && variant !== "valley") {
      const point = surfacePoint(surfaceIds[2], 0.32);
      nodes.push(instanceNode(`${prefix}RecoveryTippingLog`, "Items/Mechanisms", "tippingLog", {
        position: vector(point.x, point.y + 8),
        width: "4",
        pivot_offset: "-1"
      }));
    }
  }

  function meadow(index, edge) {
    const prefix = `S${index + 1}Meadow`;
    const variant = roomVariant(index);
    const middleY = (stage.heights[index] + stage.heights[index + 1]) / 2 +
      (variant === "valley" ? 76 : variant === "ridge" ? -46 : 0);
    const middleX = edge.x + (variant === "double" ? 1120 : variant === "zigzag" ? 1380 : 1260);
    const middleWidth = variant === "double" ? 820 : variant === "zigzag" ? 590 : 700;
    const middle = addTerrain(
      `${prefix}Middle`,
      middleX,
      middleY,
      middleWidth,
      variant === "valley" ? [0, 18, -8, 0] : variant === "zigzag" ? [0, -32, 24, 0] : [0, -24, 16, 0],
      162
    );
    const walk = surfaceWalk(middle);
    const left = walk[0];
    const right = walk.at(-1);
    const first = steppedPath(
      index + 1,
      `${prefix}A`,
      edge.startPoint,
      left,
      variant === "ridge" ? "mixed" : "wood",
      variant === "double" ? 68 : 34,
      { profile: variant === "valley" ? "valley" : variant, spacing: 155 }
    );
    const second = steppedPath(
      index + 1,
      `${prefix}B`,
      right,
      edge.endPoint,
      "mixed",
      variant === "zigzag" ? 72 : 34,
      { profile: variant === "double" ? "double" : variant, spacing: 155 }
    );
    const route = [...first, ...walk.slice(1), ...second.slice(1)];
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    grounded(`${prefix}BigTree`, "Items/Decoration", "bigTree", edge.start, 0.34, -53);
    grounded(`${prefix}Flowers`, "Items/Decoration", "flowers", middle, 0.5, -10);
    grounded(`${prefix}Goomba1`, "Items/Enemies", "goomba", middle, 0.28, -12);
    grounded(`${prefix}Goomba2`, "Items/Enemies", "goomba", middle, 0.72, -12);
    if (variant === "double" || variant === "zigzag") {
      bonusBranch(index + 1, prefix, left, right, variant === "double" ? 118 : 92, "mixed", variant);
    }
    if (variant === "ridge") {
      const point = route[Math.floor(route.length * 0.7)];
      nodes.push(instanceNode(`${prefix}TippingLog`, "Items/Mechanisms", "tippingLog", {
        position: vector(point.x, point.y + 8),
        width: "4",
        pivot_offset: "-1"
      }));
    }
  }

  function lake(index, edge) {
    const prefix = `S${index + 1}Lake`;
    const variant = roomVariant(index);
    const waterTop = Math.min(
      420,
      Math.max(280, Math.max(stage.heights[index], stage.heights[index + 1]) + 60)
    );
    const basin = addTerrain(`${prefix}Basin`, edge.x + 900, 520, 1120, [0, 10, -8, 0], 184);
    nodes.push(instanceNode(`${prefix}Water`, "Water", "water", {
      position: vector(edge.x + 690, waterTop),
      polygon: packed([[0, 0], [1510, 0], [1510, 220], [0, 220]])
    }));
    let route;
    if (variant === "valley") {
      const waterEntry = { x: edge.x + 840, y: waterTop + 72 };
      const waterMiddle = { x: edge.x + 1540, y: waterTop + 138 };
      const waterExit = { x: edge.x + 2140, y: waterTop + 62 };
      route = sampledPolyline([edge.startPoint, waterEntry, waterMiddle, waterExit, edge.endPoint], 150);
    } else {
      route = steppedPath(
        index + 1,
        `${prefix}Bridge`,
        edge.startPoint,
        edge.endPoint,
        variant === "double" ? "mixed" : "wood",
        variant === "zigzag" ? 112 : 72,
        { profile: variant === "ridge" ? "arch" : variant, spacing: 150, cloudEvery: 4 }
      );
    }
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    airborne(`${prefix}Cheep1`, "Items/Enemies", "cheep", edge.x + 1120, waterTop + 105, { "metadata/_llr_waterborne": "true" });
    airborne(`${prefix}Cheep2`, "Items/Enemies", "cheep", edge.x + 1680, waterTop + 145, { "metadata/_llr_waterborne": "true" });
    grounded(`${prefix}Bottle`, "Items/Pickups", "bottle", basin, 0.5, -30);
    if (variant !== "valley") {
      bonusBranch(index + 1, prefix, { x: edge.x + 880, y: waterTop + 8 }, { x: edge.x + 2040, y: waterTop + 8 }, 84, "cloud", "double");
    }
  }

  function bomb(index, edge) {
    const prefix = `S${index + 1}Bomb`;
    const variant = roomVariant(index);
    const middleY = (stage.heights[index] + stage.heights[index + 1]) / 2;
    const lower = addTerrain(
      `${prefix}Lower`,
      edge.x + (variant === "double" ? 820 : 960),
      middleY + (variant === "valley" ? 155 : 100),
      variant === "double" ? 820 : 680,
      [0, -12, 10, 0],
      174
    );
    const upper = addTerrain(
      `${prefix}Upper`,
      edge.x + (variant === "zigzag" ? 2020 : 1880),
      middleY - (variant === "ridge" ? 165 : 105),
      variant === "zigzag" ? 480 : 570,
      [0, -8, 8, 0],
      164
    );
    const lowerWalk = surfaceWalk(lower);
    const upperWalk = surfaceWalk(upper);
    const lowerL = lowerWalk[0];
    const lowerR = lowerWalk.at(-1);
    const upperL = upperWalk[0];
    const upperR = upperWalk.at(-1);
    const route = [
      ...steppedPath(index + 1, `${prefix}A`, edge.startPoint, lowerL, "wood", variant === "valley" ? 34 : 18, { profile: variant }),
      ...lowerWalk.slice(1),
      ...steppedPath(index + 1, `${prefix}B`, lowerR, upperL, "mixed", variant === "zigzag" ? 54 : 0, { profile: variant, spacing: 150 }).slice(1),
      ...upperWalk.slice(1),
      ...steppedPath(index + 1, `${prefix}C`, upperR, edge.endPoint, "wood", variant === "double" ? 58 : 16, { profile: variant, spacing: 150 }).slice(1)
    ];
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    grounded(`${prefix}Bobomb1`, "Items/Enemies", "bobomb", lower, 0.28, -10);
    grounded(`${prefix}Bobomb2`, "Items/Enemies", "bobomb", lower, 0.72, -10);
    for (let box = 0; box < 4; box += 1) {
      grounded(`${prefix}Box${box + 1}`, "Items/Platforms", "box", upper, 0.18 + box * 0.2, -34);
    }
    if (variant === "double" || variant === "zigzag") {
      bonusBranch(index + 1, prefix, lowerL, upperR, 110, "mixed", variant);
    }
  }

  function fungus(index, edge) {
    const prefix = `S${index + 1}Fungus`;
    const variant = roomVariant(index);
    const route = [edge.startPoint];
    const count = variant === "zigzag" ? 14 : 12;
    for (let step = 1; step < count; step += 1) {
      const progress = step / count;
      const topX = edge.startPoint.x + (edge.endPoint.x - edge.startPoint.x) * progress;
      const baseY = edge.startPoint.y + (edge.endPoint.y - edge.startPoint.y) * progress;
      const topY = baseY + profileOffset(
        variant === "ridge" ? "arch" : variant,
        progress,
        variant === "double" ? 92 : variant === "zigzag" ? 68 : 50
      );
      const rootY = Math.max(topY + 210, 390);
      const stemOriginY = topY + 10;
      nodes.push(instanceNode(`${prefix}Stem${step}`, "Items/Platforms", "fungus", {
        position: vector(topX, stemOriginY),
        points: packed([
          [-6, -3],
          [-5, (rootY - stemOriginY) * 0.34],
          [5, (rootY - stemOriginY) * 0.68],
          [0, rootY - stemOriginY]
        ])
      }));
      route.push({ x: topX, y: topY });
    }
    route.push(edge.endPoint);
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    grounded(`${prefix}Fludd`, "Items/Pickups", "fludd", edge.start, 0.72, -17, { nozzle: "1" });
    airborne(`${prefix}Parakoopa`, "Items/Enemies", "parakoopa", edge.x + 1850, Math.max(-700, (edge.startPoint.y + edge.endPoint.y) / 2 - 170));
    if (variant === "double") {
      const center = route[Math.floor(route.length / 2)];
      airborne(`${prefix}BlueCoin`, "Items/Pickups", "blueCoin", center.x, Math.max(-720, center.y - 96));
    }
  }

  function sky(index, edge, flight = false) {
    const prefix = `S${index + 1}${flight ? "Flight" : "Sky"}`;
    const variant = roomVariant(index);
    const route = steppedPath(
      index + 1,
      `${prefix}Main`,
      edge.startPoint,
      edge.endPoint,
      flight && variant === "zigzag" ? "mixed" : "cloud",
      flight ? (variant === "double" ? 138 : 92) : (variant === "valley" ? 92 : 118),
      {
        profile: variant === "ridge" ? "arch" : variant,
        spacing: flight ? 145 : 155,
        cloudEvery: 2,
        cloudWidth: variant === "double" ? 4 : 2
      }
    );
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    recovery(index, stage.heights[index + 1], prefix, variant, flight ? "flight" : "sky");
    const enemy = flight ? "goonie" : "parakoopa";
    for (let item = 0; item < 4; item += 1) {
      const point = route[Math.min(route.length - 2, 2 + item * 2)];
      airborne(`${prefix}Enemy${item + 1}`, "Items/Enemies", enemy, point.x + 52, Math.max(-720, point.y - 142 - (item % 2) * 42));
    }
    if (variant === "double" || variant === "zigzag") {
      bonusBranch(
        index + 1,
        prefix,
        route[Math.floor(route.length * 0.22)],
        route[Math.floor(route.length * 0.78)],
        flight ? 86 : 104,
        "cloud",
        variant === "zigzag" ? "double" : "zigzag"
      );
    }
  }

  function rotor(index, edge) {
    const prefix = `S${index + 1}Rotor`;
    const variant = roomVariant(index);
    const route = steppedPath(
      index + 1,
      `${prefix}Safe`,
      edge.startPoint,
      edge.endPoint,
      variant === "double" ? "mixed" : "wood",
      variant === "zigzag" ? 118 : variant === "valley" ? 76 : 62,
      { profile: variant === "ridge" ? "arch" : variant, spacing: 150, cloudEvery: 4 }
    );
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    const mechanismProgress = variant === "double" ? [0.2, 0.4, 0.62, 0.82] : [0.28, 0.52, 0.76];
    mechanismProgress.forEach((progress, item) => {
      const point = route[Math.round(progress * (route.length - 1))];
      airborne(`${prefix}Block${item + 1}`, "Items/Mechanisms", "rotating", point.x, point.y - 105, {
        size: vector(76, 76),
        speed: fmt((item % 2 === 0 ? 1 : -1) * (1.05 + stage.id * 0.03)),
        wait: "64",
        type: "1"
      });
    });
    airborne(`${prefix}Pivot`, "Items/Mechanisms", "pivot", edge.x + 1780, Math.max(-700, (edge.startPoint.y + edge.endPoint.y) / 2 - 165), {
      radius: "78",
      count: "3",
      speed: fmt(8 + stage.id * 0.35),
      offset: "0.6"
    });
    if (variant === "zigzag") {
      const point = route[Math.floor(route.length / 2)];
      nodes.push(instanceNode(`${prefix}TippingGate`, "Items/Mechanisms", "tippingLog", {
        position: vector(point.x, point.y + 8),
        width: "5",
        pivot_offset: "2"
      }));
    }
    recovery(index, stage.heights[index + 1], prefix, variant, "rotor");
  }

  function gauntlet(index, edge, finale = false) {
    const prefix = `S${index + 1}${finale ? "Finale" : "Gauntlet"}`;
    const variant = finale ? "zigzag" : roomVariant(index);
    const middleY = (stage.heights[index] + stage.heights[index + 1]) / 2 +
      (variant === "valley" ? 92 : variant === "ridge" ? -70 : 0);
    const middle = addTerrain(
      `${prefix}Middle`,
      edge.x + (variant === "double" ? 1120 : 1280),
      middleY,
      variant === "double" ? 790 : 620,
      variant === "zigzag" ? [0, -34, 26, 0] : [0, -18, 14, 0],
      168
    );
    const walk = surfaceWalk(middle);
    const left = walk[0];
    const right = walk.at(-1);
    const route = [
      ...steppedPath(
        index + 1,
        `${prefix}A`,
        edge.startPoint,
        left,
        "mixed",
        finale ? 112 : variant === "double" ? 94 : 68,
        { profile: variant, spacing: 145, cloudEvery: 3 }
      ),
      ...walk.slice(1),
      ...steppedPath(
        index + 1,
        `${prefix}B`,
        right,
        edge.endPoint,
        finale ? "cloud" : "wood",
        finale ? 126 : variant === "zigzag" ? 96 : 52,
        { profile: finale ? "double" : variant, spacing: 145 }
      ).slice(1)
    ];
    validateRoute(index + 1, route);
    guideCoins(prefix, route);
    grounded(`${prefix}Goomba`, "Items/Enemies", "goomba", middle, 0.28, -12);
    grounded(`${prefix}Bobomb`, "Items/Enemies", "bobomb", middle, 0.7, -10);
    airborne(`${prefix}Parakoopa`, "Items/Enemies", "parakoopa", edge.x + 2250, Math.max(-700, middleY - 190));
    airborne(`${prefix}Rotor`, "Items/Mechanisms", "rotating", edge.x + 2380, Math.max(-700, middleY - 125), {
      size: vector(82, 82),
      speed: finale ? "1.55" : "1.25",
      wait: finale ? "48" : "60",
      type: "1"
    });
    if (variant === "double" || finale) {
      bonusBranch(index + 1, prefix, left, right, finale ? 138 : 102, "mixed", finale ? "zigzag" : "double");
    }
    recovery(index, stage.heights[index + 1], prefix, variant, "gauntlet");
  }

  function room(index, theme) {
    const entryY = stage.heights[index];
    const exitY = stage.heights[index + 1];
    roomMarker(index, theme, entryY, exitY);
    const edge = boundaries(index, entryY, exitY);
    if (theme === "meadow") meadow(index, edge);
    else if (theme === "lake") lake(index, edge);
    else if (theme === "bomb") bomb(index, edge);
    else if (theme === "fungus") fungus(index, edge);
    else if (theme === "sky") sky(index, edge);
    else if (theme === "flight") sky(index, edge, true);
    else if (theme === "rotor") rotor(index, edge);
    else if (theme === "gauntlet") gauntlet(index, edge);
    else if (theme === "finale") gauntlet(index, edge, true);
    else throw new Error(`Unknown room theme: ${theme}`);
  }

  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background"));
  nodes.push(instanceNode("CameraArea", ".", "camera", {
    visible: "false",
    polygon: packed([[-180, -820], [levelWidth + 180, -820], [levelWidth + 180, 760], [-180, 760]])
  }));
  nodes.push(plainNode("Terrain", "Node2D"));
  nodes.push(plainNode("Items", "Node2D"));
  for (const group of ["Coins", "Enemies", "Platforms", "Mechanisms", "Pickups", "Decoration"]) {
    nodes.push(plainNode(group, "Node2D", "Items"));
  }
  nodes.push(plainNode("Water", "Node2D"));
  nodes.push(plainNode("Route", "Node2D"));

  for (let index = 0; index < 10; index += 1) room(index, stage.themes[index]);

  grounded("LevelIntro", "Items", "sign", "S1Start", 0.48, -3, {
    lines: `Array[String]([${JSON.stringify(`[@n,老师快跑]${stage.title}`)}, ${JSON.stringify("沿金币和平台前进。高空失足会落到回收路线，并可重新爬回主线。")}])`
  });
  const spawn = surfacePoint("S1Start", 0.22);
  nodes.push(instanceNode("Player", ".", "player", { position: vector(spawn.x, spawn.y - 58) }));

  if (mainEstimatedSeconds < 180) {
    throw new Error(`Level ${stage.id}: estimated main flow too short (${fmt(mainEstimatedSeconds)}s)`);
  }

  const nextScene = stage.id < stages.length ? stages[stage.id].resource : mainMenuResource;
  nodes.push(instanceNode("FinishWarp", ".", "warp", {
    position: vector(levelWidth - 58, stage.heights.at(-1) - 70),
    sweep_direction: vector(-1, 0),
    spawn_location: stage.id < stages.length ? vector(130, stages[stage.id].heights[0] - 58) : vector(110, 153),
    scene_path: JSON.stringify(nextScene),
    size: vector(76, 340)
  }));
  nodes.push(instanceNode("VoidRescue", ".", "death", {
    visible: "false",
    position: vector(0, 900),
    polygon: packed([[-500, 0], [levelWidth + 1000, 0], [levelWidth + 1000, 450], [-500, 450]])
  }));
  airborne("FinishBlueCoin", "Items/Pickups", "blueCoin", levelWidth - 310, stage.heights.at(-1) - 62);

  const extResources = Object.entries(resources)
    .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
    .join("\n");
  nodes.push(`${plainNode("LLRFlowMetrics", "Node", ".").trimEnd()}
metadata/_llr_main_seconds = ${fmt(mainEstimatedSeconds)}
metadata/_llr_recovery_seconds = ${fmt(recoveryEstimatedSeconds)}
`);
  return `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
}
