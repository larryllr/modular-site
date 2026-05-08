# Cloudflare Modular Site

一个可部署到 Cloudflare Workers 的模块化网站骨架。静态前端由 Workers Static Assets 托管，`/api/*` 请求先进入 Worker，适合逐步加入仪表盘、表单、数据查询、AI 功能或后台管理能力。

## 目录

- `public/`：前端页面、样式和浏览器端功能模块。
- `public/modules/manifest.js`：前端模块注册表。
- `public/modules/*.js`：独立功能模块。
- `src/index.ts`：Cloudflare Worker API 路由。
- `wrangler.jsonc`：Cloudflare 部署配置。

## 本地运行

```bash
npm install
npm run dev
```

## 部署

```bash
npm run deploy
```

第一次部署会打开 Cloudflare 登录授权。按浏览器提示登录后，Wrangler 会把 Worker 和静态文件发布到 Cloudflare。

## 上传到 GitHub

本机已经安装 GitHub CLI。网络可以访问 GitHub 登录接口后，在项目目录运行：

```bash
gh auth login
gh repo create cloudflare-modular-site --private --source . --remote origin --push
```

如果想公开仓库，把 `--private` 改成 `--public`。

## 添加前端功能模块

1. 在 `public/modules/` 新建一个模块文件，例如 `tasks.js`。
2. 默认导出一个包含 `id`、`name`、`category`、`description`、`mount(ctx)` 的对象。
3. 在 `public/modules/manifest.js` 里添加 loader。

示例：

```js
export default {
  id: "tasks",
  name: "任务",
  category: "workflow",
  description: "任务列表模块",
  defaultEnabled: true,
  mount() {
    const el = document.createElement("section");
    el.className = "module-panel";
    el.innerHTML = "<h2>任务</h2>";
    return el;
  }
};
```

## 添加服务端 API

在 `src/index.ts` 的 `apiRoutes` 中注册新路由即可。路径以 `/api/` 开头时会优先进入 Worker。
