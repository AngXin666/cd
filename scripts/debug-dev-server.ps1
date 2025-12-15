# 调试开发服务器脚本
# 用于排查 Taro watch 模式内存泄漏问题
#
# 使用方法：
# .\scripts\debug-dev-server.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Taro 开发服务器调试工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 版本
Write-Host "[1/4] 检查 Node.js 版本..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green

# 清理缓存
Write-Host ""
Write-Host "[2/4] 清理构建缓存..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "已清理 dist 目录" -ForegroundColor Green
}
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "已清理 node_modules/.cache 目录" -ForegroundColor Green
}
if (Test-Path ".swc") {
    Remove-Item -Recurse -Force ".swc"
    Write-Host "已清理 .swc 目录" -ForegroundColor Green
}

# 选择调试模式
Write-Host ""
Write-Host "[3/4] 选择调试模式:" -ForegroundColor Yellow
Write-Host "  1. 最小化模式 (禁用所有自定义插件)"
Write-Host "  2. 正常模式 (使用当前配置)"
Write-Host "  3. 仅构建模式 (不启动 watch)"
Write-Host ""
$choice = Read-Host "请选择 (1/2/3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[4/4] 启动最小化调试模式..." -ForegroundColor Yellow
        Write-Host "提示: 如果此模式下内存正常，说明问题在自定义插件中" -ForegroundColor Cyan
        Write-Host ""
        
        # 备份原配置
        if (Test-Path "config/dev.ts") {
            Copy-Item "config/dev.ts" "config/dev.backup.ts" -Force
            Write-Host "已备份 config/dev.ts -> config/dev.backup.ts" -ForegroundColor Green
        }
        
        # 使用调试配置
        if (Test-Path "config/dev-debug.ts") {
            Copy-Item "config/dev-debug.ts" "config/dev.ts" -Force
            Write-Host "已应用调试配置" -ForegroundColor Green
        }
        
        # 启动开发服务器
        Write-Host ""
        Write-Host "启动开发服务器 (按 Ctrl+C 停止)..." -ForegroundColor Cyan
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5 --watch
        
        # 恢复原配置
        if (Test-Path "config/dev.backup.ts") {
            Copy-Item "config/dev.backup.ts" "config/dev.ts" -Force
            Write-Host "已恢复原配置" -ForegroundColor Green
        }
    }
    "2" {
        Write-Host ""
        Write-Host "[4/4] 启动正常模式..." -ForegroundColor Yellow
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5 --watch
    }
    "3" {
        Write-Host ""
        Write-Host "[4/4] 仅构建模式 (不启动 watch)..." -ForegroundColor Yellow
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5
        Write-Host ""
        Write-Host "构建完成！" -ForegroundColor Green
    }
    default {
        Write-Host "无效选择，退出" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "调试结束" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
