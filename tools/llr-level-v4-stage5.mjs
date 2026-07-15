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

export const V4_STAGE_FIVE_BLUEPRINT = {
  id: 5,
  title: "5 云端货运站 · V4",
  description: "三线换乘、单程货梯、末班车维修路、货仓坍塌与三站接力",
  tint: "Color(0.82, 0.95, 1, 1)",
  spawnY: 240,
  levelWidth: 20500,
  cameraTop: -760,
  cameraBottom: 780,
  finishY: 80,
  beats: [
    beat(1, "三线总览", "three-line-overlook-hub", 0, 1800, 18, 1, "introduction",
      ["shuttle", "cloud", "route-preview"],
      "从中央货站同时看见蓝色横运线、橙色升降线与绿色维修云路，箭头和轨迹明确标出目的地",
      "所有预览落点都在同屏，下方绿色云路从开场起连续存在"),
    beat(2, "感应单程货梯", "proximity-one-way-lift", 1800, 4100, 24, 1, "introduction",
      ["shuttle", "director", "cloud", "one-way"],
      "踏上宽货梯后才启动，升到上站后永久停靠，玩家离开时列车留在目的站",
      "错过或滑落会落到连续维修云路，并可直接前往下一座静态站"),
    beat(3, "中途仓台清箱", "two-leg-freight-with-static-stop", 4100, 6800, 30, 2, "development",
      ["shuttle", "box", "static-platform", "director"],
      "第一段摆渡停在宽静态仓台，玩家清理箱体后再触发第二段单程摆渡",
      "拆箱期间两班列车都静止，仓台有宽绕行边和下层连续云路"),
    beat(4, "中央调度站", "static-dispatch-rest", 6800, 8200, 14, 2, "development",
      ["checkpoint", "hover", "countdown", "static-platform"],
      "在静态调度站补给并读取三盏倒数灯，预览下一次水平转垂直换乘",
      "无敌人、无移动落点，检查点位于完整实体站台"),
    beat(5, "水平转垂直", "horizontal-to-vertical-transfer", 8200, 11200, 32, 2, "development",
      ["shuttle", "transfer", "director", "recovery"],
      "先乘感应横向摆渡，再在宽静态岛换乘垂直货梯；两个动作完全分开",
      "错过横车会触发两秒内到站的下层备用车，垂直失误则由云路回收货梯送上站"),
    beat(6, "赶末班车", "gentle-last-train-chase", 11200, 14100, 30, 2, "twist",
      ["shuttle", "conveyor", "director", "maintenance-route"],
      "发车灯亮后沿顺向短传送带追一班慢速末班车，宽车厢给出充足上车窗口",
      "发车同时维修踏板自动升起，错过后走慢路继续，不死亡、不重开、不等待", true),
    beat(7, "分层货仓坍塌", "layered-cargo-collapse", 14100, 18000, 40, 3, "twist",
      ["cargo", "director", "conveyor", "branch"],
      "警示灯提前预告后，三层货台依次落入下层分拣带；上层静态猫道和下层路线都继续向前",
      "上层失足自然落到传送带或已坍塌货台，下层任何位置仍可沿连续云路前进", true),
    beat(8, "三站接力直路", "three-station-straight-relay", 18000, 20500, 20, 3, "resolution",
      ["shuttle", "director", "static-platform", "finish"],
      "依次触发三座安全站，三块宽货台分别升降到位，最终拼成一条水平终点直路",
      "每次触发都在宽静态岛完成，终段无敌人；下方维修云路仍通向终点", true)
  ]
};

