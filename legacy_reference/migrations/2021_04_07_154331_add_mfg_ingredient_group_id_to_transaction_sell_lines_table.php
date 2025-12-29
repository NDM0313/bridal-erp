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
        try {
            Schema::table('transaction_sell_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('transaction_sell_lines', 'mfg_ingredient_group_id')) {
                    $table->integer('mfg_ingredient_group_id')->nullable();
                }
            });
        } catch (\Exception $e) {
            // Column already exists or reference column doesn't exist
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try {
            Schema::table('transaction_sell_lines', function (Blueprint $table) {
                if (Schema::hasColumn('transaction_sell_lines', 'mfg_ingredient_group_id')) {
                    $table->dropColumn('mfg_ingredient_group_id');
                }
            });
        } catch (\Exception $e) {
            // Column doesn't exist
        }
    }
};
