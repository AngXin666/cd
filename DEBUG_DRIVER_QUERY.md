# 司机查询问题调试脚本

## 问题描述
老板和车队长无法查看名下的司机

## 数据库验证结果
✅ 数据库层面完全正常
- RLS 策略正确
- 权限函数正常工作
- 数据完整且正确

## 前端调试步骤

### 步骤 1：检查当前用户会话

在浏览器控制台（F12）执行以下代码：

```javascript
// 导入 supabase 客户端
const { supabase } = await import('/src/client/supabase.ts');

// 检查当前用户
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('=== 当前用户信息 ===');
console.log('用户 ID:', user?.id);
console.log('用户 Email:', user?.email);
console.log('用户 Phone:', user?.phone);
console.log('错误:', userError);

// 如果 user 为 null，说明未登录或 session 过期
if (!user) {
  console.error('❌ 用户未登录或 session 已过期，请重新登录');
}
```

**预期结果**：
- `user` 不为 `null`
- `user.id` 是一个有效的 UUID

---

### 步骤 2：检查用户档案

```javascript
// 检查用户档案
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();

console.log('=== 用户档案信息 ===');
console.log('档案:', profile);
console.log('姓名:', profile?.name);
console.log('角色:', profile?.role);
console.log('Boss ID:', profile?.boss_id);
console.log('错误:', profileError);

// 检查角色
if (profile?.role !== 'manager' && profile?.role !== 'super_admin') {
  console.warn('⚠️ 当前用户不是管理员，无法查看司机列表');
}
```

**预期结果**：
- `profile` 不为 `null`
- `role` 是 `'manager'` 或 `'super_admin'`
- `boss_id` 不为 `null`

---

### 步骤 3：直接查询司机列表

```javascript
// 直接查询司机
const { data: drivers, error: driversError } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .order('created_at', { ascending: false });

console.log('=== 司机查询结果 ===');
console.log('查询到的司机数量:', drivers?.length || 0);
console.log('查询错误:', driversError);
console.log('司机列表:', drivers);

// 检查同租户的司机
if (drivers && profile) {
  const sameTenantDrivers = drivers.filter(d => d.boss_id === profile.boss_id);
  console.log('同租户司机数量:', sameTenantDrivers.length);
  console.log('同租户司机:', sameTenantDrivers);
  
  if (sameTenantDrivers.length === 0) {
    console.warn('⚠️ 没有找到同租户的司机');
  }
  
  if (drivers.length > sameTenantDrivers.length) {
    console.log('其他租户司机数量:', drivers.length - sameTenantDrivers.length);
    console.log('✅ RLS 策略正常工作，过滤了其他租户的司机');
  }
}
```

**预期结果**：
- `driversError` 为 `null`
- `drivers` 是一个数组
- `drivers.length > 0`（如果有司机的话）
- 所有返回的司机的 `boss_id` 应该与当前用户的 `boss_id` 相同

---

### 步骤 4：测试 getAllDriversWithRealName 函数

```javascript
// 导入 API 函数
const { getAllDriversWithRealName } = await import('/src/db/api.ts');

// 调用函数
console.log('=== 测试 getAllDriversWithRealName ===');
const driversWithRealName = await getAllDriversWithRealName();
console.log('返回的司机数量:', driversWithRealName.length);
console.log('司机列表:', driversWithRealName);

// 检查是否有实名信息
const withRealName = driversWithRealName.filter(d => d.real_name);
console.log('有实名信息的司机:', withRealName.length);
```

**预期结果**：
- 函数返回一个数组
- 数组长度 > 0（如果有司机的话）

---

### 步骤 5：检查缓存

```javascript
// 检查缓存
const { getVersionedCache, CACHE_KEYS } = await import('/src/utils/cache.ts');

console.log('=== 检查缓存 ===');
const cachedDrivers = getVersionedCache(CACHE_KEYS.MANAGER_DRIVERS);
console.log('缓存的司机列表:', cachedDrivers);

if (cachedDrivers) {
  console.log('缓存的司机数量:', cachedDrivers.length);
  console.log('⚠️ 发现缓存数据，可能是旧数据');
}
```

---

### 步骤 6：清除缓存并重新加载

```javascript
// 清除所有缓存
const { clearCache } = await import('/src/utils/cache.ts');

console.log('=== 清除缓存 ===');
clearCache();
console.log('✅ 缓存已清除');

// 清除浏览器存储
localStorage.clear();
sessionStorage.clear();
console.log('✅ 浏览器存储已清除');

// 提示用户刷新页面
console.log('⚠️ 请刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）');
```

---

## 完整调试脚本（一键执行）

将以下代码复制到浏览器控制台执行：

