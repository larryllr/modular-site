import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const projectRoot = "vendor/Legacy_SM63Redux";
const extrasRoot = `${projectRoot}/scenes/levels/llr_complete`;
const mainMenuPath = `${projectRoot}/scenes/menus/title/main_menu/main_menu.gd`;
const mainMenuResource = "res://scenes/menus/title/main_menu/main_menu.tscn";
const segmentWidth = 3800;
const segmentCount = 10;
const levelWidth = segmentWidth * segmentCount;

const resources = {
  terrain: "res://classes/solid/terrain/terrain_polygon.tscn",
  player: "res://classes/player/player.tscn",
  background: "res://scenes/levels/tutorial_1/bg/bg_t1.tscn",
  camera: "res://classes/zone/camera_area/camera_area.tscn",
  sign: "res://classes/interactable/sign/sign.tscn",
  bigTree: "res://classes/decorative/big_tree.tscn",
  smallTree: "res://classes/decorative/small_tree.tscn",
  flowers: "res://classes/decorative/flowers.tscn",
  goomba: "res://classes/entity/enemy/goomba/goomba.tscn",
  bobomb: "res://classes/entity/enemy/bobomb/bobomb.tscn",
  cheep: "res://classes/entity/enemy/cheep_cheep/cheep_cheep.tscn",
  parakoopa: "res://classes/entity/enemy/koopa/parakoopa.tscn",
  goonie: "res://classes/entity/passive/goonie/goonie.tscn",
  coin: "res://classes/pickup/coin/yellow/coin_yellow.tscn",
  blueCoin: "res://classes/pickup/coin/blue/coin_blue.tscn",
  bottle: "res://classes/pickup/bottle/bottle_big.tscn",
  fludd: "res://classes/pickup/fludd_box/fludd_box.tscn",
  water: "res://classes/water/water.tscn",
  log: "res://classes/solid/log/log.tscn",
  fallingLog: "res://classes/solid/log/log_fall.tscn",
  box: "res://classes/solid/breakable_box/breakable_box.tscn",
  wood: "res://classes/solid/wooden_platform/wooden_platform.tscn",
  fungus: "res://classes/solid/fungus_platform/fungus_stem.tscn",
  cloud: "res://classes/solid/telescoping/cloud/cloud.tscn",
  pivot: "res://classes/solid/moving_platform/pivot.tscn",
  tippingLog: "res://classes/solid/telescoping/tipping_log/tipping_log.tscn",
  rotating: "res://classes/solid/rotating_block/rotating_block.tscn",
  warp: "res://classes/zone/trigger/warpzone/warp_zone.tscn",
  death: "res://classes/zone/trigger/death_plane/death_plane.tscn"
};

const resourceIds = Object.fromEntries(
  Object.keys(resources).map((key, index) => [key, `llr_${index + 1}`])
);

