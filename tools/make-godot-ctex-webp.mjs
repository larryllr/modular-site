import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const input = args.get("--input");
const output = args.get("--output");

if (!input || !output) {
  throw new Error("Usage: node tools/make-godot-ctex-webp.mjs --input sheet.png --output sheet.ctex");
}

const webp = await sharp(input)
  .ensureAlpha()
  .webp({ lossless: true, quality: 100, effort: 6 })
  .toBuffer();

const header = Buffer.from([
  0x47, 0x53, 0x54, 0x32, 0x01, 0x00, 0x00, 0x00,
  0xe0, 0x01, 0x00, 0x00, 0xe0, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x0d, 0xff, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
  0xe0, 0x01, 0xe0, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x05, 0x00, 0x00, 0x00
]);
const length = Buffer.alloc(4);
length.writeUInt32LE(webp.length);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, Buffer.concat([header, length, webp]));
