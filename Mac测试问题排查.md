# Mac 测试问题排查：找不到命令

## 问题描述
在浏览器控制台执行 `testAllRLSPolicies()` 时，显示：
```
Uncaught ReferenceError: testAllRLSPolicies is not defined
```

## 原因分析
测试函数可能没有正确加载到全局作用域。

## 解决方案

### 方案 1: 手动注册测试函数（最简单）

#### 步骤 1: 打开老板端页面
```bash
cd /workspace/app-7cdqf07mbu9t
pnpm run dev:h5
```

#### 步骤 2: 打开浏览器控制台
按 `Command + Option + J` (Chrome/Edge)

#### 步骤 3: 手动复制粘贴测试代码
在控制台中直接粘贴以下代码并回车：

```javascript
// 导入测试函数
import('/src/utils/testRLSPolicies.ts').then(module => {
  window.testAllRLSPolicies = module.testAllRLSPolicies;
  window.testNotificationUpdatePermission = module.testNotificationUpdatePermission;
  console.log('✅ 测试工具已加载！');
  console.log('现在可以执行: testAllRLSPolicies()');
}).catch(err => {
  console.error('❌ 加载失败:', err);
});
```

#### 步骤 4: 等待加载完成
看到 `✅ 测试工具已加载！` 后，执行：
```javascript
testAllRLSPolicies()
```

---

### 方案 2: 使用简化的测试代码（推荐）

直接在控制台粘贴以下完整测试代码：

```javascript
// ============================================================
// 简化版 RLS 策略测试工具
// ============================================================

async function testRLS() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              开始测试 RLS 策略和权限映射表                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 导入 Supabase 客户端
  const { supabase } = await import('/src/db/supabase.ts');

  // 测试 1: 检查当前用户
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 1: 检查当前用户');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('❌ 获取用户失败:', userError?.message || '用户未登录');
    return;
  }
  
  console.log('✅ 当前用户:');
  console.log('  - 用户ID:', user.id);
  console.log('  - 邮箱:', user.email || '(无)');
  
  // 查询用户角色
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (roleError) {
    console.error('❌ 查询角色失败:', roleError.message);
    return;
  }
  
  console.log('  - 角色:', roleData?.role || '(无)');
  console.log('');

  // 测试 2: 测试 users 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 2: 测试 users 表访问');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const { data: usersData, error: usersError, count: usersCount } = await supabase
    .from('users')
    .select('id, name', { count: 'exact' })
    .limit(5);
  
  if (usersError) {
    console.error('❌ 查询失败:', usersError.message);
  } else {
    console.log('✅ 查询成功:');
    console.log('  - 总记录数:', usersCount);
    console.log('  - 返回记录数:', usersData?.length || 0);
  }
  console.log('');

  // 测试 3: 测试 user_roles 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 3: 测试 user_roles 表访问');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const { data: rolesData, error: rolesError, count: rolesCount } = await supabase
    .from('user_roles')
    .select('user_id, role', { count: 'exact' })
    .limit(10);
  
  if (rolesError) {
    console.error('❌ 查询失败:', rolesError.message);
  } else {
    console.log('✅ 查询成功:');
    console.log('  - 总记录数:', rolesCount);
    console.log('  - 返回记录数:', rolesData?.length || 0);
    
    if (rolesData && rolesData.length > 0) {
      const roleStats = rolesData.reduce((acc, item) => {
        acc[item.role] = (acc[item.role] || 0) + 1;
        return acc;
      }, {});
      console.log('  - 角色分布:', roleStats);
    }
  }
  console.log('');

  // 测试 4: 测试 notifications 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 4: 测试 notifications 表访问');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const { data: notifsData, error: notifsError, count: notifsCount } = await supabase
    .from('notifications')
    .select('id, title, type', { count: 'exact' })
    .eq('recipient_id', user.id)
    .limit(5);
  
  if (notifsError) {
    console.error('❌ 查询失败:', notifsError.message);
  } else {
    console.log('✅ 查询成功:');
    console.log('  - 总记录数:', notifsCount);
    console.log('  - 返回记录数:', notifsData?.length || 0);
  }
  console.log('');

  // 测试 5: 测试通知更新权限（仅管理员）
  const isAdmin = roleData?.role && ['BOSS', 'MANAGER', 'PEER_ADMIN'].includes(roleData.role);
  
  if (isAdmin) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试 5: 测试通知更新权限');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 创建测试通知
    console.log('  📊 创建测试通知...');
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert({
        recipient_id: user.id,
        sender_id: user.id,
        type: 'system',
        title: 'RLS 测试通知',
        content: '这是一条测试通知',
        is_read: false
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('  ❌ 创建失败:', insertError.message);
    } else {
      console.log('  ✅ 创建成功，ID:', insertData.id);
      
      // 测试更新
      console.log('  📊 测试更新通知...');
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          content: '通知已更新',
          updated_at: new Date().toISOString()
        })
        .eq('id', insertData.id);
      
      if (updateError) {
        console.error('  ❌ 更新失败:', updateError.message);
        console.error('  ⚠️ 这可能是 RLS 策略问题！');
      } else {
        console.log('  ✅ 更新成功');
      }
      
      // 清理测试数据
      await supabase.from('notifications').delete().eq('id', insertData.id);
      console.log('  ✅ 测试数据已清理');
    }
    console.log('');
  }

  // 总结
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        测试完成                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
}

// 执行测试
testRLS();
```

