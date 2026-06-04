type ModuleStatus = "active" | "planned";

type AppEnv = Env & {
  SITE_CONFIG?: KVNamespace;
  admin?: string;
  ADMIN_PASSWORD?: string;
  LIMITED_ADMIN_PASSWORD?: string;
};

type ServerModule = {
  id: string;
  name: string;
  category: string;
  status: ModuleStatus;
  description: string;
  endpoints: string[];
};

type SectionLayout = {
  width: number;
  minHeight: number;
  locked: boolean;
};

type ContentBlock = {
  id: string;
  type: "text";
  icon: string;
  title: string;
  description: string;
  body: string;
  layout: SectionLayout;
};

type SystemSection = {
  id: string;
  type: "system";
  moduleId: string;
  layout: SectionLayout;
};

type ImageSection = {
  id: string;
  type: "image";
  title: string;
  description: string;
  src: string;
  alt: string;
  caption: string;
  display: "normal" | "background";
  fit: "cover" | "contain";
  layout: SectionLayout;
};

type VideoSection = {
  id: string;
  type: "video";
  title: string;
  description: string;
  src: string;
  poster: string;
  caption: string;
  layout: SectionLayout;
};

type P2PSection = {
  id: string;
  type: "p2p";
  title: string;
  description: string;
  room: string;
  layout: SectionLayout;
};

type CommentsSection = {
  id: string;
  type: "comments";
  title: string;
  description: string;
  listHeight: number;
  layout: SectionLayout;
};

type LinkSection = {
  id: string;
  type: "link";
  title: string;
  description: string;
  targetUrl: string;
  iconText: string;
  iconImage: string;
  backgroundImage: string;
  layout: SectionLayout;
};

type BlogArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  coverImage: string;
  category: string;
  tags: string[];
  authorRole: "admin" | "limited";
  authorName: string;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
};

type BlogSection = {
  id: string;
  type: "blog";
  title: string;
  description: string;
  notice: string;
  profileName: string;
  profileDescription: string;
  profileImage: string;
  categories: string[];
  articles: BlogArticle[];
  layout: SectionLayout;
};

type PageEntry = {
  title: string;
  description: string;
  iconText: string;
  iconImage: string;
  sidebarTitle: string;
  sidebarDescription: string;
  sidebarIconText: string;
  sidebarIconImage: string;
  backgroundImage: string;
};

type PageComments = {
  enabled: boolean;
  mode: "bottom" | "module";
  title: string;
  description: string;
  listHeight: number;
  layout: SectionLayout;
};

type SiteLink = {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  visible: boolean;
  iconText: string;
  iconImage: string;
  backgroundImage: string;
};

type HomeAnnouncement = {
  enabled: boolean;
  title: string;
  text: string;
  durationSeconds: number;
};

type PageSection = SystemSection | ContentBlock | ImageSection | VideoSection | P2PSection | CommentsSection | LinkSection | BlogSection;

type P2PPeer = {
  id: string;
  name: string;
  lastSeen: number;
};

type P2PMessage = {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: unknown;
  createdAt: number;
};

type P2PRoom = {
  peers: P2PPeer[];
  messages: P2PMessage[];
};

type SitePage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  backgroundImage: string;
  locked: boolean;
  passwordEnabled: boolean;
  pagePassword: string;
  visible: boolean;
  modules: string[];
  blocks: ContentBlock[];
  sections: PageSection[];
  entry: PageEntry;
  comments: PageComments;
};

type SiteConfig = {
  version: 1;
  updatedAt: string;
  homeTitle: string;
  homeDescription: string;
  homeImage: string;
  commentBlockWords: string[];
  announcement: HomeAnnouncement;
  links: SiteLink[];
  pages: SitePage[];
};

type TokenPayload = {
  sub: "admin" | "limited";
  exp: number;
};

type CommentRecord = {
  id: string;
  page: string;
  name: string;
  body: string;
  ip: string;
  device: string;
  createdAt: string;
};

type AccessLogRecord = {
  id: string;
  kind: "visit" | "blocked-comment";
  ip: string;
  region: string;
  isp: string;
  path: string;
  method: string;
  device: string;
  name: string;
  body: string;
  matchedWord: string;
  createdAt: string;
};

type ApiRoute = (request: Request, env: AppEnv) => Promise<Response> | Response;

const configKey = "site-config";
const commentsPrefix = "comments:";
const accessLogsKey = "access-logs";
const p2pRoomPrefix = "p2p-room:";
const adminPasswordKey = "admin-password";
const limitedAdminPasswordKey = "limited-admin-password";
const defaultAdminPassword = "admin";
const defaultLimitedAdminPassword = "limited";
const tokenMaxAgeMs = 12 * 60 * 60 * 1000;
const maxAccessLogs = 1000;

const defaultSiteConfig: SiteConfig = {
  version: 1,
  updatedAt: "2026-05-09T00:00:00.000Z",
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
        layout: defaultLayout("comments")
      },
      modules: ["overview", "notes", "api-status", "checklist"],
      blocks: [
        {
          id: "welcome",
          type: "text",
          icon: "IN",
          title: "开始使用",
          description: "这个文本模块可以在后台修改或删除。",
          body: "进入 /admin 后，可以新增分页面、修改页面标题、为页面勾选系统模块，也可以添加自定义文本模块。",
          layout: defaultLayout("text")
        }
      ],
      sections: [
        { id: "section-overview", type: "system", moduleId: "overview", layout: defaultLayout("system") },
        { id: "section-notes", type: "system", moduleId: "notes", layout: defaultLayout("system") },
        { id: "section-api-status", type: "system", moduleId: "api-status", layout: defaultLayout("system") },
        { id: "section-checklist", type: "system", moduleId: "checklist", layout: defaultLayout("system") },
        {
          id: "welcome",
          type: "text",
          icon: "IN",
          title: "开始使用",
          description: "这个文本模块可以在后台修改或删除。",
          body: "进入 /admin 后，可以新增分页面、修改页面标题、为页面勾选系统模块，也可以添加自定义文本模块。",
          layout: defaultLayout("text")
        }
      ]
    }
  ]
};

