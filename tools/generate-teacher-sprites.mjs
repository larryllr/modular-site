import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const sourceSheet = "output/stable-character-packs/mario_sheet.original.png";
const root = "output/stable-character-packs-v4";
const cell = 48;
const cols = 10;
const rows = 10;
const width = cols * cell;
const height = rows * cell;

const characters = [
  {
    id: "liushuo",
    skin: [245, 190, 152],
    redTop: [26, 25, 24],
    redMid: [38, 38, 36],
    redDark: [8, 8, 8],
    blueLight: [238, 232, 216],
    blueDark: [35, 50, 58],
    white: [250, 246, 232],
    hair: [16, 15, 14],
    mouth: [120, 55, 46],
    faceFill: true,
    glasses: "round",
    ruler: true
  },
  {
    id: "guoliang",
    skin: [225, 170, 135],
    redTop: [28, 28, 28],
    redMid: [32, 42, 66],
    redDark: [12, 18, 30],
    blueLight: [34, 48, 76],
    blueDark: [20, 30, 50],
    white: [225, 234, 246],
    hair: [20, 20, 20],
    mouth: [85, 48, 44],
    faceFill: true,
    glasses: "rect",
    bellyShade: true,
    bigBelly: true,
    ruler: false
  }
];

mkdirSync(root, { recursive: true });