const stages = [
  {
    id: 1,
    title: "1 郊野多层远征",
    description: "坡地、树冠、浅湖与两次强制爬升",
    heights: [220, 160, -320, -80, 300, 40, 300, -420, -420, 160, 120],
    themes: ["meadow", "meadow", "lake", "meadow", "bomb", "meadow", "lake", "flight", "meadow", "gauntlet"]
  },
  {
    id: 2,
    title: "2 湖区水陆环线",
    description: "两次潜水、两次上岸与高空跨湖路线",
    heights: [220, 300, -180, 220, -420, 280, -340, -340, 260, -260, 120],
    themes: ["lake", "meadow", "lake", "flight", "lake", "bomb", "lake", "fungus", "lake", "gauntlet"]
  },
  {
    id: 3,
    title: "3 爆弹施工塔",
    description: "箱阵塔、爆弹竖井与旋转吊臂",
    heights: [220, 80, -560, -220, 260, -480, 220, 220, -420, 140, 80],
    themes: ["bomb", "meadow", "bomb", "rotor", "bomb", "lake", "bomb", "flight", "rotor", "gauntlet"]
  },
  {
    id: 4,
    title: "4 蘑菇垂直山谷",
    description: "四次爬升、两次下降与 FLUDD 横渡",
    heights: [260, -520, -220, 300, -600, -300, 220, -520, 180, -480, 80],
    themes: ["fungus", "meadow", "fungus", "lake", "fungus", "flight", "fungus", "rotor", "fungus", "gauntlet"]
  },
  {
    id: 5,
    title: "5 云海双层航线",
    description: "高低云层、双空港与完整地面回收路线",
    heights: [240, -420, -420, -760, -180, -620, -620, 220, -520, -160, -260],
    themes: ["sky", "fungus", "sky", "flight", "sky", "rotor", "sky", "lake", "sky", "gauntlet"]
  },
  {
    id: 6,
    title: "6 水下遗迹往返",
    description: "湖底、遗迹高架与云上路线反复切换",
    heights: [240, 320, -260, -260, 260, -420, 320, -500, -500, 240, 120],
    themes: ["lake", "fungus", "flight", "lake", "bomb", "fungus", "lake", "sky", "flight", "gauntlet"]
  },
  {
    id: 7,
    title: "7 飞行军团空港",
    description: "双登机塔、旋翼空港与密集航线",
    heights: [220, -300, -300, -620, -180, -520, 220, 220, -520, -240, -160],
    themes: ["flight", "sky", "flight", "meadow", "flight", "fungus", "flight", "rotor", "sky", "gauntlet"]
  },
  {
    id: 8,
    title: "8 旋转机关塔",
    description: "旋转方块、枢轴平台和倾斜木桥",
    heights: [220, -480, -120, -620, -220, -700, -180, 220, -520, -240, -160],
    themes: ["rotor", "bomb", "rotor", "sky", "rotor", "fungus", "rotor", "flight", "rotor", "gauntlet"]
  },
  {
    id: 9,
    title: "9 九机制混合长征",
    description: "前八关机制重组后的多层综合挑战",
    heights: [220, 260, -180, -520, -160, -620, -260, 220, -480, -120, 100],
    themes: ["meadow", "lake", "bomb", "fungus", "sky", "flight", "rotor", "lake", "gauntlet", "gauntlet"]
  },
  {
    id: 10,
    title: "10 终极老师城",
    description: "水牢、双塔、机械城墙与四阶段终局",
    heights: [220, 60, 300, -420, -180, -680, -240, 220, -520, -80, 100],
    themes: ["gauntlet", "bomb", "sky", "lake", "rotor", "fungus", "flight", "gauntlet", "sky", "finale"]
  }
].map((stage) => ({
  ...stage,
  resource: `res://scenes/levels/llr_complete/llr_complete_${stage.id}.tscn`,
  output: `${extrasRoot}/llr_complete_${stage.id}.tscn`
}));

function fmt(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function vector(x, y) {
  return `Vector2(${fmt(x)}, ${fmt(y)})`;
}

function packed(points) {
  return `PackedVector2Array(${points.flat().map(fmt).join(", ")})`;
}

function instanceNode(name, parent, resource, properties = {}) {
  const lines = [
    `[node name="${name}" parent="${parent}" instance=ExtResource("${resourceIds[resource]}")]`
  ];
  for (const [key, value] of Object.entries(properties)) {
    lines.push(`${key} = ${value}`);
  }
  return `${lines.join("\n")}\n`;
}

function plainNode(name, type, parent = ".") {
  if (parent === "") {
    return `[node name="${name}" type="${type}"]\n`;
  }
  return `[node name="${name}" type="${type}" parent="${parent}"]\n`;
}

function terrainNode(name, x, y, width, topProfile = [0, 0, 0, 0], depth = 420) {
  const step = width / (topProfile.length - 1);
  const top = topProfile.map((offset, index) => [index * step, offset]);
  const polygon = [...top, [width, depth], [0, depth]];
  return instanceNode(name, "Terrain", "terrain", {
    z_index: "1",
    position: vector(x, y),
    polygon: packed(polygon)
  });
}

function addCoinArc(nodes, prefix, x, y, count = 7, spacing = 58, height = 70) {
  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 0 : index / (count - 1);
    const offsetY = -Math.sin(progress * Math.PI) * height;
    nodes.push(instanceNode(`${prefix}Coin${index + 1}`, "Items/Coins", "coin", {
      position: vector(x + index * spacing, y + offsetY)
    }));
  }
}

