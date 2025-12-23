# Design Document - 返回导航优化

## Overview

本设计文档描述了返回导航优化的技术实现方案（混合方案）。核心目标是：
1. 普通页面正常返回，无提示
2. 工作台页面阻止应用内返回，用户使用系统手势退出
3. 每个平台使用最原生的方式实现，无自定义监听器
4. 跨平台行为一致

## Architecture

### 整体架构（混合方案）

```
┌─────────────────────────────────────────────────────────────┐
│                    平台适配层（各平台独立实现）               │
├─────────────────┬─────────────────┬─────────────────────────┤
│    Android      │      H5         │       小程序             │
│  ┌───────────┐  │  ┌───────────┐  │  ┌─────────────────┐   │
│  │ Capacitor │  │  │ History   │  │  │ Taro 页面配置    │   │
│  │ 原生配置   │  │  │ API       │  │  │ navigationStyle │   │
│  └───────────┘  │  └───────────┘  │  └─────────────────┘   │
│       │         │       │         │         │               │
│       ▼         │       ▼         │         ▼               │
│  ┌───────────┐  │  ┌───────────┐  │  ┌─────────────────┐   │
│  │ Android   │  │  │ popstate  │  │  │ 隐藏返回按钮     │   │
│  │ 原生代码   │  │  │ 事件处理  │  │  │ 或 onBackPress  │   │
│  │ onBack    │  │  │           │  │  │                 │   │
│  │ Pressed   │  │  │           │  │  │                 │   │
│  └───────────┘  │  └───────────┘  │  └─────────────────┘   │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    页面层（统一行为）                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  工作台页面 (Dashboard Pages) - 阻止返回             │   │
│  │  - /pages/index/index                              │   │
│  │  - /pages/driver/index                             │   │
│  │  - /pages/manager/index                            │   │
│  │  - /pages/super-admin/index                        │   │
│  │  - /pages/profile/index                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  普通页面 (Normal Pages) - 正常返回                  │   │
│  │  - 所有其他 50+ 页面                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 工作台页面路径常量

```typescript
/**
 * 工作台页面路径列表
 * 这些页面会阻止返回操作
 */
export const DASHBOARD_PATHS = [
  '/pages/index/index',
  '/pages/driver/index',
  '/pages/manager/index',
  '/pages/super-admin/index',
  '/pages/profile/index'
] as const

/**
 * 判断路径是否是工作台页面
 * @param path - 页面路径
 * @returns 是否是工作台页面
 */
export function isDashboardPage(path: string): boolean {
  return DASHBOARD_PATHS.some(dashboardPath => 
    path.includes(dashboardPath) || path.endsWith(dashboardPath.replace('/index', ''))
  )
}
```

### 2. Android 实现

#### 2.1 Capacitor 配置

```typescript
// capacitor.config.ts
android: {
  // 禁用默认返回行为，让应用完全控制
  backButtonBehavior: 'none'
}
```

#### 2.2 Android 原生代码

```java
// android/app/src/main/java/com/miaoda/fleet/v2/MainActivity.java

@Override
public void onBackPressed() {
    // 获取当前 WebView URL
    WebView webView = getBridge().getWebView();
    String currentUrl = webView.getUrl();
    
    // 判断是否是工作台页面
    if (isDashboardPage(currentUrl)) {
        // 工作台页面：不做任何处理
        // 用户需要使用 Home 键或任务管理器退出
        return;
    }
    
    // 普通页面：正常返回
    if (webView.canGoBack()) {
        webView.goBack();
    }
}

/**
 * 判断是否是工作台页面
 */
private boolean isDashboardPage(String url) {
    if (url == null) return false;
    
    String[] dashboardPaths = {
        "/pages/index/index",
        "/pages/driver/index",
        "/pages/manager/index",
        "/pages/super-admin/index",
        "/pages/profile/index"
    };
    
    for (String path : dashboardPaths) {
        if (url.contains(path)) {
            return true;
        }
    }
    return false;
}
```

### 3. H5 实现

#### 3.1 BackNavigationManager

```typescript
/**
 * H5 返回导航管理器
 * 使用 History API 管理页面历史
 */
class H5BackNavigationManager {
  private initialized = false
  
  /**
   * 初始化返回处理
   * 在 App.tsx 中调用
   */
  initialize(): void {
    if (this.initialized || process.env.TARO_ENV !== 'h5') return
    this.initialized = true
    
    // 监听 popstate 事件
    window.addEventListener('popstate', this.handlePopState)
    
    // 初始化时 push 一个状态
    window.history.pushState(null, '', window.location.href)
  }
  
  /**
   * 处理 popstate 事件
   */
  private handlePopState = (): void => {
    const currentPath = window.location.pathname
    
    if (isDashboardPage(currentPath)) {
      // 工作台页面：阻止返回，重新 push 状态
      window.history.pushState(null, '', window.location.href)
      // 不做任何其他处理
    }
    // 普通页面：浏览器会自动处理返回
  }
  
