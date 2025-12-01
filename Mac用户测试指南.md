# Mac 用户 RLS 策略测试指南

## 🍎 Mac 用户快速测试指南

### 方法 1: 浏览器测试（最简单，推荐）

#### 步骤 1: 启动小程序
```bash
# 在项目目录下执行
cd /workspace/app-7cdqf07mbu9t
pnpm run dev:h5
```

等待编译完成，浏览器会自动打开 `http://localhost:10086`

#### 步骤 2: 登录老板端
1. 在浏览器中登录车队管家
2. 使用老板账号登录
3. 进入老板端首页

#### 步骤 3: 打开开发者工具
**Mac 快捷键**:
- Chrome/Edge: `Command + Option + J`
- Safari: `Command + Option + C` (需要先在偏好设置中启用开发者菜单)
- Firefox: `Command + Option + K`

#### 步骤 4: 查看测试工具提示
在控制台（Console）标签页中，你会看到：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 RLS 策略测试工具已加载
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
使用方法:
  1. 打开浏览器控制台（Command + Option + J）
  2. 输入以下命令测试:
     - testAllRLSPolicies()          // 测试所有 RLS 策略
     - testNotificationUpdatePermission()  // 测试通知更新权限
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 步骤 5: 执行测试
在控制台中输入并回车：
```javascript
testAllRLSPolicies()
```

#### 步骤 6: 查看测试结果
测试会自动运行并输出详细日志。等待几秒钟，你会看到：
```
╔═══════════════════════════════════════════════════════════════╗
║              开始测试 RLS 策略和权限映射表                    ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试 1: 检查当前用户
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 获取当前用户信息...
  ✅ 当前用户:
    - 用户ID: xxx
    - 角色: BOSS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试 2: 测试 users 表访问
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ 查询成功

...

╔═══════════════════════════════════════════════════════════════╗
║                        测试总结                                ║
╚═══════════════════════════════════════════════════════════════╝

📊 测试结果统计:
  - 总测试数: 5
  - 成功: 5
  - 失败: 0

✅ 测试完成！
```

---

### 方法 2: 数据库 SQL 测试

#### 步骤 1: 打开 Supabase 控制台
1. 在浏览器中打开 Supabase 项目
2. 进入 SQL Editor

#### 步骤 2: 复制测试脚本
在 Mac 终端中执行：
```bash
# 查看测试脚本内容
cat /workspace/app-7cdqf07mbu9t/测试所有RLS策略和权限.sql
```

或者直接在 Finder 中打开文件：
```bash
# 在 Finder 中打开项目目录
open /workspace/app-7cdqf07mbu9t
```

然后找到 `测试所有RLS策略和权限.sql` 文件，用文本编辑器打开。

#### 步骤 3: 执行测试
1. 复制整个 SQL 脚本内容
2. 粘贴到 Supabase SQL Editor
3. 点击 "Run" 按钮执行

#### 步骤 4: 查看结果
SQL Editor 会显示测试结果，包括：
- 所有表的 RLS 状态
- 所有策略列表
- 权限函数测试结果
- 数据访问测试结果

---

## 🔧 Mac 专用快捷键

### 浏览器开发者工具
| 浏览器 | 快捷键 | 说明 |
|--------|--------|------|
| Chrome | `⌘ + ⌥ + J` | 打开控制台 |
| Safari | `⌘ + ⌥ + C` | 打开控制台（需先启用开发者菜单） |
| Firefox | `⌘ + ⌥ + K` | 打开控制台 |
| Edge | `⌘ + ⌥ + J` | 打开控制台 |

### Safari 启用开发者菜单
1. 打开 Safari
2. 菜单栏 → Safari → 偏好设置（`⌘ + ,`）
3. 高级 → 勾选"在菜单栏中显示开发菜单"

### 控制台操作
| 操作 | 快捷键 |
|------|--------|
| 清空控制台 | `⌘ + K` |
| 搜索日志 | `⌘ + F` |
| 复制日志 | `⌘ + C` |
| 保存日志 | `⌘ + S` |

