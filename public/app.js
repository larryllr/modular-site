import { moduleLoaders } from "./modules/manifest.js";

const app = document.querySelector("#app");
const adminTokenKey = "cloudflare-modular-site.admin-token";
const adminRoleKey = "cloudflare-modular-site.admin-role";
const homeLayoutKey = "cloudflare-modular-site.home-entry-layout";
const pageColumnsKeyPrefix = "cloudflare-modular-site.page-columns.";
const adminCommentIpKeyPrefix = "cloudflare-modular-site.admin-comment-ip.";
const pageAccessKeyPrefix = "cloudflare-modular-site.page-access.";
const maxUndoSteps = 50;
const visitorSummaryFallback = {
  ip: "获取中",
  region: "获取中",
  isp: "获取中",
  recentVisits: "获取中"
};

const fallbackConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  homeTitle: "功能入口",
  homeDescription: "这里是所有分页面的入口。管理员可以在 /admin 添加页面、分配模块和修改标题。",
  homeImage: "",
  commentBlockWords: [],
  announcement: {
    enabled: false,
    title: "公告",
    text: "",
    durationSeconds: 8
  },
  links: [],
  pages: [
    {
      id: "workspace",
      slug: "workspace",
      title: "模块工作台",
      description: "集中查看站点状态、便签、API 和发布清单。",
      backgroundImage: "",
      locked: false,
      passwordEnabled: false,
      pagePassword: "",
      visible: true,
      entry: {
        title: "",
        description: "",
        iconText: "PG",
        iconImage: "",
        sidebarTitle: "",
        sidebarDescription: "",
        backgroundImage: ""
      },
      comments: {
        enabled: false,
        title: "评论",
        description: "留下你的想法。"
      },
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
  adminRole: localStorage.getItem(adminRoleKey) || "admin",
  homeEntryLayout: localStorage.getItem(homeLayoutKey) === "two" ? "two" : "one",
  selectedItemType: "page",
  selectedPageId: "",
  selectedLinkId: "",
  expandedSettings: "",
  expandedSections: new Set(),
  undoStack: [],
  undoFingerprint: "",
  commentCache: new Map(),
  commentRequests: new Map(),
  visitorSummary: null,
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
  if (getRouteSlug() === "p2p") {
    renderP2PTransferPage();
    return;
  }

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
    state.adminRole = payload.role || state.adminRole || "admin";
    localStorage.setItem(adminRoleKey, state.adminRole);
    state.undoStack = [];
    state.undoFingerprint = "";
    ensureAdminSelection();
    renderAdminEditor();
  } catch {
    state.token = "";
    state.adminRole = "admin";
    localStorage.removeItem(adminTokenKey);
    localStorage.removeItem(adminRoleKey);
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
      state.adminRole = payload.role || "admin";
      state.config = hydrateConfig(payload.config);
      state.undoStack = [];
      state.undoFingerprint = "";
      ensureAdminSelection();
      localStorage.setItem(adminTokenKey, state.token);
      localStorage.setItem(adminRoleKey, state.adminRole);
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
  ensureAdminSelection();

  const sidebar = element("aside", "sidebar admin-sidebar");
  const brand = element("div", "brand");
  brand.append(mark("AD"), textBlock("站点后台", "预览式页面编辑"));
  const selectedItem = getSelectedAdminItem();
  const selectedHome = selectedItem?.type === "home";
  const selectedPage = selectedItem?.type === "page" ? selectedItem.page : null;
  const selectedLink = selectedItem?.type === "link" ? selectedItem.link : null;
  const selectedLogs = selectedItem?.type === "logs";
  const limited = isLimitedAdmin();

  const homeSettingsNav = element("nav", "module-nav");
  const homeSettingsButton = document.createElement("button");
  homeSettingsButton.type = "button";
  homeSettingsButton.classList.toggle("is-active", selectedHome);
  homeSettingsButton.disabled = limited;
  homeSettingsButton.append(mark("HM"), textBlock("主页设置", "标题、公告和全站设置"));
  homeSettingsButton.addEventListener("click", () => {
    state.selectedItemType = "home";
    state.expandedSettings = "";
    renderAdminEditor();
  });
  homeSettingsNav.append(homeSettingsButton);

  const pageNav = element("nav", "module-nav");
  for (const page of state.config.pages) {
    const group = element("section", "admin-page-nav-item");
    group.dataset.pageId = page.id;
    const item = document.createElement("button");
    item.type = "button";
    item.draggable = !limited;
    item.title = limited ? "" : "按住拖动可调整分页面顺序";
    item.classList.toggle("is-active", state.selectedItemType === "page" && page.id === state.selectedPageId);
    item.append(pageSidebarMark(page), textBlock(sidebarPageTitle(page), sidebarPageDescription(page)));
    if (!limited) {
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", page.id);
        group.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => {
        group.classList.remove("is-dragging");
        for (const node of pageNav.querySelectorAll(".admin-page-nav-item")) {
          node.classList.remove("is-drop-target");
        }
      });
      group.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        group.classList.add("is-drop-target");
      });
      group.addEventListener("dragleave", () => {
        group.classList.remove("is-drop-target");
      });
      group.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain");
        group.classList.remove("is-drop-target");
        reorderPageById(sourceId, page.id);
      });
    }
    item.addEventListener("click", () => {
      state.selectedItemType = "page";
      state.selectedPageId = page.id;
      state.expandedSettings = "";
      renderAdminEditor();
    });

    group.append(item);

    if (state.selectedItemType === "page" && page.id === state.selectedPageId) {
      group.append(renderPageSidebarSettings(page));
    }

    pageNav.append(group);
  }

  for (const link of limited ? [] : state.config.links) {
    const group = element("section", "admin-page-nav-item");
    group.dataset.linkId = link.id;
    const item = document.createElement("button");
    item.type = "button";
    item.draggable = true;
    item.title = "按住拖动可调整网站入口顺序";
    item.classList.toggle("is-active", state.selectedItemType === "link" && link.id === state.selectedLinkId);
    item.append(linkMark(link), textBlock(link.title, externalLinkSubtitle(link)));
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/link-id", link.id);
      group.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      group.classList.remove("is-dragging");
      for (const node of pageNav.querySelectorAll(".admin-page-nav-item")) {
        node.classList.remove("is-drop-target");
      }
    });
    group.addEventListener("dragover", (event) => {
      if (!event.dataTransfer.types.includes("text/link-id")) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      group.classList.add("is-drop-target");
    });
    group.addEventListener("dragleave", () => {
      group.classList.remove("is-drop-target");
    });
    group.addEventListener("drop", (event) => {
      const sourceId = event.dataTransfer.getData("text/link-id");
      if (!sourceId) {
        return;
      }
      event.preventDefault();
      group.classList.remove("is-drop-target");
      reorderLinkById(sourceId, link.id);
    });
    item.addEventListener("click", () => {
      state.selectedItemType = "link";
      state.selectedLinkId = link.id;
      state.expandedSettings = "";
      renderAdminEditor();
    });
    group.append(item);

    if (state.selectedItemType === "link" && link.id === state.selectedLinkId) {
      group.append(renderExternalLinkSidebarSettings(link));
    }

    pageNav.append(group);
  }

  const addPageButton = button("新增分页面", "button primary", "button");
  addPageButton.disabled = limited;
  addPageButton.addEventListener("click", () => {
    rememberConfigChange();
    const page = createPage();
    state.config.pages.push(page);
    state.selectedItemType = "page";
    state.selectedPageId = page.id;
    state.expandedSettings = "";
    renderAdminEditor();
  });

  const addBlogPageButton = button("新增博客分页面", "button", "button");
  addBlogPageButton.disabled = limited;
  addBlogPageButton.addEventListener("click", () => {
    rememberConfigChange();
    const page = createBlogPage();
    state.config.pages.push(page);
    state.selectedItemType = "page";
    state.selectedPageId = page.id;
    state.expandedSettings = "";
    renderAdminEditor();
  });

  const addLinkButton = button("新增网站入口", "button", "button");
  addLinkButton.disabled = limited;
  addLinkButton.addEventListener("click", () => {
    rememberConfigChange();
    const link = createExternalLink();
    state.config.links.push(link);
    state.selectedItemType = "link";
    state.selectedLinkId = link.id;
    state.expandedSettings = "";
    renderAdminEditor();
  });

  const homeButton = button("查看主页", "button", "button");
  homeButton.addEventListener("click", () => {
    window.location.href = "/";
  });

  const logsButton = button("访问日志", "button", "button");
  logsButton.classList.toggle("is-active", selectedLogs);
  logsButton.disabled = limited;
  logsButton.addEventListener("click", () => {
    state.selectedItemType = "logs";
    state.expandedSettings = "";
    renderAdminEditor();
  });

  const logoutButton = button("退出登录", "button", "button");
  logoutButton.addEventListener("click", () => {
    state.token = "";
    state.adminRole = "admin";
    localStorage.removeItem(adminTokenKey);
    localStorage.removeItem(adminRoleKey);
    renderLogin();
  });

  const sidebarActions = element("div", "sidebar-actions");
  sidebarActions.append(addPageButton, addBlogPageButton, addLinkButton, logsButton, homeButton, logoutButton);
  sidebar.append(brand, homeSettingsNav, pageNav, sidebarActions);

  const main = element("main", "admin-workspace");
  const title = element("header", "workspace-header compact");
  const titleText = element("div");
  titleText.append(element("p", "eyebrow", "Preview Admin"), element("h1", "", "预览模式编辑"));
  if (limited) {
    titleText.append(element("p", "form-hint", "低权限模式：只能添加模块、移动模块和保存模块顺序。"));
  }
  title.append(titleText);

  main.append(title);

  if (selectedLogs) {
    main.append(renderAccessLogsPanel());
  } else if (selectedHome) {
    main.append(renderHomeSettings());
  } else if (selectedPage) {
    main.append(renderPreviewEditor(selectedPage));
  } else if (selectedLink) {
    main.append(renderExternalLinkEditor(selectedLink));
  }

  main.append(renderSaveBar(selectedItem));
  app.replaceChildren(sidebar, main);
}

function renderPageSidebarSettings(page) {
  const settings = element("div", "admin-page-settings");
  const limited = isLimitedAdmin();
  const lockedForLimited = limited && page.locked;
  settings.append(
    sidebarField("侧边栏标题", page.entry.sidebarTitle || "", (value) => {
      page.entry.sidebarTitle = value;
    }, "留空时跟随分页面标题。", lockedForLimited)
  );
  settings.append(
    sidebarField("后缀", page.slug, (value) => {
      page.slug = uniquePageSlug(page, value);
    }, "", lockedForLimited)
  );
  settings.append(
    sidebarAreaField("侧边栏说明", page.entry.sidebarDescription || "", (value) => {
      page.entry.sidebarDescription = value;
    }, lockedForLimited)
  );
  settings.append(
    checkbox("主页显示", page.visible, (checked) => {
      page.visible = checked;
      renderAdminEditor();
    }, lockedForLimited)
  );

  if (!limited) {
    settings.append(
      checkbox("锁定分页面（限制低权限）", page.locked, (checked) => {
        page.locked = checked;
        renderAdminEditor();
      })
    );
  }

  settings.append(element("p", "form-hint", page.locked ? "这个分页面已锁定，低权限管理员无法编辑。" : "图标、背景和评论区域在右侧模块编辑上方设置。"));
  return settings;
}

function renderExternalLinkSidebarSettings(link) {
  const settings = element("div", "admin-page-settings");
  settings.append(
    sidebarField("名称", link.title, (value) => {
      link.title = value;
    })
  );
  settings.append(
    sidebarField("目标网址", link.targetUrl, (value) => {
      link.targetUrl = value.trim();
    })
  );
  settings.append(
    sidebarAreaField("说明", link.description, (value) => {
      link.description = value;
    })
  );
  settings.append(
    checkbox("显示入口", link.visible, (checked) => {
      link.visible = checked;
      renderAdminEditor();
    })
  );
  return settings;
}

function renderHomeSettings() {
  const panel = element("section", "admin-panel");
  const announcement = state.config.announcement;
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
  panel.append(
    imageValueField("主页展示图片", state.config.homeImage, (value) => {
      state.config.homeImage = value;
    })
  );
  if (!isLimitedAdmin()) {
    panel.append(renderAdminPasswordSettings());
    panel.append(renderCommentBlockWordsSettings());
  }
  const notice = element("section", "announcement-settings");
  notice.append(element("h3", "", "主页公告"));
  notice.append(
    checkbox("启用公告弹幕", announcement.enabled, (checked) => {
      announcement.enabled = checked;
      renderAdminEditor();
    })
  );
  const noticeRow = element("div", "admin-row");
  noticeRow.append(
    field("公告标题", announcement.title, (value) => {
      announcement.title = value;
    })
  );
  noticeRow.append(
    numberField("几秒后自动关闭", announcement.durationSeconds, 0, 120, 1, (value) => {
      announcement.durationSeconds = value;
      renderAdminEditor();
    })
  );
  notice.append(noticeRow);
  notice.append(
    areaField("公告内容", announcement.text, (value) => {
      announcement.text = value;
    })
  );
  notice.append(element("p", "form-hint", "填 0 秒表示不自动关闭；公告只在主页显示，会以弹幕形式横向滚动。"));
  panel.append(notice);
  return panel;
}