const serverModules: ServerModule[] = [
  {
    id: "health",
    name: "健康检查",
    category: "system",
    status: "active",
    description: "返回 Worker 的部署状态、时间和运行环境。",
    endpoints: ["/api/health"]
  },
  {
    id: "site-config",
    name: "站点配置",
    category: "system",
    status: "active",
    description: "返回主页、分页面和模块分配配置。",
    endpoints: ["/api/site-config"]
  },
  {
    id: "admin",
    name: "管理员后台",
    category: "system",
    status: "active",
    description: "通过管理员密码修改站点配置。",
    endpoints: ["/api/admin/login", "/api/admin/password", "/api/admin/config"]
  },
  {
    id: "echo",
    name: "数据回显",
    category: "tools",
    status: "active",
    description: "接收 JSON 并原样返回，适合验证表单和 API 调用。",
    endpoints: ["/api/echo"]
  },
  {
    id: "calculator",
    name: "计算器",
    category: "tools",
    status: "active",
    description: "在浏览器本地完成基础四则运算和常用数值计算。",
    endpoints: []
  },
  {
    id: "unit-converter",
    name: "单位换算",
    category: "tools",
    status: "active",
    description: "在浏览器本地完成长度、重量和数据容量换算。",
    endpoints: []
  },
  {
    id: "timer",
    name: "倒计时和秒表",
    category: "tools",
    status: "active",
    description: "提供本地倒计时、秒表和重置控制。",
    endpoints: []
  },
  {
    id: "randomizer",
    name: "随机抽取",
    category: "tools",
    status: "active",
    description: "从候选名单中随机抽取，也可生成随机数。",
    endpoints: []
  },
  {
    id: "text-tools",
    name: "文本工具",
    category: "tools",
    status: "active",
    description: "统计字数、清理空行、转换大小写和复制文本。",
    endpoints: []
  },
  {
    id: "comments",
    name: "评论",
    category: "community",
    status: "active",
    description: "免登录发表评论，管理员可删除或清空。",
    endpoints: ["/api/comments", "/api/admin/comments"]
  },
  {
    id: "access-logs",
    name: "访问日志",
    category: "admin",
    status: "active",
    description: "记录普通访客访问时间、IP、路径和设备信息，管理员可查看。",
    endpoints: ["/api/admin/logs"]
  },
  {
    id: "p2p-transfer",
    name: "P2P 文件传输",
    category: "network",
    status: "active",
    description: "用 WebRTC DataChannel 尝试点对点文件传输，Worker 只负责房间信令。",
    endpoints: ["/api/p2p-signal"]
  }
];

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const apiRoutes: Record<string, ApiRoute> = {
  "/api/health": () =>
    json({
      ok: true,
      service: "cloudflare-modular-site",
      runtime: "Cloudflare Workers",
      timestamp: new Date().toISOString()
    }),

  "/api/modules": () =>
    json({
      modules: serverModules,
      total: serverModules.length
    }),

  "/api/site-config": async (_request, env) =>
    json({
      config: toPublicSiteConfig(await readSiteConfig(env))
    }),

  "/api/visitor-summary": async (request, env) => {
    await recordAccessLog(request, env, { force: true });
    const logs = await readAccessLogs(env);
    const ip = getClientIp(request);
    const recentSince = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentVisits = logs.filter((log) => log.kind === "visit" && Date.parse(log.createdAt) >= recentSince).length;

    return json({
      ip,
      region: getClientRegion(request),
      isp: getClientIsp(request),
      recentVisits
    });
  },

  "/api/page-access": async (request, env) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const slug = normalizeSlug(asString(body.slug), 0);
    const password = asString(body.password);
    const config = await readSiteConfig(env);
    const page = config.pages.find((item) => item.slug === slug && item.visible);

    if (!page) {
      return json({ error: "页面不存在" }, 404);
    }

    if (!page.passwordEnabled) {
      return json({ ok: true, page: toPublicPage(page) });
    }

    if (!page.pagePassword || !(await verifyPassword(password, page.pagePassword))) {
      return json({ error: "分页面密码不正确" }, 401);
    }

    return json({ ok: true, page: toPublicPage(page) });
  },

  "/api/comments": async (request, env) => {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const page = normalizeCommentPage(url.searchParams.get("page") || "");

      return json({
        comments: await readComments(env, page)
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const body = asRecord(await readJson(request));
    const page = normalizeCommentPage(asString(body.page));
    const name = limitText(asString(body.name), 40) || "访客";
    const content = limitText(asString(body.body), 1000);
    const isAdminComment = await isAdminRequest(request, env);
    const customIp = limitText(asString(body.displayIp || body.ip), 80);
    const ip = isAdminComment && customIp ? customIp : getClientIp(request);
    const device = getClientDevice(request);

    if (!page || !content) {
      return json({ error: "评论内容不能为空" }, 400);
    }

    if (customIp && !isAdminComment) {
      return json({ error: "自定义 IP 需要管理员登录" }, 401);
    }

    const config = await readSiteConfig(env);
    const matchedWord = findBlockedCommentWord(config.commentBlockWords, name, content);

    if (matchedWord) {
      await recordBlockedCommentLog(request, env, {
        page,
        name,
        body: content,
        ip,
        device,
        matchedWord
      });

      return json({ error: "评论包含管理员设置的屏蔽词，无法发送。" }, 400);
    }

    const comments = await readComments(env, page);
    const comment: CommentRecord = {
      id: crypto.randomUUID(),
      page,
      name,
      body: content,
      ip,
      device,
      createdAt: new Date().toISOString()
    };
    const nextComments = [comment, ...comments].slice(0, 300);

    await env.SITE_CONFIG.put(commentKey(page), JSON.stringify(nextComments));

    return json({
      ok: true,
      comment,
      comments: nextComments
    });
  },

  "/api/p2p-signal": async (request, env) => {
    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const url = new URL(request.url);
    const roomId = normalizeP2PRoom(url.searchParams.get("room") || "");

    if (!roomId) {
      return json({ error: "房间号不能为空" }, 400);
    }

    if (request.method === "GET") {
      const peerId = limitText(url.searchParams.get("peer") || "", 80);
      const since = Number(url.searchParams.get("since") || 0);
      const room = await readP2PRoom(env, roomId);
      const now = Date.now();
      room.peers = room.peers.filter((peer) => now - peer.lastSeen < 120000);
      const messages = room.messages.filter((message) => message.createdAt > since && (!message.to || message.to === peerId));
      await writeP2PRoom(env, roomId, room);

      return json({
        now,
        peers: room.peers,
        messages
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const peerId = limitText(asString(body.peerId), 80);
    const name = limitText(asString(body.name), 40) || "访客";
    const type = limitText(asString(body.type), 40);
    const to = limitText(asString(body.to), 80);
    const payload = body.payload;

    if (!peerId) {
      return json({ error: "peerId 不能为空" }, 400);
    }

    const room = await readP2PRoom(env, roomId);
    const now = Date.now();
    room.peers = upsertP2PPeer(room.peers, { id: peerId, name, lastSeen: now }).filter((peer) => now - peer.lastSeen < 120000);

    if (type && type !== "heartbeat") {
      const safePayload =
        type === "stream-request"
          ? {
            ...asRecord(payload),
            admin: await isFullAdminRequest(request, env)
          }
          : payload;
      room.messages.push({
        id: crypto.randomUUID(),
        from: peerId,
        to,
        type,
        payload: safePayload,
        createdAt: now
      });
      room.messages = room.messages.slice(-300);
    }

    await writeP2PRoom(env, roomId, room);

    return json({
      ok: true,
      now,
      peers: room.peers
    });
  },

  "/api/admin/login": async (request, env) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const password = asString(body.password);
    const isAdmin = await verifyPassword(password, await getAdminPassword(env));
    const isLimited = !isAdmin && (await verifyPassword(password, await getLimitedAdminPassword(env)));

    if (!isAdmin && !isLimited) {
      return json({ error: "管理员密码不正确" }, 401);
    }

    const role = isAdmin ? "admin" : "limited";

    return json({
      token: await createAdminToken(env, role),
      role,
      config: await readSiteConfig(env)
    });
  },

  "/api/admin/password": async (request, env) => {
    const auth = await requireFullAdmin(request, env);

    if (auth) {
      return auth;
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const body = asRecord(await readJson(request));
    const currentPassword = asString(body.currentPassword);
    const newPassword = limitText(asString(body.newPassword), 120);
    const isValid = await verifyPassword(currentPassword, await getAdminPassword(env));

    if (!isValid) {
      return json({ error: "当前密码不正确" }, 401);
    }

    if (newPassword.length < 4) {
      return json({ error: "新密码至少需要 4 个字符" }, 400);
    }

    await env.SITE_CONFIG.put(adminPasswordKey, newPassword);

    return json({
      ok: true,
      token: await createAdminToken(env, "admin"),
      role: "admin"
    });
  },

  "/api/admin/limited-password": async (request, env) => {
    const auth = await requireFullAdmin(request, env);

    if (auth) {
      return auth;
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const body = asRecord(await readJson(request));
    const currentPassword = asString(body.currentPassword);
    const newPassword = limitText(asString(body.newPassword), 120);
    const isValid = await verifyPassword(currentPassword, await getAdminPassword(env));

    if (!isValid) {
      return json({ error: "当前管理员密码不正确" }, 401);
    }

    if (newPassword.length < 4) {
      return json({ error: "低权限密码至少需要 4 个字符" }, 400);
    }

    if (await verifyPassword(newPassword, await getAdminPassword(env))) {
      return json({ error: "低权限密码不能和管理员密码相同" }, 400);
    }

    await env.SITE_CONFIG.put(limitedAdminPasswordKey, newPassword);

    return json({ ok: true });
  },

  "/api/admin/config": async (request, env) => {
    const auth = await requireAdmin(request, env);

    if (auth instanceof Response) {
      return auth;
    }

    if (request.method === "GET") {
      return json({
        role: auth.sub,
        config: await readSiteConfig(env)
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const currentConfig = await readSiteConfig(env);
    const requestedConfig = normalizeSiteConfig(body.config);
    const config = auth.sub === "limited" ? mergeLimitedConfig(currentConfig, requestedConfig) : requestedConfig;

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    await env.SITE_CONFIG.put(configKey, JSON.stringify(config));

    return json({
      ok: true,
      role: auth.sub,
      config
    });
  },

  "/api/admin/comments": async (request, env) => {
    const auth = await requireFullAdmin(request, env);

    if (auth) {
      return auth;
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const body = asRecord(await readJson(request));
    const page = normalizeCommentPage(asString(body.page));
    const action = asString(body.action);
    const id = asString(body.id);
    const comments = await readComments(env, page);
    let nextComments: CommentRecord[];

    if (action === "clear") {
      nextComments = [];
    } else if (action === "delete") {
      nextComments = comments.filter((comment) => comment.id !== id);
    } else if (action === "update") {
      const nextName = limitText(asString(body.name), 40) || "访客";
      const nextBody = limitText(asString(body.body), 1000);
      const nextIp = limitText(asString(body.displayIp) || asString(body.ip), 80);
      const nextDevice = limitText(asString(body.device), 120);

      if (!id || !nextBody) {
        return json({ error: "评论内容不能为空" }, 400);
      }

      let found = false;
      nextComments = comments.map((comment) => {
        if (comment.id !== id) {
          return comment;
        }

        found = true;

        return {
          ...comment,
          name: nextName,
          body: nextBody,
          ip: nextIp || comment.ip,
          device: nextDevice || comment.device
        };
      });

      if (!found) {
        return json({ error: "评论不存在" }, 404);
      }
    } else {
      return json({ error: "未知操作" }, 400);
    }

    await env.SITE_CONFIG.put(commentKey(page), JSON.stringify(nextComments));

    return json({
      ok: true,
      comments: nextComments
    });
  },

  "/api/admin/logs": async (request, env) => {
    const auth = await requireFullAdmin(request, env);

    if (auth) {
      return auth;
    }

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    if (request.method === "GET") {
      return json({
        logs: await readAccessLogs(env)
      });
    }

    if (request.method === "POST") {
      const body = asRecord(await readJson(request));

      if (asString(body.action) !== "clear") {
        return json({ error: "未知操作" }, 400);
      }

      await env.SITE_CONFIG.put(accessLogsKey, JSON.stringify([]));

      return json({
        ok: true,
        logs: []
      });
    }

    return json({ error: "Method Not Allowed" }, 405);
  },

  "/api/echo": async (request) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = await readJson(request);

    return json({
      received: body,
      timestamp: new Date().toISOString()
    });
  }
};

async function readSiteConfig(env: AppEnv): Promise<SiteConfig> {
  if (!env.SITE_CONFIG) {
    return defaultSiteConfig;
  }

  const stored = await env.SITE_CONFIG.get(configKey, "json");

  return normalizeSiteConfig(stored ?? defaultSiteConfig);
}

function toPublicSiteConfig(config: SiteConfig): SiteConfig {
  return {
    ...config,
    commentBlockWords: [],
    pages: config.pages.map((page) => (page.passwordEnabled ? toLockedPublicPage(page) : toPublicPage(page)))
  };
}

function toPublicPage(page: SitePage): SitePage {
  return {
    ...page,
    pagePassword: ""
  };
}

function toLockedPublicPage(page: SitePage): SitePage {
  return {
    ...page,
    description: "",
    backgroundImage: "",
    pagePassword: "",
    modules: [],
    blocks: [],
    sections: [],
    comments: {
      ...page.comments,
      enabled: false
    }
  };
}

function mergeLimitedConfig(current: SiteConfig, requested: SiteConfig): SiteConfig {
  const requestedPages = new Map(requested.pages.map((page) => [page.id, page]));
  const pages = current.pages.map((page) => {
    const requestedPage = requestedPages.get(page.id);

    if (!requestedPage) {
      return page;
    }

    if (page.locked) {
      return page;
    }

    const existingSections = new Map(page.sections.map((section) => [section.id, section]));
    const nextSections = requestedPage.sections.map((section) => {
      const existing = existingSections.get(section.id);
      if (existing?.layout.locked) {
        return existing;
      }

      if (existing?.type === "blog" && section.type === "blog") {
        return mergeLimitedBlogSection(existing, section);
      }

      return {
        ...section,
        layout: {
          ...section.layout,
          locked: existing?.layout.locked ?? false
        }
      } as PageSection;
    });
    const requestedIds = new Set(nextSections.map((section) => section.id));

    for (const section of page.sections) {
      if (section.layout.locked && !requestedIds.has(section.id)) {
        nextSections.push(section);
      }
    }

    return {
      ...requestedPage,
      locked: page.locked,
      passwordEnabled: page.passwordEnabled,
      pagePassword: page.pagePassword,
      sections: nextSections,
      modules: nextSections
        .filter((section): section is SystemSection => section.type === "system")
        .map((section) => section.moduleId),
      blocks: nextSections.filter((section): section is ContentBlock => section.type === "text")
    };
  });

  return {
    ...current,
    updatedAt: new Date().toISOString(),
    pages
  };
}

function mergeLimitedBlogSection(existing: BlogSection, requested: BlogSection): BlogSection {
  const existingArticles = new Map(existing.articles.map((article) => [article.id, article]));
  const requestedIds = new Set(requested.articles.map((article) => article.id));
  const articles: BlogArticle[] = requested.articles
    .filter((article) => {
      const saved = existingArticles.get(article.id);
      return !saved || saved.authorRole !== "admin";
    })
    .map((article) => ({
      ...article,
      authorRole: "limited" as const,
      authorName: article.authorName || "limited"
    }));

  for (const article of existing.articles) {
    if (article.authorRole === "admin" && !requestedIds.has(article.id)) {
      articles.unshift(article);
    } else if (article.authorRole === "admin" && requestedIds.has(article.id)) {
      const index = requested.articles.findIndex((item) => item.id === article.id);
      articles.splice(Math.max(0, index), 0, article);
    }
  }

  return {
    ...requested,
    layout: {
      ...requested.layout,
      locked: existing.layout.locked
    },
    articles
  };
}

function normalizeSiteConfig(value: unknown): SiteConfig {
  const source = asRecord(value);
  const usedSlugs = new Set<string>();
  const rawPages = Array.isArray(source.pages) ? source.pages : defaultSiteConfig.pages;
  const rawLinks = Array.isArray(source.links) ? source.links : defaultSiteConfig.links;

  const pages = rawPages.slice(0, 40).map((page, index) => {
    const record = asRecord(page);
    const slug = uniqueSlug(normalizeSlug(asString(record.slug), index), usedSlugs, index);
    const blocksSource = Array.isArray(record.blocks) ? record.blocks : [];
    const sectionsSource = Array.isArray(record.sections)
      ? record.sections
      : createLegacySections(record.modules, blocksSource);
    const sections = sectionsSource
      .slice(0, 80)
      .map((section, sectionIndex) => normalizeSection(section, sectionIndex))
      .filter((section): section is PageSection => section !== null);
    const modules = sections
      .filter((section): section is SystemSection => section.type === "system")
      .map((section) => section.moduleId);
    const blocks = sections.filter((section): section is ContentBlock => section.type === "text");
    const entry = normalizePageEntry(record.entry, record);
    const comments = normalizePageComments(record.comments);

    return {
      id: asString(record.id) || crypto.randomUUID(),
      slug,
      title: limitText(asString(record.title) || `分页面 ${index + 1}`, 80),
      description: limitText(asString(record.description), 220),
      backgroundImage: normalizeImageSrc(asString(record.backgroundImage)),
      locked: typeof record.locked === "boolean" ? record.locked : false,
      passwordEnabled: typeof record.passwordEnabled === "boolean" ? record.passwordEnabled : false,
      pagePassword: limitText(asString(record.pagePassword), 120),
      visible: typeof record.visible === "boolean" ? record.visible : true,
      modules: [...new Set(modules)],
      blocks,
      sections,
      entry,
      comments
    };
  });

  if (pages.length === 0) {
    pages.push(defaultSiteConfig.pages[0]);
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    homeTitle: limitText(asString(source.homeTitle) || defaultSiteConfig.homeTitle, 80),
    homeDescription: limitText(asString(source.homeDescription) || defaultSiteConfig.homeDescription, 220),
    homeImage: normalizeImageSrc(asString(source.homeImage)),
    commentBlockWords: normalizeCommentBlockWords(source.commentBlockWords),
    announcement: normalizeAnnouncement(source.announcement),
    links: rawLinks.slice(0, 40).map(normalizeSiteLink),
    pages
  };
}

function normalizeCommentBlockWords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const words = value
    .map((word) => limitText(asString(word), 60))
    .filter(Boolean)
    .slice(0, 200);

  return [...new Set(words)];
}

function normalizeAnnouncement(value: unknown): HomeAnnouncement {
  const record = asRecord(value);

  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : false,
    title: limitText(asString(record.title) || "公告", 40),
    text: limitText(asString(record.text || record.message), 400),
    durationSeconds: clampNumber(record.durationSeconds ?? record.closeAfterSeconds, 0, 120, 8)
  };
}

function normalizeSiteLink(value: unknown, index: number): SiteLink {
  const record = asRecord(value);

  return {
    id: asString(record.id) || crypto.randomUUID(),
    title: limitText(asString(record.title) || `网站入口 ${index + 1}`, 80),
    description: limitText(asString(record.description), 220),
    targetUrl: normalizeExternalUrl(asString(record.targetUrl || record.url || record.href)),
    visible: typeof record.visible === "boolean" ? record.visible : true,
    iconText: limitText(asString(record.iconText) || "WEB", 4).toUpperCase(),
    iconImage: normalizeImageSrc(asString(record.iconImage)),
    backgroundImage: normalizeImageSrc(asString(record.backgroundImage))
  };
}

function createLegacySections(modules: unknown, blocks: unknown[]): unknown[] {
  return [
    ...normalizeStringList(modules, 40, 80).map((moduleId) => ({
      id: `system-${moduleId}-${crypto.randomUUID()}`,
      type: "system",
      moduleId
    })),
    ...blocks
  ];
}

function normalizeSection(value: unknown, index: number): PageSection | null {
  const record = asRecord(value);
  const type = asString(record.type);

  if (type === "system") {
    const moduleId = limitText(asString(record.moduleId), 80);

    return moduleId
        ? {
          id: asString(record.id) || crypto.randomUUID(),
          type: "system",
          moduleId,
          layout: normalizeLayout(record.layout, "system")
        }
      : null;
  }

  if (type === "image") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "image",
      title: limitText(asString(record.title) || `图片模块 ${index + 1}`, 80),
      description: limitText(asString(record.description), 160),
      src: normalizeImageSrc(asString(record.src)),
      alt: limitText(asString(record.alt), 160),
      caption: limitText(asString(record.caption), 220),
      display: asString(record.display) === "background" ? "background" : "normal",
      fit: asString(record.fit) === "contain" ? "contain" : "cover",
      layout: normalizeLayout(record.layout, "image")
    };
  }

  if (type === "video") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "video",
      title: limitText(asString(record.title) || `视频模块 ${index + 1}`, 80),
      description: limitText(asString(record.description), 160),
      src: asString(record.src),
      poster: normalizeImageSrc(asString(record.poster)),
      caption: limitText(asString(record.caption), 220),
      layout: normalizeLayout(record.layout, "video")
    };
  }

  if (type === "p2p") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "p2p",
      title: limitText(asString(record.title) || "P2P 文件传输", 80),
      description: limitText(asString(record.description) || "进入房间后尝试点对点传文件。", 160),
      room: normalizeP2PRoom(asString(record.room)) || `room-${index + 1}`,
      layout: normalizeLayout(record.layout, "p2p")
    };
  }

  if (type === "comments") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "comments",
      title: limitText(asString(record.title) || "评论", 80),
      description: limitText(asString(record.description) || "留下你的想法。", 160),
      listHeight: clampNumber(record.listHeight, 180, 900, 320),
      layout: normalizeLayout(record.layout, "comments")
    };
  }

  if (type === "link") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "link",
      title: limitText(asString(record.title) || "网站入口", 80),
      description: limitText(asString(record.description), 160),
      targetUrl: normalizeExternalUrl(asString(record.targetUrl)),
      iconText: limitText(asString(record.iconText) || "WEB", 4).toUpperCase(),
      iconImage: normalizeImageSrc(asString(record.iconImage)),
      backgroundImage: normalizeImageSrc(asString(record.backgroundImage)),
      layout: normalizeLayout(record.layout, "link")
    };
  }

  if (type === "blog") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "blog",
      title: limitText(asString(record.title) || "博客", 80),
      description: limitText(asString(record.description) || "发布文章和记录。", 180),
      notice: limitText(asString(record.notice), 180),
      profileName: limitText(asString(record.profileName) || "站长", 60),
      profileDescription: limitText(asString(record.profileDescription) || "这里是博客作者介绍。", 160),
      profileImage: normalizeImageSrc(asString(record.profileImage)),
      categories: normalizeStringList(record.categories, 20, 30),
      articles: normalizeBlogArticles(record.articles),
      layout: normalizeLayout(record.layout, "blog")
    };
  }

  return normalizeBlock(value, index);
}

