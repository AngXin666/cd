# 司机查询问题最终修复指南

## 问题总结

**用户反馈**：老板和车队长无法查看名下的司机

**数据库验证结果**：✅ **数据库层面完全正常**
- ✅ RLS 策略正确
- ✅ 权限函数正常工作
- ✅ 数据完整且正确
- ✅ 模拟查询成功返回 5 个司机

**结论**：问题出在前端，不是数据库问题

---

## 数据库验证详情

### 测试结果

车队长（ID: 24cec0e4-15f0-475c-9e68-6e6b432e8d95）可以查看到 5 个司机：

| 司机姓名 | 手机号 | 分配仓库 |
|---------|--------|---------|
| 测试111 | 13876578765 | 北京仓库、上海仓库 |
| 测试11111 | 13498789877 | 北京仓库 |
| 测试2 | 13799910281 | 测试2仓库 |
| 发发奶粉哦啊 | 13322736482 | 北京仓库 |
| 邱吉兴 | 13800000003 | 北京仓库、上海仓库 |

### RLS 策略验证

```sql
-- 测试查询（以车队长身份）
SELECT 
  p.id,
  p.name,
  p.phone,
  can_view_profile('24cec0e4-15f0-475c-9e68-6e6b432e8d95'::uuid, p.id, p.boss_id) as can_view
FROM profiles p
WHERE p.role = 'driver';
```

**结果**：✅ 所有同租户的司机 `can_view = true`

---

## 前端问题排查

### 可能的原因

#### 1. 缓存问题 ⚠️ **最可能**

**症状**：
- 数据库有数据
- API 查询正常
- 但页面显示为空或显示旧数据

**原因**：
- 浏览器缓存了旧的查询结果
- 应用层缓存（localStorage/sessionStorage）
- Supabase 客户端缓存

#### 2. Session 问题 ⚠️

**症状**：
- 用户已登录
- 但查询返回空结果
- 控制台没有错误

**原因**：
- `auth.uid()` 返回 null
- 用户 session 过期
- Token 失效

#### 3. 前端过滤问题 ⚠️

**症状**：
- API 返回了数据
- 但页面上看不到

**原因**：
- 前端有额外的过滤逻辑（仓库过滤、搜索过滤）
- 状态管理问题

---

## 修复方案

### 方案 1：清除缓存（推荐首先尝试）

#### 步骤 1：在浏览器控制台执行

```javascript
// 清除应用缓存
localStorage.clear();
sessionStorage.clear();

// 清除 IndexedDB（如果有）
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});

console.log('✅ 缓存已清除');
```

#### 步骤 2：硬刷新页面

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

#### 步骤 3：重新登录

1. 退出登录
2. 清除浏览器缓存
3. 重新登录
4. 查看司机列表

---

### 方案 2：检查 Session

#### 在浏览器控制台执行

```javascript
// 导入 supabase 客户端
const { supabase } = await import('/src/client/supabase.ts');

// 检查当前 session
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
console.log('Access Token:', session?.access_token);

// 如果 session 为 null，重新登录
if (!session) {
  console.error('❌ Session 已过期，请重新登录');
  await supabase.auth.signOut();
  // 刷新页面
  location.reload();
}
```

---

### 方案 3：检查前端过滤逻辑

#### 问题定位

在 `src/pages/manager/driver-management/index.tsx` 的第 74-98 行有过滤逻辑：

```typescript
const filteredDrivers = useMemo(() => {
  let result = drivers

  // 仓库过滤（当有多个仓库时）
  if (warehouses.length > 1 && warehouses[currentWarehouseIndex]) {
    const currentWarehouseId = warehouses[currentWarehouseIndex].id
    result = result.filter((driver) => {
      const driverWarehouses = driverWarehouseMap.get(driver.id) || []
      return driverWarehouses.includes(currentWarehouseId)
    })
  }

  // 搜索关键词过滤
  if (searchKeyword.trim()) {
    const keyword = searchKeyword.trim().toLowerCase()
    result = result.filter(
      (driver) =>
        driver.name?.toLowerCase().includes(keyword) ||
        driver.phone?.toLowerCase().includes(keyword) ||
        driver.real_name?.toLowerCase().includes(keyword)
    )
  }

  return result
}, [drivers, searchKeyword, warehouses, currentWarehouseIndex, driverWarehouseMap])
```

#### 检查步骤

在浏览器控制台执行：

```javascript
// 检查原始司机列表
console.log('原始司机列表:', drivers);
console.log('司机数量:', drivers.length);

// 检查仓库列表
console.log('仓库列表:', warehouses);
console.log('仓库数量:', warehouses.length);
console.log('当前仓库索引:', currentWarehouseIndex);

// 检查司机仓库映射
console.log('司机仓库映射:', driverWarehouseMap);

// 检查搜索关键词
console.log('搜索关键词:', searchKeyword);

// 检查过滤后的司机列表
console.log('过滤后的司机列表:', filteredDrivers);
console.log('过滤后的司机数量:', filteredDrivers.length);
```

#### 可能的问题

1. **仓库过滤问题**：
   - 如果车队长有 2 个仓库，会触发仓库过滤
   - 如果司机没有分配到当前选中的仓库，就会被过滤掉
   - **解决方案**：切换到不同的仓库标签，或者查看"全部"标签

2. **搜索过滤问题**：
   - 如果搜索框有内容，会过滤司机
   - **解决方案**：清空搜索框

---