function addEnemyLine(nodes, prefix, resource, x, y, count, spacing) {
  for (let index = 0; index < count; index += 1) {
    nodes.push(instanceNode(`${prefix}${resource}${index + 1}`, "Items/Enemies", resource, {
      position: vector(x + index * spacing, y)
    }));
  }
}

function addMainTerrain(nodes, segmentIndex, stage, raised = false) {
  const x = segmentIndex * segmentWidth;
  const entryY = stage.heights[segmentIndex];
  const exitY = stage.heights[segmentIndex + 1];
  const delta = exitY - entryY;
  const middleY = entryY + delta * 0.5 + (raised ? -80 : 0);

  nodes.push(terrainNode(`S${segmentIndex + 1}EntryTerrain`, x + 20, entryY, 610, [0, -12, 8, 0], 360));
  nodes.push(terrainNode(`S${segmentIndex + 1}MiddleTerrain`, x + 1540, middleY, 720, [0, -22, 14, 0], 330));
  nodes.push(terrainNode(`S${segmentIndex + 1}ExitTerrain`, x + 3040, exitY, 760, [0, -10, 6, 0], 430));

  const steps = Math.max(3, Math.min(8, Math.ceil(Math.abs(delta) / 105)));
  for (let index = 0; index < steps; index += 1) {
    const progress = (index + 1) / (steps + 1);
    const stepX = x + 620 + progress * 900;
    const stepY = entryY + delta * progress - 35;
    const resource = delta < -260 && index % 2 === 0 ? "cloud" : "wood";
    const properties = {
      position: vector(stepX, stepY),
      ...(resource === "cloud" ? { width: "2" } : {})
    };
    nodes.push(instanceNode(`S${segmentIndex + 1}ElevationStep${index + 1}`, "Items/Platforms", resource, properties));
  }

  const bridgeSteps = Math.max(3, Math.min(7, Math.ceil(Math.abs(delta) / 130) + 2));
  for (let index = 0; index < bridgeSteps; index += 1) {
    const progress = (index + 1) / (bridgeSteps + 1);
    nodes.push(instanceNode(`S${segmentIndex + 1}ExitStep${index + 1}`, "Items/Platforms", index % 3 === 0 ? "cloud" : "wood", {
      position: vector(x + 2260 + progress * 760, middleY + (exitY - middleY) * progress - 45),
      ...(index % 3 === 0 ? { width: "2" } : {})
    }));
  }
  return { x, baseY: middleY, entryY, exitY };
}

