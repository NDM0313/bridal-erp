<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyTransactionPaymentsTableForContactPayments extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or ENUM
        if (DB::getDriverName() === 'sqlite') {
            // Ensure column exists as TEXT / INTEGER
            Schema::table('transaction_payments', function (Blueprint $table) {
                if (!Schema::hasColumn('transaction_payments', 'is_return')) {
                    $table->integer('is_return')->default(0);
                }

                if (!Schema::hasColumn('transaction_payments', 'payment_for')) {
                    $table->string('payment_for')->nullable();
                }
            });

            return;
        }

        // MySQL / others
        Schema::table('transaction_payments', function (Blueprint $table) {
            $table->enum('payment_for', ['customer', 'supplier'])->nullable();
            $table->boolean('is_return')->default(0);
        });
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transaction_payments', function (Blueprint $table) {
            $table->dropColumn(['payment_for', 'is_return']);
        });
    }
}
