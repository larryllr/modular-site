const storageKey = "cloudflare-modular-site.checklist";

const items = [
  "安装依赖",
  "运行本地开发",
  "生成 Worker 类型",
  "部署到 Cloudflare",
  "接入自定义域名"
];

export default {
  id: "checklist",
  name: "发布",
  icon: "DP",
  category: "workflow",
  description: "跟踪从本地开发到 Cloudflare 上线的关键步骤。",
  defaultEnabled: true,
  mount() {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const el = document.createElement("div");
    const list = document.createElement("ul");
    list.className = "list";

    for (const item of items) {
      const li = document.createElement("li");
      const id = item.toLowerCase().replace(/\s+/g, "-");
      li.innerHTML = `
        <label>
          <input type="checkbox" ${saved[id] ? "checked" : ""} />
          <strong>${item}</strong>
        </label>
      `;
      li.querySelector("input").addEventListener("change", (event) => {
        saved[id] = event.currentTarget.checked;
        localStorage.setItem(storageKey, JSON.stringify(saved));
      });
      list.append(li);
    }

    el.append(list);
    return el;
  }
};
