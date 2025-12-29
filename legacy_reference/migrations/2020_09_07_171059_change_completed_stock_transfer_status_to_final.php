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
            $table->index('status');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        Transaction::where('type', 'sell_transfer')
                ->where('status', 'completed')
                ->update(['status' => 'final']);

        Transaction::where('type', 'purchase_transfer')
                ->where('status', 'completed')
                ->update(['status' => 'received']);
    }
};
