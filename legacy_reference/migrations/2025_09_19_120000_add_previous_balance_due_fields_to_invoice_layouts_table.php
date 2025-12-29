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
        try { Schema::table('invoice_layouts', function (Blueprint $table) {
            // Mirror existing previous balance columns: show_previous_bal, prev_bal_label
            $table->boolean('show_previous_balance_due')->default(0);
            $table->string('previous_balance_due_label')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('invoice_layouts', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_layouts', 'previous_balance_due_label')) {
                $table->dropColumn('previous_balance_due_label');
            }
            if (Schema::hasColumn('invoice_layouts', 'show_previous_balance_due')) {
                $table->dropColumn('show_previous_balance_due');
            }
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};


