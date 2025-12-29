<?php
// Remove all ->after(...) clauses that might reference non-existent columns

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '*.php');

$fixed = 0;

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Remove ->after(...) patterns
    $content = preg_replace('/->after\([^)]+\)/', '', $content);
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        $fixed++;
    }
}

echo "Removed ->after() clauses from $fixed files!\n";
?>
