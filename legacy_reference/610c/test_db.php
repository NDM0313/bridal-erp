<?php
require 'bootstrap/app.php';

use Illuminate\Support\Facades\DB;

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

try {
    echo "Database connection successful!\n";
    echo "Users count: " . DB::table('users')->count() . "\n";
    echo "Businesses count: " . DB::table('business')->count() . "\n";
    echo "Products count: " . DB::table('products')->count() . "\n";
    echo "\nAll tables created successfully!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
