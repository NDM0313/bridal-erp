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
        Schema::table('business', function (Blueprint $table) {
            $table->boolean('enable_row')->default(false);
            $table->boolean('enable_position')->default(false);
        });

        Schema::table('product_racks', function (Blueprint $table) {
            $table->string('row')->nullable();
            $table->string('position')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('business', function (Blueprint $table) {
            $table->dropColumn('enable_row');
            $table->dropColumn('enable_position');
        });

        Schema::table('product_racks', function (Blueprint $table) {
            $table->dropColumn('row');
            $table->dropColumn('position');
        });
    }
};
