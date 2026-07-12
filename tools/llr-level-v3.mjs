function room(name, form, seconds, mechanics, recovery = false) {
  return { name, form, seconds, mechanics, recovery };
}

export const V3_STAGE_BLUEPRINTS = [
  {
    id: 1,
    title: "1 风车牧场",
    description: "原木、跷跷桥、龟壳跑道与风车枢轴",
    tint: "Color(1, 0.98, 0.9, 1)",
    heights: [220, -40, 300, -200, -620, -80, 300, -280, -620, -40, 140],
    rooms: [
      room("果园热身", "rolling", 19, ["terrain", "goomba", "koopa"]),
      room("倒木溪谷", "creek", 22, ["water", "falling_log", "cheep"], true),
      room("谷仓跷跷桥", "seesaw", 21, ["tipping_log", "terrain"]),
      room("树冠岔路", "fork", 23, ["branch", "cloud", "blue_coin"]),
      room("第一座风车", "wheel", 24, ["pivot", "cloud"], true),
      room("溪流摆渡", "ferry", 23, ["shuttle", "water", "cheep"], true),
      room("龟壳牧场", "corridor", 21, ["koopa", "box", "terrain"]),
      room("风车塔", "tower", 26, ["pivot", "cloud", "mushroom"], true),
      room("暴雨下山", "descent", 23, ["falling_log", "goonie", "terrain"]),
      room("丰收终局", "finale", 29, ["tipping_log", "shuttle", "pivot", "koopa"])
    ]
  },
  {
    id: 2,
    title: "2 潮汐水道",
    description: "游泳、双层渡口、管道暗渠与船闸机关",
    tint: "Color(0.88, 0.97, 1, 1)",
    heights: [240, 360, -160, 280, -420, 120, -560, 300, -260, 260, 100],
    rooms: [
      room("港口码头", "creek", 20, ["water", "cheep", "terrain"], true),
      room("淹没拱廊", "waterway", 24, ["water", "branch", "wood", "cheep"], true),
      room("船闸门厅", "corridor", 22, ["thwomp", "water"]),
      room("双层渡口", "ferry", 25, ["shuttle", "water", "branch"], true),
      room("管道暗渠", "vault", 24, ["pipe", "water", "blue_coin"]),
      room("瀑布升降井", "tower", 27, ["shuttle", "mushroom", "water"], true),
      room("游鱼花园", "waterway", 24, ["cheep", "water", "terrain"], true),
      room("沉没大厅", "vault", 25, ["door", "water", "blue_coin"]),
      room("开闸冲刺", "rolling", 22, ["water", "tipping_log", "terrain"]),
      room("灯塔港终局", "finale", 30, ["shuttle", "thwomp", "water", "cheep"])
    ]
  },
  {
    id: 3,
    title: "3 爆弹拆迁城",
    description: "破箱岔路、龟壳跑道、冲压机与施工吊臂",
    tint: "Color(1, 0.93, 0.84, 1)",
    heights: [220, 80, -460, -120, 260, -420, 180, -360, -620, -60, 100],
    rooms: [
      room("安全培训场", "corridor", 19, ["box", "goomba", "terrain"]),
      room("三层箱屋", "factory", 25, ["box", "branch", "bobomb"]),
      room("爆弹斜坡", "rolling", 22, ["bobomb", "terrain", "box"]),
      room("冲压走廊", "corridor", 24, ["thwomp", "box"]),
      room("龟壳保龄道", "corridor", 23, ["koopa", "box", "branch"]),
      room("拆除竖井", "tower", 27, ["box", "mushroom", "shuttle"], true),
      room("废料传送带", "ferry", 24, ["shuttle", "big_rock", "bobomb"], true),
      room("吊臂工地", "wheel", 26, ["pivot", "tipping_log", "box"], true),
      room("爆破岔路", "fork", 24, ["box", "branch", "cloud", "blue_coin"]),
      room("拆迁终局", "finale", 32, ["thwomp", "rotating", "box", "bobomb"])
    ]
  },
  {
    id: 4,
    title: "4 火箭蘑菇井",
    description: "Rocket FLUDD、蘑菇竖井与旋转菌冠",
    tint: "Color(0.96, 0.9, 1, 1)",
    heights: [260, -520, -180, 280, -620, -180, 320, -600, -180, -560, 80],
    rooms: [
      room("喷嘴广场", "rolling", 20, ["fludd_rocket", "bottle", "terrain"]),
      room("低矮蘑菇阶", "tower", 24, ["mushroom", "goomba"]),
      room("第一发射井", "tower", 27, ["fludd_rocket", "mushroom", "bottle"], true),
      room("空中换层", "clock", 25, ["rotating", "cloud", "fludd_rocket"], true),
      room("门后观景台", "vault", 23, ["door", "blue_coin", "cloud"]),
      room("深井下降", "descent", 24, ["mushroom", "bottle", "falling_log"]),
      room("双发射井", "tower", 29, ["fludd_rocket", "shuttle", "mushroom"], true),
      room("旋转菌冠", "clock", 27, ["rotating", "mushroom", "parakoopa"], true),
      room("云顶补给站", "skyline", 25, ["cloud", "bottle", "parakoopa"], true),
      room("火山口发射", "finale", 34, ["fludd_rocket", "mushroom", "pivot", "bottle"])
    ]
  },
  {
    id: 5,
    title: "5 云端货运站",
    description: "升降台、空中渡轮、吊臂与坠落货物",
    tint: "Color(0.9, 0.95, 1, 1)",
    heights: [240, -420, -500, -180, -620, -220, -620, -260, -560, -120, -240],
    rooms: [
      room("地面货梯", "tower", 25, ["shuttle", "cloud"], true),
      room("双线摆渡", "ferry", 25, ["shuttle", "branch", "cloud"], true),
      room("枢轴吊车", "wheel", 27, ["pivot", "cloud"], true),
      room("坠落货仓", "creek", 24, ["falling_log", "cloud", "box"], true),
      room("高低航线", "fork", 26, ["shuttle", "branch", "blue_coin"], true),
      room("双层升降塔", "tower", 29, ["shuttle", "cloud", "bottle"], true),
      room("云仓库", "factory", 24, ["box", "cloud", "goomba"]),
      room("长途空中渡轮", "ferry", 28, ["shuttle", "cloud", "goonie"], true),
      room("卸货下降", "descent", 25, ["tipping_log", "falling_log", "cloud"], true),
      room("总调度终局", "finale", 35, ["shuttle", "pivot", "falling_log", "cloud"])
    ]
  },
  {
    id: 6,
    title: "6 涡轮海岸公路",
    description: "Turbo FLUDD、长坡踏浪与高速冲压门",
    tint: "Color(1, 0.96, 0.84, 1)",
    heights: [240, 160, 300, 40, -220, 180, 300, -120, -420, 20, 100],
    rooms: [
      room("涡轮试车场", "corridor", 19, ["fludd_turbo", "terrain"]),
      room("沙丘波浪路", "rolling", 22, ["fludd_turbo", "terrain", "goomba"]),
      room("踏浪桥", "waterway", 23, ["fludd_turbo", "water", "branch"], true),
      room("双坡飞跃", "creek", 22, ["fludd_turbo", "water", "blue_coin"], true),
      room("礁石回旋道", "factory", 23, ["big_rock", "box", "branch"]),
      room("渡口减速区", "ferry", 24, ["shuttle", "water"]),
      room("海堤冲压廊", "corridor", 24, ["thwomp", "fludd_turbo"]),
      room("海滩双路线", "fork", 25, ["fludd_turbo", "branch", "cloud"]),
      room("灯塔升降台", "tower", 26, ["shuttle", "cloud", "bottle"], true),
      room("日落公路终局", "finale", 32, ["fludd_turbo", "water", "thwomp", "terrain"])
    ]
  },
  {
    id: 7,
    title: "7 飞鸟迁徙谷",
    description: "多高度航线、空中巴士、鸟巢与回收峡谷",
    tint: "Color(0.92, 1, 0.94, 1)",
    heights: [220, -180, -420, -580, -220, -600, -120, 260, -520, -260, -180],
    rooms: [
      room("起飞草坡", "rolling", 20, ["goonie", "terrain"]),
      room("低空鸟谷", "skyline", 25, ["goonie", "cloud"], true),
      room("飞龟阶梯", "tower", 25, ["parakoopa", "cloud", "mushroom"], true),
      room("空中巴士", "ferry", 27, ["shuttle", "goonie", "cloud"], true),
      room("巢穴双峰", "fork", 25, ["branch", "goonie", "blue_coin"], true),
      room("俯冲峡谷", "descent", 24, ["goonie", "parakoopa", "cloud"], true),
      room("云层回旋", "skyline", 27, ["cloud", "parakoopa"], true),
      room("巨型鸟巢", "wheel", 28, ["pivot", "goonie", "cloud"], true),
      room("迁徙风暴", "clock", 28, ["shuttle", "rotating", "goonie"], true),
      room("群鸟终局", "finale", 35, ["goonie", "parakoopa", "shuttle", "pivot"])
    ]
  },
  {
    id: 8,
    title: "8 钟楼机关城",
    description: "旋转齿轮、冲压厅、摆锤桥与钟面枢轴",
    tint: "Color(0.94, 0.93, 1, 1)",
    heights: [220, -260, -600, -220, -620, -180, -600, -240, -620, -180, -120],
    rooms: [
      room("慢速齿轮课", "clock", 23, ["rotating", "terrain"]),
      room("整点冲压厅", "corridor", 24, ["thwomp", "terrain"]),
      room("分针升降梯", "tower", 27, ["shuttle", "cloud"], true),
      room("摆锤桥", "seesaw", 24, ["tipping_log", "terrain"]),
      room("钟面枢轴", "wheel", 28, ["pivot", "cloud"], true),
      room("幽灵齿轮廊", "clock", 27, ["rotating", "cloud"]),
      room("双钟大厅", "wheel", 29, ["pivot", "branch", "blue_coin"], true),
      room("冲压升降井", "tower", 30, ["thwomp", "shuttle", "cloud"], true),
      room("时针塔顶", "clock", 29, ["rotating", "pivot", "parakoopa"], true),
      room("大钟终局", "finale", 38, ["thwomp", "tipping_log", "rotating", "pivot"])
    ]
  },
  {
    id: 9,
    title: "9 遗迹寻宝环线",
    description: "门、管道、双层水渠与多条奖励支路",
    tint: "Color(0.9, 1, 0.94, 1)",
    heights: [220, 40, 300, -180, -520, 160, -420, -620, -100, -420, 100],
    rooms: [
      room("遗迹门厅", "corridor", 20, ["terrain", "blue_coin"]),
      room("双层水渠", "fork", 25, ["water", "branch", "blue_coin"], true),
      room("门后密室", "vault", 24, ["door", "blue_coin", "cloud"]),
      room("管道金库", "vault", 25, ["pipe", "blue_coin", "mushroom"]),
      room("淹没书库", "waterway", 26, ["water", "shuttle", "cheep"], true),
      room("蘑菇地窖", "tower", 27, ["mushroom", "branch", "blue_coin"], true),
      room("断桥中庭", "ferry", 26, ["shuttle", "tipping_log", "water"], true),
      room("三座藏宝室", "vault", 28, ["door", "pipe", "blue_coin"]),
      room("捷径汇合厅", "factory", 25, ["branch", "box", "cloud"]),
      room("宝库出口", "finale", 35, ["door", "pipe", "shuttle", "blue_coin"])
    ]
  },
  {
    id: 10,
    title: "10 老师城终局",
    description: "拆迁城门、护城水道、机械城墙与王座桥",
    tint: "Color(1, 0.9, 0.9, 1)",
    heights: [220, 80, 300, -180, -620, -220, -560, -100, 280, -520, 100],
    rooms: [
      room("城外庭院", "rolling", 21, ["koopa", "branch", "terrain"]),
      room("拆迁城门", "factory", 25, ["box", "bobomb", "branch"]),
      room("护城水道", "waterway", 26, ["water", "shuttle", "cheep"], true),
      room("城堡货梯", "tower", 29, ["shuttle", "mushroom", "cloud"], true),
      room("火箭露台", "fork", 27, ["fludd_rocket", "cloud", "bottle"], true),
      room("机械城墙", "clock", 29, ["thwomp", "rotating", "terrain"]),
      room("空中围城", "skyline", 30, ["goonie", "parakoopa", "pivot"], true),
      room("地下逃生道", "vault", 28, ["pipe", "box", "water"]),
      room("最终双塔", "tower", 34, ["shuttle", "pivot", "mushroom"], true),
      room("王座桥", "finale", 40, ["tipping_log", "shuttle", "thwomp", "pivot"])
    ]
  }
];

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

