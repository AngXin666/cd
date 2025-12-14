# 读取文件（使用UTF8编码）
$content = Get-Content -Path "src/pages/login/index.tsx" -Raw -Encoding UTF8

# 修复分号问题
$content = $content -replace "removeStorageCompat\('loginSourcePage'\)\r?\n", "removeStorageCompat('loginSourcePage');`n"
$content = $content -replace "removeStorageCompat\('isTestLogin'\)\r?\n", "removeStorageCompat('isTestLogin');`n"
$content = $content -replace "switchTab\(\{url: '/pages/index/index'\}\)\r?\n", "switchTab({url: '/pages/index/index'});`n"
$content = $content -replace "reLaunch\(\{url: '/pages/index/index'\}\)\r?\n", "reLaunch({url: '/pages/index/index'});`n"

# 写回文件（使用UTF8编码，无BOM）
$Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText("src/pages/login/index.tsx", $content, $Utf8NoBomEncoding)

Write-Host "✅ 修复完成！"
