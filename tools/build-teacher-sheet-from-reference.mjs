import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);

const input = args.get("--input");
const outDir = args.get("--out-dir");
const targetCell = Number(args.get("--target-cell") ?? "480");
const cols = 10;
const rows = 10;

if (!input || !outDir) {
  throw new Error("Usage: node tools/build-teacher-sheet-from-reference.mjs --input ref.png --out-dir output/ref-pack [--target-cell 480]");
}

mkdirSync(outDir, { recursive: true });

const source = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const srcW = source.info.width;
const srcH = source.info.height;
const outW = cols * targetCell;
const outH = rows * targetCell;
const out = Buffer.alloc(outW * outH * 4, 0);
const cellMeta = [];

for (let frame = 0; frame < cols * rows; frame += 1) {
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const x0 = Math.round((col * srcW) / cols);
  const x1 = Math.round(((col + 1) * srcW) / cols);
  const y0 = Math.round((row * srcH) / rows);
  const y1 = Math.round(((row + 1) * srcH) / rows);
  const w = x1 - x0;
  const h = y1 - y0;
  const cell = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const si = ((y0 + y) * srcW + x0 + x) * 4;
      const di = (y * w + x) * 4;
      cell[di] = source.data[si];
      cell[di + 1] = source.data[si + 1];
      cell[di + 2] = source.data[si + 2];
      cell[di + 3] = 255;
    }
  }

  eraseConnectedCheckerBackground(cell, w, h);
  const bounds = alphaBounds(cell, w, h);
  cellMeta.push({ frame, bounds });

  const resized = await sharp(cell, { raw: { width: w, height: h, channels: 4 } })
    .resize(targetCell, targetCell, { kernel: "nearest" })
    .raw()
    .toBuffer();

  const dx0 = col * targetCell;
  const dy0 = row * targetCell;
  for (let y = 0; y < targetCell; y += 1) {
    resized.copy(out, ((dy0 + y) * outW + dx0) * 4, y * targetCell * 4, (y + 1) * targetCell * 4);
  }
}

await sharp(out, { raw: { width: outW, height: outH, channels: 4 } })
  .png()
  .toFile(join(outDir, "mario_sheet.png"));
await renderPreview(out, outW, outH, join(outDir, "preview.png"));
console.log(JSON.stringify({ input, outDir, width: outW, height: outH, targetCell, emptyFrames: cellMeta.filter((m) => !m.bounds).map((m) => m.frame) }, null, 2));

function eraseConnectedCheckerBackground(buffer, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (!isCheckerBackground(buffer[i], buffer[i + 1], buffer[i + 2])) return;
    visited[p] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    const i = (y * width + x) * 4;
    buffer[i] = 0;
    buffer[i + 1] = 0;
    buffer[i + 2] = 0;
    buffer[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function isCheckerBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return avg >= 232 && max - min <= 10;
}

function alphaBounds(buffer, width, height) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (buffer[(y * width + x) * 4 + 3] < 12) continue;
      b.minX = Math.min(b.minX, x);
      b.minY = Math.min(b.minY, y);
      b.maxX = Math.max(b.maxX, x);
      b.maxY = Math.max(b.maxY, y);
    }
  }
  return Number.isFinite(b.minX) ? b : null;
}

async function renderPreview(data, width, height, output) {
  const checker = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = (Math.floor(x / targetCell) + Math.floor(y / targetCell)) % 2;
      const value = tile ? 214 : 239;
      const i = (y * width + x) * 4;
      checker[i] = value;
      checker[i + 1] = value;
      checker[i + 2] = value;
      checker[i + 3] = 255;
      const alpha = data[i + 3] / 255;
      if (alpha > 0) {
        checker[i] = Math.round(data[i] * alpha + checker[i] * (1 - alpha));
        checker[i + 1] = Math.round(data[i + 1] * alpha + checker[i + 1] * (1 - alpha));
        checker[i + 2] = Math.round(data[i + 2] * alpha + checker[i + 2] * (1 - alpha));
      }
    }
  }
  await sharp(checker, { raw: { width, height, channels: 4 } })
    .resize(960, 960, { kernel: "nearest" })
    .png()
    .toFile(output);
}
