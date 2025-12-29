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
            $table->boolean('enable_rp')->default(0)->comment('rp is the short form of reward points');
            $table->string('rp_name')->nullable()->comment('rp is the short form of reward points');
            $table->decimal('amount_for_unit_rp', 22, 4)->default(1)->comment('rp is the short form of reward points');
            $table->decimal('min_order_total_for_rp', 22, 4)->default(1)->comment('rp is the short form of reward points');
            $table->integer('max_rp_per_order')->nullable()->comment('rp is the short form of reward points');

            $table->decimal('redeem_amount_per_unit_rp', 22, 4)->default(1)->comment('rp is the short form of reward points');
            $table->decimal('min_order_total_for_redeem', 22, 4)->default(1)->comment('rp is the short form of reward points');
            $table->integer('min_redeem_point')->nullable()->comment('rp is the short form of reward points');
            $table->integer('max_redeem_point')->nullable()->comment('rp is the short form of reward points');
            $table->integer('rp_expiry_period')->nullable()->comment('rp is the short form of reward points');
            $table->enum('rp_expiry_type', ['month', 'year'])->default('year')->comment('rp is the short form of reward points');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('transactions', function (Blueprint $table) {
            $table->integer('rp_earned')->default(0)->comment('rp is the short form of reward points');
            $table->integer('rp_redeemed')->default(0)->comment('rp is the short form of reward points');
            $table->decimal('rp_redeemed_amount', 22, 4)->default(0)->comment('rp is the short form of reward points');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        try { Schema::table('contacts', function (Blueprint $table) {
            $table->integer('total_rp')->default(0)->comment('rp is the short form of reward points');
            $table->integer('total_rp_used')->default(0)->comment('rp is the short form of reward points');
            $table->integer('total_rp_expired')->default(0)->comment('rp is the short form of reward points');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
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
