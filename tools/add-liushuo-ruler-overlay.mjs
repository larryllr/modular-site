import sharp from "sharp";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);

const input = args.get("--input");
const output = args.get("--output") ?? input;
const cell = Number(args.get("--cell") ?? "480");
const frames = (args.get("--frames") ?? "56,57,58").split(",").map((v) => Number(v.trim())).filter(Number.isFinite);
const cols = 10;

if (!input) throw new Error("Usage: node tools/add-liushuo-ruler-overlay.mjs --input sheet.png [--output sheet.png] [--frames 56,57,58]");

const image = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const buffer = Buffer.from(image.data);

for (const frame of frames) drawRuler(buffer, image.info, frame);

await sharp(buffer, { raw: image.info }).png().toFile(output);
console.log(JSON.stringify({ input, output, frames, cell }, null, 2));

function drawRuler(buffer, info, frame) {
  const fx = (frame % cols) * cell;
  const fy = Math.floor(frame / cols) * cell;
  // A small classroom ruler, not a giant weapon: tan body, dark rim, tiny ticks.
  const x1 = Math.round(cell * 0.55);
  const y1 = Math.round(cell * 0.30);
  const x2 = Math.round(cell * 0.77);
  const y2 = Math.round(cell * 0.67);
  drawLine(buffer, info, fx + x1, fy + y1, fx + x2, fy + y2, [222, 170, 86, 255], 10);
  drawLine(buffer, info, fx + x1 - 4, fy + y1, fx + x2 - 4, fy + y2, [108, 70, 30, 255], 3);
  drawLine(buffer, info, fx + x1 + 5, fy + y1, fx + x2 + 5, fy + y2, [108, 70, 30, 255], 3);
  for (let i = 2; i < 8; i += 1) {
    const t = i / 9;
    const x = Math.round(fx + x1 + (x2 - x1) * t);
    const y = Math.round(fy + y1 + (y2 - y1) * t);
    drawLine(buffer, info, x - 8, y + 3, x + 5, y - 3, [92, 58, 24, 255], 2);
  }
}

function drawLine(buffer, info, x1, y1, x2, y2, color, radius) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(buffer, info, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), radius, color);
  }
}

function fillCircle(buffer, info, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y > radius * radius) continue;
      setPixel(buffer, info, cx + x, cy + y, color);
    }
  }
}

function setPixel(buffer, info, x, y, color) {
  if (x < 0 || x >= info.width || y < 0 || y >= info.height) return;
  const i = (y * info.width + x) * info.channels;
  const alpha = color[3] / 255;
  const inv = 1 - alpha;
  buffer[i] = Math.round(color[0] * alpha + buffer[i] * inv);
  buffer[i + 1] = Math.round(color[1] * alpha + buffer[i + 1] * inv);
  buffer[i + 2] = Math.round(color[2] * alpha + buffer[i + 2] * inv);
  buffer[i + 3] = Math.max(buffer[i + 3], color[3]);
}
