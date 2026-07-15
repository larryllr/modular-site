import { createV4SceneBuilder } from "./llr-level-v4-kit.mjs";

function beat(id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure, stateChange = false) {
  return {
    id,
    name,
    topology,
    startX,
    endX,
    seconds,
    act,
    cadence,
    mechanics,
    event,
    failure,
    input: "direction+one-action",
    stateChange
  };
}

export const V4_STAGE_TWO_BLUEPRINT = {
  id: 2,
  title: "2 潮汐水道 · V4",
  description: "水陆换路、开闸涨潮、桥下折返与灯塔排水",
  tint: "Color(0.86, 0.97, 1, 1)",
  spawnY: 240,
  levelWidth: 25000,
  cameraTop: -520,
  cameraBottom: 780,
  finishY: 100,
  beats: [
    beat(1, "港口双路线", "harbor-dual-preview", 0, 2400, 18, 1, "introduction",
      ["water", "shuttle", "terrain"],
      "开场同时看见水上摆渡快路与可游泳稳路，并在下一码头汇合",
      "错过摆渡可直接入水，左右岸均有实体台阶"),
    beat(2, "主动入水", "submerge-and-lift", 2400, 5200, 24, 1, "introduction",
      ["water", "shuttle", "terrain", "checkpoint"],
      "主动跳水穿过遗迹底层，再乘宽升降台返回水面",
      "水底连续有地面，升降台两侧都有静态等候台"),
    beat(3, "两班渡船", "ferry-or-swim", 5200, 8500, 28, 2, "development",
      ["water", "shuttle", "branch", "cheep"],
      "连续两次选择赶摆渡或走永远可用的游泳路线",
      "错过摆渡无需等待，可直接进入下方水路"),
    beat(4, "船闸开闸", "tide-gate-event", 8500, 10400, 14, 2, "development",
      ["pound_gate", "director", "water", "checkpoint"],
      "砸开闸门后水体与碰撞真实抬升，旧低桥变成游泳通道",
      "开闸操作在完整静态广场完成", true),
    beat(5, "涨潮撤离", "rising-tide-evacuation", 10400, 14200, 36, 2, "development",
      ["water", "shuttle", "terrain", "branch"],
      "抬升后的水线淹过旧陆路，玩家在半淹码头与水道间持续换路",
      "全段下方为连续水体和港底，每段都有宽岸台", true),
    beat(6, "桥下折返", "pipe-foldback-loop", 14200, 17700, 30, 2, "twist",
      ["pipe", "water", "terrain", "director"],
      "上层尽头的管道送回桥下，从涨潮后开放的下层空间再次向前",
      "管道出口无敌人，下层全程有港底与实体出水阶梯", true),
    beat(7, "灯塔排水廊", "stepped-drainage", 17700, 22000, 34, 3, "twist",
      ["water", "terrain", "shuttle", "checkpoint"],
      "连续水室的水面逐格降低，游泳和陆地移动交替出现",
      "失足只会提前进入下一格水室，每格末端都有宽岛"),
    beat(8, "灯塔汇流", "lighthouse-resolution", 22000, 25000, 20, 3, "resolution",
      ["water", "shuttle", "terrain", "finish"],
      "最后一班升降台把水陆路线送上灯塔静态终点码头",
      "升降台下方是完整水池，终点前无敌人", true)
  ]
};

function downStairs(stepCount, tread = 80, rise = 50, plateau = 80) {
  const points = [[0, 0]];
  let x = 0;
  let y = 0;
  for (let index = 0; index < stepCount; index += 1) {
    x += tread;
    points.push([x, y]);
    y += rise;
    points.push([x, y]);
  }
  points.push([x + plateau, y]);
  return points;
}

function upStairs(stepCount, tread = 80, rise = 50, plateau = 80) {
  const height = stepCount * rise;
  const points = [[0, height]];
  let x = 0;
  let y = height;
  for (let index = 0; index < stepCount; index += 1) {
    x += tread;
    points.push([x, y]);
    y -= rise;
    points.push([x, y]);
  }
  points.push([x + plateau, 0]);
  return points;
}

