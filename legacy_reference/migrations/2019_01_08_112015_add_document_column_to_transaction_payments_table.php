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
        try { Schema::table('transaction_payments', function (Blueprint $table) {
            $table->string('document')->nullable();
        }); } catch (\Exception $e) { /* Column or index may not exist */ }

        $dirs = ['img', 'documents', 'business_logos', 'invoice_logos'];
        foreach ($dirs as $dir) {
            $this->copyFiles($dir);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        try { Schema::table('transaction_payments', function (Blueprint $table) {
            $table->dropColumn('document');
        }); } catch (\Exception $e) { /* Column or index may not exist */ }
    }

    private function copyFiles($dir)
    {
        if (! file_exists(storage_path('app/public/'.$dir))) {
            return false;
        }

        $delete = [];
        // Get array of all source files
        $files = scandir(storage_path('app/public/'.$dir));
        // Identify directories
        $source = storage_path('app/public/'.$dir.'/');
        $destination = public_path('uploads/'.$dir.'/');

        if (! file_exists($destination)) {
            @mkdir($destination, 0775, true);
        }
        // Cycle through all source files
        foreach ($files as $file) {
            if (in_array($file, ['.', '..'])) {
                continue;
            }
            // If we copied this successfully, mark it for deletion
            if (file_exists($source.$file) && @copy($source.$file, $destination.$file)) {
                $delete[] = $source.$file;
            }
        }

        // Delete all successfully-copied files
        foreach ($delete as $file) {
            @unlink($file);
        }
    }
};
