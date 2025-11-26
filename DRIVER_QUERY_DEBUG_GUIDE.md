# 司机查询问题调试指南

## 问题现状

**用户反馈**：老板和车队长无法查看名下的司机

**数据库验证结果**：✅ 数据库层面完全正常
- RLS 策略正确
- 权限函数正常
- 数据完整且正确
- 模拟查询成功

## 数据库验证详情

### 1. 数据验证

**查询结果**：
```sql
SELECT id, name, role, boss_id FROM profiles 
WHERE boss_id = 'BOSS_1764145957063_29235549';
```

| 角色 | 数量 | boss_id 匹配 |
|------|------|-------------|
| 司机 (driver) | 5 | ✅ |
| 车队长 (manager) | 2 | ✅ |
| 老板 (super_admin) | 1 | ✅ |

### 2. 权限函数验证

**is_admin() 函数测试**：
- 车队长：✅ 返回 true
- 老板：✅ 返回 true
- 司机：✅ 返回 false

**can_view_profile() 函数测试**：
- 车队长查看司机：✅ 返回 true
- 老板查看司机：✅ 返回 true
- 司机查看其他司机：✅ 返回 false

### 3. RLS 策略验证

**当前策略**：
```sql
CREATE POLICY "Users can view profiles based on permissions" ON profiles
  FOR SELECT TO authenticated
  USING (can_view_profile(auth.uid(), id, boss_id));
```

**策略逻辑**：
1. 使用 `can_view_profile` 函数判断权限
2. 函数使用 `SECURITY DEFINER`，避免递归
3. 逻辑：同租户 AND (管理员 OR 查看自己)

**模拟测试结果**：✅ 所有测试通过

---

## 问题分析

### 可能的原因

由于数据库层面完全正常，问题可能出在：

#### 1. 前端缓存问题 ⚠️

**症状**：
- 数据库有数据，但前端显示为空
- 刷新页面后仍然看不到数据

**可能原因**：
- 浏览器缓存了旧的查询结果
- 应用层缓存（localStorage/sessionStorage）
- Supabase 客户端缓存

**解决方案**：
```javascript
// 1. 清除浏览器缓存
localStorage.clear();
sessionStorage.clear();

// 2. 硬刷新页面
// Windows/Linux: Ctrl + Shift + R
// Mac: Cmd + Shift + R

// 3. 清除应用缓存
import { clearCache } from '@/utils/cache';
clearCache();
```

#### 2. 会话问题 ⚠️

**症状**：
- 用户已登录，但查询返回空结果
- 控制台没有错误信息

**可能原因**：
- `auth.uid()` 返回 null
- 用户 session 过期
- token 失效

**解决方案**：
```javascript
// 检查当前用户
const { data: { user } } = await supabase.auth.getUser();
console.log('当前用户:', user);

// 如果 user 为 null，需要重新登录
if (!user) {
  // 重新登录
  await supabase.auth.signOut();
  // 跳转到登录页
}
```

#### 3. 查询条件问题 ⚠️

**症状**：
- 查询执行了，但返回空数组
- 没有错误信息

**可能原因**：
- 查询条件过滤掉了所有结果
- 额外的 WHERE 条件

**解决方案**：
```javascript
// 检查查询代码
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')  // 确保这是唯一的过滤条件
  .order('created_at', { ascending: false });

console.log('查询结果:', data);
console.log('查询错误:', error);
```

#### 4. 前端过滤问题 ⚠️

**症状**：
- 数据从数据库返回了
- 但在前端被过滤掉了

**可能原因**：
- 前端代码中有额外的过滤逻辑
- 状态管理问题

**解决方案**：
```javascript
// 检查是否有额外的过滤
const drivers = await getAllDrivers();
console.log('从数据库获取的司机:', drivers);

// 检查是否在渲染前被过滤
const filteredDrivers = drivers.filter(d => d.status === 'active');
console.log('过滤后的司机:', filteredDrivers);
```

---

## 调试步骤

### 步骤 1：检查用户会话

