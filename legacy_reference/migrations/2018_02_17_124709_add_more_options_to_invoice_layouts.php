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
            $table->string('invoice_heading_paid')->nullable();
            $table->string('invoice_heading_not_paid')->nullable();
            $table->string('total_due_label')->nullable();
            $table->string('paid_label')->nullable();
            $table->boolean('show_payments')->default(0);
            $table->boolean('show_customer')->default(0);
            $table->string('customer_label')->nullable();
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
            $table->dropColumn('invoice_heading_paid');
            $table->dropColumn('invoice_heading_not_paid');
            $table->dropColumn('total_due_label');
            $table->dropColumn('paid_label');
            $table->dropColumn('show_payments');
            $table->dropColumn('show_customer');
            $table->dropColumn('customer_label');
        });
    }
};
