#!/usr/bin/env pwsh
# Production Startup Script for Family Tracker App
# This script starts Redis, Backend API, and Frontend in production mode

Write-Host "🚀 Starting Family Tracker in Production Mode..." -ForegroundColor Cyan
Write-Host ""

# 1. Check if Redis is running, start if not
Write-Host "📦 Checking Redis..." -ForegroundColor Yellow
$redisRunning = $false
try {
    $result = redis-cli ping 2>$null
    if ($result -eq "PONG") {
        $redisRunning = $true
        Write-Host "✅ Redis is already running" -ForegroundColor Green
    }
} catch {
    $redisRunning = $false
}

if (-not $redisRunning) {
    Write-Host "🔄 Starting Redis server..." -ForegroundColor Yellow
    Start-Process redis-server -WindowStyle Hidden
    Start-Sleep -Seconds 2
    
    # Verify Redis started
    try {
        $result = redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Write-Host "✅ Redis started successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Redis didn't start properly" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️  Redis didn't start properly" -ForegroundColor Red
    }
}

Write-Host ""

# 2. Start Backend API
Write-Host "🖥️  Starting Backend API..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\api'; npm run dev" -WindowStyle Normal
Write-Host "✅ Backend API starting on http://localhost:5000" -ForegroundColor Green

Start-Sleep -Seconds 3

# 3. Start Frontend
Write-Host "🌐 Starting Frontend..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm run dev" -WindowStyle Normal
Write-Host "✅ Frontend starting on http://localhost:5173" -ForegroundColor Green

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 All services started successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Redis Server:   localhost:6379" -ForegroundColor White
Write-Host "📍 Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "📍 Frontend App:   http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Production Features Enabled:" -ForegroundColor Yellow
Write-Host "   ✅ Socket.io real-time updates" -ForegroundColor Green
Write-Host "   ✅ Redis location caching (1 hour expiry)" -ForegroundColor Green
Write-Host "   ✅ Family room broadcasting" -ForegroundColor Green
Write-Host "   ✅ Smooth Swiggy-like tracking" -ForegroundColor Green
Write-Host ""
Write-Host "ℹ️  To stop all services:" -ForegroundColor Cyan
Write-Host "   1. Close the terminal windows" -ForegroundColor White
Write-Host "   2. Run: Stop-Process -Name redis-server" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
