# 老板唯一标识（boss_id）系统实施方案

## 一、项目概述

### 1.1 目标
实现基于 boss_id 的完整多租户数据隔离系统，确保不同老板的数据完全隔离，防止数据泄露和越权访问。

### 1.2 核心原则
- **数据隔离**：所有数据必须按 boss_id 隔离
- **安全第一**：防止任何跨租户数据访问
- **性能优化**：使用索引优化查询性能
- **向后兼容**：平滑迁移现有数据

## 二、boss_id 设计规范

### 2.1 标识符格式
```
BOSS_{timestamp}_{random8digits}
```

**示例**：
- `BOSS_1732291200000_12345678`
- `BOSS_1732291200001_87654321`

### 2.2 生成算法
```typescript
function generateBossId(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return `BOSS_${timestamp}_${random}`
}
```

### 2.3 唯一性保证
- **时间戳**：毫秒级时间戳确保时间唯一性
- **随机数**：8位随机数确保同一毫秒内的唯一性
- **数据库约束**：boss_id 字段添加唯一索引

## 三、数据库改造方案

### 3.1 需要添加 boss_id 的表

#### 核心表
- ✅ `profiles` - 用户资料表
- ✅ `warehouses` - 仓库表

#### 关联表
- ✅ `driver_warehouses` - 司机-仓库关联表
- ✅ `manager_warehouses` - 管理员-仓库关联表

#### 业务表
- ✅ `attendance` - 考勤记录表
- ✅ `attendance_rules` - 考勤规则表
- ✅ `piece_work_records` - 计件记录表
- ✅ `category_prices` - 价格分类表
- ✅ `leave_applications` - 请假申请表
- ✅ `resignation_applications` - 离职申请表
- ✅ `vehicles` - 车辆表
- ✅ `vehicle_records` - 车辆记录表
- ✅ `driver_licenses` - 驾驶证表
- ✅ `feedback` - 反馈表
- ✅ `notifications` - 通知表

### 3.2 字段定义
```sql
boss_id TEXT NOT NULL DEFAULT 'BOSS_DEFAULT'
```

**说明**：
- 类型：TEXT（支持自定义格式）
- 非空：NOT NULL（确保所有数据都有租户标识）
- 默认值：'BOSS_DEFAULT'（用于数据迁移，后续会更新）

### 3.3 索引策略
```sql
-- 为每个表的 boss_id 创建索引
CREATE INDEX idx_{table_name}_boss_id ON {table_name}(boss_id);

-- 为常用查询创建复合索引
CREATE INDEX idx_{table_name}_boss_id_created_at ON {table_name}(boss_id, created_at);
```

## 四、数据迁移方案

### 4.1 迁移策略

#### 步骤 1：识别现有租户
```sql
-- 查找所有超级管理员（每个超级管理员代表一个租户）
SELECT id, name, phone, email 
FROM profiles 
WHERE role = 'super_admin'::user_role;
```

#### 步骤 2：为每个租户生成 boss_id
```sql
-- 创建 boss_id 生成函数
CREATE OR REPLACE FUNCTION generate_boss_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  timestamp_part BIGINT;
  random_part TEXT;
  boss_id TEXT;
BEGIN
  -- 获取当前时间戳（毫秒）
  timestamp_part := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- 生成8位随机数
  random_part := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
  
  -- 组合生成 boss_id
  boss_id := 'BOSS_' || timestamp_part || '_' || random_part;
  
  RETURN boss_id;
END;
$$;
```

#### 步骤 3：为超级管理员分配 boss_id
```sql
-- 为每个超级管理员生成并分配 boss_id
UPDATE profiles
SET boss_id = generate_boss_id()
WHERE role = 'super_admin'::user_role AND boss_id = 'BOSS_DEFAULT';
```

#### 步骤 4：为下属用户分配 boss_id
```sql
-- 为管理员分配其所属超级管理员的 boss_id
-- 通过 manager_warehouses 关联找到管理员所属的仓库
-- 再通过仓库找到对应的超级管理员

-- 为司机分配其所属超级管理员的 boss_id
-- 通过 driver_warehouses 关联找到司机所属的仓库
-- 再通过仓库找到对应的超级管理员
```

