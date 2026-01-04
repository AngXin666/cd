#!/bin/bash
# 修复 H5 构建后的资源路径，将绝对路径改为相对路径
# 解决本地打开或 WebView 中白屏问题

INDEX_FILE="dist/build/h5/index.html"

if [ -f "$INDEX_FILE" ]; then
    # macOS 和 Linux 兼容的 sed 命令
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|href="/assets/|href="./assets/|g' "$INDEX_FILE"
        sed -i '' 's|src="/assets/|src="./assets/|g' "$INDEX_FILE"
    else
        # Linux
        sed -i 's|href="/assets/|href="./assets/|g' "$INDEX_FILE"
        sed -i 's|src="/assets/|src="./assets/|g' "$INDEX_FILE"
    fi
    echo "✅ 路径修复完成: $INDEX_FILE"
else
    echo "❌ 文件不存在: $INDEX_FILE"
    exit 1
fi