function normalizeBlogArticles(value: unknown): BlogArticle[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 200).map((item) => {
    const record = asRecord(item);
    const now = new Date().toISOString();

    return {
      id: asString(record.id) || crypto.randomUUID(),
      title: limitText(asString(record.title) || "未命名文章", 120),
      summary: limitText(asString(record.summary), 220),
      body: limitText(asString(record.body), 8000),
      coverImage: normalizeImageSrc(asString(record.coverImage)),
      category: limitText(asString(record.category) || "随笔", 30),
      tags: normalizeStringList(record.tags, 12, 24),
      authorRole: asString(record.authorRole) === "admin" ? "admin" : "limited",
      authorName: limitText(asString(record.authorName) || (asString(record.authorRole) === "admin" ? "admin" : "limited"), 40),
      createdAt: asString(record.createdAt) || now,
      updatedAt: asString(record.updatedAt) || now,
      featured: typeof record.featured === "boolean" ? record.featured : false
    };
  });
}

function normalizePageEntry(value: unknown, page: Record<string, unknown>): PageEntry {
  const record = asRecord(value);

  return {
    title: limitText(asString(record.title), 80),
    description: limitText(asString(record.description), 220),
    iconText: limitText(asString(record.iconText) || "PG", 4).toUpperCase(),
    iconImage: normalizeImageSrc(asString(record.iconImage)),
    sidebarTitle: limitText(asString(record.sidebarTitle), 80),
    sidebarDescription: limitText(asString(record.sidebarDescription), 120),
    sidebarIconText: limitText(asString(record.sidebarIconText), 4).toUpperCase(),
    sidebarIconImage: normalizeImageSrc(asString(record.sidebarIconImage)),
    backgroundImage: normalizeImageSrc(asString(record.backgroundImage || page.entryBackgroundImage))
  };
}

