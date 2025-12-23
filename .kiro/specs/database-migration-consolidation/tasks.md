# Implementation Plan - 数据库迁移整理

## 任务列表

- [x] 1. 准备工作和备份
  - [x] 1.1 创建迁移目录备份
    - 备份 `supabase/migrations/` 到 `supabase/migrations_backup_YYYYMMDD/`
    - 记录当前迁移文件数量（644 个）
    - _Requirements: 风险控制_

  - [x] 1.2 创建迁移分析脚本
    - 创建 `scripts/analyze-migrations.js`
    - 分析所有迁移文件，分类统计
    - 生成分析报告
    - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.3 编写迁移分析属性测试
  - **Property 2: 迁移文件数量减少**
  - **Validates: Requirements 2.4**

- [x] 2. 分析迁移文件
  - [x] 2.1 识别废弃迁移
    - 识别 99999_* 系列临时迁移
    - 识别多租户相关迁移（tenant_id、boss_id、lease_admin）
    - 识别重复编号迁移
    - 生成废弃迁移列表
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 2.2 识别有效迁移
    - 识别核心表结构迁移（001-009）
    - 识别当前使用的 RLS 策略迁移
    - 识别当前使用的函数/触发器迁移
    - 生成有效迁移列表
    - _Requirements: 3.1, 3.2_

  - [ ] 2.3 生成分析报告
    - 统计各类迁移数量
    - 列出待删除文件
    - 列出待保留文件
    - _Requirements: 2.4_

- [ ] 3. Checkpoint - 确认分析结果
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. 提取当前数据库结构
  - [ ] 4.1 创建结构提取脚本
    - 创建 `scripts/extract-db-schema.js`
    - 提取所有表结构（表名、列、类型、约束）
    - 提取所有索引
    - 提取所有函数和触发器
    - 提取所有 RLS 策略
    - 提取所有枚举类型
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 生成结构 JSON 文件
    - 输出到 `supabase/schema-snapshot.json`
    - 包含完整的数据库结构信息
    - _Requirements: 4.1_

- [ ]* 4.3 编写结构提取属性测试
  - **Property 1: 基线迁移结构完整性**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 5. 生成基线迁移
  - [ ] 5.1 创建基线生成脚本
    - 创建 `scripts/generate-baseline.js`
    - 从 schema-snapshot.json 生成 SQL
    - 按正确顺序生成（枚举 → 表 → 索引 → 函数 → 触发器 → RLS）
    - _Requirements: 1.1, 1.3_

  - [ ] 5.2 生成基线迁移文件
    - 输出到 `supabase/migrations/00001_baseline.sql`
    - 添加详细注释说明
    - _Requirements: 1.1, 1.3_

  - [ ] 5.3 验证基线迁移语法
    - 检查 SQL 语法正确性
    - 检查依赖顺序正确性
    - _Requirements: 1.4_

- [ ] 6. Checkpoint - 确认基线迁移生成
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 清理废弃迁移（第一批：99999_* 系列）
  - [ ] 7.1 删除 99999_* 系列迁移
    - 删除所有以 99999_ 开头的迁移文件
    - 记录删除的文件列表
    - _Requirements: 2.1_

  - [ ] 7.2 验证删除后状态
    - 确认文件已删除
    - 确认无遗漏
    - _Requirements: 2.1_

- [ ] 8. 清理废弃迁移（第二批：多租户相关）
  - [ ] 8.1 删除多租户相关迁移
    - 删除包含 tenant_id 的迁移
    - 删除包含 boss_id 的迁移
    - 删除包含 lease_admin 的迁移
    - 删除包含 tenant_schema 的迁移
    - _Requirements: 2.3_

  - [ ] 8.2 验证删除后状态
    - 确认文件已删除
    - 确认无遗漏
    - _Requirements: 2.3_

- [ ] 9. 清理废弃迁移（第三批：重复编号）
  - [ ] 9.1 识别重复编号迁移
    - 找出所有重复编号的迁移文件
    - 确定保留哪个版本（通常保留最新）
    - _Requirements: 2.2_

  - [ ] 9.2 删除重复迁移
    - 删除重复的旧版本迁移
    - 记录删除的文件列表
    - _Requirements: 2.2_

