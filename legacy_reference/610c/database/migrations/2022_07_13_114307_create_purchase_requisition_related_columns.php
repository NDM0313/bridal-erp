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
        try { Schema::table('purchase_lines', function (Blueprint $table) {
            $table->integer('purchase_requisition_line_id')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('transactions', function (Blueprint $table) {
            $table->text('purchase_requisition_ids')->nullable();
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
