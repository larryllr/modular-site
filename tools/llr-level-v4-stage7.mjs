import { createV4SceneBuilder } from "./llr-level-v4-kit.mjs";

function beat(id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure, stateChange = false) {
  return {
    id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure,
    input: "direction+one-action",
    stateChange
  };
}

export const V4_STAGE_SEVEN_BLUEPRINT = {
  id: 7,
  title: "7 飞鸟迁徙谷 · V4",
  description: "Hover 滑翔、可见岛链、迁徙云阵与巨型鸟巢",
  tint: "Color(0.92, 1, 0.94, 1)",
  spawnY: 240,
  levelWidth: 23500,
  cameraTop: -720,
  cameraBottom: 780,
  finishY: -120,
  beats: [
    beat(1, "草坡观鸟", "grounded-goonie-observation", 0, 2000, 18, 1, "introduction",
      ["goonie", "terrain", "hover"],
      "在宽草坡观察单只 Goonie 的固定航线，并取得 Hover",
      "整段为连续草地，骑鸟完全可选"),
    beat(2, "短距滑翔沟", "two-short-hover-gaps", 2000, 4500, 24, 1, "introduction",
      ["hover", "cloud", "coin-line", "recovery"],
      "完成两个短 Hover 缺口，硬币线清楚标出先跳后喷的释放点",
      "缺口下方是连续宽云与实体谷底"),
    beat(3, "三级下降岛链", "descending-visible-islands", 4500, 7600, 30, 2, "development",
      ["hover", "terrain", "bottle", "branch"],
      "沿三座逐级下降的宽岛自然滑翔，每次离岛前都能看见下一岛",
      "任意失足落入同方向实体回收层，每岛都有补水"),
    beat(4, "邮驿补给池", "refill-post-route-preview", 7600, 9300, 14, 2, "development",
      ["water", "bottle", "checkpoint", "preview"],
      "在静态邮驿池补满 Hover，并同时预览高低两条后续航线",
      "检查点位于完整地面，补给池有实体池底"),
    beat(5, "双高度迁徙线", "high-low-migration-branch", 9300, 13200, 34, 2, "development",
      ["hover", "cloud", "terrain", "goonie"],
      "选择补给较少的高空短线，或每岛都有水瓶的低空稳线",
      "高路失足自然落到低路继续，两路在鸟巢门汇合"),
    beat(6, "迁徙风暴三波", "three-wave-migration-storm", 13200, 16500, 32, 2, "twist",
      ["hover", "shuttle", "cloud", "director"],
      "三波迁徙云阵依次下沉，玩家在永久安全岛间读取并穿过",
      "受击或错过云阵只会落到蘑菇峡谷回收层", true),
    beat(7, "逆势上升塔群", "rising-island-towers", 16500, 20700, 42, 3, "twist",
      ["spring", "hover", "goonie", "cloud"],
      "地势反转上升，先借弹簧或飞鸟取高，再用 Hover 保持高度",
      "每塔都有宽静态台和补水，段首保存检查点"),
    beat(8, "巨型鸟巢汇流", "giant-nest-convergence", 20700, 23500, 20, 3, "resolution",
      ["terrain", "goonie", "hover", "finish"],
      "三条航线在巨型鸟巢宽巢面汇合，飞鸟成为背景伴飞",
      "终点前为连续静态巢面，无敌人和新操作", true)
  ]
};

