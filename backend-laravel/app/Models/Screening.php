<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Screening extends Model
{
    protected $fillable = ['movie_id', 'room_id', 'price_id', 'starts_at', 'language', 'format'];

    protected $casts = [
        'starts_at' => 'datetime',
    ];

    // Cuando cualquier controlador pida un Screening, este campo se incluye automaticamente
    protected $appends = ['occupied_seats'];

    /**
     * Contar los asientos ocupados (confirmados) de esta sesion.
     * Gracias a $appends, se puede acceder como $screening->occupied_seats desde cualquier sitio.
     */
    public function getOccupiedSeatsAttribute()
    {
        $totalOcupados = 0;

        // Buscamos todas las reservas confirmadas de esta sesion concreta
        $reservas = \App\Models\Booking::where('screening_id', $this->id)
                                        ->where('status', 'confirmed')
                                        ->get();

        foreach ($reservas as $reserva) {
            // seats_id es un array JSON gracias al cast del modelo Booking
            $totalOcupados += count($reserva->seats_id ?? []);
        }

        return $totalOcupados;
    }

    public function movie()
    {
        return $this->belongsTo(Movie::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function pricing()
    {
        return $this->belongsTo(Pricing::class, 'price_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
