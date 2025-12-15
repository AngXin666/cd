# 本地调试环境设置脚本
# 用于排查 Taro watch 内存泄漏和 APK 卡顿问题
#
# 使用方法：
# .\scripts\local-debug-setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "本地调试环境设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "选择调试模式:" -ForegroundColor Yellow
Write-Host "  1. 排查 Taro watch 内存泄漏"
Write-Host "  2. 本地调试 APK (使用本地服务器)"
Write-Host "  3. 构建 APK 并打开输出目录"
Write-Host "  4. 清理所有缓存"
Write-Host ""
$choice = Read-Host "请选择 (1/2/3/4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "排查 Taro watch 内存泄漏" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "步骤说明:" -ForegroundColor Yellow
        Write-Host "1. 先使用最小化配置运行，观察内存"
        Write-Host "2. 如果内存正常，逐步启用插件"
        Write-Host "3. 找出导致内存泄漏的插件"
        Write-Host ""
        
        # 清理缓存
        Write-Host "清理缓存..." -ForegroundColor Yellow
        if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
        if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }
        if (Test-Path ".swc") { Remove-Item -Recurse -Force ".swc" }
        Write-Host "缓存已清理" -ForegroundColor Green
        Write-Host ""
        
        # 备份原配置
        if (Test-Path "config/dev.ts") {
            Copy-Item "config/dev.ts" "config/dev.original.ts" -Force
            Write-Host "已备份 config/dev.ts -> config/dev.original.ts" -ForegroundColor Green
        }
        
        # 使用调试配置
        if (Test-Path "config/dev-debug.ts") {
            Copy-Item "config/dev-debug.ts" "config/dev.ts" -Force
            Write-Host "已应用最小化调试配置" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "启动开发服务器 (按 Ctrl+C 停止)..." -ForegroundColor Cyan
        Write-Host "请观察任务管理器中 Node.js 的内存使用情况" -ForegroundColor Yellow
        Write-Host ""
        
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5 --watch
        
        # 恢复原配置
        if (Test-Path "config/dev.original.ts") {
            Copy-Item "config/dev.original.ts" "config/dev.ts" -Force
            Remove-Item "config/dev.original.ts" -Force
            Write-Host "已恢复原配置" -ForegroundColor Green
        }
    }
    "2" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "本地调试 APK" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "此模式会:" -ForegroundColor Yellow
        Write-Host "1. 构建 H5 到 dist 目录"
        Write-Host "2. 启动本地 HTTP 服务器"
        Write-Host "3. APK 可以连接到本地服务器进行调试"
        Write-Host ""
        
        # 获取本机 IP
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
        Write-Host "本机 IP: $localIP" -ForegroundColor Green
        Write-Host ""
        
        # 构建 H5
        Write-Host "构建 H5..." -ForegroundColor Yellow
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "构建成功！" -ForegroundColor Green
            Write-Host ""
            Write-Host "启动本地服务器..." -ForegroundColor Yellow
            Write-Host "访问地址: http://${localIP}:8080" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "提示: 在 APK 中配置此地址进行调试" -ForegroundColor Yellow
            Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
            Write-Host ""
            
            # 启动简单的 HTTP 服务器
            Set-Location dist
            python -m http.server 8080 --bind 0.0.0.0
            Set-Location ..
        } else {
            Write-Host "构建失败！" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "构建 APK" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # 构建 H5
        Write-Host "[1/3] 构建 H5..." -ForegroundColor Yellow
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
        pnpm taro build --type h5
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "H5 构建失败！" -ForegroundColor Red
            exit 1
        }
        
        # 同步到 Android
        Write-Host ""
        Write-Host "[2/3] 同步到 Android..." -ForegroundColor Yellow
        npx cap sync android
        
        # 构建 APK
        Write-Host ""
        Write-Host "[3/3] 构建 APK..." -ForegroundColor Yellow
        Set-Location android
        .\gradlew assembleDebug
        Set-Location ..
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "APK 构建成功！" -ForegroundColor Green
            Write-Host ""
            
            # 打开输出目录
            $apkPath = "android\app\build\outputs\apk\debug"
            if (Test-Path $apkPath) {
                Write-Host "打开 APK 输出目录..." -ForegroundColor Yellow
                explorer.exe $apkPath
            }
        } else {
            Write-Host "APK 构建失败！" -ForegroundColor Red
        }
    }
    "4" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "清理所有缓存" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # 清理 dist
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
            Write-Host "已清理 dist" -ForegroundColor Green
        }
        
        # 清理 node_modules/.cache
        if (Test-Path "node_modules/.cache") {
            Remove-Item -Recurse -Force "node_modules/.cache"
            Write-Host "已清理 node_modules/.cache" -ForegroundColor Green
        }
        
        # 清理 .swc
        if (Test-Path ".swc") {
            Remove-Item -Recurse -Force ".swc"
            Write-Host "已清理 .swc" -ForegroundColor Green
        }
        
        # 清理 Android 构建缓存
        if (Test-Path "android/.gradle") {
            Write-Host "清理 Android Gradle 缓存..." -ForegroundColor Yellow
            Set-Location android
            .\gradlew clean
            Set-Location ..
            Write-Host "已清理 Android 构建缓存" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "所有缓存已清理！" -ForegroundColor Green
    }
    default {
        Write-Host "无效选择" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
