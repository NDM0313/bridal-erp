<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class StockAdjustmentMoveToTransactionTable extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or complex ALTERs
        if (DB::getDriverName() === 'sqlite') {
            // Ensure required columns exist as basic types
            Schema::table('transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('transactions', 'adjustment_type')) {
                    $table->string('adjustment_type')->nullable();
                }

                if (!Schema::hasColumn('transactions', 'stock_adjustment')) {
                    $table->boolean('stock_adjustment')->default(false);
                }
            });

            return;
        }

        // MySQL / others
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('stock_adjustment')->default(false);
            $table->enum('adjustment_type', ['normal', 'abnormal'])->nullable();
        });
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['stock_adjustment', 'adjustment_type']);
        });
    }
}
