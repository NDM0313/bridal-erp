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
        try { Schema::table('invoice_schemes', function (Blueprint $table) {
            $table->string('number_type', 100)->default('sequential');

            $table->index('number_type');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('invoice_schemes', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