export function buildV4StageFiveScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    packed,
    addInstance,
    addPlainNode,
    addContract,
    addTerrain,
    grounded,
    airborne,
    recordRoute,
    addCloud,
    addWood,
    addDirector,
    assertConservativePlatformChain,
    finalize
  } = b;

  const MIN_MOVING_LANDING = 224;
  const RECOVERY_Y = 610;

  function addGroundRun(prefix, startX, endX, y, profile = [0, 4, -4, 0]) {
    const surfaces = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const width = Math.min(850, endX - x);
      surfaces.push(addTerrain(`${prefix}${index}`, x, y + (index % 2 ? 0 : 3), width, profile));
      if (x + width >= endX) break;
      x += width - 10;
      index += 1;
    }
    return surfaces;
  }

  function addRouteLine(name, color, points, metadata = {}) {
    addPlainNode(name, "Line2D", "Items/Decoration", {
      z_index: "-3",
      points: packed(points),
      width: "9",
      default_color: color,
      antialiased: "true",
      "metadata/_llr_route_preview": "true",
      ...metadata
    });
  }

  function addStationMarker(name, x, y, color, label, lineId) {
    addPlainNode(`${name}Badge`, "Polygon2D", "Items/Decoration", {
      z_index: "4",
      position: vector(x, y),
      polygon: packed([[-78, -23], [78, -23], [78, 23], [-78, 23]]),
      color,
      "metadata/_llr_station_line": JSON.stringify(lineId)
    });
    addPlainNode(`${name}Label`, "Label", "Items/Decoration", {
      z_index: "5",
      position: vector(x - 64, y - 17),
      text: JSON.stringify(label),
      "theme_override_colors/font_color": "Color(0.08, 0.12, 0.18, 1)",
      "theme_override_colors/font_outline_color": "Color(1, 1, 1, 0.8)",
      "theme_override_constants/outline_size": "3",
      "theme_override_font_sizes/font_size": "18"
    });
  }

  function addBox(name, x, y, parent = "Items/Mechanisms", properties = {}) {
    addInstance(name, parent, "box", {
      position: vector(x, y),
      coin_count: "0",
      persistent_destroy: "true",
      "metadata/_llr_airborne": "true",
      ...properties
    });
    return name;
  }

  function addBoxStack(prefix, x, floorY, columns, rows, spacing = 36) {
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        addBox(`${prefix}C${column + 1}R${row + 1}`, x + column * spacing, floorY - 18 - row * spacing);
      }
    }
  }

  function addSingleTripFreight(name, x, y, offset, options = {}) {
    const walkableWidth = options.walkableWidth || MIN_MOVING_LANDING;
    const travelSeconds = options.moveSeconds || 2.2;
    const activationRadius = options.activationRadius || 192;
    const startDelay = options.startDelay ?? 0.15;
    const platformPosition = airborne(name, "Items/Mechanisms", "shuttle", x, y, {
      scale: vector(walkableWidth / 84, 1),
      travel: vector(offset.x, offset.y),
      travel_seconds: String(travelSeconds),
      pause_seconds: "0",
      phase: "0",
      mode: "2",
      activation_radius: String(activationRadius),
      start_delay: String(startDelay),
      "metadata/_llr_walkable_width": String(walkableWidth),
      "metadata/_llr_real_shuttle_mode": JSON.stringify("PROXIMITY")
    });
    addDirector(`${name}ProximityNotice`, options.triggerX ?? x, options.triggerY ?? y - 42, {
      width: options.triggerWidth || Math.min(260, walkableWidth),
      height: options.triggerHeight || 180,
      announcement: options.announcement || "",
      checkpoint: options.checkpoint === true
    });
    addContract(`${name}Contract`, {
      actual_mode_property: 2,
      actual_travel_x: offset.x,
      actual_travel_y: offset.y,
      actual_activation_radius: activationRadius,
      actual_start_delay: startDelay,
      proximity_triggered: true,
      single_trip: true,
      starts_stationary: true,
      waits_at_destination: true,
      walkable_width: walkableWidth,
      mobile_phase_precision_required: false,
      void_required: false,
      ...(options.contract || {})
    });
    return {
      ...platformPosition,
      walkableWidth,
      halfWidth: walkableWidth / 2,
      startX: x,
      startY: y,
      endX: x + offset.x,
      endY: y + offset.y,
      path: `../Items/Mechanisms/${name}`
    };
  }

  function addCargoGroup(name, x, y, width, boxPattern) {
    addPlainNode(name, "Node2D", "Items/Mechanisms", {
      position: vector(x, y),
      "metadata/_llr_collapsible_cargo_group": "true",
      "metadata/_llr_walkable_width": String(width)
    });
    addInstance("Deck", `Items/Mechanisms/${name}`, "wood", {
      scale: vector(width / 64, 1),
      "metadata/_llr_walkable_width": String(width)
    });
    boxPattern.forEach(([boxX, boxY], index) => {
      addBox(`CargoBox${index + 1}`, boxX, boxY, `Items/Mechanisms/${name}`);
    });
    return { name, x, y, width, path: `../Items/Mechanisms/${name}` };
  }

  function addRecoveryStair(prefix, startX, startY, endX, endY, count) {
    const platforms = [];
    for (let index = 0; index < count; index += 1) {
      const t = count === 1 ? 0 : index / (count - 1);
      platforms.push(addCloud(
        `${prefix}${index + 1}`,
        startX + (endX - startX) * t,
        startY + (endY - startY) * t,
        10
      ));
    }
    assertConservativePlatformChain(prefix, platforms, {
      maxGap: 30,
      maxRise: 82,
      minLandingWidth: 160
    });
    return platforms;
  }

  // A permanent lower line catches every fall before the death plane. It is a slower route,
  // not a respawn substitute, and is punctuated by solid recovery stations.
  const recoveryClouds = [];
  for (let x = 120, index = 1; x <= stage.levelWidth + 120; x += 300, index += 1) {
    recoveryClouds.push(addCloud(`RecoveryCloud${index}`, x, RECOVERY_Y, 20));
  }
  assertConservativePlatformChain("ContinuousRecoveryCloudLine", recoveryClouds, {
    maxGap: 0,
    maxRise: 0,
    minLandingWidth: 320
  });
  const recoveryIslands = [1050, 3550, 6350, 7650, 10400, 13700, 15900, 17800, 20200];
  recoveryIslands.forEach((x, index) => {
    addTerrain(`RecoveryIsland${index + 1}`, x - 270, 648, 540, [0, 3, -3, 0]);
  });
  addContract("ContinuousRecoveryBackboneContract", {
    continuous_cloud_line: true,
    solid_recovery_island_count: recoveryIslands.length,
    maximum_open_gap: 0,
    minimum_cloud_width: 335,
    death_plane_required_for_progress: false,
    recovery_route_is_forward_only: true,
    void_required: false
  });

  addContract("V4StageFiveStructureContract", {
    target_seconds: 208,
    beat_count: 8,
    unequal_beat_widths: true,
    real_freight_line_count: 3,
    proximity_single_trip_freight: true,
    static_midway_stop: true,
    horizontal_to_vertical_transfer: true,
    gentle_last_train: true,
    automatic_maintenance_route: true,
    collapse_keeps_upper_and_lower_routes: true,
    final_relay_station_count: 3,
    min_moving_landing_width: MIN_MOVING_LANDING,
    mobile_phase_precision_required: false,
    continuous_lower_recovery: true,
    void_required: false
  });

  // Beat 1: the three actual networks are introduced together before the first boarding.
  const b1start = addTerrain("B1OverlookStart", -40, 240, 760, [0, -8, 6, 0]);
  const b1hub = addTerrain("B1CentralFreightHub", 700, 240, 760, [0, 5, -5, 0]);
  const b1exit = addTerrain("B1LineChoiceExit", 1440, 240, 400, [0, -3, 0]);
  addRouteLine("B1BlueFreightDiagram", "Color(0.2, 0.68, 1, 0.82)", [
    [340, 128], [790, 128], [1130, 20], [1620, 20]
  ], { "metadata/_llr_line_id": JSON.stringify("blue-horizontal") });
  addRouteLine("B1OrangeLiftDiagram", "Color(1, 0.58, 0.14, 0.86)", [
    [790, 190], [790, -170], [1330, -170]
  ], { "metadata/_llr_line_id": JSON.stringify("orange-vertical") });
  addRouteLine("B1GreenMaintenanceDiagram", "Color(0.28, 0.86, 0.48, 0.82)", [
    [160, 520], [760, 520], [1260, 580], [1780, 580]
  ], { "metadata/_llr_line_id": JSON.stringify("green-recovery") });
  addStationMarker("B1BlueMarker", 470, 90, "Color(0.25, 0.72, 1, 0.95)", "蓝线 横运", "blue-horizontal");
  addStationMarker("B1OrangeMarker", 1000, -130, "Color(1, 0.62, 0.2, 0.95)", "橙线 升降", "orange-vertical");
  addStationMarker("B1GreenMarker", 1320, 555, "Color(0.35, 0.9, 0.52, 0.95)", "绿线 维修", "green-recovery");
  grounded("B1NetworkSign", "Items/Decoration", "sign", b1hub, 0.43, -3, {
    lines: `Array[String](["蓝线横运、橙线升降、绿线回收。列车只有靠近才发车，到站后不会返回。"] )`
  });
  grounded("B1HubFlowers", "Items/Decoration", "flowers", b1start, 0.72, -10);
  addContract("B1ThreeLinePreviewContract", {
    simultaneous_destination_preview: true,
    color_coded_lines: 3,
    trajectory_preview_count: 3,
    lower_route_visible: true,
    moving_platform_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 238 }, { x: 520, y: 235 }, { x: 900, y: 240 },
    { x: 1260, y: 235 }, { x: 1580, y: 238 }, { x: 1780, y: 238 }
  ], { coinLimit: 5 });

  // Beat 2: standing on the car triggers one upward trip; the car then remains at the top station.
  const b2boarding = addTerrain("B2LiftBoardingIsland", 1800, 240, 440, [0, 3, -3, 0]);
  const b2upperA = addTerrain("B2UpperFreightDeckA", 2460, -80, 820, [0, 4, -4, 0]);
  const b2upperB = addTerrain("B2UpperFreightDeckB", 3270, -80, 830, [0, -4, 4, 0]);
  const b2lift = addSingleTripFreight("B2ProximityCargoLift", 2350, 240, { x: 0, y: -320 }, {
    triggerX: 2350,
    triggerY: 195,
    triggerWidth: 210,
    triggerHeight: 190,
    moveSeconds: 2.5,
    activationRadius: 176,
    startDelay: 0.2,
    announcement: "橙线感应：货梯单程上行，到站后停靠",
    walkableWidth: 224,
    contract: {
      vertical_travel: 320,
      destination_visible_before_boarding: true,
      lower_cloud_route_to_next_station: true
    }
  });
  addRouteLine("B2OrangeTravelTrace", "Color(1, 0.58, 0.14, 0.7)", [
    [2350, 240], [2350, -80], [2860, -80]
  ], { "metadata/_llr_actual_freight_trace": "true" });
  airborne("B2LiftArrow", "Items/Decoration", "arrow", 2350, 70, { rotation: "-1.5708" });
  grounded("B2UpperBottle", "Items/Pickups", "bottle", b2upperA, 0.58, -30);
  addContract("B2LiftSafetyContract", {
    moving_landing_width: b2lift.walkableWidth,
    starts_only_on_proximity: true,
    remains_at_upper_station: true,
    full_cloud_catch_below: true,
    precision_phase_required: false,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 1820, y: 238 }, { x: 2180, y: 238 }, { x: 2350, y: 238 },
    { x: 2350, y: -80 }, { x: 2700, y: -80 }, { x: 3250, y: -78 },
    { x: 3700, y: -80 }, { x: 4080, y: -80 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[1], "recovery", [
    { x: 2050, y: 250 }, { x: 2100, y: 420 }, { x: 2150, y: 600 },
    { x: 2700, y: 610 }, { x: 3300, y: 610 }, { x: 4000, y: 610 }
  ], { recoverySeconds: 11, coinLimit: 4 });

  // Beat 3: two independent one-way legs are separated by a completely static box-clearing bay.
  addWood("B3FirstBoardingDock", 4200, -80, 9);
  const b3legOne = addSingleTripFreight("B3FreightLegOne", 4320, -80, { x: 520, y: 0 }, {
    triggerX: 4320,
    triggerY: -125,
    moveSeconds: 2.4,
    activationRadius: 184,
    startDelay: 0.2,
    announcement: "蓝线第一段：中途仓台停靠",
    walkableWidth: 240,
    contract: { leg_index: 1, static_midway_destination: true }
  });
  const b3warehouse = addTerrain("B3StaticClearingWarehouse", 4950, -80, 760, [0, 2, -2, 0]);
  addBoxStack("B3WarehouseBoxesA", 5190, -80, 2, 3);
  addBoxStack("B3WarehouseBoxesB", 5480, -80, 2, 2);
  grounded("B3StaticStopSign", "Items/Decoration", "sign", b3warehouse, 0.5, -3, {
    lines: `Array[String](["中途站：列车已停稳。清理箱体后，从右侧触发下一班。"] )`
  });
  const b3legTwo = addSingleTripFreight("B3FreightLegTwo", 5830, -80, { x: 560, y: 0 }, {
    triggerX: 5830,
    triggerY: -125,
    moveSeconds: 2.5,
    activationRadius: 184,
    startDelay: 0.2,
    announcement: "蓝线第二段：前往调度站",
    walkableWidth: 240,
    contract: { leg_index: 2, starts_after_static_box_stop: true }
  });
  const b3arrival = addTerrain("B3DispatchApproach", 6500, -80, 320, [0, 0, 0]);
  addRouteLine("B3BlueTwoLegTrace", "Color(0.2, 0.68, 1, 0.72)", [
    [4320, -80], [4840, -80], [5330, -80], [5830, -80], [6390, -80], [6740, -80]
  ], { "metadata/_llr_actual_freight_trace": "true" });
  addContract("B3StaticMidwayStopContract", {
    freight_leg_count: 2,
    first_leg_width: b3legOne.walkableWidth,
    second_leg_width: b3legTwo.walkableWidth,
    static_clearing_platform_width: 760,
    platform_motion_during_box_clear: false,
    compound_input_required: false,
    side_bypass_width: 220,
    lower_cloud_route: true,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 4120, y: -80 }, { x: 4320, y: -80 }, { x: 4840, y: -80 },
    { x: 5050, y: -80 }, { x: 5350, y: -80 }, { x: 5650, y: -80 },
    { x: 5830, y: -80 }, { x: 6390, y: -80 }, { x: 6760, y: -80 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[2], "recovery", [
    { x: 4120, y: 610 }, { x: 4750, y: 610 }, { x: 5400, y: 610 },
    { x: 6050, y: 610 }, { x: 6720, y: 610 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 4: a broad, static dispatch floor separates the two moving-platform lessons.
  addWood("B4DescentPadUpper", 6870, 20, 8);
  addWood("B4DescentPadLower", 7080, 120, 8);
  const b4hub = addTerrain("B4StaticDispatchHub", 7180, 120, 850, [0, 3, -3, 0]);
  const b4exit = addTerrain("B4DispatchExit", 8020, 120, 200, [0, 0]);
  addDirector("B4DispatchCheckpoint", 7540, 50, {
    announcement: "中央调度站：下一段先横运，再垂直换乘",
    checkpoint: true,
    width: 320,
    height: 230
  });
  airborne("B4HoverInsurance", "Items/Pickups", "fluddHover", 7770, 70, {
    "metadata/_llr_optional_correction_only": "true"
  });
  airborne("B4RefillBottle", "Items/Pickups", "bottle", 7440, 72);
  [[7370, "Color(0.28, 0.9, 0.45, 1)"], [7450, "Color(1, 0.82, 0.18, 1)"], [7530, "Color(1, 0.32, 0.22, 1)"]]
    .forEach(([x, color], index) => {
      addPlainNode(`B4CountdownLamp${index + 1}`, "Polygon2D", "Items/Decoration", {
        z_index: "4",
        position: vector(x, 18),
        polygon: packed([[-18, -18], [18, -18], [18, 18], [-18, 18]]),
        color,
        "metadata/_llr_countdown_order": String(index + 1)
      });
    });
  addContract("B4DispatchRestContract", {
    static_checkpoint: true,
    moving_platform_count: 0,
    enemy_count: 0,
    countdown_lamp_count: 3,
    forced_wait_seconds: 0,
    optional_hover_only: true,
    next_transfer_visible: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 6820, y: -80 }, { x: 6870, y: 20 }, { x: 7080, y: 120 },
    { x: 7350, y: 118 }, { x: 7700, y: 120 }, { x: 8060, y: 118 },
    { x: 8180, y: 118 }
  ], { coinLimit: 4 });

  // Beat 5: horizontal and vertical motion never overlap; the transfer happens on a 650px island.
  const b5horizontal = addSingleTripFreight("B5HorizontalFreight", 8320, 120, { x: 640, y: 0 }, {
    triggerX: 8320,
    triggerY: 75,
    moveSeconds: 2.8,
    activationRadius: 184,
    startDelay: 0.25,
    announcement: "蓝线横运：到宽岛后再换乘橙线",
    walkableWidth: 240,
    contract: { transfer_stage: 1, destination_is_static_island: true }
  });
  const b5transfer = addTerrain("B5WideStaticTransferIsland", 9080, 120, 650, [0, 2, -2, 0]);
  const b5vertical = addSingleTripFreight("B5VerticalFreight", 9840, 120, { x: 0, y: -360 }, {
    triggerX: 9840,
    triggerY: 75,
    moveSeconds: 2.7,
    activationRadius: 184,
    startDelay: 0.25,
    announcement: "橙线升降：垂直货梯单程上行",
    walkableWidth: 240,
    contract: { transfer_stage: 2, static_island_before_motion: true }
  });
  const b5upper = addGroundRun("B5UpperArrival", 9970, 11200, -240, [0, 3, -3, 0]);
  const b5reserve = addSingleTripFreight("B5LowerReserveCar", 8370, 385, { x: 620, y: 0 }, {
    triggerX: 8370,
    triggerY: 340,
    triggerHeight: 170,
    moveSeconds: 1.8,
    activationRadius: 192,
    startDelay: 0.1,
    announcement: "备用车已到：沿下层慢线前往换乘岛",
    walkableWidth: 240,
    contract: { reserve_for_missed_horizontal: true, maximum_arrival_seconds: 2 }
  });
  addCloud("B5ReserveCatchA", 8240, 385, 12);
  addCloud("B5ReserveCatchB", 9120, 385, 12);
  addRecoveryStair("B5ReserveExitStep", 9180, 385, 9550, 145, 5);
  const b5recoveryLift = addSingleTripFreight("B5CloudRecoveryLift", 10350, RECOVERY_Y, { x: 0, y: -850 }, {
    triggerX: 10350,
    triggerY: 555,
    triggerHeight: 170,
    moveSeconds: 3.5,
    activationRadius: 200,
    startDelay: 0.2,
    announcement: "绿线回收货梯：返回上层站",
    walkableWidth: 256,
    contract: { recovery_only: true, lower_cloud_connection: true }
  });
  addRouteLine("B5BlueHorizontalTrace", "Color(0.2, 0.68, 1, 0.7)", [
    [8320, 120], [8960, 120], [9400, 120]
  ], { "metadata/_llr_actual_freight_trace": "true" });
  addRouteLine("B5OrangeVerticalTrace", "Color(1, 0.58, 0.14, 0.72)", [
    [9840, 120], [9840, -240], [10450, -240]
  ], { "metadata/_llr_actual_freight_trace": "true" });
  airborne("B5UpperBottle", "Items/Pickups", "bottle", 10650, -290);
  addContract("B5TransferSafetyContract", {
    horizontal_width: b5horizontal.walkableWidth,
    vertical_width: b5vertical.walkableWidth,
    static_transfer_island_width: 650,
    simultaneous_motion_required: false,
    reserve_arrival_seconds: 1.8,
    reserve_width: b5reserve.walkableWidth,
    recovery_lift_width: b5recoveryLift.walkableWidth,
    mobile_phase_precision_required: false,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 8220, y: 118 }, { x: 8320, y: 120 }, { x: 8960, y: 120 },
    { x: 9250, y: 118 }, { x: 9600, y: 120 }, { x: 9840, y: 120 },
    { x: 9840, y: -240 }, { x: 10200, y: -240 }, { x: 10700, y: -238 },
    { x: 11180, y: -240 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[4], "recovery", [
    { x: 8320, y: 385 }, { x: 8990, y: 385 }, { x: 9400, y: 260 },
    { x: 9700, y: 145 }, { x: 9850, y: 300 }, { x: 10100, y: 500 },
    { x: 10350, y: 610 }, { x: 10350, y: -240 }, { x: 10800, y: -240 }
  ], { recoverySeconds: 14, coinLimit: 5 });

  // Beat 6: the last train departs gently while a separate director raises the permanent slow route.
  const b6runway = addTerrain("B6LastTrainRunway", 11200, -240, 620, [0, 2, -2, 0]);
  airborne("B6ForwardBeltA", "Items/Mechanisms", "conveyor", 11360, -246, {
    width: "280",
    speed: "70",
    "metadata/_llr_gentle_chase_assist": "true"
  });
  airborne("B6ForwardBeltB", "Items/Mechanisms", "conveyor", 11680, -246, {
    width: "280",
    speed: "75",
    "metadata/_llr_gentle_chase_assist": "true"
  });
  const b6lastTrainPosition = airborne("B6LastFreightTrain", "Items/Mechanisms", "shuttle", 12000, -240, {
    scale: vector(256 / 84, 1),
    travel: vector(1450, 0),
    travel_seconds: "7.8",
    pause_seconds: "0",
    phase: "0",
    mode: "2",
    activation_radius: "560",
    start_delay: "1.4",
    "metadata/_llr_walkable_width": "256",
    "metadata/_llr_real_shuttle_mode": JSON.stringify("PROXIMITY"),
    "metadata/_llr_gentle_last_train": "true"
  });
  const b6lastTrain = {
    ...b6lastTrainPosition,
    walkableWidth: 256,
    halfWidth: 128
  };
  const maintenancePaths = [];
  const maintenancePlatforms = [];
  for (let index = 0; index < 7; index += 1) {
    const platform = addWood(`B6MaintenancePanel${index + 1}`, 11920 + index * 280, 720, 8);
    maintenancePlatforms.push(platform);
    maintenancePaths.push(`../Items/Platforms/B6MaintenancePanel${index + 1}`);
  }
  assertConservativePlatformChain("B6RaisedMaintenanceLine", maintenancePlatforms.map((platform) => ({
    ...platform,
    y: 490
  })), {
    maxGap: 30,
    maxRise: 0,
    minLandingWidth: 240
  });
  addDirector("B6LastTrainDispatch", 11480, -295, {
    width: 260,
    height: 220,
    announcement: "末班车发车！赶不上也可走正在升起的维修慢路",
    checkpoint: true
  });
  addDirector("B6MaintenanceRouteOpener", 11480, -295, {
    width: 260,
    height: 220,
    checkpoint: false,
    move: maintenancePaths,
    moveOffset: { x: 0, y: -230 },
    moveSeconds: 1.4
  });
  const b6arrival = addTerrain("B6LastTrainArrival", 13600, -240, 520, [0, -3, 3, 0]);
  addRecoveryStair("B6MaintenanceEntry", 11530, RECOVERY_Y, 11810, 490, 3);
  addRecoveryStair("B6MaintenanceExit", 13680, 490, 14040, 300, 4);
  airborne("B6FastLineBlueCoin", "Items/Pickups", "blueCoin", 13450, -295, {
    "metadata/_llr_fast_line_reward": "true"
  });
  addRouteLine("B6LastTrainTrace", "Color(0.2, 0.68, 1, 0.72)", [
    [12000, -240], [12600, -240], [13450, -240], [13900, -240]
  ], { "metadata/_llr_actual_freight_trace": "true" });
  addContract("B6GentleLastTrainContract", {
    actual_mode_property: 2,
    actual_activation_radius: 560,
    actual_start_delay: 1.4,
    actual_travel_x: 1450,
    chase_window_seconds: 7.8,
    moving_landing_width: b6lastTrain.walkableWidth,
    forward_conveyor_count: 2,
    maintenance_panels: maintenancePaths.length,
    maintenance_opens_with_departure: true,
    slow_route_wait_seconds: 0,
    death_on_miss: false,
    restart_on_miss: false,
    min_slow_route_landing_width: 256,
    mobile_phase_precision_required: false,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 11220, y: -240 }, { x: 11480, y: -240 }, { x: 11780, y: -240 },
    { x: 12000, y: -240 }, { x: 12450, y: -240 }, { x: 12900, y: -240 },
    { x: 13450, y: -240 }, { x: 13850, y: -240 }, { x: 14080, y: -240 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[5], "recovery", [
    { x: 11480, y: -240 }, { x: 11530, y: 80 }, { x: 11530, y: 400 },
    { x: 11530, y: 610 }, { x: 11810, y: 490 }, { x: 12350, y: 490 },
    { x: 12900, y: 490 }, { x: 13450, y: 490 }, { x: 14040, y: 300 }
  ], { recoverySeconds: 15, coinLimit: 5 });

  // Beat 7: the upper catwalk never collapses; cargo falls in three readable waves and enriches
  // the already traversable lower sorting route.
  const b7upperPlatforms = [];
  for (let x = 14220, index = 1; x <= 17820; x += 300, index += 1) {
    b7upperPlatforms.push(addWood(`B7UpperCatwalk${index}`, x, index % 2 ? -230 : -218, 8));
  }
  assertConservativePlatformChain("B7PermanentUpperCatwalk", b7upperPlatforms, {
    maxGap: 50,
    maxRise: 24,
    minLandingWidth: 240
  });
  const b7lowerPlatforms = [];
  for (let x = 14300, index = 1; x <= 17800; x += 400, index += 1) {
    if (index % 2) {
      const platform = addWood(`B7LowerStaticBay${index}`, x, 300, 10);
      b7lowerPlatforms.push(platform);
    } else {
      airborne(`B7LowerConveyor${index}`, "Items/Mechanisms", "conveyor", x, 300, {
        width: "320",
        speed: index % 4 ? "82" : "-62",
        "metadata/_llr_static_lower_route": "true"
      });
      b7lowerPlatforms.push({ x, y: 300, walkableWidth: 320, halfWidth: 160 });
    }
  }
  assertConservativePlatformChain("B7PermanentLowerSortingLine", b7lowerPlatforms, {
    maxGap: 82,
    maxRise: 0,
    minLandingWidth: 280
  });
  const cargoOne = addCargoGroup("B7CargoTierOne", 14920, -20, 288, [
    [-72, -18], [-36, -18], [0, -18], [36, -18], [72, -18], [-36, -54], [0, -54], [36, -54]
  ]);
  const cargoTwo = addCargoGroup("B7CargoTierTwo", 15920, 60, 288, [
    [-72, -18], [-36, -18], [0, -18], [36, -18], [72, -18], [-18, -54], [18, -54]
  ]);
  const cargoThree = addCargoGroup("B7CargoTierThree", 16920, 140, 288, [
    [-72, -18], [-36, -18], [0, -18], [36, -18], [72, -18]
  ]);
  addDirector("B7CollapseWarning", 14380, -20, {
    width: 300,
    height: 660,
    announcement: "警示灯闪烁：1.5 秒后货物分层下落，上下两路都能继续",
    checkpoint: true
  });
  [
    ["B7CollapseWaveOne", 14720, cargoOne, 320, 1.5, "第一层货台落入分拣线"],
    ["B7CollapseWaveTwo", 15720, cargoTwo, 240, 1.35, "第二层货台落入分拣线"],
    ["B7CollapseWaveThree", 16720, cargoThree, 160, 1.2, "第三层货台落入分拣线"]
  ].forEach(([name, x, cargo, drop, seconds, announcement]) => {
    addDirector(name, x, -20, {
      width: 260,
      height: 660,
      announcement,
      checkpoint: false,
      move: [cargo.path],
      moveOffset: { x: 0, y: drop },
      moveSeconds: seconds
    });
  });
  [14520, 15520, 16520].forEach((x, index) => {
    addPlainNode(`B7WarningLamp${index + 1}`, "Polygon2D", "Items/Decoration", {
      z_index: "5",
      position: vector(x, -330),
      polygon: packed([[-24, -18], [24, -18], [24, 18], [-24, 18]]),
      color: "Color(1, 0.25, 0.16, 0.95)",
      "metadata/_llr_warning_lead_seconds": "1.5"
    });
  });
  addRecoveryStair("B7LowerToRelay", 17480, 300, 18000, 80, 5);
  addContract("B7LayeredCollapseContract", {
    warning_lead_seconds: 1.5,
    collapse_wave_count: 3,
    cargo_decks_become_lower_landings: true,
    upper_route_static_after_collapse: true,
    lower_route_static_after_collapse: true,
    upper_failure_to_lower_route: true,
    lower_conveyor_route_continues: true,
    continuous_recovery_below: true,
    min_landing_width: 256,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 14120, y: -240 }, { x: 14400, y: -230 }, { x: 14800, y: -220 },
    { x: 15200, y: -230 }, { x: 15600, y: -218 }, { x: 16000, y: -230 },
    { x: 16400, y: -218 }, { x: 16800, y: -230 }, { x: 17200, y: -218 },
    { x: 17600, y: -230 }, { x: 17980, y: 80 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[6], "recovery", [
    { x: 14120, y: 300 }, { x: 14500, y: 300 }, { x: 14900, y: 300 },
    { x: 15300, y: 300 }, { x: 15700, y: 300 }, { x: 16100, y: 300 },
    { x: 16500, y: 300 }, { x: 16900, y: 300 }, { x: 17300, y: 300 },
    { x: 17600, y: 240 }, { x: 18000, y: 80 }
  ], { recoverySeconds: 15, coinLimit: 6 });

  // Beat 8: each car moves into a missing section and remains there, leaving a literal straight road.
  const b8stationOne = addTerrain("B8RelayStationOne", 17950, 80, 280, [0, 0, 0]);
  const b8stationTwo = addTerrain("B8RelayStationTwo", 18480, 80, 360, [0, 0, 0]);
  const b8stationThree = addTerrain("B8RelayStationThree", 19120, 80, 360, [0, 0, 0]);
  const b8finish = addGroundRun("B8StraightFinishRoad", 19760, 20520, 80, [0, 0, 0, 0]);
  const relayOne = addSingleTripFreight("B8RelayBridgeOne", 18355, 420, { x: 0, y: -340 }, {
    triggerX: 18100,
    triggerY: 35,
    triggerWidth: 250,
    moveSeconds: 1.25,
    activationRadius: 480,
    startDelay: 0.15,
    announcement: "接力站 1/3：第一块货台升到直线",
    checkpoint: true,
    walkableWidth: 288,
    contract: { relay_index: 1, final_y: 80 }
  });
  const relayTwo = addSingleTripFreight("B8RelayBridgeTwo", 18980, -260, { x: 0, y: 340 }, {
    triggerX: 18660,
    triggerY: 35,
    triggerWidth: 260,
    moveSeconds: 1.25,
    activationRadius: 520,
    startDelay: 0.15,
    announcement: "接力站 2/3：第二块货台降到直线",
    walkableWidth: 320,
    contract: { relay_index: 2, final_y: 80 }
  });
  const relayThree = addSingleTripFreight("B8RelayBridgeThree", 19620, 420, { x: 0, y: -340 }, {
    triggerX: 19300,
    triggerY: 35,
    triggerWidth: 260,
    moveSeconds: 1.25,
    activationRadius: 520,
    startDelay: 0.15,
    announcement: "接力站 3/3：终点直路完成",
    walkableWidth: 320,
    contract: { relay_index: 3, final_y: 80 }
  });
  addRecoveryStair("B8RecoveryToFinish", 19400, RECOVERY_Y, 20000, 80, 9);
  grounded("B8FinishFlowers", "Items/Decoration", "flowers", b8finish[0], 0.65, -10);
  addContract("B8ThreeStationRelayContract", {
    relay_station_count: 3,
    final_alignment_y: 80,
    first_bridge_width: relayOne.walkableWidth,
    second_bridge_width: relayTwo.walkableWidth,
    third_bridge_width: relayThree.walkableWidth,
    all_cars_wait_at_destination: true,
    final_route_is_straight: true,
    enemy_count: 0,
    static_trigger_islands: 3,
    lower_recovery_to_finish: true,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 18000, y: 80 }, { x: 18200, y: 80 }, { x: 18355, y: 80 },
    { x: 18600, y: 80 }, { x: 18820, y: 80 }, { x: 18980, y: 80 },
    { x: 19280, y: 80 }, { x: 19460, y: 80 }, { x: 19620, y: 80 },
    { x: 19850, y: 80 }, { x: 20200, y: 80 }, { x: 20470, y: 80 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[7], "recovery", [
    { x: 18000, y: 610 }, { x: 18600, y: 610 }, { x: 19200, y: 610 },
    { x: 19400, y: 610 }, { x: 19600, y: 430 }, { x: 19800, y: 250 },
    { x: 20000, y: 80 }, { x: 20420, y: 80 }
  ], { recoverySeconds: 12, coinLimit: 5 });

  return finalize({
    startSurface: b1start,
    spawnT: 0.16,
    introLines: [
      "[@n,老师快跑]5 云端货运站 V4",
      "蓝线横运、橙线升降、绿线回收；靠近才发车，到站后永久停靠。错过任何列车都沿下方云路继续。"
    ],
    finishPosition: { x: 20485, y: 80 },
    finishSize: { x: 92, y: 360 },
    extraFlowMetadata: {
      freight_line_count: 3,
      proximity_single_trip_count: 11,
      static_midway_box_stop: true,
      horizontal_vertical_transfer: true,
      maintenance_route_automatic: true,
      collapse_route_count_after_event: 2,
      relay_station_count: 3,
      min_moving_landing_width: MIN_MOVING_LANDING,
      mobile_phase_precision_required: false,
      continuous_recovery_cloud_line: true,
      void_required: false
    }
  });
}
