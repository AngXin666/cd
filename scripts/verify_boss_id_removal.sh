#!/bin/bash

echo "=========================================="
echo "验证 boss_id 删除工作"
echo "=========================================="
echo ""

# 检查 TypeScript/TSX 文件中的 boss_id 引用
echo "📊 检查源代码中的 boss_id 引用..."
BOSS_ID_COUNT=$(grep -r "boss_id\|bossId" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "   找到 $BOSS_ID_COUNT 处引用"

if [ "$BOSS_ID_COUNT" -le 1 ]; then
    echo "   ✅ 通过：boss_id 引用已基本清除"
else
    echo "   ⚠️  警告：仍有多处 boss_id 引用"
    echo ""
    echo "详细列表："
    grep -r "boss_id\|bossId" src --include="*.ts" --include="*.tsx" 2>/dev/null
fi

echo ""
echo "📁 检查已删除的文件..."
DELETED_FILES=(
    "src/db/tenantQuery.ts"
    "src/db/batchQuery.ts"
    "src/client/tenant-supabase.ts"
)

for file in "${DELETED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "   ✅ $file 已删除"
    else
        echo "   ❌ $file 仍然存在"
    fi
done

echo ""
echo "📝 检查已修改的文件..."
MODIFIED_FILES=(
    "src/db/api.ts"
    "src/db/tenant-utils.ts"
    "src/utils/behaviorTracker.ts"
    "src/utils/performanceMonitor.ts"
    "src/contexts/TenantContext.tsx"
)

for file in "${MODIFIED_FILES[@]}"; do
    if [ -f "$file" ]; then
        COUNT=$(grep "boss_id\|bossId" "$file" 2>/dev/null | wc -l)
        if [ "$COUNT" -eq 0 ]; then
            echo "   ✅ $file (0 处 boss_id 引用)"
        else
            echo "   ⚠️  $file ($COUNT 处 boss_id 引用)"
        fi
    else
        echo "   ❌ $file 不存在"
    fi
done

echo ""
echo "=========================================="
echo "✅ 验证完成"
echo "=========================================="
