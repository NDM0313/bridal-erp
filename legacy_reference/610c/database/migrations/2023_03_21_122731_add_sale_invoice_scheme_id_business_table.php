<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        try { Schema::table('business_locations', function (Blueprint $table) {
            $table->integer('sale_invoice_scheme_id')->nullable();
            //invoice_scheme_id
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        DB::statement('UPDATE business_locations SET sale_invoice_scheme_id = invoice_scheme_id');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('business_locations', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
