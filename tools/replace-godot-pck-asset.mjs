import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const input = args.get("--input");
const output = args.get("--output");
const assetPath = args.get("--asset");
const replacement = args.get("--replacement");

if (!input || !output || !assetPath || !replacement) {
  throw new Error("Usage: node tools/replace-godot-pck-asset.mjs --input in.pck --output out.pck --asset res://... --replacement file");
}

const source = readFileSync(input);
const replacementData = readFileSync(replacement);

if (source.subarray(0, 4).toString("ascii") !== "GDPC") {
  throw new Error(`${input} is not a Godot GDPC pack`);
}

const dataBase = Number(source.readBigUInt64LE(0x18));
let cursor = 0x60;
const fileCount = source.readUInt32LE(cursor);
cursor += 4;

const entries = [];
for (let index = 0; index < fileCount; index += 1) {
  const entryOffset = cursor;
  const pathLength = source.readUInt32LE(cursor);
  cursor += 4;
  const pathBytes = source.subarray(cursor, cursor + pathLength);
  const path = pathBytes.toString("utf8").replace(/\0+$/, "");
  cursor += pathLength;
  const offset = Number(source.readBigUInt64LE(cursor));
  cursor += 8;
  const size = Number(source.readBigUInt64LE(cursor));
  cursor += 8;
  const md5 = source.subarray(cursor, cursor + 16);
  cursor += 16;
  const flags = source.readUInt32LE(cursor);
  cursor += 4;
  entries.push({ entryOffset, pathLength, pathBytes, path, offset, size, md5, flags });
}

const target = entries.find((entry) => entry.path === assetPath);
if (!target) {
  throw new Error(`Asset not found in PCK: ${assetPath}`);
}

const headerAndTable = Buffer.from(source.subarray(0, dataBase));
let nextOffset = 0;
const chunks = [];

for (const entry of entries) {
  const data = entry === target
    ? replacementData
    : source.subarray(dataBase + entry.offset, dataBase + entry.offset + entry.size);
  const alignedOffset = align16(nextOffset);
  if (alignedOffset > nextOffset) {
    chunks.push(Buffer.alloc(alignedOffset - nextOffset));
    nextOffset = alignedOffset;
  }

  headerAndTable.writeBigUInt64LE(BigInt(alignedOffset), entry.entryOffset + 4 + entry.pathLength);
  headerAndTable.writeBigUInt64LE(BigInt(data.length), entry.entryOffset + 4 + entry.pathLength + 8);
  createHash("md5").update(data).digest().copy(headerAndTable, entry.entryOffset + 4 + entry.pathLength + 16);

  chunks.push(data);
  nextOffset += data.length;
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, Buffer.concat([headerAndTable, ...chunks]));

console.log(JSON.stringify({
  output,
  asset: assetPath,
  bytes: replacementData.length,
  packBytes: dataBase + nextOffset
}, null, 2));

function align16(value) {
  return (value + 15) & ~15;
}
