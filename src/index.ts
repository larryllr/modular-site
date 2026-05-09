type ModuleStatus = "active" | "planned";

type AppEnv = Env & {
  SITE_CONFIG?: KVNamespace;
  admin?: string;
  ADMIN_PASSWORD?: string;
};

type ServerModule = {
  id: string;
  name: string;
  category: string;
  status: ModuleStatus;
  description: string;
  endpoints: string[];
};

type ContentBlock = {
  id: string;
  type: "text";
  icon: string;
  title: string;
  description: string;
  body: string;
};

type SystemSection = {
  id: string;
  type: "system";
  moduleId: string;
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
};

type PageSection = SystemSection | ContentBlock | ImageSection;

type SitePage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  visible: boolean;
  modules: string[];
  blocks: ContentBlock[];
  sections: PageSection[];
};

type SiteConfig = {
  version: 1;
  updatedAt: string;
  homeTitle: string;
  homeDescription: string;
  pages: SitePage[];
};

type TokenPayload = {
  sub: "admin";
  exp: number;
};

type ApiRoute = (request: Request, env: AppEnv) => Promise<Response> | Response;

const configKey = "site-config";
const defaultAdminPassword = "llr20081209";
const tokenMaxAgeMs = 12 * 60 * 60 * 1000;

const defaultSiteConfig: SiteConfig = {
  version: 1,
  updatedAt: "2026-05-09T00:00:00.000Z",
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
    endpoints: ["/api/admin/login", "/api/admin/config"]
  },
  {
    id: "echo",
    name: "数据回显",
    category: "tools",
    status: "active",
    description: "接收 JSON 并原样返回，适合验证表单和 API 调用。",
    endpoints: ["/api/echo"]
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
      config: await readSiteConfig(env)
    }),

  "/api/admin/login": async (request, env) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const password = asString(body.password);
    const isValid = await verifyPassword(password, getAdminPassword(env));

    if (!isValid) {
      return json({ error: "管理员密码不正确" }, 401);
    }

    return json({
      token: await createAdminToken(env),
      config: await readSiteConfig(env)
    });
  },

  "/api/admin/config": async (request, env) => {
    const auth = await requireAdmin(request, env);

    if (auth) {
      return auth;
    }

    if (request.method === "GET") {
      return json({
        config: await readSiteConfig(env)
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = asRecord(await readJson(request));
    const config = normalizeSiteConfig(body.config);

    if (!env.SITE_CONFIG) {
      return json({ error: "SITE_CONFIG KV binding is missing" }, 503);
    }

    await env.SITE_CONFIG.put(configKey, JSON.stringify(config));

    return json({
      ok: true,
      config
    });
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

function normalizeSiteConfig(value: unknown): SiteConfig {
  const source = asRecord(value);
  const usedSlugs = new Set<string>();
  const rawPages = Array.isArray(source.pages) ? source.pages : defaultSiteConfig.pages;

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

    return {
      id: asString(record.id) || crypto.randomUUID(),
      slug,
      title: limitText(asString(record.title) || `分页面 ${index + 1}`, 80),
      description: limitText(asString(record.description), 220),
      visible: typeof record.visible === "boolean" ? record.visible : true,
      modules: [...new Set(modules)],
      blocks,
      sections
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
    pages
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
          moduleId
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
      fit: asString(record.fit) === "contain" ? "contain" : "cover"
    };
  }

  return normalizeBlock(value, index);
}

function normalizeBlock(value: unknown, index: number): ContentBlock {
  const record = asRecord(value);

  return {
    id: asString(record.id) || crypto.randomUUID(),
    type: "text",
    icon: limitText(asString(record.icon) || "TX", 3).toUpperCase(),
    title: limitText(asString(record.title) || `文本模块 ${index + 1}`, 80),
    description: limitText(asString(record.description), 160),
    body: limitText(asString(record.body), 1200)
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

function getAdminPassword(env: AppEnv): string {
  return env.admin || env.ADMIN_PASSWORD || defaultAdminPassword;
}

async function verifyPassword(input: string, expected: string): Promise<boolean> {
  const [inputHash, expectedHash] = await Promise.all([sha256(input), sha256(expected)]);

  return timingSafeEqual(inputHash, expectedHash);
}

async function createAdminToken(env: AppEnv): Promise<string> {
  const payload: TokenPayload = {
    sub: "admin",
    exp: Date.now() + tokenMaxAgeMs
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, getAdminPassword(env));

  return `${encodedPayload}.${signature}`;
}

async function requireAdmin(request: Request, env: AppEnv): Promise<Response | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const isValid = await verifyAdminToken(token, env);

  return isValid ? null : json({ error: "需要管理员登录" }, 401);
}

async function verifyAdminToken(token: string, env: AppEnv): Promise<boolean> {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expected = await sign(encodedPayload, getAdminPassword(env));

  if (!timingSafeEqual(base64UrlDecodeToBytes(signature), base64UrlDecodeToBytes(expected))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecodeToText(encodedPayload)) as Partial<TokenPayload>;

    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
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
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = apiRoutes[url.pathname];

    if (route) {
      return route(request, env as AppEnv);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found", path: url.pathname }, 404);
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
