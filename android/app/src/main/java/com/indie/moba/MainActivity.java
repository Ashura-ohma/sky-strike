package com.indie.moba;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUi();

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setKeepScreenOn(true);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request) {
                android.webkit.WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                String path = request.getUrl().getPath();
                // Older Android MIME maps may not recognize ES module file extensions.
                if (response != null && path != null && (path.endsWith(".mjs") || path.endsWith(".js"))) {
                    response.setMimeType("text/javascript");
                }
                return response;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
            }
        });
        setContentView(webView);
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    private void resumeGame() {
        hideSystemUi();
        if (webView != null) webView.evaluateJavascript("window.dispatchEvent(new Event('moba-resume'))", null);
    }

    @Override protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }

    private void hideSystemUi() {
        Window window = getWindow();
        window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.resumeTimers(); webView.onResume();
            webView.evaluateJavascript("window.dispatchEvent(new Event('moba-resume'))", null);
        }
    }
    @Override protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('moba-pause'))", null);
            webView.onPause(); webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView != null) webView.evaluateJavascript("window.dispatchEvent(new Event('moba-pause'))", null);
        new AlertDialog.Builder(this).setTitle("退出逐风英雄战境？")
            .setMessage("当前对局不会保存。")
            .setPositiveButton("退出", (dialog, which) -> finish())
            .setNegativeButton("继续游戏", (dialog, which) -> resumeGame())
            .setOnCancelListener(dialog -> resumeGame()).show();
    }
}
