package com.miaoda.fleet.v2;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 配置状态栏：让内容延伸到状态栏下方，状态栏透明
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            
            // 让内容延伸到状态栏下方
            WindowCompat.setDecorFitsSystemWindows(window, false);
            
            // 设置状态栏图标为深色（适配浅色背景）
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decorView = window.getDecorView();
                int systemUiVisibility = decorView.getSystemUiVisibility();
                systemUiVisibility |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                decorView.setSystemUiVisibility(systemUiVisibility);
            }
        }
        
        // 启用左滑返回手势
        // Android默认支持返回键，这里确保WebView支持历史记录返回
    }
    
    @Override
    public void onBackPressed() {
        // 如果WebView可以返回，则返回上一页
        if (bridge != null && bridge.getWebView().canGoBack()) {
            bridge.getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }
}
