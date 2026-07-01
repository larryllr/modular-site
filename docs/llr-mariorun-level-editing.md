# LLR Mario Run 关卡编辑说明

本文记录 `/llr-mariorun` 当前“???”/Extras 内置关卡的编辑方式，避免以后改关卡时只改了临时导出文件，部署后又被覆盖。

## 1. 当前关卡入口

主菜单入口在：

```text
vendor/Legacy_SM63Redux/scenes/menus/title/main_menu/main_menu.gd
```

当前 `_press_button()` 里：

```gdscript
0 -> Story Mode: res://scenes/levels/tutorial_1/tutorial_1_1.tscn
1 -> Level Designer: res://scenes/menus/level_designer/level_designer.tscn
2 -> ??? / Extras: res://scenes/levels/llr_complete/llr_complete_1.tscn
3 -> Options
```

因此现在“???”不再进入 Story Mode 的 demo 关卡，而是进入：

```text
res://scenes/levels/llr_complete/llr_complete_1.tscn
```

## 2. 真实可提交的编辑入口

不要直接长期编辑下面这个文件：

```text
vendor/Legacy_SM63Redux/scenes/levels/llr_complete/llr_complete_1.tscn
```

原因：`vendor/Legacy_SM63Redux/` 被 `.gitignore` 忽略，直接改它不会进 GitHub。真正应该编辑的是生成脚本：

```text
tools/patch-llr-complete-level.mjs
```

这个脚本会在 `npm run predeploy` 时重新生成：

```text
vendor/Legacy_SM63Redux/scenes/levels/llr_complete/llr_complete_1.tscn
```

并确保主菜单“???”指向这个关卡。

## 3. 部署链路

`package.json` 的 `predeploy` 会按顺序执行：

```text
patch-llr-mariorun-controls.mjs
patch-llr-mariorun-game-actions.mjs
patch-llr-mariorun-pck-sync.mjs
patch-llr-complete-level.mjs
patch-llr-joystick-transform.mjs
export-llr-godot-pck.mjs
```

其中：

```text
patch-llr-complete-level.mjs
```

负责写入完整关卡场景；

```text
export-llr-godot-pck.mjs
```

负责重新导出：

```text
public/llr-mariorun/godot/index.pck
```

线上实际加载的是这个 PCK，所以改完关卡后必须重新导出 PCK 并部署。

## 4. 场景根节点必须叫 Main

新建 Godot 关卡时，根节点必须是：

```gdscript
[node name="Main" type="Node2D"]
```

不要改成 `LLRComplete1`、`Level1` 等其他名字。这个项目里有脚本会通过 `/root/Main` 获取当前场景节点，根节点名字不对会导致进入关卡黑屏，甚至返回按钮也无法正常工作。

## 5. 关卡结构

当前完整关卡采用原生 Godot `.tscn` 结构，主要节点如下：

```text
Main
├─ BGT1                 背景
├─ CameraArea           摄像机活动范围
├─ Player               玩家出生点
├─ Terrain              地形/碰撞
├─ Items
│  ├─ Signs             告示牌
│  ├─ Decoration        树、花等装饰
│  ├─ Coins             金币
│  ├─ Enemies           敌人
│  └─ Logs              木桩/落木
├─ Water                水面
└─ WarpZone             终点传送区
```

## 6. 坐标规则

Godot 使用 `Vector2(x, y)`：

```text
x 越大越靠右
y 越大越靠下
```

角色出生点当前是：

```gdscript
[node name="Player" parent="." instance=ExtResource("2")]
position = Vector2(110, 153)
```

主地形 `MainHills` 是一条长多边形，表面高度由多边形点控制。例如：

```gdscript
polygon = PackedVector2Array(... 1680, 190, 1830, 145, ...)
```

这表示在 `x=1680` 附近地面大约是 `y=190`，到 `x=1830` 附近升到 `y=145`。放置告示牌、敌人、金币时，要先看附近地形高度。

## 7. 修改地形

地形写在：

```gdscript
[node name="MainHills" parent="Terrain" instance=ExtResource("1")]
z_index = 1
polygon = PackedVector2Array(...)
```

每两个数字是一组点：

```text
x1, y1, x2, y2, x3, y3...
```

