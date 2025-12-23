# 车队管家部署脚本 (PowerShell)
# 
# 使用方法：
#   开发环境：.\scripts\deploy.ps1 dev
#   生产环境：.\scripts\deploy.ps1 prod
#   停止服务：.\scripts\deploy.ps1 stop
#   查看日志：.\scripts\deploy.ps1 logs

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = ""
)

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查 Docker 是否安装
function Test-Docker {
    try {
        docker --version | Out-Null
        docker-compose --version | Out-Null
        Write-Info "Docker 环境检查通过"
        return $true
    }
    catch {
        Write-Error "Docker 或 Docker Compose 未安装"
        return $false
    }
}

# 检查环境变量文件
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warn ".env 文件不存在，从模板创建..."
        Copy-Item ".env.template" ".env"
        Write-Warn "请编辑 .env 文件配置环境变量"
    }
}

# 开发环境部署
function Deploy-Dev {
    Write-Info "启动开发环境..."
    Test-EnvFile
    docker-compose up -d --build
    Write-Info "开发环境启动完成"
    Write-Info "前端地址: http://localhost"
    Write-Info "后端 API: http://localhost:8000"
    Write-Info "API 文档: http://localhost:8000/docs"
}

# 生产环境部署
function Deploy-Prod {
    Write-Info "启动生产环境..."
    Test-EnvFile
    
    # 检查 SSL 证书
    if (-not (Test-Path "nginx/ssl/fullchain.pem") -or -not (Test-Path "nginx/ssl/privkey.pem")) {
        Write-Error "SSL 证书不存在，请先配置 SSL 证书"
        Write-Error "参考: nginx/ssl/README.md"
        exit 1
    }
    
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    Write-Info "生产环境启动完成"
    Write-Info "HTTPS 地址: https://your-domain.com"
}

# 停止服务
function Stop-Services {
    Write-Info "停止所有服务..."
    docker-compose down
    Write-Info "服务已停止"
}

# 查看日志
function Show-Logs {
    param([string]$ServiceName)
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        docker-compose logs -f
    }
    else {
        docker-compose logs -f $ServiceName
    }
}

# 重启服务
function Restart-Services {
    Write-Info "重启所有服务..."
    docker-compose restart
    Write-Info "服务已重启"
}

# 清理资源
function Clear-Resources {
    Write-Info "清理 Docker 资源..."
    docker-compose down -v --rmi local
    docker system prune -f
    Write-Info "清理完成"
}

# 显示帮助
function Show-Help {
    Write-Host "车队管家部署脚本 (PowerShell)"
    Write-Host ""
    Write-Host "使用方法: .\scripts\deploy.ps1 <命令> [参数]"
    Write-Host ""
    Write-Host "命令:"
    Write-Host "  dev         启动开发环境"
    Write-Host "  prod        启动生产环境（需要 SSL 证书）"
    Write-Host "  stop        停止所有服务"
    Write-Host "  restart     重启所有服务"
    Write-Host "  logs [服务] 查看日志（可选指定服务：backend/frontend/db）"
    Write-Host "  cleanup     清理 Docker 资源"
    Write-Host "  help        显示此帮助信息"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\scripts\deploy.ps1 dev              # 启动开发环境"
    Write-Host "  .\scripts\deploy.ps1 prod             # 启动生产环境"
    Write-Host "  .\scripts\deploy.ps1 logs backend     # 查看后端日志"
}

# 主逻辑
if (-not (Test-Docker)) {
    exit 1
}

switch ($Command.ToLower()) {
    "dev" {
        Deploy-Dev
    }
    "prod" {
        Deploy-Prod
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Restart-Services
    }
    "logs" {
        Show-Logs -ServiceName $Service
    }
    "cleanup" {
        Clear-Resources
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error "未知命令: $Command"
        Show-Help
        exit 1
    }
}
