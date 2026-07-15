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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, progress) {
  return a + (b - a) * progress;
}

function nodePaths(paths) {
  return `Array[NodePath]([${paths.map((path) => `NodePath(${JSON.stringify(path)})`).join(", ")}])`;
}

export const V4_STAGE_ONE_BLUEPRINT = {
  id: 1,
  title: "1 风车牧场 · V4",
  description: "借风车换层、溪谷双路线、风向反转与暴雨下山",
  tint: "Color(0.94, 0.98, 0.9, 1)",
  spawnY: 260,
  levelWidth: 25000,
  beats: [
    {
      id: 1,
      name: "晨雾岔路",
      topology: "braided-vista",
      startX: 0,
      endX: 2300,
      seconds: 18,
      act: 1,
      cadence: "introduction",
      mechanics: ["terrain", "branch", "spring"],
      event: "同时看见宽低路和短高路，并在风车前重汇",
      failure: "高路失足落到仍向前的低路",
      input: "direction+one-action",
      stateChange: false
    },
    {
      id: 2,
      name: "慢轮教学",
      topology: "wheel-basin",
      startX: 2300,
      endX: 5000,
      seconds: 22,
      act: 1,
      cadence: "introduction",
      mechanics: ["pivot", "spring", "mushroom"],
      event: "乘慢轮升高，在宽接台下车；蘑菇阶提供稳定备用路线",
      failure: "落到底部草盆后由弹簧返回",
      input: "direction+one-action",
      stateChange: false
    },
    {
      id: 3,
      name: "倒木溪谷",
      topology: "water-dual-route",
      startX: 5000,
      endX: 8300,
      seconds: 28,
      act: 2,
      cadence: "development",
      mechanics: ["water", "tipping_log", "falling_log", "cheep"],
      event: "倾斜木快路和可游泳稳路并行，玩家主动决定风险",
      failure: "上路失足进入水路后，可从左右连续台阶回到岸上，不需要掉入虚空重生",
      input: "direction+one-action",
      stateChange: false
    },
    {
      id: 4,
      name: "风车内塔",
      topology: "vertical-spiral",
      startX: 8300,
      endX: 11200,
      seconds: 12,
      act: 2,
      cadence: "development",
      mechanics: ["pivot", "spring", "mushroom", "checkpoint"],
      event: "枢轴轮、静态台和弹簧分段接力完成垂直攀升",
      failure: "每层都有静态接台，底层可重新开始当前塔",
      input: "direction+one-action",
      stateChange: false
    },
    {
      id: 5,
      name: "三层果园",
      topology: "three-lane-weave",
      startX: 11200,
      endX: 14850,
      seconds: 32,
      act: 2,
      cadence: "development",
      mechanics: ["branch", "enemy", "spring", "blue_coin"],
      event: "根据敌人、坡度和奖励两次安全换层",
      failure: "高路失足落入持续向前的果园低路",
      input: "direction+one-action",
      stateChange: false
    },
    {
      id: 6,
      name: "风向反转",
      topology: "state-change-wheel",
      startX: 14850,
      endX: 17500,
      seconds: 30,
      act: 2,
      cadence: "twist",
      mechanics: ["director", "pivot", "spring", "checkpoint"],
      event: "玩家看见旧转向后触发风向反转，原高奖励线变成稳定主路",
      failure: "底部草场和弹簧始终可回到高路",
      input: "direction+one-action",
      stateChange: true
    },
    {
      id: 7,
      name: "暴雨下山",
      topology: "layered-descent",
      startX: 17500,
      endX: 21600,
      seconds: 40,
      act: 3,
      cadence: "twist",
      mechanics: ["falling_log", "tipping_log", "pivot", "water", "director"],
      event: "暴雨压暗场景，玩家沿大地形、倒木和两座风轮受控下降",
      failure: "全程下方溪流继续向前，并有两处弹簧回升",
      input: "direction+one-action",
      stateChange: true
    },
    {
      id: 8,
      name: "丰收铃台",
      topology: "three-wheel-resolution",
      startX: 21600,
      endX: 25000,
      seconds: 22,
      act: 3,
      cadence: "resolution",
      mechanics: ["pivot", "terrain", "finish"],
      event: "三座风轮依次送玩家登上铃台，风雨停止后安全收束",
      failure: "所有风轮下方都有完整地面",
      input: "direction+one-action",
      stateChange: true
    }
  ]
};

