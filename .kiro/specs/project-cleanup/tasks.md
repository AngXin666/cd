# Implementation Plan

## 项目清理和归档

- [x] 1. 准备工作和分析
  - [x] 1.1 分析所有 Spec 完成状态
    - 检查每个 Spec 的 tasks.md 文件
    - 统计已完成和未完成的任务数
    - 生成 Spec 状态报告
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 分析脚本引用关系
    - 使用 grep 搜索每个脚本的引用
    - 分类核心脚本和临时脚本
    - 生成脚本分类报告
    - _Requirements: 2.1, 2.2_
  - [x] 1.3 分析测试文件状态
    - 检查每个测试文件对应的源文件
    - 运行测试确认状态
    - 生成测试文件报告
    - _Requirements: 3.1, 3.2_

- [x] 2. Checkpoint - 确认分析结果
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 归档已完成的 Spec
  - [x] 3.1 创建归档目录结构
    - 创建 `.kiro/specs/_archived/` 目录
    - _Requirements: 1.1_
  - [x] 3.2 归档 supplemented-photo-marking Spec
    - 移动到 `_archived/supplemented-photo-marking/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.3 归档 vehicle-api-optimization Spec
    - 移动到 `_archived/vehicle-api-optimization/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.4 归档 vehicles-review-status-fix Spec
    - 移动到 `_archived/vehicles-review-status-fix/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.5 归档 vehicle-database-fields-fix Spec
    - 移动到 `_archived/vehicle-database-fields-fix/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.6 归档 vehicle-profile-field-audit Spec
    - 移动到 `_archived/vehicle-profile-field-audit/`
    - 保留 requirements.md、design.md、tasks.md
    - 删除 AUDIT_REPORT.md
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.7 归档 permission-type-field-fix Spec
    - 移动到 `_archived/permission-type-field-fix/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.8 归档 realtime-session-kickout Spec
    - 移动到 `_archived/realtime-session-kickout/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.9 归档 admin-management-fixes Spec
    - 移动到 `_archived/admin-management-fixes/`
    - 保留 requirements.md、design.md、tasks.md
    - _Requirements: 1.1, 1.2_
  - [x] 3.10 归档其他已完成的 Spec
    - 检查并归档：apk-hot-update-fix、event-driven-data-refresh、login-page-optimization、notification-toast、piece-work-report-migration、safe-area-top-integration、super-admin-h5-compatibility、top-navigation-bar、unified-hot-update、unified-loading-indicator、user-list-cache-optimization、windows-encoding-fix
    - 删除临时报告文件（*_SUMMARY.md、*_REPORT.md、*_GUIDE.md 等）
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.11 验证归档后编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_

- [x] 4. Checkpoint - 确认 Spec 归档完成
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 删除临时脚本（第一批：数据库迁移脚本）
  - [x] 5.1 删除 add-*.js 脚本
    - 搜索引用：`grep -r "add-attendance-rules-fields" --include="*.ts" --include="*.js"`
    - 删除：add-attendance-rules-fields.js、add-manager-permissions-field.js、add-permission-column.js、add-permission-field.js、add-session-token-field.js、add-supplemented-photos-column.js、add-supplemented-photos-field.js、add-vehicles-review-status.js
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.2 验证编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_
  - [x] 5.3 运行测试
    - 运行 `npx vitest run`
    - _Requirements: 5.2_

- [x] 6. 删除临时脚本（第二批：调试脚本）
  - [x] 6.1 删除 debug-*.js 脚本
    - 搜索引用确认无依赖
    - 删除：debug-permission-flow.js、debug-storage-permissions.js、debug-storage-photos.js、debug-users-query.js、debug-vehicle-insert.js、debug-vehicle-photos.js
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 6.2 验证编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_

- [x] 7. 删除临时脚本（第三批：检查和修复脚本）
  - [x] 7.1 删除 check-*.js 和 fix-*.js 脚本
    - 搜索引用确认无依赖
    - 删除：check-supplemented-photos.js、check-vehicle-photos-data.js、fix-document-type-constraint.js、fix-existing-vehicle-photos.js、fix-vehicle-database-fields.js
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 7.2 验证编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_

- [x] 8. 删除临时脚本（第四批：迁移和执行脚本）
  - [x] 8.1 删除 migrate-*.js 和 execute-*.js 脚本
    - 搜索引用确认无依赖
    - 删除：migrate-supplemented-photos.js、migrate-supplemented-photos-v2.js、migrate-via-rest.js、execute-migration.js、execute-migration-pg.js、execute-migration-v3.js、execute-supplemented-photos-migration.js
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 8.2 验证编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_

- [x] 9. 删除临时脚本（第五批：其他临时脚本）
  - [x] 9.1 删除其他临时脚本
    - 搜索引用确认无依赖
    - 删除：delete-all-vehicles.js、delete-vehicle-by-plate.js、list-all-buckets.js、refresh-schema-cache.js、run-migration.js、run-migration-api.js、supabase-sql-exec.js、db-migrate-direct.js、test-get-current-user.js、test-permission-field.js、cleanup-notifications.js
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 9.2 验证编译通过
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_
  - [x] 9.3 运行完整测试
    - 运行 `npx vitest run`
    - _Requirements: 5.2_

- [x] 10. Checkpoint - 确认脚本删除完成
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. 清理测试文件
  - [x] 11.1 检查 permission-test.ts 是否需要保留
    - 搜索引用：`grep -r "permission-test" --include="*.ts"`
    - 如果无引用且不是有效测试，删除
    - _Requirements: 3.1, 3.2_
  - [x] 11.2 验证测试通过
    - 运行 `npx vitest run`
    - _Requirements: 3.3_

- [x] 12. 更新项目文档
  - [x] 12.1 更新 scripts/README.md
    - 更新脚本列表，移除已删除的脚本
    - 添加核心脚本说明
    - _Requirements: 4.3_
  - [x] 12.2 更新 CHANGELOG.md
    - 添加清理操作记录
    - 记录删除的文件列表
    - _Requirements: 4.2_
  - [x] 12.3 更新 README.md
    - 更新项目结构说明
    - 更新脚本使用说明
    - _Requirements: 4.1_

- [x] 13. 最终验证
  - [x] 13.1 运行完整编译检查
    - 运行 `npx tsc --noEmit`
    - _Requirements: 5.1_
  - [x] 13.2 运行完整测试套件
    - 运行 `npx vitest run`
    - _Requirements: 5.2_
  - [x] 13.3 执行本地 H5 构建
    - 运行 `pnpm taro build --type h5`
    - _Requirements: 5.3_
  - [x] 13.4 启动本地服务器测试
    - 运行 `npx serve dist -l 8080 -s`
    - 测试登录功能
    - 测试车辆管理功能
    - 测试审核流程
    - _Requirements: 5.5_

- [x] 14. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
