#Requires -Version 5.1
<#
.SYNOPSIS
    PowerShell Script Template - UTF-8 Encoding Version
    
.DESCRIPTION
    This is a standard PowerShell script template with the following features:
    - UTF-8 encoding settings (solves Chinese garbled characters on Windows)
    - Standard error handling configuration
    - Log output functions
    - Common utility functions
    
    To create a new script using this template:
    1. Copy this file and rename it
    2. Modify the .SYNOPSIS and .DESCRIPTION sections
    3. Write your business logic in the Script Body section
    4. Ensure the file is saved as UTF-8 without BOM
    
.PARAMETER ExampleParam
    Example parameter description (modify as needed)
    
.EXAMPLE
    .\your-script.ps1
    Basic example of running the script
    
.EXAMPLE
    .\your-script.ps1 -ExampleParam "value"
    Example of running the script with parameters
    
.NOTES
    Filename: your-script.ps1
    Author: Fleet Manager Development Team
    Created: YYYY-MM-DD
    Modified: YYYY-MM-DD
    Version: 1.0.0
    
    Encoding Requirements:
    - File must be saved as UTF-8 without BOM
    - Use VSCode or an editor that supports UTF-8
    
    Requirements: 4.1, 4.2, 4.3
#>

# ============================================================================
# Parameter Definition
# ============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false, HelpMessage = "Example parameter")]
    [string]$ExampleParam = "default"
)


# ============================================================================
# Encoding Settings (must be at the beginning of the script)
# ============================================================================
# Set console output encoding to UTF-8
# This is the key setting to solve Chinese garbled characters in Windows PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set console input encoding to UTF-8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Set PowerShell output encoding to UTF-8
# Affects pipeline output and redirection operations
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set code page to 65001 (UTF-8)
# This affects the encoding of cmd.exe subprocesses
# Use > $null to hide the chcp command output
chcp 65001 > $null

# Set PowerShell default parameter values
# Ensure all commands that support -Encoding parameter use UTF-8 by default
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
$PSDefaultParameterValues['Add-Content:Encoding'] = 'utf8'

# ============================================================================
# Error Handling Configuration
# ============================================================================
# Set error handling policy to "Stop"
# Stop script execution immediately when an error occurs
$ErrorActionPreference = "Stop"

# Set warning handling policy to "Continue"
# Display warnings but continue execution
$WarningPreference = "Continue"

# Set verbose output policy to "SilentlyContinue"
# Do not display verbose output by default, can be enabled with -Verbose parameter
$VerbosePreference = "SilentlyContinue"

# ============================================================================
# Environment Variable Settings
# ============================================================================
# Set Python output encoding to UTF-8
# Ensure correct output when calling Python scripts
$env:PYTHONIOENCODING = "utf-8"

# Set Node.js options
# Increase memory limit to avoid out of memory during large project builds
$env:NODE_OPTIONS = "--max-old-space-size=8192"


# ============================================================================
# Utility Functions
# ============================================================================

<#
.SYNOPSIS
    Output colored log messages
    
.DESCRIPTION
    Output messages in different colors based on log level:
    - INFO: Green
    - WARN: Yellow
    - ERROR: Red
    - DEBUG: Gray
    
.PARAMETER Message
    The message content to output
    
.PARAMETER Level
    Log level: INFO, WARN, ERROR, DEBUG
    
.EXAMPLE
    Write-Log "Operation successful" -Level INFO
    Write-Log "Warning message" -Level WARN
#>
function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO"
    )
    
    # Get current timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Select color based on level
    $color = switch ($Level) {
        "INFO"  { "Green" }
        "WARN"  { "Yellow" }
        "ERROR" { "Red" }
        "DEBUG" { "Gray" }
        default { "White" }
    }
    
    # Output colored log
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}


<#
.SYNOPSIS
    Safely read UTF-8 encoded files
    
.DESCRIPTION
    Read file content using UTF-8 encoding, automatically handle BOM marker
    
.PARAMETER Path
    File path
    
.RETURNS
    File content string
    
.EXAMPLE
    $content = Read-FileUTF8 -Path ".\config.json"
#>
function Read-FileUTF8 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    # Check if file exists
    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }
    
    # Read file using UTF-8 encoding
    # -Raw parameter reads the entire file as a single string
    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    
    # Remove possible BOM marker
    if ($content.StartsWith([char]0xFEFF)) {
        $content = $content.Substring(1)
    }
    
    return $content
}

<#
.SYNOPSIS
    Safely write UTF-8 encoded files
    
