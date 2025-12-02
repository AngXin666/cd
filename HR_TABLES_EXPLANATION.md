# 人事管理表详细说明

## 概述

车队管家系统中的人事管理模块包含2个核心表，用于管理员工的请假和离职申请流程。

## 1. leave_applications（请假申请表）

### 表的作用
管理司机和员工的请假申请，支持完整的请假审批流程。

### 使用频率
**21次** - 在代码中被频繁使用，是核心业务表之一

### 表结构

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | 是 | gen_random_uuid() | 申请记录唯一标识 |
| user_id | uuid | 是 | - | 申请人ID（关联users表） |
| warehouse_id | uuid | 是 | - | 所属仓库ID（关联warehouses表） |
| leave_type | enum | 是 | - | 请假类型 |
| start_date | date | 是 | - | 请假开始日期 |
| end_date | date | 是 | - | 请假结束日期 |
| days | numeric | 是 | - | 请假天数 |
| reason | text | 是 | - | 请假原因 |
| status | enum | 是 | 'pending' | 审批状态 |
| reviewed_by | uuid | 否 | - | 审批人ID（关联users表） |
| reviewed_at | timestamptz | 否 | - | 审批时间 |
| review_notes | text | 否 | - | 审批备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

### 请假类型（leave_type）
- **personal** - 事假
- **sick** - 病假
- **annual** - 年假
- **other** - 其他

### 审批状态（status）
- **pending** - 待审批
- **approved** - 已批准
- **rejected** - 已拒绝

### 主要功能

#### 1. 司机端功能
**页面：** `src/pages/driver/leave/apply/index.tsx`

- **快捷请假模式**
  - 支持1-7天的快捷选择
  - 自动计算请假天数
  - 实时显示本月已请假天数
  - 检查是否超过月度请假限制

- **自定义请假模式**
  - 自由选择开始和结束日期
  - 自动计算请假天数
  - 支持跨月请假

- **请假类型选择**
  - 事假、病假、年假、其他
  - 不同类型可能有不同的审批规则

- **草稿功能**
  - 支持保存草稿
  - 支持编辑草稿
  - 支持删除草稿

#### 2. 管理端功能
**页面：** 各角色的通知和审批页面

- **审批流程**
  - 车队长可以审批本仓库的请假申请
  - 超级管理员可以审批所有请假申请
  - 支持批准/拒绝操作
  - 可以添加审批备注

- **查询功能**
  - 按用户查询请假记录
  - 按仓库查询请假记录
  - 查询所有请假记录
  - 查询当天已批准的请假

#### 3. 统计功能
**使用场景：** 仪表盘、考勤管理

- **月度统计**
  - 统计本月已批准的请假天数
  - 统计本月待审批的请假天数
  - 检查是否超过月度限制

- **实时查询**
  - 查询用户当天是否有已批准的请假
  - 用于考勤打卡时的状态判断

### 相关API函数

```typescript
// 创建请假申请
createLeaveApplication(application: LeaveApplicationInput): Promise<string>

// 更新草稿
updateDraftLeaveApplication(draftId: string, updates: Partial<LeaveApplicationInput>): Promise<boolean>

// 删除草稿
deleteDraftLeaveApplication(draftId: string): Promise<boolean>

// 查询用户的请假记录
getLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]>

// 查询仓库的请假记录
getLeaveApplicationsByWarehouse(warehouseId: string): Promise<LeaveApplication[]>

// 查询所有请假记录
getAllLeaveApplications(): Promise<LeaveApplication[]>

// 审批请假申请
reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean>

// 查询当天已批准的请假
getApprovedLeaveForToday(userId: string): Promise<LeaveApplication | null>

// 统计月度请假天数
getMonthlyLeaveStats(userId: string, year: number, month: number): Promise<{approved: number, pending: number}>
```

### 业务规则

1. **月度限制**
   - 默认每月最多请假7天
   - 可以通过系统配置调整
   - 超过限制时会提示用户

2. **请假天数计算**
   - 包含开始日期和结束日期
   - 例如：1月1日到1月3日 = 3天

3. **审批权限**
   - 司机只能提交申请
   - 车队长可以审批本仓库的申请
   - 超级管理员可以审批所有申请

4. **通知机制**
   - 提交申请时通知管理员
   - 审批完成时通知申请人
   - 使用实时通知系统

---

## 2. resignation_applications（离职申请表）

### 表的作用
管理员工的离职申请，支持完整的离职审批流程。

### 使用频率
**10次** - 在代码中被使用，是重要的人事管理功能

### 表结构

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | 是 | gen_random_uuid() | 申请记录唯一标识 |
| user_id | uuid | 是 | - | 申请人ID（关联users表） |
| warehouse_id | uuid | 否 | - | 所属仓库ID（关联warehouses表） |
| resignation_date | date | 是 | - | 计划离职日期 |
| reason | text | 是 | - | 离职原因 |
| status | text | 是 | 'pending' | 审批状态 |
| reviewed_by | uuid | 否 | - | 审批人ID（关联users表） |
| reviewed_at | timestamptz | 否 | - | 审批时间 |
| review_notes | text | 否 | - | 审批备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

### 审批状态（status）
- **pending** - 待审批
- **approved** - 已批准
- **rejected** - 已拒绝

### 主要功能

#### 1. 司机端功能
**页面：** `src/pages/driver/leave/resign/index.tsx`

