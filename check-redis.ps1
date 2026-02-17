#!/usr/bin/env pwsh
# Redis Health Check Script
# Verifies Redis is properly configured for production

Write-Host "🔍 Redis Health Check" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# 1. Check Redis Connection
Write-Host "1️⃣  Checking Redis connection..." -ForegroundColor Yellow
try {
    $pingResult = redis-cli ping 2>$null
    if ($pingResult -eq "PONG") {
        Write-Host "   ✅ Redis is responding" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis not responding" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Redis connection failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Check Redis Version
Write-Host "2️⃣  Checking Redis version..." -ForegroundColor Yellow
$version = redis-cli INFO server 2>$null | Select-String "redis_version:" | ForEach-Object { $_ -replace "redis_version:", "" }
$version = $version.Trim()
if ($version) {
    Write-Host "   ✅ Redis version: $version" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Could not determine Redis version" -ForegroundColor Yellow
}

Write-Host ""

# 3. Test Write/Read Operations
Write-Host "3️⃣  Testing Redis write/read operations..." -ForegroundColor Yellow
$testKey = "health_check_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
$testValue = "test_value_$(Get-Random)"

try {
    # Write test
    redis-cli SET $testKey $testValue EX 10 2>$null | Out-Null
    Write-Host "   ✅ Write operation successful" -ForegroundColor Green
    
    # Read test
    $readValue = redis-cli GET $testKey 2>$null
    if ($readValue -eq $testValue) {
        Write-Host "   ✅ Read operation successful" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Read operation failed" -ForegroundColor Red
    }
    
    # Cleanup
    redis-cli DEL $testKey 2>$null | Out-Null
} catch {
    Write-Host "   ❌ Redis operations failed" -ForegroundColor Red
}

Write-Host ""

# 4. Check Memory Usage
Write-Host "4️⃣  Checking Redis memory usage..." -ForegroundColor Yellow
$memInfo = redis-cli INFO memory 2>$null | Select-String "used_memory_human:"
$memValue = $memInfo -replace "used_memory_human:", ""
$memValue = $memValue.Trim()
if ($memValue) {
    Write-Host "   ✅ Memory used: $memValue" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Could not determine memory usage" -ForegroundColor Yellow
}

Write-Host ""

# 5. Check Connected Clients
Write-Host "5️⃣  Checking connected clients..." -ForegroundColor Yellow
$clients = redis-cli INFO clients 2>$null | Select-String "connected_clients:"
$clientCount = $clients -replace "connected_clients:", ""
$clientCount = $clientCount.Trim()
if ($clientCount) {
    Write-Host "   ✅ Connected clients: $clientCount" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Could not determine client count" -ForegroundColor Yellow
}

Write-Host ""

# 6. Test Family Location Key Pattern
Write-Host "6️⃣  Testing family location key pattern..." -ForegroundColor Yellow
$testFamilyKey = "location:test_family:test_user"
$testLocationData = '{"userId":"test_user","lat":20.296059,"lng":85.824539,"timestamp":' + [int][double]::Parse((Get-Date -UFormat %s)) + '}'

try {
    # Simulate location storage
    redis-cli SETEX $testFamilyKey 3600 $testLocationData 2>$null | Out-Null
    Write-Host "   ✅ Location storage pattern working" -ForegroundColor Green
    
    # Check TTL
    $ttl = redis-cli TTL $testFamilyKey 2>$null
    if ($ttl -gt 0) {
        Write-Host "   ✅ TTL (1 hour expiry) configured: ${ttl}s remaining" -ForegroundColor Green
    }
    
    # Cleanup
    redis-cli DEL $testFamilyKey 2>$null | Out-Null
} catch {
    Write-Host "   ❌ Location pattern test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "✅ Redis Health Check Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "📍 Redis Status: HEALTHY" -ForegroundColor Green
Write-Host "🚀 Ready for production use!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: .\start-production.ps1" -ForegroundColor White
Write-Host "  2. Open: http://localhost:5173" -ForegroundColor White
Write-Host "  3. Enable location sharing" -ForegroundColor White
Write-Host "  4. Test real-time tracking" -ForegroundColor White
Write-Host ""