```javascript
(async () => {
  console.log('🔍 开始调试司机查询问题...\n');
  
  try {
    // 1. 检查用户会话
    const { supabase } = await import('/src/client/supabase.ts');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('=== 1. 用户会话 ===');
    console.log('用户 ID:', user?.id);
    console.log('用户 Phone:', user?.phone);
    
    if (!user) {
      console.error('❌ 用户未登录，请先登录');
      return;
    }
    
    // 2. 检查用户档案
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('\n=== 2. 用户档案 ===');
    console.log('姓名:', profile?.name);
    console.log('角色:', profile?.role);
    console.log('Boss ID:', profile?.boss_id);
    
    if (!profile) {
      console.error('❌ 无法获取用户档案');
      return;
    }
    
    if (profile.role !== 'manager' && profile.role !== 'super_admin') {
      console.warn('⚠️ 当前用户不是管理员');
      return;
    }
    
    // 3. 查询司机
    const { data: drivers, error: driversError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });
    
    console.log('\n=== 3. 司机查询 ===');
    console.log('查询错误:', driversError);
    console.log('查询到的司机总数:', drivers?.length || 0);
    
    if (drivers) {
      const sameTenantDrivers = drivers.filter(d => d.boss_id === profile.boss_id);
      console.log('同租户司机数量:', sameTenantDrivers.length);
      console.log('同租户司机:', sameTenantDrivers);
      
      if (sameTenantDrivers.length === 0) {
        console.error('❌ 没有找到同租户的司机');
        console.log('当前用户 boss_id:', profile.boss_id);
        console.log('所有司机的 boss_id:', [...new Set(drivers.map(d => d.boss_id))]);
      } else {
        console.log('✅ 找到', sameTenantDrivers.length, '个同租户司机');
      }
    }
    
    // 4. 测试 API 函数
    const { getAllDriversWithRealName } = await import('/src/db/api.ts');
    const apiDrivers = await getAllDriversWithRealName();
    
    console.log('\n=== 4. API 函数测试 ===');
    console.log('API 返回的司机数量:', apiDrivers.length);
    console.log('API 返回的司机:', apiDrivers);
    
    // 5. 检查缓存
    const { getVersionedCache, CACHE_KEYS } = await import('/src/utils/cache.ts');
    const cachedDrivers = getVersionedCache(CACHE_KEYS.MANAGER_DRIVERS);
    
    console.log('\n=== 5. 缓存检查 ===');
    if (cachedDrivers) {
      console.log('⚠️ 发现缓存数据');
      console.log('缓存的司机数量:', cachedDrivers.length);
    } else {
      console.log('✅ 没有缓存数据');
    }
    
    // 6. 总结
    console.log('\n=== 📊 调试总结 ===');
    console.log('用户角色:', profile.role);
    console.log('用户 boss_id:', profile.boss_id);
    console.log('直接查询到的司机:', drivers?.length || 0);
    console.log('API 返回的司机:', apiDrivers.length);
    console.log('缓存的司机:', cachedDrivers?.length || 0);
    
    if (apiDrivers.length === 0 && drivers && drivers.length > 0) {
      console.error('\n❌ 问题定位：API 函数返回空数组，但直接查询有数据');
      console.log('可能原因：');
      console.log('1. API 函数内部有额外的过滤逻辑');
      console.log('2. 查询条件不正确');
      console.log('3. 错误处理导致返回空数组');
    } else if (apiDrivers.length > 0) {
      console.log('\n✅ API 函数工作正常');
      console.log('如果页面上看不到司机，可能是前端渲染问题');
    }
    
    console.log('\n🔧 建议操作：');
    console.log('1. 清除缓存：clearCache()');
    console.log('2. 清除浏览器存储：localStorage.clear(); sessionStorage.clear()');
    console.log('3. 硬刷新页面：Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
})();
```

---

## 常见问题和解决方案

### 问题 1：用户未登录或 session 过期

**症状**：`user` 为 `null`

**解决方案**：
```javascript
// 退出登录
await supabase.auth.signOut();

// 清除缓存
localStorage.clear();
sessionStorage.clear();

// 刷新页面并重新登录
location.reload();
```

---

### 问题 2：查询返回空数组，但数据库有数据

**症状**：`drivers.length === 0`，但数据库中有司机

**可能原因**：
1. RLS 策略过滤了所有数据
2. `auth.uid()` 返回 `null`
3. 用户的 `boss_id` 与司机的 `boss_id` 不匹配

**解决方案**：
```javascript
// 检查 auth.uid()
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Access Token:', session?.access_token);

// 如果 session 为 null，重新登录
if (!session) {
  await supabase.auth.signOut();
  // 跳转到登录页
}
```

---

### 问题 3：API 函数返回空数组，但直接查询有数据

**症状**：直接查询返回数据，但 `getAllDriversWithRealName()` 返回空数组

**可能原因**：
1. API 函数内部有错误处理，捕获了错误并返回空数组
2. 查询条件不正确

**解决方案**：
```javascript
// 查看 API 函数的实现
const { getAllDriversWithRealName } = await import('/src/db/api.ts');

// 直接查看函数代码
console.log(getAllDriversWithRealName.toString());

// 或者在 src/db/api.ts 中添加更多日志
```

---

### 问题 4：页面显示空列表，但 API 返回有数据

**症状**：API 返回数据，但页面上看不到

**可能原因**：
1. 前端有额外的过滤逻辑
2. 状态管理问题
3. 渲染条件问题

**解决方案**：
```javascript
// 检查页面组件的状态
// 在 src/pages/manager/driver-management/index.tsx 中添加日志

// 查看过滤后的司机列表
console.log('filteredDrivers:', filteredDrivers);

// 查看过滤条件
console.log('searchKeyword:', searchKeyword);
console.log('currentWarehouseIndex:', currentWarehouseIndex);
console.log('warehouses:', warehouses);
```

---

## 联系支持

如果以上步骤都无法解决问题，请提供：

1. **调试脚本的完整输出**（复制控制台的所有内容）
2. **网络请求截图**（开发者工具 -> Network 标签）
3. **用户信息**：
   - 用户 ID
   - 用户角色
   - 用户 boss_id
4. **预期行为 vs 实际行为**

---

**文档创建时间**：2025-11-26
**最后更新时间**：2025-11-26
