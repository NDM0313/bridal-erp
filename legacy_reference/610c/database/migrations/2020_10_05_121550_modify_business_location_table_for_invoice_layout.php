<?php

use App\BusinessLocation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        try { Schema::table('business_locations', function (Blueprint $table) {
            $table->integer('sale_invoice_layout_id')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        BusinessLocation::whereNotNull('id')->update([
            'sale_invoice_layout_id' => DB::raw('invoice_layout_id'),
        ]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
};
