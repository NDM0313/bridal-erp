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
            $table->decimal('round_off_amount', 22, 4)->default(0)->comment('Difference of rounded total and actual total');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('invoice_layouts', function (Blueprint $table) {
            $table->string('round_off_label')->nullable();
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
