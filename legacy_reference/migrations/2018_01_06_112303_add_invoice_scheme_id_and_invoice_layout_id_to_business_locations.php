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
        Schema::table('business_locations', function (Blueprint $table) {
            $table->integer('invoice_scheme_id')->unsigned()->nullable();
            $table->integer('invoice_layout_id')->unsigned()->nullable();
        });
        
        // Add foreign keys separately
        Schema::table('business_locations', function (Blueprint $table) {
            $table->foreign('invoice_scheme_id')->references('id')->on('invoice_schemes')->onDelete('set null');
            $table->foreign('invoice_layout_id')->references('id')->on('invoice_layouts')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('business_locations', function (Blueprint $table) {
            //
        });
    }
};