export function buildV4StageOneScene({
  stage,
  stages,
  resources,
  resourceIds,
  mainMenuResource
}) {
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

  function addTerrain(id, x, y, width, profile = [0, 0, 0, 0], depth = 180) {
    if (width > 900) throw new Error(`${id}: V4 terrain width exceeds 900 (${width})`);
    const topMin = Math.min(...profile);
    const topMax = Math.max(...profile);
    if (depth <= topMax + 36) depth = topMax + 60;
    if (depth - topMin > 210) depth = topMin + 210;
    if (depth <= topMax + 36) {
      throw new Error(`${id}: V4 terrain profile is too steep for a safe body`);
    }
    if (depth - topMin < 130 || depth - topMin > 210) {
      throw new Error(`${id}: invalid V4 terrain depth ${depth - topMin}`);
    }
    const step = width / (profile.length - 1);
    const points = profile.map((offset, index) => ({ x: x + index * step, y: y + offset }));
    nodes.push(instanceNode(id, "Terrain", "terrain", {
      z_index: "1",
      position: vector(x, y),
      polygon: packed([
        ...profile.map((offset, index) => [index * step, offset]),
        [width, depth],
        [0, depth]
      ])
    }));
    surfaces.set(id, { id, x, y, width, points });
    return id;
  }

  function addTerrainPolygon(id, x, y, topPoints, bottomY) {
    if (topPoints.length < 2 || bottomY <= Math.max(...topPoints.map((point) => point[1])) + 36) {
      throw new Error(`${id}: invalid structural terrain polygon`);
    }
    for (let index = 1; index < topPoints.length; index += 1) {
      if (topPoints[index][0] < topPoints[index - 1][0]) {
        throw new Error(`${id}: structural terrain top must move left-to-right`);
      }
    }
    const width = topPoints.at(-1)[0];
    nodes.push(instanceNode(id, "Terrain", "terrain", {
      z_index: "1",
      position: vector(x, y),
      polygon: packed([...topPoints, [width, bottomY], [0, bottomY]]),
      "metadata/_llr_structural_terrain": "true",
      "metadata/_llr_deep_structural_terrain": bottomY > 210 ? "true" : "false"
    }));
    surfaces.set(id, {
      id,
      x,
      y,
      width,
      points: topPoints.map(([pointX, pointY]) => ({ x: x + pointX, y: y + pointY }))
    });
    return id;
  }

  function surfacePoint(id, t) {
    const surface = surfaces.get(id);
    if (!surface) throw new Error(`Unknown V4 surface ${id}`);
    const targetX = surface.x + surface.width * clamp(t, 0, 1);
    for (let index = 1; index < surface.points.length; index += 1) {
      const left = surface.points[index - 1];
      const right = surface.points[index];
      if (targetX > right.x) continue;
      const progress = (targetX - left.x) / Math.max(1, right.x - left.x);
      return { x: targetX, y: lerp(left.y, right.y, progress) };
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
    return { x: anchor.x, y: anchor.y + offset };
  }

  function airborne(name, parent, resource, x, y, properties = {}) {
    if (y < -760 || y > 720) throw new Error(`${name}: V4 airborne y outside camera (${y})`);
    nodes.push(instanceNode(name, parent, resource, {
      position: vector(x, y),
      ...properties,
      "metadata/_llr_airborne": "true"
    }));
    return { x, y };
  }

  function sampledLine(start, end, spacing = 165) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const count = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dy) / spacing),
      Math.ceil(Math.abs(dx) / 205),
      dy < 0 ? Math.ceil(Math.abs(dy) / 82) : Math.ceil(dy / 165)
    );
    return Array.from({ length: count + 1 }, (_, index) => ({
      x: lerp(start.x, end.x, index / count),
      y: lerp(start.y, end.y, index / count)
    }));
  }

  function sampledPolyline(points, spacing = 165) {
    const result = [];
    for (let index = 1; index < points.length; index += 1) {
      const section = sampledLine(points[index - 1], points[index], spacing);
      result.push(...(result.length ? section.slice(1) : section));
    }
    return result;
  }

  function recordRoute(beat, kind, waypoints, options = {}) {
    const route = sampledPolyline(waypoints, options.spacing || 165);
    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (Math.abs(dx) > 215 || dy < -92 || dy > 180 || Math.hypot(dx, dy) > 235) {
        throw new Error(`V4 beat ${beat.id}/${kind}: unreachable step dx=${fmt(dx)} dy=${fmt(dy)}`);
      }
    }
    routeSerial += 1;
    nodes.push(`${plainNode(`LLRRoute${String(routeSerial).padStart(3, "0")}`, "Node", "Route").trimEnd()}
metadata/_llr_room = ${beat.id}
metadata/_llr_beat = ${beat.id}
metadata/_llr_kind = ${JSON.stringify(kind)}
metadata/_llr_set_piece = ${JSON.stringify(beat.name)}
metadata/_llr_points = ${packed(route.map((point) => [point.x, point.y]))}
`);
    if (kind === "main") mainEstimatedSeconds += beat.seconds;
    if (kind === "recovery") recoveryEstimatedSeconds += options.recoverySeconds || 12;
    if (options.coins !== false) addGuideCoins(`B${beat.id}${kind}`, route, options.coinLimit || 6);
    return route;
  }

  function addGuideCoins(prefix, route, limit) {
    if (route.length < 3 || limit <= 0) return;
    const step = Math.max(2, Math.floor(route.length / (limit + 1)));
    let count = 0;
    for (let index = step; index < route.length - 1 && count < limit; index += step) {
      const point = route[index];
      airborne(`${prefix}Coin${count + 1}`, "Items/Coins", "coin", point.x, point.y - 44);
      count += 1;
    }
  }

  function addBeatMarker(beat) {
    nodes.push(`${plainNode(`LLRBeat${String(beat.id).padStart(2, "0")}_${beat.topology}`, "Node2D").trimEnd()}
position = ${vector(beat.startX, 0)}
metadata/_llr_beat = ${beat.id}
metadata/_llr_start_x = ${beat.startX}
metadata/_llr_end_x = ${beat.endX}
metadata/_llr_geometry_version = 4
metadata/_llr_act = ${beat.act}
metadata/_llr_cadence = ${JSON.stringify(beat.cadence)}
metadata/_llr_set_piece = ${JSON.stringify(beat.name)}
metadata/_llr_topology = ${JSON.stringify(beat.topology)}
metadata/_llr_mechanics = ${JSON.stringify(beat.mechanics.join(","))}
metadata/_llr_player_event = ${JSON.stringify(beat.event)}
metadata/_llr_failure_route = ${JSON.stringify(beat.failure)}
metadata/_llr_input_budget = ${JSON.stringify(beat.input)}
metadata/_llr_state_change = ${beat.stateChange}
metadata/_llr_target_seconds = ${beat.seconds}
`);
  }

  function addPivot(name, x, y, radius, speed, offset = 0, count = 4) {
    return airborne(name, "Items/Mechanisms", "pivot", x, y, {
      radius: fmt(radius),
      count: fmt(count),
      speed: fmt(speed),
      offset: fmt(offset)
    });
  }

  function addShuttle(name, x, y, travel, travelSeconds = 3.4, phase = 0) {
    const walkableWidth = 168;
    return {
      ...airborne(name, "Items/Mechanisms", "shuttle", x, y, {
        scale: vector(2, 1),
        travel: vector(travel.x, travel.y),
        travel_seconds: fmt(travelSeconds),
        pause_seconds: "0.6",
        phase: fmt(phase),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addCloud(name, x, y, width = 5) {
    const walkableWidth = 16 * width + 15;
    return {
      ...airborne(name, "Items/Platforms", "cloud", x, y, {
        width: fmt(width),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addWood(name, x, y, width = 5) {
    const walkableWidth = 32 * width;
    return {
      ...airborne(name, "Items/Platforms", "wood", x, y, {
        scale: vector(width / 2, 1),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addFungus(name, x, y, stemDepth = 150, widthScale = 3) {
    const walkableWidth = 56 * widthScale;
    return {
      ...airborne(name, "Items/Platforms", "fungus", x, y, {
        scale: vector(widthScale, 1),
        points: packed([[-6, -3], [-8, stemDepth * 0.35], [6, stemDepth * 0.7], [0, stemDepth]]),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addTippingLog(name, x, y, width = 6, pivotOffset = 0) {
    const walkableWidth = 32 * width + 3;
    return {
      ...airborne(name, "Items/Mechanisms", "tippingLog", x, y + 8, {
        width: fmt(width),
        pivot_offset: fmt(pivotOffset),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      x,
      y,
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addFallingLog(name, x, y, waitTime = 82, lifetime = 105) {
    const walkableWidth = 16;
    return {
      ...airborne(name, "Items/Mechanisms", "fallingLog", x, y + 7, {
        wait_time: fmt(waitTime),
        lifetime: fmt(lifetime),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      x,
      y,
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function assertConservativePlatformChain(
    name,
    platforms,
    { maxGap = 96, maxRise = 72, minLandingWidth = 144 } = {}
  ) {
    for (let index = 1; index < platforms.length; index += 1) {
      const previous = platforms[index - 1];
      const current = platforms[index];
      const openGap = current.x - current.halfWidth - (previous.x + previous.halfWidth);
      const upwardRise = previous.y - current.y;
      if (openGap > maxGap || upwardRise > maxRise) {
        throw new Error(
          `${name}: extreme jump ${index} gap=${fmt(openGap)} rise=${fmt(upwardRise)}`
        );
      }
    }
    for (const platform of platforms) {
      if (platform.walkableWidth != null && platform.walkableWidth < minLandingWidth) {
        throw new Error(
          `${name}: narrow landing width=${fmt(platform.walkableWidth)} minimum=${fmt(minLandingWidth)}`
        );
      }
    }
  }

  function addWater(name, x, y, width, height = 360) {
    nodes.push(instanceNode(name, "Water", "water", {
      position: vector(x, y),
      polygon: packed([[0, 0], [width, 0], [width, height], [0, height]])
    }));
  }

  function addDirector(name, x, y, properties = {}) {
    nodes.push(instanceNode(name, ".", "director", {
      position: vector(x, y),
      trigger_size: vector(properties.width || 220, properties.height || 190),
      announcement: JSON.stringify(properties.announcement || ""),
      checkpoint: properties.checkpoint === false ? "false" : "true",
      ...(properties.targets?.length ? { target_paths: nodePaths(properties.targets) } : {}),
      ...(properties.reveal?.length ? { reveal_paths: nodePaths(properties.reveal) } : {}),
      ...(properties.hide?.length ? { hide_paths: nodePaths(properties.hide) } : {}),
      ...(properties.multiplier != null ? { numeric_multiplier: fmt(properties.multiplier) } : {})
    }));
  }

  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background", { modulate: stage.tint }));
  nodes.push(instanceNode("CameraArea", ".", "camera", {
    visible: "false",
    polygon: packed([[-180, -820], [stage.levelWidth + 180, -820], [stage.levelWidth + 180, 760], [-180, 760]])
  }));
  nodes.push(`${plainNode("StormTint", "CanvasModulate").trimEnd()}
visible = false
color = Color(0.72, 0.8, 0.92, 1)
`);
  nodes.push(plainNode("Terrain", "Node2D"));
  nodes.push(plainNode("Items", "Node2D"));
  for (const group of ["Coins", "Enemies", "Platforms", "Mechanisms", "Pickups", "Decoration"]) {
    nodes.push(plainNode(group, "Node2D", "Items"));
  }
  nodes.push(plainNode("Water", "Node2D"));
  nodes.push(plainNode("Route", "Node2D"));
  for (const beat of stage.beats) addBeatMarker(beat);

  const b1a = addTerrain("B1Start", -40, 260, 780, [0, -50, -20, 0]);
  const b1b = addTerrain("B1LowA", 720, 290, 700, [0, 14, -18, 0]);
  const b1c = addTerrain("B1LowB", 1400, 310, 520, [0, -18, 6, 0]);
  const b1d = addTerrainPolygon(
    "B1Rejoin",
    1900,
    220,
    [[0, 45], [80, 45], [80, 0], [420, 0]],
    180
  );
  grounded("B1HighSpring", "Items/Mechanisms", "spring", b1a, 0.82, -8, {
    launch_speed: "9.2",
    horizontal_boost: "2.4"
  });
  const b1HighCloud1 = addCloud("B1HighCloud1", 900, 80, 9);
  const b1HighWood = addWood("B1HighWood", 1220, 38, 10);
  const b1HighCloud2 = addCloud("B1HighCloud2", 1540, 92, 9);
  const b1HighCloud3 = addCloud("B1HighCloud3", 1740, 140, 9);
  assertConservativePlatformChain("B1HighRoute", [
    b1HighCloud1,
    b1HighWood,
    b1HighCloud2,
    b1HighCloud3,
    { ...surfacePoint(b1d, 0), halfWidth: 0 }
  ]);
  addPivot("B1WindmillLandmark", 2070, 72, 84, 3.2, 0.4);
  grounded("B1Goomba1", "Items/Enemies", "goomba", b1b, 0.55, -12);
  grounded("B1Flowers", "Items/Decoration", "flowers", b1c, 0.32, -10);
  grounded("B1SmallTree", "Items/Decoration", "smallTree", b1d, 0.74, -38);
  recordRoute(stage.beats[0], "main", [
    { x: 120, y: 250 }, { x: 650, y: 238 }, { x: 1080, y: 296 },
    { x: 1620, y: 298 }, { x: 1900, y: 265 }, { x: 1980, y: 220 },
    { x: 2180, y: 214 }
  ]);
  recordRoute(stage.beats[0], "bonus", [
    { x: 600, y: 220 }, { x: 900, y: 80 }, { x: 1220, y: 38 },
    { x: 1540, y: 92 }, { x: 1740, y: 140 }, { x: 1900, y: 265 },
    { x: 2070, y: 220 }
  ], { coinLimit: 4 });

  const b2a = addTerrain("B2Approach", 2300, 220, 780, [0, -18, 8, 0]);
  const b2bottom = addTerrain("B2SafetyBasin", 3060, 340, 780, [0, 12, -8, 0]);
  const b2landing = addTerrain("B2HighLanding", 3690, 20, 780, [0, -12, 8, 0]);
  const b2exit = addTerrain("B2Exit", 4440, 100, 580, [0, 14, -8, 0]);
  addPivot("B2TeachingWheel", 3400, 150, 120, 4.2, 0.72);
  grounded("B2FallbackSpring", "Items/Mechanisms", "spring", b2bottom, 0.64, -8, {
    launch_speed: "10.2",
    horizontal_boost: "2.1"
  });
  // Three staggered, wide recovery ledges replace the former seven-piece
  // mushroom/cloud ladder. Missing the wheel remains recoverable, but the
  // player now has to make three readable jumps instead of walking up a wall
  // of overlapping platforms.
  addCloud("B2RecoveryStep1", 3240, 250, 10);
  addCloud("B2RecoveryStep2", 3420, 160, 10);
  addCloud("B2RecoveryStep3", 3600, 70, 10);
  nodes.push(`${plainNode("B2SafeRecoveryContract", "Node", "Route").trimEnd()}
metadata/_llr_vertical_step_count = 3
metadata/_llr_max_upward_rise = 90
metadata/_llr_void_required = false
metadata/_llr_min_landing_width = 175
metadata/_llr_redundant_platforms_removed = 4
`);
  grounded("B2Flowers", "Items/Decoration", "flowers", b2landing, 0.58, -10);
  recordRoute(stage.beats[1], "main", [
    { x: 2340, y: 218 }, { x: 2960, y: 220 }, { x: 3240, y: 190 },
    { x: 3400, y: 30 }, { x: 3720, y: 18 }, { x: 4300, y: 58 }, { x: 4920, y: 98 }
  ]);
  recordRoute(stage.beats[1], "recovery", [
    { x: 2950, y: 235 }, { x: 3200, y: 338 }, { x: 3240, y: 250 },
    { x: 3420, y: 160 }, { x: 3600, y: 70 }, { x: 3720, y: 20 },
    { x: 4010, y: 25 }
  ], { recoverySeconds: 10, coinLimit: 3 });

  const b3shoreA = addTerrain("B3ShoreA", 4980, 100, 620, [0, 12, -8, 0]);
  const b3islandA = addTerrain("B3WaterbedA", 5700, 430, 650, [0, -14, 10, 0]);
  const b3islandB = addTerrain("B3WaterbedB", 6320, 480, 650, [0, 12, -8, 0]);
  const b3islandC = addTerrain("B3WaterbedC", 6940, 420, 760, [0, -10, 14, 0]);
  const b3shoreB = addTerrain("B3ShoreB", 7670, 80, 700, [0, 14, -8, 0]);
  addTerrainPolygon(
    "B3LeftWaterStairBank",
    5520,
    100,
    [
      [0, 0], [80, 0], [80, 20], [140, 20], [140, 70], [200, 70],
      [200, 120], [260, 120], [260, 170], [320, 170], [320, 220],
      [380, 220], [380, 270], [440, 270], [440, 320], [500, 320]
    ],
    500
  );
  addTerrainPolygon(
    "B3RightWaterStairBank",
    7250,
    80,
    [
      [0, 340], [60, 340], [60, 290], [120, 290], [120, 240],
      [180, 240], [180, 190], [240, 190], [240, 140], [300, 140],
      [300, 90], [360, 90], [360, 40], [420, 40], [420, 0], [510, 5]
    ],
    520
  );
  addWater("B3CreekWater", 5520, 220, 2240, 380);
  const b3UpperApproach = addWood("B3UpperApproach", 5660, 126, 5);
  const b3UpperTipping1 = addTippingLog("B3UpperTipping1", 5925, 82, 7, -1);
  const b3UpperRest = addWood("B3UpperRest", 6220, 24, 7);
  const b3UpperTipping2 = addTippingLog("B3UpperTipping2", 6510, 42, 7, 1);
  const b3UpperBridge3 = addWood("B3UpperBridge3", 6800, 70, 5);
  const b3UpperFallingSafety = addWood("B3UpperFallingSafety", 7060, 120, 6);
  addFallingLog("B3UpperFalling", 7060, 78, 88, 112);
  const b3UpperExitCloud = addCloud("B3UpperExitCloud", 7330, 50, 9);
  const b3UpperExit = addWood("B3UpperExit", 7525, 78, 5);
  const b3ShoreStart = surfacePoint(b3shoreA, 1);
  const b3ShoreEnd = surfacePoint(b3shoreB, 0);
  assertConservativePlatformChain("B3UpperRoute", [
    { ...b3ShoreStart, halfWidth: 0 },
    b3UpperApproach,
    b3UpperTipping1,
    b3UpperRest,
    b3UpperTipping2,
    b3UpperBridge3,
    b3UpperFallingSafety,
    b3UpperExitCloud,
    b3UpperExit,
    { ...b3ShoreEnd, halfWidth: 0 }
  ], { maxGap: 100, maxRise: 76, minLandingWidth: 159 });
  nodes.push(`${plainNode("B3SafeTraversalContract", "Node", "Route").trimEnd()}
metadata/_llr_max_open_gap = 100
metadata/_llr_max_upward_rise = 76
metadata/_llr_min_landing_width = 159
metadata/_llr_optional_platform_count = 8
metadata/_llr_water_return_stairs = true
metadata/_llr_void_required = false
`);
  airborne("B3Cheep", "Items/Enemies", "cheep", 6500, 330, { "metadata/_llr_waterborne": "true" });
  grounded("B3Bottle", "Items/Pickups", "bottle", b3shoreB, 0.28, -30);
  recordRoute(stage.beats[2], "main", [
    { x: 5020, y: 98 }, { x: 5520, y: 100 }, { x: 5600, y: 120 },
    { x: 5660, y: 170 }, { x: 5720, y: 220 }, { x: 5780, y: 270 },
    { x: 5840, y: 320 }, { x: 5900, y: 370 }, { x: 5960, y: 420 },
    { x: 6250, y: 420 }, { x: 6750, y: 430 }, { x: 7250, y: 420 },
    { x: 7310, y: 370 }, { x: 7370, y: 320 }, { x: 7430, y: 270 },
    { x: 7490, y: 220 }, { x: 7550, y: 170 }, { x: 7610, y: 120 },
    { x: 7670, y: 80 }, { x: 8270, y: 80 }
  ]);
  recordRoute(stage.beats[2], "bonus", [
    { x: 5380, y: 90 }, { x: 5660, y: 126 }, { x: 5925, y: 82 },
    { x: 6220, y: 24 }, { x: 6510, y: 42 }, { x: 6800, y: 70 },
    { x: 7060, y: 120 }, { x: 7330, y: 50 }, { x: 7525, y: 78 },
    { x: 7920, y: 78 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[2], "recovery", [
    { x: 6120, y: 410 }, { x: 5960, y: 420 }, { x: 5900, y: 370 },
    { x: 5840, y: 320 }, { x: 5780, y: 270 }, { x: 5720, y: 220 },
    { x: 5660, y: 170 }, { x: 5600, y: 120 }, { x: 5520, y: 100 },
    { x: 5440, y: 100 }
  ], { recoverySeconds: 8, coins: false });

  const b4entry = addTerrain("B4Entry", 8300, 80, 620, [0, -10, 8, 0]);
  const b4bottom = addTerrain("B4Bottom", 8750, 520, 850, [0, -12, 10, 0]);
  // The lower wheel remains a faster route, but it must never be the only way
  // out of the basin. This sealed stair bank replaces the former 340px wall.
  // Seven broad steps let touch players simply move and jump to recover.
  const b4mid = addTerrainPolygon(
    "B4TowerExitStairBank",
    9100,
    180,
    [
      [0, 330], [70, 330],
      [70, 280], [140, 280],
      [140, 230], [210, 230],
      [210, 180], [280, 180],
      [280, 130], [350, 130],
      [350, 80], [420, 80],
      [420, 30], [490, 30],
      [490, 0], [900, 0]
    ],
    540
  );
  const b4upper = addTerrain("B4Upper", 9900, -80, 600, [0, -10, 8, 0]);
  const b4top = addTerrain("B4Top", 10400, -380, 650, [0, 10, -8, 0]);
  const b4exit = addTerrain("B4Exit", 10900, -220, 420, [0, -10, 0]);
  addPivot("B4LowerWheel", 9100, 360, 112, 4.6, 0.4);
  nodes.push(`${plainNode("B4SafeTowerExitContract", "Node", "Route").trimEnd()}
metadata/_llr_exit_stairs = true
metadata/_llr_stair_count = 7
metadata/_llr_max_step_rise = 50
metadata/_llr_min_tread_width = 70
metadata/_llr_dynamic_mechanism_required = false
metadata/_llr_void_required = false
`);
  grounded("B4TowerSpring", "Items/Mechanisms", "spring", b4mid, 0.62, -8, {
    launch_speed: "10.5",
    horizontal_boost: "1.4"
  });
  addFungus("B4UpperMushroom", 9820, 36, 160);
  addPivot("B4UpperWheel", 10240, -228, 118, 4.9, 1.1);
  addCloud("B4TopSafety", 10420, -330, 9);
  addDirector("B4TowerCheckpoint", 11040, -260, {
    announcement: "风车塔已通过",
    checkpoint: true,
    width: 240,
    height: 220,
    multiplier: 1
  });
  recordRoute(stage.beats[3], "main", [
    { x: 8320, y: 78 }, { x: 8720, y: 180 }, { x: 8880, y: 500 },
    { x: 9100, y: 248 }, { x: 9380, y: 178 }, { x: 9740, y: 170 },
    { x: 9970, y: -82 }, { x: 10240, y: -346 }, { x: 10480, y: -382 },
    { x: 11080, y: -220 }
  ]);
  recordRoute(stage.beats[3], "recovery", [
    { x: 8760, y: 500 }, { x: 9100, y: 510 },
    { x: 9170, y: 510 }, { x: 9170, y: 460 },
    { x: 9240, y: 460 }, { x: 9240, y: 410 },
    { x: 9310, y: 410 }, { x: 9310, y: 360 },
    { x: 9380, y: 360 }, { x: 9380, y: 310 },
    { x: 9450, y: 310 }, { x: 9450, y: 260 },
    { x: 9520, y: 260 }, { x: 9520, y: 210 },
    { x: 9590, y: 210 }, { x: 9590, y: 180 },
    { x: 9740, y: 180 }, { x: 9820, y: 36 },
    { x: 9860, y: -18 }, { x: 10020, y: -82 }
  ], { recoverySeconds: 12, coinLimit: 3 });

  const b5a = addTerrain("B5DescentA", 11100, -220, 560, [0, 34, 68], 180);
  const b5b = addTerrain("B5DescentB", 11630, -90, 620, [0, 34, 64], 180);
  // The low route begins exactly where the descent slab ends. The old 30px
  // overlap, combined with four thick mid/high terrain slabs, made the
  // screenshot's fake "gap": visually open but physically impassable.
  const b5lowA = addTerrain("B5LowA", 12250, 170, 790, [0, 16, -10, 0]);
  const b5lowB = addTerrain("B5LowB", 13020, 240, 850, [0, -12, 14, 0]);
  const b5lowC = addTerrain("B5LowC", 13840, 180, 880, [0, 18, -10, 0]);
  const b5end = addTerrainPolygon(
    "B5End",
    14580,
    80,
    [[0, 50], [110, 50], [110, 0], [420, 0]],
    180
  );
  grounded("B5LowSpring1", "Items/Mechanisms", "spring", b5lowA, 0.3, -8, {
    launch_speed: "9.2", horizontal_boost: "1.8"
  });
  // Five thin, broad platforms form the optional shortcut. They retain
  // deliberate 100-110px open jumps without creating collision ceilings over
  // the continuous low route.
  addWood("B5ShortcutA", 12600, 40, 10);
  addWood("B5ShortcutB", 13030, -30, 10);
  addWood("B5ShortcutC", 13460, -110, 10);
  addWood("B5ShortcutD", 13890, -70, 10);
  addWood("B5ShortcutE", 14320, 20, 10);
  nodes.push(`${plainNode("B5OpenMainRouteContract", "Node", "Route").trimEnd()}
metadata/_llr_minimum_headroom = 120
metadata/_llr_thick_overhead_terrain = false
metadata/_llr_optional_platform_count = 5
metadata/_llr_max_optional_open_gap = 110
metadata/_llr_void_required = false
`);
  grounded("B5Goomba1", "Items/Enemies", "goomba", b5lowA, 0.32, -12);
  grounded("B5Goomba2", "Items/Enemies", "goomba", b5lowC, 0.58, -12);
  grounded("B5Koopa", "Items/Enemies", "koopa", b5lowB, 0.5, -18, { type: "0" });
  grounded("B5Tree1", "Items/Decoration", "smallTree", b5lowA, 0.18, -38);
  grounded("B5Flowers", "Items/Decoration", "flowers", b5lowB, 0.52, -10);
  airborne("B5HighBlueCoin", "Items/Pickups", "blueCoin", 14020, -330);
  recordRoute(stage.beats[4], "main", [
    { x: 11120, y: -220 }, { x: 11620, y: -20 }, { x: 12180, y: 150 },
    { x: 12250, y: 170 }, { x: 12600, y: 175 }, { x: 13200, y: 235 }, { x: 13900, y: 180 },
    { x: 14500, y: 175 }, { x: 14580, y: 130 }, { x: 14690, y: 80 },
    { x: 14960, y: 78 }
  ]);
  recordRoute(stage.beats[4], "bonus", [
    { x: 12080, y: 130 }, { x: 12480, y: 130 }, { x: 12600, y: 40 },
    { x: 13030, y: -30 }, { x: 13460, y: -110 }, { x: 13890, y: -70 },
    { x: 14320, y: 20 }, { x: 14580, y: 130 }
  ], { coinLimit: 5 });

  const b6overlook = addTerrain("B6Overlook", 14830, 80, 720, [0, -12, 8, 0]);
  const b6trigger = addTerrain("B6TriggerGround", 15520, 80, 620, [0, 12, -8, 0]);
  const b6safeA = addTerrain("B6SafetyA", 16080, 420, 820, [0, -10, 10, 0]);
  const b6safeB = addTerrain("B6SafetyB", 16870, 430, 760, [0, 12, -8, 0]);
  const b6high = addTerrain("B6HighRoute", 16580, -260, 640, [0, -10, 8, 0]);
  const b6exit = addTerrain("B6Exit", 17348, -180, 272, [0, -8, 0]);
  addPivot("B6DemoWheel", 15280, -60, 78, 4.0, 0.2);
  addPivot("B6MainWheel", 16360, -102, 122, 5.1, 0.8);
  addCloud("B6MainWheelBoarding", 16200, 25, 9);
  addCloud("B6HighLanding", 16560, -212, 9);
  addCloud("B6RecoveryLiftBottom", 17284, 400, 9);
  addShuttle("B6RecoveryLift", 17284, 400, { x: 0, y: -610 }, 3.4, 0.15);
  addCloud("B6RecoveryLiftTop", 17284, -235, 9);
  nodes.push(`${plainNode("B6SafeRecoveryContract", "Node", "Route").trimEnd()}
metadata/_llr_vertical_rescue = true
metadata/_llr_void_required = false
metadata/_llr_min_landing_width = 144
`);
  grounded("B6WindSign", "Items", "sign", b6trigger, 0.28, -3, {
    lines: `Array[String](["[@n,风向提示]先看清小风轮的方向；跨过标线后，整片牧场会反向送风。"])`
  });
  addDirector("B6WindReverseDirector", 15820, 10, {
    announcement: "风向反转！高路现在顺风",
    checkpoint: true,
    width: 260,
    height: 250,
    multiplier: -1,
    targets: [
      "../Items/Mechanisms/B6DemoWheel",
      "../Items/Mechanisms/B6MainWheel"
    ]
  });
  recordRoute(stage.beats[5], "main", [
    { x: 14860, y: 78 }, { x: 15480, y: 80 }, { x: 15940, y: 40 },
    { x: 16200, y: 25 }, { x: 16360, y: -224 }, { x: 16620, y: -262 },
    { x: 17220, y: -260 }, { x: 17284, y: -235 }, { x: 17480, y: -180 }
  ]);
  recordRoute(stage.beats[5], "recovery", [
    { x: 15860, y: 120 }, { x: 16200, y: 418 }, { x: 16820, y: 424 },
    { x: 17284, y: 400 }, { x: 17284, y: -210 }, { x: 17284, y: -235 },
    { x: 17420, y: -180 }
  ], { recoverySeconds: 14, coinLimit: 4 });

  const b7start = addTerrain("B7Start", 17480, -180, 660, [0, 14, -8, 0]);
  const b7t1 = addTerrain("B7Terrace1", 18110, -40, 620, [0, -10, 10, 0]);
  const b7t2 = addTerrain("B7Terrace2", 18700, 120, 700, [0, 12, -8, 0]);
  const b7t3 = addTerrain("B7Terrace3", 19370, 260, 760, [0, -12, 10, 0]);
  const b7t4 = addTerrain("B7Terrace4", 20100, 360, 820, [0, 14, -8, 0]);
  const b7t5 = addTerrain("B7Terrace5", 20890, 420, 590, [0, -10, 8, 0]);
  addWater("B7RecoveryCreek", 17700, 520, 3900, 180);
  addTerrain("B7CreekBed1", 17700, 680, 800, [0, 4, -4, 0]);
  addTerrain("B7CreekBed2", 18480, 680, 800, [0, -4, 4, 0]);
  addTerrain("B7CreekBed3", 19260, 680, 800, [0, 4, -4, 0]);
  addTerrain("B7CreekBed4", 20040, 680, 800, [0, -4, 4, 0]);
  addTerrain("B7CreekBed5", 20820, 680, 780, [0, 4, -4, 0]);
  addFallingLog("B7FallingLog1", 17980, -220, 78, 108);
  addTippingLog("B7TippingLog", 18510, -76, 7, -1);
  addPivot("B7DescentWheel1", 19160, 118, 98, 5.0, 0.4);
  addFallingLog("B7FallingLog2", 19900, 220, 88, 118);
  addPivot("B7DescentWheel2", 20680, 306, 102, 5.3, 1.2);
  addCloud("B7RestCloud1", 18300, -80, 9);
  addCloud("B7RestCloud2", 19700, 220, 9);
  addCloud("B7CreekExitStep1", 21540, 573, 9);
  addCloud("B7CreekExitStep2", 21540, 518, 9);
  addCloud("B7CreekExitStep3", 21540, 463, 9);
  addCloud("B7CreekExitStep4", 21540, 408, 9);
  addCloud("B7CreekExitStep5", 21540, 353, 9);
  nodes.push(`${plainNode("B7SafeCreekContract", "Node", "Route").trimEnd()}
metadata/_llr_continuous_creek_bed = true
metadata/_llr_exit_step_count = 5
metadata/_llr_void_required = false
metadata/_llr_min_landing_width = 144
`);
  grounded("B7RecoverySpring1", "Items/Mechanisms", "spring", b7t3, 0.78, -8, {
    launch_speed: "9.0", horizontal_boost: "1.5"
  });
  grounded("B7RecoverySpring2", "Items/Mechanisms", "spring", b7t5, 0.72, -8, {
    launch_speed: "9.4", horizontal_boost: "1.2"
  });
  addDirector("B7StormDirector", 17680, -230, {
    announcement: "暴雨来了，控制下山节奏",
    checkpoint: true,
    width: 300,
    height: 260,
    multiplier: 1,
    reveal: ["../StormTint"]
  });
  recordRoute(stage.beats[6], "main", [
    { x: 17520, y: -182 }, { x: 18040, y: -80 }, { x: 18480, y: 30 },
    { x: 18980, y: 118 }, { x: 19480, y: 258 }, { x: 20180, y: 358 },
    { x: 20880, y: 415 }, { x: 21560, y: 320 }
  ]);
  recordRoute(stage.beats[6], "recovery", [
    { x: 17800, y: 650 }, { x: 18500, y: 650 }, { x: 19200, y: 650 },
    { x: 19900, y: 650 }, { x: 20600, y: 650 }, { x: 21200, y: 650 },
    { x: 21540, y: 573 }, { x: 21540, y: 518 }, { x: 21540, y: 463 },
    { x: 21540, y: 408 }, { x: 21540, y: 353 }, { x: 21620, y: 300 }
  ], { recoverySeconds: 15, coinLimit: 5 });

  const b8start = addTerrain("B8Start", 21600, 300, 700, [0, -10, 8, 0]);
  const b8floorA = addTerrain("B8SafetyFloorA", 22270, 500, 850, [0, 12, -8, 0]);
  const b8floorB = addTerrain("B8SafetyFloorB", 23090, 520, 850, [0, -10, 10, 0]);
  const b8floorC = addTerrain("B8SafetyFloorC", 23910, 480, 850, [0, 12, -8, 0]);
  addTerrain("B8SafetyFloorD", 24740, 480, 160, [0, 0]);
  const b8landA = addTerrain("B8LandingA", 22580, 150, 520, [0, -8, 8, 0]);
  const b8landB = addTerrain("B8LandingB", 23410, -40, 520, [0, 8, -8, 0]);
  const b8finish = addTerrain("B8Finish", 24220, -260, 620, [0, -10, 8, 0]);
  const b8end = addTerrain("B8End", 24960, -180, 140, [0, -6, 0]);
  addPivot("B8FinalWheel1", 22380, 294, 102, 4.6, 0.2);
  addPivot("B8FinalWheel2", 23220, 104, 110, 4.9, 0.9);
  addPivot("B8FinalWheel3", 24080, -116, 120, 5.2, 1.5);
  addCloud("B8WheelSafety1", 22540, 202, 9);
  addCloud("B8WheelSafety2", 23380, 10, 9);
  addCloud("B8WheelSafety3", 24200, -212, 9);
  addCloud("B8RecoveryLiftBottom", 24900, 450, 9);
  addShuttle("B8RecoveryLift", 24900, 450, { x: 0, y: -660 }, 3.6, 0.55);
  addCloud("B8RecoveryLiftTop", 24900, -235, 9);
  nodes.push(`${plainNode("B8SafeRecoveryContract", "Node", "Route").trimEnd()}
metadata/_llr_vertical_rescue = true
metadata/_llr_void_required = false
metadata/_llr_min_landing_width = 144
`);
  addDirector("B8ClearWeatherDirector", 21820, 245, {
    announcement: "风雨停了，登上丰收铃台",
    checkpoint: true,
    width: 280,
    height: 230,
    multiplier: 1,
    hide: ["../StormTint"]
  });
  grounded("B8Flowers", "Items/Decoration", "flowers", b8finish, 0.45, -10);
  grounded("B8Tree", "Items/Decoration", "smallTree", b8finish, 0.8, -38);
  recordRoute(stage.beats[7], "main", [
    { x: 21620, y: 298 }, { x: 22180, y: 300 }, { x: 22380, y: 192 },
    { x: 22620, y: 148 }, { x: 23220, y: -6 }, { x: 23460, y: -42 },
    { x: 24080, y: -236 }, { x: 24300, y: -262 }, { x: 24820, y: -260 },
    { x: 24900, y: -235 }, { x: 25040, y: -182 }
  ]);
  recordRoute(stage.beats[7], "recovery", [
    { x: 22000, y: 360 }, { x: 22400, y: 498 }, { x: 23100, y: 518 },
    { x: 23800, y: 510 }, { x: 24380, y: 470 }, { x: 24900, y: 450 },
    { x: 24900, y: -210 }, { x: 24900, y: -235 }, { x: 25020, y: -180 }
  ], { recoverySeconds: 14, coinLimit: 3 });

  grounded("LevelIntro", "Items", "sign", b1a, 0.42, -3, {
    lines: `Array[String](["[@n,老师快跑]1 风车牧场 · V4", "这一关围绕借力与换路展开。低路稳定，高路更快；失足后通常仍能继续前进。"])`
  });
  const spawn = surfacePoint(b1a, 0.18);
  nodes.push(instanceNode("Player", ".", "player", { position: vector(spawn.x, spawn.y - 58) }));

  if (mainEstimatedSeconds !== 204) {
    throw new Error(`V4 stage 1 target time changed unexpectedly (${mainEstimatedSeconds})`);
  }

  const nextStage = stages[1];
  nodes.push(instanceNode("FinishWarp", ".", "warp", {
    position: vector(stage.levelWidth + 45, -250),
    sweep_direction: vector(-1, 0),
    spawn_location: vector(130, nextStage.heights[0] - 58),
    scene_path: JSON.stringify(nextStage.resource),
    size: vector(92, 360)
  }));
  nodes.push(instanceNode("VoidRescue", ".", "death", {
    visible: "false",
    position: vector(0, 900),
    polygon: packed([[-500, 0], [stage.levelWidth + 1000, 0], [stage.levelWidth + 1000, 450], [-500, 450]])
  }));
  airborne("FinishBlueCoin", "Items/Pickups", "blueCoin", stage.levelWidth - 360, -322);

  nodes.push(`${plainNode("LLRFlowMetrics", "Node", ".").trimEnd()}
metadata/_llr_main_seconds = ${mainEstimatedSeconds}
metadata/_llr_recovery_seconds = ${fmt(recoveryEstimatedSeconds)}
metadata/_llr_campaign_version = 4
metadata/_llr_beat_count = 8
metadata/_llr_cadence_model = "introduction-development-twist-resolution"
metadata/_llr_topology_fingerprint = "braid,wheel-basin,water-dual,vertical-spiral,three-lane,state-wheel,descent,three-wheel"
metadata/_llr_event_density_seconds = 30
metadata/_llr_max_idle_run_seconds = 12
`);

  const extResources = Object.entries(resources)
    .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
    .join("\n");
  return `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
}
