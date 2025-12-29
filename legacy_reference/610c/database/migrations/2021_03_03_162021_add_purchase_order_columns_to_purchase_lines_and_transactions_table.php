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
            $table->integer('purchase_order_line_id')->nullable();
            $table->decimal('po_quantity_purchased', 22, 4)->default(0);
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('transactions', function (Blueprint $table) {
            $table->text('purchase_order_ids')->nullable();
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
