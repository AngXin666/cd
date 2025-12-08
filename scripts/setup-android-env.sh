#!/bin/bash

# Android APK 构建环境安装脚本
# 适用于 macOS 系统

set -e  # 遇到错误立即退出

echo "🚀 开始配置 Android APK 构建环境..."
echo ""

# 检测系统架构
ARCH=$(uname -m)
echo "✅ 系统架构: $ARCH"

# 1. 检查并安装 Homebrew
echo ""
echo "📦 步骤 1/3: 检查 Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "❌ 未找到 Homebrew，正在安装..."
    echo "⚠️  需要输入系统密码授权"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 配置 Homebrew 环境变量
    if [ "$ARCH" = "arm64" ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    echo "✅ Homebrew 安装完成"
else
    echo "✅ Homebrew 已安装: $(brew --version | head -n1)"
fi

# 2. 安装 OpenJDK 17
echo ""
echo "☕ 步骤 2/3: 安装 Java Development Kit 17..."
if ! brew list openjdk@17 &> /dev/null; then
    echo "正在安装 OpenJDK 17..."
    brew install openjdk@17
    
    # 创建符号链接
    sudo ln -sfn $(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk || true
    
    echo "✅ OpenJDK 17 安装完成"
else
    echo "✅ OpenJDK 17 已安装"
fi

# 3. 配置环境变量
echo ""
echo "⚙️  步骤 3/3: 配置环境变量..."

# 检测使用的 shell
SHELL_CONFIG=""
if [ -f ~/.zshrc ]; then
    SHELL_CONFIG=~/.zshrc
elif [ -f ~/.bash_profile ]; then
    SHELL_CONFIG=~/.bash_profile
else
    SHELL_CONFIG=~/.zshrc
    touch ~/.zshrc
fi

echo "使用配置文件: $SHELL_CONFIG"

# 添加 JAVA_HOME（如果不存在）
if ! grep -q "JAVA_HOME.*openjdk@17" "$SHELL_CONFIG"; then
    echo "" >> "$SHELL_CONFIG"
    echo "# Java Development Kit" >> "$SHELL_CONFIG"
    echo "export JAVA_HOME=\"\$(brew --prefix openjdk@17)\"" >> "$SHELL_CONFIG"
    echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >> "$SHELL_CONFIG"
    echo "✅ 环境变量已添加到 $SHELL_CONFIG"
else
    echo "✅ 环境变量已存在"
fi

# 立即加载环境变量
export JAVA_HOME="$(brew --prefix openjdk@17)"
export PATH="$JAVA_HOME/bin:$PATH"

# 4. 验证安装
echo ""
echo "🔍 验证安装..."
echo "Java 版本:"
java -version 2>&1 | head -n1

echo ""
echo "Java Home: $JAVA_HOME"

echo ""
echo "✅ 环境配置完成！"
echo ""
echo "📝 下一步操作："
echo "   1. 重新启动终端 或 执行: source $SHELL_CONFIG"
echo "   2. 进入项目目录: cd /Users/angxin/Downloads/app-7cdqf07mbu9t"
echo "   3. 构建 Debug APK: npm run build:android:debug"
echo "   4. APK 位置: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "🎉 享受构建吧！"
