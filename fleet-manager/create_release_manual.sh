#!/bin/bash
# 手动创建 GitHub Release 的步骤

echo "============================================================"
echo "GitHub Release 创建步骤"
echo "============================================================"
echo ""
echo "1. 打开浏览器访问："
echo "   https://github.com/AngXin666/cd/releases/new"
echo ""
echo "2. 填写以下信息："
echo "   - Tag: v1.2 (选择已存在的 tag)"
echo "   - Release title: 车队管家 v1.2"
echo "   - Description: 复制下面的内容"
echo ""
echo "------- 描述内容开始 -------"
cat << 'EOF'
## 车队管家 v1.2 版本

### 更新内容
- 修复 API 路径前缀问题
- 优化登录流程
- 添加用户协议和隐私政策
- 修复司机端数据刷新问题

### 安装说明
1. 下载 APK 文件
2. 允许安装未知来源应用
3. 安装并授予必要权限

### 测试账号
- 老板：admin / admin123
- 车队长：manager / manager123
- 司机：driver / driver123
EOF
echo "------- 描述内容结束 -------"
echo ""
echo "3. 上传 APK 文件："
echo "   - 拖拽文件: fleet-manager/fleet-manager-v1.2.apk"
echo "   - 或点击 'Attach binaries' 选择文件"
echo ""
echo "4. 点击 'Publish release'"
echo ""
echo "5. 发布后，下载链接将是："
echo "   https://github.com/AngXin666/cd/releases/download/v1.2/fleet-manager-v1.2.apk"
echo ""
echo "6. 下载页面地址："
echo "   将 fleet-manager/download.html 上传到任何静态托管服务"
echo "   或使用 GitHub Pages"
echo ""
echo "============================================================"

# 自动打开浏览器
if command -v open &> /dev/null; then
    echo "正在打开浏览器..."
    open "https://github.com/AngXin666/cd/releases/new?tag=v1.2"
fi
