import { applyConfigPatch, ConfigPatchError } from "./config-patch.js";

type ModuleStatus = "active" | "planned";

type AppEnv = Env & {
  SITE_CONFIG?: KVNamespace;
  GAME_DB?: D1Database;
  GAME_ASSETS?: R2Bucket;
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

type NavigationItem = {
  id: string;
  name: string;
  url: string;
};

type NavigationSection = {
  id: string;
  type: "navigation";
  title: string;
  items: NavigationItem[];
  layout: SectionLayout;
};

type ArticleSection = {
  id: string;
  type: "article";
  articlePath: string;
  layout: SectionLayout;
};

type BlogArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  bodyHtml: string;
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

type GameAssetSlot = {
  id: string;
  label: string;
  kind: "image" | "audio" | "bundle";
};

type GameAssetRef = {
  key: string;
  url: string;
  contentType: string;
  size: number;
  updatedAt: string;
};

type GameAssetPack = {
  id: string;
  name: string;
  description: string;
  coverSlot: string;
  enabled: boolean;
  builtin: boolean;
  default: boolean;
  assets: Record<string, GameAssetRef>;
  updatedAt: string;
};

type GameLevelObject = {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: string;
};

type GameLevel = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  theme: "grass" | "pipe" | "underground" | "sky" | "forest" | "mushroom" | "ice" | "night" | "castle" | "boss";
  enabled: boolean;
  builtin: boolean;
  default: boolean;
  width: number;
  height: number;
  checkpoints: { x: number; y: number }[];
  segments: string[];
  objects: GameLevelObject[];
  designerCode?: string;
  designerSource?: "sm63-redux";
  visibility?: "public";
  updatedAt: string;
};

type HomeAnnouncement = {
  enabled: boolean;
  title: string;
  text: string;
  durationSeconds: number;
};

type PageSection = SystemSection | ContentBlock | ImageSection | VideoSection | P2PSection | CommentsSection | LinkSection | NavigationSection | ArticleSection | BlogSection;

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
  kind: "normal" | "blog";
  title: string;
  description: string;
  backgroundImage: string;
  dailyBackgroundEnabled: boolean;
  locked: boolean;
  passwordEnabled: boolean;
  pagePassword: string;
  visible: boolean;
  modules: string[];
  blocks: ContentBlock[];
  sections: PageSection[];
  entry: PageEntry;
  comments: PageComments;
  blog: BlogSection;
};

type SiteConfig = {
  version: 1;
  updatedAt: string;
  homeTitle: string;
  homeDescription: string;
  homeImage: string;
  commentBlockWords: string[];
  announcement: HomeAnnouncement;
  navOrder: string[];
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
const cubeCityLinkId = "builtin-cubecity";
const cubeCityPath = "/llrgamecubecity";
const llrMarioRunLinkId = "builtin-llr-mariorun";
const llrMarioRunPath = "/llr-mariorun";
const gameAssetPacksKey = "game:asset-packs";
const gameLevelsKey = "game:levels";
const gameAssetKvPrefix = "game-assets-kv/";
const gameAssetR2Prefix = "game-assets/";
const siteMediaKvPrefix = "site-media/";
const siteMediaPathPrefix = "/api/site-media/";
const bingOrigin = "https://www.bing.com";
const bingDailyMetadataUrl = `${bingOrigin}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`;

function defaultCubeCityLink(): SiteLink {
  return {
    id: cubeCityLinkId,
    title: "放松一下",
    description: "进入立方城，放松一下",
    targetUrl: cubeCityPath,
    visible: true,
    iconText: "GAME",
    iconImage: "/llrgamecubecity-entry.webp",
    backgroundImage: "/llrgamecubecity-entry.webp"
  };
}

function defaultLlrMarioRunLink(): SiteLink {
  return {
    id: llrMarioRunLinkId,
    title: "老师大冒险",
    description: "选择素材包和关卡，开始横版跳跃挑战。",
    targetUrl: llrMarioRunPath,
    visible: true,
    iconText: "RUN",
    iconImage: "",
    backgroundImage: ""
  };
}

const gameAssetSlots: GameAssetSlot[] = [
  { id: "player.idle", label: "主角站立", kind: "image" },
  { id: "player.walk1", label: "主角行走 1", kind: "image" },
  { id: "player.walk2", label: "主角行走 2", kind: "image" },
  { id: "player.jump", label: "主角跳跃", kind: "image" },
  { id: "player.hurt", label: "主角受伤", kind: "image" },
  { id: "enemy.goomba", label: "普通怪", kind: "image" },
  { id: "enemy.turtle", label: "乌龟怪", kind: "image" },
  { id: "enemy.flower", label: "食人花", kind: "image" },
  { id: "powerup.mushroom", label: "蘑菇", kind: "image" },
  { id: "powerup.flower", label: "花", kind: "image" },
  { id: "powerup.star", label: "星星", kind: "image" },
  { id: "item.coin", label: "金币", kind: "image" },
  { id: "tile.brick", label: "砖块", kind: "image" },
  { id: "tile.question", label: "问号块", kind: "image" },
  { id: "tile.ground", label: "地面", kind: "image" },
  { id: "tile.pipe", label: "管道", kind: "image" },
  { id: "boss.main", label: "Boss", kind: "image" },
  { id: "princess.idle", label: "救出目标", kind: "image" },
  { id: "background.world1", label: "草地背景", kind: "image" },
  { id: "background.underground", label: "地下背景", kind: "image" },
  { id: "background.castle", label: "城堡背景", kind: "image" },
  { id: "ui.cover", label: "素材包封面", kind: "image" },
  { id: "audio.jump", label: "跳跃音效", kind: "audio" },
  { id: "audio.coin", label: "金币音效", kind: "audio" },
  { id: "audio.hurt", label: "受伤音效", kind: "audio" },
  { id: "audio.win", label: "胜利音效", kind: "audio" },
  { id: "audio.bgm", label: "背景音乐", kind: "audio" },
  { id: "sm63.player.sheet", label: "SM63 主角整张动作表", kind: "image" },
  { id: "sm63.fludd.sheet", label: "SM63 喷水背包动作表", kind: "image" },
  { id: "sm63.enemy.goomba.walk", label: "SM63 Goomba 行走表", kind: "image" },
  { id: "sm63.enemy.goomba.jump", label: "SM63 Goomba 跳跃表", kind: "image" },
  { id: "sm63.enemy.goomba.squish", label: "SM63 Goomba 踩扁表", kind: "image" },
  { id: "sm63.enemy.koopa.walk", label: "SM63 Koopa 行走表", kind: "image" },
  { id: "sm63.pickup.coins", label: "SM63 金币整张表", kind: "image" },
  { id: "sm63.terrain.jungle", label: "SM63 丛林地形图集", kind: "image" },
  { id: "sm63.ui.title.logo", label: "SM63 标题 Logo", kind: "image" },
  { id: "sm63.audio.title", label: "SM63 标题音乐", kind: "audio" },
  { id: "sm63.audio.menu.day", label: "SM63 菜单音乐", kind: "audio" },
  { id: "sm63.audio.editor.1", label: "SM63 编辑器音乐 1", kind: "audio" },
  { id: "sm63.audio.editor.2", label: "SM63 编辑器音乐 2", kind: "audio" },
  { id: "sm63.audio.editor.3", label: "SM63 编辑器音乐 3", kind: "audio" },
  { id: "sm63.audio.editor.4", label: "SM63 编辑器音乐 4", kind: "audio" },
  { id: "game.bundle.pck", label: "Godot 游戏包 .pck", kind: "bundle" }
];

const defaultGameAssetPacks: GameAssetPack[] = [
  {
    id: "teacher-default",
    name: "老师默认版",
    description: "内置占位素材包，后台可以复制后替换成老师、怪物、Boss 和公主素材。",
    coverSlot: "ui.cover",
    enabled: true,
    builtin: true,
    default: true,
    assets: {},
    updatedAt: "2026-06-24T00:00:00.000Z"
  }
];

const defaultGameLevels: GameLevel[] = [
  ...createDefaultGameLevels()
];

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
  navOrder: ["page:workspace", `link:${cubeCityLinkId}`, `link:${llrMarioRunLinkId}`],
  links: [defaultCubeCityLink(), defaultLlrMarioRunLink()],
  pages: [
    {
      id: "workspace",
      slug: "workspace",
      kind: "normal",
      title: "模块工作台",
      description: "集中查看站点状态、便签、API 和发布清单。",
      backgroundImage: "",
      dailyBackgroundEnabled: false,
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
      ],
      blog: {
        id: "workspace-blog",
        type: "blog",
        title: "博客",
        description: "收录文章、笔记和日常。",
        notice: "",
        profileName: "站长",
        profileDescription: "这里是博客作者介绍。",
        profileImage: "",
        categories: ["推荐", "教程", "日常"],
        articles: [],
        layout: defaultLayout("blog")
      }
    }
  ]
};