#### 步骤 5：为业务数据分配 boss_id
```sql
-- 为每个业务表的数据分配 boss_id
-- 根据数据的创建者或关联用户来确定 boss_id

-- 示例：为请假申请分配 boss_id
UPDATE leave_applications la
SET boss_id = (
  SELECT p.boss_id 
  FROM profiles p 
  WHERE p.id = la.driver_id
)
WHERE la.boss_id = 'BOSS_DEFAULT';
```

### 4.2 数据完整性验证
```sql
-- 验证所有表都没有 BOSS_DEFAULT 的数据
SELECT 
  'profiles' as table_name, 
  COUNT(*) as default_count 
FROM profiles 
WHERE boss_id = 'BOSS_DEFAULT'
UNION ALL
SELECT 
  'warehouses', 
  COUNT(*) 
FROM warehouses 
WHERE boss_id = 'BOSS_DEFAULT'
-- ... 其他表
;
```

## 五、RLS 策略更新方案

### 5.1 核心原则
- 所有查询都必须包含 boss_id 过滤
- 用户只能访问自己租户的数据
- 超级管理员只能访问自己租户的数据

### 5.2 获取当前用户 boss_id 的函数
```sql
CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT boss_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

### 5.3 RLS 策略模板

#### 查询策略（SELECT）
```sql
CREATE POLICY "Users can only view their tenant data" ON {table_name}
  FOR SELECT
  USING (boss_id = get_current_user_boss_id());
```

#### 插入策略（INSERT）
```sql
CREATE POLICY "Users can only insert into their tenant" ON {table_name}
  FOR INSERT
  WITH CHECK (boss_id = get_current_user_boss_id());
```

#### 更新策略（UPDATE）
```sql
CREATE POLICY "Users can only update their tenant data" ON {table_name}
  FOR UPDATE
  USING (boss_id = get_current_user_boss_id())
  WITH CHECK (boss_id = get_current_user_boss_id());
```

#### 删除策略（DELETE）
```sql
CREATE POLICY "Users can only delete their tenant data" ON {table_name}
  FOR DELETE
  USING (boss_id = get_current_user_boss_id());
```

### 5.4 特殊表的策略

#### profiles 表
```sql
-- 超级管理员可以查看和管理自己租户的所有用户
CREATE POLICY "Super admin can manage tenant users" ON profiles
  FOR ALL
  USING (
    boss_id = get_current_user_boss_id() AND
    (
      auth.uid() = id OR  -- 自己
      is_super_admin(auth.uid())  -- 或者是超级管理员
    )
  );

-- 管理员可以查看自己租户的用户
CREATE POLICY "Manager can view tenant users" ON profiles
  FOR SELECT
  USING (
    boss_id = get_current_user_boss_id() AND
    (
      auth.uid() = id OR  -- 自己
      is_admin(auth.uid())  -- 或者是管理员
    )
  );

-- 普通用户只能查看自己
CREATE POLICY "Users can view themselves" ON profiles
  FOR SELECT
  USING (
    boss_id = get_current_user_boss_id() AND
    auth.uid() = id
  );
```

## 六、应用层改造方案

### 6.1 租户上下文管理

#### 创建租户上下文
```typescript
// src/contexts/TenantContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/db/supabase'

interface TenantContextValue {
  bossId: string | null
  loading: boolean
  error: Error | null
}

