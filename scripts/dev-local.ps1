# ============================================
# 本地开发脚本（替代 watch 模式）
# 解决 Taro watch 模式内存泄漏问题
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  本地开发环境启动" -ForegroundColor Cyan
Write-Host "  (替代 watch 模式，避免内存泄漏)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 设置变量
$PORT = 8080
$DIST_DIR = "dist"

# 函数：构建 H5
function Build-H5 {
    Write-Host "[构建] 开始构建 H5..." -ForegroundColor Yellow
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    pnpm taro build --type h5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[构建] 构建成功!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[构建] 构建失败!" -ForegroundColor Red
        return $false
    }
}

# 函数：启动服务器
function Start-Server {
    Write-Host "[服务器] 启动本地服务器 (端口: $PORT)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  本地访问: http://localhost:$PORT" -ForegroundColor White
    Write-Host "  局域网访问: http://192.168.1.25:$PORT" -ForegroundColor White
    Write-Host ""
    Write-Host "  按 Ctrl+C 停止服务器" -ForegroundColor Gray
    Write-Host "  修改代码后，重新运行此脚本即可" -ForegroundColor Gray
    Write-Host ""
    
    npx serve $DIST_DIR -l $PORT -s
}

# 主流程
Write-Host "[检查] 检查 dist 目录..." -ForegroundColor Gray

# 如果 dist 不存在或为空，先构建
if (-not (Test-Path $DIST_DIR) -or (Get-ChildItem $DIST_DIR -ErrorAction SilentlyContinue).Count -eq 0) {
    Write-Host "[检查] dist 目录不存在或为空，需要先构建" -ForegroundColor Yellow
    $buildResult = Build-H5
    if (-not $buildResult) {
        Write-Host "[错误] 构建失败，无法启动服务器" -ForegroundColor Red
        exit 1
    }
}

# 启动服务器
Start-Server