地形多边形需要形成闭合区域。上边缘是玩家踩到的地面，下边和左右边通常拉到屏幕外，避免露底。

新增平台可以照下面这种结构复制：

```gdscript
[node name="SkyIsland1" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(2960, 82)
polygon = PackedVector2Array(0, 0, 150, 0, 150, 30, 0, 30)
```

其中 `position` 是平台左上角附近的位置，`polygon` 是相对这个位置的矩形碰撞。

## 8. 修改告示牌

告示牌节点示例：

```gdscript
[node name="StartSign" parent="Items/Signs" instance=ExtResource("5")]
position = Vector2(190, 178)
lines = Array[String](["第一段文字", "第二段文字"])
```

注意：告示牌的 `y` 不要离地面太高，否则角色靠近后可能交互不到。当前已调整为：

```text
StartSign: Vector2(190, 178)
MidSign:   Vector2(1810, 144)
EndSign:   Vector2(3900, 164)
```

经验值：告示牌的 `y` 应接近脚下地面的 `y`，可以略高 0–6 像素，但不要高十几到几十像素。

## 9. 修改金币

金币节点示例：

```gdscript
[node name="Coin1" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(370, 132)
```

普通金币使用：

```text
ExtResource("10")
```

蓝金币使用：

```text
ExtResource("11")
```

金币通常放在地面上方 35–80 像素，或者按跳跃路线排列。

## 10. 修改敌人

Goomba 节点示例：

```gdscript
[node name="Goomba1" parent="Items/Enemies" instance=ExtResource("9")]
position = Vector2(770, 152)
```

敌人的 `y` 也要贴近地面。太高会浮空，太低可能卡进地形。

## 11. 修改水坑

水面节点示例：

```gdscript
[node name="Lake" parent="Water" instance=ExtResource("12")]
position = Vector2(2060, 206)
polygon = PackedVector2Array(0, 0, 390, 0, 390, 80, 320, 118, 120, 126, 0, 82)
```

`position` 是水坑起点，`polygon` 控制水面形状。水可以作为关卡变化，但不要把水面放得太高挡住整段路线。

## 12. 修改终点

终点传送区是：

```gdscript
[node name="WarpZone" parent="." instance=ExtResource("15")]
position = Vector2(4312, -120)
sweep_direction = Vector2(-1, 0)
spawn_location = Vector2(110, 153)
scene_path = "res://scenes/menus/title/main_menu/main_menu.tscn"
size = Vector2(48, 1800)
```

当前逻辑：玩家走到最右侧传送区后回主菜单。若要改为进入下一关，把 `scene_path` 改成下一关 `.tscn`。

## 13. PCK 同步列表

Worker 里有 PCK 替换列表：

```text
src/index.ts -> sm63ExtrasPckEntries
```

其中必须包含：

```text
res://scenes/levels/llr_complete/llr_complete_1.tscn
```

否则部署时新关卡不会被同步进线上 PCK。

## 14. 改完后的验证与部署

推荐顺序：

```powershell
npm run check
npm run predeploy
npm test
npm run build:cubecity
node ./node_modules/wrangler/bin/wrangler.js deploy
```

如果只改关卡，核心检查是：

```powershell
npm run predeploy
npm test
node ./node_modules/wrangler/bin/wrangler.js deploy
```

提交 GitHub 时至少提交：

```text
tools/patch-llr-complete-level.mjs
public/llr-mariorun/godot/index.pck
```

如果改了菜单路由、PCK 同步、测试，也要一起提交：

```text
package.json
src/index.ts
tests/llr-mariorun.test.mjs
tools/patch-llr-mariorun-controls.mjs
```

不要提交这些临时目录：

```text
.codex-cache/
.playwright-cli/
output/
```

## 15. 参考 SM63_Godot 的方式

`SM63_Godot develop` 里的正式课程在：

```text
sm63_courses/*.tscn
```

例如：

```text
sm63_courses/1-1.tscn
```

它的思路是把一关拆成背景、前景、碰撞、平台、摄像机边界等层。当前 `LLR Complete 1` 没有直接搬它的资源，而是按同样思路，用 `Legacy_SM63Redux` 已有资源做了一个可部署、可玩的原生 `.tscn` 关卡。
