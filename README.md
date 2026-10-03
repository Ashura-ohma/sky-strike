# 逐风战线 · 原创离线 MOBA 原型

一款单人、离线、竖屏 Android MOBA 小原型。玩家操控原创英雄「星序法师」，沿单路击退敌方小兵与英雄，摧毁防御塔后再摧毁水晶。没有联网、登录、广告、付费或第三方游戏素材。

这是受 MOBA 类型启发的独立原创原型，不是《英雄联盟》移植版，也没有使用 Riot 的英雄、地图、标识或美术素材。

## 试玩

```sh
npm run serve
```

浏览器访问 `http://localhost:8080`。手机上用左侧摇杆移动，按住「普攻」攻击；Q 是单体星火，R 是范围奥义。击毁敌方防御塔后，水晶才会受到伤害。键盘支持 WASD/方向键、空格、Q、R。

## Android 构建

需要 JDK 17、Android SDK Platform 35。使用 Android Studio 打开 `android/` 后运行 `assembleDebug`；或在 GitHub Actions 手动运行 **Build Android APK**，完成后下载 `zhufeng-moba-debug-apk` artifact。debug APK 适合个人测试安装，不是应用商店发行签名。

构建无需签名密钥。Android App 用本地 HTTPS asset origin 加载随 APK 打包的资源；不申请联网权限，不加载远程页面。

## 项目内容

- `android/app/src/main/assets/`：Canvas 游戏与界面
- `android/app/src/main/java/`：轻量 Android WebView 壳
- `tests/`：核心规则测试
- `.github/workflows/android-apk.yml`：CI 测试并构建 APK

运行测试：`npm test`。

## 原型范围

当前版本包括移动、普攻、Q/R 技能、小兵波次、敌方英雄复活、防御塔、基地和胜负条件。尚未做完整 5v5、多个英雄、装备商店、联网对战、真实设备触控适配和应用商店发布；需要后续迭代。
