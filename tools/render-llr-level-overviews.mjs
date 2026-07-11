import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const sourceRoot = "vendor/Legacy_SM63Redux/scenes/levels/llr_complete";
const outputRoot = resolve(process.argv[2] || ".codex-cache/llr-level-overviews");
const roomWidth = 3200;
const roomsPerRow = 5;
const panelWidth = 620;
const panelHeight = 330;
const imageWidth = panelWidth * roomsPerRow;
const imageHeight = panelHeight * 2;

mkdirSync(outputRoot, { recursive: true });

function parseVector(text, property = "position") {
  const match = text.match(new RegExp(`^${property} = Vector2\\((-?[\\d.]+), (-?[\\d.]+)\\)$`, "m"));
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
}

function parsePacked(text, property = "polygon") {
  const match = text.match(new RegExp(`^${property} = PackedVector2Array\\(([^)]*)\\)$`, "m"));
  if (!match) return [];
  const values = match[1].split(",").map((value) => Number(value.trim()));
  return Array.from({ length: values.length / 2 }, (_, index) => ({
    x: values[index * 2],
    y: values[index * 2 + 1]
  }));
}

function metadata(block, key) {
  const match = block.match(new RegExp(`^metadata\\/${key} = (.+)$`, "m"));
  if (!match) return null;
  if (/^-?[\d.]+$/.test(match[1])) return Number(match[1]);
  if (match[1] === "true") return true;
  if (match[1].startsWith('"')) return JSON.parse(match[1]);
  return match[1];
}

function numericProperty(block, key, fallback = 0) {
  const match = block.match(new RegExp(`^${key} = (-?[\\d.]+)$`, "m"));
  return match ? Number(match[1]) : fallback;
}

function parseScene(scene) {
  const resources = new Map(
    [...scene.matchAll(/\[ext_resource [^\]]*path="([^"]+)"[^\]]*id="([^"]+)"\]/g)]
      .map((match) => [match[2], match[1]])
  );
  return scene
    .split(/\n(?=\[node )/)
    .map((block, order) => {
      const header = block.match(/^\[node name="([^"]+)"([^\]]*)\]/);
      if (!header) return null;
      const resourceId = header[2].match(/instance=ExtResource\("([^"]+)"\)/)?.[1] || "";
      return {
        order,
        name: header[1],
        parent: header[2].match(/parent="([^"]+)"/)?.[1] || "",
        resource: resources.get(resourceId) || "",
        position: parseVector(block),
        polygon: parsePacked(block),
        points: parsePacked(block, "points"),
        routePoints: parsePacked(block, "metadata/_llr_points"),
        width: numericProperty(block, "width", 1),
        radius: numericProperty(block, "radius", 76),
        count: numericProperty(block, "count", 3),
        room: metadata(block, "_llr_room"),
        routeKind: metadata(block, "_llr_kind"),
        anchored: Boolean(metadata(block, "_llr_anchor_surface")),
        airborne: Boolean(metadata(block, "_llr_airborne")),
        block
      };
    })
    .filter(Boolean);
}

