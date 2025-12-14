# 超级管理员 H5 兼容性修复 - 需求文档

## 简介

修复超级管理员页面在 H5 环境下的兼容性问题，包括模块加载、Capacitor 插件兼容、数据库表和函数缺失等问题。

## 术语表

- **H5**：基于 Web 技术的移动端应用
- **Capacitor**：跨平台原生运行时，用于将 Web 应用打包为原生应用
- **LiveUpdate**：Capacitor 的热更新插件
- **Supabase**：后端即服务平台，提供数据库、认证等功能
- **RPC**：远程过程调用，Supabase 中用于执行数据库函数

## 需求

### 需求 1：模块加载兼容性

**用户故事**：作为超级管理员，我希望在 H5 环境下能够正常加载页面，而不会遇到模块加载错误。

#### 验收标准

1. WHEN 用户在浏览器中访问超级管理员页面 THEN 系统 SHALL 正确加载所有 JavaScript 模块
2. WHEN 服务器返回模块文件 THEN 系统 SHALL 使用正确的 MIME 类型（application/javascript）
3. WHEN 模块加载失败 THEN 系统 SHALL 提供清晰的错误信息和降级方案

### 需求 2：Capacitor 插件环境检测

**用户故事**：作为开发者，我希望系统能够检测运行环境，并在 Web 环境下跳过 Capacitor 插件的初始化。

#### 验收标准

1. WHEN 应用在 Web 环境启动 THEN 系统 SHALL 检测到非原生环境
2. WHEN 检测到 Web 环境 THEN 系统 SHALL 跳过 LiveUpdate 插件的初始化
3. WHEN Capacitor 插件不可用 THEN 系统 SHALL 记录警告日志但不影响应用运行
4. WHEN 应用在原生环境启动 THEN 系统 SHALL 正常初始化所有 Capacitor 插件

### 需求 3：数据库表自动创建

**用户故事**：作为系统管理员，我希望应用能够自动检测并创建缺失的数据库表。

#### 验收标准

1. WHEN 应用启动时 THEN 系统 SHALL 检查 app_versions 表是否存在
2. WHEN app_versions 表不存在 THEN 系统 SHALL 自动创建该表
3. WHEN 表创建成功 THEN 系统 SHALL 记录成功日志
4. WHEN 表创建失败 THEN 系统 SHALL 记录错误日志并提供手动创建指引
5. WHEN 表已存在 THEN 系统 SHALL 跳过创建步骤

### 需求 4：数据库函数降级方案

**用户故事**：作为开发者，我希望在数据库函数不可用时，系统能够使用替代方案完成操作。

#### 验收标准

1. WHEN 系统调用 exec_sql 函数 THEN 系统 SHALL 首先检查函数是否存在
2. WHEN exec_sql 函数不存在 THEN 系统 SHALL 使用直接 SQL 查询作为降级方案
3. WHEN 使用降级方案 THEN 系统 SHALL 记录警告日志
4. WHEN 降级方案执行成功 THEN 系统 SHALL 正常返回结果
5. WHEN 降级方案也失败 THEN 系统 SHALL 提供清晰的错误信息和解决建议

### 需求 5：错误处理和用户反馈

**用户故事**：作为用户，我希望在遇到错误时能够看到友好的提示信息，而不是技术性的错误堆栈。

#### 验收标准

1. WHEN 发生模块加载错误 THEN 系统 SHALL 显示用户友好的错误提示
2. WHEN 发生数据库错误 THEN 系统 SHALL 显示具体的错误原因和建议操作
3. WHEN 发生环境兼容性问题 THEN 系统 SHALL 提示用户当前环境的限制
4. WHEN 错误可恢复 THEN 系统 SHALL 提供重试按钮
5. WHEN 错误不可恢复 THEN 系统 SHALL 提供联系支持的方式

### 需求 6：开发环境调试支持

**用户故事**：作为开发者，我希望在开发环境下能够看到详细的调试信息，帮助快速定位问题。

#### 验收标准

1. WHEN 应用在开发环境运行 THEN 系统 SHALL 输出详细的调试日志
2. WHEN 发生错误 THEN 系统 SHALL 输出完整的错误堆栈
3. WHEN 应用在生产环境运行 THEN 系统 SHALL 只输出必要的错误信息
4. WHEN 开发者需要调试 THEN 系统 SHALL 提供环境信息查看工具
