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

后台配置保存在 Cloudflare Workers KV。正式部署前需要创建 KV 命名空间，并把返回的 `id` 填到 `wrangler.jsonc` 的 `kv_namespaces`：

```bash
npm run types
npm run wrangler -- kv namespace create SITE_CONFIG
```

本地开发会使用 Wrangler 的本地 KV 模拟，所以不填 `id` 也可以先预览。

## 管理员后台

- 访问 `/admin` 进入管理员界面。
- 默认管理员密码：`llr20081209`。
- 登录页不会显示默认密码，避免把密码直接暴露在界面上。
- 管理员界面可以新增分页面、修改页面标题和说明、设置网址后缀、控制是否在主页显示入口、为页面勾选系统模块、添加自定义文本模块。
- 管理员界面现在是预览式编辑：在页面预览中插入系统模块、文本模块和图片模块，并用上移/下移控制它们在分页面里的位置。
- 图片模块支持粘贴图片地址或上传本地图片；可以选择正常图片显示，也可以作为背景图片显示。
- 每个分页面的主页入口卡片可以自定义入口标题、说明、卡片背景、小方块文字和小方块背景。
- 评论模块支持免登录发言，访客可自定义名字；前台会显示评论 IP 和发布时间。管理员可以删除单条评论或清空当前分页面全部评论。
- 评论区既可以作为页面片段插入任意位置，也可以在分页面底部固定展示。
- `/` 是默认主页，会自动显示所有启用分页面的入口。
- 每个分页面通过自己的后缀进入，例如后缀是 `workspace`，访问路径就是 `/workspace`。

修改管理员密码建议使用 Cloudflare secret。线上运行：

```bash
npm run wrangler -- secret put admin
```

本地开发可以新建 `.dev.vars`：

```bash
admin="你的新密码"
```

不要把真实密码提交到 GitHub；仓库里只保留了 `.dev.vars.example` 作为示例。

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