function escape(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function localPoint(worldX, worldY, room) {
  const column = room % roomsPerRow;
  const row = Math.floor(room / roomsPerRow);
  const x = column * panelWidth + 12 + ((worldX - room * roomWidth) / roomWidth) * (panelWidth - 24);
  const y = row * panelHeight + 28 + ((worldY + 820) / 1580) * (panelHeight - 44);
  return { x, y };
}

function platformMarkup(node, room) {
  const point = localPoint(node.position.x, node.position.y, room);
  const title = `<title>${escape(node.name)}</title>`;
  if (node.resource.includes("fungus_stem")) {
    const end = node.points.at(-1) || { x: 0, y: 180 };
    const root = localPoint(node.position.x + end.x, node.position.y + end.y, room);
    return [
      `<line x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${root.x.toFixed(1)}" y2="${root.y.toFixed(1)}" stroke="#9d4edd" stroke-width="4">${title}</line>`,
      `<ellipse cx="${point.x.toFixed(1)}" cy="${(point.y - 2).toFixed(1)}" rx="13" ry="5" fill="#e6398f" stroke="#6a1649" stroke-width="1"/>`
    ];
  }
  if (node.resource.includes("cloud")) {
    const radiusX = Math.max(8, Math.min(25, node.width * 5.5));
    return [`<ellipse cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" rx="${radiusX}" ry="5" fill="#f8fbff" stroke="#5aa9e6" stroke-width="1.5">${title}</ellipse>`];
  }
  if (node.resource.includes("breakable_box")) {
    return [`<rect x="${(point.x - 5).toFixed(1)}" y="${(point.y - 10).toFixed(1)}" width="10" height="10" fill="#d08c45" stroke="#6f4518" stroke-width="1">${title}</rect>`];
  }
  if (node.resource.includes("wooden_platform")) {
    const halfWidth = Math.max(8, Math.min(28, node.width * 7));
    return [`<rect x="${(point.x - halfWidth).toFixed(1)}" y="${(point.y - 2).toFixed(1)}" width="${halfWidth * 2}" height="4" rx="2" fill="#f4a261" stroke="#8d5524" stroke-width="1">${title}</rect>`];
  }
  return [`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#ef8354">${title}</circle>`];
}

function mechanismMarkup(node, room) {
  const point = localPoint(node.position.x, node.position.y, room);
  const title = `<title>${escape(node.name)}</title>`;
  if (node.resource.includes("pivot")) {
    const radius = Math.max(7, Math.min(18, node.radius * 0.12));
    const result = [`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5" fill="#d00000">${title}</circle>`];
    for (let index = 0; index < node.count; index += 1) {
      const angle = (Math.PI * 2 * index) / node.count;
      result.push(`<line x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${(point.x + Math.cos(angle) * radius).toFixed(1)}" y2="${(point.y + Math.sin(angle) * radius).toFixed(1)}" stroke="#d00000" stroke-width="2"/>`);
    }
    return result;
  }
  if (node.resource.includes("tipping_log")) {
    const halfWidth = Math.max(12, Math.min(32, node.width * 6));
    return [`<line x1="${(point.x - halfWidth).toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${(point.x + halfWidth).toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="#9c6644" stroke-width="5">${title}</line>`];
  }
  return [`<rect x="${(point.x - 5).toFixed(1)}" y="${(point.y - 5).toFixed(1)}" width="10" height="10" transform="rotate(45 ${point.x.toFixed(1)} ${point.y.toFixed(1)})" fill="#e5383b" stroke="#7f0000" stroke-width="1">${title}</rect>`];
}

for (let level = 1; level <= 10; level += 1) {
  const scene = readFileSync(`${sourceRoot}/llr_complete_${level}.tscn`, "utf8");
  const nodes = parseScene(scene);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">`,
    `<rect width="100%" height="100%" fill="#dcecff"/>`
  ];

  for (let room = 0; room < 10; room += 1) {
    const column = room % roomsPerRow;
    const row = Math.floor(room / roomsPerRow);
    const x = column * panelWidth;
    const y = row * panelHeight;
    parts.push(`<rect x="${x + 2}" y="${y + 2}" width="${panelWidth - 4}" height="${panelHeight - 4}" rx="8" fill="none" stroke="#415a77" stroke-width="3"/>`);
    parts.push(`<text x="${x + 16}" y="${y + 22}" font-family="sans-serif" font-size="16" fill="#102a43">L${level} · Room ${room + 1}</text>`);
  }

  for (const node of nodes.filter((item) => item.parent === "Terrain" && item.polygon.length >= 4)) {
    const room = Math.max(0, Math.min(9, Math.floor(node.position.x / roomWidth)));
    const points = node.polygon.map((point) =>
      localPoint(node.position.x + point.x, node.position.y + point.y, room)
    );
    parts.push(`<polygon points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}" fill="#b9793f" stroke="#704214" stroke-width="1"/>`);
  }

  for (const node of nodes.filter((item) => item.parent === "Water" && item.polygon.length >= 4)) {
    const room = Math.max(0, Math.min(9, Math.floor(node.position.x / roomWidth)));
    const points = node.polygon.map((point) =>
      localPoint(node.position.x + point.x, node.position.y + point.y, room)
    );
    parts.push(`<polygon points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}" fill="#4cc9f0" fill-opacity="0.65"/>`);
  }

  for (const node of nodes.filter((item) => item.parent === "Items/Platforms")) {
    const room = Math.max(0, Math.min(9, Math.floor(node.position.x / roomWidth)));
    parts.push(...platformMarkup(node, room));
  }

  for (const node of nodes.filter((item) => item.parent === "Items/Mechanisms")) {
    const room = Math.max(0, Math.min(9, Math.floor(node.position.x / roomWidth)));
    parts.push(...mechanismMarkup(node, room));
  }

  const routes = Map.groupBy(
    nodes.filter((node) => node.parent === "Route" && node.routePoints.length >= 2),
    (node) => `${node.room}:${node.routeKind}`
  );
  for (const [key, route] of routes) {
    route.sort((left, right) => left.order - right.order);
    const room = Number(key.split(":")[0]) - 1;
    const points = route.flatMap((node) => node.routePoints).map((point) => localPoint(point.x, point.y, room));
    const color = key.endsWith(":recovery") ? "#f77f00" : "#1b9e4b";
    parts.push(`<polyline points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3"/>`);
    for (const point of points) {
      parts.push(`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3" fill="${color}"/>`);
    }
  }

  for (const node of nodes.filter((item) => item.anchored || item.airborne)) {
    const room = Math.max(0, Math.min(9, Math.floor(node.position.x / roomWidth)));
    const point = localPoint(node.position.x, node.position.y, room);
    const color = node.anchored ? "#6a00f4" : "#0077b6";
    parts.push(`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="${color}"><title>${escape(node.name)}</title></circle>`);
  }

  parts.push(`<text x="18" y="${imageHeight - 10}" font-family="sans-serif" font-size="15" fill="#102a43">绿色：主路线　橙色：失足回收路线　紫点：地表物件　蓝点：空中/水中物件　粉色：蘑菇　白色：云台　红色：机关</text>`);
  parts.push("</svg>");
  await sharp(Buffer.from(parts.join("\n"))).png().toFile(`${outputRoot}/level-${level}.png`);
}

console.log(`Rendered 10 level overviews to ${outputRoot}`);
