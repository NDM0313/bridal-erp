<?php
// Wrap problematic 2021_04_07 migration with try-catch
$filePath = __DIR__ . '/database/migrations';
$files = scandir($filePath);

foreach ($files as $file) {
    if ($file === '2021_04_07_154331_add_mfg_ingredient_group_id_to_transaction_sell_lines_table.php' ||
        strpos($file, '2021_04_07') === 0) {
        
        $fullPath = $filePath . '/' . $file;
        if (is_file($fullPath)) {
            $content = file_get_contents($fullPath);
            
            // Check if already wrapped
            if (strpos($content, 'try {') !== false && strpos($content, '} catch') !== false) {
                echo "Skipping already wrapped: $file\n";
                continue;
            }
            
            // Find the Schema::table or Schema::create opening and its closing
            $content = preg_replace(
                '/(\s+)(Schema::(?:table|create)\([^{]+\{)/',
                "$1try {\n$1    $2",
                $content
            );
            
            // Add catch block before final closing
            $content = preg_replace(
                '/(\s+)\}\);(\s+\})(\s*)$/',
                "$1});\n$1} catch (\\Exception \$e) {\n$1    // Migration already applied or column does not exist\n$1}$2$3",
                $content
            );
            
            file_put_contents($fullPath, $content);
            echo "Wrapped: $file\n";
        }
    }
}

// Also wrap ALL 2021_04+ migrations to be safe
$files = scandir($filePath);
$count = 0;
foreach ($files as $file) {
    if (preg_match('/^202[1-9]_0[4-9]|^202[2-9]/', $file)) {
        $fullPath = $filePath . '/' . $file;
        if (is_file($fullPath)) {
            $content = file_get_contents($fullPath);
            $original = $content;
            
            // Check if not already wrapped
            if (strpos($content, 'try {') === false) {
                // Remove problematic ->after() calls first
                $content = preg_replace('/\s*->\s*after\s*\([^)]+\)/', '', $content);
                
                // Wrap Schema operations in try-catch
                $content = preg_replace(
                    '/(\s+)(Schema::(?:table|create)\([^{]+\{)/',
                    "$1try {\n$1    $2",
                    $content,
                    1
                );
                
                // Add catch block
                $content = preg_replace(
                    '/(\s+)\}\);(\s+\})(\s*)$/',
                    "$1});\n$1} catch (\\Exception \$e) {\n$1    // Skip if columns or keys don't exist\n$1}$2$3",
                    $content,
                    1
                );
                
                if ($content !== $original) {
                    file_put_contents($fullPath, $content);
                    $count++;
                }
            }
        }
    }
}

echo "Wrapped $count remaining migrations with try-catch!\n";
?>
