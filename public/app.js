import { moduleLoaders } from "./modules/manifest.js";

const app = document.querySelector("#app");
const adminTokenKey = "cloudflare-modular-site.admin-token";

const fallbackConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  homeTitle: "功能入口",
  homeDescription: "这里是所有分页面的入口。管理员可以在 /admin 添加页面、分配模块和修改标题。",
  pages: [
    {
      id: "workspace",
      slug: "workspace",
      title: "模块工作台",
      description: "集中查看站点状态、便签、API 和发布清单。",
      visible: true,
      modules: ["overview", "notes", "api-status", "checklist"],
      blocks: [
        {
          id: "welcome",
          type: "text",
          icon: "IN",
          title: "开始使用",
          description: "这个文本模块可以在后台修改或删除。",
          body: "进入 /admin 后，可以新增分页面、修改页面标题、为页面勾选系统模块，也可以添加自定义文本模块。"
        }
      ],
      sections: [
        { id: "section-overview", type: "system", moduleId: "overview" },
        { id: "section-notes", type: "system", moduleId: "notes" },
        { id: "section-api-status", type: "system", moduleId: "api-status" },
        { id: "section-checklist", type: "system", moduleId: "checklist" },
        {
          id: "welcome",
          type: "text",
          icon: "IN",
          title: "开始使用",
          description: "这个文本模块可以在后台修改或删除。",
          body: "进入 /admin 后，可以新增分页面、修改页面标题、为页面勾选系统模块，也可以添加自定义文本模块。"
        }
      ]
    }
  ]
};

const state = {
  modules: [],
  config: fallbackConfig,
  token: localStorage.getItem(adminTokenKey) || "",
  selectedPageId: "",
  saveStatus: ""
};

const api = {
  getJson: async (path, useAuth = false) => {
    const response = await fetch(path, requestOptions("GET", undefined, useAuth));

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  },
  postJson: async (path, body, useAuth = false) => {
    const response = await fetch(path, requestOptions("POST", body, useAuth));

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }
};

init();

async function init() {
  const loaded = await Promise.all(moduleLoaders.map((entry) => entry.load()));
  state.modules = loaded.map((module) => module.default);

  if (getRouteSlug() === "admin") {
    await renderAdmin();
    return;
  }

  state.config = hydrateConfig(await loadPublicConfig());
  renderPublicSite();
}

function requestOptions(method, body, useAuth) {
  const headers = new Headers();

  if (body) {
    headers.set("content-type", "application/json");
  }

  if (useAuth && state.token) {
    headers.set("authorization", `Bearer ${state.token}`);
  }

  return {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
}

async function loadPublicConfig() {
  try {
    const payload = await api.getJson("/api/site-config");

    return payload.config || fallbackConfig;
  } catch {
    return fallbackConfig;
  }
}

async function renderAdmin() {
  if (!state.token) {
    renderLogin();
    return;
  }

  try {
    const payload = await api.getJson("/api/admin/config", true);
    state.config = hydrateConfig(payload.config);
    state.selectedPageId = state.selectedPageId || state.config.pages[0]?.id || "";
    renderAdminEditor();
  } catch {
    state.token = "";
    localStorage.removeItem(adminTokenKey);
    renderLogin("登录已过期，请重新输入管理员密码。");
  }
}

function renderLogin(message = "") {
  setAppClass("login-screen");

  const panel = element("section", "login-panel");
  const brand = element("div", "brand");
  brand.append(mark("AD"), textBlock("管理员界面", "输入密码后管理分页面和模块"));

  const form = element("form", "login-form");
  const password = document.createElement("input");
  password.className = "input";
  password.type = "password";
  password.placeholder = "管理员密码";
  password.autocomplete = "current-password";
  password.required = true;

  const submit = button("登录", "button primary", "submit");
  const help = element("p", "form-hint", "管理员密码请查看 README。上线后可用 Cloudflare 变量 admin 修改。");
  const feedback = element("p", "form-error", message);

  form.append(password, submit, help, feedback);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "登录中";
    feedback.textContent = "";

    try {
      const payload = await api.postJson("/api/admin/login", { password: password.value });
      state.token = payload.token;
      state.config = hydrateConfig(payload.config);
      state.selectedPageId = state.config.pages[0]?.id || "";
      localStorage.setItem(adminTokenKey, state.token);
      renderAdminEditor();
    } catch (error) {
      feedback.textContent = error.message;
      submit.disabled = false;
      submit.textContent = "登录";
    }
  });

  panel.append(brand, form);
  app.replaceChildren(panel);
  password.focus();
}

