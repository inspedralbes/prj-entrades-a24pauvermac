<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = ['user_id', 'screening_id', 'total_price', 'status', 'seats_id'];

    // Para que Laravel trate el campo 'seats_id' como un array de PHP automáticamente
    protected $casts = [
        'seats_id' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function screening()
    {
        return $this->belongsTo(Screening::class);
    }
}
