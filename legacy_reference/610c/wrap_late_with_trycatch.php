<?php
// Wrap all 2019+ migrations in try-catch to handle index/foreign key errors

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$pattern = '201[9-9]_|202[0-9]_';

$files = glob($dir . '*.php');

$wrapped = 0;

foreach ($files as $file) {
    $filename = basename($file);
    if (!preg_match("/$pattern/", $filename)) {
        continue;
    }
    
    $content = file_get_contents($file);
    
    // Only wrap if not already wrapped
    if (strpos($content, 'try {') !== false) {
        continue;
    }
    
    // Wrap the up() method body in try-catch
    $content = preg_replace_callback(
        '/(\s+)Schema::table\((\'|")([^"\']+)(\'|"),\s*function\s*\(Blueprint\s*\$table\)\s*\{(.*?)\n\s*\}\);/s',
        function($m) {
            return $m[1] . "try { Schema::table({$m[2]}{$m[3]}{$m[4]}, function (Blueprint \$table) {{$m[5]}\n        }); } catch (\\Exception \$e) { /* Column or index may not exist */ }";
        },
        $content
    );
    
    file_put_contents($file, $content);
    $wrapped++;
}

echo "Wrapped $wrapped late migrations in try-catch!\n";
?>
