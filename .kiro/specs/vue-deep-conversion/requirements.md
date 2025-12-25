# Requirements Document

## Introduction

本需求文档定义了将原有 Taro/React 项目的所有页面深度转换为 Vue 3 版本的需求。转换需要保持完全一致的 UI 布局和所有功能，包括统计、搜索、快捷选择、筛选、排序等所有交互功能。

## Glossary

- **Taro**: 原有项目使用的多端开发框架（React 技术栈）
- **UniApp**: 新项目使用的多端开发框架（Vue 3 技术栈）
- **深度转换**: 不仅转换 UI 布局，还要转换所有功能逻辑、交互行为、状态管理
- **快捷筛选**: 预设的日期范围筛选按钮（今天/本周/本月/前一天/后一天）
- **拼音搜索**: 支持通过拼音首字母搜索中文内容的功能
- **用户偏好**: 保存用户上次选择的仓库、品类、日期等设置

## Requirements

### Requirement 1: 计件录入页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的计件录入界面, so that 我可以无缝切换到新系统并保持相同的操作习惯。

#### Acceptance Criteria

1. WHEN 司机打开计件录入页面 THEN the system SHALL 显示司机类型标签（带车司机/纯司机）在标题卡片右上角
2. WHEN 司机今日已打卡 THEN the system SHALL 自动选择打卡的仓库作为默认仓库
3. WHEN 司机选择仓库和品类后 THEN the system SHALL 根据司机类型自动加载对应的单价配置
4. WHEN 管理员已设置单价 THEN the system SHALL 锁定单价输入框并显示"管理员已设置"提示
5. WHEN 司机再次打开页面 THEN the system SHALL 恢复上次选择的仓库、品类和工作日期
6. WHEN 司机提交计件记录且存在相同日期仓库品类的记录 THEN the system SHALL 弹出对话框询问是累计还是新增
7. WHEN 司机未打卡就尝试提交 THEN the system SHALL 显示打卡提醒弹窗并提供跳转打卡页面的选项
8. WHEN 司机在请假中尝试提交 THEN the system SHALL 显示休假提示并阻止提交

### Requirement 2: 计件记录页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的计件记录查看界面, so that 我可以方便地查看、编辑和删除我的计件记录。

#### Acceptance Criteria

1. WHEN 司机打开计件记录页面 THEN the system SHALL 显示快捷筛选按钮组（今天/本周/本月/后一天）
2. WHEN 司机点击快捷筛选按钮 THEN the system SHALL 高亮选中的按钮并更新日期范围
3. WHEN 司机点击"后一天"按钮 THEN the system SHALL 基于当前结束日期计算并显示后一天的日期
4. WHEN 司机选择仓库筛选 THEN the system SHALL 过滤显示该仓库的计件记录
5. WHEN 司机点击排序按钮 THEN the system SHALL 切换日期升序/降序排列
6. WHEN 司机点击编辑按钮 THEN the system SHALL 显示编辑表单并预填充当前记录数据
7. WHEN 司机保存编辑 THEN the system SHALL 显示二次确认对话框后更新记录
8. WHEN 司机点击删除按钮 THEN the system SHALL 显示详细的删除确认对话框（包含仓库、品类、件数、金额信息）
9. WHEN 页面显示记录列表 THEN the system SHALL 显示醒目的日期标签卡片（蓝色渐变背景）
10. WHEN 记录包含上楼或分拣 THEN the system SHALL 显示对应的标签和金额明细

### Requirement 3: 数据汇总页面深度转换

**User Story:** As a 车队长或老板, I want 使用与原有系统完全一致的数据汇总界面, so that 我可以查看所有司机的计件统计数据。

#### Acceptance Criteria

1. WHEN 管理员打开数据汇总页面 THEN the system SHALL 显示仓库选择器（包含"所有仓库"选项）
2. WHEN 管理员输入司机搜索关键词 THEN the system SHALL 支持姓名、手机号和拼音首字母匹配
3. WHEN 搜索关键词变化 THEN the system SHALL 实时过滤司机列表并重置选中的司机
4. WHEN 管理员选择日期范围 THEN the system SHALL 显示快捷筛选按钮（前一天/本周/本月）
5. WHEN 管理员点击快捷筛选按钮 THEN the system SHALL 高亮选中的按钮并更新日期范围
6. WHEN 页面加载数据 THEN the system SHALL 显示总件数和总金额统计卡片
7. WHEN 存在计件记录 THEN the system SHALL 显示按品类分组的统计数据
8. WHEN 显示记录列表 THEN the system SHALL 包含司机姓名、仓库、品类、标签和金额信息
9. WHEN 老板角色访问 THEN the system SHALL 显示所有仓库的数据
10. WHEN 车队长角色访问 THEN the system SHALL 只显示管辖仓库的数据

### Requirement 4: 司机首页深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的首页界面, so that 我可以快速访问常用功能和查看今日统计。

#### Acceptance Criteria

