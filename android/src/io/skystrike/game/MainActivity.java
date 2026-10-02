package io.skystrike.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;

/** Offline-only host. No Internet permission, JS bridge, remote pages or analytics. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/www/index.html";
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout container = new FrameLayout(this);
        container.setFitsSystemWindows(true);
        container.setBackgroundColor(0xff070e1d);
        web = new WebView(this);
        web.setBackgroundColor(0xff070e1d);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPort() == -1) {
                    if ("/assets/www/".equals(path)) path = "/assets/www/index.html";
                    String name = path == null ? "" : path.substring(path.lastIndexOf('/') + 1);
                    if (("/assets/www/" + name).equals(path) && (name.equals("index.html") || name.equals("game.js") || name.equals("engine.js") || name.equals("style.css"))) {
                        String mime = name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html";
                        try { return new WebResourceResponse(mime, "UTF-8", getAssets().open("www/" + name)); }
                        catch (IOException ignored) { }
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !HOME.equals(url) && !(ORIGIN + "/assets/www/").equals(url);
            }
        });
        container.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(container);
        web.loadUrl(HOME);
    }
    private void pauseGame() {
        if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('skystrike-pause'))", null);
    }
    @Override protected void onPause() {
        pauseGame();
        if (web != null) { web.onPause(); web.pauseTimers(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); pauseGame(); }
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (!focused) pauseGame();
    }
    @Override public void onBackPressed() {
        pauseGame();
        new AlertDialog.Builder(this).setTitle("退出雷霆空战？")
            .setMessage("当前飞行将结束，已保存的最高纪录不会丢失。")
            .setNegativeButton("继续留在游戏", null)
            .setPositiveButton("退出", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) { finish(); }
            }).show();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
