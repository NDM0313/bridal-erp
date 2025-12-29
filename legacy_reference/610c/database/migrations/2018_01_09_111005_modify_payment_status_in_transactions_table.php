<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyPaymentStatusInTransactionsTable extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or ENUM
        if (DB::getDriverName() === 'sqlite') {
            // Ensure column exists as TEXT
            Schema::table('transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('transactions', 'payment_status')) {
                    $table->string('payment_status')->nullable();
                }
            });

            return;
        }

        // MySQL / others - Use raw SQL to avoid Doctrine DBAL requirement
        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE transactions MODIFY COLUMN payment_status ENUM('paid', 'due', 'partial') NULL");
            }
        } catch (\Exception $e) {
            // If modification fails, silently continue
        }
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE transactions MODIFY COLUMN payment_status ENUM('paid', 'due') NULL");
            }
        } catch (\Exception $e) {
            // Silently fail during rollback
        }
    }
}
