import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import net from "node:net";
import dgram from "node:dgram";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const listeners = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: "Modular Site Client",
    backgroundColor: "#fbfaf6",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "renderer.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("pick-file", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openFile"] });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const stat = await fs.promises.stat(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stat.size
  };
});

ipcMain.handle("read-file", async (_event, filePath) => {
  const bytes = await fs.promises.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
});

ipcMain.handle("save-file", async (_event, { name, bytes }) => {
  const result = await dialog.showSaveDialog({ defaultPath: name || "received-file" });
  if (result.canceled || !result.filePath) return null;
  await fs.promises.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});

ipcMain.handle("start-port", async (_event, { protocol, port }) => {
  const key = `${protocol}:${port}`;
  if (listeners.has(key)) return { ok: true, key };

  if (protocol === "tcp") {
    const server = net.createServer((socket) => {
      socket.write("Modular Site Client TCP listener is ready. Remote forwarding uses WebRTC channels.\n");
      socket.end();
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(port), "127.0.0.1", resolve);
    });
    listeners.set(key, server);
    return { ok: true, key };
  }

  if (protocol === "udp") {
    const socket = dgram.createSocket("udp4");
    socket.on("message", (message, remote) => {
      socket.send(Buffer.from(`Modular Site Client UDP listener received ${message.length} bytes`), remote.port, remote.address);
    });
    await new Promise((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(Number(port), "127.0.0.1", resolve);
    });
    listeners.set(key, socket);
    return { ok: true, key };
  }

  throw new Error("Unsupported protocol");
});

ipcMain.handle("stop-port", async (_event, key) => {
  const listener = listeners.get(key);
  if (!listener) return { ok: true };
  if (typeof listener.close === "function") listener.close();
  listeners.delete(key);
  return { ok: true };
});
