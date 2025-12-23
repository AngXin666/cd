package com.miaoda.fleet.v2;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

/**
 * 主活动类
 * 负责应用的主界面和返回导航控制
 * 
 * 返回导航行为：
 * - 工作台页面（5个）：阻止返回，用户使用系统手势退出
 * - 普通页面（50+个）：正常返回上一页
 * 
 * Requirements: 2.1, 2.3, 3.1, 4.1
 */
public class MainActivity extends BridgeActivity {
    
    /**
     * 工作台页面路径列表
     * 这些页面会阻止返回操作，用户需使用系统手势退出应用
     */
    private static final String[] DASHBOARD_PATHS = {
        "/pages/index/index",
        "/pages/driver/index",
        "/pages/manager/index",
        "/pages/super-admin/index",
        "/pages/profile/index"
    };
    
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
    }
    
    /**
     * 处理返回按钮事件
     * 
     * 行为规范：
     * - 工作台页面：不做任何处理（阻止返回），用户需使用 Home 键或任务管理器退出
     * - 普通页面：调用 WebView.goBack() 返回上一页
     * 
     * Requirements: 2.1, 2.3, 4.1
     */
    @Override
    public void onBackPressed() {
        // 获取当前 WebView
        if (bridge == null) {
            super.onBackPressed();
            return;
        }
        
        WebView webView = bridge.getWebView();
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        
        // 获取当前 URL
        String currentUrl = webView.getUrl();
        
        // 判断是否是工作台页面
        if (isDashboardPage(currentUrl)) {
            // 工作台页面：不做任何处理（阻止返回）
            // 用户需要使用 Home 键或任务管理器退出应用
            // 这里直接 return，不调用任何返回逻辑
            return;
        }
        
        // 普通页面：正常返回上一页
        if (webView.canGoBack()) {
            webView.goBack();
        }
        // 如果无法返回，也不做任何处理（避免意外退出应用）
    }
    
    /**
     * 判断当前 URL 是否是工作台页面
     * 
     * 工作台页面包括：
     * - /pages/index/index（路由分发页）
     * - /pages/driver/index（司机工作台）
     * - /pages/manager/index（管理员工作台）
     * - /pages/super-admin/index（老板工作台）
     * - /pages/profile/index（个人中心）
     * 
     * @param url 当前页面 URL
     * @return 是否是工作台页面
     * 
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    private boolean isDashboardPage(String url) {
        // URL 为空时，降级处理：假设不是工作台页面，允许返回
        if (url == null || url.isEmpty()) {
            return false;
        }
        
        // 检查 URL 是否包含任一工作台路径
        for (String path : DASHBOARD_PATHS) {
            if (url.contains(path)) {
                return true;
            }
        }
        
        return false;
    }
}
