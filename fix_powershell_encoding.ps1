# 修复PowerShell编码问题
# 将此脚本添加到PowerShell配置文件中，使UTF-8成为默认编码

Write-Host "正在配置PowerShell使用UTF-8编码..." -ForegroundColor Green

# 设置控制台输出编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 设置代码页为UTF-8
chcp 65001 | Out-Null

Write-Host "✓ PowerShell编码已设置为UTF-8" -ForegroundColor Green
Write-Host ""
Write-Host "如果要永久设置，请将以下内容添加到PowerShell配置文件中：" -ForegroundColor Yellow
Write-Host ""
Write-Host '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8' -ForegroundColor Cyan
Write-Host '[Console]::InputEncoding = [System.Text.Encoding]::UTF8' -ForegroundColor Cyan
Write-Host 'chcp 65001 | Out-Null' -ForegroundColor Cyan
Write-Host ""
Write-Host "PowerShell配置文件位置: `$PROFILE" -ForegroundColor Yellow
Write-Host "实际路径: $PROFILE" -ForegroundColor Gray