function normalizePageComments(value: unknown): PageComments {
  const record = asRecord(value);

  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : true,
    mode: asString(record.mode) === "module" ? "module" : "bottom",
    title: limitText(asString(record.title) || "评论", 80),
    description: limitText(asString(record.description) || "留下你的想法。", 160),
    listHeight: clampNumber(record.listHeight, 180, 900, 320),
    layout: normalizeLayout(record.layout, "comments")
  };
}

function normalizeP2PRoom(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function normalizeBlock(value: unknown, index: number): ContentBlock {
  const record = asRecord(value);

  return {
    id: asString(record.id) || crypto.randomUUID(),
    type: "text",
    icon: limitText(asString(record.icon) || "TX", 3).toUpperCase(),
    title: limitText(asString(record.title) || `文本模块 ${index + 1}`, 80),
    description: limitText(asString(record.description), 160),
    body: limitText(asString(record.body), 1200),
    layout: normalizeLayout(record.layout, "text")
  };
}

function defaultLayout(type: string): SectionLayout {
  return {
    width: 0,
    minHeight: type === "comments" ? 320 : 280,
    locked: false
  };
}

function normalizeLayout(value: unknown, type: string): SectionLayout {
  const record = asRecord(value);
  const base = defaultLayout(type);

  return {
    width: clampNumber(record.width, 0, 100, base.width),
    minHeight: clampNumber(record.minHeight, 120, 900, base.minHeight),
    locked: typeof record.locked === "boolean" ? record.locked : base.locked
  };
}

function normalizeImageSrc(value: string): string {
  const src = limitText(value, 900000);
  const allowed =
    src.startsWith("data:image/") ||
    src.startsWith("https://") ||
    src.startsWith("http://") ||
    src.startsWith("/");

  return allowed ? src : "";
}

function normalizeExternalUrl(value: string): string {
  const raw = limitText(value, 500).trim();

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

async function readComments(env: AppEnv, page: string): Promise<CommentRecord[]> {
  if (!env.SITE_CONFIG || !page) {
    return [];
  }

  const stored = await env.SITE_CONFIG.get(commentKey(page), "json");

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.slice(0, 300).map(normalizeComment).filter((comment): comment is CommentRecord => comment !== null);
}

function normalizeComment(value: unknown): CommentRecord | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const page = normalizeCommentPage(asString(record.page));
  const body = limitText(asString(record.body), 1000);

  if (!id || !page || !body) {
    return null;
  }

  return {
    id,
    page,
    name: limitText(asString(record.name), 40) || "访客",
    body,
    ip: limitText(asString(record.ip), 80) || "unknown",
    device: limitText(asString(record.device), 120) || "未知设备",
    createdAt: limitText(asString(record.createdAt), 40) || new Date().toISOString()
  };
}

async function readAccessLogs(env: AppEnv): Promise<AccessLogRecord[]> {
  if (!env.SITE_CONFIG) {
    return [];
  }

  try {
    const stored = await env.SITE_CONFIG.get(accessLogsKey, "json");

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored.slice(0, maxAccessLogs).map(normalizeAccessLog).filter((log): log is AccessLogRecord => log !== null);
  } catch {
    return [];
  }
}

function normalizeAccessLog(value: unknown): AccessLogRecord | null {
  const record = asRecord(value);
  const id = asString(record.id);
  const ip = limitText(asString(record.ip), 80);
  const createdAt = limitText(asString(record.createdAt), 40);

  if (!id || !ip || !createdAt) {
    return null;
  }

  return {
    id,
    kind: asString(record.kind) === "blocked-comment" ? "blocked-comment" : "visit",
    ip,
    region: limitText(asString(record.region), 120) || "未知地区",
    isp: limitText(asString(record.isp), 120) || "未知运营商",
    path: limitText(asString(record.path), 160) || "/",
    method: limitText(asString(record.method), 12) || "GET",
    device: limitText(asString(record.device), 120) || "未知设备",
    name: limitText(asString(record.name), 40),
    body: limitText(asString(record.body), 1000),
    matchedWord: limitText(asString(record.matchedWord), 60),
    createdAt
  };
}

async function readP2PRoom(env: AppEnv, roomId: string): Promise<P2PRoom> {
  const stored = env.SITE_CONFIG ? await env.SITE_CONFIG.get(`${p2pRoomPrefix}${roomId}`) : "";
  const record = asRecord(stored ? JSON.parse(stored) : {});
  const peers = Array.isArray(record.peers) ? record.peers.map(normalizeP2PPeer).filter((peer): peer is P2PPeer => Boolean(peer)) : [];
  const messages = Array.isArray(record.messages)
    ? record.messages.map(normalizeP2PMessage).filter((message): message is P2PMessage => Boolean(message))
    : [];

  return { peers, messages };
}

async function writeP2PRoom(env: AppEnv, roomId: string, room: P2PRoom): Promise<void> {
  await env.SITE_CONFIG?.put(`${p2pRoomPrefix}${roomId}`, JSON.stringify(room), { expirationTtl: 3600 });
}

function normalizeP2PPeer(value: unknown): P2PPeer | null {
  const record = asRecord(value);
  const id = limitText(asString(record.id), 80);

  return id ? { id, name: limitText(asString(record.name), 40) || "访客", lastSeen: Number(record.lastSeen) || 0 } : null;
}

function normalizeP2PMessage(value: unknown): P2PMessage | null {
  const record = asRecord(value);
  const id = limitText(asString(record.id), 80);
  const from = limitText(asString(record.from), 80);
  const type = limitText(asString(record.type), 40);

  return id && from && type
    ? { id, from, to: limitText(asString(record.to), 80), type, payload: record.payload, createdAt: Number(record.createdAt) || 0 }
    : null;
}

function upsertP2PPeer(peers: P2PPeer[], nextPeer: P2PPeer): P2PPeer[] {
  const others = peers.filter((peer) => peer.id !== nextPeer.id);
  return [...others, nextPeer].slice(-20);
}

async function recordAccessLog(request: Request, env: AppEnv, options: { force?: boolean } = {}): Promise<void> {
  if (!env.SITE_CONFIG || (!options.force && !shouldRecordAccess(request))) {
    return;
  }

  const url = new URL(request.url);
  const logs = await readAccessLogs(env);
  const record: AccessLogRecord = {
    id: crypto.randomUUID(),
    kind: "visit",
    ip: getClientIp(request),
    region: getClientRegion(request),
    isp: getClientIsp(request),
    path: limitText(`${url.pathname}${url.search}`, 160) || "/",
    method: request.method,
    device: getClientDevice(request),
    name: "",
    body: "",
    matchedWord: "",
    createdAt: new Date().toISOString()
  };

  await env.SITE_CONFIG.put(accessLogsKey, JSON.stringify([record, ...logs].slice(0, maxAccessLogs)));
}

async function recordBlockedCommentLog(
  request: Request,
  env: AppEnv,
  details: { page: string; name: string; body: string; ip: string; device: string; matchedWord: string }
): Promise<void> {
  if (!env.SITE_CONFIG) {
    return;
  }

  const logs = await readAccessLogs(env);
  const record: AccessLogRecord = {
    id: crypto.randomUUID(),
    kind: "blocked-comment",
    ip: details.ip,
    region: getClientRegion(request),
    isp: getClientIsp(request),
    path: `/${details.page}`,
    method: request.method,
    device: details.device,
    name: details.name,
    body: details.body,
    matchedWord: details.matchedWord,
    createdAt: new Date().toISOString()
  };

  await env.SITE_CONFIG.put(accessLogsKey, JSON.stringify([record, ...logs].slice(0, maxAccessLogs)));
}

function findBlockedCommentWord(words: string[], name: string, body: string): string {
  const content = `${name}\n${body}`.toLowerCase();

  for (const word of words) {
    const normalized = word.trim().toLowerCase();

    if (normalized && content.includes(normalized)) {
      return word;
    }
  }

  return "";
}

function shouldRecordAccess(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const path = new URL(request.url).pathname;

  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/")) {
    return false;
  }

  return !/\.(?:css|js|mjs|map|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|otf|txt|xml|json)$/i.test(path);
}

