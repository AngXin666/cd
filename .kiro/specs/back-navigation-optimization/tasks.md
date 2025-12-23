# Implementation Plan - 返回导航优化

## 核心原则

**混合方案实现**：
- Android：使用 Capacitor 原生配置 + Android 原生代码
- H5：使用 History API
- 小程序：使用 Taro 页面配置

**行为规范**：
- 工作台页面（5 个）：阻止返回，用户使用系统手势退出
- 普通页面（50+ 个）：正常返回上一页，无提示

## 任务列表

- [x] 1. 创建工作台页面路径常量和判断函数
  - [x] 1.1 创建 `src/utils/navigation.ts` 文件
    - 定义 `DASHBOARD_PATHS` 常量（5 个工作台页面路径）
    - 实现 `isDashboardPage(path: string): boolean` 函数
    - 添加完整的 JSDoc 注释
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.2 编写 isDashboardPage 属性测试
    - **Property 3: 工作台页面识别**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 2. Android 原生实现
  - [x] 2.1 修改 Capacitor 配置
    - 修改 `capacitor.config.ts`
    - 设置 `android.backButtonBehavior: 'none'`
    - _Requirements: 3.1_

  - [x] 2.2 修改 Android MainActivity
    - 修改 `android/app/src/main/java/com/miaoda/fleet/v2/MainActivity.java`
    - 重写 `onBackPressed()` 方法
    - 实现 `isDashboardPage(String url)` 方法
    - 工作台页面：不做任何处理（阻止返回）
    - 普通页面：调用 `webView.goBack()`
    - _Requirements: 2.1, 2.3, 3.1, 4.1_

- [x] 3. H5 实现
  - [x] 3.1 创建 H5 返回导航管理器
    - 创建 `src/utils/h5BackNavigation.ts` 文件
    - 实现 `H5BackNavigationManager` 类
    - 使用 `popstate` 事件处理返回
    - 工作台页面：重新 push 状态阻止返回
    - 普通页面：浏览器默认处理
    - _Requirements: 2.1, 2.3, 3.2, 4.2_

  - [x] 3.2 在 App.tsx 中初始化 H5 返回管理器
    - 在 `initializePlatform` 函数中添加 H5 初始化
    - 调用 `h5BackNavigationManager.initialize()`
    - _Requirements: 3.2_

- [x] 4. 简化现有 useBackButtonBlock Hook
  - [x] 4.1 重构 useBackButtonBlock Hook
    - 修改 `src/hooks/useBackButtonBlock.ts`
    - 移除双击退出逻辑
    - 移除 Toast 提示
    - 移除左滑手势拦截（由全局管理器处理）
    - 保留 H5 环境的基本阻止返回功能（作为备选）
    - _Requirements: 2.1, 2.3_

  - [x] 4.2 更新工作台页面的 Hook 调用
    - 检查 `src/pages/driver/index.tsx` 中的 `useBackButtonBlock` 调用
    - 检查 `src/pages/index/index.tsx` 中的 `useBackButtonBlock` 调用
    - 确保调用方式与新实现兼容
    - _Requirements: 5.1, 5.4_

- [x] 5. Checkpoint - 验证 Android 和 H5 实现
  - 构建 H5 并测试返回行为
  - 构建 APK 并测试返回行为
  - 确保工作台页面阻止返回
  - 确保普通页面正常返回

- [x] 6. 小程序实现（可选）
  - [x] 6.1 配置工作台页面禁用返回
    - 检查 `src/pages/driver/index.config.ts` 等页面配置
    - 添加 `disableSwipeBack: true` 或 `navigationStyle: 'custom'`
    - _Requirements: 3.3, 4.3_

- [x] 7. 清理旧代码
  - [x] 7.1 移除不再需要的代码
    - 检查是否有其他页面使用 `useBackButtonBlock`
    - 移除不再需要的监听器代码
    - 更新相关注释和文档
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. 编写测试
  - [x] 8.1 编写 isDashboardPage 单元测试
    - 测试所有 5 个工作台路径
    - 测试普通页面路径
    - 测试边界情况
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.2 编写 H5BackNavigationManager 单元测试
    - 测试初始化和清理
    - 测试 popstate 事件处理
    - _Requirements: 3.2_

- [x] 9. Final Checkpoint - 全面测试
  - ✅ TypeScript 编译无错误
  - ✅ 单元测试全部通过（41 个测试用例）
  - ✅ H5 构建成功
  - ✅ 本地服务器启动成功（http://localhost:8080）
  - ✅ 代码实现完整性验证通过
  - ✅ 文档已更新

---

## 工作台页面列表

| 页面路径 | 页面名称 | 说明 |
|---------|---------|------|
| `/pages/index/index` | 路由分发页 | TabBar 页面 |
| `/pages/profile/index` | 个人中心 | TabBar 页面 |
| `/pages/driver/index` | 司机工作台 | 司机角色首页 |
| `/pages/manager/index` | 管理员工作台 | 管理员角色首页 |
| `/pages/super-admin/index` | 老板工作台 | 老板角色首页 |

## 预期效果

| 场景 | 当前行为 | 优化后行为 |
|------|---------|-----------|
| 普通页面按返回 | 返回上一页 | 返回上一页（无变化） |
| 工作台页面按返回 | 显示"再按一次退出" | 无反应（阻止返回） |
| 工作台页面退出 | 双击退出 | 使用系统手势退出 |
| 返回提示 | 显示 Toast | 无提示 |

## 验证检查点

每个阶段完成后必须验证：
1. TypeScript 编译无错误
2. 单元测试全部通过
3. H5 环境返回行为正确
4. Android 环境返回行为正确
5. 无功能回归
