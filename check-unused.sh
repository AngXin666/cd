#!/bin/bash

echo "=== 检查项目大小和未使用文件 ==="
echo ""

echo "📊 目录大小统计："
echo "总大小: $(du -sh . | cut -f1)"
echo "node_modules: $(du -sh node_modules 2>/dev/null | cut -f1)"
echo ".git: $(du -sh .git 2>/dev/null | cut -f1)"
echo "android: $(du -sh android 2>/dev/null | cut -f1)"
echo "src: $(du -sh src 2>/dev/null | cut -f1)"
echo "dist: $(du -sh dist 2>/dev/null | cut -f1)"
echo ""

echo "🗑️  可以安全删除的目录："
echo "1. node_modules (6.4GB) - 可以用 pnpm install 重新安装"
echo "2. dist (2.2MB) - 构建输出，可以重新构建"
echo "3. android/app/build (约20MB) - Android构建缓存"
echo "4. .swc (8.1MB) - SWC编译缓存"
echo "5. backup (48KB) - 备份文件"
echo ""

echo "📁 检查大文件："
find . -type f -size +1M ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./android/*" -exec du -h {} \; | sort -hr | head -10
echo ""

echo "🔍 检查未使用的导出函数（src/db/api/）："
for file in src/db/api/*.ts; do
  if [ -f "$file" ] && [ "$(basename $file)" != "index.ts" ]; then
    echo "检查: $file"
    # 提取导出的函数名
    exports=$(grep -E "^export (async )?function" "$file" | sed 's/export async function //' | sed 's/export function //' | sed 's/(.*$//' | tr '\n' ' ')
    if [ ! -z "$exports" ]; then
      for func in $exports; do
        # 搜索函数使用情况（排除定义文件本身）
        count=$(grep -r "\b$func\b" src --include="*.ts" --include="*.tsx" | grep -v "^$file:" | grep -v "export.*$func" | wc -l)
        if [ $count -eq 0 ]; then
          echo "  ⚠️  未使用: $func"
        fi
      done
    fi
  fi
done