**使用方法**:
1. 复制上面的完整代码
2. 在浏览器控制台粘贴
3. 按回车执行
4. 查看测试结果

---

### 方案 3: 检查页面是否正确加载

#### 步骤 1: 确认在老板端页面
确保你在老板端首页，URL 应该是：
```
http://localhost:10086/#/pages/super-admin/index
```

#### 步骤 2: 检查控制台是否有错误
打开控制台，查看是否有红色错误信息。

#### 步骤 3: 刷新页面
按 `Command + R` 刷新页面，等待完全加载。

#### 步骤 4: 查看是否有加载提示
如果测试工具正确加载，应该看到：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 RLS 策略测试工具已加载
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

如果没有看到，说明页面加载有问题。

---

### 方案 4: 使用 Supabase 直接测试

如果浏览器测试不行，可以直接在 Supabase 控制台测试：

#### 步骤 1: 打开 Supabase SQL Editor
登录 Supabase 控制台，进入 SQL Editor

#### 步骤 2: 执行测试脚本
复制以下 SQL 并执行：

```sql
-- 检查当前用户
SELECT 
    u.id AS "用户ID",
    u.name AS "姓名",
    ur.role AS "角色"
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LIMIT 5;

-- 检查 RLS 策略
SELECT 
    tablename AS "表名",
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename IN ('users', 'user_roles', 'notifications')
ORDER BY tablename, cmd, policyname;

-- 检查 is_admin 函数
SELECT proname AS "函数名", pg_get_function_arguments(oid) AS "参数"
FROM pg_proc
WHERE proname = 'is_admin';
```

---

## 调试步骤

### 1. 检查 Node.js 和 pnpm
```bash
# 检查版本
node -v    # 应该是 v18 或更高
pnpm -v    # 应该是 8.0 或更高

# 如果版本不对
nvm use 18
```

### 2. 重新安装依赖
```bash
cd /workspace/app-7cdqf07mbu9t
rm -rf node_modules
pnpm install
```

### 3. 清除缓存并重启
```bash
# 清除缓存
rm -rf .taro_cache
rm -rf dist

# 重新启动
pnpm run dev:h5
```

### 4. 检查浏览器控制台
打开控制台，查看是否有以下错误：
- ❌ 模块加载失败
- ❌ 网络请求失败
- ❌ 语法错误

### 5. 尝试不同的浏览器
- Chrome
- Safari
- Firefox
- Edge

---

## 最简单的测试方法

如果以上方法都不行，使用这个最简单的方法：

### 在控制台直接执行查询

```javascript
// 1. 获取 Supabase 客户端
const { supabase } = await import('/src/db/supabase.ts');

// 2. 测试查询用户
const { data, error } = await supabase.from('users').select('id, name').limit(5);
console.log('用户数据:', data);
console.log('错误:', error);

// 3. 测试查询角色
const { data: roles } = await supabase.from('user_roles').select('*').limit(5);
console.log('角色数据:', roles);

// 4. 测试查询通知
const { data: notifs } = await supabase.from('notifications').select('*').limit(5);
console.log('通知数据:', notifs);
```

---

## 常见错误及解决方法

### 错误 1: Cannot find module
```
Error: Cannot find module '/src/utils/testRLSPolicies.ts'
```

**解决方法**: 使用方案 2 的简化测试代码

### 错误 2: Supabase is not defined
```
ReferenceError: supabase is not defined
```

**解决方法**: 
```javascript
const { supabase } = await import('/src/db/supabase.ts');
```

### 错误 3: 权限错误
```
Error: permission denied for table xxx
```

**解决方法**: 执行 RLS 修复脚本（见下文）

---

## 执行 RLS 修复脚本

如果测试发现权限问题，在 Supabase SQL Editor 中执行：

```sql
-- 复制 supabase/migrations/99999_fix_notification_rls_final.sql 的内容
-- 粘贴到 SQL Editor
-- 点击 Run 执行
```

---

## 需要帮助？

如果还是不行，请提供以下信息：
1. 浏览器控制台的完整错误信息（截图）
2. 当前页面的 URL
3. Node.js 版本 (`node -v`)
4. pnpm 版本 (`pnpm -v`)
5. 是否看到"RLS 策略测试工具已加载"的提示

---

**文档版本**: 1.0  
**创建时间**: 2025-11-05  
**适用系统**: macOS  
**问题**: 找不到测试命令
