import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = "output/stable-character-packs-v2";
const cell = 48;
const cols = 10;
const rows = 10;

const characters = [
  {
    id: "liushuo",
    title: "刘硕版 v2",
    skin: "#f2c4a8",
    blush: "#e79b8c",
    hair: "#171717",
    shirt: "#f7f2e6",
    vest: "#29323a",
    pants: "#1f3036",
    shoes: "#101820",
    accent: "#b58b47",
    body: "slim",
    glasses: "round",
    ruler: true
  },
  {
    id: "guoliang",
    title: "郭亮版 v2",
    skin: "#e5b395",
    blush: "#d58b7a",
    hair: "#202020",
    shirt: "#dce6f4",
    vest: "#1d2b44",
    pants: "#172239",
    shoes: "#111827",
    accent: "#3b4f78",
    body: "round",
    glasses: "rect",
    ruler: false
  }
];

mkdirSync(root, { recursive: true });

for (const character of characters) {
  const outDir = join(root, character.id);
  mkdirSync(outDir, { recursive: true });
  const sheetSvg = sheet(character, false);
  const previewSvg = sheet(character, true);
  await sharp(Buffer.from(sheetSvg)).png().toFile(join(outDir, "mario_sheet.png"));
  await sharp(Buffer.from(previewSvg)).png().toFile(join(outDir, "preview.png"));
}

