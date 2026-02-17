#!/usr/bin/env pwsh
# Stop Script for Family Tracker App
# This script stops Redis, Backend API, and Frontend

Write-Host "🛑 Stopping Family Tracker services..." -ForegroundColor Red
Write-Host ""

# 1. Stop Node.js processes (Backend & Frontend)
Write-Host "⏹️  Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        Write-Host "   Stopping Node process (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Node.js processes found" -ForegroundColor Gray
}

Write-Host ""

# 2. Stop Redis Server
Write-Host "⏹️  Stopping Redis server..." -ForegroundColor Yellow
$redisProcesses = Get-Process -Name redis-server -ErrorAction SilentlyContinue
if ($redisProcesses) {
    # Graceful shutdown via redis-cli
    try {
        redis-cli shutdown 2>$null
        Start-Sleep -Seconds 1
    } catch {
        # Force stop if graceful shutdown fails
        $redisProcesses | ForEach-Object {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "✅ Redis server stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Redis server not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ All services stopped successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
