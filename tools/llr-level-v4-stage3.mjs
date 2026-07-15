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

export const V4_STAGE_THREE_BLUEPRINT = {
  id: 3,
  title: "3 爆弹拆迁城 · V4",
  description: "安全拆箱、多层仓架、支撑坍塌、逆带分拣与冲压拆除",
  tint: "Color(1, 0.93, 0.84, 1)",
  spawnY: 240,
  levelWidth: 25000,
  cameraTop: -620,
  cameraBottom: 780,
  finishY: 340,
  beats: [
    beat(1, "封锁预览", "boxed-exit-preview", 0, 2200, 18, 1, "introduction",
      ["terrain", "box", "preview"],
      "隔着围栏看见封住旧出口的箱墙和远处施工坡，先理解本关目标",
      "开场是完整静态地面，箱墙旁保留宽绕行口"),
    beat(2, "安全拆箱场", "breakable-training-yard", 2200, 4700, 24, 1, "introduction",
      ["box", "ground_pound", "spin", "terrain"],
      "在没有敌人的宽场地用旋转或砸地拆箱，任选一列打开前路",
      "每列箱子旁都有不依赖破箱的绕行空间"),
    beat(3, "三层仓架", "three-storey-warehouse", 4700, 8100, 30, 2, "development",
      ["box", "branch", "terrain", "cloud"],
      "破坏不同楼层的箱子，选择屋顶快路、中层收集路或连续地面稳路",
      "三路在段尾重汇，上层失足直接落到连续底层"),
    beat(4, "支撑坍塌", "persistent-collapse-ramp", 8100, 10000, 14, 2, "development",
      ["objective", "ground_pound", "director", "terrain"],
      "砸断标记支撑，旧障碍下沉并让施工坡从下方升入可碰撞位置",
      "目标位于无敌人的宽操作台，改变前后均不存在虚空", true),
    beat(5, "逆带分拣廊", "reverse-conveyor-sorting", 10000, 13800, 34, 2, "development",
      ["conveyor", "box", "bobomb", "terrain"],
      "逆向传送带持续改变站位，玩家在静态停车区拆箱后换到下一条带",
      "每条带尾有实体挡板和宽静态停车区，爆弹不承担开路功能"),
    beat(6, "冲压拆除线", "thwomp-target-sequence", 13800, 17000, 32, 2, "twist",
      ["thwomp", "objective", "director", "ground_pound"],
      "依次诱导三台 Thwomp 砸中宽地板靶，每次命中打开下一段防护门",
      "阴影区两侧均有宽凹槽，玩家也能直接砸地完成靶标", true),
    beat(7, "三阶段工头终局", "foreman-three-phase", 17000, 21700, 42, 3, "twist",
      ["box", "thwomp", "objective", "director", "conveyor"],
      "先拆外罩、再穿冲压窗口、最后砸断总支撑，三个动作分区完成",
      "每阶段有静态检查点和绕行空间，最后目标可由砸地直接完成", true),
    beat(8, "拆出的下坡", "changed-world-downhill", 21700, 25000, 20, 3, "resolution",
      ["terrain", "slope", "finish"],
      "沿自己刚拆出的连续施工下坡离场，回看已经改变的工地轮廓",
      "终段无敌人、无移动落点、无新增操作", true)
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

export function buildV4StageThreeScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    packed,
    addInstance,
    addContract,
    addTerrain,
    addTerrainPolygon,
    surfacePoint,
    grounded,
    airborne,
    recordRoute,
    addCloud,
    addWood,
    addDirector,
    finalize
  } = b;

  function addGroundChain(prefix, startX, endX, y, profile = [0, 5, -4, 0]) {
    const surfaces = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const width = Math.min(850, endX - x);
      surfaces.push(addTerrain(`${prefix}${index}`, x, y + (index % 2 ? 0 : 4), width, profile));
      if (x + width >= endX) break;
      x += width - 10;
      index += 1;
    }
    return surfaces;
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

  function addObjective(name, x, y, metadata = {}) {
    return airborne(name, "Items/Mechanisms", "objectiveTarget", x, y, {
      "metadata/_llr_ground_pound_fallback": "true",
      ...metadata
    });
  }

  function addObjectiveMoveDirector(name, objectiveName, moveName, offset, announcement = "") {
    addDirector(name, 0, 0, {
      objectives: [`../Items/Mechanisms/${objectiveName}`],
      waitForObjectives: true,
      move: [moveName],
      moveOffset: offset,
      moveSeconds: 0.7,
      announcement,
      checkpoint: true,
      width: 16,
      height: 16
    });
  }

  // Beat 1: preview the obstruction without forcing the player into it.
  const b1start = addTerrain("B1TrainingStart", -40, 240, 760, [0, -8, 6, 0]);
  const b1middle = addTerrain("B1PreviewMiddle", 700, 240, 780, [0, 6, -6, 0]);
  const b1exit = addTerrain("B1PreviewExit", 1460, 235, 780, [0, -5, 5, 0]);
  addBoxStack("B1PreviewWall", 1540, 235, 3, 4);
  grounded("B1PreviewFenceSign", "Items/Decoration", "sign", b1middle, 0.48, -3, {
    lines: `Array[String](["箱墙可以旋转或砸地拆除；爆弹只会制造压力，不负责替你开门。"] )`
  });
  grounded("B1PreviewTree", "Items/Decoration", "smallTree", b1start, 0.78, -38);
  addContract("B1PreviewContract", {
    safe_floor: true,
    bypass_width: 220,
    mandatory_enemy: false,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 238 }, { x: 650, y: 235 }, { x: 1180, y: 240 },
    { x: 1500, y: 232 }, { x: 1900, y: 235 }, { x: 2180, y: 235 }
  ]);

  // Beat 2: multiple box lanes, all with permanent floor and a visible bypass.
  const b2grounds = addGroundChain("B2BreakYard", 2200, 4700, 240);
  addBoxStack("B2LaneA", 2730, 240, 2, 3);
  addBoxStack("B2LaneB", 3350, 240, 3, 2);
  addBoxStack("B2LaneC", 4020, 240, 2, 4);
  addCloud("B2BypassCloudA", 2940, 128, 10);
  addCloud("B2BypassCloudB", 3630, 122, 10);
  airborne("B2PracticeBottle", "Items/Pickups", "bottle", 3720, 190);
  addContract("B2BreakTrainingContract", {
    box_lanes: 3,
    spin_or_pound: true,
    bypass_available: true,
    enemy_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2220, y: 238 }, { x: 2680, y: 238 }, { x: 3060, y: 235 },
    { x: 3500, y: 240 }, { x: 3940, y: 236 }, { x: 4380, y: 240 },
    { x: 4680, y: 238 }
  ]);
  recordRoute(stage.beats[1], "bonus", [
    { x: 2500, y: 235 }, { x: 2820, y: 128 }, { x: 3100, y: 128 },
    { x: 3480, y: 122 }, { x: 3750, y: 122 }, { x: 4200, y: 230 }
  ], { coinLimit: 4 });

  // Beat 3: three routes share one warehouse shell; the floor route never disappears.
  addTerrainPolygon("B3WarehouseDownStairs", 4700, 240, downStairs(3, 90, 40, 100), 400);
  const b3floor = addGroundChain("B3WarehouseFloor", 5070, 7800, 360);
  addTerrainPolygon("B3WarehouseUpStairs", 7660, 240, upStairs(3, 90, 40, 100), 400);
  const b3exit = addTerrain("B3WarehouseExit", 8030, 240, 190, [0, 0]);
  const midA = addTerrain("B3MidShelfA", 5200, 165, 720, [0, 0, 6, 0]);
  const midB = addTerrain("B3MidShelfB", 6100, 150, 760, [0, -6, 4, 0]);
  const midC = addTerrain("B3MidShelfC", 7040, 170, 620, [0, 5, -4, 0]);
  addWood("B3RoofRampA", 5380, 55, 6);
  addWood("B3RoofRampB", 5740, 20, 6);
  addWood("B3RoofRampC", 6120, 10, 6);
  addWood("B3RoofRampD", 6500, 40, 6);
  addWood("B3RoofRampE", 6880, 20, 6);
  addWood("B3RoofRampF", 7260, 60, 6);
  addBoxStack("B3FloorBoxesA", 5640, 360, 2, 2);
  addBoxStack("B3FloorBoxesB", 6740, 360, 2, 3);
  grounded("B3MidBoxA", "Items/Mechanisms", "box", midA, 0.58, -17, { coin_count: "1", persistent_destroy: "true" });
  grounded("B3MidBoxB", "Items/Mechanisms", "box", midB, 0.48, -17, { coin_count: "1", persistent_destroy: "true" });
  grounded("B3MidBoxC", "Items/Mechanisms", "box", midC, 0.54, -17, { coin_count: "1", persistent_destroy: "true" });
  addContract("B3WarehouseContract", {
    route_count: 3,
    continuous_lower_floor: true,
    upper_failure_to_lower: true,
    mandatory_enemy: false,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 4720, y: 238 }, { x: 5060, y: 350 }, { x: 5550, y: 358 },
    { x: 6200, y: 360 }, { x: 6880, y: 358 }, { x: 7520, y: 360 },
    { x: 7820, y: 280 }, { x: 8080, y: 238 }
  ]);
  recordRoute(stage.beats[2], "recovery", [
    { x: 5280, y: 340 }, { x: 5900, y: 345 }, { x: 6550, y: 345 },
    { x: 7200, y: 345 }, { x: 7720, y: 330 }, { x: 8000, y: 245 }
  ], { recoverySeconds: 10, coinLimit: 4 });
  recordRoute(stage.beats[2], "bonus", [
    { x: 5000, y: 230 }, { x: 5300, y: 160 }, { x: 5600, y: 55 },
    { x: 6120, y: 10 }, { x: 6600, y: 40 }, { x: 7100, y: 30 },
    { x: 7500, y: 160 }, { x: 7900, y: 240 }
  ], { coinLimit: 6 });

  // Beat 4: target completion swaps collision-bearing structures in a safe plaza.
  addTerrainPolygon("B4PlazaRise", 8100, 240, upStairs(2, 100, 40, 100), 400);
  const b4plaza = addTerrain("B4CollapsePlaza", 8400, 160, 740, [0, 5, -5, 0]);
  const b4target = addObjective("B4CollapseTarget", 8840, 146, {
    "metadata/_llr_objective_role": JSON.stringify("support")
  });
  addTerrain("B4OldSupportGate", 9080, -20, 110, [0, 0], 200);
  addTerrainPolygon("B4NewCollapseSlope", 9140, 580,
    [[0, 0], [160, -40], [320, -80], [480, -120], [640, -160], [860, -200]], 220);
  addObjectiveMoveDirector("B4RemoveOldSupport", "B4CollapseTarget", "../Terrain/B4OldSupportGate",
    { x: 0, y: 420 }, "支撑已拆除，施工坡正在落位");
  addObjectiveMoveDirector("B4InstallCollapseSlope", "B4CollapseTarget", "../Terrain/B4NewCollapseSlope",
    { x: 0, y: -420 });
  addContract("B4PhysicalCollapseContract", {
    objective_driven: true,
    old_collision_moves_first: true,
    new_collision_enabled: true,
    ground_pound_fallback: true,
    checkpoint: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 8120, y: 238 }, { x: 8400, y: 175 }, { x: 8840, y: 150 },
    { x: 9160, y: 155 }, { x: 9480, y: 80 }, { x: 9800, y: 5 },
    { x: 9980, y: -35 }
  ]);

  // Beat 5: short reverse belts separated by wide static sorting bays.
  const b5grounds = addGroundChain("B5SortingFloor", 10000, 13800, 20, [0, 4, -4, 0]);
  const conveyorSpecs = [
    [10420, -2, 280, -85], [11140, 2, 320, -105], [11920, -2, 288, -90],
    [12700, 2, 320, -110], [13420, -2, 248, -80]
  ];
  conveyorSpecs.forEach(([x, y, width, speed], index) => {
    airborne(`B5ReverseBelt${index + 1}`, "Items/Mechanisms", "conveyor", x, y, {
      width: String(width),
      speed: String(speed),
      "metadata/_llr_static_bay_after": "true"
    });
  });
  addBoxStack("B5SortBoxesA", 10820, 20, 2, 2);
  addBoxStack("B5SortBoxesB", 12300, 20, 3, 2);
  addBoxStack("B5SortBoxesC", 13120, 20, 2, 3);
  grounded("B5OptionalBobomb", "Items/Enemies", "bobomb", b5grounds[2], 0.68, -16, {
    "metadata/_llr_optional_pressure": "true"
  });
  airborne("B5SortingBottle", "Items/Pickups", "bottle", 12500, -35);
  addContract("B5SortingContract", {
    conveyor_count: 5,
    static_parking_bays: 6,
    end_stoppers: true,
    bobomb_required: false,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 10020, y: 18 }, { x: 10420, y: 15 }, { x: 10820, y: 18 },
    { x: 11200, y: 20 }, { x: 11600, y: 18 }, { x: 12000, y: 20 },
    { x: 12400, y: 18 }, { x: 12800, y: 20 }, { x: 13200, y: 18 },
    { x: 13600, y: 20 }, { x: 13780, y: 18 }
  ]);

  // Beat 6: each impact target controls exactly one nearby gate.
  const b6grounds = addGroundChain("B6PressFloor", 13800, 17000, 120, [0, 4, -4, 0]);
  const presses = [
    { x: 14320, gateX: 14900 },
    { x: 15320, gateX: 15900 },
    { x: 16320, gateX: 16820 }
  ];
  presses.forEach((press, index) => {
    const number = index + 1;
    addObjective(`B6FloorTarget${number}`, press.x, 108, {
      "metadata/_llr_objective_role": JSON.stringify("thwomp-floor")
    });
    airborne(`B6Thwomp${number}`, "Items/Enemies", "thwomp", press.x, -170, {
      attack_mode: "0",
      attack_delay: "0.65",
      ground_wait: "0.8",
      detection_range: vector(150, 270)
    });
    addTerrain(`B6SafetyGate${number}`, press.gateX, -65, 120, [0, 0], 190);
    addObjectiveMoveDirector(`B6GateDirector${number}`, `B6FloorTarget${number}`,
      `../Terrain/B6SafetyGate${number}`, { x: 0, y: 300 }, `冲压靶 ${number}/3 已完成`);
    addCloud(`B6SafetyAlcove${number}A`, press.x - 150, 48, 9);
    addCloud(`B6SafetyAlcove${number}B`, press.x + 150, 48, 9);
  });
  addContract("B6ThwompTargetsContract", {
    target_count: 3,
    warning_seconds: 1.5,
    side_alcoves: 6,
    ground_pound_fallback: true,
    sequential_gates: true,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 13820, y: 118 }, { x: 14200, y: 118 }, { x: 14320, y: 108 },
    { x: 14800, y: 118 }, { x: 15320, y: 108 }, { x: 15800, y: 118 },
    { x: 16320, y: 108 }, { x: 16800, y: 118 }, { x: 16980, y: 118 }
  ]);
  recordRoute(stage.beats[5], "recovery", [
    { x: 14000, y: 115 }, { x: 14320, y: 48 }, { x: 14600, y: 115 },
    { x: 15320, y: 48 }, { x: 15600, y: 115 }, { x: 16320, y: 48 },
    { x: 16700, y: 115 }
  ], { recoverySeconds: 9, coinLimit: 4 });

  // Beat 7: three readable phases, each on a static floor with its own checkpoint.
  const b7grounds = addGroundChain("B7ForemanFloor", 17000, 21700, 120, [0, 4, -4, 0]);
  addBoxStack("B7OuterShellA", 17620, 120, 3, 3);
  addBoxStack("B7OuterShellB", 18020, 120, 2, 4);
  addDirector("B7PhaseOneCheckpoint", 18300, 50, {
    announcement: "第一阶段：外罩已通过",
    checkpoint: true,
    width: 260,
    height: 190
  });
  airborne("B7ForemanThwomp", "Items/Enemies", "thwomp", 19020, -180, {
    attack_mode: "0",
    attack_delay: "0.75",
    ground_wait: "0.9",
    detection_range: vector(180, 290)
  });
  addCloud("B7PressWindowLeft", 18760, 45, 10);
  addCloud("B7PressWindowRight", 19280, 45, 10);
  addDirector("B7PhaseTwoCheckpoint", 19520, 50, {
    announcement: "第二阶段：冲压窗口已通过",
    checkpoint: true,
    width: 260,
    height: 190
  });
  addObjective("B7FinalSupportTarget", 20220, 108, {
    "metadata/_llr_objective_role": JSON.stringify("foreman-final-support")
  });
  addTerrain("B7FinalBarrier", 20620, -65, 130, [0, 0], 190);
  addTerrainPolygon("B7FinalExitRamp", 20700, 540,
    [[0, 0], [170, 28], [340, 56], [510, 84], [680, 112], [900, 140]], 200);
  addObjectiveMoveDirector("B7RemoveFinalBarrier", "B7FinalSupportTarget", "../Terrain/B7FinalBarrier",
    { x: 0, y: 320 }, "总支撑已拆除，离场下坡形成");
  addObjectiveMoveDirector("B7InstallFinalRamp", "B7FinalSupportTarget", "../Terrain/B7FinalExitRamp",
    { x: 0, y: -420 });
  addDirector("B7FinalCheckpoint", 21280, 155, {
    announcement: "第三阶段完成：沿新下坡离场",
    checkpoint: true,
    width: 280,
    height: 220
  });
  addContract("B7ForemanContract", {
    phase_count: 3,
    per_phase_checkpoint: true,
    optional_boxes: true,
    safe_thwomp_window: true,
    final_ground_pound_fallback: true,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 17020, y: 118 }, { x: 17600, y: 118 }, { x: 18200, y: 118 },
    { x: 18700, y: 115 }, { x: 19020, y: 110 }, { x: 19500, y: 118 },
    { x: 20000, y: 115 }, { x: 20220, y: 108 }, { x: 20600, y: 115 },
    { x: 20900, y: 155 }, { x: 21300, y: 225 }, { x: 21680, y: 295 }
  ]);

  // Beat 8: a static, gap-free downhill resolution.
  const b8a = addTerrain("B8ChangedSlopeA", 21600, 300, 850, [0, 45, 90, 130]);
  const b8b = addTerrain("B8ChangedSlopeB", 22430, 430, 850, [0, 35, 70, 95]);
  const b8c = addTerrain("B8ChangedSlopeC", 23260, 525, 850, [0, 22, 42, 58]);
  const b8d = addTerrain("B8ChangedSlopeD", 24090, 583, 850, [0, -18, -36, -48]);
  const b8finish = addTerrain("B8ChangedFinish", 24920, 535, 160, [0, 0]);
  grounded("B8FinishSign", "Items/Decoration", "sign", b8d, 0.7, -3, {
    lines: `Array[String](["你刚拆出的坡已经成为新的道路。前方是安全终点。"] )`
  });
  addContract("B8ChangedWorldContract", {
    continuous_downhill: true,
    enemy_count: 0,
    moving_platform_count: 0,
    new_input_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 21720, y: 315 }, { x: 22100, y: 360 }, { x: 22500, y: 440 },
    { x: 23000, y: 500 }, { x: 23500, y: 545 }, { x: 24000, y: 580 },
    { x: 24500, y: 565 }, { x: 24950, y: 535 }
  ]);

  return finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]3 爆弹拆迁城 · V4",
      "旋转或砸地都能拆箱。标记地板既可让冲压机砸中，也能由你直接砸地完成。"
    ],
    finishPosition: { x: 25045, y: 440 },
    finishSize: { x: 92, y: 360 },
    finishBlueCoin: { x: 24720, y: 485 },
    extraFlowMetadata: {
      objective_count: 5,
      physical_collapse_events: 2,
      thwomp_fallback: true,
      mandatory_bobomb: false,
      changed_world_resolution: true
    }
  });
}
