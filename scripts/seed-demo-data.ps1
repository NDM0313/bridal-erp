# PowerShell Script to Seed Demo Data
$connectionString = "postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
$sqlFile = "my-pos-system\database\RESET_AND_SEED_DEMO_DATA.sql"

Write-Host "🔄 Executing demo data reset and seed..." -ForegroundColor Yellow

# Execute the SQL file
$result = psql $connectionString -f $sqlFile 2>&1

# Show output
$result | ForEach-Object {
    if ($_ -match "error|ERROR|Error") {
        Write-Host $_ -ForegroundColor Red
    } elseif ($_ -match "NOTICE|✅") {
        Write-Host $_ -ForegroundColor Green
    } else {
        Write-Host $_
    }
}

Write-Host "`n✅ Demo data seeding complete!" -ForegroundColor Green

# Verify the results
Write-Host "`n📊 Verifying data counts..." -ForegroundColor Cyan

$verification = @"
SELECT 
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM variation_location_details) as inventory;
"@

psql $connectionString -c $verification
