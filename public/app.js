import { moduleLoaders } from "./modules/manifest.js";

const state = {
  modules: [],
  activeFilter: "all",
  activeModuleId: "",
  enabled: new Map()
};

const elements = {
  moduleNav: document.querySelector("#moduleNav"),
  moduleGrid: document.querySelector("#moduleGrid"),
  clientModuleCount: document.querySelector("#clientModuleCount"),
  enabledModuleCount: document.querySelector("#enabledModuleCount"),
  apiState: document.querySelector("#apiState"),
  featureMap: document.querySelector("#featureMap")
};

const storageKey = "cloudflare-modular-site.enabled";

init();

async function init() {
  const loaded = await Promise.all(moduleLoaders.map((entry) => entry.load()));
  state.modules = loaded.map((module) => module.default);
  state.activeModuleId = state.modules[0]?.id ?? "";
  restoreEnabledState();
  bindToolbar();
  render();
  drawFeatureMap();
  await checkApi();
}

function restoreEnabledState() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

  for (const module of state.modules) {
    state.enabled.set(module.id, saved[module.id] ?? module.defaultEnabled ?? true);
  }
}

function saveEnabledState() {
  localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(state.enabled)));
}

function bindToolbar() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      render();
    });
  });
}

function getVisibleModules() {
  return state.modules.filter((module) => {
    if (state.activeFilter === "enabled") {
      return state.enabled.get(module.id);
    }

    if (state.activeFilter === "tools") {
      return module.category === "tools";
    }

    return true;
  });
}

function render() {
  renderNav();
  renderCards();
  updateMetrics();
  drawFeatureMap();
}

function renderNav() {
  elements.moduleNav.replaceChildren(
    ...state.modules.map((module) => {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("is-active", module.id === state.activeModuleId);
      button.innerHTML = `
        <span class="nav-icon" aria-hidden="true">${module.icon}</span>
        <span>
          <strong>${module.name}</strong>
          <small>${module.category}</small>
        </span>
      `;
      button.addEventListener("click", () => {
        state.activeModuleId = module.id;
        render();
      });
      return button;
    })
  );
}

function renderCards() {
  const context = {
    state,
    refresh: render,
    api: {
      getJson: async (path) => {
        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
      },
      postJson: async (path, body) => {
        const response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
      }
    }
  };

  elements.moduleGrid.replaceChildren(
    ...getVisibleModules().map((module) => {
      const enabled = state.enabled.get(module.id);
      const card = document.createElement("article");
      card.className = "module-card";
      card.classList.toggle("is-disabled", !enabled);

      const template = document.querySelector("#moduleToggleTemplate");
      const toggle = template.content.firstElementChild.cloneNode(true);
      const input = toggle.querySelector("input");
      input.checked = enabled;
      input.setAttribute("aria-label", `${module.name}开关`);
      input.addEventListener("change", () => {
        state.enabled.set(module.id, input.checked);
        saveEnabledState();
        render();
      });

      const header = document.createElement("header");
      header.className = "module-card-header";
      header.innerHTML = `
        <span class="module-icon" aria-hidden="true">${module.icon}</span>
        <div>
          <h2>${module.name}</h2>
          <p>${module.description}</p>
        </div>
      `;
      header.append(toggle);

      const body = document.createElement("div");
      body.className = "module-body";
      body.append(module.mount(context));

      card.append(header, body);
      return card;
    })
  );
}

function updateMetrics() {
  const enabledCount = [...state.enabled.values()].filter(Boolean).length;
  elements.clientModuleCount.textContent = String(state.modules.length);
  elements.enabledModuleCount.textContent = String(enabledCount);
}

async function checkApi() {
  try {
    const data = await fetch("/api/health").then((response) => response.json());
    elements.apiState.textContent = data.ok ? "在线" : "异常";
  } catch {
    elements.apiState.textContent = "离线";
  }
}

function drawFeatureMap() {
  const canvas = elements.featureMap;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const modules = state.modules;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(0, 0, width, height);

  const center = { x: width * 0.5, y: height * 0.5 };
  const radius = Math.min(width, height) * 0.34;

  modules.forEach((module, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(modules.length, 1) - Math.PI / 2;
    const x = center.x + Math.cos(angle) * radius * 2.2;
    const y = center.y + Math.sin(angle) * radius;
    const enabled = state.enabled.get(module.id);

    ctx.strokeStyle = enabled ? "#0f766e" : "#cfd7d1";
    ctx.lineWidth = enabled ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = enabled ? "#dff4ee" : "#edf0eb";
    ctx.beginPath();
    ctx.arc(x, y, enabled ? 18 : 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = enabled ? "#115e59" : "#69756f";
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(module.icon, x, y);
  });

  ctx.fillStyle = "#17201d";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORE", center.x, center.y);
}
