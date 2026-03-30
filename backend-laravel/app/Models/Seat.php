<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Seat extends Model
{
    protected $fillable = ['room_id', 'row', 'number', 'type'];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
