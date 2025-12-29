<?php
$paths = glob('database/migrations/*.php');
$classes = [];
foreach ($paths as $path) {
    $text = file_get_contents($path);
    preg_match_all('/class\s+([A-Za-z0-9_]+)\s+extends/', $text, $m);
    echo basename($path) . ' ' . json_encode($m[1]) . "\n";
    foreach ($m[1] as $name) {
        $classes[$name][] = basename($path);
    }
}
foreach ($classes as $name => $files) {
    if (count($files) > 1) {
        echo 'DUP ' . $name . ': ' . implode(', ', $files) . "\n";
    }
}