function addRecoveryRoute(nodes, segmentIndex, stage) {
  const x = segmentIndex * segmentWidth;
  const exitY = stage.heights[segmentIndex + 1];
  const recoveryY = 650 + ((segmentIndex + stage.id) % 2) * 25;
  nodes.push(terrainNode(`S${segmentIndex + 1}RecoveryGroundA`, x + 160, recoveryY, 1050, [0, -8, 12, 0], 360));
  nodes.push(terrainNode(`S${segmentIndex + 1}RecoveryGroundB`, x + 1390, recoveryY + 20, 940, [0, 10, -8, 0], 350));
  nodes.push(terrainNode(
    `S${segmentIndex + 1}RecoveryBlocker`,
    x + 2360,
    exitY + 70,
    210,
    [0, 0, 0, 0],
    recoveryY - exitY + 520
  ));
  addCoinArc(nodes, `S${segmentIndex + 1}Recovery`, x + 420, recoveryY - 55, 7, 92, 34);
  const climbHeight = recoveryY - exitY;
  const climbSteps = Math.max(5, Math.min(10, Math.ceil(climbHeight / 105)));
  for (let index = 0; index < climbSteps; index += 1) {
    const progress = (index + 1) / (climbSteps + 1);
    nodes.push(instanceNode(`S${segmentIndex + 1}RecoveryClimb${index + 1}`, "Items/Platforms", index % 2 === 0 ? "cloud" : "wood", {
      position: vector(x + 1760 + progress * 680, recoveryY - climbHeight * progress - 45),
      ...(index % 2 === 0 ? { width: "2" } : {})
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}RecoveryTree`, "Items/Decoration", "smallTree", {
    position: vector(x + 1040, recoveryY - 30)
  }));
}

function addSegmentMarker(nodes, index, theme, stage) {
  nodes.push(`${plainNode(`LLRSegment${String(index + 1).padStart(2, "0")}_${theme}`, "Node2D").trimEnd()}
position = ${vector(index * segmentWidth, stage.heights[index])}
metadata/_llr_entry_y = ${fmt(stage.heights[index])}
metadata/_llr_exit_y = ${fmt(stage.heights[index + 1])}
`);
}

function buildMeadow(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addCoinArc(nodes, `S${segmentIndex + 1}MeadowA`, x + 260, baseY - 55, 8, 64, 72);
  addCoinArc(nodes, `S${segmentIndex + 1}MeadowB`, x + 1620, baseY - 70, 7, 68, 92);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goomba", x + 920, baseY - 22, 3 + (stage.id > 5 ? 1 : 0), 190);
  nodes.push(instanceNode(`S${segmentIndex + 1}Log1`, "Items/Platforms", "log", {
    position: vector(x + 1220, baseY - 75),
    rotation: fmt(-0.12)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Log2`, "Items/Platforms", "fallingLog", {
    position: vector(x + 2420, baseY - 110)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}BigTree`, "Items/Decoration", "bigTree", {
    position: vector(x + 480, baseY - 28)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}SmallTree`, "Items/Decoration", "smallTree", {
    position: vector(x + 2950, baseY - 22)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Flowers`, "Items/Decoration", "flowers", {
    position: vector(x + 2050, baseY - 10)
  }));
}

function buildLake(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  nodes.push(instanceNode(`S${segmentIndex + 1}Water1`, "Water", "water", {
    position: vector(x + 1120, baseY + 4),
    polygon: packed([[0, 0], [230, 0], [230, 245], [0, 245]])
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Water2`, "Water", "water", {
    position: vector(x + 2340, baseY + 8),
    polygon: packed([[0, 0], [190, 0], [190, 255], [0, 255]])
  }));
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Bridge${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 1080 + index * 115, baseY - 55 - (index % 2) * 18)
    }));
  }
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "cheep", x + 1200, baseY + 105, 3, 150);
  addCoinArc(nodes, `S${segmentIndex + 1}LakeA`, x + 320, baseY - 62, 7, 70, 55);
  addCoinArc(nodes, `S${segmentIndex + 1}LakeB`, x + 2550, baseY - 75, 8, 62, 78);
  nodes.push(instanceNode(`S${segmentIndex + 1}LakeLog`, "Items/Platforms", "tippingLog", {
    position: vector(x + 2190, baseY - 90)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Bottle`, "Items/Pickups", "bottle", {
    position: vector(x + 3100, baseY - 85)
  }));
}

function buildBomb(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "bobomb", x + 480, baseY - 24, 4 + (stage.id > 6 ? 1 : 0), 330);
  for (let index = 0; index < 7; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Box${index + 1}`, "Items/Platforms", "box", {
      position: vector(x + 1540 + (index % 4) * 70, baseY - 35 - Math.floor(index / 4) * 70)
    }));
  }
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}BombWood${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 2350 + index * 240, baseY - 90 - (index % 2) * 70)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}BombA`, x + 220, baseY - 70, 8, 65, 65);
  addCoinArc(nodes, `S${segmentIndex + 1}BombB`, x + 2500, baseY - 165, 7, 88, 55);
  nodes.push(instanceNode(`S${segmentIndex + 1}BombRotating`, "Items/Mechanisms", "rotating", {
    position: vector(x + 2140, baseY - 135),
    size: vector(86, 86),
    speed: fmt(stage.id >= 8 ? 1.35 : 1),
    wait: fmt(80 - Math.min(stage.id, 8) * 3),
    type: "1"
  }));
}

function buildFungus(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage, true);
  const heights = [120, 210, 310, 230, 360, 260];
  for (let index = 0; index < heights.length; index += 1) {
    const height = heights[(index + stage.id) % heights.length];
    nodes.push(instanceNode(`S${segmentIndex + 1}Fungus${index + 1}`, "Items/Platforms", "fungus", {
      position: vector(x + 540 + index * 470, baseY + 5),
      points: packed([[0, 0], [-6, -height * 0.25], [4, -height * 0.5], [-3, -height * 0.75], [0, -height]])
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}FungusA`, x + 480, baseY - 220, 9, 62, 105);
  addCoinArc(nodes, `S${segmentIndex + 1}FungusB`, x + 2220, baseY - 260, 8, 70, 85);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 980, baseY - 300, 3, 720);
  if (segmentIndex === 0 || segmentIndex === 4) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Fludd`, "Items/Pickups", "fludd", {
      position: vector(x + 240, baseY - 70),
      nozzle: "1"
    }));
  }
}

function buildSky(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  for (let index = 0; index < 8; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Cloud${index + 1}`, "Items/Platforms", "cloud", {
      position: vector(x + 350 + index * 430, baseY - 220 - (index % 4) * 105),
      width: index % 3 === 0 ? "3" : "2"
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyPivot1`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1450, baseY - 430),
    radius: "78",
    count: "3",
    speed: fmt(8 + stage.id * 0.4),
    offset: fmt(segmentIndex * 0.3)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyPivot2`, "Items/Mechanisms", "pivot", {
    position: vector(x + 2800, baseY - 480),
    radius: "92",
    count: "4",
    speed: fmt(-7 - stage.id * 0.35),
    offset: fmt(segmentIndex * 0.2)
  }));
  addCoinArc(nodes, `S${segmentIndex + 1}SkyA`, x + 320, baseY - 300, 9, 70, 115);
  addCoinArc(nodes, `S${segmentIndex + 1}SkyB`, x + 2150, baseY - 420, 8, 75, 95);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 850, baseY - 390, 4, 760);
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyBottle`, "Items/Pickups", "bottle", {
    position: vector(x + 2980, baseY - 600)
  }));
}

function buildRotor(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}RotorBlock${index + 1}`, "Items/Mechanisms", "rotating", {
      position: vector(x + 620 + index * 760, baseY - 130 - (index % 2) * 95),
      size: vector(78 + (index % 2) * 16, 78 + (index % 2) * 16),
      speed: fmt((index % 2 === 0 ? 1 : -1) * (1 + stage.id * 0.045)),
      wait: fmt(72 - Math.min(stage.id, 9) * 2),
      type: String(index % 2)
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}RotorPivot1`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1350, baseY - 280),
    radius: "86",
    count: "3",
    speed: fmt(9 + stage.id * 0.5),
    offset: "0.4"
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}RotorPivot2`, "Items/Mechanisms", "pivot", {
    position: vector(x + 2580, baseY - 310),
    radius: "105",
    count: "4",
    speed: fmt(-8 - stage.id * 0.45),
    offset: "1.1"
  }));
  for (let index = 0; index < 3; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Tipping${index + 1}`, "Items/Platforms", "tippingLog", {
      position: vector(x + 1850 + index * 420, baseY - 110 - index * 35)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}RotorA`, x + 260, baseY - 80, 8, 64, 70);
  addCoinArc(nodes, `S${segmentIndex + 1}RotorB`, x + 2050, baseY - 250, 9, 70, 90);
}