function renderAdminPasswordSettings() {
  const section = element("section", "announcement-settings");
  section.append(element("h3", "", "管理员密码"));
  const form = element("form", "password-form");
  const row = element("div", "admin-row");
  const current = document.createElement("input");
  current.className = "input";
  current.type = "password";
  current.placeholder = "当前密码";
  current.autocomplete = "current-password";
  current.required = true;
  const next = document.createElement("input");
  next.className = "input";
  next.type = "password";
  next.placeholder = "新密码（至少 4 位）";
  next.autocomplete = "new-password";
  next.required = true;
  next.minLength = 4;
  row.append(current, next);
  const actions = element("div", "module-actions");
  const save = button("修改密码", "button primary", "submit");
  const feedback = element("p", "form-hint");
  actions.append(save);
  form.append(row, actions, feedback);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    save.textContent = "修改中";
    feedback.textContent = "";

    try {
      const payload = await api.postJson("/api/admin/password", {
        currentPassword: current.value,
        newPassword: next.value
      }, true);
      state.token = payload.token;
      localStorage.setItem(adminTokenKey, state.token);
      current.value = "";
      next.value = "";
      feedback.textContent = "密码已修改，下次登录请使用新密码。";
    } catch (error) {
      feedback.textContent = error.message;
    }

    save.disabled = false;
    save.textContent = "修改密码";
  });
  section.append(form);
  section.append(element("p", "form-hint", "默认密码现在是 admin。后台修改后会保存在 Cloudflare KV 中。"));

  const limitedForm = element("form", "password-form");
  limitedForm.append(element("h3", "", "低权限密码"));
  const limitedRow = element("div", "admin-row");
  const adminPassword = document.createElement("input");
  adminPassword.className = "input";
  adminPassword.type = "password";
  adminPassword.placeholder = "当前管理员密码";
  adminPassword.autocomplete = "current-password";
  adminPassword.required = true;
  const limitedPassword = document.createElement("input");
  limitedPassword.className = "input";
  limitedPassword.type = "password";
  limitedPassword.placeholder = "新的低权限密码（至少 4 位）";
  limitedPassword.autocomplete = "new-password";
  limitedPassword.required = true;
  limitedPassword.minLength = 4;
  limitedRow.append(adminPassword, limitedPassword);
  const limitedActions = element("div", "module-actions");
  const limitedSave = button("修改低权限密码", "button", "submit");
  const limitedFeedback = element("p", "form-hint");
  limitedActions.append(limitedSave);
  limitedForm.append(limitedRow, limitedActions, limitedFeedback);
  limitedForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    limitedSave.disabled = true;
    limitedSave.textContent = "修改中";
    limitedFeedback.textContent = "";

    try {
      await api.postJson("/api/admin/limited-password", {
        currentPassword: adminPassword.value,
        newPassword: limitedPassword.value
      }, true);
      adminPassword.value = "";
      limitedPassword.value = "";
      limitedFeedback.textContent = "低权限密码已修改，可在同一个登录页使用。";
    } catch (error) {
      limitedFeedback.textContent = error.message;
    }

    limitedSave.disabled = false;
    limitedSave.textContent = "修改低权限密码";
  });
  section.append(limitedForm);
  section.append(element("p", "form-hint", "低权限默认密码是 limited，只能添加和移动模块。"));
  return section;
}

function renderCommentBlockWordsSettings() {
  const section = element("section", "announcement-settings");
  section.append(element("h3", "", "评论屏蔽词"));
  section.append(
    areaField("屏蔽词列表", (state.config.commentBlockWords || []).join("\n"), (value) => {
      state.config.commentBlockWords = normalizeBlockWordsInput(value);
    }, "每行一个词。评论名字或内容出现这些词时，将无法发送，并记录 IP、内容和命中词到访问日志。")
  );
  return section;
}

function renderPreviewEditor(page) {
  const limited = isLimitedAdmin();
  const pageLockedForLimited = limited && page.locked;
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
  removePage.disabled = limited;
  removePage.addEventListener("click", () => deletePage(page));
  headActions.append(view, removePage);
  head.append(copy, headActions);

  if (page.kind === "blog") {
    const blog = hydrateBlogSection(page.blog);
    page.blog = blog;
    if (pageLockedForLimited) {
      panel.append(head, element("p", "empty-state", "这个博客分页面已锁定，低权限管理员无法编辑。"));
    } else {
      panel.append(head, renderEntrySettings(page), renderEditableBlogSection(blog), renderBlogPagePreview(page));
    }
    return panel;
  }

  const canvas = element("div", "page-preview");
  applyPageBackground(canvas, page.backgroundImage);
  if (!pageLockedForLimited) {
    canvas.append(renderEditablePageHeader(page));
  }
  if (!pageLockedForLimited) {
    canvas.append(renderInsertBar(page, 0));
  }

  page.sections.forEach((section, index) => {
    canvas.append(renderEditableSection(page, section, index));
    if (!pageLockedForLimited) {
      canvas.append(renderInsertBar(page, index + 1));
    }
  });

  if (page.sections.length === 0) {
    canvas.append(element("p", "empty-state", pageLockedForLimited ? "这个分页面已锁定，低权限管理员无法编辑。" : "这个分页面还没有内容。可以从上面的插入条添加模块。"));
  }

  if (pageLockedForLimited) {
    panel.append(head, canvas);
  } else {
    panel.append(head, renderEntrySettings(page), renderBottomCommentsSettings(page), canvas);
  }
  return panel;
}

function renderExternalLinkEditor(link) {
  const panel = element("section", "admin-panel external-link-editor");
  const head = element("div", "section-head action-head");
  const copy = element("div");
  copy.append(element("h2", "", "外部网站入口"));
  copy.append(element("p", "", "这个入口会出现在主页卡片和左侧导航里，点击后前往目标网站。"));

  const headActions = element("div", "module-actions");
  const targetUrl = normalizeExternalUrl(link.targetUrl);
  const open = button("打开目标", "button", "button");
  open.disabled = !targetUrl;
  open.addEventListener("click", () => {
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  });
  const remove = button("删除入口", "button danger", "button");
  remove.addEventListener("click", () => deleteExternalLink(link));
  headActions.append(open, remove);
  head.append(copy, headActions);

  const iconRow = element("div", "admin-row");
  iconRow.append(
    field("图标文字", link.iconText, (value) => {
      link.iconText = value.slice(0, 4).toUpperCase();
    }, "未上传图标时，会先尝试使用目标网站图标；读取失败时显示这段文字。")
  );
  iconRow.append(imageValueField("自定义图标", link.iconImage, (value) => {
    link.iconImage = value;
  }));

  const backgroundRow = element("div", "admin-row");
  backgroundRow.append(imageValueField("入口背景", link.backgroundImage, (value) => {
    link.backgroundImage = value;
  }));
  backgroundRow.append(renderExternalLinkPreview(link));

  panel.append(head, iconRow, backgroundRow);
  return panel;
}

function renderExternalLinkPreview(link) {
  const wrapper = element("div", "entry-preview-wrap");
  wrapper.append(element("span", "field-title", "入口预览"));
  wrapper.append(renderExternalLinkEntry(link));
  return wrapper;
}

function renderAccessLogsPanel() {
  const panel = element("section", "admin-panel access-logs-panel");
  const head = element("div", "section-head action-head");
  const copy = element("div");
  copy.append(element("h2", "", "访问日志"));
  copy.append(element("p", "", "只记录普通访客打开网站页面的 IP、时间、路径和设备信息；管理员后台和接口操作不会记录。"));
  const actions = element("div", "module-actions");
  const refresh = button("刷新", "button", "button");
  const clear = button("清空日志", "button danger", "button");
  const list = element("div", "access-log-list");

  refresh.addEventListener("click", () => {
    loadAccessLogs(list);
  });

  clear.addEventListener("click", async () => {
    if (!confirm("确定清空全部访问日志？")) {
      return;
    }

    clear.disabled = true;

    try {
      const payload = await api.postJson("/api/admin/logs", { action: "clear" }, true);
      renderAccessLogsList(list, payload.logs || []);
    } catch (error) {
      list.replaceChildren(element("p", "form-error", error.message));
    }

    clear.disabled = false;
  });

  actions.append(refresh, clear);
  head.append(copy, actions);
  panel.append(head, list);
  loadAccessLogs(list);
  return panel;
}

async function loadAccessLogs(list) {
  list.replaceChildren(element("p", "form-hint", "正在加载访问日志..."));

  try {
    const payload = await api.getJson("/api/admin/logs", true);
    renderAccessLogsList(list, payload.logs || []);
  } catch (error) {
    list.replaceChildren(element("p", "form-error", error.message));
  }
}

function renderAccessLogsList(list, logs) {
  if (!logs.length) {
    list.replaceChildren(element("p", "empty-state", "还没有访问记录。"));
    return;
  }

  list.replaceChildren(...logs.map((log) => {
    const item = element("article", "access-log-item");
    item.classList.toggle("is-blocked-comment", log.kind === "blocked-comment");
    const head = element("div", "comment-head");
    head.append(element("strong", "", log.kind === "blocked-comment" ? `评论拦截 · ${log.ip || "unknown"}` : log.ip || "unknown"));
    head.append(element("span", "comment-meta", formatDate(log.createdAt)));
    item.append(head);

    if (log.kind === "blocked-comment") {
      item.append(element("p", "", `页面 ${log.path || "/"} · 名称：${log.name || "访客"} · 命中：${log.matchedWord || "屏蔽词"}`));
      item.append(element("p", "blocked-comment-body", log.body || ""));
    } else {
      item.append(element("p", "", `${log.method || "GET"} ${log.path || "/"}`));
    }

    item.append(element("p", "form-hint", log.device || "未知设备"));
    return item;
  }));
}

function renderEditablePageHeader(page) {
  const header = element("section", "preview-page-header editable-page-header");

  const slugField = element("label", "inline-edit-field inline-slug-field");
  slugField.append(element("span", "", "网址后缀"));
  const slugRow = element("div", "inline-slug-row");
  slugRow.append(element("strong", "", "/"));
  const slugInput = document.createElement("input");
  slugInput.className = "inline-input inline-slug-input";
  slugInput.value = page.slug;
  slugInput.addEventListener("change", () => {
    rememberConfigChange();
    page.slug = uniquePageSlug(page, slugInput.value);
    renderAdminEditor();
  });
  slugRow.append(slugInput);
  slugField.append(slugRow);

  const titleInput = document.createElement("input");
  titleInput.className = "inline-input inline-title-input";
  titleInput.value = page.title || "";
  titleInput.placeholder = "分页面标题";
  trackUndoOnEdit(titleInput);
  titleInput.addEventListener("input", () => {
    page.title = titleInput.value;
  });
  titleInput.addEventListener("change", () => renderAdminEditor());

  const descriptionInput = document.createElement("textarea");
  descriptionInput.className = "inline-input inline-description-input";
  descriptionInput.value = page.description || "";
  descriptionInput.placeholder = "这个分页面还没有说明。";
  descriptionInput.rows = 2;
  trackUndoOnEdit(descriptionInput);
  descriptionInput.addEventListener("input", () => {
    page.description = descriptionInput.value;
  });

  header.append(slugField, titleInput, descriptionInput);

  return header;
}

function renderEntrySettings(page) {
  const limited = isLimitedAdmin();
  const panel = element("section", "entry-settings");
  const head = element("div", "section-head");
  head.append(element("h2", "", "分页面入口显示"));
  head.append(element("p", "", "左侧栏图标默认跟随主页入口卡片；单独设置后，左侧栏会使用自己的图标。"));

  const row = element("div", "admin-row");
  row.append(
    field("入口标题", page.entry.title, (value) => {
      page.entry.title = value;
    }, "留空时使用页面标题。")
  );
  row.append(
    field("入口说明", page.entry.description, (value) => {
      page.entry.description = value;
    }, "留空时使用页面说明。")
  );
  row.append(
    field("侧边栏标题", page.entry.sidebarTitle, (value) => {
      page.entry.sidebarTitle = value;
    }, "留空时使用页面标题。")
  );
  row.append(
    field("侧边栏说明", page.entry.sidebarDescription, (value) => {
      page.entry.sidebarDescription = value;
    }, "留空时显示网址后缀。")
  );

  const iconRow = element("div", "admin-row");
  iconRow.append(
    field("主页图标文字", page.entry.iconText, (value) => {
      page.entry.iconText = value.slice(0, 4).toUpperCase();
    })
  );
  iconRow.append(imageValueField("主页图标图片", page.entry.iconImage, (value) => {
    page.entry.iconImage = value;
  }));

  const sidebarIconRow = element("div", "admin-row");
  sidebarIconRow.append(
    field("侧边栏图标文字", page.entry.sidebarIconText, (value) => {
      page.entry.sidebarIconText = value.slice(0, 4).toUpperCase();
    }, "留空时跟随主页图标文字。")
  );
  sidebarIconRow.append(imageValueField("侧边栏图标图片", page.entry.sidebarIconImage, (value) => {
    page.entry.sidebarIconImage = value;
  }));

  const backgroundRow = element("div", "admin-row");
  backgroundRow.append(imageValueField("入口卡片背景", page.entry.backgroundImage, (value) => {
    page.entry.backgroundImage = value;
  }));
  backgroundRow.append(imageValueField("分页面背景", page.backgroundImage, (value) => {
    page.backgroundImage = value;
  }));
  backgroundRow.append(renderEntryPreview(page));

  panel.append(head, row, iconRow, sidebarIconRow, backgroundRow);

  if (!limited) {
    const passwordPanel = element("section", "entry-settings page-password-settings");
    passwordPanel.append(element("h3", "", "分页面密码"));
    const passwordRow = element("div", "admin-row");
    passwordRow.append(
      checkbox("进入这个分页面需要密码", page.passwordEnabled, (checked) => {
        page.passwordEnabled = checked;
        renderAdminEditor();
      })
    );
    passwordRow.append(
      field("分页面专属密码", page.pagePassword, (value) => {
        page.pagePassword = value;
      }, "开启后，访客输入正确密码前不会看到这个分页面的标题、模块、评论和背景。")
    );
    passwordPanel.append(passwordRow);
    panel.append(passwordPanel);
  }
  return panel;
}

function renderEntryPreview(page) {
  const wrapper = element("div", "entry-preview-wrap");
  wrapper.append(element("span", "field-title", "入口预览"));
  wrapper.append(renderPageEntry(page));
  return wrapper;
}

function renderBottomCommentsSettings(page) {
  const panel = element("section", "entry-settings comments-placement-settings");
  const head = element("div", "section-head");
  head.append(element("h2", "", "底部评论区"));
  head.append(element("p", "", "默认作为页面底部的独立区域；也可以改成和其它模块一样进入模块网格。"));
  const row = element("div", "admin-row");
  row.append(
    checkbox("在页面底部显示评论区", page.comments.enabled, (checked) => {
      page.comments.enabled = checked;
      renderAdminEditor();
    })
  );
  row.append(
    selectField(
      "展示方式",
      page.comments.mode,
      [
        ["bottom", "底部独立区域"],
        ["module", "和其它模块一样"]
      ],
      (value) => {
        page.comments.mode = value;
        renderAdminEditor();
      }
    )
  );
  panel.append(head, row);

  const titleRow = element("div", "admin-row");
  titleRow.append(
    field("底部评论标题", page.comments.title, (value) => {
      page.comments.title = value;
    })
  );
  titleRow.append(
    numberField("评论列表高度(px)", page.comments.listHeight, 180, 900, 20, (value) => {
      page.comments.listHeight = value;
      renderAdminEditor();
    })
  );
  panel.append(titleRow);

  if (page.comments.mode === "module") {
    panel.append(renderLayoutSettings(page.comments, "评论模块布局"));
  }

  panel.append(
    field("底部评论说明", page.comments.description, (value) => {
      page.comments.description = value;
    })
  );
  if (!isLimitedAdmin()) {
    panel.append(renderCommentsManager(page));
  }
  return panel;
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
  const video = button("视频模块", "button", "button");
  video.addEventListener("click", () => insertSection(page, index, createVideoSection()));
  const p2p = button("传输模块", "button", "button");
  p2p.addEventListener("click", () => insertSection(page, index, createP2PSection()));
  const comments = button("评论模块", "button", "button");
  comments.addEventListener("click", () => insertSection(page, index, createCommentsSection()));
  const link = button("网站模块", "button", "button");
  link.addEventListener("click", () => insertSection(page, index, createLinkSection()));
  const blog = button("博客模块", "button", "button");
  blog.addEventListener("click", () => insertSection(page, index, createBlogSection()));

  bar.append(system, text, image, video, p2p, link, blog, comments);
  return bar;
}

