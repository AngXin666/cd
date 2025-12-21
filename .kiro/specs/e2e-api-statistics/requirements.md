# Requirements Document

## Introduction

司机端深度 E2E 测试脚本，测试每个功能模块的完整流程（从入口到最终界面），记录 API 调用和函数调用，并分析代码是否为最优解。

## Glossary

- **深度测试**: 进入每个功能的最终界面，如：车辆管理 → 车辆详情 → 编辑车辆
- **API 调用**: 页面发起的 Supabase 网络请求
- **函数调用**: 页面组件中调用的业务函数（通过 console.log 或代码注入追踪）
- **代码优化分析**: 根据 API 调用模式判断是否存在重复请求、N+1 查询等问题

## 司机端完整页面结构（来自 app.config.ts）

### 主包页面
- 登录页 `/pages/login/index`
- 工作台入口 `/pages/index/index`
- 个人中心 `/pages/profile/index`
- 司机工作台 `/pages/driver/index`

### 司机端分包 (packageDriver)
```
司机工作台 (/pages/driver/index)
│
├── 【快捷功能】
│   ├── 计件录入 (/pages/driver/piece-work-entry/index)
│   ├── 考勤打卡 (/pages/driver/clock-in/index)
│   └── 请假申请 (/pages/driver/leave/index)
│       ├── 申请请假 (/pages/driver/leave/apply/index)
│       └── 离职申请 (/pages/driver/leave/resign/index)
│
├── 【车辆管理】
│   └── 车辆列表 (/pages/driver/vehicle-list/index)
│       ├── 添加车辆 (/pages/driver/add-vehicle/index)
│       │   └── 驾照OCR (/pages/driver/license-ocr/index)
│       └── 车辆详情 (/pages/driver/vehicle-detail/index)
│           ├── 编辑车辆 (/pages/driver/edit-vehicle/index)
│           ├── 补充照片 (/pages/driver/supplement-photos/index)
│           └── 归还车辆 (/pages/driver/return-vehicle/index)
│
├── 【数据统计】
│   ├── 计件记录 (/pages/driver/piece-work/index)
│   ├── 仓库统计 (/pages/driver/warehouse-stats/index)
│   └── 考勤记录 (/pages/driver/attendance/index)
│
├── 【通知】
│   └── 通知中心 (/pages/driver/notifications/index)
│
└── 【个人】
    └── 个人资料 (/pages/driver/profile/index)
```

### 个人中心分包 (packageProfile)
```
个人中心 (/pages/profile/index)
├── 设置 (/pages/profile/settings/index)
├── 账号管理 (/pages/profile/account-management/index)
│   ├── 修改手机号 (/pages/profile/change-phone/index)
│   └── 修改密码 (/pages/profile/change-password/index)
├── 编辑姓名 (/pages/profile/edit-name/index)
├── 帮助中心 (/pages/profile/help/index)
└── 编辑资料 (/pages/profile/edit/index)
```

### 共享页面分包 (packageShared)
```
通知相关
├── 司机通知 (/pages/shared/driver-notification/index)
├── 通知模板 (/pages/shared/notification-templates/index)
├── 定时通知 (/pages/shared/scheduled-notifications/index)
├── 通知记录 (/pages/shared/notification-records/index)
└── 自动提醒规则 (/pages/shared/auto-reminder-rules/index)
```

## Requirements

### Requirement 1: 深度页面导航

**User Story:** As a 开发者, I want to 测试司机端每个功能的完整流程, so that 我可以验证所有页面都能正常访问。

#### Acceptance Criteria

1. WHEN 测试开始 THEN the System SHALL 自动登录司机账号
2. WHEN 进入功能模块 THEN the System SHALL 深入到最终界面（如：车辆管理→车辆详情→编辑车辆）
3. WHEN 到达最终界面 THEN the System SHALL 逐层返回到工作台
4. WHEN 页面有子功能 THEN the System SHALL 测试所有子功能入口

### Requirement 2: API 调用记录

**User Story:** As a 开发者, I want to 记录每个页面的 API 调用, so that 我可以分析 API 调用模式。

#### Acceptance Criteria

1. WHEN 进入页面 THEN the System SHALL 记录该页面触发的所有 API 调用
2. WHEN API 调用完成 THEN the System SHALL 记录表名、方法、状态码、耗时
3. WHEN 同一 API 被多次调用 THEN the System SHALL 标记为潜在优化点
4. WHEN 测试完成 THEN the System SHALL 按页面分组输出 API 调用统计

### Requirement 3: 函数调用追踪

**User Story:** As a 开发者, I want to 追踪页面的函数调用, so that 我可以了解页面的业务逻辑执行情况。

#### Acceptance Criteria

1. WHEN 页面加载 THEN the System SHALL 通过 console.log 捕获函数调用
2. WHEN 捕获到函数调用 THEN the System SHALL 记录函数名和调用时间
3. WHEN 测试完成 THEN the System SHALL 输出每个页面的函数调用列表

### Requirement 4: 代码优化分析

**User Story:** As a 开发者, I want to 根据测试结果分析代码优化空间, so that 我可以改进代码质量。

#### Acceptance Criteria

1. WHEN 同一 API 在同一页面被调用多次 THEN the System SHALL 标记为"重复请求"
2. WHEN 页面加载时 API 调用超过 10 次 THEN the System SHALL 标记为"请求过多"
3. WHEN API 响应时间超过 500ms THEN the System SHALL 标记为"慢请求"
4. WHEN 测试完成 THEN the System SHALL 输出优化建议报告
