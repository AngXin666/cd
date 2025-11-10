# 司机端仓库加载问题调试指南

## 问题描述
用户反映司机端无法加载所属仓库。

## 调试步骤

### 1. 准备工作
```bash
# 1. 以司机身份登录小程序
# 2. 打开浏览器开发者工具（F12）
# 3. 切换到 Console 标签
# 4. 清空控制台日志
```

### 2. 查看仓库加载日志

#### 2.1 检查 useDriverWarehouses Hook 日志
```
[useDriverWarehouses] 开始加载仓库列表，用户ID: <user_id>
[useDriverWarehouses] 仓库列表加载完成，数量: <count>
```

**正常情况：**
- 显示用户ID
- 显示仓库数量 > 0

**异常情况：**
- 用户ID为空或undefined
- 仓库数量为 0
- 出现错误日志

#### 2.2 检查 getDriverWarehouses API 日志
```
=== getDriverWarehouses 调用 ===
司机ID: <driver_id>
Supabase 查询响应 - data: [...]
Supabase 查询响应 - error: null
✅ 成功获取司机仓库，数量: <count>
仓库列表: [...]
```

**正常情况：**
- 司机ID不为空
- data 包含仓库记录
- error 为 null
- 仓库数量 > 0

**异常情况：**
- 司机ID为空
- data 为空数组 []
- error 不为 null
- 显示警告：⚠️ 未找到司机的仓库分配记录

#### 2.3 检查司机端页面状态日志
```
=== 司机端仓库状态 ===
用户ID: <user_id>
仓库加载中: false
仓库数量: <count>
仓库列表: [...]
```

**正常情况：**
- 用户ID不为空
- 仓库加载中为 false（加载完成）
- 仓库数量 > 0
- 仓库列表包含仓库对象

**异常情况：**
- 用户ID为空
- 仓库加载中一直为 true
- 仓库数量为 0
- 仓库列表为空数组 []

---

## 常见问题诊断

### 问题 1：用户ID为空
**症状：**
```
[useDriverWarehouses] 用户ID不存在
```

**原因：**
- 用户未登录
- 认证状态异常
- useAuth Hook 未正确初始化

**解决方案：**
1. 检查登录状态
2. 重新登录
3. 检查 AuthProvider 是否正确配置

---

### 问题 2：未找到仓库分配记录
**症状：**
```
⚠️ 未找到司机的仓库分配记录
```

**原因：**
- 司机未被分配到任何仓库
- driver_warehouses 表中没有该司机的记录

**解决方案：**
1. 检查数据库 driver_warehouses 表
```sql
SELECT * FROM driver_warehouses WHERE driver_id = '<user_id>';
```

2. 如果没有记录，需要超级管理员分配仓库：
   - 登录超级管理员账号
   - 进入"司机仓库分配"页面
   - 为该司机分配仓库

---

### 问题 3：权限错误
**症状：**
```
❌ 获取司机仓库失败 - Supabase 错误
错误详情: {
  "code": "PGRST...",
  "message": "permission denied"
}
```

**原因：**
- RLS 策略配置错误
- 司机没有查看权限

**解决方案：**
1. 检查 RLS 策略
```sql
-- 查看 driver_warehouses 表的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'driver_warehouses';
```

2. 确认策略包含：
```sql
-- 司机可以查看自己的仓库分配
CREATE POLICY "司机可以查看自己的仓库分配" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);
```

---

### 问题 4：仓库数据为 null
**症状：**
```
Supabase 查询响应 - data: [
  { warehouse_id: "xxx", warehouses: null }
]
```

**原因：**
- warehouses 表中的仓库记录被删除
- 外键关联失效

**解决方案：**
1. 检查 warehouses 表
```sql
SELECT w.* 
FROM driver_warehouses dw
LEFT JOIN warehouses w ON dw.warehouse_id = w.id
WHERE dw.driver_id = '<user_id>';
```

2. 如果仓库记录不存在，需要：
   - 删除无效的 driver_warehouses 记录
   - 重新分配有效的仓库

