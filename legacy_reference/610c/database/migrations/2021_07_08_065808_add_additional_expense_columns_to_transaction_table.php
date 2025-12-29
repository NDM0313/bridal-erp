<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        try { Schema::table('transactions', function (Blueprint $table) {
            $table->string('additional_expense_key_1')->nullable();
            $table->decimal('additional_expense_value_1', 22, 4)->default(0);

            $table->string('additional_expense_key_2')->nullable();
            $table->decimal('additional_expense_value_2', 22, 4)->default(0);

            $table->string('additional_expense_key_3')->nullable();
            $table->decimal('additional_expense_value_3', 22, 4)->default(0);

            $table->string('additional_expense_key_4')->nullable();
            $table->decimal('additional_expense_value_4', 22, 4)->default(0);
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
    }
};