function buildFlight(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 520, baseY - 170, 5, 610);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goonie", x + 260, baseY - 300, 6, 570);
  for (let index = 0; index < 5; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}FlightWood${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 720 + index * 600, baseY - 100 - (index % 3) * 90)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}FlightA`, x + 300, baseY - 245, 10, 70, 120);
  addCoinArc(nodes, `S${segmentIndex + 1}FlightB`, x + 2200, baseY - 190, 8, 75, 85);
  nodes.push(instanceNode(`S${segmentIndex + 1}FlightBlueCoin`, "Items/Pickups", "blueCoin", {
    position: vector(x + 3320, baseY - 210)
  }));
}

function buildGauntlet(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage, stage.id >= 9);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goomba", x + 380, baseY - 22, 3, 210);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "bobomb", x + 1450, baseY - 22, 3, 260);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 2300, baseY - 220, 3, 430);
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}GauntletBox${index + 1}`, "Items/Platforms", "box", {
      position: vector(x + 1050 + index * 72, baseY - 36 - (index % 2) * 72)
    }));
  }
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}GauntletCloud${index + 1}`, "Items/Platforms", "cloud", {
      position: vector(x + 2100 + index * 390, baseY - 270 - (index % 2) * 90),
      width: "2"
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletPivot`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1900, baseY - 260),
    radius: "92",
    count: "4",
    speed: fmt(10 + stage.id * 0.5),
    offset: "0.8"
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletRotor`, "Items/Mechanisms", "rotating", {
    position: vector(x + 3250, baseY - 155),
    size: vector(96, 96),
    speed: fmt(1.25 + stage.id * 0.03),
    wait: fmt(62 - Math.min(stage.id, 9)),
    type: "1"
  }));
  addCoinArc(nodes, `S${segmentIndex + 1}GauntletA`, x + 260, baseY - 80, 8, 65, 65);
  addCoinArc(nodes, `S${segmentIndex + 1}GauntletB`, x + 2080, baseY - 350, 10, 70, 110);
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletBottle`, "Items/Pickups", "bottle", {
    position: vector(x + 3000, baseY - 390)
  }));
}

