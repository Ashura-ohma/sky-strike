# SKY STRIKE · 雷霆空战

一个零依赖的 HTML5 Canvas 飞机射击小游戏。支持电脑键盘和手机触控，采用中文界面，源码以 MIT 协议开放。

## Android 安装包

[下载雷霆空战 APK v1.0.0](https://github.com/Ashura-ohma/sky-strike/raw/refs/heads/main/downloads/sky-strike-1.0.0.apk)

Android 8.0 及以上，需要保持更新的 Android System WebView。下载后打开 APK，按系统安装流程操作。若系统阻止安装，请先查看提示，不要关闭 Play Protect 等安全检查。

完全离线、无需登录、没有广告、不申请任何权限。安装后点「开始飞行」，在战场内按住拖动，自动射击。切到后台自动暂停；点「继续飞行」恢复。

这是开发证书签名的独立安装包，非商店发行版。已验证 APK 签名、文件完整性和游戏逻辑，尚未进行安卓真机/模拟器启动测试。

- [Android 源码和构建说明](android/README.md)
- [APK 校验值与版本说明](downloads/README.md)

## 开始游戏

需要 Python 3；测试需要 Node.js 18+。无需安装 npm 依赖。

```sh
npm start
# 或 python3 -m http.server 8080 --directory dist
```

浏览器打开 http://localhost:8080 。请通过 HTTP 服务器运行，直接双击 HTML 会被浏览器的 ES Modules 安全限制拦截。

- 方向键 / WASD：移动
- 手机：在战场内按住拖动（相对移动，不会让战机瞬移）
- 自动开火，P / Esc 暂停和继续；切换标签页自动暂停
- 点击「声音」开启合成音效，默认静音
- 每 22 秒进入下一波，敌机逐渐变强
- 每击落 8 架掉落火力补给，最多三向射击；每 13 架可掉落修复补给
- 被击中后短暂无敌，装甲为零时结束；点击「再次起飞」重开
- 满级补给提供额外分数，最高分仅保存在当前浏览器 localStorage

## 功能

三种敌机、瞄准弹幕、递增波次、火力升级、装甲修复、爆炸粒子、音效、暂停/继续/重开、个人最高纪录、自适应移动端布局。

## 项目结构

- `dist/index.html`：页面与 HUD
- `dist/style.css`：响应式界面
- `dist/game.js`：游戏循环、输入、绘制、声音和生命周期
- `dist/engine.js`：可独立测试的纯逻辑
- `tests/engine.test.js`：内置 Node.js 测试

```sh
npm test
node --check dist/game.js
```

## 部署

将 `dist/` 下的四个文件部署到任意静态网站服务即可。没有 API、付费服务、后端或外部资源依赖。

GitHub Pages：把 `dist/` 的内容放到发布分支的根目录，或使用 GitHub Actions 上传 `dist/` 为 Pages artifact，再在仓库 Settings → Pages 中选择对应发布来源。

## 隐私与许可

不收集个人信息，不发起第三方网络请求。所有美术由 Canvas 实时绘制，所有音效由 Web Audio 合成，无外部素材授权负担。MIT License，详见 `LICENSE`。
