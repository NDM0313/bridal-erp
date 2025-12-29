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
        try { Schema::table('products', function (Blueprint $table) {
            $table->string('product_custom_field5')->nullable();
            $table->string('product_custom_field6')->nullable();
            $table->string('product_custom_field7')->nullable();
            $table->string('product_custom_field8')->nullable();
            $table->string('product_custom_field9')->nullable();
            $table->string('product_custom_field10')->nullable();
            $table->string('product_custom_field11')->nullable();
            $table->string('product_custom_field12')->nullable();
            $table->string('product_custom_field13')->nullable();
            $table->string('product_custom_field14')->nullable();
            $table->string('product_custom_field15')->nullable();
            $table->string('product_custom_field16')->nullable();
            $table->string('product_custom_field17')->nullable();
            $table->string('product_custom_field18')->nullable();
            $table->string('product_custom_field19')->nullable();
            $table->string('product_custom_field20')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('products', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
