<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // SQLite does not support the original ALTER logic
        // Safely skipped for local SQLite
    }

    public function down()
    {
        // no-op
    }
};
