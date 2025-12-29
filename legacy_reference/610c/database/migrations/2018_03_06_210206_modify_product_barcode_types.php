<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyProductBarcodeTypes extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN or ENUM
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'barcode_type')) {
                    $table->string('barcode_type')->nullable();
                }
            });

            return;
        }

        // MySQL / others - Skip if column already exists (it's being modified)
        if (!Schema::hasColumn('products', 'barcode_type')) {
            Schema::table('products', function (Blueprint $table) {
                $table->enum('barcode_type', [
                    'C128',
                    'C39',
                    'EAN13',
                    'EAN8',
                    'UPCA',
                    'UPCE'
                ])->nullable();
            });
        }
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode_type');
        });
    }
}
