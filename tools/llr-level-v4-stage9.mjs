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

export const V4_STAGE_NINE_BLUEPRINT = {
  id: 9,
  title: "9 遗迹寻宝环线 · V4",
  description: "可反复回访的中央大厅、四翼五取四、红门与逆向旧环出口",
  tint: "Color(0.91, 0.88, 0.74, 1)",
  spawnY: 240,
  levelWidth: 18900,
  cameraTop: -760,
  cameraBottom: 780,
  finishY: 240,
  beats: [
    beat(1, "中央大厅藏宝图", "revisitable-central-hall", 7600, 10100, 20, 1, "introduction",
      ["central-hall", "coin-gate", "preview", "landmarks"],
      "在唯一中央大厅看见红门 0/4、四翼地标和一枚高手支路红币；所有入口和回程都在同屏",
      "大厅为连续实体地面，任何翼区都能主动返回这里"),
    beat(2, "门管十秒教学环", "door-pipe-return-loop", 6000, 7500, 24, 1, "introduction",
      ["door", "pipe", "foldback", "hall-return"],
      "从彩色门进入短廊，沿负 X 方向走到同色管道并真正传回大厅",
      "走错入口只多走一个短环；下落直接回到大厅地面"),
    beat(3, "西翼水库环", "reservoir-dual-return-loop", 900, 7500, 28, 2, "development",
      ["water", "wood", "red-coin", "pipe", "recovery"],
      "从大厅门进入水库，选择木排快路或连续水床稳路取得第一枚红币，再由远端管道回厅",
      "全段有连续实体水床、宽停留木排和两端出水阶梯，不以虚空作为回收"),
    beat(4, "北翼书架拆箱环", "bookshelf-break-return-loop", 4100, 7600, 28, 2, "development",
      ["box", "spin", "ground-pound", "red-coin", "door"],
      "逆向穿过旧书架，旋转或砸地拆开任一箱列取得第二枚红币，再由石门回厅",
      "箱列两侧始终留有绕行空间，下层宽书架持续承接失足"),
    beat(5, "东上翼蘑菇竖环", "mushroom-vertical-return-loop", 9700, 12600, 28, 2, "development",
      ["spring", "fungus", "vertical-loop", "red-coin", "pipe"],
      "沿宽菌台逐级上升取得第三枚红币，再从另一侧逐级下降到回厅管道",
      "整座竖环下方是实体盆地，两个回收弹簧都能重新进入主环"),
    beat(6, "东翼机械环与高手币", "mechanical-moving-return-loop", 12700, 17500, 28, 2, "twist",
      ["shuttle", "conveyor", "red-coin", "optional-branch", "door"],
      "移动台与静态慢路通向第四枚红币；第五枚只在可选高路，取得任意四枚即可回厅开门",
      "移动落点下方是连续维修层和三座宽升降台，漏掉高手币不会软锁", true),
    beat(7, "红门开启与旧环逆行", "gate-unlock-reverse-old-rings", 4000, 17500, 38, 3, "twist",
      ["coin-gate", "director", "reverse-route", "pipe", "door"],
      "唯一红门开启后才部署中继出口；先逆走机械环，再逆走书架环，旧路共同拼成快速离场线",
      "红币、红门和中继门管均留在同一场景；两条旧环的实体回收层仍然有效", true),
    beat(8, "主出口与可选宝库", "main-exit-with-optional-vault", 17600, 18900, 20, 3, "resolution",
      ["static-floor", "optional-vault", "blue-coin", "finish"],
      "主出口沿完整静态地面直接续关；宝库门只是并列蓝币支路，返回后仍走同一出口",
      "不要求额外收集，不加入敌人、等待或移动落点", true)
  ]
};

