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
        try { Schema::table('oauth_clients', function (Blueprint $table) {
            $table->string('provider')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('oauth_clients', function (Blueprint $table) {
            $table->dropColumn('provider');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }
};