function sheet(character, preview) {
  const width = cols * cell;
  const height = rows * cell;
  const bg = preview ? checker(width, height) : "";
  const frames = [];
  for (let i = 0; i < cols * rows; i += 1) {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    const pose = poseFor(i);
    if (pose.kind !== "empty") {
      frames.push(`<g transform="translate(${x} ${y})">${actor(character, pose)}</g>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">${bg}${frames.join("")}</svg>`;
}

function checker(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y += 24) {
    for (let x = 0; x < width; x += 24) {
      tiles.push(`<rect x="${x}" y="${y}" width="24" height="24" fill="${(x / 24 + y / 24) % 2 ? "#d9d9d9" : "#f1f1f1"}"/>`);
    }
  }
  return tiles.join("");
}

function poseFor(index) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  if (row >= 8) return { kind: "empty" };
  if (row === 0) return walkPose(col, 0.8, "front");
  if (row === 1) return walkPose(col, 1.1, "front");
  if (row === 2) return jumpPose(col);
  if (row === 3) return walkPose(col, 0.65, "back");
  if (row === 4 && col <= 5) return { kind: "back", phase: col / 5, squash: 0.02 * Math.sin(col) };
  if (row === 4) return { kind: "crouch", phase: (col - 6) / 3 };
  if (row === 5) return spinPose(col);
  if (row === 6) return actionPose(col);
  if (row === 7) return groundPoundPose(col);
  return walkPose(col, 0.8, "front");
}

function walkPose(col, amp, view) {
  const phase = (col / cols) * Math.PI * 2;
  return {
    kind: view,
    phase,
    bob: Math.sin(phase) * 1.2 * amp,
    lean: Math.sin(phase) * 3 * amp,
    leftLeg: Math.sin(phase) * 11 * amp,
    rightLeg: -Math.sin(phase) * 11 * amp,
    leftArm: -Math.sin(phase) * 9 * amp,
    rightArm: Math.sin(phase) * 9 * amp
  };
}

function jumpPose(col) {
  const t = col / 9;
  return {
    kind: "front",
    bob: -4 - Math.sin(t * Math.PI) * 4,
    lean: -5 + t * 10,
    leftLeg: -12 + t * 18,
    rightLeg: 12 - t * 18,
    leftArm: -18 + t * 8,
    rightArm: 18 - t * 8
  };
}

function spinPose(col) {
  const t = col / 9;
  return {
    kind: t < 0.3 ? "front" : t < 0.62 ? "side" : "back",
    phase: t,
    bob: Math.sin(t * Math.PI * 4) * 1.5,
    lean: Math.sin(t * Math.PI * 2) * 12,
    leftLeg: Math.sin(t * Math.PI * 2) * 16,
    rightLeg: Math.cos(t * Math.PI * 2) * 16,
    leftArm: Math.cos(t * Math.PI * 2) * 18,
    rightArm: -Math.cos(t * Math.PI * 2) * 18
  };
}

function actionPose(col) {
  const t = col / 9;
  return {
    kind: t < 0.45 ? "front" : "side",
    phase: t,
    bob: -1,
    lean: -8 + t * 18,
    leftLeg: -8,
    rightLeg: 8,
    leftArm: -20 + t * 28,
    rightArm: 16 - t * 26,
    toolAction: true
  };
}

function groundPoundPose(col) {
  const t = col / 9;
  if (t > 0.58) {
    return {
      kind: "pound",
      upsideDown: true,
      phase: t,
      bob: -2,
      lean: 180,
      leftLeg: 22,
      rightLeg: -22,
      leftArm: -16,
      rightArm: 16
    };
  }
  return {
    kind: "pound",
    phase: t,
    bob: -6 + t * 4,
    lean: -18 + t * 36,
    leftLeg: -18 + t * 8,
    rightLeg: 18 - t * 8,
    leftArm: -26 + t * 18,
    rightArm: 26 - t * 18,
    toolAction: true
  };
}

function actor(c, pose) {
  const y = 0 + (pose.bob || 0);
  const transform = pose.upsideDown
    ? `translate(24 25) rotate(180) translate(-24 -25)`
    : `translate(24 39) rotate(${pose.lean || 0}) translate(-24 -39)`;
  return `<g transform="${transform} translate(0 ${y})">
    ${shadow()}
    ${legs(c, pose)}
    ${body(c, pose)}
    ${arms(c, pose)}
    ${head(c, pose)}
    ${tool(c, pose)}
  </g>`;
}

function shadow() {
  return `<ellipse cx="24" cy="41.5" rx="11" ry="2.3" fill="#000" opacity=".16"/>`;
}

function body(c, p) {
  if (c.body === "round") {
    const belly = 15 + Math.sin((p.phase || 0) * Math.PI * 2) * 0.8;
    return `
      <ellipse cx="24" cy="28" rx="${belly}" ry="12.5" fill="${c.vest}" stroke="#101827" stroke-width="1.4"/>
      <path d="M14 21 Q24 18 34 21 L31 33 Q24 38 17 33 Z" fill="${c.vest}"/>
      <path d="M21 20 L24 31 L28 20" fill="${c.shirt}" stroke="#eef4ff" stroke-width="1"/>
      <path d="M24 21 L26 27 L24 31 L22 27 Z" fill="#32415f"/>
    `;
  }
  return `
    <path d="M15 19 Q24 15 33 19 L31 34 Q24 38 17 34 Z" fill="${c.shirt}" stroke="#20242a" stroke-width="1.2"/>
    <path d="M15.5 20 L21 34 L24 23 L27 34 L32.5 20 L31 34 Q24 38 17 34 Z" fill="${c.vest}" opacity=".94"/>
    <path d="M23 20 L25 20 L26 29 L24 33 L22 29 Z" fill="#b9423d"/>
  `;
}

function legs(c, p) {
  const left = p.leftLeg || 0;
  const right = p.rightLeg || 0;
  return `
    <g stroke="${c.pants}" stroke-width="4.4" stroke-linecap="round">
      <path d="M20 33 Q${18 - left * 0.08} ${37 - Math.abs(left) * 0.04} ${17 - left * 0.16} 43"/>
      <path d="M28 33 Q${30 - right * 0.08} ${37 - Math.abs(right) * 0.04} ${31 - right * 0.16} 43"/>
    </g>
    <g stroke="${c.shoes}" stroke-width="3.3" stroke-linecap="round">
      <path d="M${15 - left * 0.16} 43 L${20 - left * 0.08} 43"/>
      <path d="M${29 - right * 0.16} 43 L${34 - right * 0.08} 43"/>
    </g>`;
}

function arms(c, p) {
  const left = p.leftArm || 0;
  const right = p.rightArm || 0;
  const skin = c.skin;
  return `
    <g stroke="#26313a" stroke-width="3.5" stroke-linecap="round">
      <path d="M16 22 Q${12 + left * 0.06} ${28 + left * 0.04} ${12 + left * 0.14} 34"/>
      <path d="M32 22 Q${36 + right * 0.06} ${28 + right * 0.04} ${36 + right * 0.14} 34"/>
    </g>
    <circle cx="${12 + left * 0.14}" cy="34" r="2.1" fill="${skin}" stroke="#9d725d" stroke-width=".6"/>
    <circle cx="${36 + right * 0.14}" cy="34" r="2.1" fill="${skin}" stroke="#9d725d" stroke-width=".6"/>`;
}

function head(c, p) {
  const back = p.kind === "back";
  const side = p.kind === "side";
  const headRx = c.body === "round" ? 11.7 : 10.8;
  const headRy = c.body === "round" ? 10.8 : 11.2;
  const face = back ? backHead(c, headRx, headRy) : frontHead(c, headRx, headRy, side);
  return `<g>${face}</g>`;
}

function frontHead(c, rx, ry, side) {
  const eyeDx = side ? 2.4 : 4.2;
  return `
    <ellipse cx="24" cy="12" rx="${rx}" ry="${ry}" fill="${c.skin}" stroke="#4b2e22" stroke-width="1.2"/>
    <path d="M14 ${c.body === "round" ? 9 : 8} Q24 0 35 8 Q33 3 27 2 Q20 1 15 6 Z" fill="${c.hair}"/>
    <path d="M14 9 Q19 4 25 5 Q31 5 35 10" fill="none" stroke="#0b0b0b" stroke-width="2.4" stroke-linecap="round"/>
    ${glasses(c, eyeDx)}
    <circle cx="${24 - eyeDx}" cy="12" r="1" fill="#1f2933"/>
    <circle cx="${24 + eyeDx}" cy="12" r="1" fill="#1f2933"/>
    <path d="M21.5 17 Q24 19 27 17" fill="none" stroke="#7f3c35" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="17" cy="15.5" rx="2.4" ry="1.2" fill="${c.blush}" opacity=".35"/>
    <ellipse cx="31" cy="15.5" rx="2.4" ry="1.2" fill="${c.blush}" opacity=".35"/>
  `;
}

function backHead(c, rx, ry) {
  return `
    <ellipse cx="24" cy="12" rx="${rx}" ry="${ry}" fill="${c.skin}" stroke="#4b2e22" stroke-width="1.2"/>
    <path d="M13 11 Q15 1 24 1 Q34 1 36 11 Q31 8 24 8 Q18 8 13 11 Z" fill="${c.hair}"/>
    <path d="M15 13 Q24 18 34 13" fill="none" stroke="${c.hair}" stroke-width="2.5" stroke-linecap="round"/>
  `;
}

function glasses(c, eyeDx) {
  if (c.glasses === "rect") {
    return `<g fill="none" stroke="#15191f" stroke-width="1"><rect x="${24 - eyeDx - 3}" y="9.7" width="5.3" height="4.4" rx="1"/><rect x="${24 + eyeDx - 2.3}" y="9.7" width="5.3" height="4.4" rx="1"/><path d="M22 12 L26 12"/></g>`;
  }
  return `<g fill="none" stroke="#15191f" stroke-width="1"><circle cx="${24 - eyeDx}" cy="12" r="3.1"/><circle cx="${24 + eyeDx}" cy="12" r="3.1"/><path d="M22 12 L26 12"/></g>`;
}

function tool(c, p) {
  if (!c.ruler) return "";
  const action = p.toolAction || p.kind === "pound";
  const x1 = action ? 31 : 34;
  const y1 = action ? 16 : 25;
  const x2 = action ? 41 : 32;
  const y2 = action ? 35 : 43;
  return `<g stroke="${c.accent}" stroke-width="2.4" stroke-linecap="round"><path d="M${x1} ${y1} L${x2} ${y2}"/></g><g stroke="#7b552b" stroke-width=".6"><path d="M${x1 + 1} ${y1 + 3} L${x1 + 3} ${y1 + 7}"/><path d="M${x1 + 3} ${y1 + 7} L${x1 + 5} ${y1 + 11}"/></g>`;
}