```javascript
// 在浏览器控制台执行
const { data: { user } } = await supabase.auth.getUser();
console.log('当前用户 ID:', user?.id);
console.log('当前用户信息:', user);
```

**预期结果**：
- user 不为 null
- user.id 是一个有效的 UUID

### 步骤 2：检查用户档案

```javascript
// 在浏览器控制台执行
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

console.log('用户档案:', profile);
console.log('用户角色:', profile?.role);
console.log('用户 boss_id:', profile?.boss_id);
```

**预期结果**：
- profile 不为 null
- role 是 'manager' 或 'super_admin'
- boss_id 不为 null

### 步骤 3：直接查询司机

```javascript
// 在浏览器控制台执行
const { data: drivers, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver');

console.log('查询到的司机数量:', drivers?.length);
console.log('查询错误:', error);
console.log('司机列表:', drivers);
```

**预期结果**：
- error 为 null
- drivers 是一个数组
- drivers.length > 0

### 步骤 4：检查 boss_id 匹配

```javascript
// 在浏览器控制台执行
const { data: profile } = await supabase
  .from('profiles')
  .select('boss_id')
  .eq('id', user.id)
  .single();

const { data: drivers } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .eq('boss_id', profile.boss_id);

console.log('当前用户 boss_id:', profile.boss_id);
console.log('同租户司机数量:', drivers?.length);
console.log('同租户司机列表:', drivers);
```

**预期结果**：
- drivers.length > 0
- 所有司机的 boss_id 与当前用户的 boss_id 相同

### 步骤 5：清除缓存并重试

```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();

// 然后刷新页面（Ctrl + Shift + R 或 Cmd + Shift + R）
```

---

## 快速修复方案

### 方案 1：清除所有缓存

```bash
# 1. 清除浏览器缓存
# 在浏览器中：设置 -> 隐私和安全 -> 清除浏览数据

# 2. 清除应用缓存
# 在浏览器控制台执行：
localStorage.clear();
sessionStorage.clear();

# 3. 硬刷新页面
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

### 方案 2：重新登录

```bash
# 1. 退出登录
# 2. 清除缓存
# 3. 重新登录
# 4. 查看司机列表
```

### 方案 3：检查网络请求

```bash
# 1. 打开浏览器开发者工具（F12）
# 2. 切换到 Network 标签
# 3. 刷新页面
# 4. 查找 profiles 相关的请求
# 5. 检查请求的响应数据
```

---

## 前端代码检查清单

### 1. 查询代码

**文件**：`src/db/api.ts`

**函数**：`getAllDrivers()` 和 `getAllDriversWithRealName()`

**检查项**：
- [ ] 查询条件是否正确
- [ ] 是否有额外的过滤条件
- [ ] 错误处理是否正确
- [ ] 返回值是否正确

### 2. 页面代码

**文件**：司机列表页面

**检查项**：
- [ ] 是否正确调用了查询函数
- [ ] 是否有前端过滤逻辑
- [ ] 状态管理是否正确
- [ ] 是否有缓存逻辑

### 3. 权限检查

**检查项**：
- [ ] 页面是否有权限限制
- [ ] 是否检查了用户角色
- [ ] 是否有路由守卫

---

## 联系信息

如果以上步骤都无法解决问题，请提供以下信息：

1. **浏览器控制台截图**
   - 包含所有错误信息
   - 包含调试步骤的输出

2. **网络请求截图**
   - profiles 表的查询请求
   - 请求的响应数据

3. **用户信息**
   - 当前登录用户的角色
   - 当前登录用户的 boss_id

4. **预期行为**
   - 应该看到多少个司机
   - 实际看到多少个司机

---

## 总结

**数据库层面**：✅ 完全正常
- RLS 策略正确
- 权限函数正常
- 数据完整

**问题定位**：⚠️ 前端问题
- 可能是缓存问题
- 可能是会话问题
- 可能是查询条件问题

**建议操作**：
1. 清除浏览器缓存
2. 重新登录
3. 检查浏览器控制台
4. 按照调试步骤逐步排查

---

**文档创建时间**：2025-11-22
**最后更新时间**：2025-11-22
