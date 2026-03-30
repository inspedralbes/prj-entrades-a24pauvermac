<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('screening_id')->constrained()->onDelete('cascade');
            $table->float('total_price');
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
            $table->string('seats_id'); // Almacenará el JSON como VARCHAR según petición
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