function commentKey(page: string): string {
  return `${commentsPrefix}${page}`;
}

function normalizeCommentPage(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/[^\p{Letter}\p{Number}_/-]/gu, "").slice(0, 120);
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function getClientRegion(request: Request): string {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  const city = limitText(String(cf?.city || ""), 60);
  const region = limitText(String(cf?.region || ""), 80);
  const country = limitText(String(cf?.country || ""), 20);
  return [country, region, city].filter(Boolean).join(" / ") || "未知地区";
}

function getClientIsp(request: Request): string {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  return limitText(String(cf?.asOrganization || ""), 120) || "未知运营商";
}

function getClientDevice(request: Request): string {
  const headers = request.headers;
  const userAgent = headers.get("user-agent") || "";
  const model = cleanClientHint(headers.get("sec-ch-ua-model"));
  const platform = cleanClientHint(headers.get("sec-ch-ua-platform"));
  const cfType = limitText(headers.get("cf-device-type") || "", 30);
  const device = model || deviceFromUserAgent(userAgent) || platform || cfType || "未知设备";
  const browser = browserFromUserAgent(userAgent);
  const parts = [device, browser].filter(Boolean);

  return limitText([...new Set(parts)].join(" / "), 120) || "未知设备";
}

function cleanClientHint(value: string | null): string {
  return limitText((value || "").replace(/^"|"$/g, ""), 80);
}

