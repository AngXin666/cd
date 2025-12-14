/**
 * Windows 编码问题一键配置脚本
 * 自动配置所有编码相关设置，彻底解决 Windows 编码问题
 * 包括：VSCode、Git、PowerShell Profile 配置
 */

# 设置脚本编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# 设置错误处理
$ErrorActionPreference = "Stop"

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Windows 编码问题一键配置脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "此脚本将配置以下内容：" -ForegroundColor Yellow
Write-Host "1. VSCode 编辑器编码设置" -ForegroundColor White
Write-Host "2. EditorConfig 跨编辑器配置" -ForegroundColor White
Write-Host "3. Git 编码和中文显示" -ForegroundColor White
Write-Host "4. PowerShell Profile 自动编码设置" -ForegroundColor White
Write-Host "5. 创建 .gitattributes 文件" -ForegroundColor White
Write-Host ""

# 询问用户是否继续
$response = Read-Host "是否继续？(Y/N)"
if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "取消配置" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "开始配置..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 配置计数器
$successCount = 0
$failCount = 0
$totalSteps = 5

# ========================================
# 步骤 1: 检查 VSCode 配置
# ========================================
Write-Host "[1/$totalSteps] 检查 VSCode 配置..." -ForegroundColor Cyan
$vscodeSettingsPath = Join-Path $projectRoot ".vscode\settings.json"

if (Test-Path $vscodeSettingsPath) {
    $vscodeContent = Get-Content $vscodeSettingsPath -Raw -Encoding UTF8
    if ($vscodeContent -match '"files\.encoding":\s*"utf8"') {
        Write-Host "  ✓ VSCode 编码配置已存在" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ⚠ VSCode 配置存在但缺少编码设置" -ForegroundColor Yellow
        Write-Host "  提示：请手动检查 .vscode/settings.json 文件" -ForegroundColor Yellow
        $failCount++
    }
} else {
    Write-Host "  ⚠ VSCode 配置文件不存在" -ForegroundColor Yellow
    Write-Host "  提示：.vscode/settings.json 应该已经通过任务 1 创建" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# ========================================
# 步骤 2: 检查 EditorConfig 配置
# ========================================
Write-Host "[2/$totalSteps] 检查 EditorConfig 配置..." -ForegroundColor Cyan
$editorconfigPath = Join-Path $projectRoot ".editorconfig"

if (Test-Path $editorconfigPath) {
    $editorconfigContent = Get-Content $editorconfigPath -Raw -Encoding UTF8
    if ($editorconfigContent -match "charset\s*=\s*utf-8") {
        Write-Host "  ✓ EditorConfig 编码配置已存在" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ⚠ EditorConfig 配置存在但缺少编码设置" -ForegroundColor Yellow
        $failCount++
    }
} else {
    Write-Host "  ⚠ EditorConfig 配置文件不存在" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# ========================================
# 步骤 3: 配置 Git 编码
# ========================================
Write-Host "[3/$totalSteps] 配置 Git 编码..." -ForegroundColor Cyan

try {
    # 检查 Git 是否安装
    $gitVersion = git --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ 检测到 Git: $gitVersion" -ForegroundColor Green
        
        # 执行 Git 配置脚本
        $gitConfigScript = Join-Path $scriptDir "setup-git-encoding.ps1"
        if (Test-Path $gitConfigScript) {
            Write-Host "  正在配置 Git..." -ForegroundColor Yellow
            & $gitConfigScript
            Write-Host "  ✓ Git 配置完成" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ⚠ Git 配置脚本不存在: $gitConfigScript" -ForegroundColor Yellow
            $failCount++
        }
    } else {
        Write-Host "  ⚠ 未检测到 Git，跳过 Git 配置" -ForegroundColor Yellow
        $failCount++
    }
} catch {
    Write-Host "  ✗ Git 配置失败: $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# ========================================
# 步骤 4: 检查 .gitattributes 文件
# ========================================
Write-Host "[4/$totalSteps] 检查 .gitattributes 文件..." -ForegroundColor Cyan
$gitattributesPath = Join-Path $projectRoot ".gitattributes"

if (Test-Path $gitattributesPath) {
    Write-Host "  ✓ .gitattributes 文件已存在" -ForegroundColor Green
    $successCount++
} else {
    Write-Host "  ⚠ .gitattributes 文件不存在" -ForegroundColor Yellow
    Write-Host "  提示：.gitattributes 应该已经通过任务 3 创建" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# ========================================
# 步骤 5: 配置 PowerShell Profile
# ========================================
Write-Host "[5/$totalSteps] 配置 PowerShell Profile..." -ForegroundColor Cyan

try {
    $psProfileScript = Join-Path $scriptDir "setup-powershell-profile.ps1"
    if (Test-Path $psProfileScript) {
        Write-Host "  正在配置 PowerShell Profile..." -ForegroundColor Yellow
        & $psProfileScript
        Write-Host "  ✓ PowerShell Profile 配置完成" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ⚠ PowerShell Profile 配置脚本不存在: $psProfileScript" -ForegroundColor Yellow
        $failCount++
    }
} catch {
    Write-Host "  ✗ PowerShell Profile 配置失败: $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# ========================================
# 配置总结
# ========================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "配置完成总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "成功: $successCount / $totalSteps" -ForegroundColor Green
Write-Host "失败: $failCount / $totalSteps" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✓ 所有配置已成功应用！" -ForegroundColor Green
} else {
    Write-Host "⚠ 部分配置未成功，请检查上面的错误信息" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "下一步操作" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 重启 VSCode 使编辑器配置生效" -ForegroundColor White
Write-Host "2. 重启 PowerShell 使 Profile 配置生效" -ForegroundColor White
Write-Host "3. 运行验证脚本检查配置：" -ForegroundColor White
Write-Host "   node scripts/verify-encoding-config.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. 测试编码是否正常：" -ForegroundColor White
Write-Host "   - 在 PowerShell 中运行：chcp" -ForegroundColor Cyan
Write-Host "     应该显示：活动代码页: 65001" -ForegroundColor Cyan
Write-Host "   - 在 PowerShell 中输出中文：" -ForegroundColor Cyan
Write-Host "     Write-Host '你好，世界！'" -ForegroundColor Cyan
Write-Host "   - 在 Git 中查看中文文件名：" -ForegroundColor Cyan
Write-Host "     git status" -ForegroundColor Cyan
Write-Host ""

Write-Host "配置完成！" -ForegroundColor Green
Write-Host ""
