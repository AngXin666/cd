#!/bin/bash

# 项目清理脚本
# 用途：清理构建输出、缓存和临时文件

echo "🧹 车队管家项目清理工具"
echo "========================"
echo ""

# 显示当前大小
echo "📊 当前项目大小："
du -sh . 2>/dev/null | cut -f1
echo ""

# 询问清理级别
echo "请选择清理级别："
echo "1) 轻度清理 - 删除构建输出和缓存 (~30MB)"
echo "2) 中度清理 - 包括Android构建 (~50MB)"
echo "3) 完全清理 - 包括node_modules (~6.5GB)"
echo "4) 取消"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
  1)
    echo ""
    echo "🧹 执行轻度清理..."
    echo ""
    
    # 删除构建输出
    if [ -d "dist" ]; then
      echo "删除 dist/..."
      rm -rf dist
    fi
    
    # 删除编译缓存
    if [ -d ".swc" ]; then
      echo "删除 .swc/..."
      rm -rf .swc
    fi
    
    # 删除备份
    if [ -d "backup" ]; then
      echo "删除 backup/..."
      rm -rf backup
    fi
    
    # 删除日志文件
    echo "删除日志文件..."
    rm -f *.log 2>/dev/null
    
    echo ""
    echo "✅ 轻度清理完成！"
    ;;
    
  2)
    echo ""
    echo "🧹 执行中度清理..."
    echo ""
    
    # 轻度清理的所有内容
    if [ -d "dist" ]; then
      echo "删除 dist/..."
      rm -rf dist
    fi
    
    if [ -d ".swc" ]; then
      echo "删除 .swc/..."
      rm -rf .swc
    fi
    
    if [ -d "backup" ]; then
      echo "删除 backup/..."
      rm -rf backup
    fi
    
    echo "删除日志文件..."
    rm -f *.log 2>/dev/null
    
    # Android构建缓存
    if [ -d "android/app/build" ]; then
      echo "删除 android/app/build/..."
      rm -rf android/app/build
    fi
    
    if [ -d "android/.gradle" ]; then
      echo "删除 android/.gradle/..."
      rm -rf android/.gradle
    fi
    
    echo ""
    echo "✅ 中度清理完成！"
    ;;
    
  3)
    echo ""
    echo "⚠️  警告：这将删除 node_modules，需要重新安装依赖！"
    read -p "确定要继续吗？(y/N): " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      echo ""
      echo "🧹 执行完全清理..."
      echo ""
      
      # 所有清理内容
      if [ -d "dist" ]; then
        echo "删除 dist/..."
        rm -rf dist
      fi
      
      if [ -d ".swc" ]; then
        echo "删除 .swc/..."
        rm -rf .swc
      fi
      
      if [ -d "backup" ]; then
        echo "删除 backup/..."
        rm -rf backup
      fi
      
      echo "删除日志文件..."
      rm -f *.log 2>/dev/null
      
      if [ -d "android/app/build" ]; then
        echo "删除 android/app/build/..."
        rm -rf android/app/build
      fi
      
      if [ -d "android/.gradle" ]; then
        echo "删除 android/.gradle/..."
        rm -rf android/.gradle
      fi
      
      # 删除node_modules
      if [ -d "node_modules" ]; then
        echo "删除 node_modules/..."
        rm -rf node_modules
      fi
      
      echo ""
      echo "✅ 完全清理完成！"
      echo ""
      echo "重新安装依赖："
      echo "  pnpm install"
    else
      echo "已取消"
      exit 0
    fi
    ;;
    
  4)
    echo "已取消"
    exit 0
    ;;
    
  *)
    echo "无效选项"
    exit 1
    ;;
esac

echo ""
echo "📊 清理后项目大小："
du -sh . 2>/dev/null | cut -f1
echo ""
echo "🎉 清理完成！"
