<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ChangeTaxFieldToNullableInBusinessTable extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('business', function (Blueprint $table) {
                // Ensure column exists; SQLite already allows NULLs by default
                if (!Schema::hasColumn('business', 'tax_number')) {
                    $table->string('tax_number')->nullable();
                }
            });

            return;
        }

        // MySQL / others
        Schema::table('business', function (Blueprint $table) {
            $table->string('tax_number')->nullable();
        });
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('business', function (Blueprint $table) {
            $table->string('tax_number')->nullable(false);
        });
    }
}
