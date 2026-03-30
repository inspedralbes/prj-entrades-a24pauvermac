<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('screenings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movie_id')->constrained()->onDelete('cascade');
            $table->foreignId('room_id')->constrained()->onDelete('cascade');
            $table->foreignId('price_id')->constrained('pricing')->onDelete('cascade');
            $table->datetime('starts_at');
            $table->enum('language', ['cat', 'esp', 'eng']);
            $table->enum('format', ['2D', '3D'])->default('2D');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screenings');
    }
};