export function buildV4StageNineScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    packed,
    nodes,
    addInstance,
    addPlainNode,
    addContract,
    addTerrain,
    addTerrainPolygon,
    surfacePoint,
    grounded,
    airborne,
    recordRoute,
    addShuttle,
    addCloud,
    addWood,
    addFungus,
    addWater,
    addDirector,
    assertConservativePlatformChain,
    finalize
  } = b;

  const localWarps = [];
  const redCoins = [];
  const negativeRouteBeats = new Set();
  const recoveryWings = new Set();
  let coinGateCount = 0;

  function addGroundChain(prefix, startX, endX, y, profile = [0, 5, -4, 0]) {
    const ids = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const width = Math.min(850, endX - x);
      ids.push(addTerrain(`${prefix}${index}`, x, y + (index % 2 ? 0 : 4), width, profile));
      if (x + width >= endX) break;
      x += width - 10;
      index += 1;
    }
    return ids;
  }

  function addBox(name, x, y, properties = {}) {
    return airborne(name, "Items/Mechanisms", "box", x, y, {
      coin_count: "0",
      persistent_destroy: "true",
      ...properties
    });
  }

  function addBoxStack(prefix, x, floorY, columns, rows, spacing = 34) {
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        addBox(`${prefix}C${column + 1}R${row + 1}`, x + column * spacing, floorY - 17 - row * spacing);
      }
    }
  }

  function addLocalWarp(name, resource, x, y, targetX, targetY, role, properties = {}) {
    if (targetX < -100 || targetX > stage.levelWidth + 100) {
      throw new Error(`${name}: local warp target x is outside stage (${targetX})`);
    }
    if (targetY < stage.cameraTop - 100 || targetY > stage.cameraBottom + 100) {
      throw new Error(`${name}: local warp target y is outside camera (${targetY})`);
    }
    addInstance(name, "Items/Mechanisms", resource, {
      position: vector(x, y),
      target_pos: vector(targetX, targetY),
      move_to_scene: "false",
      "metadata/_llr_warp_role": JSON.stringify(role),
      ...properties
    });
    localWarps.push({ name, resource, x, y, targetX, targetY, role });
    return name;
  }

  function addParkedLocalWarp(name, resource, desiredX, desiredY, targetX, targetY, role) {
    const parkingOffsetX = 20000;
    addLocalWarp(name, resource, desiredX + parkingOffsetX, desiredY, targetX, targetY, role, {
      "metadata/_llr_parked_until_gate": "true",
      "metadata/_llr_deployed_x": String(desiredX),
      "metadata/_llr_deployed_y": String(desiredY)
    });
    return name;
  }

  function addRedCoin(name, x, y, wing, optional = false) {
    airborne(name, "Items/Pickups", "redCoin", x, y, {
      "metadata/_llr_treasure_wing": JSON.stringify(wing),
      "metadata/_llr_optional_fifth": optional ? "true" : "false"
    });
    redCoins.push({ name, x, y, wing, optional });
    return name;
  }

  function recordMain(beatDefinition, waypoints, options = {}) {
    if (waypoints.some((point, index) => index > 0 && point.x < waypoints[index - 1].x)) {
      negativeRouteBeats.add(beatDefinition.id);
    }
    return recordRoute(beatDefinition, "main", waypoints, options);
  }

  function markRecoveryWing(wing, contract) {
    recoveryWings.add(wing);
    addContract(`${wing}PhysicalRecoveryContract`, {
      wing: wing.toLowerCase(),
      physical_recovery: true,
      void_required: false,
      ...contract
    });
  }

  function addMapPin(name, x, y, color) {
    addPlainNode(name, "Polygon2D", "Items/Decoration/HallTreasureMap", {
      position: vector(x, y),
      polygon: packed([[0, -9], [7, -5], [9, 0], [7, 5], [0, 9], [-7, 5], [-9, 0], [-7, -5]]),
      color
    });
  }

  // Beat 1: the hall is the real spatial hub. All four collection loops and
  // the teaching loop target one of these five safe landing points.
  const hallA = addTerrain("B1HallFloorA", 7560, 240, 850, [0, -5, 4, 0]);
  const hallB = addTerrain("B1HallFloorB", 8390, 240, 850, [0, 4, -4, 0]);
  const hallC = addTerrain("B1HallFloorC", 9220, 240, 850, [0, -4, 4, 0]);
  const hallGateFloor = addTerrain("B1HallGateFloor", 10050, 240, 850, [0, 0]);
  addTerrain("B1HallAntechamber", 10880, 240, 420, [0, 0]);
  addGroundChain("B1HallLowerFoundation", 7420, 11300, 650, [0, 3, -3, 0]);

  grounded("B1HallMapSign", "Items/Decoration", "sign", hallA, 0.23, -3, {
    lines: `Array[String](["[@n,遗迹藏宝图]红门显示本场景进度：0/4。", "西下水库、西上书架、东上蘑菇、东下机械；机械高路另有第 5 枚，任取四枚即可。"] )`
  });
  grounded("B1HallReturnSign", "Items/Decoration", "sign", hallB, 0.5, -3, {
    lines: `Array[String](["所有彩色门和回程管道都留在这一关内，不会重载场景。", "每完成一翼都会回到这里；红币与红门状态会一直保留。"] )`
  });

  addPlainNode("HallTreasureMap", "Node2D", "Items/Decoration", {
    position: vector(8840, 46)
  });
  addPlainNode("MapBoard", "Polygon2D", "Items/Decoration/HallTreasureMap", {
    polygon: packed([[-150, -72], [150, -72], [150, 72], [-150, 72]]),
    color: "Color(0.22, 0.16, 0.09, 0.88)"
  });
  addPlainNode("MapTitle", "Label", "Items/Decoration/HallTreasureMap", {
    position: vector(-112, -65),
    text: JSON.stringify("四翼遗迹 · 红币 5 取 4"),
    "theme_override_colors/font_color": "Color(1, 0.9, 0.62, 1)",
    "theme_override_font_sizes/font_size": "18"
  });
  addMapPin("WaterPin", -100, 18, "Color(0.2, 0.7, 1, 1)");
  addMapPin("BooksPin", -46, -20, "Color(0.85, 0.35, 0.2, 1)");
  addMapPin("MushroomPin", 42, -20, "Color(0.9, 0.3, 0.72, 1)");
  addMapPin("MachinePin", 98, 18, "Color(0.86, 0.72, 0.18, 1)");
  addMapPin("ExpertPin", 126, -42, "Color(1, 0.12, 0.12, 1)");

  grounded("B1CentralCoinGate", "Items/Mechanisms", "coinGate", hallGateFloor, 0.28, 0, {
    required_coins: "4",
    gate_height: "192",
    open_distance: "232",
    "metadata/_llr_only_coin_gate": "true",
    "metadata/_llr_same_scene_state": "true"
  });
  coinGateCount += 1;
  addContract("B1CentralHallContract", {
    revisitable_hub: true,
    collection_wings: 4,
    red_coin_preview_markers: 5,
    required_coins: 4,
    only_coin_gate: true,
    same_scene_warps: true,
    hall_return_targets: 5
  });
  recordMain(stage.beats[0], [
    { x: 7760, y: 238 }, { x: 8250, y: 238 }, { x: 8840, y: 238 },
    { x: 9480, y: 238 }, { x: 10270, y: 238 }, { x: 9300, y: 238 },
    { x: 8500, y: 238 }, { x: 7900, y: 238 }
  ], { coinLimit: 4 });

  // Beat 2: a compact same-scene warp tutorial above the hall. Missing the
  // upper floor simply drops the player onto the central hall floor.
  const teachingFloors = addGroundChain("B2TeachingGallery", 7960, 9520, -200, [0, 4, -4, 0]);
  const teachingEntry = surfacePoint(teachingFloors.at(-1), 0.62);
  const teachingReturn = surfacePoint(teachingFloors[0], 0.2);
  const hallTeachingDoor = surfacePoint(hallA, 0.53);
  addLocalWarp("B2HallTeachingDoor", "door", hallTeachingDoor.x, hallTeachingDoor.y,
    teachingEntry.x, teachingEntry.y - 58, "hall-to-teaching-loop");
  addLocalWarp("B2TeachingReturnPipe", "pipe", teachingReturn.x, teachingReturn.y - 16,
    8200, 182, "teaching-loop-return-hall");
  airborne("B2DoorArrow", "Items/Decoration", "arrow", hallTeachingDoor.x, hallTeachingDoor.y - 74, {
    rotation: "-1.5708"
  });
  airborne("B2PipeArrow", "Items/Decoration", "arrow", teachingReturn.x + 30, teachingReturn.y - 72, {
    rotation: "1.5708"
  });
  addContract("B2DoorPipeTeachingContract", {
    local_door_count: 1,
    local_pipe_count: 1,
    actual_hall_return: true,
    wrong_route_penalty_seconds: 5,
    fall_lands_in_hall: true
  });
  recordMain(stage.beats[1], [
    { x: teachingEntry.x, y: teachingEntry.y - 2 }, { x: 9100, y: -198 },
    { x: 8700, y: -198 }, { x: 8300, y: -198 },
    { x: teachingReturn.x, y: teachingReturn.y - 2 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[1], "return", [
    { x: 8200, y: 182 }, { x: 8350, y: 238 }, { x: 8500, y: 238 }
  ], { coins: false });

  // Beat 3: a west reservoir with a complete seabed. The raft path is faster,
  // while the water path cannot strand the player and ends at solid stairs.
  const waterFarShore = addTerrain("B3FarReservoirShore", 620, 260, 760, [0, -4, 4, 0]);
  const waterNearShore = addTerrain("B3NearReservoirShore", 6380, 260, 900, [0, 4, -4, 0]);
  addGroundChain("B3ReservoirBed", 1320, 6420, 620, [0, 3, -3, 0]);
  addWater("B3ReservoirWater", 1320, 300, 5100, 410);
  addTerrainPolygon("B3FarWaterStairs", 1260, 260, [
    [0, 0], [100, 0], [100, 60], [180, 60], [180, 120], [260, 120],
    [260, 180], [340, 180], [340, 240], [420, 240], [420, 300], [520, 300]
  ], 520);
  addTerrainPolygon("B3NearWaterStairs", 5860, 260, [
    [0, 300], [100, 300], [100, 240], [180, 240], [180, 180], [260, 180],
    [260, 120], [340, 120], [340, 60], [420, 60], [420, 0], [560, 0]
  ], 520);
  [5600, 5050, 4500, 3950, 3400, 2850, 2300, 1750].forEach((x, index) => {
    addWood(`B3ReservoirRaft${index + 1}`, x, 225 + (index % 2) * 16, 7);
  });
  const waterDoorAnchor = surfacePoint(hallA, 0.84);
  addLocalWarp("B3HallWaterDoor", "door", waterDoorAnchor.x, waterDoorAnchor.y,
    6880, 202, "hall-to-water-wing");
  const waterPipeAnchor = surfacePoint(waterFarShore, 0.36);
  addLocalWarp("B3WaterReturnPipe", "pipe", waterPipeAnchor.x, waterPipeAnchor.y - 16,
    8400, 182, "water-wing-return-hall");
  addRedCoin("B3WaterWingRedCoin", 3550, 500, "water");
  airborne("B3ReservoirBottle", "Items/Pickups", "bottle", 4500, 500);
  markRecoveryWing("WaterWing", {
    continuous_seabed: true,
    water_is_safe_route: true,
    exit_stair_banks: 2,
    raft_width: 224
  });
  recordMain(stage.beats[2], [
    { x: 6880, y: 258 }, { x: 6380, y: 258 }, { x: 6100, y: 330 },
    { x: 5600, y: 480 }, { x: 5000, y: 520 }, { x: 4300, y: 520 },
    { x: 3550, y: 500 }, { x: 2800, y: 520 }, { x: 2100, y: 520 },
    { x: 1500, y: 520 }, { x: 1320, y: 440 }, { x: 1200, y: 320 },
    { x: waterPipeAnchor.x, y: waterPipeAnchor.y - 18 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[2], "bonus", [
    { x: 6200, y: 258 }, { x: 5600, y: 225 }, { x: 5050, y: 241 },
    { x: 4500, y: 225 }, { x: 3950, y: 241 }, { x: 3400, y: 225 },
    { x: 2850, y: 241 }, { x: 2300, y: 225 }, { x: 1750, y: 241 },
    { x: 1300, y: 258 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[2], "recovery", [
    { x: 6200, y: 590 }, { x: 5400, y: 590 }, { x: 4600, y: 590 },
    { x: 3800, y: 590 }, { x: 3000, y: 590 }, { x: 2200, y: 590 },
    { x: 1500, y: 590 }, { x: 1320, y: 500 }, { x: 1200, y: 380 },
    { x: waterPipeAnchor.x, y: waterPipeAnchor.y - 18 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 4: the bookshelf route runs west from the hall. Persistent boxes
  // make the room remember the player's cuts while a lower shelf catches falls.
  const bookFloors = addGroundChain("B4BookshelfFloor", 4140, 7520, -220, [0, -4, 4, 0]);
  const lowerShelfPlatforms = [];
  for (let index = 0; index < 12; index += 1) {
    lowerShelfPlatforms.push(addCloud(`B4LowerShelf${index + 1}`, 4380 + index * 260, 100 + (index % 2) * 12, 12));
  }
  addBoxStack("B4AtlasBoxes", 6120, -220, 3, 2);
  addBoxStack("B4ChronicleBoxes", 5480, -220, 2, 3);
  addBox("B4CoinCaseLeft", 5740, -237);
  addBox("B4CoinCaseRight", 5808, -237);
  addRedCoin("B4BookshelfWingRedCoin", 5774, -310, "bookshelf");
  const bookDoorAnchor = surfacePoint(hallB, 0.2);
  addLocalWarp("B4HallBookshelfDoor", "door", bookDoorAnchor.x, bookDoorAnchor.y,
    7310, -278, "hall-to-bookshelf-wing");
  const bookReturnAnchor = surfacePoint(bookFloors[0], 0.3);
  addLocalWarp("B4BookshelfReturnDoor", "door", bookReturnAnchor.x, bookReturnAnchor.y,
    8600, 182, "bookshelf-wing-return-hall");
  addShuttle("B4LowerShelfLiftWest", 4320, 100, { x: 0, y: -300 }, {
    travelSeconds: 3.0, pauseSeconds: 0.5, phase: 0.2, scaleX: 2.5, walkableWidth: 224
  });
  addShuttle("B4LowerShelfLiftEast", 7420, 100, { x: 0, y: -300 }, {
    travelSeconds: 3.0, pauseSeconds: 0.5, phase: 0.7, scaleX: 2.5, walkableWidth: 224
  });
  markRecoveryWing("BookshelfWing", {
    continuous_lower_shelf: true,
    lower_shelf_platforms: lowerShelfPlatforms.length,
    recovery_lifts: 2,
    box_bypass_width: 144
  });
  recordMain(stage.beats[3], [
    { x: 7310, y: -222 }, { x: 6900, y: -222 }, { x: 6500, y: -220 },
    { x: 6120, y: -222 }, { x: 5774, y: -310 }, { x: 5480, y: -222 },
    { x: 5000, y: -220 }, { x: 4550, y: -218 },
    { x: bookReturnAnchor.x, y: bookReturnAnchor.y - 2 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[3], "recovery", [
    { x: 7300, y: 100 }, { x: 6720, y: 112 }, { x: 6200, y: 100 },
    { x: 5680, y: 112 }, { x: 5160, y: 100 }, { x: 4640, y: 112 },
    { x: 4320, y: 100 }, { x: 4320, y: -200 }, { x: bookReturnAnchor.x, y: -220 }
  ], { recoverySeconds: 11, coinLimit: 4 });

  // Beat 5: the mushroom wing is a true vertical loop, not a one-way tower.
  // Broad caps rise on the left and descend on the right above a solid basin.
  const mushroomBasin = addGroundChain("B5MushroomBasin", 9680, 12620, 650, [0, 3, -3, 0]);
  const ascendingFungi = [];
  const risingSpecs = [
    [9900, 540], [10080, 450], [10260, 360], [10440, 270], [10620, 180],
    [10800, 90], [10980, 0], [11160, -90], [11340, -180], [11520, -270],
    [11700, -360], [11880, -450]
  ];
  risingSpecs.forEach(([x, y], index) => {
    ascendingFungi.push(addFungus(`B5RisingFungus${index + 1}`, x, y, 150 + (index % 3) * 18, 4));
  });
  const descendingFungi = [];
  const descendingSpecs = [
    [12060, -360], [12240, -270], [12420, -180], [12520, -90],
    [12520, 20], [12480, 130], [12480, 240], [12440, 350], [12400, 460], [12360, 550]
  ];
  descendingSpecs.forEach(([x, y], index) => {
    descendingFungi.push(addFungus(`B5DescendingFungus${index + 1}`, x, y, 145 + (index % 2) * 20, 4));
  });
  assertConservativePlatformChain("B5AscendingFungusChain", ascendingFungi, {
    maxGap: 96,
    maxRise: 92,
    minLandingWidth: 224
  });
  grounded("B5BasinSpringWest", "Items/Mechanisms", "spring", mushroomBasin[0], 0.42, -8, {
    launch_speed: "10.4",
    horizontal_boost: "1.6"
  });
  grounded("B5BasinSpringEast", "Items/Mechanisms", "spring", mushroomBasin.at(-1), 0.56, -8, {
    launch_speed: "10.2",
    horizontal_boost: "-1.4"
  });
  const mushroomPipeAnchor = surfacePoint(hallB, 0.58);
  addLocalWarp("B5HallMushroomPipe", "pipe", mushroomPipeAnchor.x, mushroomPipeAnchor.y - 16,
    9840, 592, "hall-to-mushroom-wing");
  addLocalWarp("B5MushroomReturnPipe", "pipe", 12390, 634,
    8800, 182, "mushroom-wing-return-hall");
  addRedCoin("B5MushroomWingRedCoin", 11880, -520, "mushroom");
  airborne("B5SummitBottle", "Items/Pickups", "bottle", 11620, -430);
  markRecoveryWing("MushroomWing", {
    solid_basin: true,
    broad_fungus_caps: risingSpecs.length + descendingSpecs.length,
    recovery_springs: 2,
    separate_descent_side: true
  });
  recordMain(stage.beats[4], [
    { x: 9840, y: 592 }, { x: 9900, y: 540 }, { x: 10080, y: 450 },
    { x: 10260, y: 360 }, { x: 10440, y: 270 }, { x: 10620, y: 180 },
    { x: 10800, y: 90 }, { x: 10980, y: 0 }, { x: 11160, y: -90 },
    { x: 11340, y: -180 }, { x: 11520, y: -270 }, { x: 11700, y: -360 },
    { x: 11880, y: -450 }, { x: 12060, y: -360 }, { x: 12240, y: -270 },
    { x: 12420, y: -180 }, { x: 12520, y: -90 }, { x: 12520, y: 20 },
    { x: 12480, y: 130 }, { x: 12480, y: 240 }, { x: 12440, y: 350 },
    { x: 12400, y: 460 }, { x: 12360, y: 550 }, { x: 12390, y: 620 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[4], "recovery", [
    { x: 9840, y: 620 }, { x: 10300, y: 620 }, { x: 10800, y: 620 },
    { x: 11300, y: 620 }, { x: 11800, y: 620 }, { x: 12360, y: 620 }
  ], { recoverySeconds: 10, coinLimit: 4 });

  // Beat 6: the mechanical wing's required coin sits on the readable main
  // line. The fifth coin is visibly higher and every miss lands on maintenance.
  const mechanicalStart = addTerrain("B6MechanicalStart", 12720, 260, 700, [0, -4, 4, 0]);
  const mechanicalIslandA = addTerrain("B6MechanicalIslandA", 13920, 220, 700, [0, 4, -4, 0]);
  const mechanicalIslandB = addTerrain("B6MechanicalIslandB", 15120, 100, 620, [0, -4, 4, 0]);
  const mechanicalFarA = addTerrain("B6MechanicalFarA", 16420, 240, 850, [0, 4, -4, 0]);
  const mechanicalFarB = addTerrain("B6MechanicalFarB", 17250, 240, 360, [0, 0]);
  addGroundChain("B6MaintenanceFloor", 12680, 17620, 650, [0, 3, -3, 0]);

  const mechanicalShuttles = [
    addShuttle("B6MechanicalShuttleA", 13480, 240, { x: 360, y: -20 }, {
      travelSeconds: 3.0, pauseSeconds: 0.55, phase: 0.1, scaleX: 2.5, walkableWidth: 224
    }),
    addShuttle("B6MechanicalShuttleB", 14680, 200, { x: 420, y: -100 }, {
      travelSeconds: 3.2, pauseSeconds: 0.55, phase: 0.45, scaleX: 2.5, walkableWidth: 224
    }),
    addShuttle("B6MechanicalShuttleC", 15800, 100, { x: 520, y: 140 }, {
      travelSeconds: 3.4, pauseSeconds: 0.6, phase: 0.72, scaleX: 2.5, walkableWidth: 224
    })
  ];
  airborne("B6ReverseBeltA", "Items/Mechanisms", "conveyor", 14240, 208, {
    width: "288",
    speed: "-88",
    "metadata/_llr_reverse_exit_assist": "true"
  });
  airborne("B6ReverseBeltB", "Items/Mechanisms", "conveyor", 15380, 88, {
    width: "288",
    speed: "-96",
    "metadata/_llr_reverse_exit_assist": "true"
  });
  addRedCoin("B6MechanicalWingRedCoin", 15420, 18, "mechanical");
  grounded("B6ExpertSpring", "Items/Mechanisms", "spring", mechanicalIslandB, 0.72, -8, {
    launch_speed: "11.0",
    horizontal_boost: "2.0"
  });
  const expertPlatforms = [
    addCloud("B6ExpertCloudA", 15720, -90, 13),
    addShuttle("B6ExpertShuttle", 16020, -170, { x: 360, y: -100 }, {
      travelSeconds: 3.2, pauseSeconds: 0.6, phase: 0.3, scaleX: 2.5, walkableWidth: 224
    }),
    addCloud("B6ExpertCloudB", 16480, -250, 13),
    addCloud("B6ExpertCloudC", 16800, -170, 13)
  ];
  addRedCoin("B6ExpertBranchRedCoin", 16480, -330, "mechanical-high", true);
  airborne("B6ExpertBlueCoin", "Items/Pickups", "blueCoin", 16800, -250);

  [13620, 14920, 16220].forEach((x, index) => {
    addShuttle(`B6MaintenanceLift${index + 1}`, x, 620, { x: 0, y: -340 - index * 40 }, {
      travelSeconds: 3.0 + index * 0.2,
      pauseSeconds: 0.55,
      phase: index * 0.3,
      scaleX: 2.5,
      walkableWidth: 224
    });
    addCloud(`B6MaintenanceWait${index + 1}`, x - 220, 600, 12);
  });
  addShuttle("B6MaintenanceExitLift", 17380, 620, { x: 0, y: -380 }, {
    travelSeconds: 3.2,
    pauseSeconds: 0.55,
    phase: 0.55,
    scaleX: 2.5,
    walkableWidth: 224
  });
  addCloud("B6MaintenanceExitWait", 17140, 600, 12);
  const mechanicalDoorAnchor = surfacePoint(hallC, 0.32);
  addLocalWarp("B6HallMechanicalDoor", "door", mechanicalDoorAnchor.x, mechanicalDoorAnchor.y,
    12940, 202, "hall-to-mechanical-wing");
  const mechanicalReturnAnchor = surfacePoint(mechanicalFarB, 0.58);
  addLocalWarp("B6MechanicalReturnDoor", "door", mechanicalReturnAnchor.x, mechanicalReturnAnchor.y,
    9000, 182, "mechanical-wing-return-hall");
  markRecoveryWing("MechanicalWing", {
    continuous_maintenance_floor: true,
    recovery_lifts: 4,
    moving_landing_width: 224,
    required_red_coins: 1,
    optional_red_coins: 1
  });
  addContract("B6FiveChooseFourContract", {
    total_red_coins: 5,
    required_red_coins: 4,
    required_wing_coins: 4,
    optional_expert_coins: 1,
    miss_cannot_softlock: true
  });
  recordMain(stage.beats[5], [
    { x: 12940, y: 258 }, { x: 13380, y: 258 }, { x: 13480, y: 230 },
    { x: 13840, y: 210 }, { x: 14040, y: 218 }, { x: 14580, y: 218 },
    { x: 14680, y: 190 }, { x: 15100, y: 90 }, { x: 15380, y: 98 },
    { x: 15720, y: 98 }, { x: 15800, y: 90 }, { x: 16320, y: 230 },
    { x: 16600, y: 238 }, { x: 17100, y: 238 },
    { x: mechanicalReturnAnchor.x, y: mechanicalReturnAnchor.y - 2 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[5], "bonus", [
    { x: 15480, y: 98 }, { x: 15720, y: -90 }, { x: 16020, y: -170 },
    { x: 16380, y: -270 }, { x: 16480, y: -250 }, { x: 16800, y: -170 },
    { x: 17000, y: 50 }, { x: 17100, y: 238 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[5], "recovery", [
    { x: 12900, y: 620 }, { x: 13620, y: 620 }, { x: 14300, y: 620 },
    { x: 14920, y: 620 }, { x: 15600, y: 620 }, { x: 16220, y: 620 },
    { x: 16900, y: 620 }, { x: 17380, y: 620 }, { x: 17380, y: 240 },
    { x: mechanicalReturnAnchor.x, y: mechanicalReturnAnchor.y - 2 }
  ], { recoverySeconds: 13, coinLimit: 5 });

  // Beat 7: the sole coin gate physically protects this trigger. Before the
  // gate opens, both relay warps are parked 20,000 px off-stage. Crossing the
  // opened gate deploys them, so normal wing visits cannot reach the exit path.
  const reverseStartDoor = addLocalWarp("B7ReverseMechanicalDoor", "door", 10880, 240,
    mechanicalReturnAnchor.x, mechanicalReturnAnchor.y - 58, "coin-gate-to-mechanical-far-end");
  const relayPipeDesired = { x: 12810, y: 244 };
  const reverseRelayPipe = addParkedLocalWarp("B7MechanicalReverseRelayPipe", "pipe",
    relayPipeDesired.x, relayPipeDesired.y, bookReturnAnchor.x, bookReturnAnchor.y - 58,
    "reverse-mechanical-to-bookshelf-far-end");
  const bookExitDoorDesired = { x: 7390, y: -220 };
  const reverseExitDoor = addParkedLocalWarp("B7BooksReverseExitDoor", "door",
    bookExitDoorDesired.x, bookExitDoorDesired.y, 17740, 182,
    "reverse-bookshelf-to-exit-foyer");
  addDirector("B7DeployReverseExitDirector", 10580, 120, {
    move: [
      `../Items/Mechanisms/${reverseRelayPipe}`,
      `../Items/Mechanisms/${reverseExitDoor}`
    ],
    moveOffset: { x: -20000, y: 0 },
    moveSeconds: 0.12,
    announcement: "遗迹机关反向：逆走机械环，再逆走书架环",
    checkpoint: true,
    width: 260,
    height: 240
  });
  airborne("B7ReverseDoorArrow", "Items/Decoration", "arrow", 10880, 166, {
    rotation: "-1.5708"
  });
  addContract("B7GateDeploymentContract", {
    protected_by_only_coin_gate: true,
    parked_warps_before_unlock: 2,
    deployment_offset_x: -20000,
    same_scene_state: true,
    reverse_old_loops: 2,
    main_exit_requires_vault: false
  });
  recordMain(stage.beats[6], [
    { x: mechanicalReturnAnchor.x, y: mechanicalReturnAnchor.y - 2 },
    { x: 17100, y: 238 }, { x: 16600, y: 238 }, { x: 16320, y: 230 },
    { x: 15800, y: 90 }, { x: 15720, y: 98 }, { x: 15380, y: 98 },
    { x: 15100, y: 90 }, { x: 14680, y: 190 }, { x: 14580, y: 218 },
    { x: 14040, y: 218 }, { x: 13840, y: 210 }, { x: 13480, y: 230 },
    { x: 12940, y: 258 }, { x: relayPipeDesired.x, y: relayPipeDesired.y - 2 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[6], "reverseRelay", [
    { x: bookReturnAnchor.x, y: bookReturnAnchor.y - 2 }, { x: 4550, y: -218 },
    { x: 5000, y: -220 }, { x: 5480, y: -222 }, { x: 5774, y: -220 },
    { x: 6120, y: -222 }, { x: 6500, y: -220 }, { x: 6900, y: -222 },
    { x: 7310, y: -222 }, { x: bookExitDoorDesired.x, y: bookExitDoorDesired.y - 2 }
  ], { coins: false });
  recordRoute(stage.beats[6], "reverseRecovery", [
    { x: 16900, y: 620 }, { x: 16220, y: 620 }, { x: 15500, y: 620 },
    { x: 14920, y: 620 }, { x: 14200, y: 620 }, { x: 13620, y: 620 },
    { x: 12900, y: 620 }, { x: relayPipeDesired.x, y: relayPipeDesired.y - 2 }
  ], { coins: false });

  // Beat 8: the exit is a flat, static line. The vault is entered by a door
  // above that line and contains only optional blue/yellow coins.
  const exitFloorA = addTerrain("B8ExitFoyerA", 17580, 240, 850, [0, -4, 4, 0]);
  const exitFloorB = addTerrain("B8ExitFoyerB", 18410, 240, 530, [0, 0]);
  const vaultFloor = addTerrain("B8OptionalVaultFloor", 18040, -280, 760, [0, 4, -4, 0]);
  const vaultDoorAnchor = surfacePoint(exitFloorA, 0.45);
  addLocalWarp("B8OptionalVaultDoor", "door", vaultDoorAnchor.x, vaultDoorAnchor.y,
    18200, -338, "main-exit-to-optional-vault");
  const vaultReturnAnchor = surfacePoint(vaultFloor, 0.78);
  addLocalWarp("B8VaultReturnDoor", "door", vaultReturnAnchor.x, vaultReturnAnchor.y,
    18360, 182, "optional-vault-return-main-exit");
  airborne("B8VaultBlueCoinA", "Items/Pickups", "blueCoin", 18320, -360);
  airborne("B8VaultBlueCoinB", "Items/Pickups", "blueCoin", 18520, -350);
  [18140, 18220, 18300, 18380, 18460, 18540, 18620].forEach((x, index) => {
    airborne(`B8VaultCoin${index + 1}`, "Items/Coins", "coin", x, -350 - (index % 2) * 20);
  });
  grounded("B8MainExitSign", "Items/Decoration", "sign", exitFloorA, 0.18, -3, {
    lines: `Array[String](["直走就是主出口。上方宝库只放奖励，不需要红币，也不影响通关。"] )`
  });
  addContract("B8OptionalVaultContract", {
    static_main_exit: true,
    vault_optional: true,
    vault_red_coins: 0,
    vault_return_to_main: true,
    enemy_count: 0
  });
  recordMain(stage.beats[7], [
    { x: 17740, y: 238 }, { x: 18100, y: 238 }, { x: 18400, y: 238 },
    { x: 18700, y: 238 }, { x: 18880, y: 238 }
  ], { coinLimit: 3 });
  recordRoute(stage.beats[7], "bonus", [
    { x: vaultDoorAnchor.x, y: vaultDoorAnchor.y - 2 }, { x: 18200, y: -280 },
    { x: 18400, y: -280 }, { x: 18600, y: -280 },
    { x: vaultReturnAnchor.x, y: vaultReturnAnchor.y - 2 }
  ], { coinLimit: 3 });

  // In-memory structural assertions. These intentionally replace a full
  // play-through during generation while still proving the stage topology.
  const beatWidths = stage.beats.map((item) => Math.abs(item.endX - item.startX));
  if (stage.beats.length !== 8 || new Set(beatWidths).size !== 8) {
    throw new Error(`V4 stage 9 requires eight non-equal beat widths (${beatWidths.join(",")})`);
  }
  if (stage.beats.reduce((total, item) => total + item.seconds, 0) !== 214) {
    throw new Error("V4 stage 9 target duration must remain 214 seconds");
  }
  if (redCoins.length !== 5 || redCoins.filter((coin) => coin.optional).length !== 1) {
    throw new Error("V4 stage 9 must contain exactly five red coins with one optional expert coin");
  }
  if (new Set(redCoins.map((coin) => coin.wing)).size !== 5) {
    throw new Error("V4 stage 9 red-coin landmarks are not uniquely identified");
  }
  if (coinGateCount !== 1) {
    throw new Error(`V4 stage 9 must contain exactly one coin gate (${coinGateCount})`);
  }
  const hallReturns = localWarps.filter((warp) => warp.role.endsWith("return-hall"));
  if (hallReturns.length !== 5 || !hallReturns.every((warp) => warp.targetY === 182)) {
    throw new Error("V4 stage 9 teaching and four wing loops must physically return to the hall");
  }
  if (recoveryWings.size !== 4) {
    throw new Error(`V4 stage 9 requires four physical wing recovery routes (${recoveryWings.size})`);
  }
  if (!negativeRouteBeats.has(2) || !negativeRouteBeats.has(3) || !negativeRouteBeats.has(4) || !negativeRouteBeats.has(7)) {
    throw new Error("V4 stage 9 must record the real westward and reverse routes with negative dx");
  }
  if (mechanicalShuttles.some((platform) => platform.walkableWidth < 224)
    || expertPlatforms.some((platform) => platform.walkableWidth < 210)) {
    throw new Error("V4 stage 9 mechanical moving landings became too narrow");
  }
  if (!localWarps.every((warp) => warp.resource === "door" || warp.resource === "pipe")) {
    throw new Error("V4 stage 9 local loop transport must use physical doors or pipes");
  }
  if (!localWarps.some((warp) => warp.name === reverseStartDoor)) {
    throw new Error("V4 stage 9 reverse exit is not connected to the opened gate");
  }

  const scene = finalize({
    startSurface: hallA,
    spawnT: 0.18,
    introLines: [
      "[@n,老师快跑]9 遗迹寻宝环线 · V4",
      "四个翼区都会回到中央大厅。五枚红币任取四枚开门；开门后逆走两条旧环，宝库完全可选。"
    ],
    finishPosition: { x: 18945, y: 240 },
    finishSize: { x: 92, y: 360 },
    finishBlueCoin: { x: 18780, y: 170 },
    extraFlowMetadata: {
      revisitable_central_hall: true,
      same_scene_local_warps: localWarps.length,
      red_coin_total: redCoins.length,
      red_coin_required: 4,
      coin_gate_count: coinGateCount,
      physical_recovery_wings: recoveryWings.size,
      reverse_old_loops: 2,
      optional_vault_required: false,
      void_required: false
    }
  });

  const coinGateResource = context.resourceIds.coinGate;
  const redCoinResource = context.resourceIds.redCoin;
  const gateInstances = (scene.match(new RegExp(`instance=ExtResource\\("${coinGateResource}"\\)`, "g")) || []).length;
  const redCoinInstances = (scene.match(new RegExp(`instance=ExtResource\\("${redCoinResource}"\\)`, "g")) || []).length;
  const nodeCount = (scene.match(/^\[node /gm) || []).length;
  if (gateInstances !== 1 || redCoinInstances !== 5 || !scene.includes("required_coins = 4")) {
    throw new Error(`V4 stage 9 generated gate/coin closure failed (gate=${gateInstances}, red=${redCoinInstances})`);
  }
  if (nodeCount < 180 || nodeCount > 500) {
    throw new Error(`V4 stage 9 node budget is outside 180-500 (${nodeCount})`);
  }
  if (!scene.includes("move_offset = Vector2(-20000, 0)")) {
    throw new Error("V4 stage 9 gated reverse relays are not physically deployed after unlock");
  }
  return scene;
}