function renderAdminEditor() {
  setAppClass("admin-shell");

  const sidebar = element("aside", "sidebar admin-sidebar");
  const brand = element("div", "brand");
  brand.append(mark("AD"), textBlock("站点后台", "预览式页面编辑"));

  const pageNav = element("nav", "module-nav");
  for (const page of state.config.pages) {
    const item = document.createElement("button");
    item.type = "button";
    item.classList.toggle("is-active", page.id === state.selectedPageId);
    item.append(mark(page.visible ? "PG" : "HD"), textBlock(page.title, `/${page.slug}`));
    item.addEventListener("click", () => {
      state.selectedPageId = page.id;
      renderAdminEditor();
    });
    pageNav.append(item);
  }

  const addPageButton = button("新增分页面", "button primary", "button");
  addPageButton.addEventListener("click", () => {
    const page = createPage();
    state.config.pages.push(page);
    state.selectedPageId = page.id;
    renderAdminEditor();
  });

  const homeButton = button("查看主页", "button", "button");
  homeButton.addEventListener("click", () => {
    window.location.href = "/";
  });

  const logoutButton = button("退出登录", "button", "button");
  logoutButton.addEventListener("click", () => {
    state.token = "";
    localStorage.removeItem(adminTokenKey);
    renderLogin();
  });

  const sidebarActions = element("div", "sidebar-actions");
  sidebarActions.append(addPageButton, homeButton, logoutButton);
  sidebar.append(brand, pageNav, sidebarActions);

  const main = element("main", "admin-workspace");
  const selectedPage = getSelectedPage();
  const title = element("header", "workspace-header compact");
  const titleText = element("div");
  titleText.append(element("p", "eyebrow", "Preview Admin"), element("h1", "", "预览模式编辑"));
  title.append(titleText);

  main.append(title, renderHomeSettings());

  if (selectedPage) {
    main.append(renderPreviewEditor(selectedPage));
  }

  main.append(renderSaveBar(selectedPage));
  app.replaceChildren(sidebar, main);
}

function renderHomeSettings() {
  const panel = element("section", "admin-panel");
  panel.append(element("h2", "", "主页入口设置"));
  panel.append(
    field("主页标题", state.config.homeTitle, (value) => {
      state.config.homeTitle = value;
    })
  );
  panel.append(
    areaField("主页说明", state.config.homeDescription, (value) => {
      state.config.homeDescription = value;
    })
  );
  return panel;
}

function renderPreviewEditor(page) {
  const panel = element("section", "admin-panel preview-editor");
  const head = element("div", "section-head action-head");
  const copy = element("div");
  copy.append(element("h2", "", "分页面预览"));
  copy.append(element("p", "", "在预览里插入、编辑、移动模块。保存后前台页面立即使用这套顺序。"));

  const headActions = element("div", "module-actions");
  const view = button(`打开 /${page.slug}`, "button", "button");
  view.addEventListener("click", () => {
    window.open(`/${page.slug}`, "_blank", "noopener,noreferrer");
  });
  const removePage = button("删除页面", "button danger", "button");
  removePage.addEventListener("click", () => deletePage(page));
  headActions.append(view, removePage);
  head.append(copy, headActions);

  const canvas = element("div", "page-preview");
  canvas.append(renderEditablePageHeader(page));
  canvas.append(renderInsertBar(page, 0));

  page.sections.forEach((section, index) => {
    canvas.append(renderEditableSection(page, section, index));
    canvas.append(renderInsertBar(page, index + 1));
  });

  if (page.sections.length === 0) {
    canvas.append(element("p", "empty-state", "这个分页面还没有内容。可以从上面的插入条添加模块。"));
  }

  panel.append(head, canvas);
  return panel;
}

