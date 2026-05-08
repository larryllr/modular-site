export default {
  id: "api-status",
  name: "API",
  icon: "AP",
  category: "tools",
  description: "查看 Worker API 的健康状态和服务端模块。",
  defaultEnabled: true,
  mount({ api }) {
    const el = document.createElement("div");
    el.innerHTML = `
      <div class="module-actions">
        <button class="button primary" type="button">刷新</button>
        <button class="button" type="button">测试 Echo</button>
      </div>
      <ul class="list" aria-live="polite"></ul>
    `;

    const list = el.querySelector(".list");
    const [refreshButton, echoButton] = el.querySelectorAll("button");

    const renderItems = (items) => {
      list.replaceChildren(
        ...items.map((item) => {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`;
          return li;
        })
      );
    };

    const refresh = async () => {
      renderItems([{ title: "请求中", detail: "正在读取 Worker 状态" }]);
      try {
        const [health, modules] = await Promise.all([
          api.getJson("/api/health"),
          api.getJson("/api/modules")
        ]);
        renderItems([
          { title: health.service, detail: health.timestamp },
          { title: `${modules.total} 个服务端模块`, detail: modules.modules.map((item) => item.name).join(" / ") }
        ]);
      } catch (error) {
        renderItems([{ title: "请求失败", detail: error.message }]);
      }
    };

    refreshButton.addEventListener("click", refresh);
    echoButton.addEventListener("click", async () => {
      const payload = await api.postJson("/api/echo", {
        source: "api-status",
        message: "hello cloudflare"
      });
      renderItems([{ title: "Echo", detail: JSON.stringify(payload.received) }]);
    });

    refresh();
    return el;
  }
};
