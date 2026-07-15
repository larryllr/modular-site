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

export const V4_STAGE_FOUR_BLUEPRINT = {
  id: 4,
  title: "4 火箭蘑菇井 · V4",
  description: "三座真实火箭竖井、宽台补水、摆渡接力与假顶安全下降",
  tint: "Color(0.92, 0.88, 1, 1)",
  spawnY: 650,
  levelWidth: 11800,
  cameraTop: -760,
  cameraBottom: 760,
  deathY: 900,
  finishY: -710,
  beats: [
    beat(1, "透明竖井预览", "transparent-shaft-preview", 0, 1100, 18, 1, "introduction",
      ["rocket", "camera", "basin"],
      "沿透明井壁同时看见第一井的宽落点、中层补水和高处铃台",
      "起点只放一个火箭拾取，喷嘴由导演锁定且井底已有实体水盆"),
    beat(2, "软墙首飞", "sealed-first-launch", 1100, 2300, 24, 1, "introduction",
      ["rocket", "fungus", "spring", "water"],
      "在封闭软墙井完成一次蓄力、垂直起飞和 224px 蘑菇台落地",
      "失足落入连续实体盆地，水池与弹簧立即送回发射线"),
    beat(3, "双段补水发射", "two-stage-refill-ascent", 2300, 3600, 30, 2, "development",
      ["rocket", "bottle", "coin-ring", "static-platform"],
      "连续两次按 340px 层高垂直发射，中间在宽静态台补水并读取释放币环",
      "每个承接面至少 224px，耗水后可原路落回第一井补给盆"),
    beat(4, "温室补给横廊", "greenhouse-rest-descent", 3600, 5000, 14, 2, "development",
      ["bottle", "checkpoint", "static-descent", "preview"],
      "在无敌人的横向温室补满水，随后沿三块宽静态台预览并进入第二井",
      "检查点落在完整地面，下降的每一级都永久存在"),
    beat(5, "火箭摆渡接站", "rocket-shuttle-transfer", 5000, 6500, 34, 2, "development",
      ["rocket", "shuttle", "water", "recovery"],
      "从第二井盆地垂直发射到停靠摆渡，再由宽车送到下一块静态发射台",
      "错过摆渡只会落进补水池，并能从弹簧与等候台在十秒内回站"),
    beat(6, "假顶反转下降", "false-ceiling-controlled-descent", 6500, 8100, 30, 2, "twist",
      ["rocket", "director", "fake-top", "static-descent"],
      "抵达假顶后停止喷射，装饰顶盖上移，玩家沿可见币环下降并从侧门离井",
      "假顶没有碰撞；上下两个 256px 静态落点始终存在，井底仍是补水盆", true),
    beat(7, "第三井燃料选择", "fuel-choice-shaft", 8100, 9900, 36, 3, "twist",
      ["rocket", "branch", "bottle", "spring"],
      "选择主线两次短喷，或借弹簧完成一次长喷并收集更多水瓶后重新汇合",
      "任一路线耗尽都会落入第三井连续实体补给盆；段首保存检查点"),
    beat(8, "三井接力终局", "three-shaft-relay-finale", 9900, 11800, 18, 3, "resolution",
      ["rocket", "fungus", "coin-spiral", "finish"],
      "复用三井学会的发射、稳定落地和横向换位，最后垂直穿过硬币螺旋",
      "最终两次发射都有 256px 静态承接面，失败仍回到第三井补给层", true)
  ]
};