1. WHEN 司机打开首页 THEN the system SHALL 显示今日打卡状态卡片
2. WHEN 司机今日已打卡 THEN the system SHALL 显示打卡时间和仓库信息
3. WHEN 司机今日未打卡 THEN the system SHALL 显示"未打卡"状态和打卡按钮
4. WHEN 页面加载 THEN the system SHALL 显示今日计件统计（件数和金额）
5. WHEN 页面加载 THEN the system SHALL 显示本月计件统计（件数和金额）
6. WHEN 司机点击统计卡片 THEN the system SHALL 跳转到对应的计件记录页面（带日期范围参数）
7. WHEN 页面加载 THEN the system SHALL 显示功能入口网格（计件录入、计件记录、请假申请等）

### Requirement 5: 车队长首页深度转换

**User Story:** As a 车队长, I want 使用与原有系统完全一致的首页界面, so that 我可以快速查看团队统计和管理功能。

#### Acceptance Criteria

1. WHEN 车队长打开首页 THEN the system SHALL 显示管辖仓库的今日统计
2. WHEN 页面加载 THEN the system SHALL 显示今日出勤人数和计件总量
3. WHEN 页面加载 THEN the system SHALL 显示待审批数量（请假申请）
4. WHEN 车队长点击统计卡片 THEN the system SHALL 跳转到对应的详情页面
5. WHEN 页面加载 THEN the system SHALL 显示功能入口网格（数据汇总、司机管理、审批等）

### Requirement 6: 老板首页深度转换

**User Story:** As a 老板, I want 使用与原有系统完全一致的首页界面, so that 我可以全面了解公司运营数据。

#### Acceptance Criteria

1. WHEN 老板打开首页 THEN the system SHALL 显示全公司的今日统计
2. WHEN 页面加载 THEN the system SHALL 显示今日出勤人数、计件总量和总金额
3. WHEN 页面加载 THEN the system SHALL 显示待审批数量（请假、车辆审核）
4. WHEN 老板点击统计卡片 THEN the system SHALL 跳转到对应的详情页面
5. WHEN 页面加载 THEN the system SHALL 显示完整的功能入口网格（用户管理、仓库管理、车辆管理等）

### Requirement 7: 考勤记录页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的考勤记录界面, so that 我可以查看我的打卡历史。

#### Acceptance Criteria

1. WHEN 司机打开考勤记录页面 THEN the system SHALL 显示快捷筛选按钮（今天/本周/本月）
2. WHEN 司机选择日期范围 THEN the system SHALL 过滤显示对应日期的考勤记录
3. WHEN 页面加载 THEN the system SHALL 显示出勤统计（出勤天数、迟到次数等）
4. WHEN 显示考勤记录 THEN the system SHALL 包含日期、仓库、上班时间、下班时间和工时

### Requirement 8: 通用组件和工具函数转换

**User Story:** As a 开发者, I want 转换所有通用组件和工具函数, so that 所有页面可以复用相同的功能。

#### Acceptance Criteria

1. WHEN 需要拼音搜索功能 THEN the system SHALL 提供 matchWithPinyin 工具函数
2. WHEN 需要日期格式化 THEN the system SHALL 提供与原系统一致的日期格式化函数
3. WHEN 需要用户偏好存储 THEN the system SHALL 提供 localStorage 封装函数
4. WHEN 需要删除确认 THEN the system SHALL 提供 confirmDelete 工具函数
5. WHEN 需要打卡检查 THEN the system SHALL 提供 canStartPieceWork 工具函数

### Requirement 9: 考勤打卡页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的打卡界面, so that 我可以方便地进行上下班打卡。

#### Acceptance Criteria

1. WHEN 司机打开打卡页面 THEN the system SHALL 显示当前日期和实时时间
2. WHEN 司机今日已打卡 THEN the system SHALL 显示绿色的"今天已打卡"状态卡片，包含打卡时间和仓库信息
3. WHEN 司机今日未打卡 THEN the system SHALL 显示仓库选择列表，必须选择仓库才能打卡
4. WHEN 司机选择仓库 THEN the system SHALL 显示该仓库的考勤规则（上班时间、下班时间、是否需要打下班卡）
5. WHEN 司机点击上班打卡按钮 THEN the system SHALL 创建打卡记录并显示打卡成功弹窗（包含时间、状态、仓库）
6. WHEN 司机已打上班卡且仓库需要打下班卡 THEN the system SHALL 显示下班打卡按钮
7. WHEN 司机点击下班打卡按钮 THEN the system SHALL 更新打卡记录并显示工作时长
8. WHEN 司机在请假中 THEN the system SHALL 显示"今天休假，无需打卡"并禁用打卡按钮
9. WHEN 页面加载 THEN the system SHALL 显示今天的打卡记录卡片（上班打卡时间、下班打卡时间、状态标签）
10. WHEN 页面加载 THEN the system SHALL 显示温馨提示卡片（打卡规则说明）

### Requirement 10: 请假记录页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的请假记录界面, so that 我可以查看我的请假申请历史和审批状态。

