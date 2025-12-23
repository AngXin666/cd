# Docker 部署测试脚本
# 用于验证 fleet-manager 的 Docker 部署是否正常
#
# 使用方法：
#   .\test-docker-deployment.ps1
#
# 前提条件：
#   - 已安装 Docker 和 Docker Compose
#   - 当前目录为 fleet-manager 根目录

param(
    [switch]$SkipBuild,
    [switch]$Cleanup
)

$ErrorActionPreference = "Stop"

Write-Host "=" * 60
Write-Host "Fleet Manager Docker 部署测试"
Write-Host "=" * 60

# 检查 Docker 是否可用
Write-Host "`n检查 Docker..."
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker 已安装: $dockerVersion"
} catch {
    Write-Host "❌ Docker 未安装或不可用"
    exit 1
}

# 检查 Docker Compose 是否可用
Write-Host "`n检查 Docker Compose..."
try {
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose 已安装: $composeVersion"
} catch {
    Write-Host "❌ Docker Compose 未安装或不可用"
    exit 1
}

# 切换到 fleet-manager 目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$fleetManagerDir = Split-Path -Parent $scriptDir
Set-Location $fleetManagerDir

Write-Host "`n当前目录: $(Get-Location)"

# 清理旧容器（如果需要）
if ($Cleanup) {
    Write-Host "`n清理旧容器..."
    docker compose down -v
}

# 构建镜像
if (-not $SkipBuild) {
    Write-Host "`n构建 Docker 镜像..."
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 镜像构建失败"
        exit 1
    }
    Write-Host "✅ 镜像构建成功"
}

# 启动服务
Write-Host "`n启动服务..."
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务启动失败"
    exit 1
}
Write-Host "✅ 服务已启动"

# 等待服务就绪
Write-Host "`n等待服务就绪..."
$maxRetries = 30
$retryCount = 0
$servicesReady = $false

while ($retryCount -lt $maxRetries -and -not $servicesReady) {
    Start-Sleep -Seconds 2
    $retryCount++
    
    try {
        # 检查后端健康状态
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $servicesReady = $true
        }
    } catch {
        Write-Host "  等待中... ($retryCount/$maxRetries)"
    }
}

if (-not $servicesReady) {
    Write-Host "❌ 服务未能在预期时间内就绪"
    docker compose logs
    exit 1
}

Write-Host "✅ 服务已就绪"

# 测试后端 API
Write-Host "`n测试后端 API..."

# 健康检查
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing
    Write-Host "✅ 健康检查: $($response.StatusCode)"
} catch {
    Write-Host "❌ 健康检查失败: $_"
}

# 存活检查
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health/live" -UseBasicParsing
    Write-Host "✅ 存活检查: $($response.StatusCode)"
} catch {
    Write-Host "❌ 存活检查失败: $_"
}

# 就绪检查
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health/ready" -UseBasicParsing
    Write-Host "✅ 就绪检查: $($response.StatusCode)"
} catch {
    Write-Host "❌ 就绪检查失败: $_"
}

# API 文档
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
    Write-Host "✅ Swagger UI: $($response.StatusCode)"
} catch {
    Write-Host "❌ Swagger UI 失败: $_"
}

# 测试前端
Write-Host "`n测试前端..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing
    Write-Host "✅ 前端页面: $($response.StatusCode)"
} catch {
    Write-Host "⚠️ 前端页面: $_"
}

# 显示容器状态
Write-Host "`n容器状态:"
docker compose ps

# 显示日志摘要
Write-Host "`n最近日志:"
docker compose logs --tail=10

Write-Host "`n" + "=" * 60
Write-Host "Docker 部署测试完成"
Write-Host "=" * 60

Write-Host "`n访问地址:"
Write-Host "  - 后端 API: http://localhost:8000"
Write-Host "  - API 文档: http://localhost:8000/docs"
Write-Host "  - 前端页面: http://localhost:80"

Write-Host "`n停止服务:"
Write-Host "  docker compose down"

Write-Host "`n查看日志:"
Write-Host "  docker compose logs -f"
