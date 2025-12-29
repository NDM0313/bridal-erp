<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class UpdateTransactionsTableExchangeRate extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('transactions', 'exchange_rate')) {
                    $table->decimal('exchange_rate', 15, 8)->default(1);
                }
            });

            return;
        }

        // MySQL / others - Skip if column already exists
        if (!Schema::hasColumn('transactions', 'exchange_rate')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->decimal('exchange_rate', 15, 8)->default(1);
            });
        }
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('exchange_rate', 15, 8)->default(1);
        });
    }
}
