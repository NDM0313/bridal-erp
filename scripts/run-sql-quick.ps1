# PowerShell script for quick SQL execution
# Usage: .\scripts\run-sql-quick.ps1 "SELECT * FROM business_locations LIMIT 5;"

param(
    [Parameter(Mandatory=$true)]
    [string]$Query
)

$connectionString = "postgresql://postgres:IPHONE@13MAX@db.xnpevheuniybnadyfjut.supabase.co:5432/postgres"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "✅ Using psql..." -ForegroundColor Green
    $Query | & $psqlPath.Path $connectionString
} else {
    Write-Host "⚠️ psql not found. Using Node.js script instead..." -ForegroundColor Yellow
    node scripts/run-sql.js $Query
}

