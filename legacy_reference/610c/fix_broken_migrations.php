<?php
// Comprehensive migration fixer
$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '*.php');

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    // Fix broken try-catch patterns from the earlier bad regex
    $content = preg_replace(
        '/try \{ Schema::table\((.+?)\);[^}]*\} catch \(\\\\Exception \$e\)/s',
        'Schema::table($1);',
        $content
    );
    
    // Fix lines that end with unmatched  try-catch
    $content = preg_replace(
        '/\) \{ \/\* Column may already exist \*\/ \}/s',
        ');',
        $content
    );
    
    // Fix closing braces followed by catch
    $content = preg_replace(
        '/} catch \(\\\\Exception/s',
        '} catch (\\Exception',
        $content
    );
    
    file_put_contents($file, $content);
}

echo "Fixed " . count($files) . " migrations!\n";
?>