export function buildV4StageFourScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    packed,
    nodePaths,
    addInstance,
    addPlainNode,
    addContract,
    addTerrain,
    grounded,
    airborne,
    recordRoute,
    addShuttle,
    addWood,
    addFungus,
    addWater,
    finalize
  } = b;

  const LAYER_HEIGHT = 340;
  const MIN_LANDING_WIDTH = 192;

  function addTerrainRun(prefix, startX, endX, y) {
    const length = endX - startX;
    const count = Math.ceil(length / 800);
    const overlap = 10;
    const width = (length + overlap * (count - 1)) / count;
    const ids = [];
    for (let index = 0; index < count; index += 1) {
      ids.push(addTerrain(
        `${prefix}${index + 1}`,
        startX + index * (width - overlap),
        y,
        width,
        [0, 0, 0, 0]
      ));
    }
    return ids;
  }

  function addWallSegment(name, x, y, width, height) {
    const polygon = packed([[0, 0], [width, 0], [width, height], [0, height]]);
    addPlainNode(name, "StaticBody2D", "Terrain", {
      position: vector(x, y),
      "metadata/_llr_rocket_shaft_wall": "true"
    });
    addPlainNode(`${name}Collision`, "CollisionPolygon2D", `Terrain/${name}`, {
      polygon
    });
    addPlainNode(`${name}Glass`, "Polygon2D", `Terrain/${name}`, {
      z_index: "-2",
      polygon,
      color: "Color(0.58, 0.88, 1, 0.2)",
      "metadata/_llr_visual_only": "true"
    });
  }

  function addShaftShell(prefix, leftX, rightX, rightSegments) {
    const wallWidth = 192;
    addWallSegment(`${prefix}LeftWall`, leftX, -760, wallWidth, 1180);
    for (let index = 0; index < rightSegments.length; index += 1) {
      const segment = rightSegments[index];
      addWallSegment(
        `${prefix}RightWall${index + 1}`,
        rightX - wallWidth,
        segment.y,
        wallWidth,
        segment.height
      );
    }
  }

  function addContinuousBasin(prefix, leftX, rightX) {
    const floors = addTerrainRun(`${prefix}SolidBasin`, leftX, rightX, 650);
    addWater(`${prefix}RefillPool`, leftX, 520, rightX - leftX, 240, {
      "metadata/_llr_refill_pool": "true",
      "metadata/_llr_solid_basin_below": "true"
    });
    return floors;
  }

  function addRocketDirector(name, x, y, options = {}) {
    const properties = {
      position: vector(x, y),
      trigger_size: vector(options.width || 240, options.height || 200),
      announcement: JSON.stringify(options.announcement || ""),
      checkpoint: options.checkpoint === false ? "false" : "true",
      one_shot: "true",
      forced_nozzle: "2",
      lock_nozzle: "true"
    };
    if (options.move?.length) properties.move_paths = nodePaths(options.move);
    if (options.moveOffset) properties.move_offset = vector(options.moveOffset.x, options.moveOffset.y);
    if (options.moveSeconds != null) properties.move_seconds = String(options.moveSeconds);
    addInstance(name, ".", "director", properties);
    return name;
  }

  function addReleaseRing(prefix, x, y, radius = 54, count = 8) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      airborne(
        `${prefix}Coin${index + 1}`,
        "Items/Coins",
        "coin",
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      );
    }
  }

  function addVerticalCoinGuide(prefix, x, startY, endY, count) {
    for (let index = 0; index < count; index += 1) {
      const t = count === 1 ? 0 : index / (count - 1);
      airborne(`${prefix}Coin${index + 1}`, "Items/Coins", "coin", x, startY + (endY - startY) * t);
    }
  }

  function addCoinSpiral(prefix, centerX, startY, endY, count) {
    for (let index = 0; index < count; index += 1) {
      const t = index / (count - 1);
      const angle = t * Math.PI * 4;
      airborne(
        `${prefix}Coin${index + 1}`,
        "Items/Coins",
        "coin",
        centerX + Math.sin(angle) * 72,
        startY + (endY - startY) * t
      );
    }
  }

  function addShaftContract(name, index, verticalSpan, landingCount) {
    addContract(name, {
      real_rocket_shaft: true,
      shaft_index: index,
      vertical_span: verticalSpan,
      layer_clear_height: LAYER_HEIGHT,
      minimum_layer_clear_height: 320,
      maximum_layer_clear_height: 360,
      min_landing_width: MIN_LANDING_WIDTH,
      landing_count: landingCount,
      continuous_solid_basin: true,
      refill_and_recovery: true,
      static_landings: true,
      void_required: false
    });
  }

  addContract("V4StageFourStructureContract", {
    target_seconds: 204,
    beat_count: 8,
    unequal_beat_widths: true,
    real_rocket_shaft_count: 3,
    forced_nozzle: 2,
    lock_nozzle: true,
    opening_rocket_pickup_count: 1,
    later_refill_source: "water-bottles",
    min_main_landing_width: MIN_LANDING_WIDTH,
    layer_clear_height: LAYER_HEIGHT,
    single_camera_area: true,
    moving_fake_top_collision: false,
    static_descent_always_available: true,
    void_required: false
  });

  // Beat 1: a grounded opening and one nozzle pickup lead directly into the first real shaft basin.
  const b1start = addTerrain("B1LaunchStart", -40, 650, 760, [0, -6, 4, 0]);
  const b1preview = addTerrain("B1PreviewFloor", 700, 650, 620, [0, 4, -4, 0]);
  grounded("B1RocketPickup", "Items/Pickups", "fluddRocket", b1start, 0.48, -34);
  addRocketDirector("B1NozzleLockDirector", 520, 580, {
    announcement: "火箭喷嘴已锁定：按住蓄力，松开后落向宽台",
    checkpoint: false,
    width: 240,
    height: 180
  });
  airborne("B1MidRefillPreview", "Items/Decoration", "arrow", 1130, 280, {
    rotation: "-1.5708"
  });
  airborne("B1TopBellPreview", "Items/Pickups", "blueCoin", 2050, -650);
  addContract("B1NozzleContract", {
    forced_nozzle: 2,
    lock_nozzle: true,
    nozzle_switch_required: false,
    rocket_pickup_count: 1,
    mobile_input: "direction-plus-one-action"
  });
  recordRoute(stage.beats[0], "main", [
    { x: 80, y: 646 }, { x: 340, y: 645 }, { x: 720, y: 650 },
    { x: 1080, y: 650 }, { x: 1320, y: 650 }, { x: 1500, y: 645 }
  ], { coinLimit: 4 });

  // Beats 2-3: shaft one has three 340px layers over one continuous solid refill basin.
  const shaftOneBasin = addContinuousBasin("ShaftOne", 1200, 2550);
  addShaftShell("ShaftOne", 1200, 2550, [
    { y: -760, height: 250 },
    { y: -200, height: 960 }
  ]);
  const b2landing = addFungus("B2FirstWideLanding", 1850, 310, 170, 4);
  const b3middle = addWood("B3MiddleRefillLanding", 1850, -30, 8);
  const b3top = addFungus("B3ShaftOneTopLanding", 2050, -370, 170, 4);
  addWood("B3ShaftOneExitBridge", 2320, -370, 8);
  grounded("B2BasinRecoverySpring", "Items/Mechanisms", "spring", shaftOneBasin[0], 0.36, -8, {
    launch_speed: "10.8"
  });
  airborne("B2LandingBottle", "Items/Pickups", "bottle", b2landing.x, b2landing.y - 34);
  airborne("B3MiddleBottle", "Items/Pickups", "bottle", b3middle.x, b3middle.y - 34);
  addReleaseRing("B2ReleaseRing", 1850, 190);
  addReleaseRing("B3ReleaseRing", 1850, -150);
  addShaftContract("ShaftOneContract", 1, LAYER_HEIGHT * 3, 3);
  recordRoute(stage.beats[1], "main", [
    { x: 1500, y: 645 }, { x: 1700, y: 640 }, { x: 1850, y: 310 }
  ], { coinLimit: 3 });
  recordRoute(stage.beats[1], "recovery", [
    { x: 1380, y: 620 }, { x: 1450, y: 610 }, { x: 1850, y: 310 }
  ], { recoverySeconds: 8, coins: false });
  recordRoute(stage.beats[2], "main", [
    { x: 1850, y: 310 }, { x: 1850, y: -30 }, { x: 2050, y: -370 },
    { x: 2320, y: -370 }, { x: 2800, y: -370 }, { x: 3600, y: -370 }
  ], { coinLimit: 5 });

  // Beat 4: the greenhouse is a static checkpoint followed by three permanent 256px descent pads.
  addTerrainRun("B4GreenhouseFloor", 2450, 4200, -370);
  addWood("B4DescentLandingUpper", 4300, -30, 8);
  addWood("B4DescentLandingMiddle", 4550, 310, 8);
  addWood("B4DescentLandingLower", 4800, 650, 8);
  airborne("B4GreenhouseBottleA", "Items/Pickups", "bottle", 3200, -410);
  airborne("B4GreenhouseBottleB", "Items/Pickups", "bottle", 3700, -410);
  grounded("B4GreenhouseFlowers", "Items/Decoration", "flowers", "B4GreenhouseFloor1", 0.72, -10);
  addRocketDirector("B4GreenhouseCheckpoint", 3500, -440, {
    announcement: "温室补给完成：前方宽台向下通往第二井",
    checkpoint: true,
    width: 300,
    height: 220
  });
  addContract("B4StaticGreenhouseContract", {
    checkpoint: true,
    enemy_count: 0,
    bottle_count: 2,
    descent_landing_count: 3,
    min_landing_width: 256,
    static_descent: true,
    second_shaft_preview: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 3600, y: -370 }, { x: 4100, y: -370 }, { x: 4300, y: -30 },
    { x: 4550, y: 310 }, { x: 4800, y: 650 }, { x: 5100, y: 650 }
  ], { coinLimit: 5 });

  // Beat 5: shaft two's shuttle is optional to survival because a full pool and recovery dock sit below it.
  const shaftTwoBasin = addContinuousBasin("ShaftTwo", 4900, 6500);
  addShaftShell("ShaftTwo", 4900, 6500, [
    { y: -760, height: 900 },
    { y: 430, height: 330 }
  ]);
  addWood("B5ShuttleRecoveryDock", 5100, 310, 8);
  const b5shuttle = addShuttle("B5RocketShuttle", 5350, 310, { x: 600, y: 0 }, {
    travelSeconds: 3.0,
    pauseSeconds: 0.7,
    phase: 0.08,
    scaleX: 2.5,
    walkableWidth: 224
  });
  const b5launch = addWood("B5ShuttleLaunchPad", 6200, 310, 8);
  grounded("B5BasinRecoverySpring", "Items/Mechanisms", "spring", shaftTwoBasin[0], 0.31, -8, {
    launch_speed: "10.8"
  });
  airborne("B5ShuttleBottle", "Items/Pickups", "bottle", b5launch.x, b5launch.y - 34);
  addContract("B5ShuttleRecoveryContract", {
    shuttle_walkable_width: b5shuttle.walkableWidth,
    shuttle_miss_to_refill_pool: true,
    static_recovery_dock: true,
    max_return_seconds: 10,
    continuous_solid_basin: true,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 5100, y: 650 }, { x: 5350, y: 640 }, { x: 5350, y: 310 },
    { x: 5950, y: 310 }, { x: 6200, y: 310 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[4], "recovery", [
    { x: 5100, y: 620 }, { x: 5100, y: 310 }, { x: 5350, y: 310 },
    { x: 5950, y: 310 }, { x: 6200, y: 310 }
  ], { recoverySeconds: 10, coins: false });

  // Beat 6: only the painted fake ceiling moves; the ascent/descent pads never move or disappear.
  const b6upper = addWood("B6DescentLandingUpper", 6200, -30, 8);
  const b6top = addFungus("B6FalseTopLanding", 6200, -370, 170, 4);
  addWood("B6SideDoorThreshold", 6410, 310, 8);
  addTerrain("B6SideDoorCorridor", 6500, 310, 720, [0, 0, 0, 0]);
  addWood("B6ThirdShaftDescentPad", 7350, 650, 8);
  addTerrainRun("B6ThirdShaftApproach", 7450, 8250, 650);
  addPlainNode("B6FakeTopFacade", "Polygon2D", "Items/Decoration", {
    z_index: "3",
    position: vector(5092, -510),
    polygon: packed([[0, 0], [1216, 0], [1216, 64], [0, 64]]),
    color: "Color(0.78, 0.5, 0.94, 0.82)",
    "metadata/_llr_moving_decoration": "true",
    "metadata/_llr_collision_enabled": "false"
  });
  addRocketDirector("B6FalseTopDirector", 6200, -420, {
    announcement: "这里是假顶：停止喷射，沿右侧硬币下降",
    checkpoint: true,
    width: 280,
    height: 200,
    move: ["../Items/Decoration/B6FakeTopFacade"],
    moveOffset: { x: 0, y: -150 },
    moveSeconds: 1.1
  });
  airborne("B6UpperBottle", "Items/Pickups", "bottle", b6upper.x, b6upper.y - 34);
  addVerticalCoinGuide("B6DescentGuide", 6280, -300, 270, 8);
  addContract("B6FakeTopSafetyContract", {
    fake_top_is_moving_decoration: true,
    fake_top_collision_enabled: false,
    static_descent_landing_count: 2,
    static_descent_always_available: true,
    descent_previewed_before_drop: true,
    min_landing_width: 224,
    continuous_solid_basin: true,
    void_required: false
  });
  addShaftContract("ShaftTwoContract", 2, LAYER_HEIGHT * 3, 3);
  recordRoute(stage.beats[5], "main", [
    { x: 6200, y: 310 }, { x: 6200, y: -30 }, { x: 6200, y: -370 },
    { x: 6280, y: -30 }, { x: 6280, y: 310 }, { x: 6600, y: 310 },
    { x: 7100, y: 310 }, { x: 7350, y: 650 }, { x: 8200, y: 650 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[5], "recovery", [
    { x: 5150, y: 620 }, { x: 5150, y: 310 }, { x: 6200, y: 310 },
    { x: 6200, y: -30 }, { x: 6200, y: -370 }
  ], { recoverySeconds: 12, coins: false });

  // Beats 7-8: shaft three offers a forgiving two-launch route and a spring-assisted expert line.
  const shaftThreeBasin = addContinuousBasin("ShaftThree", 8150, 9700);
  addShaftShell("ShaftThree", 8150, 9700, [
    { y: -500, height: 1260 }
  ]);
  const b7short = addFungus("B7ShortRouteLanding", 8600, 310, 170, 4);
  const b7rejoin = addWood("B7FuelChoiceRejoin", 8600, -30, 8);
  const b7long = addFungus("B7LongRouteLanding", 9200, -30, 170, 4);
  grounded("B7MainRecoverySpring", "Items/Mechanisms", "spring", shaftThreeBasin[0], 0.27, -8, {
    launch_speed: "10.8"
  });
  grounded("B7LongRouteSpring", "Items/Mechanisms", "spring", shaftThreeBasin[1], 0.36, -8, {
    launch_speed: "11.0"
  });
  airborne("B7ShortRouteBottle", "Items/Pickups", "bottle", b7short.x, b7short.y - 34);
  airborne("B7LongRouteBottleA", "Items/Pickups", "bottle", 9200, 400);
  airborne("B7LongRouteBottleB", "Items/Pickups", "bottle", 9200, 180);
  airborne("B7LongRouteBottleC", "Items/Pickups", "bottle", b7long.x, b7long.y - 34);
  addRocketDirector("B7FuelChoiceCheckpoint", 8280, 580, {
    announcement: "第三井：左侧两次短喷最稳，右侧弹簧是一发长线",
    checkpoint: true,
    width: 300,
    height: 220
  });
  addContract("B7FuelChoiceContract", {
    main_short_launch_count: 2,
    main_bottle_count: 1,
    expert_long_launch_count: 1,
    expert_bottle_count: 3,
    routes_rejoin: true,
    recovery_pool: true,
    min_landing_width: 224,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 8200, y: 650 }, { x: 8600, y: 640 }, { x: 8600, y: 310 },
    { x: 8600, y: -30 }, { x: 8900, y: -30 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[6], "bonus", [
    { x: 9000, y: 640 }, { x: 9200, y: 620 }, { x: 9200, y: -30 },
    { x: 8900, y: -30 }
  ], { coinLimit: 4 });
  recordRoute(stage.beats[6], "recovery", [
    { x: 8350, y: 620 }, { x: 8600, y: 310 }, { x: 8600, y: -30 }
  ], { recoverySeconds: 10, coins: false });

  const b8mid = addWood("B8RelayMidLanding", 8600, -370, 8);
  addWood("B8RelayTransferLanding", 8850, -370, 8);
  addWood("B8RelayLaunchPad", 9100, -370, 8);
  const b8top = addWood("B8RelayTopLanding", 9100, -710, 8);
  addWood("B8ShaftThreeExitBridge", 9380, -710, 8);
  addTerrainRun("B8FinishGallery", 9580, 11840, -710);
  airborne("B8RelayBottle", "Items/Pickups", "bottle", b7rejoin.x, b7rejoin.y - 34);
  addCoinSpiral("B8FinalSpiral", 9100, -330, -690, 12);
  grounded("B8FinishFlowers", "Items/Decoration", "flowers", "B8FinishGallery3", 0.68, -10);
  addContract("B8StaticRelayContract", {
    launch_count: 2,
    horizontal_transfer_static: true,
    final_coin_spiral: true,
    min_landing_width: 256,
    static_finish_gallery: true,
    recovery_to_third_basin: true,
    void_required: false
  });
  addShaftContract("ShaftThreeContract", 3, LAYER_HEIGHT * 4, 4);
  recordRoute(stage.beats[7], "main", [
    { x: 8900, y: -30 }, { x: 8600, y: -30 }, { x: 8600, y: -370 },
    { x: 9100, y: -370 }, { x: 9100, y: -710 }, { x: 9580, y: -710 },
    { x: 10300, y: -710 }, { x: 11100, y: -710 }, { x: 11750, y: -710 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[7], "recovery", [
    { x: 8350, y: 620 }, { x: 8600, y: 310 }, { x: 8600, y: -30 },
    { x: 8600, y: -370 }, { x: 9100, y: -370 }, { x: 9100, y: -710 }
  ], { recoverySeconds: 14, coins: false });

  return finalize({
    startSurface: b1start,
    spawnT: 0.16,
    introLines: [
      "[@n,老师快跑]4 火箭蘑菇井 · V4",
      "捡起唯一的火箭喷嘴后只需方向与喷射：层高固定 340px，宽台、补水池和实体井底会一直接住你。"
    ],
    finishPosition: { x: 11845, y: -710 },
    finishSize: { x: 92, y: 360 },
    extraFlowMetadata: {
      rocket_shaft_count: 3,
      layer_clear_height: LAYER_HEIGHT,
      min_main_landing_width: MIN_LANDING_WIDTH,
      forced_nozzle: 2,
      lock_nozzle: true,
      single_camera_area: true,
      continuous_solid_basins: 3,
      fake_top_collision: false,
      static_descent_landings: true,
      void_required: false
    }
  });
}
