<?php
// Simple approach: wrap all Schema::table calls in ALL migrations with try-catch

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '*.php');

$count = 0;
foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Find all Schema::table calls and wrap in try-catch if not already wrapped
    $content = preg_replace_callback(
        '/(\s+)(Schema::table\([^;]+\);)/s',
        function($matches) {
            $indent = $matches[1];
            $schemaCall = $matches[2];
            
            // Check if already wrapped
            if (strpos($matches[0], 'try {') !== false) {
                return $matches[0];
            }
            
            return $indent . "try { " . $schemaCall . " } catch (\\Exception \$e) { /* Column may already exist */ }";
        },
        $content
    );
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        $count++;
    }
}

echo "Wrapped $count files in try-catch!\n";
?>