export function buildV4StageTwoScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    nodes,
    addInstance,
    addContract,
    addTerrain,
    addTerrainPolygon,
    surfacePoint,
    grounded,
    airborne,
    recordRoute,
    addShuttle,
    addWood,
    addWater,
    addDirector,
    finalize
  } = b;

  function addBedChain(prefix, startX, endX, y) {
    const ids = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const remaining = endX - x;
      const width = Math.min(850, remaining);
      ids.push(addTerrain(`${prefix}${index}`, x, y + ((index % 2) * 8), width, [0, 6, -4, 0]));
      if (remaining <= 850) break;
      x += width - 10;
      index += 1;
    }
    return ids;
  }

  // Beat 1: the first ferry is optional; both pool edges are sealed stair banks.
  const b1start = addTerrain("B1HarborStart", -40, 240, 780, [0, -16, 8, 0]);
  const b1dock = addTerrain("B1HarborDock", 700, 260, 620, [0, 8, -6, 0]);
  addTerrainPolygon("B1HarborDownStairs", 1240, 260, downStairs(5), 500);
  addBedChain("B1HarborBed", 1640, 2180, 510);
  addTerrainPolygon("B1HarborUpStairs", 2000, 250, upStairs(5), 500);
  const b1exit = addTerrain("B1HarborExit", 2240, 250, 260, [0, -4, 0]);
  addWater("B1HarborWater", 1240, 300, 1160, 420);
  addShuttle("B1FastFerry", 1370, 205, { x: 650, y: 0 }, {
    travelSeconds: 2.4, pauseSeconds: 0.35, phase: 0.1, walkableWidth: 176
  });
  grounded("B1HarborSign", "Items/Decoration", "sign", b1dock, 0.46, -3, {
    lines: `Array[String](["水不是失败区：等船更快，直接游也一定能到。"] )`
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 235 }, { x: 820, y: 258 }, { x: 1280, y: 300 },
    { x: 1500, y: 410 }, { x: 1950, y: 430 }, { x: 2180, y: 300 }, { x: 2380, y: 248 }
  ]);
  recordRoute(stage.beats[0], "bonus", [
    { x: 900, y: 250 }, { x: 1370, y: 205 }, { x: 2020, y: 205 }, { x: 2320, y: 245 }
  ], { coinLimit: 4 });

  // Beat 2: a continuous seabed and a wide lift make the intentional dive reversible.
  const b2entry = addTerrain("B2DiveEntry", 2400, 250, 600, [0, -8, 6, 0]);
  addTerrainPolygon("B2DiveDownStairs", 2920, 250, downStairs(6), 540);
  const b2beds = addBedChain("B2DiveBed", 3400, 4740, 550);
  addTerrainPolygon("B2DiveUpStairs", 4560, 250, upStairs(6), 540);
  const b2exit = addTerrain("B2DiveExit", 5040, 250, 240, [0, 0]);
  addWater("B2DiveWater", 2920, 300, 2200, 450);
  addShuttle("B2WaterLift", 4500, 520, { x: 0, y: -260 }, {
    travelSeconds: 2.6, pauseSeconds: 0.45, phase: 0.45, walkableWidth: 176
  });
  addWood("B2LiftBottomWait", 4320, 520, 6);
  addWood("B2LiftTopWait", 4700, 270, 6);
  airborne("B2Bottle", "Items/Pickups", "bottle", 3940, 500);
  addContract("B2SafeDiveContract", {
    continuous_seabed: true,
    water_is_failure: false,
    lift_wait_seconds: 2,
    void_required: false,
    min_landing_width: 160
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2420, y: 248 }, { x: 2920, y: 300 }, { x: 3400, y: 480 },
    { x: 4100, y: 510 }, { x: 4500, y: 500 }, { x: 4500, y: 270 }, { x: 5100, y: 248 }
  ]);
  recordRoute(stage.beats[1], "recovery", [
    { x: 3650, y: 520 }, { x: 4200, y: 520 }, { x: 4500, y: 520 },
    { x: 4500, y: 270 }, { x: 4750, y: 270 }
  ], { recoverySeconds: 8, coinLimit: 3 });

  // Beat 3: two readable ferry cycles above one uninterrupted swimming route.
  const b3entry = addTerrain("B3FerryEntry", 5200, 250, 520, [0, 6, -4, 0]);
  addTerrainPolygon("B3FerryDownStairs", 5640, 250, downStairs(5), 500);
  addBedChain("B3FerryBed", 6040, 8080, 520);
  addTerrain("B3SwimIslandA", 6240, 430, 480, [0, -6, 4, 0]);
  addTerrain("B3SwimIslandB", 7050, 410, 460, [0, 8, -4, 0]);
  addTerrainPolygon("B3FerryUpStairs", 7920, 240, upStairs(5), 500);
  const b3exit = addTerrain("B3FerryExit", 8320, 240, 260, [0, 0]);
  addWater("B3FerryWater", 5640, 300, 2760, 430);
  addShuttle("B3FerryA", 5790, 205, { x: 820, y: -20 }, {
    travelSeconds: 2.8, pauseSeconds: 0.35, phase: 0.05, walkableWidth: 176
  });
  addShuttle("B3FerryB", 6880, 190, { x: 850, y: 25 }, {
    travelSeconds: 3.0, pauseSeconds: 0.35, phase: 0.52, walkableWidth: 176
  });
  airborne("B3CheepA", "Items/Enemies", "cheep", 6600, 455, { "metadata/_llr_waterborne": "true" });
  airborne("B3CheepB", "Items/Enemies", "cheep", 7550, 470, { "metadata/_llr_waterborne": "true" });
  recordRoute(stage.beats[2], "main", [
    { x: 5220, y: 248 }, { x: 5640, y: 300 }, { x: 6100, y: 440 },
    { x: 6500, y: 430 }, { x: 7200, y: 430 }, { x: 7850, y: 440 },
    { x: 8200, y: 280 }, { x: 8420, y: 238 }
  ]);
  recordRoute(stage.beats[2], "bonus", [
    { x: 5520, y: 245 }, { x: 5790, y: 205 }, { x: 6610, y: 185 },
    { x: 6880, y: 190 }, { x: 7730, y: 215 }, { x: 8280, y: 238 }
  ], { coinLimit: 5 });

  // Beat 4: the pound gate guarantees the tide event only fires after the player opens it.
  const b4gate = addTerrain("B4TideGatePlaza", 8500, 240, 820, [0, -8, 8, 0]);
  const b4control = addTerrain("B4TideControl", 9250, 240, 900, [0, 6, -6, 0]);
  grounded("B4TidePoundGate", "Items/Mechanisms", "poundGate", b4gate, 0.62, -8, {
    gate_offset: vector(220, -92),
    gate_height: "184",
    open_distance: "224"
  });
  addDirector("B4RaiseTideDirector", 9750, 180, {
    announcement: "船闸开启，潮水正在上涨",
    checkpoint: true,
    width: 260,
    height: 220,
    move: ["../Water/B5TideWater"],
    moveOffset: { x: 0, y: -240 },
    moveSeconds: 1.6
  });
  addContract("B4TideEventContract", {
    physical_water_move: true,
    tide_rise: 240,
    move_seconds: 1.6,
    gate_before_trigger: true,
    checkpoint: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 8520, y: 238 }, { x: 9000, y: 235 }, { x: 9420, y: 240 },
    { x: 9750, y: 238 }, { x: 10280, y: 250 }
  ]);

  // Beat 5: moving the Water root raises both rendering and collision together.
  const b5start = addTerrain("B5TideStart", 10400, 300, 620, [0, 8, -4, 0]);
  addBedChain("B5TideBed", 10400, 14200, 610);
  const b5dockA = addTerrain("B5HalfFloodedDockA", 11100, 350, 560, [0, -8, 6, 0]);
  const b5dockB = addTerrain("B5HalfFloodedDockB", 12020, 310, 620, [0, 8, -6, 0]);
  const b5dockC = addTerrain("B5HalfFloodedDockC", 13020, 390, 560, [0, -6, 6, 0]);
  const b5exit = addTerrain("B5TideExit", 13800, 280, 440, [0, 6, 0]);
  addWater("B5TideWater", 10380, 520, 3860, 430);
  addShuttle("B5HighFerryA", 10880, 210, { x: 740, y: 20 }, {
    travelSeconds: 2.7, pauseSeconds: 0.35, phase: 0.2, walkableWidth: 176
  });
  addShuttle("B5HighFerryB", 12480, 230, { x: 760, y: -20 }, {
    travelSeconds: 2.9, pauseSeconds: 0.35, phase: 0.65, walkableWidth: 176
  });
  airborne("B5BottleA", "Items/Pickups", "bottle", 11600, 320);
  airborne("B5BottleB", "Items/Pickups", "bottle", 13300, 350);
  recordRoute(stage.beats[4], "main", [
    { x: 10420, y: 298 }, { x: 11000, y: 320 }, { x: 11500, y: 390 },
    { x: 12100, y: 350 }, { x: 12700, y: 390 }, { x: 13300, y: 430 },
    { x: 13800, y: 330 }, { x: 14100, y: 278 }
  ]);
  recordRoute(stage.beats[4], "bonus", [
    { x: 10600, y: 280 }, { x: 10880, y: 210 }, { x: 11620, y: 230 },
    { x: 12480, y: 230 }, { x: 13240, y: 210 }, { x: 13920, y: 270 }
  ], { coinLimit: 5 });

  // Beat 6: one route has two chunks because the pipe intentionally folds space backward.
  const b6upperA = addTerrain("B6UpperBridgeA", 14200, 280, 850, [0, -8, 6, 0]);
  const b6upperB = addTerrain("B6UpperBridgeB", 15020, 260, 850, [0, 6, -6, 0]);
  const b6upperC = addTerrain("B6UpperBridgeC", 15840, 270, 850, [0, -6, 6, 0]);
  const b6pipeDock = addTerrain("B6PipeDock", 16660, 260, 420, [0, 0]);
  addBedChain("B6BridgeBed", 14200, 17700, 620);
  addWater("B6BridgeUnderwater", 14200, 390, 3500, 430);
  const pipeAnchor = surfacePoint(b6pipeDock, 0.58);
  addInstance("B6FoldbackPipe", "Items/Mechanisms", "pipe", {
    position: vector(pipeAnchor.x, pipeAnchor.y - 16),
    target_pos: vector(14480, 520)
  });
  airborne("B6PipeArrow", "Items/Decoration", "arrow", pipeAnchor.x + 28, pipeAnchor.y - 72, {
    rotation: "1.5708"
  });
  addTerrainPolygon("B6ReturnStairBank", 17100, 360, upStairs(5, 80, 52, 100), 540);
  const b6exit = addTerrain("B6LoopExit", 17580, 360, 220, [0, 0]);
  addContract("B6PipeLoopContract", {
    pipe_foldback: true,
    target_x: 14480,
    continuous_seabed: true,
    exit_stairs: true,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 14220, y: 278 }, { x: 15000, y: 258 }, { x: 15800, y: 268 },
    { x: 16600, y: 258 }, { x: pipeAnchor.x, y: pipeAnchor.y - 18 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[5], "main", [
    { x: 14480, y: 520 }, { x: 15100, y: 540 }, { x: 15900, y: 540 },
    { x: 16700, y: 540 }, { x: 17100, y: 620 }, { x: 17500, y: 360 },
    { x: 17720, y: 358 }
  ], { countSeconds: false, coinLimit: 5 });

  // Beat 7: water surfaces descend cell by cell, and every pool has a solid bed.
  const b7start = addTerrain("B7DrainStart", 17700, 360, 520, [0, 6, -4, 0]);
  addBedChain("B7DrainBed", 18100, 21800, 620);
  addWater("B7DrainWaterA", 18100, 300, 950, 430);
  const b7islandA = addTerrain("B7DrainIslandA", 18950, 340, 520, [0, -6, 4, 0]);
  addWater("B7DrainWaterB", 19400, 360, 950, 370);
  const b7islandB = addTerrain("B7DrainIslandB", 20250, 400, 520, [0, 6, -4, 0]);
  addWater("B7DrainWaterC", 20700, 420, 950, 310);
  const b7exit = addTerrain("B7DrainExit", 21550, 450, 500, [0, -8, 0]);
  addShuttle("B7DrainLift", 21720, 430, { x: 0, y: -150 }, {
    travelSeconds: 2.2, pauseSeconds: 0.4, phase: 0.35, walkableWidth: 176
  });
  addDirector("B7DrainCheckpoint", 18800, 285, {
    announcement: "灯塔排水廊：水面会逐格降低",
    checkpoint: true,
    width: 260,
    height: 220
  });
  addContract("B7DrainageContract", {
    pool_count: 3,
    water_step_drop: 60,
    continuous_seabed: true,
    checkpoint: true,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 17720, y: 358 }, { x: 18120, y: 350 }, { x: 18800, y: 390 },
    { x: 19200, y: 338 }, { x: 19800, y: 420 }, { x: 20400, y: 398 },
    { x: 21000, y: 470 }, { x: 21600, y: 448 }, { x: 21900, y: 300 }
  ]);
  recordRoute(stage.beats[6], "recovery", [
    { x: 18200, y: 590 }, { x: 19000, y: 590 }, { x: 19800, y: 590 },
    { x: 20600, y: 590 }, { x: 21400, y: 590 }, { x: 21720, y: 430 },
    { x: 21720, y: 280 }, { x: 21920, y: 280 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 8: a final water-safe lift reaches a broad, static lighthouse dock.
  const b8dock = addTerrain("B8LighthouseDock", 22000, 300, 760, [0, -8, 6, 0]);
  addBedChain("B8LighthouseBed", 22680, 24300, 610);
  addWater("B8LighthousePool", 22680, 350, 1700, 390);
  addShuttle("B8LighthouseLift", 23900, 520, { x: 0, y: -360 }, {
    travelSeconds: 3.0, pauseSeconds: 0.45, phase: 0.42, walkableWidth: 176
  });
  addWood("B8LiftBottomWait", 23680, 520, 6);
  addWood("B8LiftTopWait", 24120, 170, 6);
  const b8finish = addTerrain("B8LighthouseFinish", 24260, 100, 820, [0, -8, 6, 0]);
  addDirector("B8LighthouseDirector", 24420, 40, {
    announcement: "灯塔亮起，潮汐水道已通过",
    checkpoint: true,
    width: 300,
    height: 260
  });
  grounded("B8LighthouseTree", "Items/Decoration", "smallTree", b8finish, 0.72, -38);
  addContract("B8SafeLighthouseContract", {
    lift_travel: 360,
    min_landing_width: 160,
    water_below_lift: true,
    static_finish: true,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 22020, y: 298 }, { x: 22680, y: 350 }, { x: 23400, y: 480 },
    { x: 23900, y: 500 }, { x: 23900, y: 160 }, { x: 24300, y: 105 },
    { x: 24900, y: 100 }
  ]);
  recordRoute(stage.beats[7], "recovery", [
    { x: 22900, y: 580 }, { x: 23600, y: 580 }, { x: 23900, y: 520 },
    { x: 23900, y: 160 }, { x: 24200, y: 160 }
  ], { recoverySeconds: 10, coinLimit: 3 });

  return finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]2 潮汐水道 · V4",
      "水上摆渡更快，游泳路线更稳。开闸后水位会真实改变，所有低路都能回到岸上。"
    ],
    finishPosition: { x: 25045, y: 100 },
    finishSize: { x: 92, y: 360 },
    finishBlueCoin: { x: 24680, y: 30 },
    extraFlowMetadata: {
      physical_tide_distance: 240,
      spatial_foldback: true,
      safe_water_route: true
    }
  });
}
