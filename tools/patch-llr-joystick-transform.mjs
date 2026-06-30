import { readFileSync, writeFileSync } from "node:fs";

const path = "public/llr-mariorun/launcher.js";
let text = readFileSync(path, "utf8");

const oldBlock = `  const pointerDeltaInJoystickSpace = (event) => {\n    const rect = joystick.getBoundingClientRect();\n    const centerX = rect.left + rect.width / 2;\n    const centerY = rect.top + rect.height / 2;\n    let x = event.clientX - centerX;\n    let y = event.clientY - centerY;\n    const host = joystick.closest(".game-frame-shell");\n    const transform = host ? getComputedStyle(host).transform : "none";\n    if (transform && transform !== "none" && window.DOMMatrixReadOnly) {\n      try {\n        const matrix = new DOMMatrixReadOnly(transform);\n        const inverse = new DOMMatrixReadOnly([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]).inverse();\n        const localX = inverse.a * x + inverse.c * y;\n        const localY = inverse.b * x + inverse.d * y;\n        x = localX;\n        y = localY;\n      } catch {\n        // Fall back to viewport deltas when a browser cannot invert the matrix.\n      }\n    }\n    return { x, y, radius: Math.min(rect.width, rect.height) / 2 };\n  };`;

const newBlock = `  const pointerDeltaInJoystickSpace = (event) => {\n    const rect = joystick.getBoundingClientRect();\n    const centerX = rect.left + rect.width / 2;\n    const centerY = rect.top + rect.height / 2;\n    let x = event.clientX - centerX;\n    let y = event.clientY - centerY;\n    const host = joystick.closest(".game-frame-shell");\n    const transform = host ? getComputedStyle(host).transform : "none";\n    const MatrixCtor = window.DOMMatrixReadOnly || window.DOMMatrix || window.WebKitCSSMatrix;\n    if (transform && transform !== "none" && MatrixCtor) {\n      try {\n        const matrix = new MatrixCtor(transform);\n        const det = matrix.a * matrix.d - matrix.b * matrix.c;\n        if (Math.abs(det) > 0.0001) {\n          const localX = (matrix.d * x - matrix.c * y) / det;\n          const localY = (-matrix.b * x + matrix.a * y) / det;\n          x = localX;\n          y = localY;\n        }\n      } catch {\n        // Fall back to viewport deltas when a browser cannot parse the matrix.\n      }\n    }\n    return { x, y, radius: Math.min(rect.width, rect.height) / 2 };\n  };`;

const originalUpdate = `  const update = (event) => {\n    const rect = joystick.getBoundingClientRect();\n    const radius = Math.min(rect.width, rect.height) / 2;\n    const centerX = rect.left + rect.width / 2;\n    const centerY = rect.top + rect.height / 2;\n    const rawX = event.clientX - centerX;\n    const rawY = event.clientY - centerY;\n    const distance = Math.min(radius, Math.hypot(rawX, rawY));\n    const angle = Math.atan2(rawY, rawX);\n    const x = Math.cos(angle) * distance;\n    const y = Math.sin(angle) * distance;`;
const patchedUpdate = `${newBlock}\n  const update = (event) => {\n    const { x: rawX, y: rawY, radius } = pointerDeltaInJoystickSpace(event);\n    const distance = Math.min(radius, Math.hypot(rawX, rawY));\n    const angle = Math.atan2(rawY, rawX);\n    const x = Math.cos(angle) * distance;\n    const y = Math.sin(angle) * distance;`;

if (text.includes(oldBlock)) {
  text = text.replace(oldBlock, newBlock);
} else if (!text.includes("pointerDeltaInJoystickSpace")) {
  if (!text.includes(originalUpdate)) throw new Error("joystick update block not found");
  text = text.replace(originalUpdate, patchedUpdate);
}

writeFileSync(path, text);
console.log("llr joystick transform patch complete");
