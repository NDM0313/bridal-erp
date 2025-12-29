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
            $table->text('sub_unit_ids')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('business', function (Blueprint $table) {
            $table->boolean('enable_sub_units')->default(false);
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sub_unit_ids');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('business', function (Blueprint $table) {
            $table->dropColumn('enable_sub_units');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
