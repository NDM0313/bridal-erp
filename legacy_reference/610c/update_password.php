<?php

require 'vendor/autoload.php';

use Illuminate\Support\Facades\Hash;

// Initialize Laravel app
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Now we can use Laravel functions
$hashedPassword = Hash::make('12345');

echo "Hashed password: " . $hashedPassword . PHP_EOL;

// Update the user
$user = \App\User::find(1);
if ($user) {
    $user->password = $hashedPassword;
    $user->save();
    echo "✅ Updated user ndm313 (ID: 1) with password hash" . PHP_EOL;
} else {
    echo "❌ User not found" . PHP_EOL;
}
