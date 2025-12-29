<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyTransactionsTableForStockTransfer extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or ENUM
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('transactions', 'transfer_parent_id')) {
                    $table->unsignedInteger('transfer_parent_id')->nullable();
                }

                if (!Schema::hasColumn('transactions', 'transfer_location_id')) {
                    $table->unsignedInteger('transfer_location_id')->nullable();
                }

                if (!Schema::hasColumn('transactions', 'is_stock_transfer')) {
                    $table->boolean('is_stock_transfer')->default(false);
                }
            });

            return;
        }

        // MySQL / others
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedInteger('transfer_parent_id')->nullable();
            $table->unsignedInteger('transfer_location_id')->nullable();
            $table->boolean('is_stock_transfer')->default(false);
        });
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn([
                'transfer_parent_id',
                'transfer_location_id',
                'is_stock_transfer',
            ]);
        });
    }
}
