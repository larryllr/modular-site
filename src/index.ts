type ModuleStatus = "active" | "planned";

type ServerModule = {
  id: string;
  name: string;
  category: string;
  status: ModuleStatus;
  description: string;
  endpoints: string[];
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
    id: "modules",
    name: "模块注册",
    category: "system",
    status: "active",
    description: "返回服务端模块清单，前端可用于展示能力地图。",
    endpoints: ["/api/modules"]
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

type ApiRoute = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response;

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

  "/api/echo": async (request) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Expected a JSON request body" }, 400);
    }

    return json({
      received: body,
      timestamp: new Date().toISOString()
    });
  }
};

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
      return route(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found", path: url.pathname }, 404);
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
