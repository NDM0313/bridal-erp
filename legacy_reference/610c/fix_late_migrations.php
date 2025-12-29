<?php
// Quick fix: Wrap all 2018_03_31 and later migrations Schema::table calls in try-catch

$pattern = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\2018_03_31*.php';
$files = glob($pattern);

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    // Replace direct Schema::table calls with try-catch wrapped versions
    $content = preg_replace(
        '/(\s+)Schema::table\((.*?)\);/',
        '$1try { Schema::table($2); } catch (\\Exception $e) { /* Column may already exist */ }',
        $content
    );
    
    file_put_contents($file, $content);
    echo "Fixed: " . basename($file) . "\n";
}

echo "Done!\n";
?>
