import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("clientApi", {
  pickFile: () => ipcRenderer.invoke("pick-file"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  saveFile: (payload) => ipcRenderer.invoke("save-file", payload),
  startPort: (payload) => ipcRenderer.invoke("start-port", payload),
  stopPort: (key) => ipcRenderer.invoke("stop-port", key)
});
