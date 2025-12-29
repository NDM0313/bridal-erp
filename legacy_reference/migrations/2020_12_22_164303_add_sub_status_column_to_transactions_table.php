<?php

use App\Transaction;
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
        try { Schema::table('transactions', function (Blueprint $table) {
            $table->string('sub_status')->nullable()->index();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        Transaction::where('is_quotation', 1)->update(['sub_status' => 'quotation']);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
    }
};