function renderEditableSection(page, section, index) {
  const shell = element("section", `editable-section editable-${section.type}`);
  const expanded = state.expandedSections.has(section.id);
  const locked = Boolean(section.layout?.locked);
  const limitedLocked = isLimitedAdmin() && (page.locked || locked);
  shell.classList.toggle("is-locked", locked);
  shell.classList.toggle("is-collapsed", !expanded);
  shell.append(renderSectionControls(page, section, index, expanded));

  if (expanded && !limitedLocked) {
    shell.append(renderLayoutSettings(section, "模块布局", page, index));

    if (section.type === "system") {
      shell.append(renderEditableSystemSection(page, section));
    } else if (section.type === "image") {
      shell.append(renderEditableImageSection(section));
    } else if (section.type === "video") {
      shell.append(renderEditableVideoSection(section));
    } else if (section.type === "p2p") {
      shell.append(renderEditableP2PSection(section));
    } else if (section.type === "link") {
      shell.append(renderEditableLinkSection(section));
    } else if (section.type === "blog") {
      shell.append(renderEditableBlogSection(section));
    } else if (section.type === "comments") {
      shell.append(renderEditableCommentsSection(page, section));
    } else {
      shell.append(renderEditableTextSection(section));
    }
  }

  return shell;
}

function renderSectionControls(page, section, index, expanded) {
  const controls = element("div", "section-controls");
  const locked = Boolean(section.layout?.locked);
  const limitedLocked = isLimitedAdmin() && (page.locked || locked);
  const toggle = button(expanded ? "▾" : "▸", "section-toggle", "button");
  toggle.setAttribute("aria-label", expanded ? "折叠模块" : "展开模块");
  toggle.addEventListener("click", () => {
    if (expanded) {
      state.expandedSections.delete(section.id);
    } else {
      state.expandedSections.add(section.id);
    }
    renderAdminEditor();
  });
  controls.append(toggle, element("strong", "", locked ? `${sectionLabel(section)}（限制低权限）` : sectionLabel(section)));

  const tools = element("div", "section-tools");
  const up = button("上移", "button", "button");
  up.disabled = limitedLocked || index === 0;
  up.addEventListener("click", () => moveSection(page, index, -1));
  const down = button("下移", "button", "button");
  down.disabled = limitedLocked || index === page.sections.length - 1;
  down.addEventListener("click", () => moveSection(page, index, 1));
  const remove = button("删除", "button danger", "button");
  remove.disabled = limitedLocked;
  remove.addEventListener("click", () => {
    rememberConfigChange();
    page.sections.splice(index, 1);
    renderAdminEditor();
  });
  tools.append(up, down, remove);
  controls.append(tools);
  return controls;
}

function renderLayoutSettings(target, title, page = null, index = -1) {
  const limited = isLimitedAdmin();
  const layoutType = target.type || "comments";
  target.layout = hydrateLayout(target.layout, layoutType);
  const panel = element("section", "layout-settings");
  panel.append(element("h3", "", title));
  const row = element("div", "admin-row");
  row.append(
    numberField("宽度(%，0为自动)", target.layout.width, 0, 100, 5, (value) => {
      target.layout.width = value;
      renderAdminEditor();
    })
  );
  row.append(
    numberField("最小高度(px)", target.layout.minHeight, 120, 900, 20, (value) => {
      target.layout.minHeight = value;
      renderAdminEditor();
    })
  );
  panel.append(row);

  const controlRow = element("div", "admin-row");

  if (page) {
    controlRow.append(
      numberField("位置序号", index + 1, 1, page.sections.length, 1, (value) => {
        moveSectionTo(page, index, value - 1);
      })
    );
  } else {
    controlRow.append(element("p", "form-hint", "底部独立区域不占用模块网格位置。"));
  }

  if (!limited) {
    controlRow.append(
      checkbox("锁定模块（限制低权限）", target.layout.locked, (checked) => {
        target.layout.locked = checked;
        renderAdminEditor();
      })
    );
  }
  panel.append(controlRow);
  return panel;
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
        ["background", "展示图片"]
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

function renderEditableVideoSection(section) {
  const card = element("article", "module-card inline-editor-card video-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("视频标题", section.title, (value) => {
      section.title = value;
    })
  );
  row.append(
    field("视频地址", section.src, (value) => {
      section.src = value.trim();
    }, "粘贴 mp4/webm/ogg 等浏览器可播放的视频地址。")
  );
  card.append(row);
  card.append(
    field("视频说明", section.description, (value) => {
      section.description = value;
    })
  );
  const meta = element("div", "admin-row");
  meta.append(videoUploadField(section));
  meta.append(
    field("封面图片", section.poster, (value) => {
      section.poster = value.trim();
    }, "可选，未播放前显示。")
  );
  meta.append(
    field("视频注释", section.caption, (value) => {
      section.caption = value;
    })
  );
  card.append(meta);
  card.append(renderVideoSection(section));
  return card;
}

function renderEditableP2PSection(section) {
  const card = element("article", "module-card inline-editor-card p2p-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("模块标题", section.title, (value) => {
      section.title = value;
    })
  );
  row.append(
    field("房间号", section.room, (value) => {
      section.room = normalizeRoomId(value);
    }, "同一个房间号的人会进入同一个传输房间。")
  );
  card.append(row);
  card.append(
    field("模块说明", section.description, (value) => {
      section.description = value;
    })
  );
  card.append(renderP2PEntrySection(section));
  return card;
}

function renderEditableLinkSection(section) {
  const card = element("article", "module-card inline-editor-card link-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("网站标题", section.title, (value) => {
      section.title = value;
    })
  );
  row.append(
    field("目标网址", section.targetUrl, (value) => {
      section.targetUrl = value.trim();
    }, "可以填完整 https:// 地址，也可以直接填域名。")
  );
  card.append(row);
  card.append(
    field("网站说明", section.description, (value) => {
      section.description = value;
    }, "留空时会显示目标域名。")
  );

  const iconRow = element("div", "admin-row");
  iconRow.append(
    field("图标文字", section.iconText, (value) => {
      section.iconText = value.slice(0, 4).toUpperCase();
    }, "没有手动图标时，会自动尝试显示目标网站图标。")
  );
  iconRow.append(imageValueField("手动图标图片", section.iconImage, (value) => {
    section.iconImage = value;
  }));
  card.append(iconRow);

  const backgroundRow = element("div", "admin-row");
  backgroundRow.append(imageValueField("模块背景", section.backgroundImage, (value) => {
    section.backgroundImage = value;
  }));
  backgroundRow.append(renderLinkSectionPreview(section));
  card.append(backgroundRow);
  return card;
}

function renderEditableBlogSection(section) {
  const card = element("article", "module-card inline-editor-card blog-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("博客标题", section.title, (value) => {
      section.title = value;
    })
  );
  row.append(
    field("分类（逗号分隔）", (section.categories || []).join(", "), (value) => {
      section.categories = splitTags(value).slice(0, 20);
      renderAdminEditor();
    })
  );
  card.append(row);
  card.append(
    field("博客说明", section.description, (value) => {
      section.description = value;
    })
  );
  card.append(
    field("顶部公告", section.notice, (value) => {
      section.notice = value;
    }, "显示在博客模块顶部，可以留空。")
  );

  const profile = element("div", "admin-row");
  profile.append(
    field("作者名称", section.profileName, (value) => {
      section.profileName = value;
    })
  );
  profile.append(
    imageValueField("作者头像", section.profileImage, (value) => {
      section.profileImage = value;
    })
  );
  card.append(profile);
  card.append(
    field("作者介绍", section.profileDescription, (value) => {
      section.profileDescription = value;
    })
  );

  const actions = element("div", "section-tools blog-editor-actions");
  const add = button("发布文章", "button primary", "button");
  add.addEventListener("click", () => {
    rememberConfigChange();
    const now = new Date().toISOString();
    section.articles.unshift({
      id: crypto.randomUUID(),
      title: "新文章",
      summary: "这里填写文章摘要。",
      body: "这里填写正文。",
      coverImage: "",
      category: section.categories?.[0] || "随笔",
      tags: [],
      authorRole: isLimitedAdmin() ? "limited" : "admin",
      authorName: isLimitedAdmin() ? "limited" : "admin",
      createdAt: now,
      updatedAt: now,
      featured: false
    });
    renderAdminEditor();
  });
  actions.append(add);
  card.append(actions);

  const articles = element("div", "blog-article-editor-list");
  if (!section.articles.length) {
    articles.append(element("p", "empty-state", "还没有文章。"));
  }

  for (const article of section.articles) {
    articles.append(renderEditableBlogArticle(section, article, articles));
  }

  card.append(articles, renderBlogSection(section, true));
  return card;
}

function renderEditableBlogArticle(section, article, listNode = null) {
  const locked = isLimitedAdmin() && article.authorRole === "admin";
  const item = element("article", locked ? "blog-article-editor is-readonly" : "blog-article-editor");
  item.dataset.articleId = article.id;
  item.draggable = !locked;
  item.title = locked ? "" : "按住拖动可调整文章顺序";
  if (!locked) {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/blog-article-id", article.id);
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      for (const node of listNode?.querySelectorAll(".blog-article-editor") || []) {
        node.classList.remove("is-drop-target");
      }
    });
    item.addEventListener("dragover", (event) => {
      if (!event.dataTransfer.types.includes("text/blog-article-id")) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      item.classList.add("is-drop-target");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("is-drop-target");
    });
    item.addEventListener("drop", (event) => {
      const sourceId = event.dataTransfer.getData("text/blog-article-id");
      if (!sourceId) {
        return;
      }
      event.preventDefault();
      item.classList.remove("is-drop-target");
      reorderBlogArticle(section, sourceId, article.id);
    });
  }
  item.append(element("h3", "", article.title || "未命名文章"));
  item.append(element("p", "form-hint", locked ? "admin 发布，仅 admin 可以编辑。" : `作者：${article.authorName || article.authorRole} · ${formatDateTime(article.updatedAt || article.createdAt)}`));

  const row = element("div", "admin-row");
  row.append(
    field("文章标题", article.title, (value) => {
      if (locked) return;
      article.title = value;
      article.updatedAt = new Date().toISOString();
    })
  );
  row.append(
    field("分类", article.category, (value) => {
      if (locked) return;
      article.category = value;
      article.updatedAt = new Date().toISOString();
    })
  );
  item.append(row);

  item.append(
    field("摘要", article.summary, (value) => {
      if (locked) return;
      article.summary = value;
      article.updatedAt = new Date().toISOString();
    })
  );
  item.append(
    imageValueField("封面图片", article.coverImage, (value) => {
      if (locked) return;
      article.coverImage = value;
      article.updatedAt = new Date().toISOString();
    })
  );
  item.append(
    field("标签（逗号分隔）", (article.tags || []).join(", "), (value) => {
      if (locked) return;
      article.tags = splitTags(value).slice(0, 12);
      article.updatedAt = new Date().toISOString();
      renderAdminEditor();
    })
  );
  item.append(
    areaField("正文", article.body, (value) => {
      if (locked) return;
      article.body = value;
      article.updatedAt = new Date().toISOString();
    })
  );

  const tools = element("div", "section-tools");
  const featured = checkbox("首页推荐", Boolean(article.featured), (checked) => {
    if (locked) return;
    article.featured = checked;
    article.updatedAt = new Date().toISOString();
    renderAdminEditor();
  });
  const remove = button("删除文章", "button danger", "button");
  remove.disabled = locked;
  remove.addEventListener("click", () => {
    rememberConfigChange();
    section.articles = section.articles.filter((item) => item.id !== article.id);
    renderAdminEditor();
  });
  tools.append(featured, remove);
  item.append(tools);

  for (const control of item.querySelectorAll("input, textarea, select")) {
    control.disabled = locked;
  }

  return item;
}

function renderLinkSectionPreview(section) {
  const wrapper = element("div", "entry-preview-wrap");
  wrapper.append(element("span", "field-title", "模块预览"));
  wrapper.append(renderLinkSection(section));
  return wrapper;
}