  /**
   * 清理资源
   */
  destroy(): void {
    if (process.env.TARO_ENV === 'h5') {
      window.removeEventListener('popstate', this.handlePopState)
    }
    this.initialized = false
  }
}

export const h5BackNavigationManager = new H5BackNavigationManager()
```

### 4. 小程序实现

小程序使用 Taro 的页面配置，在工作台页面隐藏导航栏返回按钮：

```typescript
// 工作台页面配置
export default definePageConfig({
  navigationBarTitleText: '工作台',
  // 使用自定义导航栏，隐藏默认返回按钮
  navigationStyle: 'custom'
})
```

或者使用 `disableSwipeBack` 禁用左滑返回：

```typescript
export default definePageConfig({
  disableSwipeBack: true
})
```

## Data Models

### 页面分类

```typescript
/**
 * 页面类型
 */
type PageType = 'dashboard' | 'normal' | 'login'

/**
 * 页面信息
 */
interface PageInfo {
  path: string
  type: PageType
  canGoBack: boolean
}

/**
 * 工作台页面路径
 */
const DASHBOARD_PATHS = [
  '/pages/index/index',
  '/pages/driver/index',
  '/pages/manager/index',
  '/pages/super-admin/index',
  '/pages/profile/index'
]

/**
 * 登录页面路径
 */
const LOGIN_PATH = '/pages/login/index'
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 普通页面返回行为

*For any* 普通页面（非工作台页面），当用户触发返回操作时，系统应该返回到页面栈中的上一页，且不显示任何提示。

**Validates: Requirements 1.1, 1.2**

### Property 2: 工作台页面阻止返回

*For any* 工作台页面，当用户触发返回操作时，系统应该阻止返回且不显示任何提示，无论触发多少次都保持阻止状态。

**Validates: Requirements 2.1, 2.3**

### Property 3: 工作台页面识别

*For any* 页面路径，`isDashboardPage()` 函数应该正确识别该路径是否属于工作台页面（5 个预定义路径之一）。

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 4: 平台一致性

*For any* 支持的平台（Android、H5、小程序），返回导航行为应该保持一致：普通页面正常返回，工作台页面阻止返回。

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### 错误场景

1. **WebView URL 获取失败（Android）**
   - 降级处理：假设当前不是工作台页面，允许返回
   
2. **History API 不可用（H5）**
   - 降级处理：不做任何处理，使用浏览器默认行为

3. **页面配置不生效（小程序）**
   - 降级处理：使用 onBackPress 生命周期作为备选

## Testing Strategy

### 单元测试

1. **isDashboardPage 函数测试**
   - 测试所有 5 个工作台路径返回 true
   - 测试普通页面路径返回 false
   - 测试边界情况（空字符串、null、undefined）

2. **H5BackNavigationManager 测试**
   - 测试初始化和清理
   - 测试 popstate 事件处理

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 3 测试**：生成随机路径，验证 isDashboardPage 的正确性

### 集成测试

1. **Android 测试**
   - 在真机上测试物理返回键行为
   - 验证工作台页面阻止返回
   - 验证普通页面正常返回

2. **H5 测试**
   - 在浏览器中测试返回按钮行为
   - 验证 History API 状态管理

3. **小程序测试**
   - 在微信开发者工具中测试
   - 验证导航栏返回按钮行为

## Implementation Notes

### Android 实现要点

1. 修改 `capacitor.config.ts`，设置 `backButtonBehavior: 'none'`
2. 修改 `MainActivity.java`，重写 `onBackPressed()` 方法
3. 在原生代码中判断当前 URL 是否是工作台页面

### H5 实现要点

1. 创建 `H5BackNavigationManager` 类
2. 在 `App.tsx` 中初始化
3. 使用 `popstate` 事件处理返回
4. 工作台页面重新 push 状态阻止返回

### 小程序实现要点

1. 在工作台页面配置中设置 `navigationStyle: 'custom'` 或 `disableSwipeBack: true`
2. 如果需要，使用 `onBackPress` 生命周期作为备选

### 移除旧代码

1. ✅ 简化 `useBackButtonBlock` Hook，移除双击退出逻辑
2. ✅ 移除工作台页面中的 `useBackButtonBlock` 调用（由全局管理器 h5BackNavigationManager 统一处理）
   - 已移除：`src/pages/driver/index.tsx`
   - 已移除：`src/pages/manager/index.tsx`
   - 已移除：`src/pages/super-admin/index.tsx`
   - 已移除：`src/pages/index/index.tsx`
   - 已移除：`src/pages/profile/index.tsx`
3. ✅ 保留登录页的 `useBackButtonBlock` 调用（登录页不在 DASHBOARD_PATHS 中，需要单独处理）
4. ✅ 更新 `useBackButtonBlock` Hook 注释，说明其主要用于登录页等特殊页面
