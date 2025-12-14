# Fix PowerShell script encoding
# Convert all .ps1 files to UTF-8 without BOM

$ErrorActionPreference = "Stop"

Write-Host "Fixing PowerShell script encoding..." -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scripts = Get-ChildItem -Path $scriptDir -Filter "*.ps1" -File

$fixed = 0
$failed = 0

foreach ($script in $scripts) {
    try {
        # Skip this script itself
        if ($script.Name -eq "fix-script-encoding.ps1") {
            continue
        }
        
        Write-Host "Processing: $($script.Name)" -ForegroundColor Yellow
        
        # Read file content
        $content = Get-Content -Path $script.FullName -Raw -Encoding UTF8
        
        # Write back with UTF-8 without BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($script.FullName, $content, $utf8NoBom)
        
        Write-Host "  OK" -ForegroundColor Green
        $fixed++
    }
    catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Fixed: $fixed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
