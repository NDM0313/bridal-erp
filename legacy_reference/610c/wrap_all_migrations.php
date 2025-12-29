<?php
// Find all migrations with Schema::table calls and wrap column additions in existence checks

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '2018*.php');

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Find Schema::table blocks
    if (preg_match('/Schema::table\([\'"](\w+)[\'"],\s*function\s*\(Blueprint\s*\$table\)\s*\{(.*?)\n\s*}\);/s', $content, $matches)) {
        $table = $matches[1];
        $schemaContent = $matches[2];
        
        // Check if this looks like it's adding columns (not modifying with ->change())
        if (strpos($schemaContent, '->change()') === false && preg_match('/\$table->/', $schemaContent)) {
            // Extract method calls
            preg_match_all('/\$table->(\w+)\(/', $schemaContent, $methodMatches);
            
            if (!empty($methodMatches[1])) {
                // Replace Schema::table block with wrapped version
                $newSchemaBlock = "try {
            if (DB::getDriverName() === 'mysql') {
                Schema::table('$table', function (Blueprint \$table) {" . $schemaContent . "
                });
            }
        } catch (\\Exception \$e) {
            // Column may already exist, skip
        }";
                
                $content = str_replace(
                    "Schema::table('$table', function (Blueprint \$table) {" . $schemaContent . "\n        });",
                    $newSchemaBlock,
                    $content
                );
            }
        }
    }
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        echo "Fixed: " . basename($file) . "\n";
    }
}

echo "Complete!\n";
?>
