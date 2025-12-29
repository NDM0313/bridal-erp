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
        try { Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_enable_service_staff_pin')->default(0);
            $table->text('service_staff_pin')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('users', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