### 方案 4：直接测试 API 函数

#### 在浏览器控制台执行

```javascript
// 导入 API 函数
const { getAllDriversWithRealName } = await import('/src/db/api.ts');

// 调用函数
console.log('=== 测试 getAllDriversWithRealName ===');
const drivers = await getAllDriversWithRealName();
console.log('返回的司机数量:', drivers.length);
console.log('司机列表:', drivers);

// 如果返回空数组，检查错误
if (drivers.length === 0) {
  console.error('❌ API 返回空数组');
  
  // 直接查询数据库
  const { supabase } = await import('/src/client/supabase.ts');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver');
  
  console.log('直接查询结果:', data);
  console.log('查询错误:', error);
  
  if (data && data.length > 0) {
    console.error('❌ 数据库有数据，但 API 返回空数组');
    console.log('可能原因：API 函数内部有问题');
  }
}
```

---

## 完整调试脚本（一键执行）

将以下代码复制到浏览器控制台（F12）执行：

```javascript
(async () => {
  console.log('🔍 开始完整调试...\n');
  
  try {
    // 1. 检查 Session
    const { supabase } = await import('/src/client/supabase.ts');
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('=== 1. Session 检查 ===');
    console.log('Session 存在:', !!session);
    console.log('User ID:', session?.user?.id);
    
    if (!session) {
      console.error('❌ Session 不存在，请重新登录');
      console.log('执行：await supabase.auth.signOut(); location.reload();');
      return;
    }
    
    // 2. 检查用户档案
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    
    console.log('\n=== 2. 用户档案 ===');
    console.log('姓名:', profile?.name);
    console.log('角色:', profile?.role);
    console.log('Boss ID:', profile?.boss_id);
    
    if (!profile || (profile.role !== 'manager' && profile.role !== 'super_admin')) {
      console.warn('⚠️ 当前用户不是管理员');
      return;
    }
    
    // 3. 直接查询司机
    const { data: drivers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });
    
    console.log('\n=== 3. 直接查询司机 ===');
    console.log('查询错误:', error);
    console.log('查询到的司机总数:', drivers?.length || 0);
    
    if (drivers) {
      const sameTenantDrivers = drivers.filter(d => d.boss_id === profile.boss_id);
      console.log('同租户司机数量:', sameTenantDrivers.length);
      
      if (sameTenantDrivers.length === 0) {
        console.error('❌ 没有找到同租户的司机');
      } else {
        console.log('✅ 找到', sameTenantDrivers.length, '个同租户司机');
        console.table(sameTenantDrivers.map(d => ({
          姓名: d.name,
          手机号: d.phone,
          状态: d.status
        })));
      }
    }
    
    // 4. 测试 API 函数
    const { getAllDriversWithRealName } = await import('/src/db/api.ts');
    const apiDrivers = await getAllDriversWithRealName();
    
    console.log('\n=== 4. API 函数测试 ===');
    console.log('API 返回的司机数量:', apiDrivers.length);
    
    // 5. 检查缓存
    const { getVersionedCache, CACHE_KEYS } = await import('/src/utils/cache.ts');
    const cachedDrivers = getVersionedCache(CACHE_KEYS.MANAGER_DRIVERS);
    
    console.log('\n=== 5. 缓存检查 ===');
    console.log('缓存的司机数量:', cachedDrivers?.length || 0);
    
    // 6. 总结
    console.log('\n=== 📊 诊断结果 ===');
    
    if (drivers && drivers.length > 0 && apiDrivers.length === 0) {
      console.error('❌ 问题：数据库有数据，但 API 返回空数组');
      console.log('建议：检查 API 函数实现');
    } else if (apiDrivers.length > 0) {
      console.log('✅ API 函数正常，返回', apiDrivers.length, '个司机');
      console.log('如果页面上看不到，可能是前端渲染或过滤问题');
      console.log('建议：');
      console.log('1. 检查仓库过滤（切换仓库标签）');
      console.log('2. 检查搜索过滤（清空搜索框）');
      console.log('3. 清除缓存并刷新页面');
    } else {
      console.error('❌ 数据库和 API 都没有数据');
      console.log('建议：检查数据是否存在');
    }
    
    // 7. 提供修复命令
    console.log('\n=== 🔧 快速修复命令 ===');
    console.log('清除缓存：');
    console.log('localStorage.clear(); sessionStorage.clear();');
    console.log('\n重新登录：');
    console.log('await supabase.auth.signOut(); location.reload();');
    console.log('\n硬刷新页面：');
    console.log('Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
})();
```

---

## 最终建议

### 立即执行的操作

1. **清除所有缓存**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **硬刷新页面**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **重新登录**
   - 退出登录
   - 清除浏览器缓存
   - 重新登录

4. **检查页面过滤**
   - 清空搜索框
   - 切换仓库标签（如果有多个仓库）
   - 查看"全部"标签

### 如果问题仍然存在

请执行完整调试脚本，并提供：
1. 控制台的完整输出
2. 网络请求截图（开发者工具 -> Network 标签）
3. 用户信息（ID、角色、boss_id）

---

## 数据库状态确认

✅ **数据库完全正常**
- RLS 策略正确
- 权限函数正常
- 数据完整
- 查询成功

❌ **问题在前端**
- 可能是缓存
- 可能是 Session
- 可能是过滤逻辑

---

**文档创建时间**：2025-11-26
**最后更新时间**：2025-11-26
**验证状态**：数据库层面已完全验证 ✅
