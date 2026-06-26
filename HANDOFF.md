# 项目交接说明

更新时间：2026-06-25

## 新对话启动语

在新的 Codex 对话中发送：

> 请先阅读项目根目录的 HANDOFF.md 和 README.md，再查看 git status 与最近提交。继续维护这个项目；每次改动都需要检查、部署到 Cloudflare，并通过本机 10808 代理推送 GitHub。

## 项目信息

- 项目目录：`C:\Users\宽宽\Documents\Codex\2026-05-08\cloudflare`
- GitHub：`https://github.com/larryllr/modular-site`
- 正式域名：`https://neyc.de5.net`
- Worker 预览地址：`https://cloudflare-modular-site.2089151168.workers.dev`
- 当前分支：`main`
- 最新提交：以 `git log -1 --oneline` 为准
- 最新 Cloudflare Version ID：`cf8f17a4-348c-452f-846e-61baf4bf2c28`
- 管理后台：`/admin`
- 默认完整管理员密码：`admin`
- 网站配置与内容主要保存在 Cloudflare KV `SITE_CONFIG`
- `/llr-mariorun` 最新方案按用户要求不使用 R2：D1 数据库 `llr-mariorun-db`（binding `GAME_DB`，database_id `d4ddc5c7-36ac-472f-95c3-f86c831f97f6`）保存素材包和关卡元数据；后台上传的图片、音频、PCK 暂存入 `SITE_CONFIG` KV 的 `game-assets-kv/` 前缀；Godot 默认 Web 产物随 Workers Assets 部署。D1 迁移文件在 `migrations/0001_llr_mariorun_metadata.sql`，远端和本地均已应用。

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
- `/llr-mariorun` 提供“老师大冒险”Godot Web 游戏入口：页面嵌入 SM63 Redux 风格 Godot 导出壳，默认 `index.wasm` 因 Cloudflare Workers Assets 单文件限制改为保存 `index.wasm.gz`，Worker 对 `/llr-mariorun/godot/index.wasm` 动态解压返回；`public/llr-mariorun/godot/index.js` 也加入浏览器端 gzip 魔数兜底解压。开始前页面显示桌面键位提示，手机端叠加虚拟摇杆和动作键，并在竖屏浏览器中强制横向显示舞台。后台可编辑素材包和游戏数据 JSON，上传主角、怪物、蘑菇、Boss、公主、背景、音频和 `game.bundle.pck` 等素材槽；每个槽位都能从后台下载当前素材。若 D1 中默认素材包配置了 `game.bundle.pck`，Worker 会用后台上传的 PCK 覆盖默认 `/llr-mariorun/godot/index.pck`。PCK 上传大小暂限 20MB；JSON 只保存素材包清单、素材引用和游戏数据，不建议直接塞完整大包。
- 2026-06-25 晚修复 `/llr-mariorun` 移动端体验：移动/下蹲由按钮改为虚拟摇杆，动作键匹配 Godot 项目的真实输入（跳跃 ArrowUp、旋转 X、喷水 C、砸地/交互 Z），禁用手机长按选中文本和系统菜单；“横屏全屏”按钮会先全屏根节点再尝试 `screen.orientation.lock("landscape-primary")`，失败再尝试 `landscape`，最后用 `.is-forced-landscape` CSS 继续强制横屏显示。Godot 内页 `lang/title/GODOT_CONFIG.locale` 默认中文 `zh_CN`。后台“素材在线编辑”就是管理后台老师大冒险素材包区；游戏内已有关卡编辑能力，站外自定义关卡设计/试玩页已移除，后台只负责保存、导入和导出游戏数据 JSON。
- 2026-06-24 深夜补齐开始前选择：`/llr-mariorun/` 的 Godot iframe 初始为 `about:blank`，页面先展示“开始前选择”区，用户选择素材包和关卡后再启动 Godot iframe，并把 `pack`/`level`/`locale=zh_CN` 写入 URL。Worker 返回 `/llr-mariorun/godot/index.pck` 时会读取 iframe Referer 的 `pack` 参数，优先用该素材包里的 `game.bundle.pck`；没有自定义 PCK 时回退默认包。
- 2026-06-25 移动端浏览器烟测修复：手机视口下启动前“开始前选择”面板不能隐藏，否则 iframe 仍是 `about:blank` 会看起来空屏；现在只在用户点击“开始完整游戏”后给 `body` 加 `game-has-launched` 并隐藏面板。外部 `custom.html`/`game.js` 试玩引擎已删除，避免和游戏内关卡编辑重复。
- 2026-06-24 用户要求改用 `Redux-Team/Legacy_SM63Redux` 作为更完整的游戏基础。已在本地临时克隆并验证：上游 HEAD `cde0b9e748d3c7c0827eff644120aae027dfb80c`，Godot 4.3 工程，存在 Web export preset，临时工具链位于 `%TEMP%\godot-4.3-tools`，可导出 Web 产物到 `%TEMP%\sm63redux-web-export`。不要提交 `vendor/Legacy_SM63Redux/`，该目录已加入 `.gitignore`。原始导出会打包 Mario/Nintendo 风格素材，不应直接公开部署；下一步应做 Godot `AssetOverrides` autoload，从 `/api/game/manifest` 读取管理员上传素材后再生成去品牌/可替换构建。后台素材槽已扩展 SM63 专用整图槽：`sm63.player.sheet`、`sm63.enemy.goomba.walk`、`sm63.enemy.koopa.walk`、`sm63.pickup.coins`、`sm63.terrain.jungle`、`sm63.audio.title` 等。
- 主页和侧边栏默认显示“放松一下”入口，完整管理员可隐藏或自定义入口背景和图标。
- CubeCity 默认使用简体中文，右上角仍保留中英文切换。
- 普通分页面只有一个实际可见模块时进入沉浸模式：隐藏侧边栏、页面标题和状态栏，模块铺满视口且不显示卡片边框。
- 导航模块支持管理员维护名称和网址、排序及删除；前台自动获取目标网站 favicon，单模块时铺满页面多列展示，多模块时使用独立可滚动卡片，手机端为单列。
- 导航模块顶部显示无文字的整宽鲜艳渐变磁贴，并根据模块 ID 稳定分配不同配色。
- 管理员配置保存优先使用带 `updatedAt` 冲突校验的增量补丁；普通字段修改不再上传和下载约 3.15 MiB 的完整配置。补丁应用层请求上限为 `100 MB`，Worker 最终仍整值写入 KV。
- 管理后台分页面入口编辑已改为现代化简洁界面：入口卡片标题和说明可直接在预览卡内编辑，图片控件不再显示 Base64 长串，侧边栏/密码/评论管理默认折叠。
- 带背景图的入口卡片在管理员预览编辑时，标题和说明输入框强制使用浅底深色字，避免白底白字看不清。
- 已登录管理员在前台普通页面的评论区也可以直接编辑或删除评论，无需进入管理后台；访客不会看到这些操作。
- 带背景图的多模块分页面会柔化背景，模块使用半透明卡片并统一等宽等高紧凑排列；桌面端高度随视口在 220-280px 间调整，手机端统一 220px，超出内容在卡片内部滚动。
- 每个分页面可开启“每日自动背景”：Worker 从 Bing 首页图片接口获取当天图片，优先 UHD、失败回退 1920，并通过本站同源端点缓存返回；前端不再阻塞首屏，先显示页面，再通过 `requestIdleCallback`/`setTimeout` 后加载和解码每日背景，成功后只替换 `.workspace` 背景 CSS，不再重新渲染整站；失败或 1.2 秒超时则使用手动背景。
- 每日自动背景只在 KV 中保存开关，不保存图片数据；Bing 接口不是正式公开 API，且图片可能存在仅限桌面壁纸的授权提示。
- 普通多模块分页面的模块卡片支持点击三态循环：第一次展开为整行，第二次全屏覆盖视口，第三次恢复默认；滑动/拖动超过 10px、页面或卡片滚动、按钮/输入框/链接/音视频等交互控件不会触发状态切换，`Enter`/空格可键盘切换，`Escape` 恢复默认。
- 2026-06-25 修复博客文章更新后需要清除网站数据才显示的问题：所有 API fetch 显式 `cache: "no-store"`；管理员保存配置成功后会清理 `sessionStorage` 中的分页面解锁缓存，避免受密码保护的博客页继续渲染旧文章数据。
- 2026-06-25 修复 `/llr-mariorun` 启动器残留关卡选择：开始前只选择素材包，不再向 Godot iframe URL 写入 `level` 参数，Story Mode 和关卡流程完全交给游戏内自带系统。启动区和游戏工具栏都提供“重置游戏存档”，用于清理 Godot Web 的 IndexedDB/IDBFS 本地存档，处理 Story Mode 读到坏进度后黑屏卡住的情况。
- 2026-06-25 调整 `/llr-mariorun` 素材在线编辑入口：游戏页只在检测到完整管理员 token 且 `/api/admin/game` 校验成功后显示“素材在线编辑”；普通 `/admin` 不再默认显示老师大冒险素材编辑器，只有从游戏页进入 `/admin?game=llr-mariorun` 时才显示该编辑器。
- 2026-06-25 针对 Story Mode 第四场景偶发黑屏/摇杆失效增强外层容错：虚拟摇杆方向同时发送方向键和 WASD；按住摇杆时每 140ms 重发 keydown 并重新聚焦 Godot canvas，降低 iframe/Godot 场景切换后输入状态丢失概率；iframe load、页面失焦和隐藏时释放虚拟输入；Godot canvas 监听 `webglcontextlost`/`webglcontextrestored` 并提示重载或重置存档。
- 2026-06-25 调低 `/llr-mariorun` 摇杆上下方向灵敏度：左右触发阈值保持 `0.28 * 半径`，上下触发阈值提高到 `0.48 * 半径`，减少误触跳跃/下蹲。
- 2026-06-25 针对用户截图中的 `/llr-mariorun` 黑屏卡死继续修复：不再把根因归到摇杆，改为外层运行时恢复。工具栏按钮改为“恢复/重载”，点击后先把 iframe 置为 `about:blank`，再带 `run=Date.now()` 重建 Godot iframe；`webglcontextlost` 和退出全屏后也会自动走同一套恢复流程。顶部状态文案缩短，移动端工具栏允许换行并缩小按钮，避免覆盖游戏 HUD。
- 2026-06-25 根据用户上传的老师头像生成“老师默认版”素材：本地输出位于 `output/teacher-pack/`，包括 `teacher-sprite-sheet-green.png`、透明 `teacher-sprite-sheet.png`、兼容原 atlas 的 `mario_sheet.teacher.png` 和完整导出的 `game.bundle.pck`。已通过 Wrangler 将 PCK 上传到 `SITE_CONFIG` KV，并在 D1 `game_asset_packs` 中写入默认素材包 `teacher-default`；线上 `/api/game/manifest` 默认返回该包，`/llr-mariorun/godot/index.pck` 在 `pack=teacher-default` Referer 下返回 9,505,856 字节的老师版 PCK。生成方式是保留原 `player.tscn` atlas 坐标，把老师动作帧缩放贴进原 `mario_sheet.png` 布局；砸地相关帧使用戒尺下砸动作。
- 2026-06-25 用户反馈 AI 抠绿版人物无站立、戒尺不明显、缩放漂移和黑斑后，已改成确定性 SVG/Sharp 生成稳定 atlas，不再依赖抠绿图。线上 D1 素材包现为 3 个：`original`/“原版”（默认，assets 为空，回退站点自带 `public/llr-mariorun/godot/index.pck`，线上验证返回 9,326,176 字节）、`liushuo`/“刘硕版”（大头、眼镜、手持戒尺，砸地戒尺下砸，喷水键改为背身喷水而非尿尿，PCK 9,418,592 字节）、`guoliang`/“郭亮版”（圆脑袋、圆肚子西装，跑动肚子轻微上下晃，砸地倒立，PCK 9,418,688 字节）。本地产物位于 `output/stable-character-packs/`，KV keys 记录在 `output/stable-character-packs/keys/`。线上验证已确认 `/api/game/manifest` 默认 `original`，`pack=liushuo`/`pack=guoliang` 的 `/llr-mariorun/godot/index.pck` 均返回对应大小。不要再把旧 `teacher-default` 设为唯一包。
- 2026-06-25 修复“选择任何 PCK 开始后仍是发布前版本”：根因是 iframe 虽带 `pack`，但 Godot 内部仍请求同一路径 `index.pck`，移动浏览器/缓存可能复用旧 PCK。现在开始游戏每次带 `run=Date.now()`，Godot HTML 拦截 `index.pck` fetch 并追加 `pack/run` 且 `cache: no-store`；Worker 的 `/llr-mariorun/godot/index.pck` 优先读取 URL query 的 `pack`，自定义 PCK 响应头强制 `cache-control: no-store, max-age=0` 和 `x-llr-pack-id`。线上验证：`original` 9,326,176 bytes，`liushuo` 9,418,592 bytes，`guoliang` 9,418,688 bytes。
- 2026-06-25 用户指出两位老师 v1/v2 “动作不连贯、太丑”，并要求必须像原版，只加人物特点和服装。`tools/generate-teacher-sprites.mjs` 已改成以 `output/stable-character-packs/mario_sheet.original.png` 为唯一种子：沿用原版动作、帧布局和脚底/头顶安全范围，不再自创 Q 版。v4 去掉帽子视觉，把帽子区域改为头发；刘硕强化黑发、圆眼镜、服装和戒尺；郭亮强化方眼镜、西装和特大号肚子。尺寸验证：`liushuo`/`guoliang` 全部 100 帧 `unsafe_frames=0`，避免脚陷地和跳跃头裁切。线上 KV 已覆盖原 key：`liushuo` PCK 9,322,451 bytes、预览 PNG 24,212 bytes；`guoliang` PCK 9,319,347 bytes、预览 PNG 19,285 bytes。Worker 的素材 size normalize 上限从 8MB 调到 20MB，避免 manifest 把 PCK size 截断成 8,388,608。

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
- `/api/admin/config-patch` 只返回保存元数据；`404/405` 才回退旧整包接口，`409` 必须提示重新加载，不能绕过版本冲突保护。
- 页面整体保持简洁白色，不使用黄底。
- 自动背景加载最多等待 1.2 秒，且不能阻塞首屏显示。不要移除手动背景回退，也不要让远程图片错误阻塞页面模块、评论或后台。
- `workers.dev` 预览域名在 2026-06-18 验证时连 `/api/health` 都返回 Cloudflare 1101；同一版本在正式域名 `neyc.de5.net` 的健康检查和每日背景端点均返回 200，属于预览域名或 Cloudflare 路由层问题，不是本次 Worker 代码异常。

