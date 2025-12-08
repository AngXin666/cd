package com.miaoda.fleet;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 启用 WebView 的返回键处理
        this.getBridge().getWebView().setOnKeyListener((v, keyCode, event) -> {
            if (event.getAction() == android.view.KeyEvent.ACTION_DOWN &&
                keyCode == android.view.KeyEvent.KEYCODE_BACK) {
                // 让 WebView 处理返回键，不拦截
                if (this.getBridge().getWebView().canGoBack()) {
                    this.getBridge().getWebView().goBack();
                    return true;
                }
            }
            return false;
        });
    }
}
