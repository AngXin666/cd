# Windows Encoding Setup Script
# Configure all encoding settings to fix Windows encoding issues

# Set script encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# Set error handling
$ErrorActionPreference = "Stop"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Windows Encoding Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will configure:" -ForegroundColor Yellow
Write-Host "1. VSCode editor encoding settings" -ForegroundColor White
Write-Host "2. EditorConfig cross-editor settings" -ForegroundColor White
Write-Host "3. Git encoding and Chinese display" -ForegroundColor White
Write-Host "4. PowerShell Profile auto encoding" -ForegroundColor White
Write-Host "5. Create .gitattributes file" -ForegroundColor White
Write-Host ""

# Auto-continue (no user interaction needed)
Write-Host "Auto-starting setup..." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting setup..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Configuration counters
$successCount = 0
$failCount = 0
$totalSteps = 5

# Step 1: Check VSCode configuration
Write-Host "[1/$totalSteps] Checking VSCode configuration..." -ForegroundColor Cyan
$vscodeSettingsPath = Join-Path $projectRoot ".vscode\settings.json"

if (Test-Path $vscodeSettingsPath) {
    $vscodeContent = Get-Content $vscodeSettingsPath -Raw -Encoding UTF8
    if ($vscodeContent -match '"files\.encoding":\s*"utf8"') {
        Write-Host "  OK: VSCode encoding configuration exists" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  WARNING: VSCode config exists but missing encoding settings" -ForegroundColor Yellow
        Write-Host "  Hint: Please check .vscode/settings.json file manually" -ForegroundColor Yellow
        $failCount++
    }
} else {
    Write-Host "  WARNING: VSCode configuration file not found" -ForegroundColor Yellow
    Write-Host "  Hint: .vscode/settings.json should be created by task 1" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# Step 2: Check EditorConfig configuration
Write-Host "[2/$totalSteps] Checking EditorConfig configuration..." -ForegroundColor Cyan
$editorconfigPath = Join-Path $projectRoot ".editorconfig"

if (Test-Path $editorconfigPath) {
    $editorconfigContent = Get-Content $editorconfigPath -Raw -Encoding UTF8
    if ($editorconfigContent -match "charset\s*=\s*utf-8") {
        Write-Host "  OK: EditorConfig encoding configuration exists" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  WARNING: EditorConfig exists but missing encoding settings" -ForegroundColor Yellow
        $failCount++
    }
} else {
    Write-Host "  WARNING: EditorConfig file not found" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# Step 3: Configure Git encoding
Write-Host "[3/$totalSteps] Configuring Git encoding..." -ForegroundColor Cyan

try {
    # Check if Git is installed
    $gitVersion = git --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Git detected: $gitVersion" -ForegroundColor Green
        
        # Execute Git configuration script
        $gitConfigScript = Join-Path $scriptDir "setup-git-encoding.ps1"
        if (Test-Path $gitConfigScript) {
            Write-Host "  Configuring Git..." -ForegroundColor Yellow
            & $gitConfigScript
            Write-Host "  OK: Git configuration complete" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  WARNING: Git config script not found: $gitConfigScript" -ForegroundColor Yellow
            $failCount++
        }
    } else {
        Write-Host "  WARNING: Git not detected, skipping Git configuration" -ForegroundColor Yellow
        $failCount++
    }
} catch {
    Write-Host "  ERROR: Git configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Step 4: Check .gitattributes file
Write-Host "[4/$totalSteps] Checking .gitattributes file..." -ForegroundColor Cyan
$gitattributesPath = Join-Path $projectRoot ".gitattributes"

if (Test-Path $gitattributesPath) {
    Write-Host "  OK: .gitattributes file exists" -ForegroundColor Green
    $successCount++
} else {
    Write-Host "  WARNING: .gitattributes file not found" -ForegroundColor Yellow
    Write-Host "  Hint: .gitattributes should be created by task 3" -ForegroundColor Yellow
    $failCount++
}
Write-Host ""

# Step 5: Configure PowerShell Profile
Write-Host "[5/$totalSteps] Configuring PowerShell Profile..." -ForegroundColor Cyan

try {
    $psProfileScript = Join-Path $scriptDir "setup-powershell-profile.ps1"
    if (Test-Path $psProfileScript) {
        Write-Host "  Configuring PowerShell Profile..." -ForegroundColor Yellow
        & $psProfileScript
        Write-Host "  OK: PowerShell Profile configuration complete" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  WARNING: PowerShell Profile script not found: $psProfileScript" -ForegroundColor Yellow
        $failCount++
    }
} catch {
    Write-Host "  ERROR: PowerShell Profile configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Configuration summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Success: $successCount / $totalSteps" -ForegroundColor Green
Write-Host "Failed: $failCount / $totalSteps" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "OK: All configurations applied successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some configurations failed, please check error messages above" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart VSCode to apply editor configuration" -ForegroundColor White
Write-Host "2. Restart PowerShell to apply Profile configuration" -ForegroundColor White
Write-Host "3. Run verification script to check configuration:" -ForegroundColor White
Write-Host "   node scripts/verify-encoding-config.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test encoding:" -ForegroundColor White
Write-Host "   - Run in PowerShell: chcp" -ForegroundColor Cyan
Write-Host "     Should display: Active code page: 65001" -ForegroundColor Cyan
Write-Host "   - Output Chinese in PowerShell:" -ForegroundColor Cyan
Write-Host "     Write-Host 'Hello World'" -ForegroundColor Cyan
Write-Host "   - Check Chinese filenames in Git:" -ForegroundColor Cyan
Write-Host "     git status" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