function renderEditablePageHeader(page) {
  const header = element("section", "preview-page-header");
  const meta = element("div", "preview-meta");
  const slugField = field("网址后缀", page.slug, (value) => {
    page.slug = normalizeSlug(value);
  });
  const visible = checkbox("在主页显示入口", page.visible, (checked) => {
    page.visible = checked;
  });
  meta.append(slugField, visible);

  const title = document.createElement("input");
  title.className = "preview-title-input";
  title.value = page.title;
  title.setAttribute("aria-label", "页面标题");
  title.addEventListener("input", () => {
    page.title = title.value;
  });

  const desc = document.createElement("textarea");
  desc.className = "preview-description-input";
  desc.value = page.description;
  desc.setAttribute("aria-label", "页面说明");
  desc.addEventListener("input", () => {
    page.description = desc.value;
  });

  header.append(meta, title, desc);
  return header;
}

function renderInsertBar(page, index) {
  const bar = element("div", "insert-bar");
  bar.append(element("span", "", index === 0 ? "在页面开头插入" : "在这里插入"));

  const system = button("系统模块", "button", "button");
  system.addEventListener("click", () => insertSection(page, index, createSystemSection()));
  const text = button("文本模块", "button", "button");
  text.addEventListener("click", () => insertSection(page, index, createTextSection()));
  const image = button("图片模块", "button primary", "button");
  image.addEventListener("click", () => insertSection(page, index, createImageSection()));

  bar.append(system, text, image);
  return bar;
}

function renderEditableSection(page, section, index) {
  const shell = element("section", `editable-section editable-${section.type}`);
  shell.append(renderSectionControls(page, section, index));

  if (section.type === "system") {
    shell.append(renderEditableSystemSection(page, section));
  } else if (section.type === "image") {
    shell.append(renderEditableImageSection(section));
  } else {
    shell.append(renderEditableTextSection(section));
  }

  return shell;
}

function renderSectionControls(page, section, index) {
  const controls = element("div", "section-controls");
  const label = sectionLabel(section);
  controls.append(element("strong", "", label));

  const tools = element("div", "section-tools");
  const up = button("上移", "button", "button");
  up.disabled = index === 0;
  up.addEventListener("click", () => moveSection(page, index, -1));
  const down = button("下移", "button", "button");
  down.disabled = index === page.sections.length - 1;
  down.addEventListener("click", () => moveSection(page, index, 1));
  const remove = button("删除", "button danger", "button");
  remove.addEventListener("click", () => {
    page.sections.splice(index, 1);
    renderAdminEditor();
  });
  tools.append(up, down, remove);
  controls.append(tools);
  return controls;
}

function renderEditableSystemSection(page, section) {
  const editor = element("div", "preview-section-body");
  editor.append(
    selectField(
      "系统模块",
      section.moduleId,
      state.modules.map((module) => [module.id, module.name]),
      (value) => {
        section.moduleId = value;
        renderAdminEditor();
      }
    )
  );

  const module = state.modules.find((item) => item.id === section.moduleId);

  if (module) {
    editor.append(renderModuleCard(module, moduleContext(page)));
  } else {
    editor.append(element("p", "empty-state", "请选择一个系统模块。"));
  }

  return editor;
}

function renderEditableTextSection(section) {
  const card = element("article", "module-card inline-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("图标", section.icon, (value) => {
      section.icon = value.slice(0, 3).toUpperCase();
    })
  );
  row.append(
    field("模块标题", section.title, (value) => {
      section.title = value;
    })
  );
  card.append(row);
  card.append(
    field("模块说明", section.description, (value) => {
      section.description = value;
    })
  );
  card.append(
    areaField("正文", section.body, (value) => {
      section.body = value;
    })
  );
  return card;
}

