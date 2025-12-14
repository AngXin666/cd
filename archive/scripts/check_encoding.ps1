# PowerShell脚本：检查编码问题

$extensions = @('.ts', '.tsx', '.js', '.jsx', '.md')
$excludeDirs = @('node_modules', '.git', 'dist', 'build', '.next', '.kiro')

Write-Host "Checking for encoding issues..." -ForegroundColor Cyan

$filesWithIssues = @()

$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $file = $_
    $shouldInclude = $false
    
    foreach ($ext in $extensions) {
        if ($file.Extension -eq $ext) {
            $shouldInclude = $true
            break
        }
    }
    
    if (-not $shouldInclude) {
        return $false
    }
    
    $relativePath = $file.FullName.Replace((Get-Location).Path, '')
    foreach ($excludeDir in $excludeDirs) {
        if ($relativePath -like "*\$excludeDir\*") {
            return $false
        }
    }
    
    return $true
}

Write-Host "Checking $($files.Count) files..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        
        if ($null -ne $content -and $content -match '\uFFFD') {
            $filesWithIssues += $file.FullName
            Write-Host "Found issue in: $($file.FullName)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error reading: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Files checked: $($files.Count)" -ForegroundColor Green
Write-Host "Files with issues: $($filesWithIssues.Count)" -ForegroundColor $(if ($filesWithIssues.Count -gt 0) { "Red" } else { "Green" })

if ($filesWithIssues.Count -eq 0) {
    Write-Host "`nNo encoding issues found!" -ForegroundColor Green
}
