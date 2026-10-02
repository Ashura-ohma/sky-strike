#!/usr/bin/env python3
"""Bundle the browser game with a phone-sized, offline-only shell."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
out = root / 'android/build/assets/www'
out.mkdir(parents=True, exist_ok=True)
for filename in ('index.html', 'style.css', 'game.js', 'engine.js'):
    shutil.copy2(root / 'dist' / filename, out / filename)
html = (out / 'index.html').read_text()
html = html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; connect-src \'none\'; object-src \'none\'; base-uri \'self\'">')
html = html.replace('<body>', '<body class="android-app">')
html = html.replace('保存在当前浏览器', '保存在此设备')
html = html.replace('方向键 / WASD · 触屏拖动 · 自动开火', '在战场内按住拖动 · 自动开火')
(out / 'index.html').write_text(html)
with (out / 'game.js').open('a') as f:
    f.write("\n// Native Android lifecycle: always pause; never auto-resume an interrupted run.\nwindow.addEventListener('skystrike-pause',()=>{if(state==='playing')pause();});\n")
with (out / 'style.css').open('a') as f:
    f.write('''
/* APK-only layout: fit the usable WebView, including compact phones. */
.android-app {height:100vh;height:100dvh;min-height:0;overflow:hidden;overscroll-behavior:none;user-select:none;-webkit-user-select:none}
.android-app .cockpit {height:100%;width:100%;max-width:540px;padding:8px;display:flex;flex-direction:column}
.android-app .masthead {flex:none;padding-bottom:6px;gap:6px;min-height:52px}
.android-app .brand {font-size:17px;letter-spacing:1px;gap:6px}
.android-app .brand-mark {font-size:26px}
.android-app .brand small {display:none}
.android-app .head-actions {gap:6px}
.android-app .icon-button {min-width:44px;min-height:44px;padding:7px;font-size:11px}
.android-app .layout {display:flex;flex:1;min-height:0;width:100%;margin:6px 0 0;max-width:none}
.android-app .sidebar {display:none}
.android-app .arena-panel {display:flex;flex-direction:column;min-height:0;height:100%}
.android-app .hud {flex:none;padding:6px 12px}
.android-app .hud strong {font-size:19px}
.android-app .hud-life strong {font-size:16px}
.android-app .arena {flex:1;min-height:0;max-height:none;aspect-ratio:auto;width:100%;overflow:hidden}
.android-app .status-bar {flex:none;padding:8px 10px}
.android-app .overlay {padding:12px}
.android-app .overlay h2 {font-size:42px;margin:12px 0}
.android-app .overlay p {margin-bottom:18px}
.android-app .overlay-hint {margin-top:14px}
.android-app .primary {min-height:48px}
@media(max-width:340px){.android-app .brand-mark{display:none}.android-app .brand{font-size:16px}.android-app .hud small{font-size:8px;letter-spacing:.6px}}
''')
print(out)