---

## 📝 详细测试步骤

### 测试 1: 完整 RLS 策略测试

#### 1.1 启动开发服务器
```bash
cd /workspace/app-7cdqf07mbu9t
pnpm run dev:h5
```

#### 1.2 打开浏览器
浏览器会自动打开，或手动访问：
```
http://localhost:10086
```

#### 1.3 登录老板账号
- 使用老板账号登录
- 进入老板端首页

#### 1.4 打开控制台
按 `⌘ + ⌥ + J` (Chrome/Edge)

#### 1.5 执行测试
```javascript
testAllRLSPolicies()
```

#### 1.6 等待结果
测试会自动运行，大约需要 5-10 秒。

---

### 测试 2: 通知更新权限测试

#### 2.1 在控制台执行
```javascript
testNotificationUpdatePermission()
```

#### 2.2 查看输出
```
╔═══════════════════════════════════════════════════════════════╗
║                  测试通知更新权限                              ║
╚═══════════════════════════════════════════════════════════════╝

📋 当前用户:
  - 用户ID: xxx
  - 角色: BOSS

📊 步骤 1: 创建测试通知...
  ✅ 创建成功，通知ID: xxx

📊 步骤 2: 测试更新通知...
  ✅ 更新成功

📊 步骤 3: 验证更新结果...
  ✅ 验证成功:
    - 审批状态: approved
    - 内容: 通知已更新

📊 步骤 4: 清理测试数据...
  ✅ 清理成功

✅ 通知更新权限测试通过！
```

---

## 🐛 常见问题（Mac 专用）

### 问题 1: Safari 无法打开开发者工具

**症状**: 按 `⌘ + ⌥ + C` 没有反应

**解决方法**:
1. 打开 Safari 偏好设置（`⌘ + ,`）
2. 点击"高级"标签
3. 勾选"在菜单栏中显示开发菜单"
4. 重启 Safari

### 问题 2: 端口被占用

**症状**: 
```
Error: listen EADDRINUSE: address already in use :::10086
```

**解决方法**:
```bash
# 查找占用端口的进程
lsof -i :10086

# 杀死进程
kill -9 <PID>

# 或者使用不同的端口
PORT=10087 pnpm run dev:h5
```

### 问题 3: 权限问题

**症状**: 
```
Error: EACCES: permission denied
```

**解决方法**:
```bash
# 修复权限
sudo chown -R $(whoami) /workspace/app-7cdqf07mbu9t

# 重新安装依赖
pnpm install
```

### 问题 4: Node.js 版本问题

**症状**: 
```
Error: The engine "node" is incompatible with this module
```

**解决方法**:
```bash
# 检查 Node.js 版本
node -v

# 如果版本不对，使用 nvm 切换
nvm use 18

# 或者安装正确版本
nvm install 18
nvm use 18
```

---

## 📊 测试结果解读

### ✅ 测试通过
如果看到：
```
✅ 测试完成！

📊 测试结果统计:
  - 总测试数: 5
  - 成功: 5
  - 失败: 0
```

说明：
- ✅ RLS 策略配置正确
- ✅ 权限映射正确
- ✅ 通知系统正常
- ✅ 可以正常使用

### ❌ 测试失败
如果看到：
```
❌ 失败的测试:
  [1] notifications 表访问
      原因: 更新通知失败: new row violates row-level security policy
```

需要：
1. 记录错误信息
2. 执行修复脚本（见下文）
3. 重新测试

---

## 🔧 修复 RLS 策略（Mac）

### 方法 1: 在 Supabase 控制台修复

#### 步骤 1: 打开修复脚本
```bash
# 在 Mac 终端中查看修复脚本
cat /workspace/app-7cdqf07mbu9t/supabase/migrations/99999_fix_notification_rls_final.sql
```

#### 步骤 2: 复制脚本内容
```bash
# 复制到剪贴板（Mac 专用）
cat /workspace/app-7cdqf07mbu9t/supabase/migrations/99999_fix_notification_rls_final.sql | pbcopy
```