---

### 问题 5：仓库被禁用
**症状：**
- 查询返回仓库数据
- 但仓库的 is_active 字段为 false

**原因：**
- 仓库被超级管理员禁用

**解决方案：**
1. 检查仓库状态
```sql
SELECT id, name, is_active 
FROM warehouses 
WHERE id IN (
  SELECT warehouse_id 
  FROM driver_warehouses 
  WHERE driver_id = '<user_id>'
);
```

2. 如果仓库被禁用：
   - 联系超级管理员启用仓库
   - 或分配到其他启用的仓库

---

## 数据库检查 SQL

### 1. 检查司机的仓库分配
```sql
SELECT 
  dw.id,
  dw.driver_id,
  dw.warehouse_id,
  w.name as warehouse_name,
  w.is_active,
  dw.created_at
FROM driver_warehouses dw
LEFT JOIN warehouses w ON dw.warehouse_id = w.id
WHERE dw.driver_id = '<user_id>'
ORDER BY dw.created_at DESC;
```

### 2. 检查司机的角色
```sql
SELECT id, name, phone, role, login_account
FROM profiles
WHERE id = '<user_id>';
```

### 3. 检查所有启用的仓库
```sql
SELECT id, name, address, is_active
FROM warehouses
WHERE is_active = true
ORDER BY name;
```

### 4. 检查 RLS 策略
```sql
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
WHERE tablename = 'driver_warehouses';
```

---

## 手动修复步骤

### 场景 1：司机没有仓库分配

**步骤：**
1. 以超级管理员身份登录
2. 进入"司机仓库分配"页面
3. 选择司机
4. 选择要分配的仓库
5. 点击"保存"

**或使用 SQL：**
```sql
-- 为司机分配仓库
INSERT INTO driver_warehouses (driver_id, warehouse_id)
VALUES ('<user_id>', '<warehouse_id>');
```

### 场景 2：仓库被禁用

**步骤：**
1. 以超级管理员身份登录
2. 进入"仓库管理"页面
3. 找到被禁用的仓库
4. 点击"启用"按钮

**或使用 SQL：**
```sql
-- 启用仓库
UPDATE warehouses
SET is_active = true
WHERE id = '<warehouse_id>';
```

### 场景 3：清除缓存

**步骤：**
1. 在司机端页面下拉刷新
2. 或退出登录后重新登录
3. 或清除浏览器缓存

**或使用代码：**
```javascript
// 在浏览器控制台执行
Taro.clearStorageSync()
location.reload()
```

---

## 验证修复

### 1. 检查日志
```
✅ 成功获取司机仓库，数量: 1
仓库列表: [
  {
    id: "xxx",
    name: "总部仓库",
    address: "xxx",
    is_active: true
  }
]
```

### 2. 检查页面显示
- 司机端首页应该显示仓库切换器（如果有多个仓库）
- 数据仪表盘应该正常显示统计数据
- 不应该有加载错误提示

### 3. 测试仓库切换
- 如果司机有多个仓库，尝试切换仓库
- 确认统计数据随仓库切换而更新
- 确认没有错误日志

---

## 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. **用户信息：**
   - 用户ID
   - 用户角色
   - 登录账号

2. **控制台日志：**
   - 完整的 Console 日志截图
   - 特别是包含 "getDriverWarehouses" 和 "useDriverWarehouses" 的日志

3. **数据库查询结果：**
   ```sql
   SELECT * FROM driver_warehouses WHERE driver_id = '<user_id>';
   SELECT * FROM profiles WHERE id = '<user_id>';
   ```

4. **错误信息：**
   - 完整的错误堆栈
   - Supabase 错误详情

---

## 相关文档
- [仓库管理功能](./WAREHOUSE_SYSTEM_OPTIMIZATION.md)
- [司机端功能](./DRIVER_OPTIMIZATION_FEATURE.md)
- [权限配置](./WAREHOUSE_PERMISSION_FIX_REPORT.md)

---

## 更新日志
- 2025-11-05: 添加详细调试日志和诊断指南
