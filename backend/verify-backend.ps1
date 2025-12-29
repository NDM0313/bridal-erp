# Backend Verification Script
# Run this AFTER starting the server with: npm run dev

Write-Host "🔍 Backend Verification Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1️⃣ Checking if server is running on port 3001..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is running!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Server is NOT running!" -ForegroundColor Red
    Write-Host "   Please start the server first with: npm run dev" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 1: Health Endpoint
Write-Host "2️⃣ Testing /test/health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/test/health" -Method GET -ErrorAction Stop
    
    if ($healthResponse.success -eq $true) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Success: $($healthResponse.success)" -ForegroundColor Gray
        Write-Host "   Message: $($healthResponse.message)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($healthResponse.timestamp)" -ForegroundColor Gray
        
        if ($healthResponse.supabase) {
            Write-Host "   Supabase Connected: $($healthResponse.supabase.connected)" -ForegroundColor Gray
            Write-Host "   Using Service Role: $($healthResponse.supabase.usingServiceRole)" -ForegroundColor Gray
            
            if ($healthResponse.supabase.connected -eq $true -and $healthResponse.supabase.usingServiceRole -eq $true) {
                Write-Host "   ✅ Supabase admin client is working!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Supabase connection issue detected" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Health check returned success: false" -ForegroundColor Red
        Write-Host "   Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "❌ Health check failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "   Details: $($errorDetails.error)" -ForegroundColor Red
            if ($errorDetails.details) {
                Write-Host "   More Info: $($errorDetails.details)" -ForegroundColor Red
            }
        }
    }
    Write-Host ""
    exit 1
}

# Test 2: Insert Endpoint
Write-Host "3️⃣ Testing /test/insert endpoint..." -ForegroundColor Yellow
Write-Host "   ⚠️  This requires valid business_id, unit_id, and created_by (UUID)" -ForegroundColor Yellow
Write-Host ""

# Get values from user or use defaults
$businessId = Read-Host "   Enter business_id (or press Enter for 1)"
if ([string]::IsNullOrWhiteSpace($businessId)) { $businessId = 1 }

$unitId = Read-Host "   Enter unit_id (or press Enter for 1)"
if ([string]::IsNullOrWhiteSpace($unitId)) { $unitId = 1 }

$createdBy = Read-Host "   Enter created_by UUID (required)"
if ([string]::IsNullOrWhiteSpace($createdBy)) {
    Write-Host "   ❌ created_by UUID is required!" -ForegroundColor Red
    Write-Host "   Get it from: Supabase Dashboard → Authentication → Users" -ForegroundColor Yellow
    exit 1
}

$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$testData = @{
    name = "Test Product $timestamp"
    sku = "TEST-$timestamp"
    business_id = [int]$businessId
    unit_id = [int]$unitId
    created_by = $createdBy
}

Write-Host ""
Write-Host "   Test data:" -ForegroundColor Gray
Write-Host "   - name: $($testData.name)" -ForegroundColor Gray
Write-Host "   - sku: $($testData.sku)" -ForegroundColor Gray
Write-Host "   - business_id: $($testData.business_id)" -ForegroundColor Gray
Write-Host "   - unit_id: $($testData.unit_id)" -ForegroundColor Gray
Write-Host "   - created_by: $($testData.created_by)" -ForegroundColor Gray
Write-Host ""

try {
    $body = $testData | ConvertTo-Json
    $insertResponse = Invoke-RestMethod -Uri "http://localhost:3001/test/insert" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    if ($insertResponse.success -eq $true) {
        Write-Host "✅ Insert test passed!" -ForegroundColor Green
        Write-Host "   Success: $($insertResponse.success)" -ForegroundColor Gray
        Write-Host "   Message: $($insertResponse.message)" -ForegroundColor Gray
        
        if ($insertResponse.data) {
            Write-Host "   Product ID: $($insertResponse.data.id)" -ForegroundColor Gray
            Write-Host "   Product Name: $($insertResponse.data.name)" -ForegroundColor Gray
            Write-Host "   SKU: $($insertResponse.data.sku)" -ForegroundColor Gray
            Write-Host "   Created At: $($insertResponse.data.created_at)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "✅ All backend tests passed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next Step: Verify in Supabase Dashboard" -ForegroundColor Cyan
        Write-Host "   1. Go to https://app.supabase.com" -ForegroundColor Gray
        Write-Host "   2. Select your project" -ForegroundColor Gray
        Write-Host "   3. Navigate to Table Editor → products" -ForegroundColor Gray
        Write-Host "   4. Look for SKU: $($testData.sku)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ Insert test returned success: false" -ForegroundColor Red
        Write-Host "   Response: $($insertResponse | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Insert test failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "   Error: $($errorDetails.error)" -ForegroundColor Red
            if ($errorDetails.details) {
                Write-Host "   Details: $($errorDetails.details)" -ForegroundColor Red
            }
            if ($errorDetails.code) {
                Write-Host "   Code: $($errorDetails.code)" -ForegroundColor Red
            }
            if ($errorDetails.required) {
                Write-Host "   Required fields: $($errorDetails.required -join ', ')" -ForegroundColor Red
            }
        } else {
            Write-Host "   Raw response: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
    exit 1
}