function renderEditableCommentsSection(page, section) {
  const card = element("article", "module-card inline-editor-card comments-editor-card");
  const row = element("div", "admin-row");
  row.append(
    field("评论模块标题", section.title, (value) => {
      section.title = value;
    })
  );
  row.append(
    field("评论模块说明", section.description, (value) => {
      section.description = value;
    })
  );
  const sizing = element("div", "admin-row");
  sizing.append(
    numberField("评论列表高度(px)", section.listHeight, 180, 900, 20, (value) => {
      section.listHeight = value;
      renderAdminEditor();
    })
  );
  card.append(row, sizing, renderCommentsSection(page, section, true));
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
    rememberConfigChange();
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

function videoUploadField(section) {
  const wrapper = element("label", "field video-uploader");
  wrapper.append(element("span", "", "上传视频"));
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/*";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    state.saveStatus = "正在处理视频...";
    rememberConfigChange();
    renderAdminEditor();

    try {
      section.src = await fileToDataUrl(file, "video/");
      section.poster = section.poster || (await videoFileToPoster(file));
      section.caption = section.caption || file.name.replace(/\.[^.]+$/, "");
      state.saveStatus = "视频已加入预览，记得保存配置。";
    } catch (error) {
      state.saveStatus = error.message;
    }

    renderAdminEditor();
  });
  wrapper.append(input, element("small", "", "适合上传较短视频；大视频建议使用视频外链。"));
  return wrapper;
}

function renderSaveBar(selectedItem) {
  const bar = element("div", "save-bar");
  const previewTarget = previewTargetFor(selectedItem);
  const preview = button(previewTarget.label, "button", "button");
  preview.disabled = !previewTarget.url;
  preview.addEventListener("click", () => {
    if (previewTarget.url) {
      window.open(previewTarget.url, "_blank", "noopener,noreferrer");
    }
  });

  const save = button("保存配置", "button primary", "button");
  save.addEventListener("click", saveAdminConfig);
  const undo = button("撤销", "button", "button");
  undo.disabled = state.undoStack.length === 0;
  undo.addEventListener("click", undoAdminChange);
  bar.append(element("span", "save-status", state.saveStatus), undo, preview, save);
  return bar;
}

function previewTargetFor(selectedItem) {
  if (selectedItem?.type === "page") {
    return {
      label: `预览 /${selectedItem.page.slug}`,
      url: `/${selectedItem.page.slug}`
    };
  }

  if (selectedItem?.type === "link") {
    const url = normalizeExternalUrl(selectedItem.link.targetUrl);

    return {
      label: url ? "打开目标网址" : "目标网址未设置",
      url
    };
  }

  return {
    label: "预览主页",
    url: "/"
  };
}

async function saveAdminConfig() {
  state.saveStatus = "保存中...";
  renderAdminEditor();

  try {
    const payload = await api.postJson("/api/admin/config", { config: state.config }, true);
    state.config = hydrateConfig(payload.config);
    state.adminRole = payload.role || state.adminRole;
    localStorage.setItem(adminRoleKey, state.adminRole);
    state.undoStack = [];
    state.undoFingerprint = "";
    ensureAdminSelection();
    state.saveStatus = `已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
    renderAdminEditor();
  } catch (error) {
    state.saveStatus = error.message;
    renderAdminEditor();
  }
}

function rememberConfigChange() {
  const serialized = JSON.stringify(state.config);

  if (state.undoStack.length > 0 && state.undoFingerprint === serialized) {
    return;
  }

  state.undoStack.push(JSON.parse(serialized));
  state.undoFingerprint = serialized;

  if (state.undoStack.length > maxUndoSteps) {
    state.undoStack.shift();
  }

  state.saveStatus = "有未保存修改。";
}

function undoAdminChange() {
  const snapshot = state.undoStack.pop();

  if (!snapshot) {
    return;
  }

  state.config = hydrateConfig(snapshot);
  state.undoFingerprint = "";
  ensureAdminSelection();
  state.saveStatus = "已撤销上一步，记得保存配置。";
  renderAdminEditor();
}

function trackUndoOnEdit(control) {
  let captured = false;
  const capture = () => {
    if (!captured) {
      rememberConfigChange();
      captured = true;
    }
  };

  control.addEventListener("focus", capture);
  control.addEventListener("beforeinput", capture);
  control.addEventListener("blur", () => {
    captured = false;
  });
}

function renderPublicSite() {
  const slug = getRouteSlug();
  const pages = state.config.pages.filter((page) => page.visible);
  const links = state.config.links.filter((link) => link.visible && normalizeExternalUrl(link.targetUrl));
  const page = slug ? pages.find((item) => item.slug === slug) : null;

  setAppClass("app-shell");
  app.append(renderPublicSidebar(slug, pages, links));

  if (!slug) {
    renderHome(pages, links);
    return;
  }

  if (!page) {
    renderNotFound(slug);
    return;
  }

  if (page.passwordEnabled) {
    const cachedPage = getUnlockedPage(slug);

    if (cachedPage) {
      renderPage(cachedPage);
      return;
    }

    renderPagePasswordGate(page);
    return;
  }

  renderPage(page);
}

function renderPublicSidebar(slug, pages, links) {
  const sidebar = element("aside", "sidebar public-sidebar");
  const nav = element("nav", "module-nav");
  nav.append(navLink("/", "HM", "主页入口", slug ? "所有分页面" : "当前页面", !slug));

  for (const page of pages) {
    nav.append(navLink(`/${page.slug}`, page.entry.sidebarIconText || page.entry.iconText || "PG", page.title, `/${page.slug}`, slug === page.slug, {
      iconImage: page.entry.sidebarIconImage || page.entry.iconImage
    }));
  }

  for (const link of links) {
    nav.append(
      navLink(
        normalizeExternalUrl(link.targetUrl),
        link.iconText || "WEB",
        link.title,
        externalLinkSubtitle(link),
        false,
        {
          external: true,
          iconImage: link.iconImage,
          fallbackIcon: faviconUrl(link.targetUrl)
        }
      )
    );
  }

  nav.append(navLink("/admin", "AD", "管理员", "管理页面和模块", false));
  sidebar.append(nav);
  return sidebar;
}

function renderHome(pages, links) {
  document.title = state.config.homeTitle;
  const main = element("main", "workspace");
  const header = element("header", "workspace-header");
  const copy = element("div");
  copy.append(element("p", "eyebrow", "Home"), element("h1", "", state.config.homeTitle));
  copy.append(element("p", "lead", state.config.homeDescription));
  const homeImage = state.config.homeImage?.trim();
  header.classList.toggle("no-visual", !homeImage);
  header.append(copy);

  if (homeImage) {
    const visual = element("figure", "home-visual");
    const image = document.createElement("img");
    image.src = homeImage;
    image.alt = state.config.homeTitle;
    visual.append(image);
    header.append(visual);
  }

  main.append(header);
  const announcement = renderHomeAnnouncement();

  if (announcement) {
    main.append(announcement);
  }

  main.append(
    renderVisitorStatusStrip()
  );
  loadVisitorSummary();

  const grid = element("section", `module-grid home-entry-grid layout-${state.homeEntryLayout}`);
  for (const page of pages) {
    grid.append(renderPageEntry(page));
  }
  for (const link of links) {
    grid.append(renderExternalLinkEntry(link));
  }
  main.append(grid);
  main.append(renderHomeViewControl());
  app.append(main);
}

function renderHomeAnnouncement() {
  const announcement = state.config.announcement;

  if (!announcement.enabled || !announcement.text.trim()) {
    return null;
  }

  const banner = element("section", "home-announcement");
  const textLength = announcement.text.trim().length;
  banner.style.setProperty("--announcement-speed", `${Math.max(8, Math.min(24, textLength * 0.35))}s`);

  const label = element("span", "announcement-label", announcement.title || "公告");
  const track = element("div", "announcement-track");
  track.append(element("span", "announcement-text", announcement.text));
  const close = button("关闭", "announcement-close", "button");
  close.addEventListener("click", () => banner.remove());
  banner.append(label, track, close);

  const seconds = Number(announcement.durationSeconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    window.setTimeout(() => banner.remove(), seconds * 1000);
  }

  return banner;
}

function renderPage(page) {
  if (page.kind === "blog") {
    renderBlogPage(page);
    return;
  }

  document.title = page.title;
  const columnMode = getPageColumnMode(page.slug);
  const main = element("main", "workspace");
  applyPageBackground(main, page.backgroundImage);
  const header = element("header", "workspace-header compact");
  const copy = element("div");
  copy.append(element("p", "eyebrow", `/${page.slug}`), element("h1", "", page.title));
  copy.append(element("p", "lead", page.description));
  header.append(copy);
  main.append(header);
  main.append(renderPageStatusStrip(page, columnMode));

  const grid = element("section", `module-grid page-module-grid ${columnMode === "default" ? "layout-default" : "layout-fixed"}`);
  if (columnMode !== "default") {
    grid.style.setProperty("--grid-columns", String(columnMode));
  }
  const context = moduleContext(page);

  for (const section of page.sections) {
    const node = renderPublicSection(section, context);

    if (node) {
      applySectionLayout(node, section, columnMode);
      grid.append(node);
    }
  }

  if (page.comments.enabled && page.comments.mode === "module") {
    const commentsNode = renderCommentsSection(page, page.comments, false);
    applySectionLayout(commentsNode, page.comments, columnMode);
    grid.append(commentsNode);
  }

  if (grid.childElementCount === 0) {
    grid.append(element("p", "empty-state", "这个分页面还没有模块。可以进入 /admin 添加。"));
  }

  main.append(grid);

  if (page.comments.enabled && page.comments.mode !== "module") {
    const commentsRegion = element("section", "bottom-comments-region");
    commentsRegion.append(renderCommentsSection(page, page.comments, false));
    main.append(commentsRegion);
  }

  app.append(main);
}

function renderHomeViewControl() {
  const control = element("div", "floating-view-control");
  control.append(element("span", "", "主页入口"));
  const select = document.createElement("select");
  select.className = "input";
  for (const [value, label] of [
    ["one", "一个一行"],
    ["two", "两个一行"]
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = state.homeEntryLayout;
  select.addEventListener("change", () => {
    state.homeEntryLayout = select.value;
    localStorage.setItem(homeLayoutKey, state.homeEntryLayout);
    renderPublicSite();
  });
  control.append(select);
  return control;
}

function renderPagePasswordGate(page) {
  document.title = "需要密码";
  const main = element("main", "workspace page-password-workspace");
  const panel = element("section", "login-panel page-password-panel");
  const brand = element("div", "brand");
  brand.append(mark(page.entry?.iconText || "PG"), textBlock(page.entry?.title || page.title || "受保护分页面", "请输入该分页面密码"));
  const form = element("form", "login-form");
  const input = document.createElement("input");
  input.className = "input";
  input.type = "password";
  input.placeholder = "分页面密码";
  input.autocomplete = "current-password";
  input.required = true;
  const submit = button("进入分页面", "button primary", "submit");
  const feedback = element("p", "form-error");
  form.append(input, submit, feedback);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "验证中";
    feedback.textContent = "";

    try {
      const payload = await api.postJson("/api/page-access", {
        slug: page.slug,
        password: input.value
      });
      const fullPage = hydratePage(payload.page);
      rememberUnlockedPage(fullPage);
      replaceConfigPage(fullPage);
      renderPublicSite();
    } catch (error) {
      feedback.textContent = error.message;
      submit.disabled = false;
      submit.textContent = "进入分页面";
    }
  });
  panel.append(brand, form);
  main.append(panel);
  app.append(main);
}

function getUnlockedPage(slug) {
  try {
    const stored = sessionStorage.getItem(`${pageAccessKeyPrefix}${slug}`);
    const parsed = stored ? JSON.parse(stored) : null;

    if (!parsed?.__unlocked || parsed?.updatedAt !== state.config.updatedAt) {
      sessionStorage.removeItem(`${pageAccessKeyPrefix}${slug}`);
      return null;
    }

    return hydratePage(parsed);
  } catch {
    sessionStorage.removeItem(`${pageAccessKeyPrefix}${slug}`);
    return null;
  }
}

function rememberUnlockedPage(page) {
  sessionStorage.setItem(
    `${pageAccessKeyPrefix}${page.slug}`,
    JSON.stringify({ ...page, __unlocked: true, updatedAt: state.config.updatedAt })
  );
}

function replaceConfigPage(page) {
  const index = state.config.pages.findIndex((item) => item.id === page.id || item.slug === page.slug);

  if (index >= 0) {
    state.config.pages[index] = page;
  }
}

function renderPageStatusStrip(page, columns) {
  const strip = element("section", "status-strip page-status-strip");
  const viewItem = element("div", "status-control-item");
  viewItem.append(element("span", "metric-label", "显示几个在这行"));
  const select = document.createElement("select");
  select.className = "input";
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "默认选项";
  select.append(defaultOption);
  for (const value of [1, 2, 3, 4, 5]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value} 个`;
    select.append(option);
  }
  select.value = columns === "default" ? "default" : String(columns);
  select.addEventListener("change", () => {
    setPageColumnMode(page.slug, select.value);
    renderPublicSite();
  });
  viewItem.append(select);
  strip.append(viewItem);

  const countItem = element("div");
  countItem.append(element("span", "metric-label", "模块数量"), element("strong", "", String(countPageModules(page))));
  strip.append(countItem);

  const slugItem = element("div");
  slugItem.append(element("span", "metric-label", "网址后缀"), element("strong", "", `/${page.slug}`));
  strip.append(slugItem);
  return strip;
}

function renderPublicSection(section, context) {
  if (section.type === "system") {
    const module = state.modules.find((item) => item.id === section.moduleId);

    return module ? renderModuleCard(module, context) : null;
  }

  if (section.type === "image") {
    return renderImageSection(section);
  }

  if (section.type === "video") {
    return renderVideoSection(section);
  }

  if (section.type === "p2p") {
    return renderP2PEntrySection(section);
  }

  if (section.type === "link") {
    return renderLinkSection(section);
  }

  if (section.type === "blog") {
    return renderBlogSection(section, false);
  }

  if (section.type === "comments") {
    return renderCommentsSection(context.page, section, false);
  }

  return renderBlockCard(section);
}

function applySectionLayout(node, section, columns) {
  const layout = hydrateLayout(section.layout, section.type);
  if (columns === "default") {
    node.style.gridColumn = layout.width >= 100 ? "1 / -1" : "";
  } else {
    const span = layout.width > 0 ? Math.max(1, Math.min(columns, Math.round((layout.width / 100) * columns))) : 1;
    node.style.gridColumn = `span ${span}`;
  }
  node.style.minHeight = `${layout.minHeight}px`;
}

function countPageModules(page) {
  return page.sections.length + (page.comments.enabled ? 1 : 0);
}

function getPageColumnMode(slug) {
  const saved = localStorage.getItem(`${pageColumnsKeyPrefix}${slug}`);
  const value = Number(saved);
  if (!saved || saved === "default" || !Number.isFinite(value)) {
    return "default";
  }

  return Math.max(1, Math.min(5, value));
}

function setPageColumnMode(slug, value) {
  if (value === "default") {
    localStorage.removeItem(`${pageColumnsKeyPrefix}${slug}`);
    return;
  }

  const count = Number(value);
  if (!Number.isFinite(count)) {
    localStorage.removeItem(`${pageColumnsKeyPrefix}${slug}`);
    return;
  }

  localStorage.setItem(`${pageColumnsKeyPrefix}${slug}`, String(Math.max(1, Math.min(5, count))));
}

function renderP2PTransferPage() {
  setAppClass("app-shell");
  const room = normalizeRoomId(new URLSearchParams(window.location.search).get("room") || "public");
  const main = element("main", "workspace p2p-workspace");
  const header = element("header", "workspace-header compact");
  const copy = element("div");
  copy.append(element("p", "eyebrow", "WebRTC"), element("h1", "", "P2P 文件传输"));
  copy.append(element("p", "lead", `房间 ${room}。浏览器会尝试直接连接，NAT 太严格时可能需要 TURN 中继。`));
  header.append(copy);
  main.append(header, renderP2PTransferPanel(room));
  app.append(renderPublicSidebar("p2p", state.config.pages.filter((page) => page.visible), state.config.links.filter((link) => link.visible)));
  app.append(main);
}

function renderP2PTransferPanel(room) {
  const panel = element("section", "module-card p2p-panel");
  const status = element("p", "form-hint", "尚未加入房间。");
  const hint = element("p", "form-hint", "协议和端口用于显示设备状态；浏览器实际传输仍使用 WebRTC。对方输入你的串流密码后，你的浏览器会弹出屏幕共享确认。完整管理员可免密码发起请求，但仍需要被串流设备同意浏览器共享。");
  const peersList = element("div", "p2p-peer-list");
  const log = element("div", "p2p-log");
  const name = document.createElement("input");
  name.className = "input";
  name.placeholder = "你的名字";
  name.value = localStorage.getItem("cloudflare-modular-site.p2p-name") || "";
  const join = button("加入房间", "button primary", "button");
  const protocol = document.createElement("select");
  protocol.className = "input";
  for (const value of ["WebRTC", "TCP", "UDP"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    protocol.append(option);
  }
  const port = document.createElement("input");
  port.className = "input";
  port.placeholder = "端口，例如 8080";
  port.inputMode = "numeric";
  const streamPassword = document.createElement("input");
  streamPassword.className = "input";
  streamPassword.type = "password";
  streamPassword.placeholder = "本机串流密码";
  const file = document.createElement("input");
  file.type = "file";
  file.disabled = true;
  const send = button("发送文件", "button", "button");
  send.disabled = true;
  const row = element("div", "admin-row");
  row.append(name, join);
  const networkRow = element("div", "admin-row");
  networkRow.append(protocol, port, streamPassword);
  const sendRow = element("div", "admin-row");
  sendRow.append(file, send);
  const remoteStreams = element("div", "p2p-streams");
  panel.append(row, networkRow, sendRow, hint, status, peersList, remoteStreams, log);

  let session = null;
  const writeLog = (message) => {
    log.prepend(element("p", "", `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} ${message}`));
  };

  join.addEventListener("click", () => {
    if (session) {
      session.close();
    }

    localStorage.setItem("cloudflare-modular-site.p2p-name", name.value.trim());
    session = createP2PSession(room, name.value.trim() || "访客", {
      status,
      peersList,
      remoteStreams,
      file,
      send,
      protocol,
      port,
      streamPassword,
      writeLog
    });
    session.start();
    join.textContent = "重新加入";
  });

  send.addEventListener("click", () => {
    const selected = file.files?.[0];

    if (!selected || !session) {
      return;
    }

    session.sendFile(selected);
  });

  return panel;
}

function createP2PSession(room, name, ui) {
  const peerId = crypto.randomUUID();
  const peers = new Map();
  const processed = new Set();
  let since = 0;
  let timer = 0;
  let closed = false;
  let lastPeerList = [];
  const channels = new Map();
  const incoming = new Map();
  const profiles = new Map();
  const streamCards = new Map();
  let localStream = null;
  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }] };

  const log = (message) => ui.writeLog(message);
  const postSignal = (type, payload = {}, to = "") =>
    api.postJson(`/api/p2p-signal?room=${encodeURIComponent(room)}`, { peerId, name, type, to, payload }, type === "stream-request");
  const profilePayload = () => ({
    name,
    protocol: ui.protocol.value,
    port: ui.port.value.trim()
  });
  const setStatus = () => {
    const openCount = [...channels.values()].filter((channel) => channel.readyState === "open").length;
    ui.status.textContent = `已加入：${name}。已连接 ${openCount} 个用户。`;
    ui.file.disabled = openCount === 0;
    ui.send.disabled = openCount === 0;
  };
  const renderPeers = (list) => {
    lastPeerList = list;
    ui.peersList.replaceChildren(...list.filter((peer) => peer.id !== peerId).map((peer) => {
      const stateText = channels.get(peer.id)?.readyState || "连接中";
      const profile = profiles.get(peer.id) || {};
      const item = element("div", "p2p-peer-item");
      const requestPassword = document.createElement("input");
      requestPassword.className = "input";
      requestPassword.type = "password";
      requestPassword.placeholder = "对方串流密码";
      const stream = button("请求串流", "button", "button");
      stream.addEventListener("click", () => requestStream(peer.id, requestPassword.value));
      item.append(
        element("p", "form-hint", `${profile.name || peer.name || "访客"}：${stateText} · ${profile.protocol || "WebRTC"} ${profile.port || "未填端口"}`),
        requestPassword,
        stream
      );
      return item;
    }));
  };
  const handleProfileEvent = (event) => {
    if (!event.detail || !peers.has(event.detail.remoteId)) {
      return;
    }

    profiles.set(event.detail.remoteId, event.detail.profile);
    renderPeers(lastPeerList);
  };
  window.addEventListener("p2p-profile", handleProfileEvent);
  const sendProfile = (channel) => {
    if (channel.readyState === "open") {
      channel.send(JSON.stringify({ kind: "profile", ...profilePayload() }));
    }
  };
  const broadcastProfile = () => {
    for (const channel of channels.values()) {
      sendProfile(channel);
    }
  };
  ui.protocol.addEventListener("change", broadcastProfile);
  ui.port.addEventListener("input", broadcastProfile);
  const setupChannel = (remoteId, channel) => {
    channels.set(remoteId, channel);
    channel.binaryType = "arraybuffer";
    channel.addEventListener("open", () => {
      sendProfile(channel);
      log("已建立点对点连接。");
      setStatus();
    });
    channel.addEventListener("close", setStatus);
    channel.addEventListener("message", (event) => handleP2PData(remoteId, event.data, incoming, log));
  };
  const ensurePeer = (remoteId, polite) => {
    if (remoteId === peerId) return null;
    if (peers.has(remoteId)) return peers.get(remoteId);
    const pc = new RTCPeerConnection(rtcConfig);
    peers.set(remoteId, pc);
    pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        postSignal("candidate", event.candidate.toJSON(), remoteId).catch(() => {});
      }
    });
    pc.addEventListener("connectionstatechange", () => {
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        log("连接失败或中断，严格 NAT 环境可能需要 TURN 中继。");
      }
      setStatus();
    });
    pc.addEventListener("datachannel", (event) => setupChannel(remoteId, event.channel));
    pc.addEventListener("track", (event) => {
      showRemoteStream(remoteId, event.streams[0]);
    });

    if (!polite) {
      setupChannel(remoteId, pc.createDataChannel("files"));
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => postSignal("offer", pc.localDescription, remoteId)).catch(() => {
        log("创建连接失败。");
      });
    }

    return pc;
  };
  const handleSignal = async (message) => {
    if (processed.has(message.id) || message.from === peerId) return;
    processed.add(message.id);
    const polite = peerId > message.from;
    const pc = ensurePeer(message.from, polite);
    if (!pc) return;

    if (message.type === "stream-request") {
      await handleStreamRequest(message.from, message.payload || {});
    } else if (message.type === "offer") {
      await pc.setRemoteDescription(message.payload);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal("answer", pc.localDescription, message.from);
    } else if (message.type === "answer") {
      await pc.setRemoteDescription(message.payload);
    } else if (message.type === "candidate") {
      await pc.addIceCandidate(message.payload);
    }
  };
  const requestStream = async (remoteId, password) => {
    ensurePeer(remoteId, false);
    await postSignal("stream-request", { password }, remoteId);
    log("已发送串流请求。");
  };
  const handleStreamRequest = async (remoteId, payload) => {
    const expected = ui.streamPassword.value;
    if (!payload.admin && (!expected || payload.password !== expected)) {
      log("收到串流请求，但密码不正确。");
      return;
    }

    await startLocalStream(remoteId);
  };
  const startLocalStream = async (remoteId) => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      log("当前浏览器不支持屏幕串流。");
      return;
    }

    const pc = ensurePeer(remoteId, false);
    if (!pc) return;
    if (!localStream) {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      log("已开始共享屏幕。");
    }

    for (const track of localStream.getTracks()) {
      if (!pc.getSenders().some((sender) => sender.track === track)) {
        pc.addTrack(track, localStream);
      }
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal("offer", pc.localDescription, remoteId);
  };
  const showRemoteStream = (remoteId, stream) => {
    if (!stream || streamCards.has(remoteId)) {
      return;
    }

    const card = element("article", "module-card p2p-stream-card");
    const video = document.createElement("video");
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    video.srcObject = stream;
    card.append(element("h3", "", "远程串流"), video);
    ui.remoteStreams.prepend(card);
    streamCards.set(remoteId, card);
    log("正在播放远程串流。");
  };
  const poll = async () => {
    if (closed) return;
    try {
      await postSignal("heartbeat");
      const payload = await api.getJson(`/api/p2p-signal?room=${encodeURIComponent(room)}&peer=${encodeURIComponent(peerId)}&since=${since}`);
      since = payload.now || since;
      renderPeers(payload.peers || []);
      for (const peer of payload.peers || []) {
        if (peer.id !== peerId && peerId < peer.id) ensurePeer(peer.id, false);
      }
      for (const message of payload.messages || []) {
        await handleSignal(message);
      }
      setStatus();
    } catch (error) {
      log(error.message || "信令失败。");
    }
    timer = window.setTimeout(poll, 1600);
  };

  return {
    start() {
      ui.status.textContent = "正在加入房间...";
      poll();
    },
    close() {
      closed = true;
      window.clearTimeout(timer);
      window.removeEventListener("p2p-profile", handleProfileEvent);
      ui.protocol.removeEventListener("change", broadcastProfile);
      ui.port.removeEventListener("input", broadcastProfile);
      if (localStream) {
        for (const track of localStream.getTracks()) track.stop();
      }
      for (const pc of peers.values()) pc.close();
      peers.clear();
      channels.clear();
    },
    sendFile(file) {
      const openChannels = [...channels.values()].filter((channel) => channel.readyState === "open");
      if (openChannels.length === 0) {
        log("还没有可用连接。");
        return;
      }
      for (const channel of openChannels) sendFileOverChannel(channel, file, log);
    }
  };
}

function sendFileOverChannel(channel, file, log) {
  const chunkSize = 64 * 1024;
  const transferId = crypto.randomUUID();
  channel.send(JSON.stringify({ kind: "file-meta", id: transferId, name: file.name, size: file.size, type: file.type }));
  let offset = 0;
  const reader = new FileReader();
  reader.onload = () => {
    channel.send(reader.result);
    offset += reader.result.byteLength;
    if (offset < file.size) {
      readNext();
    } else {
      channel.send(JSON.stringify({ kind: "file-end", id: transferId }));
      log(`已发送 ${file.name}`);
    }
  };
  const readNext = () => reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
  readNext();
}

function handleP2PData(remoteId, data, incoming, log) {
  if (typeof data === "string") {
    const message = JSON.parse(data);
    if (message.kind === "profile") {
      const event = new CustomEvent("p2p-profile", { detail: { remoteId, profile: message } });
      window.dispatchEvent(event);
    } else if (message.kind === "file-meta") {
      incoming.set(message.id, { ...message, chunks: [], received: 0 });
      log(`开始接收 ${message.name}`);
    } else if (message.kind === "file-end") {
      const transfer = incoming.get(message.id);
      if (!transfer) return;
      const blob = new Blob(transfer.chunks, { type: transfer.type || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = transfer.name || `file-from-${remoteId}`;
      link.textContent = `下载 ${transfer.name || "文件"}`;
      link.className = "button";
      log(`接收完成：${transfer.name}`);
      document.querySelector(".p2p-log")?.prepend(link);
      incoming.delete(message.id);
    }
    return;
  }

  const latest = [...incoming.values()].at(-1);
  if (latest) {
    latest.chunks.push(data);
    latest.received += data.byteLength || data.size || 0;
  }
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

function renderVisitorStatusStrip() {
  const summary = state.visitorSummary || visitorSummaryFallback;
  return renderStatusStrip([
    ["IP", summary.ip || "未知"],
    ["地区", summary.region || "未知"],
    ["运营商", summary.isp || "未知"],
    ["近期访问量", String(summary.recentVisits ?? "未知")]
  ]);
}

async function loadVisitorSummary() {
  try {
    const payload = await api.getJson("/api/visitor-summary");
    state.visitorSummary = payload;
    const strip = document.querySelector(".status-strip");
    if (strip) {
      strip.replaceWith(renderVisitorStatusStrip());
    }
  } catch {
    state.visitorSummary = {
      ip: "获取失败",
      region: "获取失败",
      isp: "获取失败",
      recentVisits: "获取失败"
    };
  }
}

function renderPageEntry(page) {
  const card = element("article", "module-card entry-card");
  applyEntryCardStyle(card, page.entry.backgroundImage);
  const header = element("header", "module-card-header");
  header.append(entryMark(page.entry), textBlock(page.entry.title || page.title, page.entry.description || page.description));

  const link = document.createElement("a");
  link.className = "button primary";
  link.href = `/${page.slug}`;
  link.textContent = "进入";

  card.append(header, link);
  return card;
}

function renderExternalLinkEntry(link) {
  const card = element("article", "module-card entry-card external-entry-card");
  applyEntryCardStyle(card, link.backgroundImage);
  const targetUrl = normalizeExternalUrl(link.targetUrl);
  const header = element("header", "module-card-header");
  header.append(linkMark(link), textBlock(link.title || "外部网站", link.description || externalLinkSubtitle(link)));

  const anchor = document.createElement("a");
  anchor.className = "button primary";
  anchor.href = targetUrl || "#";
  anchor.rel = "noreferrer";
  anchor.textContent = targetUrl ? "前往" : "未设置网址";

  if (!targetUrl) {
    anchor.setAttribute("aria-disabled", "true");
    anchor.addEventListener("click", (event) => event.preventDefault());
  }

  card.append(header, anchor);
  return card;
}

function renderLinkSection(section) {
  const card = element("article", "module-card entry-card external-entry-card link-section-card");
  applyEntryCardStyle(card, section.backgroundImage);
  const targetUrl = normalizeExternalUrl(section.targetUrl);
  const header = element("header", "module-card-header no-toggle");
  header.append(linkMark(section), textBlock(section.title || "网站入口", section.description || externalLinkSubtitle(section)));

  const anchor = document.createElement("a");
  anchor.className = "button primary";
  anchor.href = targetUrl || "#";
  anchor.rel = "noreferrer";
  anchor.textContent = targetUrl ? "前往" : "未设置网址";

  if (!targetUrl) {
    anchor.setAttribute("aria-disabled", "true");
    anchor.addEventListener("click", (event) => event.preventDefault());
  }

  card.append(header, anchor);
  return card;
}

function renderP2PEntrySection(section) {
  const card = element("article", "module-card entry-card p2p-entry-card");
  const header = element("header", "module-card-header no-toggle");
  header.append(mark("P2P"), textBlock(section.title || "P2P 文件传输", section.description || "进入房间后尝试点对点传文件。"));
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = `/p2p?room=${encodeURIComponent(section.room || section.id)}`;
  link.textContent = "进入房间";
  card.append(header, element("p", "form-hint", `房间：${section.room || section.id}`), link);
  return card;
}

function renderBlogSection(section, adminPreview = false) {
  const card = element("article", adminPreview ? "module-card blog-section blog-admin-preview" : "module-card blog-section");
  const articles = [...(section.articles || [])];
  const categories = section.categories?.length ? section.categories : [...new Set(articles.map((article) => article.category).filter(Boolean))];
  const featured = articles.filter((article) => article.featured).slice(0, 2);
  const heroArticles = featured.length ? featured : articles.slice(0, 2);

  const top = element("header", "blog-topbar");
  top.append(
    element("strong", "", section.title || "博客"),
    element("span", "", section.description || "发布文章和记录。")
  );
  card.append(top);

  if (section.notice) {
    const notice = element("div", "blog-notice");
    notice.append(mark("NB"), element("strong", "", section.notice));
    card.append(notice);
  }

  if (!articles.length) {
    card.append(element("p", "empty-state", "还没有发布文章。"));
    return card;
  }

  const hero = element("section", "blog-hero-grid");
  heroArticles.forEach((article, index) => {
    hero.append(renderBlogHeroArticle(article, index === 0));
  });
  card.append(hero);

  const tabs = element("nav", "blog-tabs");
  tabs.append(element("span", "is-active", "推荐"));
  for (const category of categories.slice(0, 8)) {
    tabs.append(element("span", "", category));
  }
  card.append(tabs);

  const body = element("section", "blog-layout");
  const sidebar = element("aside", "blog-sidebar-card");
  const avatar = section.profileImage ? document.createElement("img") : null;
  if (avatar) {
    avatar.src = section.profileImage;
    avatar.alt = section.profileName || "作者头像";
  }
  sidebar.append(
    avatar || mark((section.profileName || "站长").slice(0, 2).toUpperCase()),
    element("h3", "", section.profileName || "站长"),
    element("p", "", section.profileDescription || "这里是博客作者介绍。")
  );
  const tagCloud = element("div", "blog-tag-cloud");
  for (const tag of collectBlogTags(articles).slice(0, 18)) {
    tagCloud.append(element("span", "", tag));
  }
  sidebar.append(tagCloud);

  const list = element("div", "blog-card-list");
  articles.forEach((article) => list.append(renderBlogArticleCard(article)));
  body.append(sidebar, list);
  card.append(body);
  return card;
}

function renderBlogPage(page) {
  document.title = page.title;
  const blog = hydrateBlogSection(page.blog);
  const main = element("main", "workspace blog-page-workspace");
  applyPageBackground(main, page.backgroundImage);
  const articles = [...blog.articles];
  const featured = articles.filter((article) => article.featured).slice(0, 2);
  const heroArticles = featured.length ? featured : articles.slice(0, 2);
  const categories = blog.categories?.length ? blog.categories : [...new Set(articles.map((article) => article.category).filter(Boolean))];

  const nav = element("header", "blog-page-nav");
  nav.append(element("strong", "", `${page.title || "BLOG"} | BLOG`));
  const links = element("nav", "");
  for (const label of ["文库", "社交", "我的"]) {
    links.append(element("span", "", label));
  }
  nav.append(links);
  main.append(nav);

  if (blog.notice) {
    const notice = element("section", "blog-page-notice");
    notice.append(mark("NB"), element("strong", "", blog.notice), element("span", "", "›"));
    main.append(notice);
  }

  const hero = element("section", "blog-page-hero");
  const intro = element("article", "blog-page-intro");
  intro.append(element("h1", "", blog.description || page.description || "收录开源，好用的互联网项目"));
  intro.append(element("p", "", page.slug.toUpperCase()));
  const quick = element("div", "blog-quick-links");
  for (const label of categories.slice(0, 4)) {
    quick.append(element("span", "", label));
  }
  intro.append(quick);
  hero.append(intro);

  if (heroArticles[0]) {
    hero.append(renderBlogHeroArticle(heroArticles[0], true));
  }
  main.append(hero);

  const tabs = element("nav", "blog-page-tabs");
  tabs.append(element("span", "is-active", "推荐"));
  for (const category of categories.slice(0, 7)) {
    tabs.append(element("span", "", category));
  }
  tabs.append(element("span", "", "更多"));
  main.append(tabs);

  const layout = element("section", "blog-page-layout");
  const profile = element("aside", "blog-profile-panel");
  const avatar = blog.profileImage ? document.createElement("img") : null;
  if (avatar) {
    avatar.src = blog.profileImage;
    avatar.alt = blog.profileName || "作者头像";
  }
  profile.append(
    avatar || mark((blog.profileName || "站长").slice(0, 2).toUpperCase()),
    element("h2", "", blog.profileName || "站长"),
    element("p", "", blog.profileDescription || "这里是博客作者介绍。")
  );
  const tagCloud = element("div", "blog-tag-cloud");
  for (const tag of collectBlogTags(articles).slice(0, 24)) {
    tagCloud.append(element("span", "", tag));
  }
  profile.append(tagCloud);

  const list = element("section", "blog-page-articles");
  if (!articles.length) {
    list.append(element("p", "empty-state", "还没有发布文章。管理员进入后台后可以发布第一篇。"));
  } else {
    articles.forEach((article) => list.append(renderBlogArticleCard(article)));
  }
  layout.append(profile, list);
  main.append(layout);
  app.append(main);
}

function renderBlogPagePreview(page) {
  const wrapper = element("section", "admin-panel blog-page-preview-panel");
  wrapper.append(element("h2", "", "博客页面预览"));
  wrapper.append(element("p", "", "保存后用户打开这个分页面会看到下面这种整页博客布局。"));
  const preview = element("div", "blog-page-preview");
  const blog = hydrateBlogSection(page.blog);
  const articles = [...blog.articles];
  const categories = blog.categories?.length ? blog.categories : [...new Set(articles.map((article) => article.category).filter(Boolean))];
  const nav = element("header", "blog-page-nav");
  nav.append(element("strong", "", `${page.title || "BLOG"} | BLOG`));
  nav.append(element("nav", "", "文库  社交  我的"));
  preview.append(nav);
  if (blog.notice) {
    const notice = element("section", "blog-page-notice");
    notice.append(mark("NB"), element("strong", "", blog.notice), element("span", "", "›"));
    preview.append(notice);
  }
  const hero = element("section", "blog-page-hero");
  const intro = element("article", "blog-page-intro");
  intro.append(element("h1", "", blog.description || page.description), element("p", "", page.slug.toUpperCase()));
  const quick = element("div", "blog-quick-links");
  categories.slice(0, 4).forEach((label) => quick.append(element("span", "", label)));
  intro.append(quick);
  hero.append(intro);
  if (articles[0]) hero.append(renderBlogHeroArticle(articles[0], true));
  preview.append(hero);
  const tabs = element("nav", "blog-page-tabs");
  tabs.append(element("span", "is-active", "推荐"));
  categories.slice(0, 7).forEach((label) => tabs.append(element("span", "", label)));
  preview.append(tabs);
  const list = element("section", "blog-page-articles");
  articles.slice(0, 4).forEach((article) => list.append(renderBlogArticleCard(article)));
  if (!articles.length) list.append(element("p", "empty-state", "还没有发布文章。"));
  preview.append(list);
  wrapper.append(preview);
  return wrapper;
}

function renderBlogHeroArticle(article, large) {
  const item = element("article", large ? "blog-hero-card is-large" : "blog-hero-card");
  if (article.coverImage) {
    item.style.backgroundImage = `linear-gradient(90deg, rgba(9, 13, 17, 0.72), rgba(9, 13, 17, 0.18)), url("${cssUrl(article.coverImage)}")`;
  }
  item.append(
    element("span", "blog-category", article.category || "文章"),
    element("h3", "", article.title || "未命名文章"),
    element("p", "", article.summary || article.body || "还没有摘要。")
  );
  return item;
}

function renderBlogArticleCard(article) {
  const item = element("article", "blog-article-card");
  if (article.coverImage) {
    const image = document.createElement("img");
    image.src = article.coverImage;
    image.alt = article.title || "";
    item.append(image);
  }

  const content = element("div", "blog-article-content");
  content.append(
    element("span", "blog-category", article.category || "文章"),
    element("h3", "", article.title || "未命名文章"),
    element("p", "", article.summary || "还没有摘要。"),
    element("small", "", `${article.authorName || article.authorRole || "作者"} · ${formatDateTime(article.createdAt)}`)
  );

  const tags = element("div", "blog-tag-cloud compact");
  for (const tag of article.tags || []) {
    tags.append(element("span", "", tag));
  }
  content.append(tags);

  if (article.body) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "阅读全文";
    const body = element("div", "blog-article-body");
    for (const paragraph of article.body.split(/\n+/).filter(Boolean)) {
      body.append(element("p", "", paragraph));
    }
    details.append(summary, body);
    content.append(details);
  }

  item.append(content);
  return item;
}

function collectBlogTags(articles) {
  return [...new Set(articles.flatMap((article) => article.tags || []).filter(Boolean))];
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

function renderVideoSection(section) {
  const card = element("article", "module-card video-section");
  const header = element("header", "module-card-header no-toggle");
  header.append(mark("VD"), textBlock(section.title || "视频", section.description));
  card.append(header);

  const frame = element("figure", "video-frame");
  if (section.src) {
    const video = document.createElement("video");
    video.src = section.src;
    video.controls = true;
    video.disablePictureInPicture = false;
    video.controlsList = "nodownload";
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("x-webkit-airplay", "allow");
    const source = document.createElement("source");
    source.src = section.src;
    const mimeType = videoMimeType(section.src);

    if (mimeType) {
      source.type = mimeType;
    }

    video.append(source);

    if (section.poster) {
      video.poster = section.poster;
    }

    const play = button("播放", "button primary video-play-button", "button");
    const startVideo = async () => {
      try {
        if (video.readyState === 0) {
          video.load();
        }
        await video.play();
        play.classList.add("is-hidden");
      } catch {
        play.textContent = "新窗口播放";
        play.onclick = () => window.open(section.src, "_blank", "noopener,noreferrer");
      }
    };
    play.addEventListener("click", startVideo);
    frame.addEventListener("click", (event) => {
      if (event.target === play || event.target === video) {
        return;
      }

      startVideo();
    });
    video.addEventListener("play", () => play.classList.add("is-hidden"));
    video.addEventListener("pause", () => play.classList.remove("is-hidden"));
    frame.append(video, play);
  } else {
    frame.append(element("div", "video-placeholder", "还没有设置视频"));
  }

  if (section.caption) {
    frame.append(element("figcaption", "", section.caption));
  }

  card.append(frame);
  return card;
}

function renderCommentsSection(page, source, adminMode) {
  const card = element("article", adminMode ? "module-card comments-section admin-comments-section" : "module-card comments-section");
  card.style.setProperty("--comments-list-height", `${source.listHeight || 320}px`);
  const header = element("header", "module-card-header no-toggle");
  header.append(mark("CM"), textBlock(source.title || "评论", source.description || "留下你的想法。"));

  const form = element("form", "comment-form");
  const name = document.createElement("input");
  name.className = "input";
  name.name = "name";
  name.placeholder = "你的名字";
  name.maxLength = 40;
  const displayIp = document.createElement("input");
  displayIp.className = "input";
  displayIp.name = "displayIp";
  displayIp.placeholder = "管理员显示 IP（留空自动获取）";
  displayIp.maxLength = 80;
  displayIp.value = adminMode ? localStorage.getItem(`${adminCommentIpKeyPrefix}${page.slug}`) || "" : "";
  displayIp.addEventListener("input", () => {
    localStorage.setItem(`${adminCommentIpKeyPrefix}${page.slug}`, displayIp.value);
  });
  const body = document.createElement("textarea");
  body.className = "textarea";
  body.name = "body";
  body.placeholder = "写下评论...";
  body.maxLength = 1000;
  body.required = true;
  const submit = button("发表评论", "button primary", "submit");
  const feedback = element("p", "form-hint");
  form.append(name);
  if (adminMode) {
    form.append(displayIp);
  }
  form.append(body, submit, feedback);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "提交中";
    feedback.textContent = "";

    try {
      const payload = await api.postJson("/api/comments", {
        page: page.slug,
        name: name.value,
        body: body.value,
        displayIp: adminMode ? displayIp.value : ""
      }, adminMode);
      body.value = "";
      feedback.textContent = "评论已发布。";
      updateCommentCache(page.slug, payload.comments || []);
      refreshCommentLists(page.slug);
    } catch (error) {
      feedback.textContent = error.message;
    }

    submit.disabled = false;
    submit.textContent = "发表评论";
  });

  const list = element("div", "comments-list");
  const adminActions = element("div", "module-actions");

  if (adminMode) {
    const clear = button("清空这个页面的评论", "button danger", "button");
    clear.addEventListener("click", async () => {
      if (!confirm(`确定清空 /${page.slug} 的所有评论？`)) {
        return;
      }

      const payload = await api.postJson("/api/admin/comments", { page: page.slug, action: "clear" }, true);
      updateCommentCache(page.slug, payload.comments || []);
      refreshCommentLists(page.slug);
    });
    adminActions.append(clear);
  }

  card.append(header, form);

  if (adminMode) {
    card.append(adminActions);
  }

  card.append(list);
  loadComments(page.slug, list, adminMode);
  return card;
}

function renderCommentsManager(page) {
  const card = element("section", "comments-manager");
  const head = element("div", "section-head action-head");
  const copy = element("div");
  copy.append(element("h2", "", "评论管理"));
  copy.append(element("p", "", "这里可以编辑或删除某一条评论，也可以清空当前分页面的全部评论。"));
  const clear = button("清空评论", "button danger", "button");
  const list = element("div", "comments-list");
  clear.addEventListener("click", async () => {
    if (!confirm(`确定清空 /${page.slug} 的所有评论？`)) {
      return;
    }

    const payload = await api.postJson("/api/admin/comments", { page: page.slug, action: "clear" }, true);
    updateCommentCache(page.slug, payload.comments || []);
    refreshCommentLists(page.slug);
  });
  head.append(copy, clear);
  card.append(head, list);
  loadComments(page.slug, list, true);
  return card;
}

async function loadComments(pageSlug, list, adminMode, options = {}) {
  list.dataset.commentsPage = pageSlug;
  list.dataset.adminMode = adminMode ? "1" : "0";

  if (!options.force && state.commentCache.has(pageSlug)) {
    renderCommentsList(pageSlug, list, adminMode, state.commentCache.get(pageSlug));
    return;
  }

  list.replaceChildren(element("p", "form-hint", "正在加载评论..."));

  try {
    const comments = await getComments(pageSlug, options);
    refreshCommentLists(pageSlug);

    if (!document.body.contains(list)) {
      return;
    }

    renderCommentsList(pageSlug, list, adminMode, comments);
  } catch (error) {
    list.replaceChildren(element("p", "form-error", error.message));
  }
}

async function getComments(pageSlug, options = {}) {
  if (!options.force && state.commentCache.has(pageSlug)) {
    return state.commentCache.get(pageSlug);
  }

  if (!options.force && state.commentRequests.has(pageSlug)) {
    return state.commentRequests.get(pageSlug);
  }

  const request = api
    .getJson(`/api/comments?page=${encodeURIComponent(pageSlug)}`)
    .then((payload) => {
      const comments = payload.comments || [];
      updateCommentCache(pageSlug, comments);
      return comments;
    })
    .finally(() => {
      state.commentRequests.delete(pageSlug);
    });

  state.commentRequests.set(pageSlug, request);
  return request;
}

function updateCommentCache(pageSlug, comments) {
  state.commentCache.set(pageSlug, Array.isArray(comments) ? comments : []);
}

function refreshCommentLists(pageSlug) {
  const comments = state.commentCache.get(pageSlug) || [];

  for (const list of document.querySelectorAll(".comments-list")) {
    if (list.dataset.commentsPage === pageSlug) {
      renderCommentsList(pageSlug, list, list.dataset.adminMode === "1", comments);
    }
  }
}

function renderCommentsList(pageSlug, list, adminMode, comments) {
  if (!comments.length) {
    list.replaceChildren(element("p", "empty-state", "还没有评论。"));
    return;
  }

  list.replaceChildren(...comments.map((comment) => renderCommentItem(pageSlug, comment, adminMode, list)));
}

function renderCommentItem(pageSlug, comment, adminMode, list) {
  const item = element("article", "comment-item");
  const head = element("div", "comment-head");
  const meta = [comment.ip || "unknown", comment.device || "未知设备", formatDate(comment.createdAt)].join(" · ");
  head.append(element("strong", "", comment.name || "访客"));
  head.append(element("span", "comment-meta", meta));
  const body = element("p", "", comment.body);
  item.append(head, body);

  if (adminMode) {
    const editor = element("div", "comment-editor-host");
    const actions = element("div", "comment-actions");
    const edit = button("编辑", "button", "button");
    const remove = button("删除", "button danger", "button");

    edit.addEventListener("click", () => {
      editor.replaceChildren(renderCommentEditForm(pageSlug, comment, () => {
        editor.replaceChildren();
      }));
    });

    remove.addEventListener("click", async () => {
      const payload = await api.postJson("/api/admin/comments", { page: pageSlug, action: "delete", id: comment.id }, true);
      updateCommentCache(pageSlug, payload.comments || []);
      refreshCommentLists(pageSlug);
    });

    actions.append(edit, remove);
    item.append(actions, editor);
  }

  return item;
}

function renderCommentEditForm(pageSlug, comment, onCancel) {
  const form = element("form", "comment-edit-form");
  const fields = element("div", "comment-edit-grid");
  const name = document.createElement("input");
  name.className = "input";
  name.name = "name";
  name.maxLength = 40;
  name.placeholder = "评论名字";
  name.value = comment.name || "";
  const ip = document.createElement("input");
  ip.className = "input";
  ip.name = "ip";
  ip.maxLength = 80;
  ip.placeholder = "显示 IP";
  ip.value = comment.ip || "";
  const device = document.createElement("input");
  device.className = "input";
  device.name = "device";
  device.maxLength = 120;
  device.placeholder = "设备信息";
  device.value = comment.device || "";
  const body = document.createElement("textarea");
  body.className = "textarea";
  body.name = "body";
  body.maxLength = 1000;
  body.required = true;
  body.value = comment.body || "";
  const feedback = element("p", "form-hint");
  const controls = element("div", "comment-edit-actions");
  const cancel = button("取消", "button", "button");
  const save = button("保存修改", "button primary", "submit");

  cancel.addEventListener("click", onCancel);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    save.textContent = "保存中";
    feedback.textContent = "";

    try {
      const payload = await api.postJson("/api/admin/comments", {
        page: pageSlug,
        action: "update",
        id: comment.id,
        name: name.value,
        body: body.value,
        ip: ip.value,
        device: device.value
      }, true);
      updateCommentCache(pageSlug, payload.comments || []);
      refreshCommentLists(pageSlug);
    } catch (error) {
      feedback.textContent = error.message;
      save.disabled = false;
      save.textContent = "保存修改";
    }
  });

  fields.append(name, ip, device);
  controls.append(cancel, save);
  form.append(fields, body, controls, feedback);
  return form;
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
    api,
    page
  };
}

function hydrateConfig(config) {
  const next = config || fallbackConfig;

  return {
    ...fallbackConfig,
    ...next,
    commentBlockWords: normalizeBlockWordsInput(next.commentBlockWords || []),
    announcement: hydrateAnnouncement(next.announcement),
    links: (next.links || fallbackConfig.links).map(hydrateExternalLink),
    pages: (next.pages || fallbackConfig.pages).map(hydratePage)
  };
}

function normalizeBlockWordsInput(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  const words = source.map((word) => String(word || "").trim().slice(0, 60)).filter(Boolean).slice(0, 200);
  return [...new Set(words)];
}

function hydrateAnnouncement(announcement) {
  return {
    enabled: Boolean(announcement?.enabled),
    title: announcement?.title || "公告",
    text: announcement?.text || announcement?.message || "",
    durationSeconds: clampNumber(Number(announcement?.durationSeconds ?? announcement?.closeAfterSeconds ?? 8), 0, 120)
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
    kind: page.kind === "blog" ? "blog" : "normal",
    sections,
    modules: sections.filter((section) => section.type === "system").map((section) => section.moduleId),
    blocks: sections.filter((section) => section.type === "text"),
    backgroundImage: page.backgroundImage || "",
    locked: Boolean(page.locked),
    passwordEnabled: Boolean(page.passwordEnabled),
    pagePassword: page.pagePassword || "",
    entry: hydrateEntry(page.entry),
    comments: hydrateComments(page.comments),
    blog: hydrateBlogSection(page.blog)
  };
}

function hydrateLayout(layout, type = "text") {
  const defaultMinHeight = type === "comments" ? 320 : 280;

  return {
    width: clampNumber(Number(layout?.width ?? 0), 0, 100),
    minHeight: clampNumber(Number(layout?.minHeight ?? defaultMinHeight), 120, 900),
    locked: Boolean(layout?.locked)
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
      moduleId: section.moduleId || state.modules[0]?.id || "",
      layout: hydrateLayout(section.layout, "system")
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
      fit: section.fit === "contain" ? "contain" : "cover",
      layout: hydrateLayout(section.layout, "image")
    };
  }

  if (section.type === "video") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "video",
      title: section.title || "视频模块",
      description: section.description || "",
      src: section.src || "",
      poster: section.poster || "",
      caption: section.caption || "",
      layout: hydrateLayout(section.layout, "video")
    };
  }

  if (section.type === "p2p") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "p2p",
      title: section.title || "P2P 文件传输",
      description: section.description || "进入房间后尝试点对点传文件。",
      room: normalizeRoomId(section.room || section.id || "p2p-room"),
      layout: hydrateLayout(section.layout, "p2p")
    };
  }

  if (section.type === "comments") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "comments",
      title: section.title || "评论",
      description: section.description || "留下你的想法。",
      listHeight: clampNumber(Number(section.listHeight ?? 320), 180, 900),
      layout: hydrateLayout(section.layout, "comments")
    };
  }

  if (section.type === "link") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "link",
      title: section.title || "网站入口",
      description: section.description || "",
      targetUrl: normalizeExternalUrl(section.targetUrl || ""),
      iconText: (section.iconText || "WEB").slice(0, 4).toUpperCase(),
      iconImage: section.iconImage || "",
      backgroundImage: section.backgroundImage || "",
      layout: hydrateLayout(section.layout, "link")
    };
  }

  if (section.type === "blog") {
    return {
      id: section.id || crypto.randomUUID(),
      type: "blog",
      title: section.title || "博客",
      description: section.description || "发布文章和记录。",
      notice: section.notice || "",
      profileName: section.profileName || "站长",
      profileDescription: section.profileDescription || "这里是博客作者介绍。",
      profileImage: section.profileImage || "",
      categories: Array.isArray(section.categories) ? section.categories : [],
      articles: Array.isArray(section.articles) ? section.articles.map(hydrateBlogArticle) : [],
      layout: hydrateLayout(section.layout, "blog")
    };
  }

  return {
    id: section.id || crypto.randomUUID(),
    type: "text",
    icon: section.icon || "TX",
    title: section.title || "文本模块",
    description: section.description || "",
    body: section.body || "",
    layout: hydrateLayout(section.layout, "text")
  };
}

function hydrateBlogArticle(article) {
  const now = new Date().toISOString();
  return {
    id: article?.id || crypto.randomUUID(),
    title: article?.title || "未命名文章",
    summary: article?.summary || "",
    body: article?.body || "",
    coverImage: article?.coverImage || "",
    category: article?.category || "随笔",
    tags: Array.isArray(article?.tags) ? article.tags : splitTags(article?.tags || ""),
    authorRole: article?.authorRole === "admin" ? "admin" : "limited",
    authorName: article?.authorName || (article?.authorRole === "admin" ? "admin" : "limited"),
    createdAt: article?.createdAt || now,
    updatedAt: article?.updatedAt || article?.createdAt || now,
    featured: Boolean(article?.featured)
  };
}

function hydrateBlogSection(blog) {
  return {
    id: blog?.id || crypto.randomUUID(),
    type: "blog",
    title: blog?.title || "博客",
    description: blog?.description || "收录文章、笔记和日常。",
    notice: blog?.notice || "",
    profileName: blog?.profileName || "站长",
    profileDescription: blog?.profileDescription || "这里是博客作者介绍。",
    profileImage: blog?.profileImage || "",
    categories: Array.isArray(blog?.categories) ? blog.categories : ["推荐", "教程", "日常"],
    articles: Array.isArray(blog?.articles) ? blog.articles.map(hydrateBlogArticle) : [],
    layout: hydrateLayout(blog?.layout, "blog")
  };
}

function hydrateEntry(entry) {
  return {
    title: entry?.title || "",
    description: entry?.description || "",
    iconText: (entry?.iconText || "PG").slice(0, 4).toUpperCase(),
    iconImage: entry?.iconImage || "",
    sidebarTitle: entry?.sidebarTitle || "",
    sidebarDescription: entry?.sidebarDescription || "",
    sidebarIconText: (entry?.sidebarIconText || "").slice(0, 4).toUpperCase(),
    sidebarIconImage: entry?.sidebarIconImage || "",
    backgroundImage: entry?.backgroundImage || ""
  };
}

function hydrateComments(comments) {
  return {
    enabled: comments?.enabled !== false,
    mode: comments?.mode === "module" ? "module" : "bottom",
    title: comments?.title || "评论",
    description: comments?.description || "留下你的想法。",
    listHeight: clampNumber(Number(comments?.listHeight ?? 320), 180, 900),
    layout: hydrateLayout(comments?.layout, "comments")
  };
}

function hydrateExternalLink(link) {
  return {
    id: link?.id || crypto.randomUUID(),
    title: link?.title || "网站入口",
    description: link?.description || "",
    targetUrl: link?.targetUrl || link?.url || "",
    visible: link?.visible !== false,
    iconText: (link?.iconText || "WEB").slice(0, 4).toUpperCase(),
    iconImage: link?.iconImage || "",
    backgroundImage: link?.backgroundImage || ""
  };
}

function ensureAdminSelection() {
  const links = state.config.links || [];
  const pageExists = state.config.pages.some((page) => page.id === state.selectedPageId);
  const linkExists = links.some((link) => link.id === state.selectedLinkId);

  if (isLimitedAdmin()) {
    if (state.selectedItemType === "page" && pageExists) {
      return;
    }

    state.selectedItemType = "page";
    state.selectedPageId = state.config.pages[0]?.id || "";
    return;
  }

  if (state.selectedItemType === "logs" || state.selectedItemType === "home") {
    return;
  }

  if (state.selectedItemType === "page" && pageExists) {
    return;
  }

  if (state.selectedItemType === "link" && linkExists) {
    return;
  }

  state.selectedItemType = "page";
  state.selectedPageId = state.config.pages[0]?.id || "";
  state.selectedLinkId = links[0]?.id || "";
}

function isLimitedAdmin() {
  return state.adminRole === "limited";
}

function getSelectedAdminItem() {
  if (state.selectedItemType === "home") {
    return { type: "home" };
  }

  if (state.selectedItemType === "logs") {
    return { type: "logs" };
  }

  if (state.selectedItemType === "link") {
    const link = state.config.links.find((item) => item.id === state.selectedLinkId);

    if (link) {
      return { type: "link", link };
    }
  }

  const page = getSelectedPage();
  return page ? { type: "page", page } : null;
}

function getSelectedPage() {
  return state.config.pages.find((page) => page.id === state.selectedPageId) || state.config.pages[0] || null;
}

function createPage() {
  const index = state.config.pages.length + 1;

  return {
    id: crypto.randomUUID(),
    slug: uniqueClientSlug(`page-${index}`),
    kind: "normal",
    title: `新分页面 ${index}`,
    description: "在这里填写页面说明。",
    backgroundImage: "",
    locked: false,
    passwordEnabled: false,
    pagePassword: "",
    visible: true,
    entry: {
      title: "",
      description: "",
      iconText: "PG",
      iconImage: "",
      sidebarTitle: "",
      sidebarDescription: "",
      sidebarIconText: "",
      sidebarIconImage: "",
      backgroundImage: ""
    },
    comments: {
      enabled: true,
      mode: "bottom",
      title: "评论",
      description: "留下你的想法。",
      listHeight: 320,
      layout: hydrateLayout(null, "comments")
    },
    modules: [],
    blocks: [],
    sections: []
  };
}

function createBlogPage() {
  const index = state.config.pages.length + 1;
  const page = createPage();
  page.slug = uniqueClientSlug(`blog-${index}`);
  page.kind = "blog";
  page.title = "博客";
  page.description = "收录文章、笔记和日常。";
  page.entry.iconText = "BG";
  page.entry.sidebarIconText = "BG";
  page.comments.enabled = false;
  page.blog = createBlogSection();
  page.blog.title = "BLOG";
  page.blog.description = "收录开源、好用的互联网项目。";
  page.blog.notice = "这里可以放最新公告或更新说明。";
  return page;
}

function createExternalLink() {
  const index = state.config.links.length + 1;

  return {
    id: crypto.randomUUID(),
    title: `网站入口 ${index}`,
    description: "点击前往外部网站。",
    targetUrl: "",
    visible: true,
    iconText: "WEB",
    iconImage: "",
    backgroundImage: ""
  };
}

function createSystemSection() {
  return {
    id: crypto.randomUUID(),
    type: "system",
    moduleId: state.modules[0]?.id || "",
    layout: hydrateLayout(null, "system")
  };
}

function createTextSection() {
  return {
    id: crypto.randomUUID(),
    type: "text",
    icon: "TX",
    title: "文本模块",
    description: "简短说明",
    body: "在这里编辑正文。",
    layout: hydrateLayout(null, "text")
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
    fit: "cover",
    layout: hydrateLayout(null, "image")
  };
}

function createVideoSection() {
  return {
    id: crypto.randomUUID(),
    type: "video",
    title: "视频模块",
    description: "点击播放视频。",
    src: "",
    poster: "",
    caption: "",
    layout: hydrateLayout(null, "video")
  };
}

function createP2PSection() {
  return {
    id: crypto.randomUUID(),
    type: "p2p",
    title: "P2P 文件传输",
    description: "进入房间后尝试点对点传文件。",
    room: `room-${Math.random().toString(36).slice(2, 8)}`,
    layout: hydrateLayout(null, "p2p")
  };
}

function createCommentsSection() {
  return {
    id: crypto.randomUUID(),
    type: "comments",
    title: "评论",
    description: "留下你的想法。",
    listHeight: 320,
    layout: hydrateLayout(null, "comments")
  };
}

function createLinkSection() {
  return {
    id: crypto.randomUUID(),
    type: "link",
    title: "网站入口",
    description: "点击前往目标网站。",
    targetUrl: "",
    iconText: "WEB",
    iconImage: "",
    backgroundImage: "",
    layout: hydrateLayout(null, "link")
  };
}

function createBlogSection() {
  return {
    id: crypto.randomUUID(),
    type: "blog",
    title: "博客",
    description: "发布文章和记录。",
    notice: "欢迎来到我的博客。",
    profileName: "站长",
    profileDescription: "这里是博客作者介绍。",
    profileImage: "",
    categories: ["推荐", "教程", "日常"],
    articles: [],
    layout: hydrateLayout(null, "blog")
  };
}

function insertSection(page, index, section) {
  if (isLimitedAdmin() && page.locked) {
    state.saveStatus = "这个分页面已锁定，低权限管理员不能添加模块。";
    renderAdminEditor();
    return;
  }

  rememberConfigChange();
  page.sections.splice(index, 0, section);
  state.expandedSections.add(section.id);
  renderAdminEditor();
}

function moveSection(page, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= page.sections.length) {
    return;
  }

  if (isLimitedAdmin() && (page.locked || page.sections[index]?.layout?.locked || page.sections[nextIndex]?.layout?.locked)) {
    state.saveStatus = "锁定的模块不能移动或被跨过。";
    renderAdminEditor();
    return;
  }

  rememberConfigChange();
  const [section] = page.sections.splice(index, 1);
  page.sections.splice(nextIndex, 0, section);
  renderAdminEditor();
}

function moveSectionTo(page, index, nextIndex) {
  const targetIndex = Math.max(0, Math.min(page.sections.length - 1, nextIndex));

  if (targetIndex === index) {
    return;
  }

  if (isLimitedAdmin() && (page.locked || page.sections[index]?.layout?.locked)) {
    state.saveStatus = "锁定的模块不能移动。";
    renderAdminEditor();
    return;
  }

  const start = Math.min(index, targetIndex);
  const end = Math.max(index, targetIndex);
  const crossesLocked = page.sections.slice(start, end + 1).some((section, sectionIndex) => {
    const actualIndex = start + sectionIndex;
    return isLimitedAdmin() && actualIndex !== index && section.layout?.locked;
  });

  if (crossesLocked) {
    state.saveStatus = "不能跨过已锁定模块。";
    renderAdminEditor();
    return;
  }

  rememberConfigChange();
  const [section] = page.sections.splice(index, 1);
  page.sections.splice(targetIndex, 0, section);
  renderAdminEditor();
}

function deletePage(page) {
  if (state.config.pages.length <= 1) {
    state.saveStatus = "至少保留一个分页面。";
    renderAdminEditor();
    return;
  }

  if (confirm(`确定删除“${page.title}”？`)) {
    rememberConfigChange();
    state.config.pages = state.config.pages.filter((item) => item.id !== page.id);
    state.selectedPageId = state.config.pages[0]?.id || "";
    state.expandedSettings = "";
    renderAdminEditor();
  }
}

function reorderPageById(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId || isLimitedAdmin()) {
    return;
  }

  const sourceIndex = state.config.pages.findIndex((page) => page.id === sourceId);
  const targetIndex = state.config.pages.findIndex((page) => page.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  rememberConfigChange();
  const [page] = state.config.pages.splice(sourceIndex, 1);
  state.config.pages.splice(targetIndex, 0, page);
  state.selectedItemType = "page";
  state.selectedPageId = page.id;
  state.expandedSettings = "";
  renderAdminEditor();
}

function reorderLinkById(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId || isLimitedAdmin()) {
    return;
  }

  const sourceIndex = state.config.links.findIndex((link) => link.id === sourceId);
  const targetIndex = state.config.links.findIndex((link) => link.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  rememberConfigChange();
  const [link] = state.config.links.splice(sourceIndex, 1);
  state.config.links.splice(targetIndex, 0, link);
  state.selectedItemType = "link";
  state.selectedLinkId = link.id;
  state.expandedSettings = "";
  renderAdminEditor();
}

function reorderBlogArticle(section, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }

  const sourceIndex = section.articles.findIndex((article) => article.id === sourceId);
  const targetIndex = section.articles.findIndex((article) => article.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const source = section.articles[sourceIndex];
  const target = section.articles[targetIndex];

  if (isLimitedAdmin() && (source.authorRole === "admin" || target.authorRole === "admin")) {
    state.saveStatus = "admin 发布的文章只有 admin 可以调整顺序。";
    renderAdminEditor();
    return;
  }

  rememberConfigChange();
  const [article] = section.articles.splice(sourceIndex, 1);
  section.articles.splice(targetIndex, 0, article);
  renderAdminEditor();
}

function deleteExternalLink(link) {
  if (confirm(`确定删除“${link.title}”？`)) {
    rememberConfigChange();
    state.config.links = state.config.links.filter((item) => item.id !== link.id);
    state.selectedItemType = "page";
    state.selectedPageId = state.config.pages[0]?.id || "";
    state.selectedLinkId = state.config.links[0]?.id || "";
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

  if (section.type === "video") {
    return section.title || "视频模块";
  }

  if (section.type === "p2p") {
    return section.title || "传输模块";
  }

  if (section.type === "link") {
    return section.title || "网站模块";
  }

  if (section.type === "comments") {
    return section.title || "评论模块";
  }

  if (section.type === "blog") {
    return section.title || "博客模块";
  }

  return section.title || "文本模块";
}

function splitTags(value) {
  return String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function field(label, value, onInput, hint = "") {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.className = "input";
  input.value = value || "";
  trackUndoOnEdit(input);
  input.addEventListener("input", () => {
    onInput(input.value);
  });
  wrapper.append(input);

  if (hint) {
    wrapper.append(element("small", "", hint));
  }

  return wrapper;
}

function sidebarField(label, value, onInput, hint = "", disabled = false) {
  const wrapper = element("label", "sidebar-field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.value = value || "";
  input.disabled = disabled;
  trackUndoOnEdit(input);
  input.addEventListener("input", () => {
    onInput(input.value);
  });
  wrapper.append(input);
  if (hint) wrapper.append(element("small", "", hint));
  return wrapper;
}

function sidebarAreaField(label, value, onInput, disabled = false) {
  const wrapper = element("label", "sidebar-field");
  wrapper.append(element("span", "", label));
  const textarea = document.createElement("textarea");
  textarea.value = value || "";
  textarea.disabled = disabled;
  trackUndoOnEdit(textarea);
  textarea.addEventListener("input", () => {
    onInput(textarea.value);
  });
  wrapper.append(textarea);
  return wrapper;
}

function areaField(label, value, onInput, hint = "") {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.value = value || "";
  trackUndoOnEdit(textarea);
  textarea.addEventListener("input", () => {
    onInput(textarea.value);
  });
  wrapper.append(textarea);
  if (hint) {
    wrapper.append(element("small", "", hint));
  }
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
  select.addEventListener("change", () => {
    rememberConfigChange();
    onChange(select.value);
  });
  wrapper.append(select);
  return wrapper;
}

function numberField(label, value, min, max, step, onChange) {
  const wrapper = element("label", "field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.className = "input";
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value ?? min);
  input.addEventListener("change", () => {
    const next = clampNumber(Number(input.value), min, max);
    input.value = String(next);
    rememberConfigChange();
    onChange(next);
  });
  wrapper.append(input);
  return wrapper;
}

function checkbox(label, checked, onChange, disabled = false) {
  const wrapper = element("label", "check-row");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener("change", () => {
    rememberConfigChange();
    onChange(input.checked);
  });
  wrapper.append(input, element("span", "", label));
  return wrapper;
}

function imageValueField(label, value, onChange) {
  const wrapper = element("div", "field image-value-field");
  wrapper.append(element("span", "", label));
  const input = document.createElement("input");
  input.className = "input";
  input.value = value || "";
  input.placeholder = "粘贴图片地址或上传图片";
  trackUndoOnEdit(input);
  input.addEventListener("input", () => {
    onChange(input.value);
  });

  const upload = document.createElement("input");
  upload.type = "file";
  upload.accept = "image/*";
  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];

    if (!file) {
      return;
    }

    state.saveStatus = "正在处理图片...";
    rememberConfigChange();
    renderAdminEditor();

    try {
      const dataUrl = await imageFileToDataUrl(file);
      onChange(dataUrl);
      state.saveStatus = "图片已加入预览，记得保存配置。";
    } catch (error) {
      state.saveStatus = error.message;
    }

    renderAdminEditor();
  });

  wrapper.append(input, upload, element("small", "", "留空则不使用这张图片。"));
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

function fileToDataUrl(file, expectedPrefix) {
  if (!file.type.startsWith(expectedPrefix)) {
    throw new Error(expectedPrefix === "video/" ? "请选择视频文件。" : "文件类型不正确。");
  }

  const maxBytes = 18 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("视频太大了，请上传 18MB 以内的视频，或使用视频外链。");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("文件读取失败。"));
    reader.readAsDataURL(file);
  });
}

function videoMimeType(src) {
  if (!src) {
    return "";
  }

  const dataMatch = src.match(/^data:([^;,]+)/);
  if (dataMatch) {
    return dataMatch[1];
  }

  const clean = src.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogv") || clean.endsWith(".ogg")) return "video/ogg";
  if (clean.endsWith(".mov")) return "video/quicktime";
  return "";
}

function videoFileToPoster(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);
    video.addEventListener("loadeddata", () => {
      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const maxSize = 1280;
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        cleanup();
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        cleanup();
        reject(new Error("视频封面生成失败。"));
      }
    });
    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("视频读取失败。"));
    });
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败。"));
    image.src = src;
  });
}

function navLink(href, icon, title, description, active, options = {}) {
  const link = document.createElement("a");
  link.className = active ? "is-active" : "";
  link.href = href;

  if (options.external) {
    link.classList.add("is-external");
    link.rel = "noreferrer";
  }

  link.append(iconMark(icon, options.iconImage || "", options.fallbackIcon || ""), textBlock(title, description));
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

function entryMark(entry) {
  return iconMark(entry.iconText || "PG", entry.iconImage || "");
}

function pageSidebarMark(page) {
  return iconMark(
    page.entry.sidebarIconText || page.entry.iconText || (page.visible ? "PG" : "HD"),
    page.entry.sidebarIconImage || page.entry.iconImage || ""
  );
}

function sidebarPageTitle(page) {
  return page.entry.sidebarTitle || page.entry.title || page.title;
}

function sidebarPageDescription(page) {
  return page.entry.sidebarDescription || `/${page.slug}`;
}

function linkMark(link) {
  return iconMark(link.iconText || "WEB", link.iconImage || "", faviconUrl(link.targetUrl));
}

function iconMark(text, image, fallbackImage = "") {
  const icon = element("span", "module-icon entry-icon", text || "WEB");
  const src = image || fallbackImage;

  if (src) {
    icon.classList.add("has-image");
    icon.textContent = "";
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    img.addEventListener("error", () => {
      icon.classList.remove("has-image");
      icon.replaceChildren(document.createTextNode(text || "WEB"));
    });
    icon.append(img);
  }

  return icon;
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

function uniquePageSlug(currentPage, value) {
  const base = normalizeSlug(value);
  const used = new Set(
    state.config.pages
      .filter((page) => page !== currentPage)
      .map((page) => page.slug)
  );
  let slug = base;
  let suffix = 2;

  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
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

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function applyEntryCardStyle(card, image) {
  if (!image) {
    return;
  }

  card.classList.add("has-entry-background");
  card.style.backgroundImage = `linear-gradient(90deg, rgba(23, 32, 29, 0.82), rgba(23, 32, 29, 0.22)), url("${cssUrl(image)}")`;
}

function applyPageBackground(node, image) {
  if (!image) {
    return;
  }

  node.classList.add("has-page-background");
  node.style.backgroundImage = `linear-gradient(180deg, rgba(251, 250, 246, 0.84), rgba(251, 250, 246, 0.68)), url("${cssUrl(image)}")`;
}

function normalizeExternalUrl(value) {
  const raw = (value || "").trim();

  if (!raw) {
    return "";
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeRoomId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "public";
}

function externalLinkSubtitle(link) {
  return hostFromUrl(link.targetUrl) || "外部网站";
}

function hostFromUrl(value) {
  const normalized = normalizeExternalUrl(value);

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrl(value) {
  const normalized = normalizeExternalUrl(value);

  if (!normalized) {
    return "";
  }

  try {
    return `${new URL(normalized).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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
