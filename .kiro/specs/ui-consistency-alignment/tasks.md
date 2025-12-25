# Implementation Plan

## 1. 创建主题变量和基础样式

- [x] 1. 创建主题变量和基础样式
  - [x] 1.1 创建统一的主题变量文件
    - 在 `fleet-manager/frontend/src/styles/` 目录创建 `theme.scss`
    - 定义蓝色主题变量（$theme-primary: #1E3A8A 等）
    - 定义统计卡片颜色变量
    - 定义背景渐变变量
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 创建图标映射工具
    - 在 `fleet-manager/frontend/src/utils/` 目录创建 `iconMapping.ts`
    - 定义 Emoji 到 UnoCSS 图标的映射
    - 导出图标获取函数
    - _Requirements: 7.1, 7.3_
  - [ ]* 1.3 编写主题变量属性测试
    - **Property 1: 颜色主题一致性**
    - **Validates: Requirements 1.1, 1.2, 1.3**

## 2. 创建通知铃铛组件

- [x] 2. 创建通知铃铛组件
  - [x] 2.1 创建 NotificationBell 组件
    - 在 `fleet-manager/frontend/src/components/NotificationBell/` 目录创建组件
    - 实现未读通知数量显示
    - 实现徽章显示逻辑（>99 显示 99+）
    - 实现点击跳转到通知列表
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.2 编写通知徽章属性测试
    - **Property 2: 通知徽章显示规则**
    - **Validates: Requirements 2.2, 2.4**

## 3. 创建实时通知栏组件

- [x] 3. 创建实时通知栏组件
  - [x] 3.1 创建 RealNotificationBar 组件
    - 在 `fleet-manager/frontend/src/components/RealNotificationBar/` 目录创建组件
    - 实现通知滚动显示
    - 实现点击跳转到详情页
    - 实现无通知时隐藏
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.2 编写通知栏条件渲染属性测试
    - **Property 3: 通知栏条件渲染**
    - **Validates: Requirements 3.4**

## 4. 创建仓库切换器组件

- [x] 4. 创建仓库切换器组件
  - [x] 4.1 创建 WarehouseSwitcher 组件
    - 在 `fleet-manager/frontend/src/components/WarehouseSwitcher/` 目录创建组件
    - 实现 Swiper 滑动切换（多仓库）
    - 实现单仓库卡片显示
    - 实现无仓库提示
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ]* 4.2 编写仓库切换器条件渲染属性测试
    - **Property 4: 仓库切换器条件渲染**
    - **Validates: Requirements 4.1, 4.3, 4.4**

## 5. 创建数据仪表盘组件

- [x] 5. 创建数据仪表盘组件
  - [x] 5.1 创建 Dashboard 组件
    - 在 `fleet-manager/frontend/src/components/Dashboard/` 目录创建组件
    - 实现 2x2 网格布局
    - 实现四个统计卡片（今天出勤、今天总件数、待审批、本月完成件数）
    - 实现卡片点击跳转
    - 实现加载状态显示
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 5.2 编写加载状态属性测试
    - **Property 6: 加载状态显示**
    - **Validates: Requirements 5.4**

## 6. 创建司机实时状态统计组件

- [x] 6. 创建司机实时状态统计组件
  - [x] 6.1 创建 DriverStats 组件
    - 在 `fleet-manager/frontend/src/components/DriverStats/` 目录创建组件
    - 实现 4 列网格布局（总数、在线、已计件、未计件）
    - 实现点击跳转到司机管理页面
    - _Requirements: 6.1, 6.2, 6.4_

## 7. 创建顶部导航栏组件

- [x] 7. 创建顶部导航栏组件
  - [x] 7.1 创建 TopNavBar 组件
    - 在 `fleet-manager/frontend/src/components/TopNavBar/` 目录创建组件
    - 实现页面标题显示
    - 实现返回按钮
    - 实现右侧操作按钮
    - _Requirements: 9.1, 9.2, 9.3_

## 8. Checkpoint - 确保所有组件测试通过

- [x] 8. Checkpoint - 确保所有组件测试通过
  - 运行所有组件的单元测试
  - 确保所有测试通过，如有问题询问用户

## 9. 更新车队长首页