export function buildV4StageSevenScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    addInstance,
    addContract,
    addTerrain,
    grounded,
    airborne,
    recordRoute,
    addShuttle,
    addCloud,
    addFungus,
    addWater,
    addDirector,
    assertConservativePlatformChain,
    finalize
  } = b;

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

  function addCoinLine(prefix, x1, y1, x2, y2, count) {
    for (let index = 0; index < count; index += 1) {
      const t = count === 1 ? 0 : index / (count - 1);
      airborne(`${prefix}Coin${index + 1}`, "Items/Coins", "coin",
        x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    }
  }

  function addRecoveryLift(name, x, bottomY, topY) {
    return addShuttle(name, x, bottomY, { x: 0, y: topY - bottomY }, {
      travelSeconds: 2.8,
      pauseSeconds: 0.5,
      phase: 0.35,
      scaleX: 2.5,
      walkableWidth: 224
    });
  }

  // A far-below physical recovery deck spans every airborne beat.
  const recoveryDeck = addGroundChain("ValleyRecoveryDeck", 1850, 23200, 650, [0, 8, -6, 0]);
  addContract("WholeValleyRecoveryContract", {
    continuous_recovery_deck: true,
    recovery_y: 650,
    maximum_return_spacing: 2400,
    void_required: false
  });

  // Beat 1: safe observation before any aerial commitment.
  const b1start = addTerrain("B1BirdwatchStart", -40, 240, 760, [0, -10, 8, 0]);
  const b1meadow = addTerrain("B1BirdwatchMeadow", 700, 245, 850, [0, 8, -8, 0]);
  const b1launch = addTerrain("B1HoverLaunch", 1530, 240, 540, [0, -6, 0]);
  grounded("B1HoverPickup", "Items/Pickups", "fluddHover", b1start, 0.52, -34);
  airborne("B1ObservationGoonie", "Items/Enemies", "goonie", 1120, 60, {
    "metadata/_llr_optional_transport": "true"
  });
  grounded("B1BirdwatchSign", "Items/Decoration", "sign", b1meadow, 0.45, -3, {
    lines: `Array[String](["飞鸟是捷径，不是落脚要求。主路线只需跳跃与 Hover。"] )`
  });
  addContract("B1ObservationContract", {
    continuous_meadow: true,
    goonie_required: false,
    forced_hover: false,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 238 }, { x: 560, y: 235 }, { x: 1050, y: 245 },
    { x: 1500, y: 238 }, { x: 1980, y: 238 }
  ]);

  // Beat 2: two short upper gaps with a full lower cloud chain.
  const b2upper = [
    addCloud("B2UpperCloud1", 2160, 190, 20),
    addCloud("B2UpperCloud2", 2520, 115, 20),
    addCloud("B2UpperCloud3", 2890, 135, 20),
    addCloud("B2UpperCloud4", 3290, 70, 20),
    addCloud("B2UpperCloud5", 3690, 100, 20),
    addCloud("B2UpperCloud6", 4110, 155, 20)
  ];
  assertConservativePlatformChain("Stage7Beat2Upper", b2upper, {
    maxGap: 96,
    maxRise: 76,
    minLandingWidth: 175
  });
  const b2lower = [];
  for (let index = 0; index < 8; index += 1) {
    b2lower.push(addCloud(`B2RecoveryCloud${index + 1}`, 2080 + index * 310, 420 + (index % 2) * 20, 12));
  }
  assertConservativePlatformChain("Stage7Beat2Recovery", b2lower, {
    maxGap: 104,
    maxRise: 40,
    minLandingWidth: 190
  });
  addCoinLine("B2HoverGuideA", 2190, 145, 2860, 95, 7);
  addCoinLine("B2HoverGuideB", 3330, 30, 4060, 115, 7);
  addRecoveryLift("B2RecoveryLift", 4320, 620, 180);
  addContract("B2ShortHoverContract", {
    hover_gap_count: 2,
    max_open_gap: 96,
    minimum_landing_width: 175,
    continuous_lower_clouds: true,
    solid_deck_below: true,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2000, y: 235 }, { x: 2160, y: 190 }, { x: 2520, y: 115 },
    { x: 2890, y: 135 }, { x: 3290, y: 70 }, { x: 3690, y: 100 },
    { x: 4110, y: 155 }, { x: 4480, y: 185 }
  ]);
  recordRoute(stage.beats[1], "recovery", [
    { x: 2050, y: 420 }, { x: 2700, y: 440 }, { x: 3350, y: 420 },
    { x: 4000, y: 440 }, { x: 4320, y: 620 }, { x: 4320, y: 180 }
  ], { recoverySeconds: 10, coinLimit: 3 });

  // Beat 3: every island is broad and lower than the previous one.
  const islandA = addTerrain("B3DescendingIslandA", 4480, 180, 760, [0, 10, -6, 0]);
  const islandB = addTerrain("B3DescendingIslandB", 5500, 270, 760, [0, -6, 8, 0]);
  const islandC = addTerrain("B3DescendingIslandC", 6520, 360, 760, [0, 8, -6, 0]);
  const islandExit = addTerrain("B3DescendingExit", 7440, 410, 300, [0, 0]);
  addCloud("B3BridgeCloudA", 5360, 255, 12);
  addCloud("B3BridgeCloudB", 6380, 345, 12);
  addCloud("B3BridgeCloudC", 7340, 400, 12);
  for (const [name, x, y] of [
    ["B3IslandBottleA", 4920, 130], ["B3IslandBottleB", 5940, 220], ["B3IslandBottleC", 6960, 310]
  ]) airborne(name, "Items/Pickups", "bottle", x, y);
  airborne("B3RouteGoonie", "Items/Enemies", "goonie", 6100, 70, {
    "metadata/_llr_optional_transport": "true"
  });
  addRecoveryLift("B3RecoveryLiftA", 5200, 620, 170);
  addRecoveryLift("B3RecoveryLiftB", 6900, 620, 350);
  addContract("B3VisibleIslandContract", {
    island_count: 3,
    next_island_visible: true,
    bottle_per_island: true,
    recovery_deck_below: true,
    goonie_required: false,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 4500, y: 178 }, { x: 5050, y: 180 }, { x: 5400, y: 250 },
    { x: 5750, y: 268 }, { x: 6400, y: 345 }, { x: 6750, y: 358 },
    { x: 7350, y: 400 }, { x: 7580, y: 408 }
  ]);
  recordRoute(stage.beats[2], "recovery", [
    { x: 4600, y: 620 }, { x: 5200, y: 620 }, { x: 5200, y: 170 },
    { x: 5900, y: 620 }, { x: 6900, y: 620 }, { x: 6900, y: 350 },
    { x: 7520, y: 405 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 4: a grounded refill post previews both upcoming heights.
  const b4post = addTerrain("B4PostOffice", 7600, 410, 850, [0, -8, 6, 0]);
  const b4preview = addTerrain("B4RoutePreview", 8430, 400, 900, [0, 8, -6, 0]);
  addWater("B4RefillPool", 7900, 350, 520, 260, {
    "metadata/_llr_solid_bed": "true"
  });
  airborne("B4PostBottleA", "Items/Pickups", "bottle", 8200, 315);
  airborne("B4PostBottleB", "Items/Pickups", "bottle", 8500, 330);
  addDirector("B4PostCheckpoint", 8650, 320, {
    announcement: "邮驿补给完成：上方是短线，下方是稳线",
    checkpoint: true,
    width: 300,
    height: 230
  });
  addContract("B4PostContract", {
    static_checkpoint: true,
    refill_pool_has_bed: true,
    both_routes_previewed: true,
    enemy_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 7600, y: 408 }, { x: 8050, y: 400 }, { x: 8500, y: 398 },
    { x: 8950, y: 400 }, { x: 9280, y: 398 }
  ]);

  // Beat 5: the upper line is shorter; every missed upper landing reaches the lower line.
  const lowIslands = [
    addTerrain("B5LowIslandA", 9300, 390, 780, [0, 8, -6, 0]),
    addTerrain("B5LowIslandB", 10280, 420, 780, [0, -6, 8, 0]),
    addTerrain("B5LowIslandC", 11260, 390, 780, [0, 8, -6, 0]),
    addTerrain("B5LowIslandD", 12240, 420, 900, [0, -6, 6, 0])
  ];
  const highClouds = [
    addCloud("B5HighCloud1", 9560, 100, 24),
    addCloud("B5HighCloud2", 10030, 30, 24),
    addCloud("B5HighCloud3", 10500, -20, 24),
    addCloud("B5HighCloud4", 10970, 20, 24),
    addCloud("B5HighCloud5", 11440, -35, 24),
    addCloud("B5HighCloud6", 11910, 30, 24),
    addCloud("B5HighCloud7", 12380, 100, 24),
    addCloud("B5HighCloud8", 12850, 220, 24)
  ];
  assertConservativePlatformChain("Stage7Beat5High", highClouds, {
    maxGap: 96,
    maxRise: 76,
    minLandingWidth: 190
  });
  [9700, 10600, 11600, 12600].forEach((x, index) => {
    airborne(`B5LowBottle${index + 1}`, "Items/Pickups", "bottle", x, 350 + (index % 2) * 25);
  });
  airborne("B5HighGoonie", "Items/Enemies", "goonie", 11100, -180, {
    "metadata/_llr_optional_transport": "true"
  });
  addContract("B5BranchContract", {
    high_route_short: true,
    high_route_bottle_count: 0,
    low_route_bottle_count: 4,
    upper_failure_to_lower: true,
    routes_rejoin: true,
    goonie_required: false,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 9300, y: 390 }, { x: 9800, y: 395 }, { x: 10350, y: 418 },
    { x: 10900, y: 415 }, { x: 11400, y: 390 }, { x: 12000, y: 410 },
    { x: 12600, y: 415 }, { x: 13180, y: 410 }
  ]);
  recordRoute(stage.beats[4], "bonus", [
    { x: 9300, y: 385 }, { x: 9560, y: 100 }, { x: 10030, y: 30 },
    { x: 10500, y: -20 }, { x: 10970, y: 20 }, { x: 11440, y: -35 },
    { x: 11910, y: 30 }, { x: 12380, y: 100 }, { x: 12850, y: 220 },
    { x: 13200, y: 405 }
  ], { coinLimit: 5 });

  // Beat 6: three broad shuttles descend as readable waves; static islands remain between them.
  const b6islandA = addTerrain("B6StormIslandA", 13200, 410, 620, [0, -6, 6, 0]);
  const b6islandB = addTerrain("B6StormIslandB", 14280, 330, 620, [0, 6, -6, 0]);
  const b6islandC = addTerrain("B6StormIslandC", 15360, 250, 620, [0, -6, 6, 0]);
  const b6exit = addTerrain("B6StormExit", 16280, 180, 320, [0, 0]);
  const stormA = addShuttle("B6StormWaveA", 13720, 100, { x: 0, y: 190 }, {
    travelSeconds: 2.4, pauseSeconds: 0.5, phase: 0.1, scaleX: 2.5, walkableWidth: 224
  });
  const stormB = addShuttle("B6StormWaveB", 14800, 10, { x: 0, y: 220 }, {
    travelSeconds: 2.6, pauseSeconds: 0.5, phase: 0.45, scaleX: 2.5, walkableWidth: 224
  });
  const stormC = addShuttle("B6StormWaveC", 15880, -70, { x: 0, y: 230 }, {
    travelSeconds: 2.8, pauseSeconds: 0.5, phase: 0.7, scaleX: 2.5, walkableWidth: 224
  });
  addDirector("B6StormDirector", 13380, 330, {
    announcement: "迁徙风暴开始：每波之间都有永久安全岛",
    checkpoint: true,
    width: 300,
    height: 240,
    move: ["../Items/Mechanisms/B6StormWaveA", "../Items/Mechanisms/B6StormWaveB", "../Items/Mechanisms/B6StormWaveC"],
    moveOffset: { x: 0, y: 80 },
    moveSeconds: 1.2
  });
  addRecoveryLift("B6RecoveryLiftA", 14100, 620, 340);
  addRecoveryLift("B6RecoveryLiftB", 15500, 620, 250);
  addContract("B6StormContract", {
    wave_count: 3,
    moving_landing_width: 224,
    static_island_between_waves: true,
    recovery_deck_below: true,
    controlled_descent: true,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 13200, y: 408 }, { x: 13720, y: 280 }, { x: 14280, y: 328 },
    { x: 14800, y: 210 }, { x: 15360, y: 248 }, { x: 15880, y: 140 },
    { x: 16380, y: 178 }
  ]);
  recordRoute(stage.beats[5], "recovery", [
    { x: 13300, y: 620 }, { x: 14100, y: 620 }, { x: 14100, y: 340 },
    { x: 14800, y: 620 }, { x: 15500, y: 620 }, { x: 15500, y: 250 },
    { x: 16300, y: 180 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 7: static cloud stairs guarantee the ascent; springs and Goonies are faster options.
  const b7base = addTerrain("B7RisingBase", 16500, 180, 760, [0, 6, -4, 0]);
  const risingClouds = [];
  const cloudPositions = [
    [16900, 90], [17320, 10], [17740, -70], [18160, -150], [18580, -230],
    [19000, -310], [19420, -390], [19840, -470], [20260, -550]
  ];
  cloudPositions.forEach(([x, y], index) => risingClouds.push(addCloud(`B7RisingCloud${index + 1}`, x, y, 20)));
  assertConservativePlatformChain("Stage7Beat7Rising", risingClouds, {
    maxGap: 96,
    maxRise: 82,
    minLandingWidth: 190
  });
  grounded("B7RiseSpringA", "Items/Mechanisms", "spring", b7base, 0.45, -8, {
    launch_speed: "10.8",
    horizontal_boost: "2.0"
  });
  airborne("B7RiseSpringB", "Items/Mechanisms", "spring", 18580, -222, {
    launch_speed: "10.8",
    horizontal_boost: "2.0"
  });
  airborne("B7RisingGoonie", "Items/Enemies", "goonie", 18700, -500, {
    "metadata/_llr_optional_transport": "true"
  });
  [17320, 18160, 19000, 19840].forEach((x, index) => {
    airborne(`B7TowerBottle${index + 1}`, "Items/Pickups", "bottle", x, cloudPositions[index * 2 + 1][1] - 40);
  });
  addDirector("B7RisingCheckpoint", 16680, 100, {
    announcement: "地势开始上升：静态云梯最稳，弹簧和飞鸟更快",
    checkpoint: true,
    width: 300,
    height: 240
  });
  addRecoveryLift("B7RecoveryLiftA", 17600, 620, -50);
  addRecoveryLift("B7RecoveryLiftB", 19600, 620, -390);
  addContract("B7RisingContract", {
    static_cloud_count: 9,
    maximum_upward_rise: 82,
    min_landing_width: 190,
    spring_optional: true,
    goonie_required: false,
    recovery_lift_count: 2,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 16500, y: 178 }, { x: 16900, y: 90 }, { x: 17320, y: 10 },
    { x: 17740, y: -70 }, { x: 18160, y: -150 }, { x: 18580, y: -230 },
    { x: 19000, y: -310 }, { x: 19420, y: -390 }, { x: 19840, y: -470 },
    { x: 20260, y: -550 }, { x: 20680, y: -540 }
  ]);
  recordRoute(stage.beats[6], "recovery", [
    { x: 16600, y: 620 }, { x: 17600, y: 620 }, { x: 17600, y: -50 },
    { x: 18600, y: 620 }, { x: 19600, y: 620 }, { x: 19600, y: -390 },
    { x: 20300, y: -540 }
  ], { recoverySeconds: 16, coinLimit: 4 });

  // Beat 8: a broad nest profile brings every route onto one static finish.
  const b8entry = addTerrain("B8NestEntry", 20700, -540, 760, [0, 12, 28, 50]);
  const b8nestA = addTerrain("B8NestBowlA", 21440, -490, 850, [0, 45, 80, 105]);
  const b8nestB = addTerrain("B8NestBowlB", 22270, -385, 850, [0, -35, -70, -95]);
  const b8finish = addTerrain("B8NestFinish", 23100, -480, 500, [0, 10, 0]);
  for (let index = 0; index < 5; index += 1) {
    airborne(`B8BackgroundGoonie${index + 1}`, "Items/Enemies", "goonie",
      21100 + index * 520, -650 + (index % 2) * 70, {
        "metadata/_llr_background_companion": "true"
      });
  }
  grounded("B8NestFlowers", "Items/Decoration", "flowers", b8finish, 0.65, -10);
  addContract("B8NestContract", {
    static_nest_surface: true,
    route_convergence_count: 3,
    background_goonie_count: 5,
    mandatory_enemy_count: 0,
    moving_landing_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 20700, y: -540 }, { x: 21200, y: -510 }, { x: 21700, y: -450 },
    { x: 22200, y: -390 }, { x: 22700, y: -420 }, { x: 23200, y: -478 },
    { x: 23480, y: -478 }
  ]);

  return finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]7 飞鸟迁徙谷 · V4",
      "飞鸟只是捷径。主路线始终由宽岛、静态云和 Hover 构成；失足会落到谷底回收层。"
    ],
    finishPosition: { x: 23545, y: -420 },
    finishSize: { x: 92, y: 420 },
    finishBlueCoin: { x: 23280, y: -540 },
    extraFlowMetadata: {
      continuous_recovery_deck: true,
      optional_goonie_transport: true,
      static_main_clouds: 23,
      physical_storm_waves: 3,
      visible_next_islands: true,
      void_required: false
    }
  });
}
