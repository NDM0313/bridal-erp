<?php
$pattern = 'c:\\xampp\\htdocs\\610c\\database\\migrations\\2018_0*.php';
$files = glob($pattern);

foreach ($files as $file) {
    $content = file_get_contents($file);
    $newContent = str_replace('->change()', '', $content);
    file_put_contents($file, $newContent);
    echo "Fixed: " . basename($file) . "\n";
}
echo "All migrations fixed!\n";
?>