function renderEditableImageSection(section) {
  const card = element("article", "module-card inline-editor-card image-editor-card");
  const controls = element("div", "admin-row");
  controls.append(
    field("图片标题", section.title, (value) => {
      section.title = value;
    })
  );
  controls.append(
    selectField(
      "显示方式",
      section.display,
      [
        ["normal", "正常图片"],
        ["background", "作为背景"]
      ],
      (value) => {
        section.display = value;
        renderAdminEditor();
      }
    )
  );
  card.append(controls);
  card.append(
    field("图片说明", section.description, (value) => {
      section.description = value;
    })
  );
  card.append(
    field("图片地址", section.src, (value) => {
      section.src = value;
    }, "可以粘贴 https 图片地址，也可以上传本地图片。")
  );

  const uploadRow = element("div", "admin-row");
  const upload = imageUploadField(section);
  uploadRow.append(upload);
  uploadRow.append(
    selectField(
      "填充方式",
      section.fit,
      [
        ["cover", "铺满"],
        ["contain", "完整显示"]
      ],
      (value) => {
        section.fit = value;
        renderAdminEditor();
      }
    )
  );
  card.append(uploadRow);

  const meta = element("div", "admin-row");
  meta.append(
    field("替代文字", section.alt, (value) => {
      section.alt = value;
    })
  );
  meta.append(
    field("图片注释", section.caption, (value) => {
      section.caption = value;
    })
  );
  card.append(meta);
  card.append(renderImageSection(section));
  return card;
}

function imageUploadField(section) {
  const wrapper = element("label", "field image-uploader");
  wrapper.append(element("span", "", "上传图片"));
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    state.saveStatus = "正在处理图片...";
    renderAdminEditor();

    try {
      section.src = await imageFileToDataUrl(file);
      section.alt = section.alt || file.name.replace(/\.[^.]+$/, "");
      state.saveStatus = "图片已加入预览，记得保存配置。";
    } catch (error) {
      state.saveStatus = error.message;
    }

    renderAdminEditor();
  });
  wrapper.append(input, element("small", "", "会自动压缩到适合放进配置的尺寸。"));
  return wrapper;
}

function renderSaveBar(selectedPage) {
  const bar = element("div", "save-bar");
  const preview = button(selectedPage ? `预览 /${selectedPage.slug}` : "预览主页", "button", "button");
  preview.addEventListener("click", () => {
    window.open(selectedPage ? `/${selectedPage.slug}` : "/", "_blank", "noopener,noreferrer");
  });

  const save = button("保存配置", "button primary", "button");
  save.addEventListener("click", saveAdminConfig);
  bar.append(element("span", "save-status", state.saveStatus), preview, save);
  return bar;
}

