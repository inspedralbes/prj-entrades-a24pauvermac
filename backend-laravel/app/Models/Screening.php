<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Screening extends Model
{
    protected $fillable = ['movie_id', 'room_id', 'price_id', 'starts_at', 'language', 'format'];

    protected $casts = [
        'starts_at' => 'datetime',
    ];

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