function createDefaultGameLevels(): GameLevel[] {
  const descriptors: Array<{ id: string; name: string; theme: GameLevel["theme"] }> = [
    { id: "level-01", name: "新手草地长路", theme: "grass" },
    { id: "level-02", name: "管道丘陵", theme: "pipe" },
    { id: "level-03", name: "地下金币矿洞", theme: "underground" },
    { id: "level-04", name: "高空平台群岛", theme: "sky" },
    { id: "level-05", name: "森林怪物巡逻线", theme: "forest" },
    { id: "level-06", name: "蘑菇弹跳峡谷", theme: "mushroom" },
    { id: "level-07", name: "冰面滑行工厂", theme: "ice" },
    { id: "level-08", name: "黑夜管道迷宫", theme: "night" },
    { id: "level-09", name: "城堡火焰桥", theme: "castle" },
    { id: "level-10", name: "Boss 与公主终章", theme: "boss" }
  ];

  return descriptors.map((descriptor, index) => {
    const name = descriptor.name;
    const levelNumber = String(index + 1).padStart(2, "0");
    const width = index === 9 ? 5200 : 6200 + index * 180;
    const baseY = 416;
    const objects: GameLevelObject[] = [
      { id: `start-${levelNumber}`, type: "start", x: 96, y: baseY },
      { id: `ground-a-${levelNumber}`, type: "ground", x: 0, y: 464, width, height: 96 },
      { id: `coin-a-${levelNumber}`, type: "coin", x: 420, y: 300 },
      { id: `question-a-${levelNumber}`, type: "question", x: 620, y: 288, value: "powerup.mushroom" },
      { id: `enemy-a-${levelNumber}`, type: "enemy.goomba", x: 900, y: baseY },
      { id: `pipe-a-${levelNumber}`, type: "pipe", x: 1260, y: 368, width: 64, height: 96 },
      { id: `checkpoint-a-${levelNumber}`, type: "checkpoint", x: 1800, y: baseY },
      { id: `brick-a-${levelNumber}`, type: "brick", x: 2100, y: 300 },
      { id: `enemy-b-${levelNumber}`, type: index > 1 ? "enemy.turtle" : "enemy.goomba", x: 2500, y: baseY },
      { id: `platform-a-${levelNumber}`, type: index > 3 ? "moving-platform" : "platform", x: 3000, y: 350, width: 192, height: 32 },
      { id: `coin-b-${levelNumber}`, type: "coin", x: 3120, y: 260 },
      { id: `checkpoint-b-${levelNumber}`, type: "checkpoint", x: 3400, y: baseY },
      { id: `power-a-${levelNumber}`, type: index > 5 ? "powerup.star" : "powerup.mushroom", x: 3800, y: 300 },
      { id: `hazard-a-${levelNumber}`, type: index > 7 ? "firebar" : "gap", x: 4300, y: 464, width: 160, height: 96 },
      { id: `enemy-c-${levelNumber}`, type: index > 7 ? "enemy.flower" : "enemy.goomba", x: 4700, y: baseY },
      { id: `finish-${levelNumber}`, type: index === 9 ? "princess.idle" : index === 8 ? "castle-door" : "finish", x: width - 380, y: baseY }
    ];

    if (index === 9) {
      objects.push({ id: "boss-final", type: "boss.main", x: width - 900, y: baseY, value: "3" });
    }

    return {
      id: descriptor.id,
      name,
      description: `原创长流程平台跳跃关卡：${name}。默认公平，不包含猫里奥陷阱，可由管理员复制后自行添加。`,
      difficulty: index < 2 ? "简单" : index < 6 ? "中等" : index < 8 ? "偏高" : "高",
      theme: descriptor.theme,
      enabled: true,
      builtin: true,
      default: index === 0,
      width,
      height: 560,
      checkpoints: [{ x: 600, y: baseY }, { x: 1800, y: baseY }, { x: 3400, y: baseY }],
      segments: ["开场", "第一挑战", "中段变化", "第二挑战", "补给检查点", "终点"],
      objects,
      updatedAt: "2026-06-24T00:00:00.000Z"
    };
  });
}

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

const revalidatingStaticAssetExtensions = /\.(?:css|js|mjs|map|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|otf|txt|xml|json|webmanifest|glb|gltf|bin|mp3|ogg|wav|wasm|pck|gz|br)$/i;
const cubeCityRevalidatingAssetPrefixes = [
  "/llrgamecubecity/audio/",
  "/llrgamecubecity/fonts/",
  "/llrgamecubecity/models/",
  "/llrgamecubecity/textures/"
];

function cacheControlForStaticPath(pathname: string): string | null {
  if (pathname.startsWith("/site-assets/") || pathname.startsWith("/llrgamecubecity/assets/")) {
    return "public, max-age=31536000, immutable";
  }

  if (cubeCityRevalidatingAssetPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return "public, max-age=0, must-revalidate";
  }

  if (pathname.endsWith(".html") || pathname === "/" || !pathname.split("/").pop()?.includes(".")) {
    return "public, max-age=0, must-revalidate";
  }

  if (revalidatingStaticAssetExtensions.test(pathname)) {
    return "public, max-age=0, must-revalidate";
  }

  return null;
}

