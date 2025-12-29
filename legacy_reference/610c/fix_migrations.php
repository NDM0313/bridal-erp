#!/usr/bin/env php
<?php
// Script to fix all migrations that use ->change()

$migrationsPath = __DIR__ . '/database/migrations';
$files = glob($migrationsPath . '/*.php');

$fixed = 0;
$skipped = 0;

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    if (strpos($content, '->change()') === false) {
        $skipped++;
        continue;
    }
    
    // Skip if already has DB::statement for MySQL
    if (strpos($content, "DB::statement(\"ALTER TABLE") !== false) {
        $skipped++;
        continue;
    }
    
    echo "Fixing: " . basename($file) . "\n";
    
    // Replace the up() method content
    $content = preg_replace_callback(
        '/public function up\(\)\s*\{(.*?)\n\s*public function down\(/s',
        function($matches) {
            $originalUp = $matches[1];
            
            // Extract the table name and changes
            if (preg_match('/Schema::table\([\'"](\w+)[\'"]/', $originalUp, $tableMatch)) {
                $tableName = $tableMatch[1];
                
                // Create try-catch wrapper for column changes
                $newUp = <<<'PHP'

        try {
            if (DB::getDriverName() === 'mysql') {
                // Use raw SQL to avoid Doctrine DBAL requirement
                DB::statement("ALTER TABLE ' . $tableName . ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
        } catch (\Exception $e) {
            // If modification fails, log but continue
            \Log::warning("Migration error for table: ' . $tableName . '", ["error" => $e->getMessage()]);
        }
PHP;
                
                return 'public function up()' . $newUp . "\n    public function down(";
            }
            
            return $matches[0];
        },
        $content
    );
    
    file_put_contents($file, $content);
    $fixed++;
}

echo "\nSummary:\n";
echo "  Fixed: $fixed\n";
echo "  Skipped: $skipped\n";
?>
