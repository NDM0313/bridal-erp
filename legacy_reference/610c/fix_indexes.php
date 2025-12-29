<?php
// Fix index/key operations on potentially missing columns

$dir = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\';
$files = glob($dir . '*.php');

$patternPairs = [
    [
        'pattern' => '/\$table\->index\([\'"]([^\'"]+)[\'"]\);/',
        'replacement' => 'if (Schema::hasColumn($this->table, \'$1\')) { $table->index(\'$1\'); }'
    ],
    [
        'pattern' => '/\$table\->unique\([\'"]([^\'"]+)[\'"]\);/',
        'replacement' => 'if (Schema::hasColumn($this->table, \'$1\')) { $table->unique(\'$1\'); }'
    ],
    [
        'pattern' => '/\$table\->foreign\([\'"]([^\'"]+)[\'"]\)/s',
        'replacement' => 'if (Schema::hasColumn($this->table, \'$1\')) { $table->foreign(\'$1\')'
    ]
];

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    foreach ($patternPairs as $pair) {
        $content = preg_replace($pair['pattern'], $pair['replacement'], $content);
    }
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
    }
}

echo "Fixed all index/key operations!\n";
?>
