# SafeAreaTop 集成回滚计划

## 文档信息

| 项目 | 内容 |
|------|------|
| **版本** | 1.0.0 |
| **创建日期** | 2024-12-15 |
| **功能名称** | SafeAreaTop 顶部安全区域集成 |
| **回滚目标版本** | 1.0.5（或上一个稳定版本） |

---

## 一、回滚触发条件

### 1.1 必须回滚的情况

| 严重程度 | 情况描述 | 触发条件 |
|----------|----------|----------|
| 🔴 严重 | APP 无法启动 | 用户无法打开 APP |
| 🔴 严重 | 页面白屏 | 多个页面无法显示 |
| 🔴 严重 | 核心功能失效 | 登录、打卡等核心功能无法使用 |
| 🟠 高 | 大面积布局错乱 | 超过 30% 页面布局异常 |
| 🟠 高 | 性能严重下降 | 页面加载时间超过 10s |

### 1.2 可考虑回滚的情况

| 严重程度 | 情况描述 | 决策依据 |
|----------|----------|----------|
| 🟡 中 | 部分页面显示异常 | 影响范围和用户数量 |
| 🟡 中 | 滚动行为异常 | 是否影响核心操作 |
| 🟢 低 | 轻微样式问题 | 可通过热修复解决 |

---

## 二、回滚决策流程

```
发现问题
    │
    ▼
评估严重程度
    │
    ├─→ 严重/高 ─→ 立即回滚
    │
    ├─→ 中 ─→ 评估影响范围
    │         │
    │         ├─→ 影响大 ─→ 回滚
    │         │
    │         └─→ 影响小 ─→ 热修复
    │
    └─→ 低 ─→ 热修复或下次更新修复
```

---

## 三、回滚步骤

### 3.1 方式一：激活上一个版本（推荐）

这是最快的回滚方式，只需要在数据库中切换激活版本。

#### 步骤 1：登录 Supabase Dashboard

打开 SQL Editor：
https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

#### 步骤 2：执行回滚 SQL

```sql
-- 1. 查看当前版本状态
SELECT version, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;

-- 2. 将当前版本设为非激活
UPDATE h5_versions 
SET is_active = false 
WHERE version = '1.0.6';

-- 3. 激活上一个稳定版本
UPDATE h5_versions 
SET is_active = true 
WHERE version = '1.0.5';

-- 4. 验证回滚结果
SELECT version, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
```

#### 步骤 3：验证回滚

1. 打开 APP
2. 应该提示更新到 1.0.5 版本
3. 更新后验证功能正常

### 3.2 方式二：删除问题版本

如果需要完全删除问题版本：

#### 步骤 1：删除数据库记录

```sql
-- 删除问题版本记录
DELETE FROM h5_versions WHERE version = '1.0.6';

-- 激活上一个版本
UPDATE h5_versions 
SET is_active = true 
WHERE version = '1.0.5';
```

#### 步骤 2：删除 Storage 文件（可选）

1. 打开 Supabase Storage：
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app

2. 找到 `v1.0.6` 文件夹

3. 删除整个文件夹

### 3.3 方式三：代码回滚

如果需要完全回滚代码：

#### 步骤 1：Git 回滚

```powershell
# 查看提交历史
git log --oneline -10

# 回滚到指定提交
git revert <commit-hash>

# 或者重置到指定提交（谨慎使用）
git reset --hard <commit-hash>
```

#### 步骤 2：重新构建和部署

```powershell
# 构建
npm run build:h5

# 部署
node scripts/quick-deploy-h5.js 1.0.5-rollback "回滚SafeAreaTop集成"
```

---

## 四、回滚验证

### 4.1 验证清单

| 验证项 | 预期结果 | 实际结果 |
|--------|----------|----------|
| 版本号 | 显示回滚版本 | |
| APP 启动 | 正常启动 | |
| 页面显示 | 正常显示 | |
| 核心功能 | 正常工作 | |
| 性能 | 恢复正常 | |

### 4.2 验证步骤

1. **检查版本**
   - 打开 APP
   - 确认版本号为回滚版本

2. **检查核心功能**
   - 登录功能
   - 打卡功能
   - 页面导航

