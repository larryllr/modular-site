import { readFileSync, writeFileSync } from "node:fs";

const path = "public/llr-mariorun/launcher.js";
let text = readFileSync(path, "utf8");

const newBlock = `  const pointerDeltaInJoystickSpace = (event) => {\n    const rect = joystick.getBoundingClientRect();\n    const scrollX = window.scrollX || window.pageXOffset || 0;\n    const scrollY = window.scrollY || window.pageYOffset || 0;\n    const viewport = window.visualViewport;\n    const viewportOffsetX = viewport && !document.fullscreenElement ? viewport.offsetLeft || 0 : 0;\n    const viewportOffsetY = viewport && !document.fullscreenElement ? viewport.offsetTop || 0 : 0;\n    const centerX = rect.left + scrollX + rect.width / 2;\n    const centerY = rect.top + scrollY + rect.height / 2;\n    let x = (event.pageX || event.clientX + scrollX + viewportOffsetX) - centerX;\n    let y = (event.pageY || event.clientY + scrollY + viewportOffsetY) - centerY;\n    if ((event.pageX == null || event.pageY == null) && (viewportOffsetX || viewportOffsetY)) {\n      x += viewportOffsetX;\n      y += viewportOffsetY;\n    }\n    const host = joystick.closest(".game-frame-shell");\n    const transform = host ? getComputedStyle(host).transform : "none";\n    const MatrixCtor = window.DOMMatrixReadOnly || window.DOMMatrix || window.WebKitCSSMatrix;\n    if (transform && transform !== "none" && MatrixCtor) {\n      try {\n        const matrix = new MatrixCtor(transform);\n        const det = matrix.a * matrix.d - matrix.b * matrix.c;\n        if (Math.abs(det) > 0.0001) {\n          const localX = (matrix.d * x - matrix.c * y) / det;\n          const localY = (-matrix.b * x + matrix.a * y) / det;\n          x = localX;\n          y = localY;\n        }\n      } catch {\n        // Fall back to viewport deltas when a browser cannot parse the matrix.\n      }\n    }\n    return { x, y, radius: Math.min(rect.width, rect.height) / 2 };\n  };`;

const oldBlockRegex = /  const pointerDeltaInJoystickSpace = \(event\) => \{[\s\S]*?\n  \};\n  const update = \(event\) => \{/;
const replacement = `${newBlock}\n  const update = (event) => {`;

if (oldBlockRegex.test(text)) {
  text = text.replace(oldBlockRegex, replacement);
} else {
  const originalUpdate = `  const update = (event) => {\n    const rect = joystick.getBoundingClientRect();\n    const radius = Math.min(rect.width, rect.height) / 2;\n    const centerX = rect.left + rect.width / 2;\n    const centerY = rect.top + rect.height / 2;\n    const rawX = event.clientX - centerX;\n    const rawY = event.clientY - centerY;\n    const distance = Math.min(radius, Math.hypot(rawX, rawY));\n    const angle = Math.atan2(rawY, rawX);\n    const x = Math.cos(angle) * distance;\n    const y = Math.sin(angle) * distance;`;
  const patchedUpdate = `${newBlock}\n  const update = (event) => {\n    const { x: rawX, y: rawY, radius } = pointerDeltaInJoystickSpace(event);\n    const distance = Math.min(radius, Math.hypot(rawX, rawY));\n    const angle = Math.atan2(rawY, rawX);\n    const x = Math.cos(angle) * distance;\n    const y = Math.sin(angle) * distance;`;
  if (!text.includes(originalUpdate)) throw new Error("joystick update block not found");
  text = text.replace(originalUpdate, patchedUpdate);
}

writeFileSync(path, text);
console.log("llr joystick transform patch complete");
