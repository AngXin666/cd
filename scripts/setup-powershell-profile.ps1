/**
 * PowerShell Profile 配置脚本
 * 自动配置 PowerShell 使用 UTF-8 编码
 * 每次启动 PowerShell 时自动应用编码设置
 */

# 设置脚本编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PowerShell Profile 配置脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检测 PowerShell Profile 位置
$profilePath = $PROFILE
Write-Host "PowerShell Profile 位置: $profilePath" -ForegroundColor Yellow
Write-Host ""

# 检查 Profile 文件是否存在
if (Test-Path $profilePath) {
    Write-Host "✓ Profile 文件已存在" -ForegroundColor Green
    Write-Host ""
    
    # 读取现有内容
    $existingContent = Get-Content $profilePath -Raw -Encoding UTF8
    
    # 检查是否已经配置了编码设置
    if ($existingContent -match "UTF-8 编码配置") {
        Write-Host "⚠ Profile 中已存在 UTF-8 编码配置" -ForegroundColor Yellow
        Write-Host ""
        $response = Read-Host "是否要更新配置？(Y/N)"
        
        if ($response -ne "Y" -and $response -ne "y") {
            Write-Host "取消配置" -ForegroundColor Yellow
            exit 0
        }
        
        # 备份现有 Profile
        $backupPath = "$profilePath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $profilePath $backupPath
        Write-Host "✓ 已备份现有 Profile 到: $backupPath" -ForegroundColor Green
        Write-Host ""
    }
} else {
    Write-Host "✗ Profile 文件不存在，将创建新文件" -ForegroundColor Yellow
    Write-Host ""
    
    # 确保目录存在
    $profileDir = Split-Path $profilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
        Write-Host "✓ 已创建 Profile 目录: $profileDir" -ForegroundColor Green
    }
}

# UTF-8 编码配置内容
$encodingConfig = @"

# ========================================
# UTF-8 编码配置
# 自动设置 PowerShell 使用 UTF-8 编码
# ========================================

# 设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8

# 设置代码页为 65001 (UTF-8)
chcp 65001 > `$null

# 设置 PSDefaultParameterValues - 所有文件操作默认使用 UTF-8
`$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# 设置环境变量
`$env:PYTHONIOENCODING = "utf-8"
`$env:LANG = "zh_CN.UTF-8"
`$env:LC_ALL = "zh_CN.UTF-8"

# 显示编码配置已加载（可选，注释掉以隐藏）
# Write-Host "✓ UTF-8 编码配置已加载" -ForegroundColor Green

"@

# 写入或追加配置
if (Test-Path $profilePath) {
    # 读取现有内容
    $existingContent = Get-Content $profilePath -Raw -Encoding UTF8
    
    # 移除旧的编码配置（如果存在）
    $pattern = "# ========================================\s*\r?\n# UTF-8 编码配置[\s\S]*?# ========================================\s*\r?\n[\s\S]*?(?=\r?\n\r?\n|$)"
    $cleanedContent = $existingContent -replace $pattern, ""
    
    # 追加新配置
    $newContent = $cleanedContent.TrimEnd() + "`n" + $encodingConfig
    $newContent | Out-File -FilePath $profilePath -Encoding UTF8 -NoNewline
} else {
    # 创建新文件
    $encodingConfig | Out-File -FilePath $profilePath -Encoding UTF8 -NoNewline
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "PowerShell Profile 配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "配置内容已添加到: $profilePath" -ForegroundColor Cyan
Write-Host ""

Write-Host "提示：" -ForegroundColor Yellow
Write-Host "1. 配置将在下次启动 PowerShell 时自动生效" -ForegroundColor White
Write-Host "2. 或者运行以下命令立即生效：" -ForegroundColor White
Write-Host "   . `$PROFILE" -ForegroundColor Cyan
Write-Host ""

Write-Host "验证配置：" -ForegroundColor Yellow
Write-Host "1. 重启 PowerShell" -ForegroundColor White
Write-Host "2. 运行命令：chcp" -ForegroundColor White
Write-Host "3. 应该显示：活动代码页: 65001" -ForegroundColor White
Write-Host ""

# 询问是否立即应用配置
$response = Read-Host "是否立即应用配置？(Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "正在应用配置..." -ForegroundColor Yellow
    . $PROFILE
    Write-Host "✓ 配置已应用" -ForegroundColor Green
    Write-Host ""
    Write-Host "当前代码页：" -ForegroundColor Cyan
    chcp
}

Write-Host ""
Write-Host "配置完成！" -ForegroundColor Green
