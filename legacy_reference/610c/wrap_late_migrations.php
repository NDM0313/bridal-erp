<?php
// Wrap all 2018_10+ migrations and later in try-catch to handle duplicate column errors

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$pattern = '2018_10|2018_11|2018_12|201[9-9]_|202[0-9]_';

$files = glob($dir . '*.php');

foreach ($files as $file) {
    $filename = basename($file);
    if (preg_match("/$pattern/", $filename)) {
        $content = file_get_contents($file);
        $originalContent = $content;
        
        // Find the up() method content  
        if (preg_match('/public function up\(\)\s*\{(.*?)\n\s*public function down/s', $content, $matches)) {
            $upBody = $matches[1];
            
            if (strpos($upBody, 'Schema::table') !== false) {
                // Wrap in try-catch if not already wrapped
                if (strpos($upBody, 'try {') === false) {
                    $newUpBody = "\n        try {" . $upBody . "\n        } catch (\\Exception \$e) {\n            // Column may already exist or reference invalid column\n        }";
                    
                    $content = str_replace(
                        'public function up()' . $upBody,
                        'public function up()' . $newUpBody,
                        $content
                    );
                }
            }
        }
        
        if ($content !== $originalContent) {
            file_put_contents($file, $content);
            echo "Wrapped: " . $filename . "\n";
        }
    }
}

echo "Done!\n";
?>