function withStaticAssetHeaders(request: Request, response: Response): Response {
  const url = new URL(request.url);
  const cacheControl = cacheControlForStaticPath(url.pathname);

  if (!cacheControl && response.headers.has("cache-control")) {
    return response;
  }

  const headers = new Headers(response.headers);

  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }

  headers.set("x-content-type-options", "nosniff");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchStaticAsset(request: Request, env: AppEnv): Promise<Response> {
  return withStaticAssetHeaders(request, await env.ASSETS.fetch(request));
}

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

  "/api/site-config": async (request, env) =>
    conditionalJson(request, {
      config: toPublicSiteConfig(await readPublicSiteConfig(env), request)
    }),

  "/api/game/manifest": fetchGameManifest,
  "/api/admin/game": handleAdminGame,
  "/api/admin/game/designer-levels": handleAdminDesignerLevels,

  "/api/daily-background": fetchDailyBackground,

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
    const requestedConfig = withUpdatedAt(normalizeSiteConfig(body.config));
    const mergedConfig = auth.sub === "limited" ? mergeLimitedConfig(currentConfig, requestedConfig) : requestedConfig;

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const { config } = await materializeSiteConfigMedia(mergedConfig, env);
    await env.SITE_CONFIG.put(configKey, JSON.stringify(config));

    return json({
      ok: true,
      role: auth.sub,
      config
    });
  },

  "/api/admin/config-patch": async (request, env) => {
    const auth = await requireAdmin(request, env);

    if (auth instanceof Response) {
      return auth;
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 100_000_000) {
      return json({ error: "配置补丁过大，请减少单次修改内容。" }, 413);
    }

    const body = asRecord(await readJson(request));
    const baseUpdatedAt = asString(body.baseUpdatedAt);
    const currentConfig = await readSiteConfig(env);
    if (!baseUpdatedAt || baseUpdatedAt !== currentConfig.updatedAt) {
      return json({
        error: "网站配置已在其他页面更新，请重新加载后再修改。",
        code: "CONFIG_VERSION_CONFLICT",
        updatedAt: currentConfig.updatedAt
      }, 409);
    }

    let requestedConfig: SiteConfig;
    try {
      requestedConfig = withUpdatedAt(normalizeSiteConfig(applyConfigPatch(currentConfig, body.operations)));
    } catch (error) {
      if (error instanceof ConfigPatchError) {
        return json({ error: error.message }, 400);
      }
      throw error;
    }
    const mergedConfig = auth.sub === "limited" ? mergeLimitedConfig(currentConfig, requestedConfig) : requestedConfig;

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    const { config } = await materializeSiteConfigMedia(mergedConfig, env);
    await env.SITE_CONFIG.put(configKey, JSON.stringify(config));

    return json({
      ok: true,
      role: auth.sub,
      updatedAt: config.updatedAt
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

async function fetchDailyBackground(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const cached = await caches.default.match(request);
  if (cached) {
    return cached;
  }

  try {
    const metadataResponse = await fetch(bingDailyMetadataUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    if (!metadataResponse.ok) {
      return json({ error: "每日背景元数据暂不可用" }, 502);
    }

    const metadata = asRecord(await metadataResponse.json());
    const images = Array.isArray(metadata.images) ? metadata.images : [];
    const metadataImage = asRecord(images[0]);
    const urlbase = asString(metadataImage.urlbase);
    const fallbackPath = asString(metadataImage.url);
    const candidates = [
      urlbase ? `${urlbase}_UHD.jpg` : "",
      fallbackPath
    ].filter(Boolean);

    for (const candidate of candidates) {
      const url = bingImageUrl(candidate);
      if (!url) {
        continue;
      }

      const imageResponse = await fetch(url.toString(), {
        headers: { accept: "image/avif,image/webp,image/*" },
        signal: AbortSignal.timeout(8000)
      });
      const contentType = imageResponse.headers.get("content-type") || "";
      if (!imageResponse.ok || !contentType.startsWith("image/")) {
        continue;
      }

      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("cache-control", "public, max-age=3600, s-maxage=21600");
      headers.set("x-content-type-options", "nosniff");
      const response = new Response(imageResponse.body, { status: 200, headers });
      await caches.default.put(request, response.clone());
      return response;
    }
  } catch {
    return json({ error: "每日背景暂不可用" }, 502);
  }

  return json({ error: "每日背景图片暂不可用" }, 502);
}

function bingImageUrl(value: string): URL | null {
  try {
    const url = new URL(value, bingOrigin);
    if (url.origin !== bingOrigin || url.pathname !== "/th") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function readSiteConfig(env: AppEnv): Promise<SiteConfig> {
  if (!env.SITE_CONFIG) {
    return defaultSiteConfig;
  }

  const stored = await env.SITE_CONFIG.get(configKey, "json");

  return normalizeSiteConfig(stored ?? defaultSiteConfig);
}

async function readPublicSiteConfig(env: AppEnv): Promise<SiteConfig> {
  const config = await readSiteConfig(env);
  const materialized = await materializeSiteConfigMedia(config, env);

  if (materialized.changed && env.SITE_CONFIG) {
    await env.SITE_CONFIG.put(configKey, JSON.stringify(materialized.config));
  }

  return materialized.config;
}

function toPublicSiteConfig(config: SiteConfig, request?: Request): SiteConfig {
  const route = request ? normalizePublicConfigRoute(new URL(request.url).searchParams.get("route") || "") : "";
  const [requestedSlug = "", requestedArticleId = ""] = route.split("/");
  const requestedPage = config.pages.find((page) => page.slug === requestedSlug);
  const referencedArticles = collectReferencedArticles(requestedPage);

  return {
    ...config,
    commentBlockWords: [],
    pages: config.pages.map((page) => {
      if (page.passwordEnabled) {
        return toLockedPublicPage(page);
      }

      const publicPage = toPublicPage(page);
      if (page.slug === requestedSlug) {
        return toScopedCurrentPage(publicPage, requestedArticleId);
      }

      return toPublicPageSummary(publicPage, referencedArticles);
    })
  };
}

function toPublicPage(page: SitePage): SitePage {
  return {
    ...page,
    pagePassword: ""
  };
}

function toScopedCurrentPage(page: SitePage, requestedArticleId: string): SitePage {
  if (page.kind !== "blog") {
    return page;
  }

  const articleId = requestedArticleId.toLowerCase();
  return {
    ...page,
    blog: {
      ...page.blog,
      articles: page.blog.articles.map((article) => (
        articleId && article.id.toLowerCase() === articleId
          ? article
          : toPublicArticleSummary(article)
      ))
    }
  };
}

function toPublicPageSummary(page: SitePage, referencedArticles: Set<string>): SitePage {
  return {
    ...page,
    backgroundImage: "",
    modules: [],
    blocks: [],
    sections: [],
    blog: {
      ...page.blog,
      profileImage: "",
      articles: page.blog.articles
        .filter((article) => referencedArticles.has(`${page.slug}/${article.id}`.toLowerCase()))
        .map(toPublicArticleSummary)
    }
  };
}

function toPublicArticleSummary(article: BlogArticle): BlogArticle {
  return {
    ...article,
    body: "",
    bodyHtml: ""
  };
}

function normalizePublicConfigRoute(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .slice(0, 2)
    .map((segment) => segment.replace(/[^\p{Letter}\p{Number}_-]/gu, ""))
    .filter(Boolean)
    .join("/")
    .toLowerCase();
}

function collectReferencedArticles(page: SitePage | undefined): Set<string> {
  const references = new Set<string>();
  if (!page) {
    return references;
  }

  for (const section of page.sections) {
    if (section.type !== "article") {
      continue;
    }

    const normalized = normalizePublicConfigRoute(section.articlePath);
    if (normalized.includes("/")) {
      references.add(normalized);
    }
  }

  return references;
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
    },
    blog: {
      ...page.blog,
      description: "",
      notice: "",
      articles: []
    }
  };
}

async function materializeSiteConfigMedia(
  config: SiteConfig,
  env: AppEnv
): Promise<{ config: SiteConfig; changed: boolean }> {
  if (!env.SITE_CONFIG) {
    return { config, changed: false };
  }

  const next = structuredClone(config);
  const pending = new Map<string, Promise<string>>();
  let changed = false;

  const materializeImage = async (source: string): Promise<string> => {
    if (!source.startsWith("data:image/")) {
      return source;
    }

    let task = pending.get(source);
    if (!task) {
      task = storeSiteMediaDataUrl(source, env);
      pending.set(source, task);
    }

    const result = await task;
    if (result !== source) {
      changed = true;
    }
    return result;
  };

  next.homeImage = await materializeImage(next.homeImage);

  for (const link of next.links) {
    link.iconImage = await materializeImage(link.iconImage);
    link.backgroundImage = await materializeImage(link.backgroundImage);
  }

  for (const page of next.pages) {
    page.backgroundImage = await materializeImage(page.backgroundImage);
    page.entry.iconImage = await materializeImage(page.entry.iconImage);
    page.entry.sidebarIconImage = await materializeImage(page.entry.sidebarIconImage);
    page.entry.backgroundImage = await materializeImage(page.entry.backgroundImage);
    await materializeBlogMedia(page.blog, materializeImage);

    for (const section of page.sections) {
      if (section.type === "image") {
        section.src = await materializeImage(section.src);
      } else if (section.type === "video") {
        section.poster = await materializeImage(section.poster);
      } else if (section.type === "link") {
        section.iconImage = await materializeImage(section.iconImage);
        section.backgroundImage = await materializeImage(section.backgroundImage);
      } else if (section.type === "blog") {
        await materializeBlogMedia(section, materializeImage);
      }
    }
  }

  return { config: next, changed };
}

async function materializeBlogMedia(
  blog: BlogSection,
  materializeImage: (source: string) => Promise<string>
): Promise<void> {
  blog.profileImage = await materializeImage(blog.profileImage);

  for (const article of blog.articles) {
    article.coverImage = await materializeImage(article.coverImage);
    article.bodyHtml = await replaceEmbeddedHtmlImages(article.bodyHtml, materializeImage);
  }
}

async function replaceEmbeddedHtmlImages(
  html: string,
  materializeImage: (source: string) => Promise<string>
): Promise<string> {
  const expression = /(src\s*=\s*["'])(data:image\/[^"']+)(["'])/gi;
  const matches = [...html.matchAll(expression)];
  if (matches.length === 0) {
    return html;
  }

  let result = "";
  let offset = 0;

  for (const match of matches) {
    const index = match.index ?? 0;
    result += html.slice(offset, index);
    result += `${match[1]}${await materializeImage(match[2])}${match[3]}`;
    offset = index + match[0].length;
  }

  return result + html.slice(offset);
}

async function storeSiteMediaDataUrl(source: string, env: AppEnv): Promise<string> {
  const parsed = parseImageDataUrl(source);
  if (!parsed || !env.SITE_CONFIG) {
    return source;
  }

  try {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", parsed.bytes));
    const hash = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const fileName = `${hash}.${parsed.extension}`;
    const key = `${siteMediaKvPrefix}${fileName}`;
    await env.SITE_CONFIG.put(key, parsed.bytes, {
      metadata: {
        contentType: parsed.contentType,
        size: parsed.bytes.byteLength,
        cacheControl: "public, max-age=31536000, immutable"
      }
    });
    return `${siteMediaPathPrefix}${fileName}`;
  } catch {
    return source;
  }
}

function parseImageDataUrl(
  source: string
): { bytes: Uint8Array; contentType: string; extension: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([a-z0-9+/=\s]+)$/i.exec(source);
  if (!match) {
    return null;
  }

  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif"
  };
  const contentType = match[1].toLowerCase();
  const extension = extensions[contentType];
  if (!extension) {
    return null;
  }

  try {
    const binary = atob(match[2].replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { bytes, contentType, extension };
  } catch {
    return null;
  }
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
      blog: mergeLimitedBlogSection(page.blog, requestedPage.blog),
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

    const normalizedPage: SitePage = {
      id: asString(record.id) || crypto.randomUUID(),
      slug,
      kind: asString(record.kind) === "blog" ? "blog" : "normal",
      title: limitText(asString(record.title) || `分页面 ${index + 1}`, 80),
      description: limitText(asString(record.description), 220),
      backgroundImage: normalizeImageSrc(asString(record.backgroundImage)),
      dailyBackgroundEnabled: typeof record.dailyBackgroundEnabled === "boolean" ? record.dailyBackgroundEnabled : false,
      locked: typeof record.locked === "boolean" ? record.locked : false,
      passwordEnabled: typeof record.passwordEnabled === "boolean" ? record.passwordEnabled : false,
      pagePassword: limitText(asString(record.pagePassword), 120),
      visible: typeof record.visible === "boolean" ? record.visible : true,
      modules: [...new Set(modules)],
      blocks,
      sections,
      entry,
      comments,
      blog: normalizeBlogPage(record.blog, index)
    };

    return normalizedPage;
  });

  if (pages.length === 0) {
    pages.push(defaultSiteConfig.pages[0]);
  }

  const links = rawLinks.slice(0, 40).map(normalizeSiteLink);
  const hasCubeCityLink = links.some(
    (link) => link.id === cubeCityLinkId || normalizeInternalPath(link.targetUrl) === cubeCityPath
  );
  if (!hasCubeCityLink && links.length < 40) {
    links.push(defaultCubeCityLink());
  }
  const hasLlrMarioRunLink = links.some(
    (link) => link.id === llrMarioRunLinkId || normalizeInternalPath(link.targetUrl) === llrMarioRunPath
  );
  if (!hasLlrMarioRunLink && links.length < 40) {
    links.push(defaultLlrMarioRunLink());
  }
  const navOrder = normalizeNavOrder(source.navOrder, pages, links);

  return {
    version: 1,
    updatedAt: asString(source.updatedAt) || new Date().toISOString(),
    homeTitle: limitText(asString(source.homeTitle) || defaultSiteConfig.homeTitle, 80),
    homeDescription: limitText(asString(source.homeDescription) || defaultSiteConfig.homeDescription, 220),
    homeImage: normalizeImageSrc(asString(source.homeImage)),
    commentBlockWords: normalizeCommentBlockWords(source.commentBlockWords),
    announcement: normalizeAnnouncement(source.announcement),
    navOrder,
    links,
    pages
  };
}

function withUpdatedAt(config: SiteConfig): SiteConfig {
  return {
    ...config,
    updatedAt: new Date().toISOString()
  };
}

function normalizeNavOrder(value: unknown, pages: SitePage[], links: SiteLink[]): string[] {
  const valid = new Set([
    ...pages.map((page) => `page:${page.id}`),
    ...links.map((link) => `link:${link.id}`)
  ]);
  const raw = Array.isArray(value) ? value : [];
  const order = raw
    .map((item) => asString(item))
    .filter((item) => valid.has(item));
  const used = new Set(order);

  for (const page of pages) {
    const key = `page:${page.id}`;
    if (!used.has(key)) {
      order.push(key);
      used.add(key);
    }
  }

  for (const link of links) {
    const key = `link:${link.id}`;
    if (!used.has(key)) {
      order.push(key);
      used.add(key);
    }
  }

  return order;
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
    return null;
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

  if (type === "navigation") {
    const items = (Array.isArray(record.items) ? record.items : [])
      .slice(0, 100)
      .map((item) => {
        const itemRecord = asRecord(item);
        return {
          id: asString(itemRecord.id) || crypto.randomUUID(),
          name: limitText(asString(itemRecord.name), 80),
          url: normalizeExternalUrl(asString(itemRecord.url))
        };
      })
      .filter((item) => item.name || item.url);

    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "navigation",
      title: limitText(asString(record.title) || "导航", 80),
      items,
      layout: normalizeLayout(record.layout, "navigation")
    };
  }

  if (type === "article") {
    return {
      id: asString(record.id) || crypto.randomUUID(),
      type: "article",
      articlePath: normalizeInternalPath(asString(record.articlePath)),
      layout: normalizeLayout(record.layout, "article")
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
      bodyHtml: limitText(asString(record.bodyHtml), 2_000_000),
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

function normalizeBlogPage(value: unknown, index: number): BlogSection {
  const record = asRecord(value);

  return {
    id: asString(record.id) || crypto.randomUUID(),
    type: "blog",
    title: limitText(asString(record.title) || "博客", 80),
    description: limitText(asString(record.description) || "收录文章、笔记和日常。", 180),
    notice: limitText(asString(record.notice), 180),
    profileName: limitText(asString(record.profileName) || "站长", 60),
    profileDescription: limitText(asString(record.profileDescription) || "这里是博客作者介绍。", 160),
    profileImage: normalizeImageSrc(asString(record.profileImage)),
    categories: normalizeStringList(record.categories, 20, 30),
    articles: normalizeBlogArticles(record.articles),
    layout: normalizeLayout(record.layout, `blog-${index}`)
  };
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
    minHeight: type === "comments" ? 320 : type === "navigation" ? 420 : 280,
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

  if (raw.startsWith("/")) {
    return normalizeInternalPath(raw);
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function fetchSiteMedia(request: Request, env: AppEnv, fileName: string): Promise<Response> {
  if (!["GET", "HEAD"].includes(request.method)) {
    return json({ error: "Method Not Allowed" }, 405);
  }

  if (!env.SITE_CONFIG || !/^[a-f0-9]{64}\.(?:png|jpe?g|webp|gif|avif)$/i.test(fileName)) {
    return json({ error: "Site media not found" }, 404);
  }

  const object = await env.SITE_CONFIG.getWithMetadata<{
    contentType?: string;
    cacheControl?: string;
  }>(`${siteMediaKvPrefix}${fileName}`, "arrayBuffer");

  if (!object.value) {
    return json({ error: "Site media not found" }, 404);
  }

  const headers = new Headers({
    "content-type": object.metadata?.contentType || contentTypeForSiteMedia(fileName),
    "cache-control": object.metadata?.cacheControl || "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff"
  });

  return new Response(request.method === "HEAD" ? null : object.value, { headers });
}

function contentTypeForSiteMedia(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif"
  };
  return types[extension || ""] || "application/octet-stream";
}

async function fetchGameManifest(request: Request, env: AppEnv): Promise<Response> {
  const packs = (await readGameAssetPacks(env)).filter((pack) => pack.enabled);
  const levels = (await readGameLevels(env)).filter((level) => level.enabled);
  const defaultPack = packs.find((pack) => pack.default) || packs[0] || defaultGameAssetPacks[0];
  const defaultLevel = levels.find((level) => level.default) || levels[0] || defaultGameLevels[0];

  return json({
    slots: gameAssetSlots,
    assetSlots: gameAssetSlots,
    assetPacks: packs.map(toPublicGameAssetPack),
    levels,
    defaultAssetPackId: defaultPack.id,
    defaultLevelId: defaultLevel.id,
    assetBaseUrl: new URL("/api/game/assets/", request.url).pathname
  });
}

async function handleAdminGame(request: Request, env: AppEnv): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (request.method !== "GET") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  return json({
    slots: gameAssetSlots,
    assetPacks: await readGameAssetPacks(env),
    levels: await readGameLevels(env),
    limits: {
      imageMaxBytes: 2 * 1024 * 1024,
      audioMaxBytes: 8 * 1024 * 1024
    }
  });
}

async function handleAdminGameAssetPacks(request: Request, env: AppEnv): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (request.method !== "PUT") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  if (!env.GAME_DB && !env.SITE_CONFIG) {
    return json({ error: "Game metadata storage is missing" }, 503);
  }

  const body = asRecord(await readJson(request));
  const packs = normalizeGameAssetPacks(body.assetPacks).slice(0, 30);
  await writeGameAssetPacks(env, packs);

  return json({ ok: true, assetPacks: packs });
}

async function handleAdminGameLevels(request: Request, env: AppEnv): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (request.method !== "PUT") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  if (!env.GAME_DB && !env.SITE_CONFIG) {
    return json({ error: "Game metadata storage is missing" }, 503);
  }

  const body = asRecord(await readJson(request));
  const levels = normalizeGameLevels(body.levels).slice(0, 80);
  await writeGameLevels(env, levels);

  return json({ ok: true, levels });
}

async function handleAdminDesignerLevels(request: Request, env: AppEnv): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (!env.GAME_DB && !env.SITE_CONFIG) {
    return json({ error: "Game metadata storage is missing" }, 503);
  }

  if (request.method === "DELETE") {
    const id = normalizeId(new URL(request.url).searchParams.get("id") || "", 80);
    const levels = await readGameLevels(env);
    const target = levels.find((level) => level.id === id);
    const isSm63DesignerLevel = target?.designerSource === "sm63-redux";

    if (!target || !isSm63DesignerLevel || target.builtin) {
      return json({ error: "只能删除管理员发布的设计器关卡" }, 404);
    }

    const nextLevels = levels.filter((level) => level.id !== id);
    await writeGameLevels(env, normalizeGameLevels(nextLevels).slice(0, 120));

    return json({ ok: true, deletedId: id });
  }

  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const body = asRecord(await readJson(request));
  const code = normalizeDesignerLevelCode(asString(body.code));

  if (!code) {
    return json({ error: "设计器关卡数据为空或格式不正确" }, 400);
  }

  const now = new Date().toISOString();
  const id = normalizeId(asString(body.id), 80) || `designer-${await shortHash(code)}`;
  const levels = await readGameLevels(env);
  const existingIndex = levels.findIndex((level) => level.id === id);
  const fallback = existingIndex >= 0 ? levels[existingIndex] : defaultGameLevels[0];
  const nextLevel: GameLevel = {
    id,
    name: limitText(asString(body.name) || fallback.name || "自定义关卡", 80),
    description: limitText(asString(body.description) || "管理员在游戏内 Level Designer 保存的公开关卡。", 260),
    difficulty: limitText(asString(body.difficulty) || fallback.difficulty || "自定义", 40),
    theme: normalizeGameTheme(asString(body.theme), fallback.theme || "grass"),
    enabled: true,
    builtin: false,
    default: false,
    width: clampNumber(body.width, 1600, 20000, fallback.width || 6400),
    height: clampNumber(body.height, 320, 1600, fallback.height || 560),
    checkpoints: normalizeGameCheckpoints(body.checkpoints, fallback.checkpoints || [{ x: 600, y: 416 }]),
    segments: normalizeStringList(body.segments, 12, 40).length ? normalizeStringList(body.segments, 12, 40) : ["Level Designer"],
    objects: Array.isArray(body.objects)
      ? body.objects.map((object, objectIndex) => normalizeGameLevelObject(object, objectIndex)).filter((object): object is GameLevelObject => Boolean(object)).slice(0, 1200)
      : [],
    designerCode: code,
    designerSource: "sm63-redux",
    visibility: "public",
    updatedAt: now
  };
  const nextLevels = [...levels];

  if (existingIndex >= 0) {
    nextLevels[existingIndex] = nextLevel;
  } else {
    nextLevels.push(nextLevel);
  }

  await writeGameLevels(env, normalizeGameLevels(nextLevels).slice(0, 120));

  return json({ ok: true, level: nextLevel });
}

async function handleGameAssetUpload(request: Request, env: AppEnv): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (!env.GAME_ASSETS && !env.SITE_CONFIG) {
    return json({ error: "Game asset storage is missing" }, 503);
  }

  const form = await request.formData();
  const slotId = limitText(asString(form.get("slotId")), 80);
  const file = asUploadFile(form.get("file"));
  const slot = gameAssetSlots.find((item) => item.id === slotId);

  if (!slot || !file) {
    return json({ error: "素材槽位和文件不能为空" }, 400);
  }

  const allowedImageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const allowedAudioTypes = ["audio/mpeg", "audio/ogg", "audio/wav"];
  const allowedBundleTypes = ["application/octet-stream", "application/x-godot-pack", "application/x-pck", ""];
  const allowed = slot.kind === "image" ? allowedImageTypes : slot.kind === "audio" ? allowedAudioTypes : allowedBundleTypes;
  const maxBytes = slot.kind === "image" ? 2 * 1024 * 1024 : slot.kind === "audio" ? 8 * 1024 * 1024 : 20 * 1024 * 1024;
  const looksLikePck = file.name.toLowerCase().endsWith(".pck");

  if ((!allowed.includes(file.type) && !(slot.kind === "bundle" && looksLikePck)) || file.size > maxBytes) {
    return json({ error: "素材类型或大小不符合限制（图片 2MB / 音频 8MB / PCK 20MB）" }, 400);
  }

  const extension = slot.kind === "bundle" ? "pck" : assetExtension(file.type);
  const filename = `${slot.id.replace(/[^a-z0-9.-]/gi, "-")}.${extension}`;
  const key = env.GAME_ASSETS
    ? `${gameAssetR2Prefix}${crypto.randomUUID()}/${filename}`
    : `${gameAssetKvPrefix}${crypto.randomUUID()}/${filename}`;

  if (env.GAME_ASSETS) {
    await env.GAME_ASSETS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        slotId,
        originalName: limitText(file.name, 160)
      }
    });
  } else if (env.SITE_CONFIG) {
    await env.SITE_CONFIG.put(key, await file.arrayBuffer(), {
      metadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
        slotId,
        originalName: limitText(file.name, 160),
        size: String(file.size)
      }
    });
  }

  const asset: GameAssetRef = {
    key,
    url: `/api/game/assets/${encodeURIComponent(key)}`,
    contentType: file.type,
    size: file.size,
    updatedAt: new Date().toISOString()
  };

  return json({ ok: true, asset });
}

type UploadFileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  stream: () => ReadableStream<Uint8Array>;
};

function asUploadFile(value: unknown): UploadFileLike | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<UploadFileLike>;
  return typeof record.name === "string"
    && typeof record.type === "string"
    && typeof record.size === "number"
    && typeof record.arrayBuffer === "function"
    && typeof record.stream === "function"
    ? record as UploadFileLike
    : null;
}

async function fetchGameAsset(request: Request, env: AppEnv, key: string): Promise<Response> {
  if (!isSafeGameAssetKey(key)) {
    return json({ error: "Invalid asset key" }, 400);
  }

  if (env.GAME_ASSETS && key.startsWith(gameAssetR2Prefix)) {
    const object = await env.GAME_ASSETS.get(key);

    if (!object) {
      return json({ error: "素材不存在" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", headers.get("cache-control") || "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  }

  if (env.SITE_CONFIG && key.startsWith(gameAssetKvPrefix)) {
    const object = await env.SITE_CONFIG.getWithMetadata<{
      contentType?: string;
      cacheControl?: string;
    }>(key, "arrayBuffer");

    if (!object.value) {
      return json({ error: "素材不存在" }, 404);
    }

    const headers = new Headers({
      "content-type": object.metadata?.contentType || "application/octet-stream",
      "cache-control": object.metadata?.cacheControl || "public, max-age=31536000, immutable"
    });

    return new Response(object.value, { headers });
  }

  return json({ error: "Game asset storage is missing" }, 503);
}

async function fetchGodotGamePack(request: Request, env: AppEnv): Promise<Response | null> {
  const packs = await readGameAssetPacks(env);
  const requestUrl = new URL(request.url);
  const referer = request.headers.get("referer") || "";
  const requestedPackId = requestUrl.searchParams.get("pack") || safeUrlSearchParam(referer, "pack");
  const activePack = packs.find((pack) => pack.enabled && pack.id === requestedPackId)
    || packs.find((pack) => pack.enabled && pack.default)
    || packs.find((pack) => pack.enabled);
  const gamePack = activePack?.assets["game.bundle.pck"];

  if (!gamePack?.key) {
    return null;
  }

  const response = await fetchGameAsset(request, env, gamePack.key);
  const headers = new Headers(response.headers);
  headers.set("content-type", headers.get("content-type") || "application/octet-stream");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-llr-pack-id", activePack?.id || requestedPackId || "default");
  headers.append("vary", "Referer");

  if (!response.ok) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  const targetPackBuffer = await response.arrayBuffer();
  const defaultPackResponse = await env.ASSETS.fetch(new Request(new URL(`${llrMarioRunPath}/godot/index.pck`, request.url), request));

  if (!defaultPackResponse.ok) {
    headers.set("x-llr-extra-patch", "default-pack-missing");
    return new Response(targetPackBuffer, { headers });
  }

  try {
    const patchedPack = patchSm63ExtrasIntoPck(
      targetPackBuffer,
      await defaultPackResponse.arrayBuffer()
    );
    headers.set("content-length", String(patchedPack.byteLength));
    headers.set("x-llr-extra-patch", "applied");
    return new Response(patchedPack, { headers });
  } catch {
    headers.set("x-llr-extra-patch", "failed");
    return new Response(targetPackBuffer, { headers });
  }
}

type GodotPckEntry = {
  name: string;
  offset: number;
  size: number;
  md5: Uint8Array;
  flags: number;
};

type GodotPckArchive = {
  bytes: Uint8Array;
  format: number;
  major: number;
  minor: number;
  patch: number;
  flags: number;
  fileBase: number;
  reserved: Uint8Array;
  entries: GodotPckEntry[];
};

const sm63ExtrasPckEntries = [
  "res://scenes/menus/title/main_menu/main_menu.gdc",
  "res://classes/zone/trigger/death_plane/death_plane.gdc",
  "res://classes/global/singleton/singleton.gdc",
  "res://classes/solid/llr_spring/llr_spring.gd.remap",
  "res://classes/solid/llr_spring/llr_spring.gdc",
  "res://classes/solid/llr_spring/llr_spring.tscn.remap",
  "res://classes/solid/llr_conveyor/llr_conveyor.gd.remap",
  "res://classes/solid/llr_conveyor/llr_conveyor.gdc",
  "res://classes/solid/llr_conveyor/llr_conveyor.tscn.remap",
  "res://classes/solid/llr_pound_gate/llr_pound_gate.gd.remap",
  "res://classes/solid/llr_pound_gate/llr_pound_gate.gdc",
  "res://classes/solid/llr_pound_gate/llr_pound_gate.tscn.remap",
  "res://classes/solid/llr_coin_gate/llr_coin_gate.gd.remap",
  "res://classes/solid/llr_coin_gate/llr_coin_gate.gdc",
  "res://classes/solid/llr_coin_gate/llr_coin_gate.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_1.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_2.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_3.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_4.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_5.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_6.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_7.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_8.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_9.tscn.remap",
  "res://scenes/levels/llr_complete/llr_complete_10.tscn.remap"
];

function patchSm63ExtrasIntoPck(targetBuffer: ArrayBuffer, sourceBuffer: ArrayBuffer): Uint8Array {
  const target = parseGodotPck(targetBuffer);
  const source = parseGodotPck(sourceBuffer);
  const sourceEntries = new Map(source.entries.map((entry) => [entry.name, entry]));
  const compiledExtraScenes = source.entries
    .map((entry) => entry.name)
    .filter((name) => /-llr_complete_(?:[1-9]|10)\.scn$/.test(name));
  const compiledSupportScenes = source.entries
    .map((entry) => entry.name)
    .filter((name) => /-llr_(?:spring|conveyor|pound_gate|coin_gate)\.scn$/.test(name));
  const replacementNames = [...sm63ExtrasPckEntries, ...compiledExtraScenes, ...compiledSupportScenes];

  if (compiledExtraScenes.length !== 10) {
    throw new Error(`Expected 10 compiled SM63 Extras scenes, found ${compiledExtraScenes.length}`);
  }
  if (compiledSupportScenes.length !== 4) {
    throw new Error(`Expected 4 compiled SM63 support scenes, found ${compiledSupportScenes.length}`);
  }

  for (const name of replacementNames) {
    if (!sourceEntries.has(name)) {
      throw new Error(`Missing SM63 extra PCK entry: ${name}`);
    }
  }

  const seen = new Set<string>();
  const nextEntries = target.entries.map((entry) => {
    seen.add(entry.name);
    const replacement = replacementNames.includes(entry.name) ? sourceEntries.get(entry.name) : null;
    return {
      name: entry.name,
      data: replacement ? sliceGodotPckEntry(source, replacement) : sliceGodotPckEntry(target, entry),
      md5: replacement ? replacement.md5 : entry.md5,
      flags: replacement ? replacement.flags : entry.flags
    };
  });

  for (const name of replacementNames) {
    if (!seen.has(name)) {
      const replacement = sourceEntries.get(name);

      if (!replacement) {
        continue;
      }

      nextEntries.push({
        name,
        data: sliceGodotPckEntry(source, replacement),
        md5: replacement.md5,
        flags: replacement.flags
      });
    }
  }

  return buildGodotPck(target, nextEntries);
}

function parseGodotPck(buffer: ArrayBuffer): GodotPckArchive {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  if (String.fromCharCode(...bytes.slice(0, 4)) !== "GDPC") {
    throw new Error("Invalid Godot PCK magic");
  }

  let offset = 4;
  const format = view.getUint32(offset, true); offset += 4;
  const major = view.getUint32(offset, true); offset += 4;
  const minor = view.getUint32(offset, true); offset += 4;
  const patch = view.getUint32(offset, true); offset += 4;
  const flags = view.getUint32(offset, true); offset += 4;
  const fileBase = Number(view.getBigUint64(offset, true)); offset += 8;
  const reserved = bytes.slice(offset, offset + 16 * 4); offset += 16 * 4;
  const count = view.getUint32(offset, true); offset += 4;
  const decoder = new TextDecoder();
  const entries: GodotPckEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const nameLength = view.getUint32(offset, true); offset += 4;
    const nameBytes = bytes.slice(offset, offset + nameLength); offset += nameLength;
    const name = decoder.decode(nameBytes).replace(/\0+$/, "");
    const entryOffset = Number(view.getBigUint64(offset, true)); offset += 8;
    const size = Number(view.getBigUint64(offset, true)); offset += 8;
    const md5 = bytes.slice(offset, offset + 16); offset += 16;
    const entryFlags = view.getUint32(offset, true); offset += 4;
    entries.push({ name, offset: entryOffset, size, md5, flags: entryFlags });
  }

  return { bytes, format, major, minor, patch, flags, fileBase, reserved, entries };
}

function sliceGodotPckEntry(archive: GodotPckArchive, entry: GodotPckEntry): Uint8Array {
  const start = archive.fileBase + entry.offset;
  return archive.bytes.slice(start, start + entry.size);
}

function buildGodotPck(
  template: GodotPckArchive,
  entries: Array<{ name: string; data: Uint8Array; md5: Uint8Array; flags: number }>
): Uint8Array {
  const encoder = new TextEncoder();
  const align = (value: number) => Math.ceil(value / 16) * 16;
  let headerSize = 4 + 4 + 4 + 4 + 4 + 4 + 8 + 16 * 4 + 4;
  const encodedNames = entries.map((entry) => encoder.encode(`${entry.name}\0`));

  for (const name of encodedNames) {
    headerSize += 4 + name.byteLength + 8 + 8 + 16 + 4;
  }

  const fileBase = align(headerSize);
  let dataOffset = 0;
  const offsets: number[] = [];

  for (const entry of entries) {
    offsets.push(dataOffset);
    dataOffset = align(dataOffset + entry.data.byteLength);
  }

  const output = new Uint8Array(fileBase + dataOffset);
  const view = new DataView(output.buffer);
  let offset = 0;
  output.set(encoder.encode("GDPC"), offset); offset += 4;
  view.setUint32(offset, template.format, true); offset += 4;
  view.setUint32(offset, template.major, true); offset += 4;
  view.setUint32(offset, template.minor, true); offset += 4;
  view.setUint32(offset, template.patch, true); offset += 4;
  view.setUint32(offset, template.flags, true); offset += 4;
  view.setBigUint64(offset, BigInt(fileBase), true); offset += 8;
  output.set(template.reserved, offset); offset += 16 * 4;
  view.setUint32(offset, entries.length, true); offset += 4;

  entries.forEach((entry, index) => {
    const name = encodedNames[index];
    view.setUint32(offset, name.byteLength, true); offset += 4;
    output.set(name, offset); offset += name.byteLength;
    view.setBigUint64(offset, BigInt(offsets[index]), true); offset += 8;
    view.setBigUint64(offset, BigInt(entry.data.byteLength), true); offset += 8;
    output.set(entry.md5.slice(0, 16), offset); offset += 16;
    view.setUint32(offset, entry.flags, true); offset += 4;
    output.set(entry.data, fileBase + offsets[index]);
  });

  return output;
}

function safeUrlSearchParam(value: string, name: string): string {
  try {
    return new URL(value).searchParams.get(name) || "";
  } catch {
    return "";
  }
}

async function fetchCompressedGodotWasm(request: Request, env: AppEnv, origin: string): Promise<Response> {
  const wasmUrl = new URL(`${llrMarioRunPath}/godot/index.wasm.gz`, origin);
  const response = await env.ASSETS.fetch(new Request(wasmUrl, request));

  if (!response.ok) {
    return withStaticAssetHeaders(request, response);
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/wasm");
  headers.set("cache-control", cacheControlForStaticPath(`${llrMarioRunPath}/godot/index.wasm`) || "public, max-age=0, must-revalidate");
  headers.delete("content-encoding");
  headers.delete("content-length");
  const body = response.body?.pipeThrough(new DecompressionStream("gzip")) || null;

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function deleteGameAsset(request: Request, env: AppEnv, key: string): Promise<Response> {
  const auth = await requireFullAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (!isSafeGameAssetKey(key)) {
    return json({ error: "Invalid asset key" }, 400);
  }

  if (env.GAME_ASSETS && key.startsWith(gameAssetR2Prefix)) {
    await env.GAME_ASSETS.delete(key);
    return json({ ok: true });
  }

  if (env.SITE_CONFIG && key.startsWith(gameAssetKvPrefix)) {
    await env.SITE_CONFIG.delete(key);
    return json({ ok: true });
  }

  return json({ error: "Game asset storage is missing" }, 503);
}

async function readGameAssetPacks(env: AppEnv): Promise<GameAssetPack[]> {
  if (env.GAME_DB) {
    const rows = await env.GAME_DB.prepare("SELECT payload FROM game_asset_packs ORDER BY sort_order ASC, updated_at DESC").all<{ payload: string }>();
    const d1Packs = normalizeGameAssetPacks(rows.results.map((row) => parseJsonOrNull(row.payload)));

    if (d1Packs.length > 0) {
      return d1Packs;
    }
  }

  const stored = env.SITE_CONFIG ? await env.SITE_CONFIG.get(gameAssetPacksKey, "json") : null;
  const packs = normalizeGameAssetPacks(stored);
  return packs.length > 0 ? packs : defaultGameAssetPacks;
}

async function readGameLevels(env: AppEnv): Promise<GameLevel[]> {
  if (env.GAME_DB) {
    const rows = await env.GAME_DB.prepare("SELECT payload FROM game_levels ORDER BY sort_order ASC, updated_at DESC").all<{ payload: string }>();
    const d1Levels = normalizeGameLevels(rows.results.map((row) => parseJsonOrNull(row.payload)));

    if (d1Levels.length > 0) {
      return d1Levels;
    }
  }

  const stored = env.SITE_CONFIG ? await env.SITE_CONFIG.get(gameLevelsKey, "json") : null;
  const levels = normalizeGameLevels(stored);
  return levels.length > 0 ? levels : defaultGameLevels;
}

async function writeGameAssetPacks(env: AppEnv, packs: GameAssetPack[]): Promise<void> {
  if (env.GAME_DB) {
    const statements = [
      env.GAME_DB.prepare("DELETE FROM game_asset_packs"),
      ...packs.map((pack, index) => env.GAME_DB!.prepare(
        "INSERT INTO game_asset_packs (id, name, enabled, is_default, sort_order, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(pack.id, pack.name, pack.enabled ? 1 : 0, pack.default ? 1 : 0, index, JSON.stringify(pack), pack.updatedAt))
    ];
    await env.GAME_DB.batch(statements);
    return;
  }

  if (env.SITE_CONFIG) {
    await env.SITE_CONFIG.put(gameAssetPacksKey, JSON.stringify(packs));
  }
}

async function writeGameLevels(env: AppEnv, levels: GameLevel[]): Promise<void> {
  if (env.GAME_DB) {
    const statements = [
      env.GAME_DB.prepare("DELETE FROM game_levels"),
      ...levels.map((level, index) => env.GAME_DB!.prepare(
        "INSERT INTO game_levels (id, name, enabled, is_default, sort_order, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(level.id, level.name, level.enabled ? 1 : 0, level.default ? 1 : 0, index, JSON.stringify(level), level.updatedAt))
    ];
    await env.GAME_DB.batch(statements);
    return;
  }

  if (env.SITE_CONFIG) {
    await env.SITE_CONFIG.put(gameLevelsKey, JSON.stringify(levels));
  }
}

function parseJsonOrNull(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeGameAssetPacks(value: unknown): GameAssetPack[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const record = asRecord(item);
    const id = normalizeId(asString(record.id) || `asset-pack-${index + 1}`, 80);
    const rawAssets = asRecord(record.assets);
    const assets: Record<string, GameAssetRef> = {};

    for (const slot of gameAssetSlots) {
      const asset = normalizeGameAssetRef(rawAssets[slot.id]);
      if (asset) {
        assets[slot.id] = asset;
      }
    }

    return {
      id,
      name: limitText(asString(record.name) || `素材包 ${index + 1}`, 80),
      description: limitText(asString(record.description), 220),
      coverSlot: gameAssetSlots.some((slot) => slot.id === asString(record.coverSlot)) ? asString(record.coverSlot) : "ui.cover",
      enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      builtin: typeof record.builtin === "boolean" ? record.builtin : false,
      default: typeof record.default === "boolean" ? record.default : index === 0,
      assets,
      updatedAt: limitText(asString(record.updatedAt), 40) || new Date().toISOString()
    };
  }).filter((pack) => pack.id);
}

function normalizeGameAssetRef(value: unknown): GameAssetRef | null {
  const record = asRecord(value);
  const key = limitText(asString(record.key), 220);

  if (!isSafeGameAssetKey(key)) {
    return null;
  }

  return {
    key,
    url: `/api/game/assets/${encodeURIComponent(key)}`,
    contentType: limitText(asString(record.contentType), 80),
    size: clampNumber(record.size, 0, 20 * 1024 * 1024, 0),
    updatedAt: limitText(asString(record.updatedAt), 40) || new Date().toISOString()
  };
}

function normalizeGameLevels(value: unknown): GameLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const record = asRecord(item);
    const fallback = defaultGameLevels[index] || defaultGameLevels[0];
    const objects = Array.isArray(record.objects)
      ? record.objects.map((object, objectIndex) => normalizeGameLevelObject(object, objectIndex)).filter((object): object is GameLevelObject => Boolean(object))
      : fallback.objects;

    return {
      id: normalizeId(asString(record.id) || `level-${String(index + 1).padStart(2, "0")}`, 80),
      name: limitText(asString(record.name) || fallback.name, 80),
      description: limitText(asString(record.description) || fallback.description, 260),
      difficulty: limitText(asString(record.difficulty) || fallback.difficulty, 40),
      theme: normalizeGameTheme(asString(record.theme), fallback.theme),
      enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      builtin: typeof record.builtin === "boolean" ? record.builtin : false,
      default: typeof record.default === "boolean" ? record.default : index === 0,
      width: clampNumber(record.width, 1600, 20000, fallback.width),
      height: clampNumber(record.height, 320, 1600, fallback.height),
      checkpoints: normalizeGameCheckpoints(record.checkpoints, fallback.checkpoints),
      segments: normalizeStringList(record.segments, 12, 40).length ? normalizeStringList(record.segments, 12, 40) : fallback.segments,
      objects: objects.slice(0, 1200),
      designerCode: normalizeDesignerLevelCode(asString(record.designerCode)) || undefined,
      designerSource: asString(record.designerSource) === "sm63-redux" ? "sm63-redux" : undefined,
      visibility: asString(record.visibility) === "public" ? "public" : undefined,
      updatedAt: limitText(asString(record.updatedAt), 40) || new Date().toISOString()
    };
  });
}

function normalizeDesignerLevelCode(value: string): string {
  const trimmed = value.trim();
  return /^[A-Za-z0-9+/=_-]{16,500000}$/.test(trimmed) ? trimmed : "";
}

function normalizeGameLevelObject(value: unknown, index: number): GameLevelObject | null {
  const record = asRecord(value);
  const type = normalizeGameObjectType(asString(record.type));

  if (!type) {
    return null;
  }

  return {
    id: normalizeId(asString(record.id) || `object-${index + 1}`, 80),
    type,
    x: clampNumber(record.x, 0, 20000, 0),
    y: clampNumber(record.y, 0, 1600, 0),
    width: typeof record.width === "undefined" ? undefined : clampNumber(record.width, 1, 20000, 32),
    height: typeof record.height === "undefined" ? undefined : clampNumber(record.height, 1, 1600, 32),
    value: limitText(asString(record.value), 120)
  };
}

function normalizeGameCheckpoints(value: unknown, fallback: { x: number; y: number }[]): { x: number; y: number }[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const checkpoints = value.map((item) => {
    const record = asRecord(item);
    return {
      x: clampNumber(record.x, 0, 20000, 0),
      y: clampNumber(record.y, 0, 1600, 416)
    };
  });

  return checkpoints.length ? checkpoints.slice(0, 20) : fallback;
}

function normalizeGameTheme(value: string, fallback: GameLevel["theme"]): GameLevel["theme"] {
  const allowed: Array<GameLevel["theme"]> = ["grass", "pipe", "underground", "sky", "forest", "mushroom", "ice", "night", "castle", "boss"];
  return allowed.includes(value as GameLevel["theme"]) ? (value as GameLevel["theme"]) : fallback;
}

function normalizeGameObjectType(value: string): string {
  return /^[a-z0-9_.-]{1,80}$/i.test(value) ? value : "";
}

function normalizeId(value: string, maxLength: number): string {
  return limitText(value, maxLength).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function toPublicGameAssetPack(pack: GameAssetPack): GameAssetPack {
  return {
    ...pack,
    assets: Object.fromEntries(Object.entries(pack.assets).map(([slotId, asset]) => [slotId, { ...asset, url: `/api/game/assets/${encodeURIComponent(asset.key)}` }]))
  };
}

function assetExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "application/octet-stream": "pck",
    "application/x-godot-pack": "pck",
    "application/x-pck": "pck"
  };
  return map[contentType] || "bin";
}

function isSafeGameAssetKey(key: string): boolean {
  return /^(game-assets|game-assets-kv)\/[a-f0-9-]{36}\/[a-z0-9_.-]+\.(?:png|jpg|webp|gif|mp3|ogg|wav|pck)$/i.test(key);
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

  return !revalidatingStaticAssetExtensions.test(path);
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

function normalizeInternalPath(value: string): string {
  const path = value.trim().replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
  const cleaned = path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.replace(/[^\p{Letter}\p{Number}_-]/gu, ""))
    .filter(Boolean)
    .join("/");
  return cleaned ? `/${cleaned.toLowerCase()}` : "";
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

async function shortHash(value: string): Promise<string> {
  const hash = await sha256(value);
  return [...hash].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });
}

async function conditionalJson(request: Request, payload: unknown): Promise<Response> {
  const body = JSON.stringify(payload);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)));
  const hash = [...digest.slice(0, 12)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const etag = `W/"${hash}"`;
  const headers = new Headers(jsonHeaders);
  headers.set("cache-control", "private, no-cache, must-revalidate");
  headers.set("etag", etag);

  if (request.headers.get("if-none-match")?.split(",").some((value) => {
    const candidate = value.trim();
    return candidate === "*" || candidate === etag;
  })) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = apiRoutes[url.pathname];

    if (route) {
      return route(request, env as AppEnv);
    }

    if (url.pathname.startsWith("/api/game/assets/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/game/assets/".length));
      return fetchGameAsset(request, env as AppEnv, key);
    }

    if (url.pathname.startsWith(siteMediaPathPrefix)) {
      const fileName = decodeURIComponent(url.pathname.slice(siteMediaPathPrefix.length));
      return fetchSiteMedia(request, env as AppEnv, fileName);
    }

    if (url.pathname === "/api/admin/game/assets" && request.method === "POST") {
      return handleGameAssetUpload(request, env as AppEnv);
    }

    if (url.pathname === "/api/admin/game/asset-packs") {
      return handleAdminGameAssetPacks(request, env as AppEnv);
    }

    if (url.pathname === "/api/admin/game/levels") {
      return handleAdminGameLevels(request, env as AppEnv);
    }

    if (url.pathname.startsWith("/api/admin/game/assets/") && request.method === "DELETE") {
      const key = decodeURIComponent(url.pathname.slice("/api/admin/game/assets/".length));
      return deleteGameAsset(request, env as AppEnv, key);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found", path: url.pathname }, 404);
    }

    if (url.pathname === cubeCityPath) {
      return Response.redirect(new URL(`${cubeCityPath}/`, url.origin).toString(), 308);
    }

    if (url.pathname === llrMarioRunPath) {
      return Response.redirect(new URL(`${llrMarioRunPath}/`, url.origin).toString(), 308);
    }

    if (url.pathname === `${llrMarioRunPath}/godot/index.pck`) {
      const customGamePack = await fetchGodotGamePack(request, env as AppEnv);

      if (customGamePack) {
        return customGamePack;
      }
    }

    if (url.pathname === `${llrMarioRunPath}/godot/index.wasm`) {
      return fetchCompressedGodotWasm(request, env as AppEnv, url.origin);
    }

    ctx.waitUntil(recordAccessLog(request, env as AppEnv));

    return fetchStaticAsset(request, env as AppEnv);
  }
} satisfies ExportedHandler<Env>;
