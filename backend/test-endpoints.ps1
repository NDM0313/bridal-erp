# PowerShell script to test backend endpoints
# Run this after starting the backend server with: npm run dev

Write-Host "🧪 Testing Backend Endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Endpoint
Write-Host "1️⃣ Testing /test/health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/test/health" -Method GET
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host "   Success: $($healthResponse.success)" -ForegroundColor Gray
    Write-Host "   Message: $($healthResponse.message)" -ForegroundColor Gray
    Write-Host "   Supabase Connected: $($healthResponse.supabase.connected)" -ForegroundColor Gray
    Write-Host "   Using Service Role: $($healthResponse.supabase.usingServiceRole)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Health check failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 2: Insert Endpoint (requires valid data)
Write-Host "2️⃣ Testing /test/insert endpoint..." -ForegroundColor Yellow
Write-Host "   ⚠️  This requires valid business_id, unit_id, and created_by (UUID)" -ForegroundColor Yellow
Write-Host "   Update the values below before running:" -ForegroundColor Yellow
Write-Host ""

$testData = @{
    name = "Test Product $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    sku = "TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
    business_id = 1  # UPDATE THIS
    unit_id = 1      # UPDATE THIS
    created_by = "YOUR_USER_UUID_HERE"  # UPDATE THIS
}

Write-Host "   Test data:" -ForegroundColor Gray
Write-Host "   - name: $($testData.name)" -ForegroundColor Gray
Write-Host "   - sku: $($testData.sku)" -ForegroundColor Gray
Write-Host "   - business_id: $($testData.business_id)" -ForegroundColor Gray
Write-Host "   - unit_id: $($testData.unit_id)" -ForegroundColor Gray
Write-Host "   - created_by: $($testData.created_by)" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "   Continue with insert test? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "   Skipping insert test..." -ForegroundColor Yellow
    exit 0
}

try {
    $body = $testData | ConvertTo-Json
    $insertResponse = Invoke-RestMethod -Uri "http://localhost:3001/test/insert" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ Insert test passed!" -ForegroundColor Green
    Write-Host "   Success: $($insertResponse.success)" -ForegroundColor Gray
    Write-Host "   Message: $($insertResponse.message)" -ForegroundColor Gray
    Write-Host "   Product ID: $($insertResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Product Name: $($insertResponse.data.name)" -ForegroundColor Gray
    Write-Host "   SKU: $($insertResponse.data.sku)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Insert test failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.error)" -ForegroundColor Red
        if ($errorDetails.details) {
            Write-Host "   More Info: $($errorDetails.details)" -ForegroundColor Red
        }
    }
    Write-Host ""
    exit 1
}

