<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing', function (Blueprint $table) {
            $table->id();
            $table->enum('format', ['2D', '3D']);
            $table->float('price');
            $table->enum('type', ['normal', 'VIP']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing');
    }
};
