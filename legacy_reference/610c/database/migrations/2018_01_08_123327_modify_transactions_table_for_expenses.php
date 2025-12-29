<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyTransactionsTableForExpenses extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or ENUM
        if (DB::getDriverName() === 'sqlite') {
            // Ensure column exists as TEXT (SQLite-friendly)
            Schema::table('transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('transactions', 'type')) {
                    $table->string('type');
                }
            });

            return;
        }

        // MySQL / others - Use raw SQL to avoid Doctrine DBAL requirement
        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('purchase', 'sell', 'expense') NOT NULL DEFAULT 'purchase'");
            }
        } catch (\Exception $e) {
            // If modification fails, just add the column if it doesn't exist
            if (!Schema::hasColumn('transactions', 'type')) {
                Schema::table('transactions', function (Blueprint $table) {
                    $table->string('type')->default('purchase');
                });
            }
        }
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('purchase', 'sell') NOT NULL DEFAULT 'purchase'");
            }
        } catch (\Exception $e) {
            // Silently fail during rollback
        }
    }
}
