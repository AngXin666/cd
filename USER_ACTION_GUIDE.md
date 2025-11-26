# 司机和仓库查询问题 - 用户操作指南

## 问题已修复 ✅

数据库层面的问题已经完全修复！现在您需要执行以下简单步骤来清除浏览器缓存。

---

## 快速修复步骤（3 步）

### 步骤 1：清除浏览器缓存

1. 打开浏览器的开发者工具（按 `F12` 键）
2. 切换到 **Console（控制台）** 标签
3. 复制以下代码并粘贴到控制台，然后按回车：

```javascript
localStorage.clear();
sessionStorage.clear();
console.log('✅ 缓存已清除');
```

### 步骤 2：硬刷新页面

- **Windows/Linux 用户**：按 `Ctrl + Shift + R`
- **Mac 用户**：按 `Cmd + Shift + R`

### 步骤 3：重新登录

1. 退出当前登录
2. 重新登录
3. 查看司机管理页面

---

## 如果问题仍然存在

### 检查页面过滤设置

1. **清空搜索框**
   - 确保搜索框中没有任何文字

2. **切换仓库标签**
   - 如果页面顶部有仓库标签（如"北京仓库"、"上海仓库"）
   - 尝试点击不同的仓库标签
   - 或者点击"全部"标签

3. **检查筛选条件**
   - 确保没有设置任何筛选条件

---

## 完整调试脚本（可选）

如果上述步骤无效，请在浏览器控制台执行以下完整调试脚本：

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
      await supabase.auth.signOut();
      location.reload();
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
    
    // 3. 直接查询司机
    const { data: drivers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });
    
    console.log('\n=== 3. 直接查询司机 ===');
    console.log('查询错误:', error);
    console.log('查询到的司机总数:', drivers?.length || 0);
    
    if (drivers && drivers.length > 0) {
      const sameTenantDrivers = drivers.filter(d => d.boss_id === profile.boss_id);
      console.log('同租户司机数量:', sameTenantDrivers.length);
      
      if (sameTenantDrivers.length > 0) {
        console.log('✅ 找到', sameTenantDrivers.length, '个同租户司机');
        console.table(sameTenantDrivers.map(d => ({
          姓名: d.name,
          手机号: d.phone,
          状态: d.status
        })));
      }
    }
    
    // 4. 查询仓库
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('*')
      .eq('boss_id', profile.boss_id)
      .order('created_at', { ascending: false });
    
    console.log('\n=== 4. 仓库查询 ===');
    console.log('查询到的仓库数量:', warehouses?.length || 0);
    
    if (warehouses && warehouses.length > 0) {
      console.log('✅ 找到', warehouses.length, '个仓库');
      console.table(warehouses.map(w => ({
        名称: w.name,
        状态: w.is_active ? '启用' : '禁用'
      })));
    }
    
    // 5. 总结
    console.log('\n=== 📊 诊断结果 ===');
    
    if (drivers && drivers.length > 0 && warehouses && warehouses.length > 0) {
      console.log('✅ 数据库查询正常');
      console.log('如果页面上看不到数据，可能是前端渲染或过滤问题');
      console.log('\n建议：');
      console.log('1. 清空搜索框');
      console.log('2. 切换仓库标签');
      console.log('3. 检查筛选条件');
    } else {
      console.error('❌ 数据库查询异常');
      console.log('请联系技术支持');
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
})();
```

---

## 预期结果

修复后，您应该能够：

1. ✅ 查看到所有同租户的司机
2. ✅ 查看到所有同租户的仓库
3. ✅ 查看到司机的仓库分配
4. ✅ 正常使用司机管理功能

---

## 技术支持

如果按照上述步骤操作后问题仍然存在，请提供以下信息：

1. 浏览器控制台的完整输出（执行完整调试脚本后）
2. 网络请求截图（开发者工具 -> Network 标签）
3. 您的用户信息（姓名、角色）

---

**文档创建时间**：2025-11-26  
**修复状态**：✅ 数据库已修复，等待用户清除缓存
