# 多租户架构快速开始指南

## 概述

本指南帮助您快速部署和使用车队管家小程序的多租户数据隔离架构。

## 前置条件

- ✅ 已有 Supabase 项目
- ✅ 已配置 Supabase 连接信息
- ✅ 已有基本的用户认证系统

## 部署步骤

### 步骤1：应用数据库迁移（5分钟）

#### 方法A：使用 Supabase CLI（推荐）

```bash
# 1. 确保已安装 Supabase CLI
supabase --version

# 2. 链接到您的项目
supabase link --project-ref your-project-ref

# 3. 应用迁移
supabase db push
```

#### 方法B：使用 Supabase Dashboard

1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 依次执行以下 SQL 文件：

**第一步：添加 created_by 字段**
```sql
-- 复制并执行 supabase/migrations/027_add_created_by_fields.sql 的内容
```

**第二步：更新 RLS 策略**
```sql
-- 复制并执行 supabase/migrations/028_update_rls_policies_for_multi_tenant.sql 的内容
```

### 步骤2：验证迁移（2分钟）

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 1. 检查 created_by 字段是否添加成功
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE column_name = 'created_by' 
AND table_schema = 'public'
ORDER BY table_name;

-- 2. 检查 RLS 是否启用
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'warehouses', 'categories', 'attendance_records', 
  'piece_work_records', 'leave_applications', 'vehicles',
  'vehicle_leases', 'driver_licenses'
);

-- 3. 检查辅助函数是否创建成功
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_current_user_id', 'get_user_role', 
  'is_super_admin_user', 'is_manager_user',
  'can_access_warehouse', 'can_access_resource'
);
```

**预期结果**：
- ✅ 应该看到 8 个表都有 `created_by` 字段
- ✅ 所有表的 `rowsecurity` 都是 `true`
- ✅ 所有辅助函数都存在

### 步骤3：测试基本功能（5分钟）

#### 3.1 测试数据隔离

以不同角色登录，测试数据访问：

**测试账号**：
| 角色 | 手机号 | 密码 | 登录账号 |
|------|--------|------|----------|
| 超级管理员 | 13800000001 | 123456 | admin |
| 管理员 | 13800000002 | 123456 | manager01 |
| 司机 | 13800000003 | 123456 | driver01 |

**测试步骤**：

1. **以司机身份登录**
   - 应该只能看到自己的考勤记录
   - 应该只能看到自己的计件记录
   - 应该只能看到自己的车辆

2. **以管理员身份登录**
   - 应该能看到管理仓库下的所有数据
   - 应该能创建和修改仓库数据

3. **以超级管理员身份登录**
   - 应该能看到所有数据
   - 应该能管理所有资源

#### 3.2 测试创建数据

在 Supabase Dashboard 的 SQL Editor 中测试：

```sql
-- 1. 以司机身份创建考勤记录（应该自动设置 created_by）
-- 先获取司机ID
SELECT id FROM profiles WHERE role = 'driver' LIMIT 1;

-- 使用司机ID登录后，插入数据
-- created_by 应该自动设置为当前用户ID
```

#### 3.3 测试权限检查

在小程序中测试：

```typescript
import {useTenant} from '@/contexts/TenantContext'

// 在任意组件中
const {userId, role, isSuperAdmin} = useTenant()
console.log('当前用户:', userId)
console.log('用户角色:', role)
console.log('是否管理员:', isSuperAdmin)
```

## 使用示例

### 示例1：在组件中使用租户上下文

```typescript
import {View, Text} from '@tarojs/components'
import {useTenant} from '@/contexts/TenantContext'

const MyComponent: React.FC = () => {
  const {userId, role, isSuperAdmin, loading} = useTenant()
  
  if (loading) {
    return <Text>加载中...</Text>
  }
  
  if (!userId) {
    return <Text>请先登录</Text>
  }
  
  return (
    <View>
      <Text>欢迎，{role === 'super_admin' ? '超级管理员' : role === 'manager' ? '车队长' : '司机'}</Text>
      {isSuperAdmin && <Text>您拥有最高权限</Text>}
    </View>
  )
}
```

### 示例2：创建数据时自动添加 created_by

```typescript
import {addCreatedBy} from '@/db/tenant-utils'
import {supabase} from '@/client/supabase'
import Taro from '@tarojs/taro'

// 创建考勤记录
async function createAttendanceRecord(data: {
  driver_id: string
  warehouse_id: string
  date: string
  status: string
}) {
  try {
    // 自动添加 created_by 字段
    const recordData = await addCreatedBy(data)
    
    const {data: record, error} = await supabase
      .from('attendance_records')
      .insert(recordData)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    Taro.showToast({
      title: '创建成功',
      icon: 'success'
    })
    
    return record
  } catch (error) {
    console.error('创建考勤记录失败:', error)
    Taro.showToast({
      title: '创建失败',
      icon: 'error'
    })
    throw error
  }
}
```

### 示例3：检查权限

```typescript
import {useTenant} from '@/contexts/TenantContext'
import {View, Text} from '@tarojs/components'