function buildFinale(nodes, segmentIndex, stage) {
  buildGauntlet(nodes, segmentIndex, stage);
  const x = segmentIndex * segmentWidth;
  for (let index = 0; index < 5; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}FinaleRotor${index + 1}`, "Items/Mechanisms", "rotating", {
      position: vector(x + 900 + index * 510, -120 - (index % 2) * 120),
      size: vector(72, 72),
      speed: fmt((index % 2 === 0 ? 1 : -1) * 1.6),
      wait: "48",
      type: "1"
    }));
  }
  addEnemyLine(nodes, `S${segmentIndex + 1}Final`, "goonie", x + 500, -340, 5, 630);
  addCoinArc(nodes, `S${segmentIndex + 1}Finale`, x + 420, -260, 12, 76, 155);
}

const builders = {
  meadow: buildMeadow,
  lake: buildLake,
  bomb: buildBomb,
  fungus: buildFungus,
  sky: buildSky,
  rotor: buildRotor,
  flight: buildFlight,
  gauntlet: buildGauntlet,
  finale: buildFinale
};

function buildStage(stage) {
  const nodes = [];
  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background"));
  nodes.push(instanceNode("CameraArea", ".", "camera", {
    visible: "false",
    polygon: packed([[-180, -1050], [levelWidth + 180, -1050], [levelWidth + 180, 980], [-180, 980]])
  }));
  nodes.push(instanceNode("Player", ".", "player", {
    position: vector(140, stage.heights[0] - 58)
  }));
  nodes.push(plainNode("Terrain", "Node2D"));
  nodes.push(plainNode("Items", "Node2D"));
  nodes.push(plainNode("Coins", "Node2D", "Items"));
  nodes.push(plainNode("Enemies", "Node2D", "Items"));
  nodes.push(plainNode("Platforms", "Node2D", "Items"));
  nodes.push(plainNode("Mechanisms", "Node2D", "Items"));
  nodes.push(plainNode("Pickups", "Node2D", "Items"));
  nodes.push(plainNode("Decoration", "Node2D", "Items"));
  nodes.push(plainNode("Water", "Node2D"));

  nodes.push(instanceNode("LevelIntro", "Items", "sign", {
    position: vector(310, 185),
    lines: `Array[String]([${JSON.stringify(`[@n,老师快跑]${stage.title}`)}, ${JSON.stringify("本关包含十个大型段落。沿主路线前进；高空失足会落到下方回收路线，不会跳出本关。")}])`
  }));

  for (let index = 0; index < segmentCount; index += 1) {
    const theme = stage.themes[index];
    addSegmentMarker(nodes, index, theme, stage);
    if (["fungus", "sky", "rotor", "flight", "gauntlet", "finale"].includes(theme)) {
      addRecoveryRoute(nodes, index, stage);
    }
    builders[theme](nodes, index, stage);
  }

  const nextScene = stage.id < stages.length
    ? stages[stage.id].resource
    : mainMenuResource;
  nodes.push(instanceNode("FinishWarp", ".", "warp", {
    position: vector(levelWidth - 90, -60),
    sweep_direction: vector(-1, 0),
    spawn_location: stage.id < stages.length ? vector(140, stages[stage.id].heights[0] - 58) : vector(110, 153),
    scene_path: JSON.stringify(nextScene),
    size: vector(80, 2100)
  }));
  nodes.push(instanceNode("VoidRescue", ".", "death", {
    visible: "false",
    position: vector(0, 1120),
    polygon: packed([[-500, 0], [levelWidth + 1000, 0], [levelWidth + 1000, 500], [-500, 500]])
  }));
  nodes.push(instanceNode("FinishBlueCoin", "Items/Pickups", "blueCoin", {
    position: vector(levelWidth - 360, 90)
  }));

  const extResources = Object.entries(resources)
    .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
    .join("\n");
  const scene = `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
  mkdirSync(dirname(stage.output), { recursive: true });
  writeFileSync(stage.output, scene, "utf8");
}

