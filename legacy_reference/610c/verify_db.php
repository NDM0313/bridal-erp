<?php
$host = 'localhost';
$db = '610t';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO('mysql:host=' . $host . ';dbname=' . $db, $user, $pass);
    echo "✓ Database connection successful!\n";
    
    $stmt = $pdo->query('SELECT COUNT(*) FROM migrations WHERE batch IS NOT NULL');
    $count = $stmt->fetchColumn();
    echo "✓ Total migrations executed: " . $count . "\n";
    
    $stmt = $pdo->query('SELECT COUNT(*) FROM users');
    echo "✓ Users table: " . $stmt->fetchColumn() . " rows\n";
    
    $stmt = $pdo->query('SELECT COUNT(*) FROM business');
    echo "✓ Business table: " . $stmt->fetchColumn() . " rows\n";
    
    echo "\n✓✓✓ DATABASE SETUP COMPLETE ✓✓✓\n";
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>
