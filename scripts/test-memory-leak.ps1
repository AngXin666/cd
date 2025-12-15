# ============================================
# Taro Watch 模式内存泄漏测试脚本
# 用于逐个测试插件，找出导致内存泄漏的插件
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Taro Watch 模式内存泄漏测试" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 检查配置文件是否存在
$configs = @(
    "config/dev.ts",
    "config/dev-minimal.ts",
    "config/dev-test-tagger.ts",
    "config/dev-test-gui.ts",
    "config/dev-test-error.ts"
)

$missingConfigs = @()
foreach ($config in $configs) {
    if (-not (Test-Path $config)) {
        $missingConfigs += $config
    }
}

if ($missingConfigs.Count -gt 0) {
    Write-Host "缺少以下配置文件：" -ForegroundColor Red
    foreach ($config in $missingConfigs) {
        Write-Host "  - $config" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "请先运行 local-debug-setup.ps1 创建测试配置文件" -ForegroundColor Yellow
    exit 1
}

# 显示菜单
function Show-Menu {
    Write-Host ""
    Write-Host "请选择测试项目：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] 测试 1：最小化配置（无插件）" -ForegroundColor White
    Write-Host "  [2] 测试 2：仅启用 makeTagger" -ForegroundColor White
    Write-Host "  [3] 测试 3：仅启用 injectedGuiListenerPlugin" -ForegroundColor White
    Write-Host "  [4] 测试 4：仅启用 injectOnErrorPlugin" -ForegroundColor White
    Write-Host "  [5] 测试 5：恢复原配置" -ForegroundColor White
    Write-Host "  [6] 清理并退出" -ForegroundColor White
    Write-Host ""
}

# 备份原配置
function Backup-Config {
    if (-not (Test-Path "config/dev.backup.ts")) {
        Write-Host "备份原配置..." -ForegroundColor Gray
        Copy-Item "config/dev.ts" "config/dev.backup.ts"
        Write-Host "已备份到 config/dev.backup.ts" -ForegroundColor Green
    }
}

# 清理缓存
function Clear-Cache {
    Write-Host "清理缓存..." -ForegroundColor Gray
    Remove-Item -Recurse -Force dist, node_modules/.cache, .swc -ErrorAction SilentlyContinue
    Write-Host "缓存已清理" -ForegroundColor Green
}

# 运行测试
function Run-Test {
    param (
        [string]$ConfigFile,
        [string]$TestName
    )
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  $TestName" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 备份原配置
    Backup-Config
    
    # 复制测试配置
    Write-Host "使用配置：$ConfigFile" -ForegroundColor Gray
    Copy-Item $ConfigFile "config/dev.ts"
    
    # 清理缓存
    Clear-Cache
    
    Write-Host ""
    Write-Host "即将启动开发服务器..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请观察任务管理器中 Node.js 的内存使用：" -ForegroundColor Yellow
    Write-Host "  1. 记录启动后初始内存" -ForegroundColor White
    Write-Host "  2. 等待 5 分钟，记录内存" -ForegroundColor White
    Write-Host "  3. 修改一个文件触发热更新" -ForegroundColor White
    Write-Host "  4. 再等待 5 分钟，记录内存" -ForegroundColor White
    Write-Host ""
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
    Write-Host ""
    
    # 设置 Node.js 内存限制
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    
    # 启动开发服务器
    pnpm taro build --type h5 --watch
}

# 恢复原配置
function Restore-Config {
    if (Test-Path "config/dev.backup.ts") {
        Write-Host "恢复原配置..." -ForegroundColor Gray
        Copy-Item "config/dev.backup.ts" "config/dev.ts"
        Remove-Item "config/dev.backup.ts"
        Write-Host "已恢复原配置" -ForegroundColor Green
    } else {
        Write-Host "没有找到备份文件" -ForegroundColor Yellow
    }
}

# 主循环
while ($true) {
    Show-Menu
    $choice = Read-Host "请输入选项 (1-6)"
    
    switch ($choice) {
        "1" {
            Run-Test "config/dev-minimal.ts" "测试 1：最小化配置（无插件）"
        }
        "2" {
            Run-Test "config/dev-test-tagger.ts" "测试 2：仅启用 makeTagger"
        }
        "3" {
            Run-Test "config/dev-test-gui.ts" "测试 3：仅启用 injectedGuiListenerPlugin"
        }
        "4" {
            Run-Test "config/dev-test-error.ts" "测试 4：仅启用 injectOnErrorPlugin"
        }
        "5" {
            Restore-Config
            Run-Test "config/dev.ts" "测试 5：原配置"
        }
        "6" {
            Restore-Config
            Clear-Cache
            Write-Host ""
            Write-Host "测试完成，已清理" -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "无效选项，请重新选择" -ForegroundColor Red
        }
    }
}