#### 步骤 3: 在 Supabase SQL Editor 中执行
1. 打开 Supabase SQL Editor
2. 按 `⌘ + V` 粘贴脚本
3. 点击 "Run" 执行

#### 步骤 4: 验证修复
在浏览器控制台重新执行：
```javascript
testAllRLSPolicies()
```

---

## 🎯 完整测试流程（Mac）

### 1. 准备环境
```bash
# 进入项目目录
cd /workspace/app-7cdqf07mbu9t

# 确保依赖已安装
pnpm install

# 启动开发服务器
pnpm run dev:h5
```

### 2. 浏览器测试
1. 浏览器自动打开 `http://localhost:10086`
2. 登录老板账号
3. 按 `⌘ + ⌥ + J` 打开控制台
4. 执行 `testAllRLSPolicies()`
5. 查看测试结果

### 3. 数据库测试（可选）
1. 打开 Supabase SQL Editor
2. 复制 `测试所有RLS策略和权限.sql` 内容
3. 粘贴并执行
4. 查看测试结果

### 4. 修复问题（如果需要）
1. 复制 `99999_fix_notification_rls_final.sql` 内容
2. 在 Supabase SQL Editor 中执行
3. 重新测试验证

### 5. 实际业务测试
1. 司机端提交请假申请
2. 老板端审批请假
3. 检查通知状态更新
4. 验证实时订阅

---

## 📱 Mac 终端命令速查

### 项目操作
```bash
# 进入项目目录
cd /workspace/app-7cdqf07mbu9t

# 安装依赖
pnpm install

# 启动 H5 开发服务器
pnpm run dev:h5

# 启动微信小程序开发服务器
pnpm run dev:weapp

# 代码检查
pnpm run lint

# 构建生产版本
pnpm run build:h5
```

### 文件操作
```bash
# 查看文件内容
cat <文件路径>

# 复制文件内容到剪贴板
cat <文件路径> | pbcopy

# 在 Finder 中打开目录
open <目录路径>

# 用默认编辑器打开文件
open <文件路径>

# 用 VS Code 打开项目
code /workspace/app-7cdqf07mbu9t
```

### 进程管理
```bash
# 查看端口占用
lsof -i :<端口号>

# 杀死进程
kill -9 <PID>

# 查看所有 Node 进程
ps aux | grep node

# 杀死所有 Node 进程
killall node
```

---

## 🎨 Mac 终端美化（可选）

### 安装 Oh My Zsh
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 配置别名
在 `~/.zshrc` 中添加：
```bash
# 项目快捷命令
alias fleet="cd /workspace/app-7cdqf07mbu9t"
alias fleet-dev="cd /workspace/app-7cdqf07mbu9t && pnpm run dev:h5"
alias fleet-test="cd /workspace/app-7cdqf07mbu9t && pnpm run lint"
```

重新加载配置：
```bash
source ~/.zshrc
```

---

## 📚 相关文档

- `快速测试RLS策略.md` - 通用快速测试指南
- `RLS策略和权限测试指南.md` - 详细测试指南
- `通知创建流程调试笔记.md` - 通知系统调试
- `RLS策略和权限测试完成报告.md` - 完整测试报告

---

## ⏱️ 预计时间（Mac）

- 启动开发服务器：1-2 分钟
- 浏览器测试：2-3 分钟
- 数据库测试：5-10 分钟
- 修复问题：10-20 分钟
- 完整测试：30 分钟

---

## ✅ 成功标志

当你在浏览器控制台看到：
```
✅ 测试完成！

📊 测试结果统计:
  - 总测试数: 5
  - 成功: 5
  - 失败: 0
```

说明测试成功！🎉

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看控制台错误信息
2. 检查 `常见问题` 章节
3. 查看详细文档
4. 记录错误信息并反馈

---

**文档版本**: 1.0  
**创建时间**: 2025-11-05  
**适用系统**: macOS  
**适用范围**: 车队管家小程序 RLS 策略测试
