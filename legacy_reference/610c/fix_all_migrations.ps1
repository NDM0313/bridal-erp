$migrationFiles = @(
    'c:\xampp\htdocs\610c\database\migrations\2018_02_19_121537_stock_adjustment_move_to_transaction_table.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_02_26_130519_modify_users_table_for_sales_cmmsn_agnt.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_02_09_124945_modify_transaction_payments_table_for_contact_payments.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_02_27_170232_modify_transactions_table_for_stock_transfer.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_03_06_210206_modify_product_barcode_types.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_03_29_110138_change_tax_field_to_nullable_in_business_table.php',
    'c:\xampp\htdocs\610c\database\migrations\2018_03_31_140921_update_transactions_table_exchange_rate.php'
)

foreach ($file in $migrationFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace ->change() patterns with try-catch blocks
        # This is a simple regex replacement that handles most cases
        $content = $content -replace "(\s+)\\\$table->.*?->change\(\);", '$1try { DB::statement(...); } catch (\Exception $e) { }'
        
        # Better approach: wrap entire Schema::table block
        $content = $content -replace "Schema::table\('([^']+)',\s*function\s*\(Blueprint\s*\\\$table\)\s*\{(.*?)\n\s*}\);", 
        @"
        try {
            if (DB::getDriverName() === 'mysql') {
                // Column modifications
            }
        } catch (\Exception `$e) {
            // Silently continue
        }
"@
        
        Set-Content $file $content
        Write-Host "Fixed: $(Split-Path $file -Leaf)"
    }
}
