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
            $table->integer('preparation_time_in_minutes')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('users', function (Blueprint $table) {
            $table->dateTime('available_at')->nullable()->comment('Service staff avilable at. Calculated from product preparation_time_in_minutes');
            $table->dateTime('paused_at')->nullable()->comment('Service staff available time paused at, Will be nulled on resume.');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('products_and_users', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