const original = await sharp(sourceSheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (original.info.width !== width || original.info.height !== height) {
  throw new Error(`Unexpected source sheet size: ${original.info.width}x${original.info.height}`);
}

for (const character of characters) {
  const outDir = join(root, character.id);
  mkdirSync(outDir, { recursive: true });
  const out = Buffer.from(original.data);
  recolorSheet(out, original.info, character);
  await sharp(out, { raw: original.info }).png().toFile(join(outDir, "mario_sheet.png"));
  await renderPreview(out, original.info, join(outDir, "preview.png"));
}

function recolorSheet(buffer, info, character) {
  for (let frame = 0; frame < cols * rows; frame += 1) {
    const frameInfo = analyzeFrame(buffer, info, frame);
    if (!frameInfo.bounds) continue;

    forEachFramePixel(info, frame, (x, y, absolute) => {
      const alpha = buffer[absolute + 3];
      if (alpha < 12) return;
      const color = [buffer[absolute], buffer[absolute + 1], buffer[absolute + 2]];
      const mapped = mapOriginalColor(color, x, y, frameInfo, character);
      buffer[absolute] = mapped[0];
      buffer[absolute + 1] = mapped[1];
      buffer[absolute + 2] = mapped[2];
    });

    drawFaceDetails(buffer, info, frame, frameInfo, character);
    drawHairShape(buffer, info, frame, frameInfo, character);
    if (character.bellyShade) drawBellyHint(buffer, info, frame, frameInfo, character);
    if (character.bigBelly) drawBigBelly(buffer, info, frame, frameInfo, character);
    if (character.ruler) drawRulerInsideOriginalBounds(buffer, info, frame, frameInfo);
  }
}

function mapOriginalColor(color, x, y, frameInfo, c) {
  const kind = classifyOriginalColor(color);
  const b = frameInfo.bounds;
  const localY = y - b.minY;
  const h = Math.max(1, b.maxY - b.minY + 1);

  if (kind === "outline") return [48, 28, 22];
  if (kind === "skin") return shade(c.skin, brightness(color), 0.22);
  if (kind === "white") return shade(c.white, brightness(color), 0.16);
  if (kind === "yellow") return shade([180, 125, 70], brightness(color), 0.1);

  if (kind === "red") {
    if (localY < h * 0.36) return shade(c.hair, brightness(color), 0.18);
    if (localY < h * 0.58) return shade(c.redMid, brightness(color), 0.18);
    return shade(c.redDark, brightness(color), 0.18);
  }

  if (kind === "blue") {
    if (localY < h * 0.58) return shade(c.blueLight, brightness(color), 0.2);
    return shade(c.blueDark, brightness(color), 0.16);
  }

  return color;
}

function classifyOriginalColor([r, g, b]) {
  const palette = [
    ["outline", [60, 19, 0]],
    ["red", [233, 82, 60]],
    ["red", [188, 48, 62]],
    ["red", [153, 14, 56]],
    ["red", [191, 58, 34]],
    ["blue", [61, 53, 157]],
    ["blue", [92, 124, 204]],
    ["skin", [242, 131, 58]],
    ["skin", [255, 203, 143]],
    ["white", [250, 231, 233]],
    ["white", [255, 255, 255]],
    ["yellow", [252, 186, 85]],
    ["outline", [70, 60, 57]]
  ];
  let best = palette[0];
  let bestDistance = Infinity;
  for (const candidate of palette) {
    const d = distance([r, g, b], candidate[1]);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best[0];
}

function drawFaceDetails(buffer, info, frame, frameInfo, c) {
  const face = frameInfo.skinBounds;
  if (!face || face.maxX - face.minX < 7 || face.maxY - face.minY < 7) return;
  const y = clamp(Math.round(face.minY + (face.maxY - face.minY) * 0.43), face.minY + 2, face.maxY - 2);
  const leftX = Math.round(face.minX + (face.maxX - face.minX) * 0.35);
  const rightX = Math.round(face.minX + (face.maxX - face.minX) * 0.65);
  const dark = [18, 22, 24, 255];
  const shine = [220, 230, 235, 255];

  if (c.faceFill) {
    softenTeacherFace(buffer, info, frame, face, frameInfo, c);
  }

  if (c.glasses === "rect") {
    drawRectOutline(buffer, info, frame, leftX - 3, y - 2, 6, 5, dark, frameInfo);
    drawRectOutline(buffer, info, frame, rightX - 3, y - 2, 6, 5, dark, frameInfo);
  } else {
    drawCircleOutline(buffer, info, frame, leftX, y, 4, dark, frameInfo);
    drawCircleOutline(buffer, info, frame, rightX, y, 4, dark, frameInfo);
  }
  drawLine(buffer, info, frame, leftX + 2, y, rightX - 2, y, dark, frameInfo);
  setInside(buffer, info, frame, leftX, y, dark, frameInfo);
  setInside(buffer, info, frame, rightX, y, dark, frameInfo);
  setInside(buffer, info, frame, leftX - 1, y - 1, shine, frameInfo, 90);
  setInside(buffer, info, frame, rightX - 1, y - 1, shine, frameInfo, 90);

  const mouthY = Math.min(face.maxY - 1, y + 5);
  drawLine(buffer, info, frame, leftX, mouthY, rightX, mouthY, [...c.mouth, 255], frameInfo);
}

function softenTeacherFace(buffer, info, frame, face, frameInfo, c) {
  const cx = Math.round((face.minX + face.maxX) / 2);
  const cy = Math.round(face.minY + (face.maxY - face.minY) * 0.58);
  const rx = Math.max(4, Math.round((face.maxX - face.minX) * 0.34));
  const ry = Math.max(3, Math.round((face.maxY - face.minY) * 0.26));
  for (let yy = -ry; yy <= ry; yy += 1) {
    for (let xx = -rx; xx <= rx; xx += 1) {
      const d = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry);
      if (d <= 1) {
        blendInside(buffer, info, frame, cx + xx, cy + yy, [...c.skin, 255], 0.72, frameInfo);
      }
    }
  }
}

function drawHairShape(buffer, info, frame, frameInfo, c) {
  const face = frameInfo.skinBounds;
  if (!face || face.maxX - face.minX < 7 || face.maxY - face.minY < 7) return;
  const top = Math.max(frameInfo.bounds.minY, face.minY - 5);
  const cx = Math.round((face.minX + face.maxX) / 2);
  const rx = Math.max(4, Math.round((face.maxX - face.minX) * 0.52));
  const hairColor = [...c.hair, 255];
  for (let y = top; y <= face.minY + 2; y += 1) {
    const band = 1 - Math.abs(y - (face.minY - 1)) / Math.max(1, face.minY - top + 3);
    const half = Math.max(2, Math.round(rx * (0.55 + band * 0.45)));
    for (let x = cx - half; x <= cx + half; x += 1) {
      setInside(buffer, info, frame, x, y, hairColor, frameInfo, 12);
    }
  }
  drawLine(buffer, info, frame, face.minX + 1, face.minY + 2, cx - 1, face.minY, hairColor, frameInfo);
  drawLine(buffer, info, frame, cx, face.minY, face.maxX - 1, face.minY + 2, hairColor, frameInfo);
}

function drawBellyHint(buffer, info, frame, frameInfo) {
  const b = frameInfo.bounds;
  const cx = Math.round((b.minX + b.maxX) / 2);
  const cy = Math.round(b.minY + (b.maxY - b.minY) * 0.63);
  for (let yy = -3; yy <= 4; yy += 1) {
    for (let xx = -7; xx <= 7; xx += 1) {
      const d = (xx * xx) / 49 + (yy * yy) / 16;
      if (d <= 1) {
        blendInside(buffer, info, frame, cx + xx, cy + yy, [55, 70, 105, 255], 0.18, frameInfo);
      }
    }
  }
}

function drawBigBelly(buffer, info, frame, frameInfo, c) {
  const b = frameInfo.bounds;
  if (!frameInfo.skinBounds) return;
  if (b.maxX - b.minX > 38 || b.maxY - b.minY > 40) return;
  const cx = Math.round((b.minX + b.maxX) / 2);
  const cy = Math.round(b.minY + (b.maxY - b.minY) * 0.60);
  const rx = Math.max(7, Math.round((b.maxX - b.minX) * 0.34));
  const ry = Math.max(5, Math.round((b.maxY - b.minY) * 0.20));
  const minY = Math.max(b.minY + 7, cy - ry);
  const maxY = Math.min(b.maxY - 5, cy + ry);
  const bellyBounds = { bounds: { minX: 0, minY: b.minY, maxX: cell - 1, maxY: b.maxY } };
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = Math.max(0, cx - rx); x <= Math.min(cell - 1, cx + rx); x += 1) {
      const d = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
      if (d <= 1) {
        setPixelInFrame(buffer, info, frame, x, y, [...c.blueLight, 255]);
      }
      if (d > 0.86 && d <= 1.14) {
        setPixelInFrame(buffer, info, frame, x, y, [14, 20, 32, 255]);
      }
    }
  }
  drawLine(buffer, info, frame, cx - 2, minY + 1, cx, maxY - 1, [228, 236, 248, 255], bellyBounds);
  drawLine(buffer, info, frame, cx + 1, minY + 1, cx, maxY - 1, [228, 236, 248, 255], bellyBounds);
}

