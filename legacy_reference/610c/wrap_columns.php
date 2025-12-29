<?php
$pattern = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\2018_03_*.php';
$files = glob($pattern);

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    // Find Schema::table patterns and wrap them
    if (preg_match('/Schema::table\(/', $content)) {
        // Look for duplicate column issues - wrap add operations in hasColumn checks
        $content = preg_replace(
            '/(\$table->)(.*?)\(\)\;/',
            'if (!Schema::hasColumn(\'$1\', \'$2\')) { $table->$2(); }',
            $content
        );
        
        file_put_contents($file, $content);
        echo "Fixed: " . basename($file) . "\n";
    }
}
echo "Done!\n";
?>
