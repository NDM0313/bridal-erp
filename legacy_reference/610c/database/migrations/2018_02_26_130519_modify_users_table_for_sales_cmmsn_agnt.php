<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ModifyUsersTableForSalesCmmsnAgnt extends Migration
{
    public function up()
    {
        // SQLite does NOT support MODIFY COLUMN / ENUM
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'is_sales_commission_agent')) {
                    $table->boolean('is_sales_commission_agent')->default(false);
                }

                if (!Schema::hasColumn('users', 'sales_commission_percentage')) {
                    $table->decimal('sales_commission_percentage', 5, 2)->nullable();
                }
            });

            return;
        }

        // MySQL / others
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_sales_commission_agent')->default(false);
            $table->decimal('sales_commission_percentage', 5, 2)->nullable();
        });
    }

    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'is_sales_commission_agent',
                'sales_commission_percentage'
            ]);
        });
    }
}
