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
        try { Schema::table('business', function (Blueprint $table) {
            $table->text('weighing_scale_setting')->comment('used to store the configuration of weighing scale');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('business', function (Blueprint $table) {
            //
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