async function saveAdminConfig() {
  state.saveStatus = "保存中...";
  renderAdminEditor();

  try {
    const payload = await api.postJson("/api/admin/config", { config: state.config }, true);
    state.config = hydrateConfig(payload.config);
    state.saveStatus = `已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
    renderAdminEditor();
  } catch (error) {
    state.saveStatus = error.message;
    renderAdminEditor();
  }
}

function renderPublicSite() {
  const slug = getRouteSlug();
  const pages = state.config.pages.filter((page) => page.visible);
  const page = slug ? pages.find((item) => item.slug === slug) : null;

  setAppClass("app-shell");
  app.append(renderPublicSidebar(slug, pages));

  if (!slug) {
    renderHome(pages);
    return;
  }

  if (!page) {
    renderNotFound(slug);
    return;
  }

  renderPage(page);
}

function renderPublicSidebar(slug, pages) {
  const sidebar = element("aside", "sidebar");
  const brand = element("div", "brand");
  brand.append(mark("CF"), textBlock("Modular Site", "Cloudflare Workers"));

  const nav = element("nav", "module-nav");
  nav.append(navLink("/", "HM", "主页入口", slug ? "所有分页面" : "当前页面", !slug));

  for (const page of pages) {
    nav.append(navLink(`/${page.slug}`, "PG", page.title, `/${page.slug}`, slug === page.slug));
  }

  nav.append(navLink("/admin", "AD", "管理员", "管理页面和模块", false));
  sidebar.append(brand, nav);
  return sidebar;
}

function renderHome(pages) {
  document.title = state.config.homeTitle;
  const main = element("main", "workspace");
  const header = element("header", "workspace-header");
  const copy = element("div");
  copy.append(element("p", "eyebrow", "Home"), element("h1", "", state.config.homeTitle));
  copy.append(element("p", "lead", state.config.homeDescription));
  const canvas = document.createElement("canvas");
  canvas.id = "featureMap";
  canvas.width = 520;
  canvas.height = 160;
  header.append(copy, canvas);
  main.append(header);
  main.append(
    renderStatusStrip([
      ["分页面", String(pages.length)],
      ["内容模块", String(pages.reduce((sum, page) => sum + page.sections.length, 0))],
      ["后台入口", "/admin"]
    ])
  );

  const grid = element("section", "module-grid");
  for (const page of pages) {
    grid.append(renderPageEntry(page));
  }
  main.append(grid);
  app.append(main);
  drawFeatureMap(canvas, pages);
}

function renderPage(page) {
  document.title = page.title;
  const main = element("main", "workspace");
  const header = element("header", "workspace-header compact");
  const copy = element("div");
  copy.append(element("p", "eyebrow", `/${page.slug}`), element("h1", "", page.title));
  copy.append(element("p", "lead", page.description));
  header.append(copy);
  main.append(header);
  main.append(
    renderStatusStrip([
      ["系统模块", String(page.sections.filter((section) => section.type === "system").length)],
      ["图片模块", String(page.sections.filter((section) => section.type === "image").length)],
      ["网址后缀", `/${page.slug}`]
    ])
  );

  const grid = element("section", "module-grid");
  const context = moduleContext(page);

  for (const section of page.sections) {
    const node = renderPublicSection(section, context);

    if (node) {
      grid.append(node);
    }
  }

  if (grid.childElementCount === 0) {
    grid.append(element("p", "empty-state", "这个分页面还没有模块。可以进入 /admin 添加。"));
  }

  main.append(grid);
  app.append(main);
}

function renderPublicSection(section, context) {
  if (section.type === "system") {
    const module = state.modules.find((item) => item.id === section.moduleId);

    return module ? renderModuleCard(module, context) : null;
  }

  if (section.type === "image") {
    return renderImageSection(section);
  }

  return renderBlockCard(section);
}

function renderNotFound(slug) {
  document.title = "页面不存在";
  const main = element("main", "workspace");
  const header = element("header", "workspace-header compact");
  const copy = element("div");
  copy.append(element("p", "eyebrow", "Not Found"), element("h1", "", "页面不存在"));
  copy.append(element("p", "lead", `没有找到 /${slug}，可以回到主页选择已有分页面。`));
  header.append(copy);
  main.append(header);
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = "/";
  link.textContent = "返回主页";
  main.append(link);
  app.append(main);
}

function renderStatusStrip(items) {
  const strip = element("section", "status-strip");

  for (const [label, value] of items) {
    const item = element("div");
    item.append(element("span", "metric-label", label), element("strong", "", value));
    strip.append(item);
  }

  return strip;
}

function renderPageEntry(page) {
  const card = element("article", "module-card entry-card");
  const header = element("header", "module-card-header");
  header.append(mark("PG"), textBlock(page.title, page.description));

  const link = document.createElement("a");
  link.className = "button primary";
  link.href = `/${page.slug}`;
  link.textContent = "进入";

  const pills = element("div", "pill-row");
  for (const section of page.sections.slice(0, 10)) {
    pills.append(element("span", "pill", sectionLabel(section)));
  }

  card.append(header, pills, link);
  return card;
}

function renderModuleCard(module, context) {
  const card = element("article", "module-card");
  const header = element("header", "module-card-header no-toggle");
  header.append(mark(module.icon), textBlock(module.name, module.description));
  const body = element("div", "module-body");
  body.append(module.mount(context));
  card.append(header, body);
  return card;
}

function renderBlockCard(block) {
  const card = element("article", "module-card");
  const header = element("header", "module-card-header no-toggle");
  header.append(mark(block.icon || "TX"), textBlock(block.title, block.description));
  const body = element("div", "module-body");
  for (const paragraph of block.body.split(/\n+/).filter(Boolean)) {
    body.append(element("p", "", paragraph));
  }
  card.append(header, body);
  return card;
}

function renderImageSection(section) {
  const card = element(
    "article",
    section.display === "background" ? "module-card image-background-section" : "module-card image-section"
  );

  if (section.display === "background" && section.src) {
    card.style.backgroundImage = `linear-gradient(90deg, rgba(23, 32, 29, 0.78), rgba(23, 32, 29, 0.24)), url("${cssUrl(section.src)}")`;
    card.style.backgroundSize = section.fit;
  }

  const header = element("header", "module-card-header no-toggle");
  header.append(mark("IM"), textBlock(section.title || "图片", section.description));
  card.append(header);

  if (section.display === "normal") {
    const frame = element("figure", "image-frame");
    if (section.src) {
      const image = document.createElement("img");
      image.src = section.src;
      image.alt = section.alt || section.title || "";
      image.style.objectFit = section.fit;
      frame.append(image);
    } else {
      frame.append(element("div", "image-placeholder", "还没有选择图片"));
    }

    if (section.caption) {
      frame.append(element("figcaption", "", section.caption));
    }

    card.append(frame);
  } else {
    const body = element("div", "module-body");
    body.append(element("p", "", section.caption || section.alt || "背景图片模块"));
    card.append(body);
  }

  return card;
}

function moduleContext(page) {
  const systemIds = page.sections.filter((section) => section.type === "system").map((section) => section.moduleId);
  const enabled = new Map(state.modules.map((module) => [module.id, systemIds.includes(module.id)]));

  return {
    state: {
      modules: state.modules,
      enabled,
      activeFilter: "all",
      activeModuleId: systemIds[0] || ""
    },
    refresh: renderPublicSite,
    api
  };
}

function hydrateConfig(config) {
  const next = config || fallbackConfig;

  return {
    ...fallbackConfig,
    ...next,
    pages: (next.pages || fallbackConfig.pages).map(hydratePage)
  };
}

function hydratePage(page) {
  const legacySections = [
    ...(page.modules || []).map((moduleId) => ({
      id: crypto.randomUUID(),
      type: "system",
      moduleId
    })),
    ...(page.blocks || []).map((block) => ({ type: "text", ...block }))
  ];
  const sections = (page.sections?.length ? page.sections : legacySections).map(hydrateSection).filter(Boolean);

  return {
    ...page,
    sections,
    modules: sections.filter((section) => section.type === "system").map((section) => section.moduleId),
    blocks: sections.filter((section) => section.type === "text")
  };
}

function hydrateSection(section) {
  if (!section || typeof section !== "object") {
    return null;
  }

  if (section.type === "system") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "system",
      moduleId: section.moduleId || state.modules[0]?.id || ""
    };
  }

  if (section.type === "image") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "image",
      title: section.title || "图片模块",
      description: section.description || "",
      src: section.src || "",
      alt: section.alt || "",
      caption: section.caption || "",
      display: section.display === "background" ? "background" : "normal",
      fit: section.fit === "contain" ? "contain" : "cover"
    };
  }

  return {
    id: section.id || crypto.randomUUID(),
    type: "text",
    icon: section.icon || "TX",
    title: section.title || "文本模块",
    description: section.description || "",
    body: section.body || ""
  };
}

function getSelectedPage() {
  return state.config.pages.find((page) => page.id === state.selectedPageId) || state.config.pages[0] || null;
}

function createPage() {
  const index = state.config.pages.length + 1;

  return {
    id: crypto.randomUUID(),
    slug: uniqueClientSlug(`page-${index}`),
    title: `新分页面 ${index}`,
    description: "在这里填写页面说明。",
    visible: true,
    modules: [],
    blocks: [],
    sections: []
  };
}

function createSystemSection() {
  return {
    id: crypto.randomUUID(),
    type: "system",
    moduleId: state.modules[0]?.id || ""
  };
}

function createTextSection() {
  return {
    id: crypto.randomUUID(),
    type: "text",
    icon: "TX",
    title: "文本模块",
    description: "简短说明",
    body: "在这里编辑正文。"
  };
}

function createImageSection() {
  return {
    id: crypto.randomUUID(),
    type: "image",
    title: "图片模块",
    description: "上传图片或粘贴图片地址。",
    src: "",
    alt: "",
    caption: "",
    display: "normal",
    fit: "cover"
  };
}

function insertSection(page, index, section) {
  page.sections.splice(index, 0, section);
  renderAdminEditor();
}

function moveSection(page, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= page.sections.length) {
    return;
  }

  const [section] = page.sections.splice(index, 1);
  page.sections.splice(nextIndex, 0, section);
  renderAdminEditor();
}

function deletePage(page) {
  if (state.config.pages.length <= 1) {
    state.saveStatus = "至少保留一个分页面。";
    renderAdminEditor();
    return;
  }

  if (confirm(`确定删除“${page.title}”？`)) {
    state.config.pages = state.config.pages.filter((item) => item.id !== page.id);
    state.selectedPageId = state.config.pages[0]?.id || "";
    renderAdminEditor();
  }
}

function sectionLabel(section) {
  if (section.type === "system") {
    return state.modules.find((module) => module.id === section.moduleId)?.name || "系统模块";
  }

  if (section.type === "image") {
    return section.title || "图片模块";
  }

  return section.title || "文本模块";
}

function field(label, value, onInput, hint = "") {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.className = "input";
  input.value = value || "";
  input.addEventListener("input", () => onInput(input.value));
  wrapper.append(input);

  if (hint) {
    wrapper.append(element("small", "", hint));
  }

  return wrapper;
}

function areaField(label, value, onInput) {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.value = value || "";
  textarea.addEventListener("input", () => onInput(textarea.value));
  wrapper.append(textarea);
  return wrapper;
}

function selectField(label, value, options, onChange) {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const select = document.createElement("select");
  select.className = "input";

  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    select.append(option);
  }

  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  wrapper.append(select);
  return wrapper;
}

function checkbox(label, checked, onChange) {
  const wrapper = element("label", "check-row");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrapper.append(input, element("span", "", label));
  return wrapper;
}

async function imageFileToDataUrl(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件。");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxSize = 1400;
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败。"));
    image.src = src;
  });
}

function navLink(href, icon, title, description, active) {
  const link = document.createElement("a");
  link.className = active ? "is-active" : "";
  link.href = href;
  link.append(mark(icon), textBlock(title, description));
  return link;
}

function button(label, className, type) {
  const control = document.createElement("button");
  control.type = type;
  control.className = className;
  control.textContent = label;
  return control;
}

function mark(value) {
  return element("span", "module-icon", value);
}

function textBlock(title, subtitle) {
  const block = element("span");
  block.append(element("strong", "", title), element("small", "", subtitle));
  return block;
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text) {
    node.textContent = text;
  }

  return node;
}

function setAppClass(className) {
  app.className = className;
  app.replaceChildren();
}

function getRouteSlug() {
  return decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, "").toLowerCase();
}

function normalizeSlug(value) {
  const cleaned = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}_/-]/gu, "")
    .toLowerCase();

  if (cleaned === "admin" || cleaned === "api" || cleaned.startsWith("api/")) {
    return `${cleaned}-page`;
  }

  return cleaned || "page";
}

function uniqueClientSlug(base) {
  const used = new Set(state.config.pages.map((page) => page.slug));
  let slug = normalizeSlug(base);
  let suffix = 2;

  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function cssUrl(value) {
  return value.replace(/"/g, "%22").replace(/\)/g, "%29");
}

function drawFeatureMap(canvas, pages) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(0, 0, width, height);

  const center = { x: width * 0.5, y: height * 0.5 };
  const radius = Math.min(width, height) * 0.34;

  pages.forEach((page, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(pages.length, 1) - Math.PI / 2;
    const x = center.x + Math.cos(angle) * radius * 2.2;
    const y = center.y + Math.sin(angle) * radius;

    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = "#dff4ee";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#115e59";
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PG", x, y);
  });

  ctx.fillStyle = "#17201d";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HOME", center.x, center.y);
}
