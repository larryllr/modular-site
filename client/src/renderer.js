const $ = (id) => document.querySelector(`#${id}`);
const state = {
  peerId: crypto.randomUUID(),
  peers: new Map(),
  channels: new Map(),
  processed: new Set(),
  incoming: new Map(),
  since: 0,
  file: null,
  filePath: "",
  timer: 0,
  localStream: null
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

function log(message) {
  const item = document.createElement("p");
  item.textContent = `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} ${message}`;
  $("log").prepend(item);
}

function apiBase() {
  return $("site").value.replace(/\/+$/, "");
}

function roomId() {
  return $("room").value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "public";
}

async function getJson(path) {
  const response = await fetch(`${apiBase()}${path}`);
  if (!response.ok) throw new Error(`请求失败 ${response.status}`);
  return response.json();
}

async function postJson(path, body) {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `请求失败 ${response.status}`);
  }
  return response.json();
}

function profile() {
  return {
    name: $("name").value.trim() || "桌面客户端",
    protocol: $("protocol").value.toUpperCase(),
    port: $("port").value.trim() || "未设置"
  };
}

function postSignal(type, payload = {}, to = "") {
  return postJson(`/api/p2p-signal?room=${encodeURIComponent(roomId())}`, {
    peerId: state.peerId,
    name: profile().name,
    type,
    to,
    payload
  });
}

function setupChannel(remoteId, channel) {
  state.channels.set(remoteId, channel);
  channel.binaryType = "arraybuffer";
  channel.addEventListener("open", () => {
    channel.send(JSON.stringify({ kind: "profile", ...profile() }));
    log("已建立 WebRTC 数据通道。");
    renderPeers();
  });
  channel.addEventListener("close", renderPeers);
  channel.addEventListener("message", (event) => handleData(remoteId, event.data));
}

function ensurePeer(remoteId, active) {
  if (remoteId === state.peerId) return null;
  if (state.peers.has(remoteId)) return state.peers.get(remoteId);
  const pc = new RTCPeerConnection(rtcConfig);
  state.peers.set(remoteId, pc);
  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate) postSignal("candidate", event.candidate.toJSON(), remoteId).catch(() => {});
  });
  pc.addEventListener("datachannel", (event) => setupChannel(remoteId, event.channel));
  pc.addEventListener("track", (event) => showStream(remoteId, event.streams[0]));
  pc.addEventListener("connectionstatechange", () => {
    if (["failed", "disconnected"].includes(pc.connectionState)) {
      log("连接失败或中断，严格 NAT 可能需要 TURN 中继。");
    }
    renderPeers();
  });
  if (active) {
    setupChannel(remoteId, pc.createDataChannel("files"));
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => postSignal("offer", pc.localDescription, remoteId))
      .catch((error) => log(error.message));
  }
  return pc;
}

async function handleSignal(message) {
  if (state.processed.has(message.id) || message.from === state.peerId) return;
  state.processed.add(message.id);
  const pc = ensurePeer(message.from, state.peerId < message.from);
  if (!pc) return;
  if (message.type === "offer") {
    await pc.setRemoteDescription(message.payload);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await postSignal("answer", pc.localDescription, message.from);
  } else if (message.type === "answer") {
    await pc.setRemoteDescription(message.payload);
  } else if (message.type === "candidate") {
    await pc.addIceCandidate(message.payload);
  } else if (message.type === "stream-request") {
    await handleStreamRequest(message.from, message.payload || {});
  }
}

async function poll() {
  try {
    await postSignal("heartbeat", profile());
    const payload = await getJson(`/api/p2p-signal?room=${encodeURIComponent(roomId())}&peer=${encodeURIComponent(state.peerId)}&since=${state.since}`);
    state.since = payload.now || state.since;
    for (const peer of payload.peers || []) {
      if (peer.id !== state.peerId && state.peerId < peer.id) ensurePeer(peer.id, true);
    }
    for (const message of payload.messages || []) await handleSignal(message);
    renderPeers(payload.peers || []);
    $("status").textContent = `已连接房间 ${roomId()}`;
  } catch (error) {
    log(error.message);
  }
  state.timer = window.setTimeout(poll, 1600);
}

