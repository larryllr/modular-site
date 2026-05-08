export default {
  id: "overview",
  name: "总览",
  icon: "OV",
  category: "system",
  description: "集中展示当前功能模块和运行状态。",
  defaultEnabled: true,
  mount({ state }) {
    const enabled = [...state.enabled.entries()]
      .filter(([, value]) => value)
      .map(([id]) => state.modules.find((module) => module.id === id)?.name)
      .filter(Boolean);

    const el = document.createElement("div");
    el.innerHTML = `
      <div class="pill-row">
        ${enabled.map((name) => `<span class="pill">${name}</span>`).join("")}
      </div>
      <ul class="list">
        <li><strong>${state.modules.length}</strong><span>已注册前端模块</span></li>
        <li><strong>${enabled.length}</strong><span>当前启用模块</span></li>
      </ul>
    `;
    return el;
  }
};