function drawRulerInsideOriginalBounds(buffer, info, frame, frameInfo) {
  const b = frameInfo.bounds;
  const x1 = Math.round(b.maxX - 5);
  const y1 = Math.round(b.minY + (b.maxY - b.minY) * 0.42);
  const x2 = Math.round(b.maxX - 1);
  const y2 = Math.round(b.minY + (b.maxY - b.minY) * 0.78);
  drawLine(buffer, info, frame, x1, y1, x2, y2, [175, 125, 62, 255], frameInfo);
  drawLine(buffer, info, frame, x1 + 1, y1, x2 + 1, y2, [105, 70, 35, 255], frameInfo);
}

function analyzeFrame(buffer, info, frame) {
  const bounds = emptyBounds();
  const skinBounds = emptyBounds();
  forEachFramePixel(info, frame, (x, y, absolute) => {
    const alpha = buffer[absolute + 3];
    if (alpha < 12) return;
    add(bounds, x, y);
    if (classifyOriginalColor([buffer[absolute], buffer[absolute + 1], buffer[absolute + 2]]) === "skin") {
      add(skinBounds, x, y);
    }
  });
  return {
    bounds: valid(bounds) ? bounds : null,
    skinBounds: valid(skinBounds) ? skinBounds : null
  };
}

function forEachFramePixel(info, frame, callback) {
  const fx = (frame % cols) * cell;
  const fy = Math.floor(frame / cols) * cell;
  for (let y = 0; y < cell; y += 1) {
    for (let x = 0; x < cell; x += 1) {
      const absolute = ((fy + y) * info.width + fx + x) * info.channels;
      callback(x, y, absolute);
    }
  }
}

