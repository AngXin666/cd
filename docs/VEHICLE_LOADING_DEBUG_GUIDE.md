# 车辆信息加载问题排查指南

## 问题描述

用户反馈：**无法加载司机录入的车辆信息**

## 已添加的调试日志

为了排查这个问题，我们在以下位置添加了详细的日志：

### 1. 前端页面日志（VehicleList）

**文件**：`src/pages/driver/vehicle-list/index.tsx`

**日志点**：

```typescript
// 1. 页面参数日志
logger.info('页面参数', {params})

// 2. 模式判断日志
logger.info('管理员查看模式', {targetDriverId: params.driverId})
logger.info('司机自己查看模式', {userId: user?.id})

// 3. 司机信息加载日志
logger.info('开始加载司机信息', {driverId})
logger.info('司机信息加载成功', {driverId, driverName: driver?.name})
logger.error('加载司机信息失败', error)

// 4. 车辆列表加载日志
logger.warn('无法加载车辆：缺少司机ID', {targetDriverId, userId: user?.id})
logger.info('开始加载车辆列表', {driverId, isManagerView})
logger.info('车辆列表加载成功', {
  driverId,
  vehicleCount: data.length,
  vehicles: data.map((v) => ({id: v.id, plate: v.plate_number}))
})
logger.error('加载车辆列表失败', error)
```

### 2. API函数日志（getDriverVehicles）

**文件**：`src/db/api.ts`

**日志点**：

```typescript
// 1. 开始查询日志
logger.info('开始查询司机车辆', {driverId})

// 2. 查询失败日志（包含详细错误信息）
logger.error('获取司机车辆失败', {
  error: error.message,
  code: error.code,
  details: error.details,
  hint: error.hint,
  driverId
})

// 3. 查询成功日志
logger.info(`成功获取司机车辆列表，共 ${data?.length || 0} 辆`, {
  driverId,
  count: data?.length,
  vehicleIds: data?.map((v) => v.id)
})

// 4. 异常日志
logger.error('获取司机车辆异常', {error, driverId})
```

## 如何查看日志

### 方法1：浏览器控制台（H5环境）

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 登录司机账号
4. 进入"车辆管理"页面
5. 查看控制台输出的日志

**日志格式**：
```
[INFO] [VehicleList] 页面参数 {params: {...}}
[INFO] [VehicleList] 司机自己查看模式 {userId: "xxx"}
[INFO] [VehicleList] 开始加载车辆列表 {driverId: "xxx", isManagerView: false}
[DB] [查询] vehicles {driverId: "xxx"}
[INFO] [API] 开始查询司机车辆 {driverId: "xxx"}
[INFO] [API] 成功获取司机车辆列表，共 1 辆 {driverId: "xxx", count: 1, vehicleIds: ["xxx"]}
[INFO] [VehicleList] 车辆列表加载成功 {driverId: "xxx", vehicleCount: 1, vehicles: [...]}
```

### 方法2：微信开发者工具（小程序环境）

1. 打开微信开发者工具
2. 切换到 Console 标签
3. 登录司机账号
4. 进入"车辆管理"页面
5. 查看控制台输出的日志

## 可能的问题原因

### 1. 用户ID不匹配

**症状**：
```
[WARN] [VehicleList] 无法加载车辆：缺少司机ID {targetDriverId: "", userId: undefined}
```

**原因**：
- 用户未登录
- 用户ID获取失败

**解决方案**：
- 检查登录状态
- 确认`useAuth`钩子正常工作

### 2. RLS策略权限问题

**症状**：
```
[ERROR] [API] 获取司机车辆失败 {
  error: "permission denied for table vehicles",
  code: "42501",
  driverId: "xxx"
}
```

**原因**：
- RLS策略配置错误
- 用户没有查询权限

**解决方案**：
```sql
-- 检查RLS策略
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vehicles';

-- 确认司机可以查看自己的车辆
-- 策略应该是：USING (uid() = user_id)
```

### 3. 数据不存在

**症状**：
```
[INFO] [API] 成功获取司机车辆列表，共 0 辆 {driverId: "xxx", count: 0}
[INFO] [VehicleList] 车辆列表加载成功 {driverId: "xxx", vehicleCount: 0, vehicles: []}
```

**原因**：
- 该司机确实没有录入车辆
- 车辆的`user_id`字段与司机ID不匹配

**解决方案**：
```sql
-- 检查该司机的车辆数据
SELECT id, user_id, plate_number, brand, model
FROM vehicles
WHERE user_id = '司机的UUID';

-- 如果没有数据，检查是否有其他user_id的车辆
SELECT id, user_id, plate_number, brand, model
FROM vehicles
ORDER BY created_at DESC
LIMIT 10;
```

### 4. 网络请求失败

**症状**：
```
[ERROR] [API] 获取司机车辆异常 {error: NetworkError, driverId: "xxx"}
```

**原因**：
- 网络连接问题
- Supabase服务不可用
- 环境变量配置错误

**解决方案**：
- 检查网络连接
- 确认`.env`文件中的`TARO_APP_SUPABASE_URL`和`TARO_APP_SUPABASE_ANON_KEY`配置正确
- 测试Supabase连接

### 5. 数据库字段不匹配

**症状**：
```
[ERROR] [API] 获取司机车辆失败 {
  error: "column \"user_id\" does not exist",
  code: "42703",
  driverId: "xxx"
}
```

**原因**：
- vehicles表没有`user_id`字段
- 字段名称错误（可能是`driver_id`）