function deviceFromUserAgent(userAgent: string): string {
  if (/iPad/i.test(userAgent)) {
    return "iPad";
  }

  if (/iPhone/i.test(userAgent)) {
    return "iPhone";
  }

  if (/Android/i.test(userAgent)) {
    return /Mobile/i.test(userAgent) ? "Android 手机" : "Android 设备";
  }

  if (/Windows/i.test(userAgent)) {
    return "Windows 电脑";
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "Mac";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux 设备";
  }

  return "";
}

function browserFromUserAgent(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/OPR\//i.test(userAgent)) {
    return "Opera";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }

  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    return "Chrome";
  }

  if (/Safari\//i.test(userAgent)) {
    return "Safari";
  }

  return "";
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => limitText(asString(item), maxLength)).filter(Boolean))].slice(
    0,
    maxItems
  );
}

function normalizeSlug(value: string, index: number): string {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-");
  const cleaned = trimmed
    .split("/")
    .map((segment) => segment.replace(/[^\p{Letter}\p{Number}_-]/gu, ""))
    .filter(Boolean)
    .join("/");
  const slug = (cleaned || `page-${index + 1}`).toLowerCase();
  const reserved = slug === "admin" || slug === "api" || slug.startsWith("api/");

  return reserved ? `${slug}-page` : slug;
}

