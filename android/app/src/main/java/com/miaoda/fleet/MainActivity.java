package com.miaoda.fleet;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 启用 WebView 调试（仅开发环境）
        // WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onBackPressed() {
        // 获取 WebView
        WebView webView = getBridge().getWebView();
        
        // 检查 WebView 是否可以返回
        if (webView != null && webView.canGoBack()) {
            // 如果可以返回，则返回上一级页面
            webView.goBack();
        } else {
            // 否则执行默认返回操作（退出应用）
            super.onBackPressed();
        }
    }
}