const TenantContext = createContext<TenantContextValue>({
  bossId: null,
  loading: true,
  error: null
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bossId, setBossId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadBossId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setBossId(null)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('boss_id')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setBossId(data.boss_id)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadBossId()
  }, [])

  return (
    <TenantContext.Provider value={{ bossId, loading, error }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
```

#### 在 App.tsx 中使用
```typescript
import { TenantProvider } from '@/contexts/TenantContext'

const App: React.FC = ({ children }) => {
  return (
    <AuthProvider client={supabase}>
      <TenantProvider>
        {children}
      </TenantProvider>
    </AuthProvider>
  )
}
```

### 6.2 数据库查询改造

#### 创建查询包装函数
```typescript
// src/db/tenantQuery.ts
import { supabase } from './supabase'

/**
 * 获取当前用户的 boss_id
 */
export async function getCurrentUserBossId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('boss_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data.boss_id
}

/**
 * 创建带租户过滤的查询构建器
 */
export async function createTenantQuery<T>(tableName: string) {
  const bossId = await getCurrentUserBossId()
  if (!bossId) {
    throw new Error('无法获取租户标识，请重新登录')
  }

  return supabase
    .from(tableName)
    .select('*')
    .eq('boss_id', bossId)
}

/**
 * 插入数据时自动添加 boss_id
 */
export async function insertWithTenant<T>(
  tableName: string,
  data: Omit<T, 'boss_id'>
): Promise<{ data: T | null; error: any }> {
  const bossId = await getCurrentUserBossId()
  if (!bossId) {
    return {
      data: null,
      error: new Error('无法获取租户标识，请重新登录')
    }
  }

  return supabase
    .from(tableName)
    .insert({ ...data, boss_id: bossId })
    .select()
    .single()
}
```

#### 使用示例
```typescript
// 查询数据
const { data, error } = await createTenantQuery('warehouses')

// 插入数据
const { data, error } = await insertWithTenant('warehouses', {
  name: '北京仓库',
  address: '北京市朝阳区'
})
```

### 6.3 修改现有 API 函数

#### 示例：修改 getWarehouses 函数
```typescript
// 修改前
export async function getWarehouses() {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 修改后
export async function getWarehouses() {
  const bossId = await getCurrentUserBossId()
  if (!bossId) throw new Error('无法获取租户标识')

  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('boss_id', bossId)  // ✅ 添加租户过滤
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
```

## 七、实施步骤

### 阶段 1：数据库改造（第1-2天）
- [x] 创建 boss_id 生成函数
- [ ] 为所有表添加 boss_id 字段
- [ ] 创建索引
- [ ] 为现有数据生成 boss_id

### 阶段 2：数据迁移（第3天）
- [ ] 识别现有租户（超级管理员）
- [ ] 为每个租户生成唯一的 boss_id
- [ ] 迁移用户数据
- [ ] 迁移业务数据
- [ ] 验证数据完整性

### 阶段 3：RLS 策略更新（第4天）
- [ ] 创建 get_current_user_boss_id 函数
- [ ] 更新所有表的 RLS 策略
- [ ] 测试数据隔离效果
- [ ] 测试跨租户访问防护

### 阶段 4：应用层改造（第5-6天）
- [ ] 创建租户上下文管理
- [ ] 创建查询包装函数
- [ ] 修改所有数据库查询
- [ ] 添加权限验证中间件

### 阶段 5：测试验证（第7天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 安全测试

## 八、风险控制

### 8.1 数据备份
- 在开始迁移前，完整备份数据库
- 在每个阶段完成后，创建检查点

### 8.2 回滚方案
- 保留原有的 RLS 策略
- 如果出现问题，可以快速回滚

### 8.3 灰度发布
- 先在测试环境完整测试
- 在生产环境分阶段发布
- 监控系统性能和错误日志

## 九、性能优化

### 9.1 索引优化
```sql
-- 为常用查询创建复合索引
CREATE INDEX idx_warehouses_boss_id_is_active 
ON warehouses(boss_id, is_active);

CREATE INDEX idx_profiles_boss_id_role 
ON profiles(boss_id, role);
```

### 9.2 查询优化
- 使用 EXPLAIN ANALYZE 分析查询性能
- 避免全表扫描
- 使用适当的索引

### 9.3 缓存策略
- 缓存用户的 boss_id
- 缓存常用的租户数据
- 使用 Redis 作为缓存层

## 十、监控和审计

### 10.1 操作日志
```sql
-- 创建操作日志表
CREATE TABLE tenant_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_tenant_operation_logs_boss_id 
ON tenant_operation_logs(boss_id, created_at);
```

### 10.2 异常监控
- 监控跨租户访问尝试
- 监控 boss_id 验证失败
- 监控性能异常

### 10.3 审计报告
- 定期生成租户数据统计报告
- 定期审计数据隔离效果
- 定期检查安全漏洞

## 十一、总结

### 11.1 核心价值
- ✅ **数据安全**：完全隔离不同租户的数据
- ✅ **权限控制**：防止跨租户数据访问
- ✅ **可扩展性**：支持无限数量的租户
- ✅ **性能优化**：通过索引优化查询性能

### 11.2 关键技术
- **boss_id 生成**：时间戳 + 随机数确保唯一性
- **RLS 策略**：数据库层面的数据隔离
- **租户上下文**：应用层的租户管理
- **查询包装**：自动添加租户过滤条件

### 11.3 后续工作
- 持续监控系统性能
- 定期审计数据隔离效果
- 优化查询性能
- 完善异常处理机制