export function buildV3StageScene({
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
    const topMin = Math.min(...profile);
    const measuredDepth = depth - topMin;
    if (measuredDepth > 210) depth -= measuredDepth - 210;
    if (depth - topMin < 130 || depth - topMin > 210) {
      throw new Error(`${id}: invalid measured terrain depth ${depth - topMin}`);
    }
    if (width > 900) throw new Error(`${id}: terrain width exceeds 900 (${width})`);
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
    const progress = clamp(t, 0, 1);
    const targetX = surface.x + surface.width * progress;
    for (let index = 1; index < surface.points.length; index += 1) {
      const left = surface.points[index - 1];
      const right = surface.points[index];
      if (targetX > right.x) continue;
      const local = (targetX - left.x) / Math.max(1, right.x - left.x);
      return { x: targetX, y: lerp(left.y, right.y, local) };
    }
    return surface.points.at(-1);
  }

  function surfaceWalk(id, fromT = 0.06, toT = 0.94) {
    const surface = surfaces.get(id);
    const distance = surface.width * Math.abs(toT - fromT);
    const count = Math.max(1, Math.ceil(distance / 180));
    return Array.from({ length: count + 1 }, (_, index) =>
      surfacePoint(id, lerp(fromT, toT, index / count))
    );
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
    const safeY = clamp(y, -730, 700);
    nodes.push(instanceNode(name, parent, resource, {
      position: vector(x, safeY),
      ...properties,
      "metadata/_llr_airborne": "true",
      ...(safeY !== y ? { "metadata/_llr_clamped_from_y": fmt(y) } : {})
    }));
    return { x, y: safeY };
  }

  function sampledLine(start, end, spacing = 175) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const count = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dy) / spacing),
      Math.ceil(dx / 210),
      dy < 0 ? Math.ceil(Math.abs(dy) / 82) : Math.ceil(dy / 165)
    );
    return Array.from({ length: count + 1 }, (_, index) => ({
      x: lerp(start.x, end.x, index / count),
      y: lerp(start.y, end.y, index / count)
    }));
  }

  function sampledPolyline(points, spacing = 175) {
    const route = [];
    for (let index = 1; index < points.length; index += 1) {
      const section = sampledLine(points[index - 1], points[index], spacing);
      route.push(...(route.length ? section.slice(1) : section));
    }
    return route;
  }

  function appendRoute(route, part) {
    if (!part.length) return route;
    if (!route.length) {
      route.push(...part);
      return route;
    }
    const previous = route.at(-1);
    const first = part[0];
    const start = Math.hypot(previous.x - first.x, previous.y - first.y) < 0.1 ? 1 : 0;
    route.push(...part.slice(start));
    return route;
  }

  function routeRecord(ctx, route, kind) {
    routeSerial += 1;
    nodes.push(`${plainNode(`LLRRoute${String(routeSerial).padStart(3, "0")}`, "Node", "Route").trimEnd()}
metadata/_llr_room = ${ctx.index + 1}
metadata/_llr_kind = ${JSON.stringify(kind)}
metadata/_llr_set_piece = ${JSON.stringify(ctx.spec.name)}
metadata/_llr_points = ${packed(route.map((point) => [point.x, point.y]))}
`);
  }

  function validateRoute(ctx, route, kind = "main") {
    if (route.length < 2) throw new Error(`${stage.id}/${ctx.spec.name}: empty ${kind} route`);
    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (dx <= 0 || dx > 235 || dy < -95 || dy > 190) {
        throw new Error(`${stage.id}/${ctx.spec.name}: unreachable ${kind} step dx=${fmt(dx)} dy=${fmt(dy)}`);
      }
    }
    routeRecord(ctx, route, kind);
    if (kind === "main") mainEstimatedSeconds += ctx.spec.seconds;
    else if (kind === "recovery") recoveryEstimatedSeconds += Math.max(12, route.length * 0.7);
  }

  function roomMarker(ctx) {
    const act = ctx.index < 3 ? 1 : ctx.index < 7 ? 2 : 3;
    nodes.push(`${plainNode(`LLRSegment${String(ctx.index + 1).padStart(2, "0")}_${ctx.spec.form}`, "Node2D").trimEnd()}
position = ${vector(ctx.x, ctx.entryY)}
metadata/_llr_entry_y = ${fmt(ctx.entryY)}
metadata/_llr_exit_y = ${fmt(ctx.exitY)}
metadata/_llr_geometry_version = 3
metadata/_llr_act = ${act}
metadata/_llr_set_piece = ${JSON.stringify(ctx.spec.name)}
metadata/_llr_mechanics = ${JSON.stringify(ctx.spec.mechanics.join(","))}
metadata/_llr_target_seconds = ${fmt(ctx.spec.seconds)}
`);
  }

  function boundaries(ctx) {
    const start = addTerrain(`S${ctx.index + 1}Start`, ctx.x - 16, ctx.entryY, 300, [0, 0, 0, 0], 168);
    const end = addTerrain(`S${ctx.index + 1}End`, ctx.x + 2916, ctx.exitY, 300, [0, 0, 0, 0], 176);
    return {
      start,
      end,
      startPoint: { x: ctx.x + 250, y: ctx.entryY },
      endPoint: { x: ctx.x + 2950, y: ctx.exitY }
    };
  }

  function addPlatformPoint(prefix, serial, kind, point, properties = {}) {
    const name = `${prefix}${serial}`;
    if (kind === "fungus") {
      const stemDepth = properties.stemDepth || 170;
      nodes.push(instanceNode(name, "Items/Platforms", "fungus", {
        position: vector(point.x, point.y + 10),
        points: packed([[-6, -3], [-8, stemDepth * 0.34], [6, stemDepth * 0.68], [0, stemDepth]])
      }));
      return;
    }
    const yOffset = kind === "cloud" ? 8 : kind === "tippingLog" ? 8 : kind === "shuttle" ? 7 : 7;
    const base = { position: vector(point.x, point.y + yOffset) };
    if (kind === "cloud") base.width = fmt(properties.width || 4);
    if (kind === "tippingLog") {
      base.width = fmt(properties.width || 5);
      base.pivot_offset = fmt(properties.pivotOffset || 0);
    }
    if (kind === "fallingLog") {
      base.wait_time = fmt(properties.waitTime || 72);
      base.lifetime = fmt(properties.lifetime || 90);
    }
    if (kind === "shuttle") {
      base.travel = vector(properties.travel?.x || 0, properties.travel?.y || 0);
      base.travel_seconds = fmt(properties.travelSeconds || 2.6);
      base.pause_seconds = fmt(properties.pauseSeconds ?? 0.35);
      base.phase = fmt(properties.phase || 0);
    }
    nodes.push(instanceNode(name, "Items/Mechanisms", kind, base));
  }

  function platformTrail(prefix, start, end, kinds = ["cloud"], options = {}) {
    const route = sampledLine(start, end, options.spacing || 168);
    for (let index = 1; index < route.length - 1; index += 1) {
      const kind = kinds[(index - 1) % kinds.length];
      addPlatformPoint(prefix, index, kind, route[index], {
        width: options.width || (kind === "cloud" ? 4 : undefined),
        stemDepth: options.stemDepth,
        waitTime: 74 + (index % 3) * 10
      });
    }
    return route;
  }

  function directReachable(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return dx > 0 && dx <= 220 && dy >= -88 && dy <= 175;
  }

  function connectPoints(ctx, prefix, start, end, style = "auto", serial = 0) {
    if (style === "tipping" && end.x - start.x <= 440) {
      const point = { x: (start.x + end.x) / 2, y: lerp(start.y, end.y, 0.5) };
      const route = sampledPolyline([start, point, end], 150);
      const centerIndex = Math.floor(route.length / 2);
      for (let index = 1; index < route.length - 1; index += 1) {
        if (index === centerIndex) {
          addPlatformPoint(`${prefix}Tipping`, serial, "tippingLog", route[index], {
            width: 6,
            pivotOffset: serial % 2 ? 1 : -1
          });
        } else {
          addPlatformPoint(`${prefix}TippingSafety${serial}_`, index, "cloud", route[index], { width: 4 });
        }
      }
      return route;
    }
    if (style === "pivot" && end.x - start.x <= 540) {
      const gap = end.x - start.x;
      const center = {
        x: (start.x + end.x) / 2,
        y: lerp(start.y, end.y, 0.5) + 7
      };
      const radius = clamp(gap / 2 - 72, 68, 112);
      airborne(`${prefix}Pivot${serial}`, "Items/Mechanisms", "pivot", center.x, center.y, {
        radius: fmt(radius),
        count: "4",
        speed: fmt(6.2 + ((stage.id + serial) % 4) * 0.55),
        offset: fmt((serial % 4) * 0.32)
      });
      return sampledPolyline([
        start,
        { x: center.x - radius, y: lerp(start.y, end.y, 0.35) },
        { x: center.x, y: lerp(start.y, end.y, 0.5) },
        { x: center.x + radius, y: lerp(start.y, end.y, 0.65) },
        end
      ], 155);
    }
    if (style === "rotating" && end.x - start.x <= 540) {
      const route = sampledLine(start, end, 145);
      for (let index = 1; index < route.length - 1; index += 1) {
        const point = route[index];
        const size = 76 + (index % 2) * 8;
        airborne(`${prefix}RouteRotor${serial}_${index}`, "Items/Mechanisms", "rotating", point.x, point.y + size / 2, {
          size: vector(size, size),
          speed: fmt((index % 2 ? -1 : 1) * (0.7 + stage.id * 0.035)),
          wait: fmt(82 - Math.min(index, 3) * 8),
          time_offset: fmt(index * 20),
          type: fmt(index % 3 === 0 ? 2 : 1)
        });
      }
      return route;
    }
    if (style === "shuttle") {
      const gap = end.x - start.x;
      const from = { x: start.x + Math.min(86, gap * 0.22), y: start.y };
      const to = { x: end.x - Math.min(86, gap * 0.22), y: end.y };
      addPlatformPoint(`${prefix}Shuttle`, serial, "shuttle", from, {
        travel: { x: to.x - from.x, y: to.y - from.y },
        travelSeconds: 2.4 + (ctx.index % 3) * 0.35,
        phase: (serial % 3) / 3
      });
      return sampledPolyline([start, from, to, end], 170);
    }
    if (directReachable(start, end) && style !== "cloud" && style !== "wood" && style !== "fungus") {
      return [start, end];
    }
    const kinds = style === "wood"
      ? ["wood", "cloud"]
      : style === "fungus"
        ? ["fungus", "cloud"]
        : style === "falling"
          ? ["fallingLog", "cloud"]
          : ["cloud"];
    return platformTrail(`${prefix}Bridge${serial}_`, start, end, kinds, { width: style === "cloud" ? 5 : 4 });
  }

  function landSequence(ctx, specs, connectorStyles = []) {
    const route = [ctx.edge.startPoint];
    const surfaceIds = [];
    let previous = ctx.edge.startPoint;
    specs.forEach((spec, index) => {
      const y = clamp(
        lerp(ctx.entryY, ctx.exitY, spec.progress) + (spec.offset || 0),
        -690,
        620
      );
      const id = addTerrain(
        `S${ctx.index + 1}${ctx.spec.form}Land${index + 1}`,
        ctx.x + spec.dx,
        y,
        spec.width,
        spec.profile || [0, -18, 12, 0],
        spec.depth || 166 + (index % 3) * 6
      );
      surfaceIds.push(id);
      const walk = surfaceWalk(id);
      appendRoute(route, connectPoints(ctx, `S${ctx.index + 1}${ctx.spec.form}`, previous, walk[0], connectorStyles[index] || "auto", index + 1));
      appendRoute(route, walk);
      previous = walk.at(-1);
    });
    appendRoute(route, connectPoints(
      ctx,
      `S${ctx.index + 1}${ctx.spec.form}`,
      previous,
      ctx.edge.endPoint,
      connectorStyles[specs.length] || "auto",
      specs.length + 1
    ));
    return { route, surfaceIds, waterRegions: [] };
  }

  function addWater(ctx, name, x, y, width, height = 340) {
    nodes.push(instanceNode(name, "Water", "water", {
      position: vector(x, y),
      polygon: packed([[0, 0], [width, 0], [width, height], [0, height]])
    }));
    return { x0: x, x1: x + width, y0: y, y1: y + height };
  }

  function addThemedRecovery(ctx, style = "islands") {
    const lowY = 570 + ((stage.id + ctx.index) % 3) * 28;
    const route = [];
    let bottleSurface;

    if (style === "water") {
      const shoreA = addTerrain(`S${ctx.index + 1}RecoveryShoreA`, ctx.x + 360, lowY, 620, [0, -12, 12, 0], 180);
      const shoreB = addTerrain(`S${ctx.index + 1}RecoveryShoreB`, ctx.x + 2290, lowY - 34, 520, [0, 14, -8, 0], 178);
      const walkA = surfaceWalk(shoreA);
      const walkB = surfaceWalk(shoreB);
      appendRoute(route, walkA);
      appendRoute(route, sampledPolyline([
        route.at(-1),
        { x: ctx.x + 1200, y: lowY + 42 },
        { x: ctx.x + 1760, y: lowY + 82 },
        { x: ctx.x + 2230, y: lowY + 18 },
        walkB[0]
      ], 155));
      appendRoute(route, walkB);
      addWater(ctx, `S${ctx.index + 1}RecoveryWater`, ctx.x + 930, lowY - 62, 1420, 210);
      bottleSurface = shoreB;
    } else if (style === "mushroom") {
      const groveA = addTerrain(`S${ctx.index + 1}RecoveryGroveA`, ctx.x + 430, lowY, 760, [0, 18, -12, 0], 184);
      const groveB = addTerrain(`S${ctx.index + 1}RecoveryGroveB`, ctx.x + 1510, lowY - 82, 590, [0, -16, 10, 0], 178);
      const walkA = surfaceWalk(groveA);
      const walkB = surfaceWalk(groveB);
      appendRoute(route, walkA);
      appendRoute(route, connectPoints(ctx, `S${ctx.index + 1}RecoveryGrove`, route.at(-1), walkB[0], "fungus", 1));
      appendRoute(route, walkB);
      bottleSurface = groveB;
    } else if (style === "repair") {
      const specs = [
        { dx: 330, y: lowY, width: 520, profile: [0, -8, 0] },
        { dx: 1020, y: lowY - 58, width: 500, profile: [0, 12, -8, 0] },
        { dx: 1690, y: lowY + 24, width: 500, profile: [0, -14, 10, 0] },
        { dx: 2380, y: lowY - 72, width: 300, profile: [0, -8, 0] }
      ];
      const ids = specs.map((spec, index) => addTerrain(
        `S${ctx.index + 1}RecoveryRepair${index + 1}`,
        ctx.x + spec.dx,
        spec.y,
        spec.width,
        spec.profile,
        176 + (index % 2) * 6
      ));
      ids.forEach((id, index) => {
        const walk = surfaceWalk(id);
        if (route.length) {
          appendRoute(route, connectPoints(ctx, `S${ctx.index + 1}RecoveryRepair`, route.at(-1), walk[0], "wood", index));
        }
        appendRoute(route, walk);
      });
      grounded(`S${ctx.index + 1}RecoveryBox`, "Items/Platforms", "box", ids[1], 0.58, -34);
      bottleSurface = ids[2];
    } else {
      const shift = ((stage.id + ctx.index) % 3) * 70;
      const a = addTerrain(`S${ctx.index + 1}RecoveryIslandA`, ctx.x + 330 + shift, lowY, 610, [0, -18, 14, 0], 180);
      const b = addTerrain(`S${ctx.index + 1}RecoveryIslandB`, ctx.x + 1190, lowY - 72, 570, [0, 16, -12, 0], 186);
      const c = addTerrain(`S${ctx.index + 1}RecoveryIslandC`, ctx.x + 2030 - shift, lowY + 18, 610, [0, -14, 18, 0], 178);
      const ids = [a, b, c];
      ids.forEach((id, index) => {
        const walk = surfaceWalk(id);
        if (route.length) {
          appendRoute(route, connectPoints(ctx, `S${ctx.index + 1}RecoveryIsland`, route.at(-1), walk[0], "cloud", index));
        }
        appendRoute(route, walk);
      });
      bottleSurface = b;
    }

    appendRoute(route, platformTrail(
      `S${ctx.index + 1}RecoveryClimb_`,
      route.at(-1),
      ctx.edge.endPoint,
      style === "mushroom" ? ["fungus", "cloud"] : style === "repair" ? ["wood", "cloud"] : ["cloud"],
      { spacing: 155, width: 5, stemDepth: 150 }
    ));
    grounded(`S${ctx.index + 1}RecoveryBottle`, "Items/Pickups", "bottle", bottleSurface, 0.55, -30);
    validateRoute(ctx, route, "recovery");
  }

  function addGuideCoins(prefix, route, limit = 7) {
    const indexes = route
      .map((_, index) => index)
      .filter((index) => index > 0 && index < route.length - 1 && index % Math.max(2, Math.floor(route.length / limit)) === 0)
      .slice(0, limit);
    indexes.forEach((routeIndex, index) => {
      const point = route[routeIndex];
      airborne(`${prefix}Coin${index + 1}`, "Items/Coins", "coin", point.x, point.y - 48);
    });
  }

  function addBonusBranch(ctx, result, kind = "cloud") {
    const start = result.route[Math.floor(result.route.length * 0.23)];
    const end = result.route[Math.floor(result.route.length * 0.77)];
    const lift = 150 + ((stage.id + ctx.index) % 3) * 34;
    const middle = {
      x: (start.x + end.x) / 2,
      y: clamp(Math.min(start.y, end.y) - lift, -700, 500)
    };
    const branch = sampledPolyline([start, middle, end], 160);
    for (let index = 1; index < branch.length - 1; index += 1) {
      const resource = kind === "wood" && index % 3 ? "wood" : "cloud";
      addPlatformPoint(`S${ctx.index + 1}Bonus`, index, resource, branch[index], { width: 5 });
    }
    addGuideCoins(`S${ctx.index + 1}Bonus`, branch, 5);
    const prize = branch[Math.floor(branch.length / 2)];
    airborne(`S${ctx.index + 1}BonusBlueCoin`, "Items/Pickups", "blueCoin", prize.x, prize.y - 58);
    routeRecord(ctx, branch, "bonus");
  }

  function addWarpBranch(ctx, result, type) {
    const sourceId = result.surfaceIds[0] || ctx.edge.start;
    const chamberY = clamp(Math.min(ctx.entryY, ctx.exitY) - 230, -690, 430);
    const chamber = addTerrain(
      `S${ctx.index + 1}${type}Chamber`,
      ctx.x + 1690,
      chamberY,
      580,
      [0, -18, 12, 0],
      168
    );
    const source = surfacePoint(sourceId, 0.7);
    const target = surfacePoint(chamber, 0.18);
    const resource = type === "pipe" ? "pipe" : "door";
    nodes.push(instanceNode(`S${ctx.index + 1}${type}Entrance`, "Items/Mechanisms", resource, {
      position: vector(source.x, source.y + (type === "pipe" ? -16 : 0)),
      target_pos: vector(target.x + 44, target.y - 58)
    }));
    airborne(`S${ctx.index + 1}${type}Prize`, "Items/Pickups", "blueCoin", ctx.x + 1990, chamberY - 62);
    airborne(`S${ctx.index + 1}${type}Arrow`, "Items/Decoration", "arrow", source.x + 26, source.y - 62, {
      rotation: type === "pipe" ? "1.5708" : "0"
    });
  }

  function buildRolling(ctx) {
    return landSequence(ctx, [
      { dx: 500, width: 610, progress: 0.22, offset: -54, profile: [0, -42, -18, 16, 0] },
      { dx: 1320, width: 650, progress: 0.5, offset: 46, profile: [0, 22, -28, 14, 0] },
      { dx: 2180, width: 570, progress: 0.78, offset: -34, profile: [0, -34, 20, 0] }
    ]);
  }

  function buildCreek(ctx) {
    const waterTop = clamp(Math.max(ctx.entryY, ctx.exitY) + 85, 300, 470);
    const result = landSequence(ctx, [
      { dx: 500, width: 540, progress: 0.2, offset: -70, profile: [0, -24, 10, 0] },
      { dx: 1270, width: 590, progress: 0.5, offset: 58, profile: [0, 14, -18, 0] },
      { dx: 2090, width: 620, progress: 0.78, offset: -52, profile: [0, -20, 18, 0] }
    ], ["auto", "tipping", "auto", "auto"]);
    result.waterRegions.push(addWater(ctx, `S${ctx.index + 1}CreekWater`, ctx.x + 300, waterTop, 2600, 270));
    if (ctx.spec.mechanics.includes("falling_log")) {
      const p1 = result.route[Math.floor(result.route.length * 0.34)];
      const p2 = result.route[Math.floor(result.route.length * 0.67)];
      addPlatformPoint(`S${ctx.index + 1}FallingLog`, 1, "fallingLog", { x: p1.x + 28, y: p1.y - 70 }, { waitTime: 82 });
      addPlatformPoint(`S${ctx.index + 1}FallingLog`, 2, "fallingLog", { x: p2.x - 24, y: p2.y - 62 }, { waitTime: 70 });
    }
    return result;
  }

  function buildSeesaw(ctx) {
    return landSequence(ctx, [
      { dx: 470, width: 470, progress: 0.18, offset: -30, profile: [0, -12, 0] },
      { dx: 1150, width: 500, progress: 0.43, offset: 38, profile: [0, 14, -8, 0] },
      { dx: 1870, width: 470, progress: 0.68, offset: -42, profile: [0, -16, 10, 0] },
      { dx: 2550, width: 330, progress: 0.88, offset: 18, profile: [0, 8, 0] }
    ], ["tipping", "tipping", "tipping", "tipping", "auto"]);
  }

  function buildFork(ctx) {
    const result = landSequence(ctx, [
      { dx: 480, width: 700, progress: 0.24, offset: 72, profile: [0, 22, -12, 0] },
      { dx: 1390, width: 680, progress: 0.52, offset: 96, profile: [0, 18, 28, -8, 0] },
      { dx: 2280, width: 500, progress: 0.82, offset: 52, profile: [0, -12, 0] }
    ]);
    addBonusBranch(ctx, result, ctx.spec.mechanics.includes("box") ? "wood" : "cloud");
    if (ctx.spec.mechanics.includes("door")) addWarpBranch(ctx, result, "door");
    if (ctx.spec.mechanics.includes("pipe")) addWarpBranch(ctx, result, "pipe");
    return result;
  }

  function buildWheel(ctx) {
    const result = landSequence(ctx, [
      { dx: 480, width: 650, progress: 0.22, offset: 20, profile: [0, -22, 12, 0] },
      { dx: 1440, width: 430, progress: 0.52, offset: -90, profile: [0, -8, 0] },
      { dx: 2180, width: 590, progress: 0.78, offset: 36, profile: [0, 18, -14, 0] }
    ], ["auto", "pivot", ctx.spec.mechanics.includes("tipping_log") ? "tipping" : "pivot", "auto"]);
    return result;
  }

  function buildFerry(ctx) {
    const waterTop = clamp(Math.max(ctx.entryY, ctx.exitY) + 100, 320, 480);
    const result = landSequence(ctx, [
      { dx: 650, width: 450, progress: 0.25, offset: -50, profile: [0, -10, 0] },
      { dx: 1400, width: 430, progress: 0.5, offset: 52, profile: [0, 12, -8, 0] },
      { dx: 2150, width: 450, progress: 0.75, offset: -46, profile: [0, -12, 0] }
    ], ["shuttle", "shuttle", "shuttle", "shuttle"]);
    result.waterRegions.push(addWater(ctx, `S${ctx.index + 1}FerryWater`, ctx.x + 300, waterTop, 2600, 290));
    const swim = sampledPolyline([
      { x: ctx.x + 360, y: waterTop + 82 },
      { x: ctx.x + 1500, y: waterTop + 132 },
      { x: ctx.x + 2770, y: waterTop + 70 },
      ctx.edge.endPoint
    ], 165);
    routeRecord(ctx, swim, "bonus");
    return result;
  }

  function buildCorridor(ctx) {
    return landSequence(ctx, [
      { dx: 320, width: 860, progress: 0.18, offset: 18, profile: [0, -18, 10, -6, 0] },
      { dx: 1160, width: 860, progress: 0.48, offset: -26, profile: [0, 8, -20, 14, 0] },
      { dx: 2000, width: 860, progress: 0.78, offset: 16, profile: [0, -12, 18, -8, 0] }
    ]);
  }

  function buildTower(ctx) {
    const lift = ctx.exitY < ctx.entryY ? -78 : 62;
    const result = landSequence(ctx, [
      { dx: 670, width: 480, progress: 0.3, offset: lift, profile: [0, -8, 0] },
      { dx: 1570, width: 500, progress: 0.6, offset: -lift * 0.55, profile: [0, 10, -8, 0] },
      { dx: 2410, width: 390, progress: 0.84, offset: lift * 0.35, profile: [0, -10, 0] }
    ], ["fungus", "fungus", "fungus", "fungus"]);
    if (ctx.spec.mechanics.includes("shuttle")) {
      const middle = result.route[Math.floor(result.route.length / 2)];
      addPlatformPoint(`S${ctx.index + 1}TowerLift`, 1, "shuttle", { x: middle.x - 70, y: middle.y + 110 }, {
        travel: { x: 90, y: -230 },
        travelSeconds: 3.2,
        phase: (ctx.index % 3) / 3
      });
      addPlatformPoint(`S${ctx.index + 1}TowerLift`, 2, "shuttle", { x: middle.x + 210, y: middle.y - 120 }, {
        travel: { x: 70, y: 230 },
        travelSeconds: 3.5,
        phase: ((ctx.index + 1) % 3) / 3
      });
    }
    if (ctx.spec.mechanics.includes("pivot")) {
      const point = result.route[Math.floor(result.route.length * 0.68)];
      airborne(`S${ctx.index + 1}TowerPivot`, "Items/Mechanisms", "pivot", point.x, point.y - 105, {
        radius: "72",
        count: "3",
        speed: "7.5",
        offset: "0.4"
      });
    }
    return result;
  }

  function buildDescent(ctx) {
    return landSequence(ctx, [
      { dx: 450, width: 420, progress: 0.14, offset: -68, profile: [0, -8, 0] },
      { dx: 1050, width: 430, progress: 0.36, offset: 92, profile: [0, 12, -6, 0] },
      { dx: 1660, width: 430, progress: 0.58, offset: -72, profile: [0, -10, 0] },
      { dx: 2260, width: 500, progress: 0.8, offset: 76, profile: [0, 14, -8, 0] }
    ], ["falling", "wood", "falling", "wood", "auto"]);
  }

  function buildWaterway(ctx) {
    const waterTop = clamp(Math.max(ctx.entryY, ctx.exitY) + 80, 280, 450);
    const floorA = addTerrain(`S${ctx.index + 1}WaterFloorA`, ctx.x + 520, waterTop + 155, 780, [0, 20, -12, 0], 178);
    const floorB = addTerrain(`S${ctx.index + 1}WaterFloorB`, ctx.x + 1500, waterTop + 190, 760, [0, -14, 16, 0], 184);
    const floorC = addTerrain(`S${ctx.index + 1}WaterFloorC`, ctx.x + 2460, waterTop + 130, 390, [0, -10, 0], 170);
    const region = addWater(ctx, `S${ctx.index + 1}Waterway`, ctx.x + 300, waterTop, 2600, 340);
    const route = sampledPolyline([
      ctx.edge.startPoint,
      { x: ctx.x + 640, y: waterTop + 82 },
      { x: ctx.x + 1550, y: waterTop + 150 },
      { x: ctx.x + 2480, y: waterTop + 92 },
      ctx.edge.endPoint
    ], 155);
    const result = { route, surfaceIds: [floorA, floorB, floorC], waterRegions: [region] };
    addBonusBranch(ctx, result, "wood");
    return result;
  }

  function buildFactory(ctx) {
    const result = landSequence(ctx, [
      { dx: 470, width: 620, progress: 0.2, offset: 92, profile: [0, 8, -12, 0] },
      { dx: 1260, width: 540, progress: 0.43, offset: -118, profile: [0, -12, 0] },
      { dx: 1970, width: 520, progress: 0.68, offset: 104, profile: [0, 10, -8, 0] },
      { dx: 2630, width: 250, progress: 0.9, offset: -24, profile: [0, 0, 0] }
    ], ["wood", "wood", "wood", "wood", "auto"]);
    addBonusBranch(ctx, result, "wood");
    return result;
  }

  function buildSkyline(ctx) {
    const result = landSequence(ctx, [
      { dx: 920, width: 350, progress: 0.34, offset: -118, profile: [0, -8, 0] },
      { dx: 2100, width: 360, progress: 0.72, offset: 92, profile: [0, 10, -8, 0] }
    ], ctx.spec.mechanics.includes("shuttle")
      ? ["cloud", "shuttle", "cloud"]
      : ["cloud", "cloud", "cloud"]);
    if (ctx.spec.mechanics.includes("shuttle")) {
      const point = result.route[Math.floor(result.route.length * 0.48)];
      addPlatformPoint(`S${ctx.index + 1}AirBus`, 1, "shuttle", { x: point.x - 130, y: point.y - 80 }, {
        travel: { x: 260, y: 34 },
        travelSeconds: 3.4,
        phase: 0.4
      });
    }
    return result;
  }

  function buildClock(ctx) {
    const result = landSequence(ctx, [
      { dx: 470, width: 570, progress: 0.2, offset: 22, profile: [0, -10, 0] },
      { dx: 1280, width: 470, progress: 0.45, offset: -82, profile: [0, -8, 0] },
      { dx: 1990, width: 470, progress: 0.7, offset: 76, profile: [0, 10, -8, 0] },
      { dx: 2680, width: 190, progress: 0.92, offset: -16, profile: [0, 0, 0] }
    ], ["rotating", "rotating", "rotating", "rotating", "auto"]);
    if (ctx.spec.mechanics.includes("pivot")) {
      const point = result.route[Math.floor(result.route.length * 0.63)];
      airborne(`S${ctx.index + 1}ClockPivot`, "Items/Mechanisms", "pivot", point.x + 50, point.y - 155, {
        radius: "86",
        count: "4",
        speed: "6.8",
        offset: "0.2"
      });
    }
    return result;
  }

  function buildVault(ctx) {
    const result = landSequence(ctx, [
      { dx: 480, width: 700, progress: 0.24, offset: 40, profile: [0, -18, 12, 0] },
      { dx: 1420, width: 620, progress: 0.56, offset: -54, profile: [0, -14, 18, 0] },
      { dx: 2280, width: 520, progress: 0.82, offset: 34, profile: [0, 12, -8, 0] }
    ]);
    const type = ctx.spec.mechanics.includes("pipe") ? "pipe" : "door";
    addWarpBranch(ctx, result, type);
    if (ctx.spec.mechanics.includes("water")) {
      const y = clamp(Math.max(ctx.entryY, ctx.exitY) + 120, 330, 500);
      result.waterRegions.push(addWater(ctx, `S${ctx.index + 1}VaultWater`, ctx.x + 1050, y, 1500, 220));
    }
    return result;
  }

  function buildFinale(ctx) {
    const styles = [
      ctx.spec.mechanics.includes("tipping_log") ? "tipping" : "auto",
      ctx.spec.mechanics.includes("shuttle") ? "shuttle" : "cloud",
      ctx.spec.mechanics.includes("pivot")
        ? "pivot"
        : ctx.spec.mechanics.includes("rotating")
          ? "rotating"
          : ctx.spec.mechanics.includes("mushroom")
            ? "fungus"
            : "cloud",
      "auto"
    ];
    const result = landSequence(ctx, [
      { dx: 430, width: 520, progress: 0.16, offset: -30, profile: [0, -16, 8, 0] },
      { dx: 1130, width: 520, progress: 0.4, offset: 92, profile: [0, 12, -18, 0] },
      { dx: 1840, width: 520, progress: 0.65, offset: -108, profile: [0, -14, 12, 0] },
      { dx: 2540, width: 330, progress: 0.88, offset: 42, profile: [0, 8, 0] }
    ], styles);
    if (ctx.spec.mechanics.includes("water")) {
      const y = clamp(Math.max(ctx.entryY, ctx.exitY) + 110, 340, 490);
      result.waterRegions.push(addWater(ctx, `S${ctx.index + 1}FinalWater`, ctx.x + 820, y, 1700, 240));
    }
    return result;
  }

  const formBuilders = {
    rolling: buildRolling,
    creek: buildCreek,
    seesaw: buildSeesaw,
    fork: buildFork,
    wheel: buildWheel,
    ferry: buildFerry,
    corridor: buildCorridor,
    tower: buildTower,
    descent: buildDescent,
    waterway: buildWaterway,
    factory: buildFactory,
    skyline: buildSkyline,
    clock: buildClock,
    vault: buildVault,
    finale: buildFinale
  };

  function pickSurface(result, index) {
    return result.surfaceIds[index % Math.max(1, result.surfaceIds.length)] || null;
  }

  function decorateRoom(ctx, result) {
    const mechanics = new Set(ctx.spec.mechanics);
    const first = pickSurface(result, 0) || ctx.edge.start;
    const middle = pickSurface(result, 1) || first;
    const last = pickSurface(result, 2) || middle;

    if (mechanics.has("goomba")) {
      grounded(`S${ctx.index + 1}Goomba1`, "Items/Enemies", "goomba", first, 0.42, -12);
      grounded(`S${ctx.index + 1}Goomba2`, "Items/Enemies", "goomba", last, 0.64, -12);
    }
    if (mechanics.has("koopa")) {
      grounded(`S${ctx.index + 1}Koopa`, "Items/Enemies", "koopa", middle, 0.45, -18, {
        color: fmt((stage.id + ctx.index) % 2)
      });
    }
    if (mechanics.has("bobomb")) {
      grounded(`S${ctx.index + 1}Bobomb1`, "Items/Enemies", "bobomb", first, 0.64, -10);
      grounded(`S${ctx.index + 1}Bobomb2`, "Items/Enemies", "bobomb", last, 0.34, -10);
    }
    if (mechanics.has("box")) {
      [0.36, 0.52, 0.68].forEach((t, index) => {
        grounded(`S${ctx.index + 1}Box${index + 1}`, "Items/Platforms", "box", middle, t, -34, {
          coin_count: fmt(index === 1 ? 3 : 1)
        });
      });
    }
    if (mechanics.has("big_rock")) {
      grounded(`S${ctx.index + 1}BigRock`, "Items/Platforms", "bigRock", middle, 0.56, -32);
    }
    if (mechanics.has("thwomp")) {
      [0.3, 0.7].forEach((progress, index) => {
        const point = result.route[Math.floor(result.route.length * progress)];
        airborne(`S${ctx.index + 1}Thwomp${index + 1}`, "Items/Mechanisms", index ? "thwump" : "thwomp", point.x, point.y - 185 - index * 24, {
          attack_delay: fmt(0.28 + index * 0.12),
          ground_wait: fmt(0.62 + index * 0.12),
          always_attack_initial_delay: fmt(index * 0.55)
        });
      });
    }
    if (mechanics.has("fludd_rocket")) {
      grounded(`S${ctx.index + 1}FluddRocket`, "Items/Pickups", "fluddRocket", first, 0.36, -30);
    }
    if (mechanics.has("fludd_turbo")) {
      grounded(`S${ctx.index + 1}FluddTurbo`, "Items/Pickups", "fluddTurbo", first, 0.36, -30);
    }
    if (mechanics.has("bottle")) {
      grounded(`S${ctx.index + 1}Bottle`, "Items/Pickups", "bottle", last, 0.52, -30);
    }
    if (mechanics.has("goonie")) {
      [0.32, 0.62, 0.82].forEach((progress, index) => {
        const point = result.route[Math.floor(result.route.length * progress)];
        airborne(`S${ctx.index + 1}Goonie${index + 1}`, "Items/Enemies", "goonie", point.x + 36, point.y - 135 - (index % 2) * 45);
      });
    }
    if (mechanics.has("parakoopa")) {
      [0.4, 0.72].forEach((progress, index) => {
        const point = result.route[Math.floor(result.route.length * progress)];
        airborne(`S${ctx.index + 1}Parakoopa${index + 1}`, "Items/Enemies", "parakoopa", point.x, point.y - 125 - index * 50);
      });
    }
    if (mechanics.has("cheep") && result.waterRegions.length) {
      const region = result.waterRegions[0];
      [0.34, 0.68].forEach((progress, index) => {
        airborne(`S${ctx.index + 1}Cheep${index + 1}`, "Items/Enemies", "cheep", lerp(region.x0, region.x1, progress), lerp(region.y0, region.y1, 0.48 + index * 0.12), {
          "metadata/_llr_waterborne": "true"
        });
      });
    }
    if (mechanics.has("rotating") && ctx.spec.form !== "clock") {
      const point = result.route[Math.floor(result.route.length * 0.56)];
      airborne(`S${ctx.index + 1}RotatingGate`, "Items/Mechanisms", "rotating", point.x, point.y - 110, {
        size: vector(82, 82),
        speed: fmt(stage.id % 2 ? 0.9 : -0.9),
        wait: "72",
        type: "1"
      });
    }
    if (mechanics.has("tipping_log") && !["seesaw", "finale"].includes(ctx.spec.form)) {
      const point = result.route[Math.floor(result.route.length * 0.7)];
      addPlatformPoint(`S${ctx.index + 1}OptionalSeesaw`, 1, "tippingLog", {
        x: point.x,
        y: point.y - 66
      }, {
        width: 5,
        pivotOffset: (stage.id + ctx.index) % 2 ? 1 : -1
      });
    }

    if (ctx.index % 2 === 0 && first) {
      grounded(`S${ctx.index + 1}Flowers`, "Items/Decoration", "flowers", first, 0.2, -10);
    }
    if ((ctx.index + stage.id) % 3 === 0 && last) {
      grounded(`S${ctx.index + 1}SmallTree`, "Items/Decoration", "smallTree", last, 0.8, -38);
    }
    addGuideCoins(`S${ctx.index + 1}Main`, result.route, 6);
  }

  function buildRoom(index) {
    const spec = stage.rooms[index];
    const ctx = {
      index,
      spec,
      x: index * segmentWidth,
      entryY: stage.heights[index],
      exitY: stage.heights[index + 1]
    };
    roomMarker(ctx);
    ctx.edge = boundaries(ctx);
    const builder = formBuilders[spec.form];
    if (!builder) throw new Error(`Unknown V3 room form: ${spec.form}`);
    const result = builder(ctx);
    validateRoute(ctx, result.route, "main");
    decorateRoom(ctx, result);
    if (spec.recovery) {
      const recoveryPalettes = {
        1: ["islands", "water", "mushroom", "repair"],
        2: ["water", "islands", "mushroom"],
        3: ["repair", "islands", "mushroom"],
        4: ["mushroom", "islands", "repair"],
        5: ["islands", "mushroom", "repair"],
        6: ["water", "islands", "repair"],
        7: ["islands", "mushroom", "repair"],
        8: ["repair", "islands", "mushroom"],
        9: ["water", "islands", "mushroom", "repair"],
        10: ["repair", "water", "islands", "mushroom"]
      };
      const palette = recoveryPalettes[stage.id];
      const recoveryStyle = spec.mechanics.includes("water")
        ? "water"
        : palette[(stage.id + index) % palette.length];
      addThemedRecovery(ctx, recoveryStyle);
    }
  }

  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background", { modulate: stage.tint }));
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

  for (let index = 0; index < stage.rooms.length; index += 1) buildRoom(index);

  grounded("LevelIntro", "Items", "sign", "S1Start", 0.48, -3, {
    lines: `Array[String]([${JSON.stringify(`[@n,老师快跑]${stage.title}`)}, ${JSON.stringify(`${stage.description}。每个机关前都有安全观察区；上层支路通常藏有蓝金币。`)}])`
  });
  const spawn = surfacePoint("S1Start", 0.22);
  nodes.push(instanceNode("Player", ".", "player", { position: vector(spawn.x, spawn.y - 58) }));

  if (mainEstimatedSeconds < 180) {
    throw new Error(`Level ${stage.id}: target main flow too short (${fmt(mainEstimatedSeconds)}s)`);
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

  nodes.push(`${plainNode("LLRFlowMetrics", "Node", ".").trimEnd()}
metadata/_llr_main_seconds = ${fmt(mainEstimatedSeconds)}
metadata/_llr_recovery_seconds = ${fmt(recoveryEstimatedSeconds)}
metadata/_llr_campaign_version = 3
metadata/_llr_room_forms = ${JSON.stringify(stage.rooms.map((item) => item.form).join(","))}
`);

  const extResources = Object.entries(resources)
    .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
    .join("\n");
  return `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
}