- [ ] 10. 清理废弃迁移（第四批：历史修复迁移）
  - [ ] 10.1 识别可合并的修复迁移
    - 找出所有 fix_* 迁移
    - 确定哪些已被后续迁移覆盖
    - _Requirements: 2.2_

  - [ ] 10.2 删除已覆盖的修复迁移
    - 删除已被覆盖的修复迁移
    - 保留仍然有效的修复迁移
    - _Requirements: 2.2_

- [ ] 11. Checkpoint - 确认清理完成
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. 整理保留的迁移文件
  - [ ] 12.1 重新编号迁移文件
    - 基线迁移：00001_baseline.sql
    - 增量迁移：00002_xxx.sql, 00003_xxx.sql, ...
    - 保持时间顺序
    - _Requirements: 3.1, 3.2_

  - [ ] 12.2 添加迁移注释
    - 为每个保留的迁移添加头部注释
    - 包含：功能描述、创建日期、相关需求
    - _Requirements: 3.3_

- [ ]* 12.3 编写注释完整性属性测试
  - **Property 3: 增量迁移注释完整性**
  - **Validates: Requirements 3.3**

- [ ] 13. 验证迁移正确性
  - [ ] 13.1 创建验证脚本
    - 创建 `scripts/validate-migrations.js`
    - 对比基线迁移与当前数据库结构
    - 检查所有对象是否存在
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 13.2 执行结构验证
    - 验证所有表存在
    - 验证所有列存在且类型正确
    - 验证所有索引存在
    - _Requirements: 4.1_

  - [ ] 13.3 执行 RLS 策略验证
    - 验证所有 RLS 策略存在
    - 验证策略规则正确
    - _Requirements: 4.2_

  - [ ] 13.4 执行函数验证
    - 验证所有函数存在
    - 验证函数签名正确
    - _Requirements: 4.3_

  - [ ] 13.5 生成验证报告
    - 生成差异报告（如有）
    - 提供修复建议（如有差异）
    - _Requirements: 4.4_

- [ ]* 13.6 编写验证完整性属性测试
  - **Property 4: 迁移验证完整性**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 14. Checkpoint - 确认验证通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. 生成数据库文档
  - [ ] 15.1 生成表结构文档
    - 创建 `docs/技术文档/数据库/表结构.md`
    - 包含所有表的列定义、类型、约束
    - _Requirements: 5.1_

  - [ ] 15.2 生成 RLS 策略文档
    - 创建 `docs/技术文档/数据库/RLS策略.md`
    - 包含所有策略的名称、适用表、规则说明
    - _Requirements: 5.2_

  - [ ] 15.3 生成函数文档
    - 创建 `docs/技术文档/数据库/函数和触发器.md`
    - 包含所有函数的名称、参数、功能说明
    - _Requirements: 5.3_

  - [ ] 15.4 更新迁移 README
    - 更新 `supabase/migrations/README.md`
    - 说明迁移文件结构
    - 说明如何添加新迁移
    - _Requirements: 5.4_

- [ ] 16. 最终验证
  - [ ] 16.1 统计最终迁移文件数量
    - 确认文件数量 < 50
    - 记录最终数量
    - _Requirements: 2.4_

  - [ ] 16.2 运行完整测试套件
    - 运行 `npx vitest run`
    - 确保所有测试通过
    - _Requirements: 验证_

  - [ ] 16.3 本地 H5 构建测试
    - 运行 `pnpm taro build --type h5`
    - 启动本地服务器测试
    - 验证核心功能正常
    - _Requirements: 验证_

- [ ] 17. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

---

## 预期结果

| 指标 | 整理前 | 整理后目标 |
|------|--------|-----------|
| 迁移文件数量 | 644 | < 50 |
| 废弃迁移 | ~100 | 0 |
| 重复迁移 | ~50 | 0 |
| 文档覆盖率 | 0% | 100% |

## 风险控制

1. **备份策略**: 整理前完整备份迁移目录
2. **渐进式清理**: 分批删除，每批验证
3. **回滚能力**: 保留备份，支持快速回滚
4. **验证机制**: 每个阶段都有验证检查点

