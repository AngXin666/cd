#!/bin/bash
# 在 Linux 环境中构建部署包
# 此脚本应该在 Linux 系统中运行

set -e

echo "======================================"
echo "在 Linux 环境中构建部署包"
echo "======================================"

# 检查是否在 Linux 环境
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  警告: 此脚本应该在 Linux 环境中运行"
    echo "   当前系统: $OSTYPE"
fi

# 清理旧文件
rm -rf deploy_package_linux
rm -f fleet-manager-linux.zip

# 创建部署目录
mkdir -p deploy_package_linux

echo ""
echo "📦 安装 Python 依赖..."

# 安装依赖
pip3 install -r requirements-serverless.txt -t deploy_package_linux --no-cache-dir -q

echo ""
echo "📦 复制源代码..."
cp -r routers deploy_package_linux/
cp -r crud deploy_package_linux/
cp *.py deploy_package_linux/ 2>/dev/null || true

# 删除不需要的文件
echo "🧹 清理不需要的文件..."
cd deploy_package_linux
rm -f deploy_to_tencent.py
rm -f add_trigger.py
rm -f check_function.py
rm -f build_*.py
rm -f build_*.sh
rm -f enable_*.py
rm -f get_function_info.py
rm -f publish_function.py
rm -f update_function_code.py
rm -rf __pycache__
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

echo ""
echo "📦 打包..."
zip -r ../fleet-manager-linux.zip . -q

cd ..

SIZE=$(du -h fleet-manager-linux.zip | cut -f1)
echo ""
echo "✅ Linux 部署包构建完成！"
echo "文件: fleet-manager-linux.zip"
echo "大小: $SIZE"
echo ""
echo "此包包含 Linux 兼容的依赖，可以直接上传到腾讯云函数"
