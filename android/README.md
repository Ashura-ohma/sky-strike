# 雷霆空战 Android 离线版

## 安装与使用

- 文件：`sky-strike-1.0.0.apk`，Android 8.0 / API 26 及以上
- 需要设备已有且保持更新的 Android System WebView（游戏使用现代 JavaScript / ES Modules）
- 点「开始飞行」，在战场内按住拖动。自动射击；声音默认关闭，可点「声音」开启
- 切到后台、失去焦点或按返回键会暂停。返回键显示退出确认；取消退出后，点「继续飞行」继续
- 不需要联网或登录，无广告，不申请任何 Android 权限
- 最高分只存于应用本地；卸载或清除应用数据会移除最高分。当前飞行不跨进程重启恢复
- 这是开发证书签名的独立安装包，并非应用商店发行版。没有禁用 Android 的系统安全检查

## 构建

在项目根目录执行 `npm test`。使用 JDK 21、Python 3、zip、Android AAPT、zipalign、D8/R8 和 apksigner：

```sh
export ANDROID_JAR=/path/to/android-sdk/platforms/android-35/android.jar
export AAPT=/path/to/android-sdk/build-tools/35.0.0/aapt
export ZIPALIGN=/path/to/android-sdk/build-tools/35.0.0/zipalign
export D8_JAR=/path/to/android-sdk/build-tools/35.0.0/lib/d8.jar
export APKSIGNER_JAR=/path/to/android-sdk/build-tools/35.0.0/lib/apksigner.jar
export SIGNING_KEYSTORE=/private/path/development.jks
export SIGNING_PASSWORD_FILE=/private/path/password.txt
./android/build.sh
```

使用自己的签名密钥；源码包不含密钥或密码。同一安装的升级必须使用原签名密钥。不要提交签名文件。

本次构建使用 Debian 官方 AOSP packaging / signing 工具、Google Maven R8 8.7.18、Maven Central 的 Robolectric Android 15 API jar 进行 Java 编译，以及 Debian framework-res.apk 编译资源。`FRAMEWORK_RES` 可单独覆盖资源平台文件。没有接受额外 SDK 许可协议，没有安装任何第三方应用运行时到 APK。

## 安全与实现

原版的四个游戏文件保留在 `dist/`。`prepare-assets.py` 在构建目录中加入触屏布局、CSP 和原生生命周期暂停事件，网页版本不受影响。

原生 WebView 使用本地拦截的 HTTPS origin。只允许四个固定资源路径，其余请求返回空响应。没有 Internet 权限、文件访问、Content URI 访问、JavaScript-native bridge 或远程导航。没有服务、接收器或后台任务。最高分通过 WebView 本地存储保存，Android 系统备份关闭。

## 验证范围

- Java 编译与 DEX 转换成功
- APK ZIP 完整性、zipalign、v2/v3 签名验证通过
- Manifest：包名 `io.skystrike.game`，版本 1.0.0，minSdk 26 / targetSdk 35，无请求权限，debuggable=false
- 原游戏 7 项 Node 测试通过，最终打包 JavaScript 语法检查通过
- 模拟小屏触摸缩放、拖动、取消指针、前后台暂停和 localStorage 不可用的逻辑测试通过
- 未在 Android 真机或模拟器启动；当前环境不能完成屏幕渲染和原生生命周期端到端测试，实际设备表现仍需确认
