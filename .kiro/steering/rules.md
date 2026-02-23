---
inclusion: always
---

# 项目规则

## 核心规则（必须遵守）

### 0. 云服务部署限制（重要）
- **禁止推荐免费云服务部署 FastAPI 应用**
- 原因：Vercel、Railway、Render 等免费云服务对完整的 FastAPI 应用（特别是有 SSE、文件上传、数据库连接池的）支持有严重限制
- 如果用户要求云端部署，必须先明确说明限制和风险
- 推荐方案：
  1. 本地部署（局域网使用）
  2. 付费云服务（AWS、阿里云等）
  3. 内网穿透（ngrok、Cloudflare Tunnel）
- **在推荐任何部署方案前，必须先验证该方案的可行性**

### 1. 代码注释
- 所有函数必须有 JSDoc/docstring 注释
- 复杂逻辑必须有行内注释
- 魔法数字必须注释说明

### 2. 文档同步
- 代码提交前必须同步相关文档
- 新功能需先写设计文档再实现

### 3. 中文输出
- 所有回复使用中文
- 技术术语可保留英文

### 4. 错误处理
- 发现错误立即标记
- 任务完成后修复所有错误
- 发现问题时全局检查相同问题

### 5. 效率优先
- 方法不行立即换方法
- 单元测试超时 1 分钟换方法
- 集成测试超时 5 分钟换方法
- 常规命令自主执行，危险操作（删除、部署）需确认

### 6. 默认本地测试
- 默认执行本地测试流程
- 只有明确要求时才部署

### 7. 终端管理
- 开启新终端前先关闭旧的同类终端
- 避免终端堆积，保持工作区整洁

### 8. Git 提交规范
- 格式：`<type>: <description>`
- type: feat/fix/docs/refactor/test/chore
- 示例：`feat: 添加司机打卡功能`

### 9. 敏感信息处理
- 密码、token、密钥禁止硬编码
- 使用环境变量或 .env 文件
- .env 文件不提交到 Git

### 10. 功能变更清理
- 添加/修改功能时，检查并清理相关旧代码
- 清理范围：函数、API 接口、数据库字段/表、前端页面/组件
- 删除无用的导入、变量、注释代码
- 确保不留下孤立的死代码

### 11. 错误日志规范
- 后端错误使用 logging 模块记录
- 包含：时间、级别、位置、错误信息
- 生产环境日志级别为 WARNING

### 12. 枚举值规范（重要）
- 所有枚举值必须使用**小写字符串**
- 前端、后端、数据库三端必须保持一致
- 枚举名使用大写（如 `DRIVER`），枚举值使用小写（如 `"driver"`）
- 示例：
  ```python
  # Python 后端
  class UserRole(str, Enum):
      DRIVER = "driver"      # ✓ 正确
      MANAGER = "manager"    # ✓ 正确
      # DRIVER = "DRIVER"    # ✗ 错误
  ```
  ```typescript
  // TypeScript 前端
  export enum UserRole {
    DRIVER = 'driver',     // ✓ 正确
    MANAGER = 'manager',   // ✓ 正确
    // DRIVER = 'DRIVER',  // ✗ 错误
  }
  ```
- 数据库存储值必须与枚举值完全一致（小写）
- 新增枚举时必须检查前后端定义是否一致

## 本地测试流程

```bash
# 后端（fleet-manager/backend）
source venv/bin/activate  # Mac
python main.py

# 前端（fleet-manager/frontend）
npm run build:h5
npx serve dist/build/h5 -l 8080 -s
```

## 工作流选择

- **标准功能开发** → Kiro Spec 工作流（`.kiro/specs/`）
- **复杂任务重构** → 6A 工作流（`docs/`）
- **不确定时** → 默认 Kiro Spec

## 编码规范

### TypeScript/Vue
- 使用严格类型检查
- 组件使用 Composition API
- 状态管理使用 Pinia
- 组件文件名使用 PascalCase

### Python/FastAPI
- 遵循 PEP 8
- 使用类型注解
- 使用 SQLModel ORM
- 异步函数优先使用 async/await