- [x] 9. 更新车队长首页
  - [x] 9.1 更新车队长首页颜色主题
    - 修改 `fleet-manager/frontend/src/pages/manager/index/index.vue`
    - 将绿色渐变改为蓝色渐变
    - 应用统一的主题变量
    - _Requirements: 1.1_
  - [x] 9.2 集成通知铃铛组件
    - 在欢迎卡片右下角添加 NotificationBell 组件
    - _Requirements: 2.1_
  - [x] 9.3 集成实时通知栏组件
    - 在欢迎卡片下方添加 RealNotificationBar 组件
    - _Requirements: 3.1_
  - [x] 9.4 集成仓库切换器组件
    - 添加 WarehouseSwitcher 组件
    - 实现仓库切换时数据更新
    - _Requirements: 4.1, 4.2_
  - [ ]* 9.5 编写仓库切换数据更新属性测试
    - **Property 5: 仓库切换数据更新**
    - **Validates: Requirements 4.2**
  - [x] 9.6 替换数据仪表盘
    - 使用 Dashboard 组件替换现有的统计卡片
    - 调整为 2x2 网格布局
    - _Requirements: 5.1, 5.2_
  - [x] 9.7 添加司机实时状态统计
    - 添加 DriverStats 组件
    - _Requirements: 6.1, 6.2_
  - [x] 9.8 更新快捷功能布局
    - 调整为 2x3 网格布局
    - 图标保持 Emoji 方案（项目未配置 UnoCSS）
    - _Requirements: 7.1, 10.1_
  - [ ]* 9.9 编写图标类名格式属性测试
    - **Property 7: 图标类名格式**
    - **Validates: Requirements 7.1, 7.3**
  - [x] 9.10 集成顶部导航栏
    - 车队长首页作为工作台主页，不需要返回按钮和顶部导航栏
    - 页面标题已在欢迎卡片中显示
    - _Requirements: 9.1_

## 10. 更新老板端首页

- [x] 10. 更新老板端首页
  - [x] 10.1 更新老板端首页颜色主题
    - 修改 `fleet-manager/frontend/src/pages/boss/index/index.vue`
    - 将紫色渐变改为蓝色渐变
    - 应用统一的主题变量
    - _Requirements: 1.2_
  - [x] 10.2 集成通知铃铛组件
    - 在欢迎卡片右下角添加 NotificationBell 组件
    - _Requirements: 2.1_
  - [x] 10.3 集成实时通知栏组件
    - 在欢迎卡片下方添加 RealNotificationBar 组件
    - _Requirements: 3.1_
  - [x] 10.4 集成仓库切换器组件
    - 添加 WarehouseSwitcher 组件
    - 实现仓库切换时数据更新
    - _Requirements: 4.1, 4.2_
  - [x] 10.5 替换数据仪表盘
    - 使用 Dashboard 组件替换现有的统计卡片
    - 调整为 2x2 网格布局
    - _Requirements: 5.1, 5.2_
  - [x] 10.6 更新快捷功能布局
    - 调整为 2x4 网格布局
    - 替换 Emoji 图标为 UnoCSS 图标
    - _Requirements: 7.1, 10.2_
  - [ ]* 10.7 编写待处理徽章属性测试
    - **Property 8: 待处理徽章显示**
    - **Validates: Requirements 10.4**
  - [x] 10.8 集成顶部导航栏
    - 添加 TopNavBar 组件
    - _Requirements: 9.1_

## 11. Checkpoint - 确保首页更新测试通过

- [x] 11. Checkpoint - 确保首页更新测试通过
  - 运行首页相关的单元测试
  - 确保所有测试通过，如有问题询问用户

## 12. 补充缺失页面

- [x] 12. 补充缺失页面
  - [x] 12.1 创建件数报表详情页
    - 在 `fleet-manager/frontend/src/pages/manager/piece-work/` 目录创建 `detail.vue`
    - 实现件数详情展示
    - _Requirements: 8.1_
  - [x] 12.2 创建仓库品类配置页
    - 在 `fleet-manager/frontend/src/pages/manager/` 目录创建 `warehouse-categories/index.vue`
    - 实现品类配置功能
    - _Requirements: 8.2_
  - [x] 12.3 创建仓库编辑页
    - 在 `fleet-manager/frontend/src/pages/boss/warehouses/` 目录创建 `edit.vue`
    - 实现仓库信息编辑
    - _Requirements: 8.3_
  - [x] 12.4 创建车辆租金编辑页
    - 在 `fleet-manager/frontend/src/pages/boss/vehicles/` 目录创建 `rental-edit.vue`
    - 实现车辆租金编辑
    - _Requirements: 8.4_
  - [x] 12.5 创建请假详情页
    - 在 `fleet-manager/frontend/src/pages/manager/approval/` 目录创建 `leave-detail.vue`
    - 在 `fleet-manager/frontend/src/pages/boss/approval/` 目录创建 `leave-detail.vue`
    - 实现请假详情展示
    - _Requirements: 8.5_

## 13. 更新路由配置

- [x] 13. 更新路由配置
  - [x] 13.1 更新 pages.json 路由配置
    - 添加新页面的路由配置
    - 确保所有页面可正常访问
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## 14. Final Checkpoint - 确保所有测试通过

- [x] 14. Final Checkpoint - 确保所有测试通过
  - 运行所有测试
  - 确保所有测试通过，如有问题询问用户