const extrasDeclarations = `
const LLR_EXTRA_LEVELS = [
${stages.map((stage) => `\t{"title": "${stage.title}", "description": "${stage.description}", "path": "${stage.resource}"}`).join(",\n")}
]

var show_extras = false
var extras_control: ColorRect
var extras_first_button: Button`;

const extrasMethods = `
func _ready() -> void:
\t_build_extras_menu()


func _build_extras_menu() -> void:
\textras_control = ColorRect.new()
\textras_control.name = "LLRExtrasMenu"
\textras_control.color = Color(0.025, 0.065, 0.11, 0.96)
\textras_control.mouse_filter = Control.MOUSE_FILTER_STOP
\textras_control.z_index = 100
\tadd_child(extras_control)
\textras_control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
\textras_control.visible = false

\tvar center := CenterContainer.new()
\textras_control.add_child(center)
\tcenter.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

\tvar panel := PanelContainer.new()
\tpanel.custom_minimum_size = Vector2(604, 346)
\tcenter.add_child(panel)

\tvar margin := MarginContainer.new()
\tfor side in ["margin_left", "margin_top", "margin_right", "margin_bottom"]:
\t\tmargin.add_theme_constant_override(side, 8)
\tpanel.add_child(margin)

\tvar column := VBoxContainer.new()
\tcolumn.add_theme_constant_override("separation", 4)
\tmargin.add_child(column)

\tvar title := Label.new()
\ttitle.text = "老师快跑：完整流程"
\ttitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\ttitle.add_theme_font_size_override("font_size", 19)
\tcolumn.add_child(title)

\tvar hint := Label.new()
\thint.text = "从任意关开始；抵达终点会自动进入下一关"
\thint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\thint.modulate = Color(0.78, 0.88, 1.0, 1.0)
\tcolumn.add_child(hint)

\tvar grid := GridContainer.new()
\tgrid.columns = 2
\tgrid.add_theme_constant_override("h_separation", 8)
\tgrid.add_theme_constant_override("v_separation", 4)
\tcolumn.add_child(grid)

\tfor level in LLR_EXTRA_LEVELS:
\t\tvar button := Button.new()
\t\tbutton.text = level["title"]
\t\tbutton.tooltip_text = level["description"]
\t\tbutton.custom_minimum_size = Vector2(286, 30)
\t\tbutton.focus_mode = Control.FOCUS_ALL
\t\tbutton.pressed.connect(_launch_extra_level.bind(level["path"]))
\t\tgrid.add_child(button)
\t\tif extras_first_button == null:
\t\t\textras_first_button = button

\tvar description := Label.new()
\tdescription.text = "10 关 × 10 段长流程；高空下方均有本关地面回收路线"
\tdescription.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tdescription.modulate = Color(1.0, 0.86, 0.48, 1.0)
\tcolumn.add_child(description)

\tvar extras_back_button := Button.new()
\textras_back_button.text = "返回主菜单"
\textras_back_button.custom_minimum_size = Vector2(0, 30)
\textras_back_button.pressed.connect(_close_extras_menu)
\tcolumn.add_child(extras_back_button)


func _open_extras_menu() -> void:
\tSingleton.get_node("SFX/Confirm").play()
\tshow_options = false
\tshow_extras = true
\textras_control.visible = true
\textras_control.modulate.a = 0
\tcall_deferred("_focus_extras_first_button")


func _focus_extras_first_button() -> void:
\tif show_extras and is_instance_valid(extras_first_button):
\t\textras_first_button.grab_focus()


func _close_extras_menu() -> void:
\tif !show_extras:
\t\treturn
\tSingleton.get_node("SFX/Back").play()
\tshow_extras = false
\textras_control.visible = false
\tstory.grab_focus()


func _launch_extra_level(scene: String) -> void:
\tshow_extras = false
\textras_control.visible = false
\t_menu_to_scene(scene)`;

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error(`Missing block while patching ${label}`);
  }
  return text.replace(from, to);
}

