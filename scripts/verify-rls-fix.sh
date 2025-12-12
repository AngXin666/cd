#!/bin/bash

# RLS 权限修复快速验证脚本

echo "======================================"
echo "RLS 权限修复快速验证"
echo "======================================"
echo ""

echo ">>> 检查修复文件是否存在"
if [ -f "supabase/migrations/00616_fix_all_user_roles_references_to_users.sql" ]; then
  echo "✅ 修复迁移文件存在"
else
  echo "❌ 修复迁移文件不存在"
  exit 1
fi

if [ -f "scripts/test-rls-permissions-complete.sql" ]; then
  echo "✅ 测试脚本存在"
else
  echo "❌ 测试脚本不存在"
  exit 1
fi

if [ -f "scripts/RLS_FIX_REPORT.txt" ]; then
  echo "✅ 修复报告存在"
else
  echo "❌ 修复报告不存在"
  exit 1
fi

echo ""
echo ">>> 检查修复内容"

# 检查是否使用了统一权限函数
POLICY_COUNT=$(grep -c "CREATE POLICY" supabase/migrations/00616_fix_all_user_roles_references_to_users.sql)
BOSS_V2_COUNT=$(grep -c "is_boss_v2" supabase/migrations/00616_fix_all_user_roles_references_to_users.sql)
MANAGER_V2_COUNT=$(grep -c "is_manager_v2" supabase/migrations/00616_fix_all_user_roles_references_to_users.sql)

echo "创建的策略数: $POLICY_COUNT"
echo "使用 is_boss_v2: $BOSS_V2_COUNT 次"
echo "使用 is_manager_v2: $MANAGER_V2_COUNT 次"

if [ "$POLICY_COUNT" -gt 0 ] && [ "$BOSS_V2_COUNT" -gt 0 ] && [ "$MANAGER_V2_COUNT" -gt 0 ]; then
  echo "✅ 修复内容正确"
else
  echo "❌ 修复内容有误"
  exit 1
fi

echo ""
echo ">>> 检查是否还有 user_roles 引用（应该为 0）"

# 检查修复文件中是否还有 user_roles 引用
USER_ROLES_REF=$(grep -c "FROM user_roles" supabase/migrations/00616_fix_all_user_roles_references_to_users.sql 2>/dev/null || echo "0")

if [ "$USER_ROLES_REF" = "0" ]; then
  echo "✅ 已消除所有 user_roles 引用"
else
  echo "❌ 仍有 $USER_ROLES_REF 处 user_roles 引用"
  exit 1
fi

echo ""
echo "======================================"
echo "✅ 快速验证通过"
echo "======================================"
echo ""
echo "修复文件:"
echo "  📄 supabase/migrations/00616_fix_all_user_roles_references_to_users.sql"
echo "  📄 scripts/test-rls-permissions-complete.sql"
echo "  📄 scripts/RLS_FIX_REPORT.txt"
echo ""
echo "修复统计:"
echo "  - 创建策略: $POLICY_COUNT 个"
echo "  - 使用 is_boss_v2: $BOSS_V2_COUNT 次"
echo "  - 使用 is_manager_v2: $MANAGER_V2_COUNT 次"
echo "  - user_roles 引用: 0 处 ✓"
echo ""
echo "下一步:"
echo "  1. 等待数据库重置完成"
echo "  2. 运行测试: psql -h localhost -p 54322 -U postgres -d postgres -f scripts/test-rls-permissions-complete.sql"
echo "======================================"