**解决方案**：
```sql
-- 检查vehicles表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles';

-- 如果字段名是driver_id，需要修改API代码
-- 或者添加user_id字段
```

## 数据库验证

### 检查vehicles表结构

```sql
-- 查看表结构
\d vehicles

-- 或者
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;
```

### 检查RLS策略

```sql
-- 查看所有RLS策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'vehicles'
ORDER BY policyname;
```

### 检查现有数据

```sql
-- 查看所有车辆数据
SELECT 
  id,
  user_id,
  plate_number,
  brand,
  model,
  status,
  created_at
FROM vehicles
ORDER BY created_at DESC;

-- 查看特定司机的车辆
SELECT 
  v.id,
  v.user_id,
  v.plate_number,
  v.brand,
  v.model,
  p.name as driver_name,
  p.phone as driver_phone
FROM vehicles v
LEFT JOIN profiles p ON v.user_id = p.id
WHERE v.user_id = '司机的UUID';
```

### 测试RLS策略

```sql
-- 模拟司机用户查询
SET LOCAL request.jwt.claim.sub = '司机的UUID';

-- 尝试查询车辆
SELECT id, user_id, plate_number
FROM vehicles
WHERE user_id = '司机的UUID';

-- 重置
RESET request.jwt.claim.sub;
```

## 常见解决方案

### 方案1：修复RLS策略

如果RLS策略有问题，执行以下SQL：

```sql
-- 删除旧策略
DROP POLICY IF EXISTS "司机可以查看自己的车辆" ON vehicles;

-- 创建新策略
CREATE POLICY "司机可以查看自己的车辆" ON vehicles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### 方案2：修复字段名称

如果字段名称不匹配，有两个选择：

**选择A：修改API代码**

```typescript
// 在 src/db/api.ts 中
export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  const {data, error} = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverId)  // 改为driver_id
    .order('created_at', {ascending: false})
  // ...
}
```

**选择B：添加user_id字段**

```sql
-- 如果表中只有driver_id，添加user_id字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS user_id UUID;

-- 复制数据
UPDATE vehicles SET user_id = driver_id WHERE user_id IS NULL;

-- 添加外键约束
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

### 方案3：添加测试数据

如果没有测试数据，可以手动添加：

```sql
-- 插入测试车辆
INSERT INTO vehicles (
  user_id,
  plate_number,
  brand,
  model,
  color,
  vehicle_type,
  status
) VALUES (
  '司机的UUID',
  '粤A12345',
  '比亚迪',
  '秦PLUS DM-i',
  '白色',
  '小型轿车',
  'active'
);
```

## 测试步骤

### 1. 准备测试账号

```sql
-- 查找一个司机账号
SELECT id, phone, email, name, role
FROM profiles
WHERE role = 'driver'
LIMIT 1;
```

### 2. 确认该司机有车辆数据

```sql
-- 检查该司机的车辆
SELECT id, plate_number, brand, model
FROM vehicles
WHERE user_id = '司机的UUID';
```

### 3. 登录测试

1. 使用司机账号登录
2. 进入"车辆管理"页面
3. 查看控制台日志
4. 确认车辆列表显示

### 4. 分析日志

根据日志输出，判断问题所在：

- **如果没有任何日志**：页面可能没有加载，检查路由配置
- **如果有"缺少司机ID"警告**：用户ID获取失败，检查登录状态
- **如果有"权限拒绝"错误**：RLS策略问题，检查数据库策略
- **如果显示"0辆车"**：数据不存在或user_id不匹配，检查数据库数据
- **如果有网络错误**：检查Supabase配置和网络连接

## 快速诊断命令

```bash
# 1. 检查环境变量
cat .env | grep SUPABASE

# 2. 查看日志（浏览器控制台）
# 搜索关键词：VehicleList, getDriverVehicles, vehicles

# 3. 数据库快速检查
# 在Supabase Dashboard中执行：
SELECT 
  (SELECT COUNT(*) FROM vehicles) as total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE user_id IS NOT NULL) as vehicles_with_user_id,
  (SELECT COUNT(DISTINCT user_id) FROM vehicles) as unique_drivers;
```

## 预期的正常日志流程

```
1. [INFO] [VehicleList] 页面参数 {params: {}}
2. [INFO] [VehicleList] 司机自己查看模式 {userId: "xxx-xxx-xxx"}
3. [INFO] [VehicleList] 开始加载车辆列表 {driverId: "xxx-xxx-xxx", isManagerView: false}
4. [DB] [查询] vehicles {driverId: "xxx-xxx-xxx"}
5. [INFO] [API] 开始查询司机车辆 {driverId: "xxx-xxx-xxx"}
6. [INFO] [API] 成功获取司机车辆列表，共 N 辆 {driverId: "xxx", count: N, vehicleIds: [...]}
7. [INFO] [VehicleList] 车辆列表加载成功 {driverId: "xxx", vehicleCount: N, vehicles: [...]}
```

## 联系支持

如果按照以上步骤仍无法解决问题，请提供以下信息：

1. **完整的控制台日志**（从进入页面到加载完成）
2. **司机账号ID**（用于数据库查询）
3. **浏览器/小程序环境信息**
4. **错误截图**（如果有）

## 总结

通过添加详细的日志系统，我们可以：

1. ✅ 追踪数据加载的完整流程
2. ✅ 快速定位问题所在（前端/后端/数据库）
3. ✅ 获取详细的错误信息
4. ✅ 验证RLS策略是否正常工作
5. ✅ 确认数据是否存在

这些日志将帮助我们快速诊断和解决"无法加载司机录入的车辆信息"的问题。