- **提交离职申请**
  - 选择计划离职日期
  - 填写离职原因
  - 提交申请

- **草稿功能**
  - 支持保存草稿
  - 支持编辑草稿
  - 支持删除草稿

- **查看申请状态**
  - 查看自己的离职申请记录
  - 查看审批状态
  - 查看审批备注

#### 2. 管理端功能

- **审批流程**
  - 车队长可以审批本仓库的离职申请
  - 超级管理员可以审批所有离职申请
  - 支持批准/拒绝操作
  - 可以添加审批备注

- **查询功能**
  - 按用户查询离职记录
  - 按仓库查询离职记录
  - 查询所有离职记录

#### 3. 人事管理
**使用场景：** 员工管理、人事统计

- **离职统计**
  - 统计离职人数
  - 分析离职原因
  - 生成离职报表

- **员工状态管理**
  - 离职批准后更新员工状态
  - 处理员工相关数据
  - 交接工作安排

### 相关API函数

```typescript
// 创建离职申请
createResignationApplication(application: ResignationApplicationInput): Promise<string>

// 更新草稿
updateDraftResignationApplication(draftId: string, updates: Partial<ResignationApplicationInput>): Promise<boolean>

// 删除草稿
deleteDraftResignationApplication(draftId: string): Promise<boolean>

// 查询用户的离职记录
getResignationApplicationsByUser(userId: string): Promise<ResignationApplication[]>

// 查询仓库的离职记录
getResignationApplicationsByWarehouse(warehouseId: string): Promise<ResignationApplication[]>

// 查询所有离职记录
getAllResignationApplications(): Promise<ResignationApplication[]>

// 审批离职申请
reviewResignationApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean>
```

### 业务规则

1. **离职日期**
   - 必须是未来的日期
   - 建议提前至少一周申请
   - 可以根据公司政策调整

2. **审批权限**
   - 司机只能提交申请
   - 车队长可以审批本仓库的申请
   - 超级管理员可以审批所有申请

3. **离职流程**
   - 提交申请 → 等待审批 → 批准/拒绝
   - 批准后需要进行工作交接
   - 处理员工相关的车辆、仓库等资源

4. **通知机制**
   - 提交申请时通知管理员
   - 审批完成时通知申请人
   - 使用实时通知系统

---

## 两个表的关系和区别

### 相似之处
1. **都是申请审批流程**
   - 都需要填写原因
   - 都需要管理员审批
   - 都有待审批/已批准/已拒绝三种状态

2. **都支持草稿功能**
   - 可以保存草稿
   - 可以编辑草稿
   - 可以删除草稿

3. **都有通知机制**
   - 提交时通知管理员
   - 审批时通知申请人

### 不同之处

| 特性 | 请假申请 | 离职申请 |
|------|---------|---------|
| **频率** | 经常使用（月度） | 偶尔使用（离职时） |
| **时间范围** | 开始日期+结束日期 | 单个离职日期 |
| **类型** | 4种类型（事假/病假/年假/其他） | 无类型分类 |
| **限制** | 有月度天数限制 | 无限制 |
| **影响** | 临时影响（几天） | 永久影响（离职） |
| **统计** | 需要月度统计 | 需要年度统计 |
| **仓库字段** | 必填 | 可选 |

---

## 在系统中的重要性

### 1. 考勤管理集成
- 请假申请与考勤系统紧密集成
- 已批准的请假会影响考勤统计
- 请假期间不需要打卡

### 2. 人事管理核心
- 这两个表是人事管理的核心
- 记录员工的请假和离职历史
- 为人事决策提供数据支持

### 3. 通知系统集成
- 申请提交和审批都会触发通知
- 使用实时通知系统
- 确保及时处理申请

### 4. 权限控制
- 不同角色有不同的操作权限
- 司机只能提交和查看自己的申请
- 管理员可以审批和查看所有申请

---

## 数据流程图

```
司机端：
  提交请假/离职申请
        ↓
  保存到数据库（status=pending）
        ↓
  发送通知给管理员
        ↓
  等待审批

管理端：
  收到通知
        ↓
  查看申请详情
        ↓
  审批（批准/拒绝）
        ↓
  更新数据库（status=approved/rejected）
        ↓
  发送通知给申请人
        ↓
  申请人收到审批结果
```

---

## 使用场景示例

### 场景1：司机请假
1. 司机打开"请假申请"页面
2. 选择请假类型（事假）
3. 选择请假天数（3天）
4. 填写请假原因
5. 提交申请
6. 系统保存到leave_applications表
7. 通知车队长审批
8. 车队长批准
9. 司机收到批准通知

### 场景2：员工离职
1. 员工打开"离职申请"页面
2. 选择离职日期
3. 填写离职原因
4. 提交申请
5. 系统保存到resignation_applications表
6. 通知超级管理员审批
7. 管理员审批并安排交接
8. 员工收到审批结果

---

## 总结

这两个人事管理表是车队管家系统中非常重要的功能模块：

1. **leave_applications（请假申请表）**
   - 使用频率高（21次）
   - 与考勤系统紧密集成
   - 支持多种请假类型
   - 有月度限制和统计功能

2. **resignation_applications（离职申请表）**
   - 使用频率适中（10次）
   - 管理员工离职流程
   - 影响员工状态管理
   - 为人事决策提供数据

两个表共同构成了完整的人事管理系统，支持从日常请假到员工离职的全流程管理。
