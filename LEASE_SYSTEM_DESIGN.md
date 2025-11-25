# 租赁系统设计文档

## 业务理解

### 系统定位
车队管家小程序是一个SaaS产品，租赁系统是管理租用该小程序的客户（老板账号）的管理端。

### 业务场景
1. 不同的车队老板可以租用车队管家小程序来管理自己的车队
2. 每个老板账号代表一个独立的租户（tenant）
3. 租赁管理员（15766121960）负责管理这些租用小程序的老板账号
4. 租赁管理员只需要管理老板账号本身，不需要查看每个老板下面的司机、车辆等数据

## 核心功能

### 1. 老板账号管理（核心功能）
- **新增老板账号**：创建新的租户，包括基本信息、联系方式、公司信息等
- **查看老板账号列表**：显示所有租户的基本信息和状态
- **修改老板账号**：编辑老板的基本信息（姓名、电话、公司名称等）
- **停用老板账号**：暂时禁用该租户的使用权限，老板无法登录
- **删除老板账号**：永久删除该租户（需要二次确认）

### 2. 租赁系统用户管理
管理租赁管理员团队成员（如果有多个租赁管理员的话）

### 3. 租赁核销功能
- **查看待核销账单**：显示所有待核销的租金账单
- **核销操作**：对账单进行核销处理
- **核销历史**：查看历史核销记录

## 数据库设计

### 1. profiles表扩展
在现有的profiles表中添加字段：

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lease_start_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lease_end_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN profiles.status IS '账号状态：active(正常), suspended(停用), deleted(已删除)';
COMMENT ON COLUMN profiles.company_name IS '公司名称（仅老板账号）';
COMMENT ON COLUMN profiles.lease_start_date IS '租赁开始日期（仅老板账号）';
COMMENT ON COLUMN profiles.lease_end_date IS '租赁结束日期（仅老板账号）';
COMMENT ON COLUMN profiles.monthly_fee IS '月租费用（仅老板账号）';
COMMENT ON COLUMN profiles.notes IS '备注信息';
```

### 2. 租赁账单表（lease_bills）
记录每个老板的租金账单：

```sql
CREATE TABLE lease_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  bill_month text NOT NULL, -- 账单月份，格式：2025-01
  amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending', -- pending(待核销), verified(已核销), cancelled(已取消)
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lease_bills_tenant_id ON lease_bills(tenant_id);
CREATE INDEX idx_lease_bills_status ON lease_bills(status);
CREATE INDEX idx_lease_bills_bill_month ON lease_bills(bill_month);

COMMENT ON TABLE lease_bills IS '租赁账单表';
COMMENT ON COLUMN lease_bills.tenant_id IS '租户ID（老板账号）';
COMMENT ON COLUMN lease_bills.bill_month IS '账单月份';
COMMENT ON COLUMN lease_bills.amount IS '账单金额';
COMMENT ON COLUMN lease_bills.status IS '账单状态：pending(待核销), verified(已核销), cancelled(已取消)';
COMMENT ON COLUMN lease_bills.verified_at IS '核销时间';
COMMENT ON COLUMN lease_bills.verified_by IS '核销人ID';
```

### 3. RLS策略
租赁管理员可以查看和管理所有老板账号：

```sql
-- 租赁管理员可以查看所有老板账号
CREATE POLICY "租赁管理员查看所有老板账号" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_lease_admin_user(auth.uid())
    AND role = 'super_admin'
  );

-- 租赁管理员可以管理所有账单
CREATE POLICY "租赁管理员管理所有账单" ON lease_bills
  FOR ALL TO authenticated
  USING (is_lease_admin_user(auth.uid()));
```

## 页面设计

### 1. 租赁端工作台（/pages/lease-admin/index.tsx）
显示关键统计信息：
- 老板账号总数
- 活跃账号数
- 停用账号数
- 待核销账单数
- 本月新增账号数
- 本月核销金额

快速操作：
- 新增老板账号
- 查看老板列表
- 待核销账单
- 核销历史

最近记录：
- 最近新增的老板账号
- 最近核销的账单

### 2. 老板账号列表（/pages/lease-admin/tenant-list/index.tsx）
功能：
- 显示所有老板账号（role='super_admin'的用户）
- 搜索：按姓名、电话、公司名称搜索
- 筛选：按状态筛选（全部/正常/停用）
- 操作：查看详情、编辑、停用/启用、删除

列表字段：
- 姓名
- 电话
- 公司名称
- 租赁期限
- 月租费用
- 状态
- 操作按钮

### 3. 新增/编辑老板账号（/pages/lease-admin/tenant-form/index.tsx）
表单字段：
- 姓名（必填）
- 电话（必填）
- 登录账号（必填，新增时）
- 初始密码（必填，新增时）
- 公司名称
- 租赁开始日期
- 租赁结束日期
- 月租费用
- 备注

### 4. 老板账号详情（/pages/lease-admin/tenant-detail/index.tsx）
显示信息：
- 基本信息
- 租赁信息
- 账单历史
- 操作日志

### 5. 核销管理（/pages/lease-admin/verification/index.tsx）
功能：
- 待核销账单列表
- 核销操作
- 核销历史记录

## 权限设计

### 租赁管理员权限
- ✅ 查看所有老板账号（role='super_admin'的用户）
- ✅ 创建新的老板账号
- ✅ 编辑老板账号信息
- ✅ 停用/启用老板账号
- ✅ 删除老板账号
- ✅ 查看所有账单
- ✅ 核销账单
- ❌ 不能查看每个老板下面的司机、车辆等数据

## 实施步骤

### 阶段1：数据库改造
1. 扩展profiles表，添加status、company_name等字段
2. 创建lease_bills表
3. 更新RLS策略

### 阶段2：类型定义和API
1. 更新Profile类型定义
2. 添加LeaseBill类型定义
3. 创建租赁相关API函数

### 阶段3：页面开发
1. 重构租赁端工作台
2. 创建老板账号列表页面
3. 创建老板账号表单页面
4. 创建老板账号详情页面
5. 创建核销管理页面

### 阶段4：测试验证
1. 测试老板账号CRUD功能
2. 测试停用/启用功能
3. 测试核销功能
4. 测试权限控制