function renderPeers(peers = []) {
  const root = $("peers");
  const list = peers.filter((peer) => peer.id !== state.peerId);
  root.replaceChildren();
  if (!list.length) {
    root.append(hint("暂无其他在线设备。"));
    return;
  }
  for (const peer of list) {
    const channel = state.channels.get(peer.id);
    const row = document.createElement("div");
    row.className = "peer";
    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "串流密码";
    const request = button("请求串流");
    request.addEventListener("click", () => postSignal("stream-request", { password: password.value }, peer.id));
    row.append(text(`${peer.name || "设备"} · ${channel?.readyState || "连接中"}`), password, request);
    root.append(row);
  }
}

async function handleStreamRequest(remoteId, payload) {
  const expected = $("streamPassword").value;
  if (!payload.admin && (!expected || payload.password !== expected)) {
    log("收到串流请求，但密码不正确。");
    return;
  }
  await startShare(remoteId);
}

async function startShare(remoteId = "") {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    log("当前系统不支持屏幕捕获。");
    return;
  }
  if (!state.localStream) state.localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  const targets = remoteId ? [remoteId] : [...state.peers.keys()];
  for (const id of targets) {
    const pc = ensurePeer(id, true);
    for (const track of state.localStream.getTracks()) {
      if (!pc.getSenders().some((sender) => sender.track === track)) pc.addTrack(track, state.localStream);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal("offer", pc.localDescription, id);
  }
  log("已发起屏幕共享。");
}

function showStream(remoteId, stream) {
  const card = document.createElement("article");
  card.className = "stream-card";
  const video = document.createElement("video");
  video.autoplay = true;
  video.controls = true;
  video.srcObject = stream;
  card.append(text(`来自 ${remoteId.slice(0, 8)} 的串流`), video);
  $("streams").prepend(card);
}

async function sendFile() {
  if (!state.filePath) return;
  const bytes = await window.clientApi.readFile(state.filePath);
  const open = [...state.channels.values()].filter((channel) => channel.readyState === "open");
  for (const channel of open) {
    channel.send(JSON.stringify({ kind: "file-meta", id: crypto.randomUUID(), name: state.file.name, size: state.file.size }));
    channel.send(bytes);
    channel.send(JSON.stringify({ kind: "file-end" }));
  }
  log(`已发送 ${state.file.name}`);
}

async function handleData(_remoteId, data) {
  if (typeof data === "string") {
    const message = JSON.parse(data);
    if (message.kind === "file-meta") state.incoming.set("latest", { ...message, chunks: [] });
    if (message.kind === "file-end") {
      const item = state.incoming.get("latest");
      if (item) {
        const size = item.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of item.chunks) {
          bytes.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
        const saved = await window.clientApi.saveFile({ name: item.name, bytes: bytes.buffer });
        if (saved) log(`已保存文件：${saved}`);
      }
    }
    return;
  }
  const item = state.incoming.get("latest");
  if (item) item.chunks.push(data);
}

function button(label) {
  const el = document.createElement("button");
  el.textContent = label;
  return el;
}

function text(value) {
  const el = document.createElement("p");
  el.textContent = value;
  return el;
}

function hint(value) {
  const el = document.createElement("p");
  el.className = "hint";
  el.textContent = value;
  return el;
}

$("name").value = localStorage.getItem("modular-client-name") || `设备-${state.peerId.slice(0, 4)}`;
$("join").addEventListener("click", () => {
  localStorage.setItem("modular-client-name", $("name").value);
  window.clearTimeout(state.timer);
  poll();
});
$("pickFile").addEventListener("click", async () => {
  const file = await window.clientApi.pickFile();
  if (!file) return;
  state.file = file;
  state.filePath = file.path;
  $("fileInfo").textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;
  $("sendFile").disabled = false;
});
$("sendFile").addEventListener("click", sendFile);
$("share").addEventListener("click", () => startShare());
$("startPort").addEventListener("click", async () => {
  const result = await window.clientApi.startPort({ protocol: $("protocol").value, port: $("port").value });
  log(`本地监听已启动：${result.key}`);
});
