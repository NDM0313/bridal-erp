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
        try { Schema::table('contacts', function (Blueprint $table) {
            $table->string('custom_field5')->nullable();
            $table->string('custom_field6')->nullable();
            $table->string('custom_field7')->nullable();
            $table->string('custom_field8')->nullable();
            $table->string('custom_field9')->nullable();
            $table->string('custom_field10')->nullable();
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
