# 逐风 · 英雄战境 V3

横屏 3D 单机 MOBA，Android 离线安装包，版本 0.3.0。

## 本次扩展

- **6 名英雄、24 个主动技能**：剑士、法师、射手、坦克、刺客、治疗辅助，每名英雄有独立被动。
- **5v5 三路战场**：电脑英雄使用多种技能、撤退和购买装备；小兵每三波加入攻城单位。
- **野区目标**：四处红蓝守卫、65 秒首次苏醒的远古龙王、范围攻击预警。击败龙王后强化全队及新出兵线 70 秒。
- **18 件装备**：物理、法术、防御、移动分类；补差价进阶与七折出售；吸血、暴击、反伤、减速、穿透和冷却属性。
- **成长决策**：每局选择四种符文之一；升级获得技能点；普通技能最多 5 级、终极技能最多 3 级。
- **四档对局设置**：休闲、标准、挑战、自由练习。练习局开局 15 级与 12000 金币，不获得局外奖励。
- **本地档案**：对局星币、旅者经验、英雄熟练度、最近 12 场战绩、三个累计成就、四种模型配色。存于应用本地，卸载或清除应用数据会删除。
- **完整交互**：摇杆移动、按住普攻追击、拖动技能瞄准与取消、技能加点、回城、回血、复活、暂停、实时战况及中路/回防/龙王队伍指令。
- **美术与音频**：离线英雄肖像图集、图鉴、不同职业三维武器、远古龙模型、河道桥梁、野区标记、48 秒循环原创合成背景音乐与技能音效。

游戏采用程序化低多边形战斗模型。图鉴肖像是独立生成的概念插画，不是战斗画面。仍为开发版，尚无联网、战争迷雾、云存档或商业级动画制作。

## 安装与试玩

Android 8.0+，Android System WebView 需支持 WebGL。应用名 **逐风战境 V3**，包名 `com.indie.moba.zhufeng.v3`，与 V2 分开安装。

建议第一次选择 **自由练习**：直接尝试六名英雄的技能、技能加点、装备进阶和配色。

GitHub Actions 运行 13 项引擎/成长测试后生成 `zhufeng-moba-debug-apk`。产物是调试签名 APK；V3 工作流缓存调试密钥，后续同版本系列构建在缓存存在时沿用签名。真实手机兼容性与帧率仍需实机验证。

## 验证

- 引擎：基地保护、技能消耗和等级、六英雄技能、控制与治疗、装备交易、进阶与出售、防御塔目标、复活、回城、兵线、龙王、难度、符文。
- 成长：奖励去重、练习模式无奖励、配色消费、存档读取与损坏回退。
- 移动浏览器：三点同时触控、技能取消、暂停、图鉴、符文、技能加点、商店、指令、首领显示、战况、胜利结算、战绩存储与刷新恢复、配色和练习模式。

```sh
npm test
npm run serve
```

浏览器打开 `http://localhost:8080`。电脑操作：方向键移动，空格普攻，Q/W/E/R 技能，B 回城，F 恢复，Esc 暂停。也可点击地面移动。

## Android 构建

需要 JDK 17、Gradle 8.9、Android SDK 35。

```sh
python3 scripts/prepare_assets.py
cd android
gradle --no-daemon assembleDebug
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`。无 INTERNET 权限，所有资源在安装包内。

## 源码

- `assets/engine.mjs`：战斗模拟。
- `assets/content.mjs`：新增英雄、装备、符文、难度与成就。
- `assets/profile.mjs`：本地成长、存档与外观解锁。
- `assets/renderer.mjs`：三维模型、地图与特效。
- `assets/game.mjs`：触控、界面、音频与生命周期。
- `assets/art/heroes-atlas.png`：由内置 image_gen 生成的六英雄肖像；完整提示词与制作说明在同目录 `README.txt`。
- `assets/audio/theme.ogg`：原创合成配乐；可用 `scripts/generate_music.py` 重新生成（需要 NumPy、FFmpeg）。

这里的 `assets/` 指 `android/app/src/main/assets/`。

Three.js 使用 MIT 许可证，Noto Sans SC 中文字体子集使用 SIL OFL；许可证在 `assets/vendor/`。

在 `Ashura-ohma/sky-strike` 的 `offline-moba` 分支独立维护。

为保证资源上传可靠，肖像图在仓库中以 `asset-parts/` 的二进制分片保存；`scripts/prepare_assets.py` 校验 SHA-256 后无损还原。构建和 `npm run serve` 会自动执行还原。
