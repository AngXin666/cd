#!/bin/bash

# 删除旧的无效文档脚本

echo "🗑️  开始清理旧文档..."

# 定义要保留的核心文档
KEEP_DOCS=(
  "README.md"
  "TODO.md"
  "TEST_REPORT.md"
  "IMPLEMENTATION_SUMMARY.md"
  "docs/API_REFERENCE.md"
  "docs/API_GUIDE.md"
  "docs/USER_MANUAL.md"
  "docs/DEVELOPER_GUIDE.md"
  "docs/prd.md"
  "src/db/README.md"
  "src/store/README.md"
  "supabase/migrations/README.md"
  "scripts/README_DELETE_TENANT.md"
  "scripts/README_MIGRATION.md"
)

# 删除根目录下的临时文档
echo "📁 清理根目录..."
rm -f ACCOUNT_TYPES_AND_PERMISSIONS.md
rm -f ADMIN_ACCOUNT_CREATED.md
rm -f ADMIN_ACCOUNT_SUMMARY.md
rm -f ADMIN_LOGIN_FIX.md
rm -f ADMIN_LOGIN_TEST.md
rm -f ARCHITECTURE_CLARIFICATION.md
rm -f AUTO_SCHEMA_CREATION_SUMMARY.md
rm -f BOSS_ID_FIX_SUMMARY.md
rm -f BOSS_ID_REMOVAL_REPORT.md
rm -f BUGFIX_DELETE_TENANT.md
rm -f CACHE_CLEAR_GUIDE.md
rm -f CENTRAL_ADMIN_SETUP.md
rm -f CLEANUP_ORPHAN_SCHEMAS.md
rm -f CORRECTED_ACCOUNT_PERMISSIONS.md
rm -f DATABASE_DOCUMENTATION.md
rm -f DATABASE_OPTIMIZATION_GUIDE.md
rm -f DATABASE_PERMISSION_SYSTEM.md
rm -f DATA_CLEANUP_SUMMARY.md
rm -f DOCUMENTATION_CLEANUP_SUMMARY.md
rm -f FINAL_ARCHITECTURE_EXPLANATION.md
rm -f FINAL_FIX_SUMMARY.md
rm -f FINAL_SUMMARY.md
rm -f FINAL_TEST_GUIDE.md
rm -f FREE_INDEPENDENT_DATABASE_ARCHITECTURE.md
rm -f FRONTEND_REFACTORING_GUIDE.md
rm -f IMPLEMENTATION_PLAN.md
rm -f INDEPENDENT_DATABASE_ARCHITECTURE.md
rm -f LEASE_CHECK_FIX.md
rm -f LOGIN_FIX_SUMMARY.md
rm -f LOGIN_IMPROVEMENT.md
rm -f MULTI_TENANT_ARCHITECTURE.md
rm -f MULTI_TENANT_ARCHITECTURE_EXPLAINED.md
rm -f MULTI_TENANT_GUIDE.md
rm -f MULTI_TENANT_IMPLEMENTATION.md
rm -f MULTI_TENANT_IMPLEMENTATION_COMPLETE.md
rm -f MULTI_TENANT_QUICKSTART.md
rm -f MULTI_TENANT_TEST_GUIDE.md
rm -f MULTI_TENANT_USAGE.md
rm -f NOTIFICATION_BELL_FEATURE.md
rm -f NOTIFICATION_CENTER_IMPLEMENTATION.md
rm -f NOTIFICATION_DATA_ISOLATION_ANALYSIS.md
rm -f NOTIFICATION_DEBUG_GUIDE.md
rm -f NOTIFICATION_DISPLAY_OPTIMIZATION.md
rm -f NOTIFICATION_FIX_FINAL.md
rm -f NOTIFICATION_FIX_SUMMARY.md
rm -f NOTIFICATION_FORMAT_TEST_GUIDE.md
rm -f NOTIFICATION_IMPLEMENTATION_GUIDE.md
rm -f NOTIFICATION_OPTIMIZATION.md
rm -f NOTIFICATION_OPTIMIZATION_SUMMARY.md
rm -f NOTIFICATION_PAGES_SUMMARY.md
rm -f NOTIFICATION_PERMISSIONS.md
rm -f NOTIFICATION_POLLING_TEST_GUIDE.md
rm -f NOTIFICATION_PRIVACY_ISSUE.md
rm -f NOTIFICATION_REALTIME_UPDATE.md
rm -f NOTIFICATION_REFACTOR_SUMMARY.md
rm -f NOTIFICATION_RULES.md
rm -f NOTIFICATION_SCROLL_TEST_GUIDE.md
rm -f NOTIFICATION_SUMMARY.md
rm -f NOTIFICATION_SYSTEM.md
rm -f NOTIFICATION_SYSTEM_DESIGN.md
rm -f NOTIFICATION_SYSTEM_SUMMARY.md
rm -f NOTIFICATION_SYSTEM_TEST_SUMMARY.md
rm -f PERMISSION_SYSTEM_SUMMARY.md
rm -f PHYSICAL_ISOLATION_ARCHITECTURE.md
rm -f PHYSICAL_ISOLATION_MIGRATION_STATUS.md
rm -f QUICK_FIX_GUIDE.md
rm -f QUICK_FIX_SUMMARY.md
rm -f QUICK_START.md
rm -f RLS_POLICIES_DOCUMENTATION.md
rm -f ROUTING_AND_PERMISSION_REQUIREMENTS.md
rm -f SCHEMA_ISOLATION_ARCHITECTURE.md
rm -f SCHEMA_ISOLATION_TEST_REPORT.md
rm -f SCHEMA_TEST_SUMMARY.md
rm -f SIMPLIFIED_SCHEMA_ARCHITECTURE.md
rm -f SUPER_ADMIN_FIX_SUMMARY.md
rm -f TENANT_CREATION_GUIDE.md
rm -f TENANT_DATA_CLEANUP_SUMMARY.md
rm -f TEST_ACCOUNTS.md
rm -f TEST_BOSS_ID_FIX.md
rm -f TEST_CHECKLIST.md
rm -f USER_LIST_FIX_SUMMARY.md

