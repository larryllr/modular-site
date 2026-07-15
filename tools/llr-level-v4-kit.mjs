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

function metadataLiteral(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return fmt(value);
  throw new Error(`Unsupported V4 metadata value: ${String(value)}`);
}

export function createV4SceneBuilder({
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
    if (!resourceIds[resource]) throw new Error(`Unknown V4 resource key: ${resource}`);
    const lines = [
      `[node name="${name}" parent="${parent}" instance=ExtResource("${resourceIds[resource]}")]`
    ];
    for (const [key, value] of Object.entries(properties)) lines.push(`${key} = ${value}`);
    return `${lines.join("\n")}\n`;
  }

  function addInstance(name, parent, resource, properties = {}) {
    nodes.push(instanceNode(name, parent, resource, properties));
    return name;
  }

  function addPlainNode(name, type, parent = ".", properties = {}) {
    const lines = [plainNode(name, type, parent).trimEnd()];
    for (const [key, value] of Object.entries(properties)) lines.push(`${key} = ${value}`);
    nodes.push(`${lines.join("\n")}\n`);
    return name;
  }

  function addContract(name, metadata, parent = "Route") {
    const lines = [plainNode(name, "Node", parent).trimEnd()];
    for (const [key, value] of Object.entries(metadata)) {
      lines.push(`metadata/_llr_${key} = ${metadataLiteral(value)}`);
    }
    nodes.push(`${lines.join("\n")}\n`);
    return name;
  }

  function addTerrain(id, x, y, width, profile = [0, 0, 0, 0], depth = 180) {
    if (width > 900) throw new Error(`${id}: V4 terrain width exceeds 900 (${width})`);
    const topMin = Math.min(...profile);
    const topMax = Math.max(...profile);
    if (depth <= topMax + 36) depth = topMax + 60;
    if (depth - topMin > 210) depth = topMin + 210;
    if (depth <= topMax + 36 || depth - topMin < 130 || depth - topMin > 210) {
      throw new Error(`${id}: invalid V4 terrain depth ${depth - topMin}`);
    }
    const step = width / (profile.length - 1);
    const points = profile.map((offset, index) => ({ x: x + index * step, y: y + offset }));
    addInstance(id, "Terrain", "terrain", {
      z_index: "1",
      position: vector(x, y),
      polygon: packed([
        ...profile.map((offset, index) => [index * step, offset]),
        [width, depth],
        [0, depth]
      ])
    });
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
    addInstance(id, "Terrain", "terrain", {
      z_index: "1",
      position: vector(x, y),
      polygon: packed([...topPoints, [width, bottomY], [0, bottomY]]),
      "metadata/_llr_structural_terrain": "true",
      "metadata/_llr_deep_structural_terrain": bottomY > 210 ? "true" : "false"
    });
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
    addInstance(name, parent, resource, {
      position: vector(anchor.x, anchor.y + offset),
      ...properties,
      "metadata/_llr_anchor_surface": JSON.stringify(surfaceId),
      "metadata/_llr_anchor_t": fmt(t),
      "metadata/_llr_anchor_offset": fmt(offset)
    });
    return { x: anchor.x, y: anchor.y + offset };
  }

  function airborne(name, parent, resource, x, y, properties = {}) {
    const cameraTop = stage.cameraTop ?? -820;
    const cameraBottom = stage.cameraBottom ?? 760;
    if (y < cameraTop - 100 || y > cameraBottom + 100) {
      throw new Error(`${name}: V4 airborne y outside camera (${y})`);
    }
    addInstance(name, parent, resource, {
      position: vector(x, y),
      ...properties,
      "metadata/_llr_airborne": "true"
    });
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

  function recordRoute(beat, kind, waypoints, options = {}) {
    const route = sampledPolyline(waypoints, options.spacing || 165);
    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (Math.abs(dx) > 215 || dy < -92 || dy > 180 || Math.hypot(dx, dy) > 235) {
        throw new Error(`V4 level ${stage.id} beat ${beat.id}/${kind}: unreachable step dx=${fmt(dx)} dy=${fmt(dy)}`);
      }
    }
    routeSerial += 1;
    const lines = [plainNode(`LLRRoute${String(routeSerial).padStart(3, "0")}`, "Node", "Route").trimEnd()];
    lines.push(`metadata/_llr_room = ${beat.id}`);
    lines.push(`metadata/_llr_beat = ${beat.id}`);
    lines.push(`metadata/_llr_kind = ${JSON.stringify(kind)}`);
    lines.push(`metadata/_llr_set_piece = ${JSON.stringify(beat.name)}`);
    lines.push(`metadata/_llr_points = ${packed(route.map((point) => [point.x, point.y]))}`);
    nodes.push(`${lines.join("\n")}\n`);
    if (kind === "main" && options.countSeconds !== false) mainEstimatedSeconds += beat.seconds;
    if (kind === "recovery") recoveryEstimatedSeconds += options.recoverySeconds || 12;
    if (options.coins !== false) addGuideCoins(`B${beat.id}${kind}`, route, options.coinLimit || 6);
    return route;
  }

  function addPivot(name, x, y, radius, speed, offset = 0, count = 4) {
    return airborne(name, "Items/Mechanisms", "pivot", x, y, {
      radius: fmt(radius),
      count: fmt(count),
      speed: fmt(speed),
      offset: fmt(offset)
    });
  }

  function addShuttle(name, x, y, travel, options = {}) {
    const walkableWidth = options.walkableWidth || 168;
    return {
      ...airborne(name, "Items/Mechanisms", "shuttle", x, y, {
        scale: vector(options.scaleX || 2, 1),
        travel: vector(travel.x, travel.y),
        travel_seconds: fmt(options.travelSeconds || 3.4),
        pause_seconds: fmt(options.pauseSeconds ?? 0.6),
        phase: fmt(options.phase || 0),
        "metadata/_llr_walkable_width": fmt(walkableWidth)
      }),
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addCloud(name, x, y, width = 9) {
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

  function addWater(name, x, y, width, height = 360, properties = {}) {
    addInstance(name, "Water", "water", {
      position: vector(x, y),
      polygon: packed([[0, 0], [width, 0], [width, height], [0, height]]),
      ...properties
    });
    return name;
  }

  function addDirector(name, x, y, properties = {}) {
    addInstance(name, ".", "director", {
      position: vector(x, y),
      trigger_size: vector(properties.width || 220, properties.height || 190),
      announcement: JSON.stringify(properties.announcement || ""),
      checkpoint: properties.checkpoint === false ? "false" : "true",
      ...(properties.targets?.length ? { target_paths: nodePaths(properties.targets) } : {}),
      ...(properties.reveal?.length ? { reveal_paths: nodePaths(properties.reveal) } : {}),
      ...(properties.hide?.length ? { hide_paths: nodePaths(properties.hide) } : {}),
      ...(properties.move?.length ? { move_paths: nodePaths(properties.move) } : {}),
      ...(properties.objectives?.length ? { objective_paths: nodePaths(properties.objectives) } : {}),
      ...(properties.moveOffset ? { move_offset: vector(properties.moveOffset.x, properties.moveOffset.y) } : {}),
      ...(properties.moveSeconds != null ? { move_seconds: fmt(properties.moveSeconds) } : {}),
      ...(properties.numericProperty ? { numeric_property: JSON.stringify(properties.numericProperty) } : {}),
      ...(properties.multiplier != null ? { numeric_multiplier: fmt(properties.multiplier) } : {}),
      ...(properties.targetMethod ? { target_method: JSON.stringify(properties.targetMethod) } : {}),
      ...(properties.waitForObjectives ? { wait_for_objectives: "true" } : {})
    });
    return name;
  }

  function addBeatMarker(beat) {
    const lines = [plainNode(`LLRBeat${String(beat.id).padStart(2, "0")}_${beat.topology}`, "Node2D").trimEnd()];
    lines.push(`position = ${vector(beat.startX, 0)}`);
    lines.push(`metadata/_llr_beat = ${beat.id}`);
    lines.push(`metadata/_llr_start_x = ${beat.startX}`);
    lines.push(`metadata/_llr_end_x = ${beat.endX}`);
    lines.push("metadata/_llr_geometry_version = 4");
    lines.push(`metadata/_llr_act = ${beat.act}`);
    lines.push(`metadata/_llr_cadence = ${JSON.stringify(beat.cadence)}`);
    lines.push(`metadata/_llr_set_piece = ${JSON.stringify(beat.name)}`);
    lines.push(`metadata/_llr_topology = ${JSON.stringify(beat.topology)}`);
    lines.push(`metadata/_llr_mechanics = ${JSON.stringify(beat.mechanics.join(","))}`);
    lines.push(`metadata/_llr_player_event = ${JSON.stringify(beat.event)}`);
    lines.push(`metadata/_llr_failure_route = ${JSON.stringify(beat.failure)}`);
    lines.push(`metadata/_llr_input_budget = ${JSON.stringify(beat.input)}`);
    lines.push(`metadata/_llr_state_change = ${beat.stateChange}`);
    lines.push(`metadata/_llr_target_seconds = ${beat.seconds}`);
    nodes.push(`${lines.join("\n")}\n`);
  }

  function assertConservativePlatformChain(name, platforms, options = {}) {
    const maxGap = options.maxGap ?? 96;
    const maxRise = options.maxRise ?? 72;
    const minLandingWidth = options.minLandingWidth ?? 144;
    for (let index = 1; index < platforms.length; index += 1) {
      const previous = platforms[index - 1];
      const current = platforms[index];
      const openGap = current.x - current.halfWidth - (previous.x + previous.halfWidth);
      const upwardRise = previous.y - current.y;
      if (openGap > maxGap || upwardRise > maxRise) {
        throw new Error(`${name}: extreme jump ${index} gap=${fmt(openGap)} rise=${fmt(upwardRise)}`);
      }
    }
    for (const platform of platforms) {
      if (platform.walkableWidth != null && platform.walkableWidth < minLandingWidth) {
        throw new Error(`${name}: narrow landing width=${fmt(platform.walkableWidth)} minimum=${fmt(minLandingWidth)}`);
      }
    }
  }

  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background", { modulate: stage.tint }));
  nodes.push(instanceNode("CameraArea", ".", "camera", {
    visible: "false",
    polygon: packed([
      [-180, stage.cameraTop ?? -820],
      [stage.levelWidth + 180, stage.cameraTop ?? -820],
      [stage.levelWidth + 180, stage.cameraBottom ?? 760],
      [-180, stage.cameraBottom ?? 760]
    ])
  }));
  nodes.push(plainNode("Terrain", "Node2D"));
  nodes.push(plainNode("Items", "Node2D"));
  for (const group of ["Coins", "Enemies", "Platforms", "Mechanisms", "Pickups", "Decoration"]) {
    nodes.push(plainNode(group, "Node2D", "Items"));
  }
  nodes.push(plainNode("Water", "Node2D"));
  nodes.push(plainNode("Route", "Node2D"));
  for (const beat of stage.beats) addBeatMarker(beat);

  function finalize({
    startSurface,
    spawnT = 0.18,
    spawnOffset = -58,
    introLines,
    finishPosition,
    finishSize = { x: 92, y: 360 },
    finishBlueCoin,
    extraFlowMetadata = {}
  }) {
    if (introLines?.length) {
      grounded("LevelIntro", "Items", "sign", startSurface, 0.42, -3, {
        lines: `Array[String]([${introLines.map((line) => JSON.stringify(line)).join(", ")}])`
      });
    }
    const spawn = surfacePoint(startSurface, spawnT);
    nodes.push(instanceNode("Player", ".", "player", {
      position: vector(spawn.x, spawn.y + spawnOffset)
    }));

    const expectedSeconds = stage.beats.reduce((total, beat) => total + beat.seconds, 0);
    if (mainEstimatedSeconds !== expectedSeconds) {
      throw new Error(`V4 stage ${stage.id} target time mismatch (${mainEstimatedSeconds}/${expectedSeconds})`);
    }

    const finish = finishPosition || { x: stage.levelWidth + 45, y: stage.finishY ?? 100 };
    if (stage.id < stages.length) {
      const nextStage = stages[stage.id];
      const nextSpawnY = nextStage.spawnY ?? nextStage.heights?.[0] ?? 240;
      nodes.push(instanceNode("FinishWarp", ".", "warp", {
        position: vector(finish.x, finish.y),
        sweep_direction: vector(-1, 0),
        spawn_location: vector(130, nextSpawnY - 58),
        scene_path: JSON.stringify(nextStage.resource),
        size: vector(finishSize.x, finishSize.y)
      }));
    } else {
      nodes.push(instanceNode("FinishWarp", ".", "warp", {
        position: vector(finish.x, finish.y),
        sweep_direction: vector(-1, 0),
        spawn_location: vector(130, 182),
        scene_path: JSON.stringify(mainMenuResource),
        size: vector(finishSize.x, finishSize.y)
      }));
    }
    nodes.push(instanceNode("VoidRescue", ".", "death", {
      visible: "false",
      position: vector(0, stage.deathY ?? 900),
      polygon: packed([[-500, 0], [stage.levelWidth + 1000, 0], [stage.levelWidth + 1000, 450], [-500, 450]])
    }));
    if (finishBlueCoin) {
      airborne("FinishBlueCoin", "Items/Pickups", "blueCoin", finishBlueCoin.x, finishBlueCoin.y);
    }

    const flowLines = [plainNode("LLRFlowMetrics", "Node", ".").trimEnd()];
    const flowMetadata = {
      main_seconds: mainEstimatedSeconds,
      recovery_seconds: recoveryEstimatedSeconds,
      campaign_version: 4,
      beat_count: stage.beats.length,
      cadence_model: "introduction-development-twist-resolution",
      topology_fingerprint: stage.beats.map((beat) => beat.topology).join(","),
      event_density_seconds: 30,
      max_idle_run_seconds: 12,
      ...extraFlowMetadata
    };
    for (const [key, value] of Object.entries(flowMetadata)) {
      flowLines.push(`metadata/_llr_${key} = ${metadataLiteral(value)}`);
    }
    nodes.push(`${flowLines.join("\n")}\n`);

    const extResources = Object.entries(resources)
      .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
      .join("\n");
    return `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
  }

  return {
    fmt,
    vector,
    packed,
    nodePaths,
    nodes,
    surfaces,
    addInstance,
    addPlainNode,
    addContract,
    addTerrain,
    addTerrainPolygon,
    surfacePoint,
    grounded,
    airborne,
    recordRoute,
    addPivot,
    addShuttle,
    addCloud,
    addWood,
    addFungus,
    addWater,
    addDirector,
    assertConservativePlatformChain,
    finalize
  };
}
