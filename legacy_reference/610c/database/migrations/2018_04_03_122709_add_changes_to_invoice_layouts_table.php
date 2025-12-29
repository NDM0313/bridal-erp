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
        Schema::table('invoice_layouts', function (Blueprint $table) {
            $table->string('sub_heading_line1')->nullable();
            $table->string('sub_heading_line2')->nullable();
            $table->string('sub_heading_line3')->nullable();
            $table->string('sub_heading_line4')->nullable();
            $table->string('sub_heading_line5')->nullable();

            $table->string('table_product_label')->nullable();
            $table->string('table_qty_label')->nullable();
            $table->string('table_unit_price_label')->nullable();
            $table->string('table_subtotal_label')->nullable();

            $table->boolean('show_client_id')->default(0);
            $table->string('client_id_label')->nullable();
            $table->string('date_label')->nullable();
            $table->boolean('show_time')->default(1);

            $table->boolean('show_brand')->default(0);
            $table->boolean('show_sku')->default(1);
            $table->boolean('show_cat_code')->default(1);
            $table->boolean('show_sale_description')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('invoice_layouts', function (Blueprint $table) {
            //
        });
    }
};
