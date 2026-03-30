<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pricing extends Model
{
    protected $table = 'pricing'; // Forzamos el nombre manual de la tabla

    protected $fillable = ['format', 'price', 'type'];

    public function screenings()
    {
        return $this->hasMany(Screening::class);
    }
}