const UserDetailPage: React.FC<{userId: string}> = ({userId}) => {
  const {canAccessUser} = useTenant()
  
  // 检查是否有权限访问该用户的数据
  if (!canAccessUser(userId)) {
    return (
      <View className="p-4">
        <Text className="text-red-500">无权访问该用户信息</Text>
      </View>
    )
  }
  
  // 显示用户信息
  return (
    <View className="p-4">
      {/* 用户详情 */}
    </View>
  )
}
```

### 示例4：使用数据访问拦截器

```typescript
import {DataAccessInterceptor} from '@/db/tenant-utils'
import {supabase} from '@/client/supabase'

// 获取考勤记录（带日志记录）
async function getAttendanceRecords(warehouseId: string) {
  return DataAccessInterceptor.intercept(
    async () => {
      const {data, error} = await supabase
        .from('attendance_records')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('date', {ascending: false})
      
      if (error) {
        throw error
      }
      
      return data || []
    },
    {
      table: 'attendance_records',
      action: 'select'
    }
  )
}
```

## 常见问题

### Q1: 迁移失败怎么办？

**A:** 检查以下几点：
1. 确保 Supabase 连接正常
2. 确保有足够的权限执行 DDL 操作
3. 检查是否有语法错误
4. 查看 Supabase Dashboard 的日志

如果仍然失败，可以尝试：
```sql
-- 回滚迁移（如果需要）
-- 删除 created_by 字段
ALTER TABLE warehouses DROP COLUMN IF EXISTS created_by;
-- 重复其他表...
```

### Q2: 查询返回空数据？

**A:** 可能是 RLS 策略过滤了数据。检查：
1. 用户是否已登录
2. 用户角色是否正确
3. 数据的 created_by 字段是否正确

调试方法：
```sql
-- 临时禁用 RLS 查看所有数据
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;

-- 查询数据
SELECT * FROM attendance_records;

-- 重新启用 RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
```

### Q3: 如何添加新表？

**A:** 按照以下步骤：

1. 创建表时添加 created_by 字段：
```sql
CREATE TABLE my_new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

2. 创建索引：
```sql
CREATE INDEX idx_my_new_table_created_by ON my_new_table(created_by);
```

3. 创建触发器：
```sql
CREATE TRIGGER set_my_new_table_created_by
  BEFORE INSERT ON my_new_table
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();
```

4. 创建 RLS 策略：
```sql
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

-- SELECT 策略
CREATE POLICY "用户查看自己的数据" ON my_new_table
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_super_admin_user(auth.uid()));

-- INSERT 策略
CREATE POLICY "用户创建数据" ON my_new_table
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
```

### Q4: 性能问题？

**A:** 优化建议：

1. **使用索引**：
```sql
-- 为常用查询创建复合索引
CREATE INDEX idx_table_warehouse_created_by 
  ON table_name(warehouse_id, created_by);
```

2. **使用缓存**：
```typescript
import {getUserRoleCached} from '@/db/tenant-utils'

// 使用缓存版本
const role = await getUserRoleCached(userId)
```

3. **批量操作**：
```typescript
import {addCreatedByBatch} from '@/db/tenant-utils'

// 批量插入
const records = await addCreatedByBatch([...])
await supabase.from('table').insert(records)
```

### Q5: 如何回滚？

**A:** 如果需要回滚：

1. **禁用 RLS 策略**（不删除）：
```sql
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
-- 重复其他表...
```

2. **保留 created_by 字段**（不影响功能）

3. **恢复旧的应用代码**（如果需要）

## 下一步

### 短期任务
- [ ] 更新现有 API 函数使用 `addCreatedBy`
- [ ] 在关键页面使用 `useTenant` Hook
- [ ] 执行功能测试

### 中期任务
- [ ] 全面更新所有 API 函数
- [ ] 全面更新所有组件
- [ ] 添加单元测试和集成测试

### 长期任务
- [ ] 监控数据访问日志
- [ ] 优化性能瓶颈
- [ ] 定期安全审计

## 相关文档

- 📖 [架构设计方案](MULTI_TENANT_ARCHITECTURE.md) - 详细的技术设计
- 📖 [开发指南](MULTI_TENANT_GUIDE.md) - API 参考和最佳实践
- 📖 [实施总结](MULTI_TENANT_IMPLEMENTATION.md) - 实施细节和验证清单
- 📖 [任务清单](MULTI_TENANT_TODO.md) - 进度跟踪

## 获取帮助

如果遇到问题：

1. 查看 [开发指南](MULTI_TENANT_GUIDE.md) 的常见问题部分
2. 查看 Supabase Dashboard 的日志
3. 检查浏览器控制台的错误信息
4. 查看数据库的 RLS 策略配置

---

**祝您使用愉快！** 🎉

如有任何问题，请参考详细文档或联系技术支持。
