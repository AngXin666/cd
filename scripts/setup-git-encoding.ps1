/**
 * Git 编码配置脚本
 * 配置 Git 正确显示和处理中文文件名、提交信息
 * 确保 Git 使用 UTF-8 编码
 */

# 设置脚本编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git 编码配置脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 是否安装
try {
    $gitVersion = git --version
    Write-Host "✓ 检测到 Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 未检测到 Git，请先安装 Git" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "开始配置 Git 编码设置..." -ForegroundColor Yellow
Write-Host ""

# 配置 Git 核心设置
Write-Host "1. 配置 core.quotepath = false (显示中文文件名)" -ForegroundColor Cyan
git config --global core.quotepath false

Write-Host "2. 配置 core.autocrlf = false (禁用自动换行转换)" -ForegroundColor Cyan
git config --global core.autocrlf false

Write-Host "3. 配置 core.safecrlf = false (禁用换行符检查)" -ForegroundColor Cyan
git config --global core.safecrlf false

Write-Host "4. 配置 core.filemode = false (忽略文件权限变化)" -ForegroundColor Cyan
git config --global core.filemode false

Write-Host ""
Write-Host "5. 配置 GUI 编码为 UTF-8" -ForegroundColor Cyan
git config --global gui.encoding utf-8

Write-Host ""
Write-Host "6. 配置 i18n 编码为 UTF-8" -ForegroundColor Cyan
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Git 配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 显示当前配置
Write-Host "当前 Git 编码相关配置：" -ForegroundColor Yellow
Write-Host ""
Write-Host "core.quotepath       = $(git config --global core.quotepath)" -ForegroundColor White
Write-Host "core.autocrlf        = $(git config --global core.autocrlf)" -ForegroundColor White
Write-Host "core.safecrlf        = $(git config --global core.safecrlf)" -ForegroundColor White
Write-Host "core.filemode        = $(git config --global core.filemode)" -ForegroundColor White
Write-Host "gui.encoding         = $(git config --global gui.encoding)" -ForegroundColor White
Write-Host "i18n.commitencoding  = $(git config --global i18n.commitencoding)" -ForegroundColor White
Write-Host "i18n.logoutputencoding = $(git config --global i18n.logoutputencoding)" -ForegroundColor White
Write-Host ""

Write-Host "提示：配置已应用到全局 Git 设置" -ForegroundColor Cyan
Write-Host "你可以使用 'git config --global --list' 查看所有全局配置" -ForegroundColor Cyan
Write-Host ""