function drawRectOutline(buffer, info, frame, x, y, w, h, color, frameInfo) {
  drawLine(buffer, info, frame, x, y, x + w, y, color, frameInfo);
  drawLine(buffer, info, frame, x, y + h, x + w, y + h, color, frameInfo);
  drawLine(buffer, info, frame, x, y, x, y + h, color, frameInfo);
  drawLine(buffer, info, frame, x + w, y, x + w, y + h, color, frameInfo);
}

function drawCircleOutline(buffer, info, frame, cx, cy, r, color, frameInfo) {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    setInside(buffer, info, frame, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), color, frameInfo);
  }
}

function drawLine(buffer, info, frame, x1, y1, x2, y2, color, frameInfo) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    setInside(buffer, info, frame, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), color, frameInfo);
  }
}

function setInside(buffer, info, frame, x, y, color, frameInfo, minAlpha = 12) {
  const b = frameInfo.bounds;
  if (!b || x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return;
  const fx = (frame % cols) * cell;
  const fy = Math.floor(frame / cols) * cell;
  const absolute = ((fy + y) * info.width + fx + x) * info.channels;
  if (buffer[absolute + 3] < minAlpha) return;
  buffer[absolute] = color[0];
  buffer[absolute + 1] = color[1];
  buffer[absolute + 2] = color[2];
  buffer[absolute + 3] = color[3];
}

function setPixelInFrame(buffer, info, frame, x, y, color) {
  if (x < 0 || x >= cell || y < 0 || y >= cell) return;
  const fx = (frame % cols) * cell;
  const fy = Math.floor(frame / cols) * cell;
  const absolute = ((fy + y) * info.width + fx + x) * info.channels;
  buffer[absolute] = color[0];
  buffer[absolute + 1] = color[1];
  buffer[absolute + 2] = color[2];
  buffer[absolute + 3] = color[3];
}

function blendInside(buffer, info, frame, x, y, color, amount, frameInfo) {
  const b = frameInfo.bounds;
  if (!b || x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return;
  const fx = (frame % cols) * cell;
  const fy = Math.floor(frame / cols) * cell;
  const absolute = ((fy + y) * info.width + fx + x) * info.channels;
  if (buffer[absolute + 3] < 12) return;
  buffer[absolute] = Math.round(buffer[absolute] * (1 - amount) + color[0] * amount);
  buffer[absolute + 1] = Math.round(buffer[absolute + 1] * (1 - amount) + color[1] * amount);
  buffer[absolute + 2] = Math.round(buffer[absolute + 2] * (1 - amount) + color[2] * amount);
}

async function renderPreview(data, info, output) {
  const checker = Buffer.alloc(info.width * info.height * info.channels);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const tile = (Math.floor(x / 24) + Math.floor(y / 24)) % 2;
      const value = tile ? 214 : 239;
      const i = (y * info.width + x) * info.channels;
      checker[i] = value;
      checker[i + 1] = value;
      checker[i + 2] = value;
      checker[i + 3] = 255;
    }
  }
  await sharp(checker, { raw: info })
    .composite([{ input: data, raw: info }])
    .png()
    .toFile(output);
}

function emptyBounds() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function add(bounds, x, y) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function valid(bounds) {
  return Number.isFinite(bounds.minX) && bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY;
}

function distance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function brightness([r, g, b]) {
  return (r + g + b) / (255 * 3);
}

function shade(base, sourceBrightness, strength) {
  const factor = 1 + (sourceBrightness - 0.5) * strength;
  return base.map((channel) => clamp(Math.round(channel * factor), 0, 255));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
