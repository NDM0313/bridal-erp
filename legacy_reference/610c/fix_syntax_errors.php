<?php
// Fix broken migrations from wrap_2021_04_plus.php
$filePath = __DIR__ . '/database/migrations';
$files = scandir($filePath);
$fixed = 0;

foreach ($files as $file) {
    if (preg_match('/^202[1-9]/', $file)) {
        $fullPath = $filePath . '/' . $file;
        if (is_file($fullPath)) {
            $content = file_get_contents($fullPath);
            $original = $content;
            
            // Fix broken try-catch patterns
            // Pattern 1: try { without closing }catch
            if (preg_match('/try\s*\{\s*\n\s*Schema::create\([^)]+,\s*function/', $content) && 
                !preg_match('/}\s*catch\s*\(/', $content)) {
                
                // Remove the try statement and fix the structure
                $content = preg_replace(
                    '/try\s*\{\s*\n\s*(Schema::create\([^{]+\{)/',
                    "$1",
                    $content
                );
                
                // Fix if there's missing }); before down()
                $content = preg_replace(
                    '/(\s+\}\);?)(\s+)\n\s*\/\*\*\s*\n\s*\*\s*Reverse/',
                    "$1\n$2}\n$2catch (\\Exception \\$e) {\n$2    \/\/ Skip if columns or keys don't exist\n$2}\n$2\n$2/**\n$2 * Reverse",
                    $content
                );
                
                file_put_contents($fullPath, $content);
                $fixed++;
            }
        }
    }
}

echo "Fixed $fixed migration syntax errors!\n";
?>
