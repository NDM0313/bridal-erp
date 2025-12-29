<?php
// Remove ALL remaining ->after(...) references from 2021_04 onwards
$migrationsDir = __DIR__ . '/database/migrations';
$files = scandir($migrationsDir);
$count = 0;

foreach ($files as $file) {
    // Only process 2021_04 and later
    if (preg_match('/^2021_0[4-9]|^202[2-9]|^20[3-9]/', $file)) {
        $filePath = $migrationsDir . '/' . $file;
        if (is_file($filePath)) {
            $content = file_get_contents($filePath);
            $original = $content;
            
            // Remove ->after(...) clauses completely
            $content = preg_replace('/\s*->\s*after\s*\([^)]+\)/', '', $content);
            
            if ($content !== $original) {
                file_put_contents($filePath, $content);
                $count++;
            }
        }
    }
}

echo "Removed ->after() from $count migration files!\n";
?>
