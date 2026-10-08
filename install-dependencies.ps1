# Run from PowerShell: powershell -ExecutionPolicy Bypass -File .\install-dependencies.ps1
param([switch]$DemoOnly)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Install-PackageWithWinget([string]$Id) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw 'Install Microsoft App Installer from the Microsoft Store to enable winget, then run this command again.'
    }
    Write-Host "Installing $Id..."
    & winget install --id $Id --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "Installation of $Id did not complete (exit code $LASTEXITCODE). If a restart was requested, restart Windows and run this script again."
    }
    Refresh-Path
}

try {
    $nodeReady = $false
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = & node -p 'process.versions.node'
        if ($LASTEXITCODE -eq 0) {
            $nodeReady = ([version]$nodeVersion -ge [version]'22.13.0')
        }
    }
    if (-not $nodeReady) {
        Install-PackageWithWinget 'OpenJS.NodeJS.LTS'
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js is not available yet. Open a new PowerShell window and run this script again.'
    }
    $nodeVersion = & node -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]'22.13.0') {
        throw 'Node.js 22.13 or newer is required. Close this terminal and reopen it after installing Node.js.'
    }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'npm is unavailable. Repair the Node.js installation and run this script again.'
    }

    Write-Host 'Installing project packages (including Prisma client generation)...'
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) {
        throw 'Project dependency installation failed. Resolve the npm error above, then run this script again.'
    }

    if (-not $DemoOnly) {
        $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
        if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and
            -not (Test-Path -LiteralPath $dockerDesktop)) {
            Install-PackageWithWinget 'Docker.DockerDesktop'
        }
    }

    Write-Host ''
    Write-Host 'Dependencies installed successfully.' -ForegroundColor Green
    Write-Host 'Start the demo with: npm run dev'
    if (-not $DemoOnly) {
        Write-Host 'For database mode, open Docker Desktop and complete its first-run setup.'
        Write-Host 'Docker may request WSL setup or a Windows restart.'
        Write-Host 'Then follow the database setup steps in README.md.'
    }
} catch {
    Write-Host "Installation stopped: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
