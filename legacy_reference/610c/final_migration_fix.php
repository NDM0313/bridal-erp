<?php
// Final comprehensive fix for all broken migrations

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '*.php');

$fixed = 0;

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Fix the most common broken pattern: "); { /* Column may already exist */ }"
    $content = str_replace('); { /* Column may already exist */ }', ');', $content);
    $content = str_replace('); { /* Colum may already exist */ }', ');', $content);
    
    // Fix try { ... } catch (\Exception $e) pattern for Schema::table
    $content = preg_replace(
        '/try \{ Schema::table\((.*?)\)(.*?)\);.*?\} catch \(\\\\Exception \$e\) \{ \/\* (.*?) \*\/ \}/s',
        'Schema::table($1)$2);',
        $content
    );
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        $fixed++;
    }
}

echo "Fixed $fixed broken migration files!\n";
?>