.DESCRIPTION
    Write file content using UTF-8 without BOM encoding
    
.PARAMETER Path
    File path
    
.PARAMETER Content
    Content to write
    
.EXAMPLE
    Write-FileUTF8 -Path ".\output.txt" -Content "Hello, World!"
#>
function Write-FileUTF8 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )
    
    # Ensure directory exists
    $directory = Split-Path -Path $Path -Parent
    if ($directory -and -not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    
    # Write file using UTF-8 without BOM encoding
    # PowerShell 5.1's -Encoding UTF8 adds BOM
    # Use .NET method to ensure no BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}


<#
.SYNOPSIS
    Execute command and capture output
    
.DESCRIPTION
    Execute external command, capture stdout and stderr,
    and throw exception when command fails
    
.PARAMETER Command
    Command to execute
    
.PARAMETER WorkingDirectory
    Working directory (optional)
    
.RETURNS
    Command stdout
    
.EXAMPLE
    $output = Invoke-CommandUTF8 -Command "git status"
#>
function Invoke-CommandUTF8 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        
        [Parameter(Mandatory = $false)]
        [string]$WorkingDirectory = $null
    )
    
    # Save current directory
    $originalLocation = Get-Location
    
    try {
        # Switch to working directory (if specified)
        if ($WorkingDirectory) {
            Set-Location $WorkingDirectory
        }
        
        # Execute command and capture output
        $output = Invoke-Expression $Command 2>&1
        
        # Check execution result
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed (exit code: $LASTEXITCODE): $Command`n$output"
        }
        
        return $output
    }
    finally {
        # Restore original directory
        Set-Location $originalLocation
    }
}

<#
.SYNOPSIS
    Display script execution progress
    
.DESCRIPTION
    Display progress information with step numbers
    
.PARAMETER Step
    Current step number
    
.PARAMETER TotalSteps
    Total number of steps
    
.PARAMETER Message
    Step description
    
.EXAMPLE
    Show-Progress -Step 1 -TotalSteps 5 -Message "Initializing environment"
#>
function Show-Progress {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [int]$Step,
        
        [Parameter(Mandatory = $true)]
        [int]$TotalSteps,
        
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    
    Write-Host ""
    Write-Host "[$Step/$TotalSteps] $Message" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}


# ============================================================================
# Script Body
# ============================================================================

<#
.SYNOPSIS
    Script main function
    
.DESCRIPTION
    Main entry point for script business logic
    Encapsulating main logic in a function makes it easier to test and maintain
#>
function Main {
    [CmdletBinding()]
    param()
    
    # Display script start information
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  Script Name (Please Modify)" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Record start time
    $startTime = Get-Date
    
    try {
        # ----------------------------------------------------------------
        # Write your business logic here
        # ----------------------------------------------------------------
        
        # Example: Display progress
        Show-Progress -Step 1 -TotalSteps 3 -Message "Step 1: Initialize"
        Write-Log "Initializing..." -Level INFO
        
        # Example: Use parameter
        Write-Log "Parameter value: $ExampleParam" -Level DEBUG
        
        # Example: Read file
        # $content = Read-FileUTF8 -Path ".\config.json"
        
        # Example: Write file
        # Write-FileUTF8 -Path ".\output.txt" -Content "Hello, World!"
        
        # Example: Execute command
        # $output = Invoke-CommandUTF8 -Command "git status"
        
        Show-Progress -Step 2 -TotalSteps 3 -Message "Step 2: Process"
        Write-Log "Processing..." -Level INFO
        
        Show-Progress -Step 3 -TotalSteps 3 -Message "Step 3: Complete"
        Write-Log "Processing complete" -Level INFO
        
        # ----------------------------------------------------------------
        # End of business logic
        # ----------------------------------------------------------------
        
        # Calculate execution time
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        # Display completion information
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "  Script executed successfully!" -ForegroundColor Green
        Write-Host "  Duration: $($duration.TotalSeconds.ToString('F2')) seconds" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        
        # Return success exit code
        exit 0
    }
    catch {
        # Error handling
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Red
        Write-Host "  Script execution failed!" -ForegroundColor Red
        Write-Host "=====================================" -ForegroundColor Red
        Write-Host ""
        Write-Log "Error: $_" -Level ERROR
        Write-Log "Location: $($_.InvocationInfo.PositionMessage)" -Level ERROR
        
        # Return failure exit code
        exit 1
    }
}

# ============================================================================
# Script Entry Point
# ============================================================================
# Call main function
Main