echo "✅ 根目录清理完成"

# 删除 docs 目录下的临时文档
echo "📁 清理 docs 目录..."
cd docs

# 删除所有临时修复报告
rm -f *修复*.md
rm -f *优化*.md
rm -f *说明*.md
rm -f *指南*.md
rm -f *总结*.md
rm -f *报告*.md
rm -f *测试*.md
rm -f *功能*.md

# 删除特定的临时文档
rm -f 42501错误彻底解决方案.md
rm -f ATTENDANCE_GUIDE.md
rm -f AUTO_CREATE_TENANT_SCHEMA_TEST.md
rm -f CHANGELOG-2025-11-05.md
rm -f LEASE_SYSTEM_DATABASE_ARCHITECTURE.md
rm -f LOGIN_GUIDE.md
rm -f PEER_ACCOUNT_MANAGEMENT.md
rm -f QUICK_START.md
rm -f RLS策略调试指南.md
rm -f TENANT_EXPIRATION_MANAGEMENT.md
rm -f TENANT_ISOLATION_GUIDE.md
rm -f WAREHOUSE_ATTENDANCE_GUIDE.md
rm -f cache-usage-guide.md
rm -f database-schema-overview.md
rm -f database-schema-viewer.md
rm -f warehouse-edit-guide.md

cd ..

echo "✅ docs 目录清理完成"

echo ""
echo "🎉 文档清理完成！"
echo ""
echo "保留的核心文档："
echo "  - README.md"
echo "  - TODO.md"
echo "  - TEST_REPORT.md"
echo "  - IMPLEMENTATION_SUMMARY.md"
echo "  - docs/API_REFERENCE.md"
echo "  - docs/API_GUIDE.md"
echo "  - docs/USER_MANUAL.md"
echo "  - docs/DEVELOPER_GUIDE.md"
echo "  - docs/prd.md"
echo "  - src/db/README.md"
echo "  - src/store/README.md"
echo "  - supabase/migrations/README.md"
echo ""