## 可能继续优化的方向

- 在真实浏览器中重点回归富文本标题、引用、列表和连续编辑。
- 继续减少管理员页面中的整页 `renderAdminEditor()` 调用。
- 大量 Base64 图片会增加 KV 配置体积，后续应继续迁移为“文件进 KV/Assets、索引进 D1”的引用式结构；用户已明确 `/llr-mariorun` 不用 R2。
- 对博客编辑器增加草稿自动保存和离开页面提示。
- 对访问日志和评论列表增加分页，避免数据多时一次渲染过重。

## 当前工作区状态

`/llr-mariorun` 黑屏恢复、退出全屏自动重建 iframe、移动端工具栏压缩，以及每日自动背景真正后加载已部署到 Cloudflare；完成提交和推送后工作区除本地浏览器 QA 目录外应保持干净。

## 2026-06-25 老师动作表素材包更新

- 用户提供两张完整像素动作表后，已停止使用此前程序化重画方案；新素材直接从参考图切 10×10 共 100 格，清理棋盘背景并生成 4800×4800 主角动作表。
- 刘硕包使用参考图白衬衫蓝裤子/圆眼镜版本，并只在 3 个砸地相关格轻量叠加小戒尺；郭亮包使用参考图蓝西服/圆肚子版本。两包都通过 Godot 工程级导出，不再只替换 `.ctex`，`player.tscn` 的主角 atlas 区域按 10 倍缩放，并把主角显示缩放设为 `0.125`，保证高分图可用且游戏内尺寸不会失控。
- 线上 KV/D1 已更新并验证：`liushuo` PCK 11,425,536 bytes、素材图 2,399,063 bytes；`guoliang` PCK 11,304,592 bytes、素材图 2,405,721 bytes。线上 `/llr-mariorun/godot/index.pck?pack=...` 实测返回对应大小，响应头仍为 `cache-control: no-store, max-age=0` 和正确 `x-llr-pack-id`。
- 新工具脚本：`tools/build-teacher-sheet-from-reference.mjs`（切参考图/清背景/生成 4800 sheet）、`tools/add-liushuo-ruler-overlay.mjs`（只给指定格叠加戒尺）、`tools/build-ultrahd-godot-pack.mjs`（临时打补丁导出 Godot Web PCK）。`output/` 下是生成产物，不提交。
- 2026-06-26 用户指出旧包跳跃/旋转上方有像素条、走路鬼畜且电脑端卡。已改用用户新发动作表，输出降到 2400×2400（每格 240），`build-ultrahd-godot-pack.mjs --teacher-action-map` 按 Godot 动画名重映射站立/走路/跳跃/旋转/砸地/受伤，避免按格子顺序错配。线上验证：`liushuo` PCK 10,730,656 bytes、素材图 1,637,400 bytes；`guoliang` PCK 10,834,096 bytes、素材图 1,794,020 bytes。
- 2026-06-26 用户反馈仍出现“两张上下一半的格子”。已将参考图包改为 2000×2000（每格 200，低于常见移动 WebGL 2048 纹理限制），并把 `build-ultrahd-godot-pack.mjs` 增加 `--target-cell`，让 Godot `Rect2` 裁剪坐标全部使用整数格，避免浮点缩放采到相邻格；脚本同时输出 `player.tscn.patched` 便于审计。线上 KV/D1 已覆盖并验证：`liushuo` PCK 10,909,600 bytes、素材图 1,912,677 bytes；`guoliang` PCK 10,844,688 bytes、素材图 1,944,284 bytes；`/llr-mariorun/godot/index.pck?pack=...` 返回正确 `x-llr-pack-id` 且 `cache-control: no-store, max-age=0`。
- 2026-06-26 用户重新提供两张 1280×1280 JPG 动作表，并反馈站立/跑步/跳跃动作不对、站立脚陷地、头顶混入上一格。已升级 `build-teacher-sheet-from-reference.mjs`：支持 `--normalize-safe`、`--baseline`、`--top-padding`、`--content-scale`，清除 JPG 棋盘背景碎片后只保留每格最大人物连通块，再统一脚底基准和头顶安全边。虚拟“喷水”按钮改为同时发送 `KeyC Space`，提高手机端触发成功率。线上 KV/D1 已覆盖并验证：`liushuo` PCK 10,065,616 bytes、素材图 993,641 bytes；`guoliang` PCK 10,320,608 bytes、素材图 1,430,471 bytes。
- 2026-06-26 用户反馈 v4 虽然动作对上但站停未回正面、跑步像一帧平移、人物显示不全、刘硕白衣被扣透明、喷水动作未真正上线。已进一步改为 v6：`build-teacher-sheet-from-reference.mjs` 不再只保留最大连通块，而是保留多个有效人物部件并删除小碎片/内部棋盘残留，同时保护偏暖白衣物；动作表统一缩小后对齐脚底，游戏显示比例调到 `displayScale=0.27`。`build-ultrahd-godot-pack.mjs` 映射调整为停止帧回正面站姿、跑步帧使用连续侧跑帧，并在老师包导出时临时 patch `character_sprite.gd`：按住 FLUDD/喷水时触发背身姿态，审计输出 `character_sprite.gd.patched`。线上 KV/D1 已覆盖并验证：`liushuo` PCK 10,300,704 bytes、素材图 1,266,666 bytes；`guoliang` PCK 10,318,416 bytes、素材图 1,374,519 bytes。
- 2026-06-26 用户反馈 v6 仍有刘硕白衣透明、上下格互串和脚陷地。根因确认：用户后给的 1280×1280 JPG 是动作展示板，不是严格 10×10 spritesheet，固定格切片会天然切进相邻动作。已把 `build-teacher-sheet-from-reference.mjs` 增加 `--global-components`，先在整张参考图里检测完整人物连通组件，再按目标格重叠度映射整个人物，避免硬切；同时保留 `--skip-global-checker-erase` 给刘硕白衣，游戏内显示比例从 `0.27` 回到 `0.24` 防止脚陷地。已本地生成暗底抽样预览确认两包不再半身/串格，刘硕白衣保留、跑步多帧完整、戒尺与背身喷水帧保留。线上 KV/D1 已覆盖并验证：`liushuo` PCK 10,656,208 bytes、素材图 1,900,233 bytes；`guoliang` PCK 10,695,696 bytes、素材图 1,947,704 bytes；`/api/game/manifest` 与 `/llr-mariorun/godot/index.pck?pack=...` 均返回 v8 大小，PCK 响应仍 `cache-control: no-store, max-age=0`。
- 2026-06-26 用户要求“Level Designer 管理员公开永久可见、普通用户本机永久可见”。已在 Godot 默认包里开放主菜单 Level Designer，Extras 改为暂未开放提示；Level Designer 保存/测试时会把关卡二进制 base64 传给父页面。前端新增关卡库下拉：管理员登录后保存进 D1 `/api/admin/game/designer-levels`，所有用户刷新可见；非管理员保存进 `localStorage`，只在当前浏览器永久可见，清除游戏存档/本机关卡后消失。线上验证 `/llr-mariorun/` 包含关卡库 UI，保存钩子 `__llrSaveDesignerLevel` / `__llrGetDesignerLevelBase64` 存在，未登录调用管理接口返回 401。
- 2026-06-26 同步修正 Godot Web 导出覆盖问题：默认 `index.pck` 更新到 9,327,984 bytes；`index.html` 恢复 `pack=` 转发和 `--locale zh_CN`；未压缩 `index.wasm` 重新压回 `index.wasm.gz`，Worker 继续通过 `/llr-mariorun/godot/index.wasm` 返回 `application/wasm`。线上实测：原版 PCK 9,327,984 bytes。
- 2026-06-26 老师包 v9：`build-ultrahd-godot-pack.mjs --teacher-action-map` 走步/跑步帧改用更大步幅的连续侧跑帧，让走路动作更明显；不再改已修好的显示比例、全人物裁切和刘硕白衣保护。线上 KV/D1 已覆盖并验证：`liushuo` PCK 10,657,984 bytes，`guoliang` PCK 10,697,520 bytes，`/llr-mariorun/godot/index.pck?pack=...` 实际下载大小与 `x-llr-pack-id` 均正确。
