# 项目交接说明

更新时间：2026-06-06

## 新对话启动语

在新的 Codex 对话中发送：

> 请先阅读项目根目录的 HANDOFF.md 和 README.md，再查看 git status 与最近提交。继续维护这个项目；每次改动都需要检查、部署到 Cloudflare，并通过本机 10808 代理推送 GitHub。

## 项目信息

- 项目目录：`C:\Users\宽宽\Documents\Codex\2026-05-08\cloudflare`
- GitHub：`https://github.com/larryllr/modular-site`
- 正式域名：`https://neyc.de5.net`
- Worker 预览地址：`https://cloudflare-modular-site.2089151168.workers.dev`
- 当前分支：`main`
- 最新提交：集成 CubeCity 后以 `git log -1 --oneline` 为准
- 最新 Cloudflare Version ID：`30b40c63-46a9-4a65-9038-b82e2c52ace9`
- 管理后台：`/admin`
- 默认完整管理员密码：`admin`
- 网站配置与内容主要保存在 Cloudflare KV `SITE_CONFIG`

不要在界面显示默认密码，也不要把真实密码或本地 `.dev.vars` 提交到 GitHub。

## 技术结构

- `src/index.ts`：Cloudflare Worker、API、配置清洗与持久化。
- `public/app.js`：主要前端、管理员编辑器、博客、评论和模块逻辑。
- `public/styles.css`：全站样式和响应式布局。
- `public/modules/`：内置工具模块。
- `client/`：Electron 本地客户端。
- `wrangler.jsonc`：Cloudflare 配置。

项目没有前端框架，主要使用原生 JavaScript、HTML、CSS 和 TypeScript Worker。

## 必须遵守的发布流程

每次功能修改完成后执行：

```powershell
node --check public/app.js
npm run check
git diff --check
npm run deploy
git add <修改的文件>
git commit -m "简洁的英文提交说明"
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
git push
git status --short
```

Cloudflare 部署成功后记录 Version ID。GitHub 必须使用本机 `10808` HTTP 代理。

若 Wrangler 已完成部署但进程卡在遥测请求，后续部署可临时清除
`HTTP_PROXY`/`HTTPS_PROXY` 并设置 `WRANGLER_SEND_METRICS=false`；GitHub 推送时再恢复
`10808` 代理。

## 当前主要功能

- 模块化主页与分页面，侧边栏导航。
- 管理员预览式编辑、撤销、保存、模块折叠、移动、尺寸和锁定。
- 完整管理员与 limited 管理员权限；完整管理员可以锁定页面或模块。
- 分页面密码保护。
- 图片、视频、文本、系统工具、评论、网站入口、文章入口等模块。
- 分页面背景、主页入口和侧边栏图标可分别配置。
- 评论发布、IP/时间/设备展示、编辑、删除、清空和屏蔽词。
- 访问日志、违规评论日志和公告。
- 博客分页面、文章分类、标签、封面、富文本正文、作者信息、评论和文章排序。
- 手机端侧边栏不固定。
- 首页与分页面支持不同列数布局。
- `/llrgamecubecity` 提供全屏 CubeCity 小游戏。
- 主页和侧边栏默认显示“放松一下”入口，完整管理员可隐藏或自定义入口背景和图标。
- CubeCity 默认使用简体中文，右上角仍保留中英文切换。
- 普通分页面只有一个实际可见模块时进入沉浸模式：隐藏侧边栏、页面标题和状态栏，模块铺满视口且不显示卡片边框。

“传输模块”已经从网页模块新增入口和配置清洗中移除。不要重新加入，除非用户明确要求。本地 Electron 客户端代码暂时保留。

## CubeCity 集成

- 上游项目：`https://github.com/hexianWeb/CubeCity`
- 固定版本：`0191f5170872382954c15b7316f2e34d020d6d49`
- 本地源码：`vendor/cubecity/`
- 构建产物：`public/llrgamecubecity/`
- 默认入口图片：`public/llrgamecubecity-entry.webp`
- 上游 MIT 许可证保留在 `vendor/cubecity/LICENSE`
- 本地调整包括子路径构建、音频路径适配、默认中文和缺失中文词条补齐。
- `npm run deploy` 会先执行 `npm run build:cubecity`
- 新环境首次构建前需要安装游戏依赖：

```powershell
npm install --prefix vendor/cubecity --ignore-scripts --legacy-peer-deps --registry=https://registry.npmmirror.com
```

## 最近完成的博客修复

1. 文章正文的 `bodyHtml` 已由 Worker 持久化，内嵌图片不会只剩文件名。
2. 富文本换行会在发布后保留。
3. 文章模块可以通过文章路径同步标题、摘要和封面。
4. 博客默认展示全部文章。
5. 已发布文章支持编辑和拖拽排序。
6. 管理后台文章列表默认折叠，展开时才创建富文本编辑器，减少卡顿。
7. 图片上传不再触发整个管理员页面重新渲染。
8. 删除文章前会二次确认。
9. 富文本工具栏会保存并恢复正文选区。
10. 粗体、斜体、下划线、标题、引用和列表启用时显示蓝底白字。

## 重要实现注意

- 不要在输入每个字符时调用 `renderAdminEditor()`，这会导致页面跳到顶部、输入焦点丢失和明显卡顿。
- 普通字段应直接修改内存配置，并通过 `setSaveBarStatus()` 更新保存状态。
- 只有新增、删除或需要重建结构时才重新渲染。
- 图片通过 Data URL 保存，Worker 对博客 `bodyHtml` 有较大的长度限制。修改清洗逻辑时不要再次截断文章图片。
- 博客文章编辑器使用 `contenteditable` 和 `document.execCommand`。工具按钮必须在执行命令前恢复保存的 Selection Range。
- limited 管理员不能编辑由 admin 发布的文章，也不能编辑被 admin 锁定的页面或模块。
- 配置加载和服务端清洗都要兼容旧数据，避免已部署内容消失。
- 页面整体保持简洁白色，不使用黄底。

## 可能继续优化的方向

- 在真实浏览器中重点回归富文本标题、引用、列表和连续编辑。
- 继续减少管理员页面中的整页 `renderAdminEditor()` 调用。
- 大量 Base64 图片会增加 KV 配置体积，未来可迁移到 Cloudflare R2。
- 对博客编辑器增加草稿自动保存和离开页面提示。
- 对访问日志和评论列表增加分页，避免数据多时一次渲染过重。

## 当前工作区状态

创建本文件前代码工作区是干净的。`HANDOFF.md` 是本次新增文件，需要提交并推送后才会同步到 GitHub。
