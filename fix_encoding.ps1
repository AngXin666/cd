# PowerShell脚本：扫描并修复编码问题

$ErrorActionPreference = "Continue"

# 定义需要扫描的文件扩展名
$extensions = @('.ts', '.tsx', '.js', '.jsx', '.md')

# 定义需要排除的目录
$excludeDirs = @('node_modules', '.git', 'dist', 'build', '.next', '.kiro')

# 常见的乱码模式和修复
$encodingFixes = @{
    '环�?' = '环境'
    '失�?' = '失败'
    '错�?' = '错误'
    '系�?' = '系统'
    '请输�?' = '请输入'
    '账�?' = '账号'
    '支持�?' = '支持'
    '密�?' = '密码'
    '登�?' = '登录'
    '�?位' = '6位'
    '按钮�?' = '按钮'
    '登录�?..' = '登录中...'
    '验证码登�?' = '验证码登录'
    '快速登�?' = '快速登录'
    '开发测�?' = '开发测试'
    '�?收起' = '▲ 收起'
    '�?展开' = '▼ 展开'
    '点击填充 �?' = '点击填充 ▶'
    '车队长账�?' = '车队长账号'
    '车队�?' = '车队长'
    '使用说明�?' = '使用说明：'
    '登录方式说明�?' = '登录方式说明：'
    '�?密码登录' = '• 密码登录'
    '�?验证码登录' = '• 验证码登录'
    '验证�?' = '验证码'
    '�?admin' = '• admin'
}

Write-Host "🔍 开始扫描编码问题..." -ForegroundColor Cyan
Write-Host "📝 扫描文件类型: $($extensions -join ', ')" -ForegroundColor Gray
Write-Host "🚫 排除目录: $($excludeDirs -join ', ')" -ForegroundColor Gray
Write-Host ("-" * 60)

$fixedFiles = @()
$errorFiles = @()

# 获取所有需要检查的文件
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $file = $_
    $shouldInclude = $false
    
    # 检查扩展名
    foreach ($ext in $extensions) {
        if ($file.Extension -eq $ext) {
            $shouldInclude = $true
            break
        }
    }
    
    if (-not $shouldInclude) {
        return $false
    }
    
    # 检查是否在排除目录中
    $relativePath = $file.FullName.Replace((Get-Location).Path, '')
    foreach ($excludeDir in $excludeDirs) {
        if ($relativePath -like "*\$excludeDir\*" -or $relativePath -like "*/$excludeDir/*") {
            return $false
        }
    }
    
    return $true
}

Write-Host "📂 找到 $($files.Count) 个文件需要检查" -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        # 读取文件内容
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        
        if ($null -eq $content) {
            continue
        }
        
        # 检查是否包含乱码
        $hasIssue = $false
        if ($content -match '�') {
            $hasIssue = $true
        } else {
            foreach ($pattern in $encodingFixes.Keys) {
                if ($content -match [regex]::Escape($pattern)) {
                    $hasIssue = $true
                    break
                }
            }
        }
        
        if ($hasIssue) {
            Write-Host "🔧 发现编码问题: $($file.FullName)" -ForegroundColor Yellow
            
            $originalContent = $content
            
            # 应用所有修复
            foreach ($fix in $encodingFixes.GetEnumerator()) {
                $content = $content.Replace($fix.Key, $fix.Value)
            }
            
            if ($content -ne $originalContent) {
                # 写回文件
                $content | Out-File -FilePath $file.FullName -Encoding UTF8 -NoNewline
                $fixedFiles += $file.FullName
                Write-Host "   ✅ 已修复" -ForegroundColor Green
            }
        }
    }
    catch {
        $errorFiles += @{File = $file.FullName; Error = $_.Exception.Message}
        Write-Host "   ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 打印总结
Write-Host ("-" * 60)
Write-Host "`n📊 扫描完成!" -ForegroundColor Cyan
Write-Host "✅ 成功修复: $($fixedFiles.Count) 个文件" -ForegroundColor Green

if ($fixedFiles.Count -gt 0) {
    Write-Host "`n修复的文件列表:" -ForegroundColor Yellow
    foreach ($file in $fixedFiles) {
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

if ($errorFiles.Count -gt 0) {
    Write-Host "`n❌ 错误: $($errorFiles.Count) 个文件" -ForegroundColor Red
    foreach ($error in $errorFiles) {
        Write-Host "  - $($error.File): $($error.Error)" -ForegroundColor Gray
    }
}

if ($fixedFiles.Count -eq 0 -and $errorFiles.Count -eq 0) {
    Write-Host "✨ 没有发现编码问题，所有文件都正常！" -ForegroundColor Green
}

Write-Host "`n✅ 完成！" -ForegroundColor Cyan