function uniqueSlug(slug: string, used: Set<string>, index: number): string {
  let next = slug || `page-${index + 1}`;
  let suffix = 2;

  while (used.has(next)) {
    next = `${slug}-${suffix}`;
    suffix += 1;
  }

  used.add(next);
  return next;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getAdminPassword(env: AppEnv): Promise<string> {
  const stored = env.SITE_CONFIG ? await env.SITE_CONFIG.get(adminPasswordKey) : "";
  return stored || env.admin || env.ADMIN_PASSWORD || defaultAdminPassword;
}

async function getLimitedAdminPassword(env: AppEnv): Promise<string> {
  const stored = env.SITE_CONFIG ? await env.SITE_CONFIG.get(limitedAdminPasswordKey) : "";
  return stored || env.LIMITED_ADMIN_PASSWORD || defaultLimitedAdminPassword;
}

async function verifyPassword(input: string, expected: string): Promise<boolean> {
  const [inputHash, expectedHash] = await Promise.all([sha256(input), sha256(expected)]);

  return timingSafeEqual(inputHash, expectedHash);
}

async function createAdminToken(env: AppEnv, role: TokenPayload["sub"] = "admin"): Promise<string> {
  const payload: TokenPayload = {
    sub: role,
    exp: Date.now() + tokenMaxAgeMs
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, await getAdminPassword(env));

  return `${encodedPayload}.${signature}`;
}

async function requireAdmin(request: Request, env: AppEnv): Promise<TokenPayload | Response> {
  const payload = await getAdminTokenPayload(request, env);

  return payload ? payload : json({ error: "需要管理员登录" }, 401);
}

async function requireFullAdmin(request: Request, env: AppEnv): Promise<Response | null> {
  const payload = await getAdminTokenPayload(request, env);

  if (!payload) {
    return json({ error: "需要管理员登录" }, 401);
  }

  return payload.sub === "admin" ? null : json({ error: "低权限管理员不能执行这个操作" }, 403);
}

async function isAdminRequest(request: Request, env: AppEnv): Promise<boolean> {
  return Boolean(await getAdminTokenPayload(request, env));
}

async function isFullAdminRequest(request: Request, env: AppEnv): Promise<boolean> {
  const payload = await getAdminTokenPayload(request, env);
  return payload?.sub === "admin";
}

function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

async function getAdminTokenPayload(request: Request, env: AppEnv): Promise<TokenPayload | null> {
  return verifyAdminToken(getBearerToken(request), env);
}

async function verifyAdminToken(token: string, env: AppEnv): Promise<TokenPayload | null> {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = await sign(encodedPayload, await getAdminPassword(env));

  if (!timingSafeEqual(base64UrlDecodeToBytes(signature), base64UrlDecodeToBytes(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecodeToText(encodedPayload)) as Partial<TokenPayload>;

    if ((payload.sub === "admin" || payload.sub === "limited") && typeof payload.exp === "number" && payload.exp > Date.now()) {
      return payload as TokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

async function sha256(value: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

  return new Uint8Array(hash);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index];
  }

  return result === 0;
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToText(value: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(value));
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function limitText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = apiRoutes[url.pathname];

    if (route) {
      return route(request, env as AppEnv);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found", path: url.pathname }, 404);
    }

    ctx.waitUntil(recordAccessLog(request, env as AppEnv));

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
