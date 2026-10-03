# 逐风 · 英雄战境 V2

横屏 3D 单机 MOBA。全部资源随 Android 安装包提供，无联网权限，不使用远程 CDN。

## 本版内容

- 三名原创英雄：逐风剑士、星辉法师、月影游侠；每人四个技能。
- 5 对 5 电脑对局、三条兵线、十二座防御塔、基地水晶与两处野怪。
- 双手多点触控：摇杆移动、按住普攻追击、拖动技能瞄准、拖到取消区域撤销。
- 等级、终极技能解锁、金币、六格装备、回血、回城、阵亡复活。
- 三维角色与武器、步行动画、阴影、弹道、技能范围、陨星、血条与小地图。
- 暂停、流畅画质开关、程序音效、战斗统计与胜负结算。

这是使用程序生成美术的原创低多边形游戏，仍是可玩开发版。没有商业手游规模的角色美术、联网匹配、完整赛季系统、视野迷雾或存档。没有使用《英雄联盟》的名称、角色或美术资源。

## Android 安装与构建

Android 8.0 及以上，设备的 Android System WebView 需支持 WebGL。推荐横屏。

包名：`com.indie.moba.zhufeng.v2`，版本：`0.2.0`。V2 使用独立包名，可与旧 2D 版同时安装。

GitHub Actions 会执行逻辑测试并构建 APK。进入本分支 Actions 的 **Build Android APK**，下载 `zhufeng-moba-debug-apk`。这是调试签名安装包；系统可能要求允许从当前下载来源安装应用。设备性能与兼容性仍需要真实手机验证。

本地构建需要 JDK 17、Gradle 8.9、Android SDK 35：

```sh
cd android
gradle --no-daemon assembleDebug
```

输出 `android/app/build/outputs/apk/debug/app-debug.apk`。

## 本地预览

```sh
npm run serve
```

打开 `http://localhost:8080`。电脑端可使用方向键移动，空格普攻，Q/W/E/R 施法，B 回城，F 恢复，Esc 暂停。也可点击地面移动。

```sh
npm test
```

引擎测试覆盖基地保护、技能消耗、装备交易、防御塔目标、复活、回城中断以及电脑对局推进。界面另经移动浏览器的三点同时触控、技能瞄准与取消、暂停、购物和胜利结算检查。

## 源码结构

- `engine.mjs`：独立战斗模拟，不依赖 DOM 或渲染器。
- `renderer.mjs`：Three.js 三维场景、程序模型与视觉反馈。
- `game.mjs`：输入、界面、音效、对局生命周期。
- `android/`：离线 WebView 包装与 Android 构建配置。

Three.js 0.160.1 使用 MIT 许可证，中文字体为 Noto Sans SC 的界面字形子集，使用 SIL OFL 许可证。许可证位于 `assets/vendor/`。

该项目在 `offline-moba` 分支独立维护，不改动 `sky-strike` 的主分支飞机游戏。
