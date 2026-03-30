<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movie extends Model
{
    protected $fillable = ['tmdb_id'];

    public function screenings()
    {
        return $this->hasMany(Screening::class);
    }
}