3. **检查页面显示**
   - Driver 首页
   - Manager 首页
   - Super Admin 首页

4. **检查性能**
   - 页面加载时间
   - 滚动流畅度

---

## 五、回滚后处理

### 5.1 问题分析

回滚后需要进行问题分析：

1. **收集信息**
   - 错误日志
   - 用户反馈
   - 复现步骤

2. **分析原因**
   - 代码问题
   - 配置问题
   - 环境问题

3. **制定修复方案**
   - 修复代码
   - 更新测试
   - 重新验证

### 5.2 修复和重新部署

1. **修复问题**
   - 根据分析结果修复代码
   - 更新相关测试

2. **重新测试**
   - 运行所有测试
   - 进行手动验证

3. **重新部署**
   - 使用新版本号（如 1.0.7）
   - 按照部署流程重新部署

### 5.3 事后总结

1. **记录问题**
   - 问题描述
   - 影响范围
   - 根本原因

2. **改进措施**
   - 测试改进
   - 流程改进
   - 监控改进

---

## 六、紧急联系

### 6.1 回滚执行人员

| 角色 | 职责 |
|------|------|
| 开发负责人 | 决策和执行回滚 |
| 运维人员 | 协助执行回滚 |
| 测试人员 | 验证回滚结果 |

### 6.2 通知流程

1. **发现问题** → 通知开发负责人
2. **决定回滚** → 通知相关团队
3. **执行回滚** → 实时更新状态
4. **回滚完成** → 通知所有相关人员

---

## 七、回滚脚本

### 7.1 快速回滚脚本

创建 `scripts/rollback-h5.js`：

```javascript
/**
 * H5 版本回滚脚本
 * 用法: node scripts/rollback-h5.js <目标版本>
 * 示例: node scripts/rollback-h5.js 1.0.5
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const targetVersion = process.argv[2];

if (!targetVersion) {
  console.log('用法: node scripts/rollback-h5.js <目标版本>');
  process.exit(1);
}

async function rollback() {
  console.log('========================================');
  console.log('H5 版本回滚');
  console.log('========================================');
  console.log(`目标版本: ${targetVersion}`);
  console.log('');

  // 1. 检查目标版本是否存在
  const { data: version, error: checkError } = await supabase
    .from('h5_versions')
    .select('*')
    .eq('version', targetVersion)
    .single();

  if (checkError || !version) {
    console.log(`❌ 版本 ${targetVersion} 不存在`);
    process.exit(1);
  }

  console.log(`✅ 找到版本 ${targetVersion}`);

  // 2. 将所有版本设为非激活
  const { error: deactivateError } = await supabase
    .from('h5_versions')
    .update({ is_active: false })
    .neq('version', targetVersion);

  if (deactivateError) {
    console.log('❌ 停用其他版本失败:', deactivateError.message);
    process.exit(1);
  }

  // 3. 激活目标版本
  const { error: activateError } = await supabase
    .from('h5_versions')
    .update({ is_active: true })
    .eq('version', targetVersion);

  if (activateError) {
    console.log('❌ 激活目标版本失败:', activateError.message);
    process.exit(1);
  }

  console.log(`✅ 已激活版本 ${targetVersion}`);

  // 4. 显示当前状态
  const { data: versions } = await supabase
    .from('h5_versions')
    .select('version, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('');
  console.log('当前版本状态:');
  versions.forEach(v => {
    const status = v.is_active ? '✅ 激活' : '⬜ 未激活';
    console.log(`  ${status} ${v.version}`);
  });

  console.log('');
  console.log('========================================');
  console.log('回滚完成！');
  console.log('========================================');
}

rollback().catch(console.error);
```

### 7.2 使用方法

```powershell
# 设置环境变量
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# 执行回滚
node scripts/rollback-h5.js 1.0.5
```

---

## 八、历史回滚记录

| 日期 | 问题版本 | 回滚版本 | 原因 | 处理人 |
|------|----------|----------|------|--------|
| - | - | - | - | - |

*注：此表格用于记录历史回滚事件，便于后续分析和改进*

---

**文档维护**: 车队管家开发团队  
**最后更新**: 2024-12-15