#### Acceptance Criteria

1. WHEN 司机打开请假记录页面 THEN the system SHALL 显示本月数据统计卡片（出勤天数、请假天数、剩余额度）
2. WHEN 司机打开请假记录页面 THEN the system SHALL 显示快捷操作按钮（申请请假、申请离职）
3. WHEN 司机有审核中的请假申请 THEN the system SHALL 禁用"申请请假"按钮并显示"请假审批中"
4. WHEN 司机有审核中的离职申请 THEN the system SHALL 禁用"申请离职"按钮并显示"离职审批中"
5. WHEN 页面加载 THEN the system SHALL 显示标签切换（请假申请/离职申请/草稿箱）
6. WHEN 司机切换到请假申请标签 THEN the system SHALL 显示请假申请列表（类型、日期、天数、状态、审批意见）
7. WHEN 司机切换到离职申请标签 THEN the system SHALL 显示离职申请列表（离职日期、原因、状态、审批意见）
8. WHEN 司机切换到草稿箱标签 THEN the system SHALL 显示草稿列表（支持继续编辑和删除）
9. WHEN 司机点击申请记录 THEN the system SHALL 显示申请详情弹窗
10. WHEN 收到审批结果 THEN the system SHALL 实时刷新数据并显示通知

### Requirement 11: 请假申请页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的请假申请界面, so that 我可以方便地提交请假或离职申请。

#### Acceptance Criteria

1. WHEN 司机打开请假申请页面 THEN the system SHALL 显示模式切换（快捷请假/补请假）
2. WHEN 司机选择快捷请假模式 THEN the system SHALL 显示快捷日期选择按钮（明天/后天）
3. WHEN 司机选择快捷请假模式 THEN the system SHALL 显示请假天数选择器（基于剩余额度限制可选天数）
4. WHEN 司机选择补请假模式 THEN the system SHALL 允许选择今天及之前的日期
5. WHEN 司机有多个仓库 THEN the system SHALL 显示仓库选择器并记住上次选择
6. WHEN 页面加载 THEN the system SHALL 显示月度请假统计（已批准天数、待审批天数、本次申请天数、累计/上限）
7. WHEN 累计天数超过月度上限 THEN the system SHALL 显示红色警告并阻止提交
8. WHEN 司机有已批准的请假覆盖明天 THEN the system SHALL 自动将开始日期调整为最早可用日期
9. WHEN 司机填写完表单 THEN the system SHALL 显示确认提交对话框（包含日期范围和天数）
10. WHEN 司机点击保存草稿 THEN the system SHALL 保存草稿并返回上一页

### Requirement 12: 车辆列表页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的车辆列表界面, so that 我可以查看和管理我的车辆信息。

#### Acceptance Criteria

1. WHEN 司机打开车辆列表页面 THEN the system SHALL 显示司机名下的所有车辆
2. WHEN 页面加载 THEN the system SHALL 显示车辆卡片（车牌号、车辆类型、状态标签）
3. WHEN 车辆有证件即将到期 THEN the system SHALL 显示到期提醒标签
4. WHEN 司机点击车辆卡片 THEN the system SHALL 跳转到车辆详情页面
5. WHEN 司机点击添加车辆按钮 THEN the system SHALL 跳转到添加车辆页面

### Requirement 13: 车辆详情页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的车辆详情界面, so that 我可以查看车辆的完整信息和证件状态。

#### Acceptance Criteria

1. WHEN 司机打开车辆详情页面 THEN the system SHALL 显示车辆基本信息（车牌号、车辆类型、品牌型号）
2. WHEN 页面加载 THEN the system SHALL 显示证件信息卡片（行驶证、保险、年检等到期日期）
3. WHEN 证件即将到期（30天内） THEN the system SHALL 显示黄色警告标签
4. WHEN 证件已过期 THEN the system SHALL 显示红色过期标签
5. WHEN 司机点击编辑按钮 THEN the system SHALL 跳转到编辑车辆页面
6. WHEN 司机点击补充照片按钮 THEN the system SHALL 跳转到补充照片页面

### Requirement 14: 添加/编辑车辆页面深度转换

**User Story:** As a 司机, I want 使用与原有系统完全一致的车辆编辑界面, so that 我可以添加或修改车辆信息。

#### Acceptance Criteria

1. WHEN 司机打开添加车辆页面 THEN the system SHALL 显示空白表单
2. WHEN 司机打开编辑车辆页面 THEN the system SHALL 预填充现有车辆信息
3. WHEN 页面加载 THEN the system SHALL 显示车牌号输入框（必填）
4. WHEN 页面加载 THEN the system SHALL 显示车辆类型选择器
5. WHEN 页面加载 THEN the system SHALL 显示证件日期选择器（行驶证到期、保险到期、年检到期）
6. WHEN 司机点击OCR识别按钮 THEN the system SHALL 跳转到行驶证OCR识别页面
7. WHEN 司机提交表单 THEN the system SHALL 验证必填字段并创建/更新车辆记录