function patchMainMenu() {
  let menu = readFileSync(mainMenuPath, "utf8").replace(/\r\n/g, "\n");

  menu = menu.replace(
    /\t\t\t2:\n\t\t\t\t(?:_menu_to_scene\("res:\/\/scenes\/levels\/llr_complete\/llr_complete_1\.tscn"\)|_show_extras_message\(\)|_open_extras_menu\(\))/,
    "\t\t\t2:\n\t\t\t\t_open_extras_menu()"
  );

  if (menu.includes("const LLR_EXTRA_LEVELS = [")) {
    menu = menu.replace(
      /const LLR_EXTRA_LEVELS = \[[\s\S]*?\n\]\n\nvar show_extras = false\nvar extras_control: ColorRect\nvar extras_first_button: Button/,
      extrasDeclarations
    );
  } else {
    menu = replaceOnce(
      menu,
      "@onready var preview_orb = $PreviewOrb\n",
      `@onready var preview_orb = $PreviewOrb\n\n${extrasDeclarations}\n`,
      "Extras declarations"
    );
  }

  const existingMethods = /func _ready\(\) -> void:\n\t_build_extras_menu\(\)[\s\S]*?func _launch_extra_level\(scene: String\) -> void:\n\tshow_extras = false\n\textras_control\.visible = false\n\t_menu_to_scene\(scene\)/;
  if (existingMethods.test(menu)) {
    menu = menu.replace(existingMethods, extrasMethods);
  } else {
    menu = replaceOnce(
      menu,
      "\n\nfunc _cycle_increment(increment_direction: int) -> void:",
      `\n\n${extrasMethods}\n\n\nfunc _cycle_increment(increment_direction: int) -> void:`,
      "Extras methods"
    );
  }

  if (!menu.includes("\t\textras_control.visible = show_extras")) {
    menu = replaceOnce(
      menu,
      "\t\toptions_control.visible = show_options\n\t\toptions_menu.visible = show_options\n",
      "\t\toptions_control.visible = show_options\n\t\toptions_menu.visible = show_options\n\t\textras_control.visible = show_extras\n",
      "Extras visibility"
    );
  }

  if (!menu.includes("\t\telif show_extras:")) {
    menu = replaceOnce(
      menu,
      `\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\tshow_options = false
\t\t\t\tSingleton.get_node("SFX/Back").play()
\t\telse:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):`,
      `\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\tshow_options = false
\t\t\t\tSingleton.get_node("SFX/Back").play()
\t\telif show_extras:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):
\t\t\t\tnode.modulate.a = max(node.modulate.a - 0.125 * dmod, 0)
\t\t\textras_control.modulate.a = min(extras_control.modulate.a + 0.16 * dmod, 1)
\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\t_close_extras_menu()
\t\telse:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):`,
      "Extras process branch"
    );
  }

  menu = menu.replace(
    "func _touch_cycle(step):\n\tif !show_options:",
    "func _touch_cycle(step):\n\tif !show_options and !show_extras:"
  );

  if (!menu.includes("\t\t\t2:\n\t\t\t\t_open_extras_menu()")) {
    throw new Error("Extras menu route was not patched");
  }
  writeFileSync(mainMenuPath, menu, "utf8");
}

for (const stage of stages) {
  buildStage(stage);
}
patchMainMenu();

console.log(`llr Extras patch complete: ${stages.length} original stages, ${segmentCount} segments each, ${levelWidth}px wide`);
