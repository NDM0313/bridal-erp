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
            $table->string('shipping_custom_field_1')->nullable();
            $table->string('shipping_custom_field_2')->nullable();
            $table->string('shipping_custom_field_3')->nullable();
            $table->string('shipping_custom_field_4')->nullable();
            $table->string('shipping_custom_field_5')->nullable();
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
