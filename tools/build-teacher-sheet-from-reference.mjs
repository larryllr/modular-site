import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key?.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, true);
  }
}

const input = args.get("--input");
const outDir = args.get("--out-dir");
const targetCell = Number(args.get("--target-cell") ?? "480");
const normalizeSafe = args.has("--normalize-safe");
const baseline = Number(args.get("--baseline") ?? Math.round(targetCell * 39 / 48));
const topPadding = Number(args.get("--top-padding") ?? Math.round(targetCell * 2 / 48));
const contentScale = Number(args.get("--content-scale") ?? "1");
const minComponentArea = Number(args.get("--min-component-area") ?? "20");
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
  eraseRemainingCheckerPixels(cell, w, h);
  keepForegroundComponents(cell, w, h, minComponentArea);
  const bounds = alphaBounds(cell, w, h);
  cellMeta.push({ frame, bounds });

  let resized = await sharp(cell, { raw: { width: w, height: h, channels: 4 } })
    .resize(targetCell, targetCell, { kernel: "nearest" })
    .raw()
    .toBuffer();
  if (Number.isFinite(contentScale) && contentScale > 0 && contentScale < 1) {
    resized = await scaleFrameContent(resized, targetCell, targetCell, contentScale);
  }
  if (normalizeSafe) {
    resized = alignFrameToBaseline(resized, targetCell, targetCell, baseline, topPadding);
  }

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
console.log(JSON.stringify({
  input,
  outDir,
  width: outW,
  height: outH,
  targetCell,
  normalizeSafe,
  baseline,
  topPadding,
  contentScale,
  minComponentArea,
  emptyFrames: cellMeta.filter((m) => !m.bounds).map((m) => m.frame)
}, null, 2));

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
  if (avg < 218 || max - min > 18) return false;
  return !isLikelyWhiteClothing(r, g, b);
}

function isLikelyWhiteClothing(r, g, b) {
  return r >= 220 && g >= 220 && b >= 210 && Math.abs(r - g) <= 12 && r - b >= 8;
}

function eraseRemainingCheckerPixels(buffer, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (buffer[i + 3] < 12) continue;
      if (isCheckerBackground(buffer[i], buffer[i + 1], buffer[i + 2])) {
        buffer[i] = 0;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
        buffer[i + 3] = 0;
      }
    }
  }
}

function keepForegroundComponents(buffer, width, height, minArea) {
  const visited = new Uint8Array(width * height);
  const keep = new Uint8Array(width * height);

  const isSolid = (x, y) => buffer[(y * width + x) * 4 + 3] >= 12;
  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const start = startY * width + startX;
      if (visited[start] || !isSolid(startX, startY)) continue;
      const component = [];
      const bounds = { minX: startX, minY: startY, maxX: startX, maxY: startY };
      const queue = [[startX, startY]];
      visited[start] = 1;
      for (let head = 0; head < queue.length; head += 1) {
        const [x, y] = queue[head];
        component.push(y * width + x);
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const p = ny * width + nx;
          if (visited[p] || !isSolid(nx, ny)) continue;
          visited[p] = 1;
          queue.push([nx, ny]);
        }
      }
      const componentWidth = bounds.maxX - bounds.minX + 1;
      const componentHeight = bounds.maxY - bounds.minY + 1;
      const centeredEnough = bounds.maxX >= width * 0.12 && bounds.minX <= width * 0.88;
      const largeEnough = component.length >= minArea || (componentWidth >= width * 0.08 && componentHeight >= height * 0.08);
      if (largeEnough && centeredEnough) {
        for (const pixel of component) keep[pixel] = 1;
      }
    }
  }

  for (let p = 0; p < width * height; p += 1) {
    if (keep[p]) continue;
    buffer[p * 4 + 3] = 0;
  }
}

function alignFrameToBaseline(buffer, width, height, targetBaseline, minTopPadding) {
  const bounds = alphaBounds(buffer, width, height);
  if (!bounds) return buffer;
  const out = Buffer.alloc(buffer.length, 0);
  const currentCenterX = (bounds.minX + bounds.maxX + 1) / 2;
  let dx = Math.round(width / 2 - currentCenterX);
  let dy = Math.round(targetBaseline - bounds.maxY);
  if (bounds.minY + dy < minTopPadding) {
    dy += minTopPadding - (bounds.minY + dy);
  }
  for (let y = 0; y < height; y += 1) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let x = 0; x < width; x += 1) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      const si = (y * width + x) * 4;
      if (buffer[si + 3] < 12) continue;
      const di = (ny * width + nx) * 4;
      out[di] = buffer[si];
      out[di + 1] = buffer[si + 1];
      out[di + 2] = buffer[si + 2];
      out[di + 3] = buffer[si + 3];
    }
  }
  return out;
}

async function scaleFrameContent(buffer, width, height, scale) {
  const scaledW = Math.max(1, Math.round(width * scale));
  const scaledH = Math.max(1, Math.round(height * scale));
  const scaled = await sharp(buffer, { raw: { width, height, channels: 4 } })
    .resize(scaledW, scaledH, { kernel: "nearest" })
    .raw()
    .toBuffer();
  const out = Buffer.alloc(buffer.length, 0);
  const dx = Math.floor((width - scaledW) / 2);
  const dy = Math.floor((height - scaledH) / 2);
  for (let y = 0; y < scaledH; y += 1) {
    scaled.copy(out, ((dy + y) * width + dx) * 4, y * scaledW * 4, (y + 1) * scaledW * 4);
  }
  return out;
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
