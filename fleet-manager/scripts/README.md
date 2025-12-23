# 数据迁移脚本

本目录包含从 Supabase 迁移数据到新系统的脚本。

## 快速开始

### 一键迁移（推荐）

```bash
# 进入脚本目录
cd fleet-manager/scripts

# 设置环境变量
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"

# 执行一键迁移（导出 + 导入 + 验证）
python migrate_data.py
```

### 分步执行

如果需要分步执行，可以使用以下命令：

```bash
# 只导出数据
python migrate_data.py --export-only

# 只导入数据（使用最新的导出文件）
python migrate_data.py --import-only

# 只验证数据
python migrate_data.py --verify-only

# 导入并跳过验证
python migrate_data.py --import-only --skip-verify

# 使用指定的导出文件
python migrate_data.py --import-only --export-file data/export/full_export_20231201_120000.json
```

## 迁移流程

### 1. 准备工作

```bash
# 进入后端目录
cd fleet-manager/backend

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件或设置环境变量：

```bash
# Supabase 配置（用于导出数据）
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"

# 可选：自定义导入密码（默认：123456）
export IMPORT_DEFAULT_PASSWORD="your-password"

# 可选：是否跳过错误继续导入（默认：true）
export IMPORT_SKIP_ERRORS="true"
```

> **注意**：需要使用 `service_role` 密钥，而不是 `anon` 密钥，以便读取所有数据。

### 3. 导出数据

```bash
cd fleet-manager/scripts
python export_supabase_data.py
```

导出的数据将保存在 `data/export/` 目录：
- `full_export_YYYYMMDD_HHMMSS.json` - 完整导出文件
- `users.json` - 用户数据
- `warehouses.json` - 仓库数据
- 其他表的单独文件...

### 4. 导入数据

```bash
python import_to_new_system.py
```

或指定导出文件：

```bash
python import_to_new_system.py data/export/full_export_20231201_120000.json
```

导入完成后会生成：
- `data/app.db` - SQLite 数据库文件
- `data/export/id_mapping.json` - UUID 到整数 ID 的映射
- `data/export/import_report.json` - 导入报告

### 5. 验证数据

```bash
python verify_migration.py
```

验证内容包括：
- 记录数量对比
- 用户数据完整性
- 外键关系正确性
- 数据一致性检查

## 数据转换规则

### 用户角色映射

| Supabase 角色 | 新系统角色 |
|--------------|-----------|
| BOSS | boss |
| PEER_ADMIN | boss |
| MANAGER | manager |
| DRIVER | driver |

### ID 转换

- Supabase 使用 UUID 作为主键
- 新系统使用自增整数 ID
- 迁移脚本会建立 UUID -> 整数 ID 的映射关系
- 映射关系保存在 `data/export/id_mapping.json`

### 字段映射

| 原字段 | 新字段 | 说明 |
|--------|--------|------|
| login_account / phone / email | username | 用户名（优先级从左到右）|
| plate_number | license_plate | 车牌号 |
| clock_in_time | clock_in | 上班打卡时间 |
| clock_out_time | clock_out | 下班打卡时间 |
| total_amount | amount | 计件金额 |
| recipient_id | user_id | 通知接收者 |

### 默认值

- 用户默认密码：`123456`（可通过环境变量 `IMPORT_DEFAULT_PASSWORD` 修改）
- 缺失的必填字段会使用默认值
- 重复的用户名/车牌号会自动添加后缀

## 脚本说明

| 脚本 | 说明 |
|------|------|
| `migrate_data.py` | 一键迁移脚本（整合导出、导入、验证） |
| `export_supabase_data.py` | 从 Supabase 导出数据（Python 版本） |
| `export-supabase-data.js` | 从 Supabase 导出数据（Node.js 版本，带数据转换） |
| `validate_export.py` | 验证导出数据的完整性和关联性 |
| `import_to_new_system.py` | 导入数据到新系统 |
| `verify_migration.py` | 验证数据完整性 |
| `init-db.sql` | PostgreSQL 数据库初始化脚本 |
| `backup-db.sh` | 数据库备份脚本 |
| `restore-db.sh` | 数据库恢复脚本 |

## 输出文件

| 文件 | 说明 |
|------|------|
| `data/export/full_export_*.json` | 完整导出数据 |
| `data/export/id_mapping.json` | UUID 到整数 ID 的映射 |
| `data/export/import_report.json` | 导入报告（包含错误详情） |
| `data/export/migration_report.json` | 迁移总报告 |
| `data/app.db` | SQLite 数据库文件 |

## 注意事项

1. **备份数据**：迁移前请确保已备份原始数据
2. **测试环境**：建议先在测试环境验证迁移流程
3. **密码安全**：迁移后提醒用户修改默认密码
4. **数据完整性**：使用验证脚本检查迁移结果
5. **错误处理**：默认跳过错误继续导入，可通过 `IMPORT_SKIP_ERRORS=false` 改为严格模式

## 故障排除

### 导出失败

1. 检查 Supabase URL 和密钥是否正确
2. 确认使用的是 `service_role` 密钥
3. 检查网络连接
4. 查看错误日志

### 导入失败

1. 检查导出文件是否完整
2. 查看 `import_report.json` 中的错误详情
3. 确认数据库连接正常
4. 检查磁盘空间

### 验证失败

1. 查看具体的验证失败项
2. 检查 ID 映射文件
3. 手动检查相关数据
4. 如果是容差问题，可能是部分数据因错误跳过

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `ModuleNotFoundError` | 缺少依赖 | `pip install -r requirements.txt` |
| `Connection refused` | Supabase 连接失败 | 检查 URL 和密钥 |
| `UNIQUE constraint failed` | 重复数据 | 脚本会自动处理，检查日志 |
| `Foreign key constraint failed` | 外键关联失败 | 检查数据顺序和完整性 |

## 迁移后操作

1. **启动后端服务**
   ```bash
   cd ../backend
   python main.py
   ```

2. **访问 API 文档**
   ```
   http://localhost:8000/docs
   ```

3. **测试登录**
   - 使用导入的用户账号登录
   - 默认密码：`123456`

4. **修改密码**
   - 提醒所有用户修改默认密码

5. **数据验证**
   - 抽查关键数据是否正确
   - 测试核心业务流程
