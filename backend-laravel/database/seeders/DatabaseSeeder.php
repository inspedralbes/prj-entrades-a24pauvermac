<?php
// docker exec tiquet_laravel php artisan migrate:fresh --seed
//comando para rellenar la bbdd
namespace Database\Seeders;

use App\Models\User;
use App\Models\Room;
use App\Models\Seat;
use App\Models\Pricing;
use App\Models\Movie;
use App\Models\Screening;
use App\Models\Booking;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear usuario admin
        User::updateOrCreate(
            ['email' => 'admin@tiquet.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('12345678'),
                'role' => 'admin',
            ]
        );

        // 2. Crear las Salas
        $room1 = Room::updateOrCreate(['name' => 'Sala 1'], ['capacity' => 50]);
        $roomVip = Room::updateOrCreate(['name' => 'Sala VIP'], ['capacity' => 20]);

        // 3. Crear los Asientos
        if (Seat::count() == 0) {
            // Asientos para Sala 1
            for ($row = 1; $row <= 5; $row++) {
                for ($num = 1; $num <= 10; $num++) {
                    Seat::create(['room_id' => $room1->id, 'row' => $row, 'number' => $num, 'type' => 'normal']);
                }
            }
            // Asientos para Sala VIP
            for ($row = 1; $row <= 4; $row++) {
                for ($num = 1; $num <= 5; $num++) {
                    Seat::create(['room_id' => $roomVip->id, 'row' => $row, 'number' => $num, 'type' => 'VIP']);
                }
            }
        }

        // 4. Crear los Precios
        $price2D = Pricing::updateOrCreate(['format' => '2D', 'type' => 'normal'], ['price' => 8.50]);
        $price3D = Pricing::updateOrCreate(['format' => '3D', 'type' => 'normal'], ['price' => 11.00]);
        $priceVIP = Pricing::updateOrCreate(['format' => '2D', 'type' => 'VIP'], ['price' => 15.00]);

        // 5. Crear Películas (IDs reales de TMDB extraidos del cartel visual del usuario)
        $movie1 = Movie::updateOrCreate(['tmdb_id' => '1011985']); // Kung Fu Panda 4
        $movie2 = Movie::updateOrCreate(['tmdb_id' => '1022789']); // Inside Out 2
        $movie3 = Movie::updateOrCreate(['tmdb_id' => '693134']);  // Dune: Part Two
        
        // --- NUEVAS PELÍCULAS AÑADIDAS ---
        $movieMickey = Movie::updateOrCreate(['tmdb_id' => '696506']); // Mickey 17
        $movieMario = Movie::updateOrCreate(['tmdb_id' => '502356']); // Super Mario Bros
        $movieHoppers = Movie::updateOrCreate(['tmdb_id' => '1209290']); // Hoppers
        $movieGreenland = Movie::updateOrCreate(['tmdb_id' => '840816']); // Greenland Migration
        $movieShelter = Movie::updateOrCreate(['tmdb_id' => '1215162']); // Shelter / Levon's Trade

        // 6. Crear Sesiones (Screenings)
        if (Screening::count() == 0) {
            $today = Carbon::today();
            
            // Sesiones Clásicas
            Screening::create(['movie_id' => $movie1->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->setHour(17)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movie2->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->setHour(19)->setMinute(30), 'language' => 'esp', 'format' => '2D']);

            // --- CASO 1: SALA LLENA (Mickey 17) ---
            $sesionLlena = Screening::create([
                'movie_id' => $movieMickey->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(21)->setMinute(0),
                'language' => 'eng',
                'format' => '2D'
            ]);

            // --- CASO 2: CASI LLENA, SOLO 2 ASIENTOS (Super Mario Bros) ---
            $sesionCasiLlena = Screening::create([
                'movie_id' => $movieMario->id,
                'room_id' => $room1->id,
                'price_id' => $price3D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(17)->setMinute(30),
                'language' => 'esp',
                'format' => '3D'
            ]);

            // --- CASO 3: SALA COMPLETAMENTE VACÍA (Hoppers) ---
            $sesionVacia = Screening::create([
                'movie_id' => $movieHoppers->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(2)->setHour(16)->setMinute(15),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // --- CASO 4: MÚLTIPLES SESIONES EN EL MISMO DÍA (Greenland Migration) ---
            Screening::create(['movie_id' => $movieGreenland->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->addDays(3)->setHour(16)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movieGreenland->id, 'room_id' => $room1->id, 'price_id' => $price3D->id, 'starts_at' => $today->copy()->addDays(3)->setHour(18)->setMinute(30), 'language' => 'eng', 'format' => '3D']);
            Screening::create(['movie_id' => $movieGreenland->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(3)->setHour(22)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
        }

        // 7. Generar las Reservas Matemáticas de los casos
        $cuentaReservas = Booking::count();
        if ($cuentaReservas == 0) {
            $usuarioPrueba = User::first();

            // CASO 1: Llenar la sala VIP por completo (20 asientos)
            $vipSeats = Seat::where('room_id', $roomVip->id)->pluck('id')->toArray();
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesionLlena->id,
                'total_price' => count($vipSeats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $vipSeats 
            ]);

            // CASO 2: Llenar la Sala 1 dejando solo 2 asientos libres (48 asientos ocupados)
            $normalSeats = Seat::where('room_id', $room1->id)->pluck('id')->toArray();
            $casiLlenoSeats = array_slice($normalSeats, 0, count($normalSeats) - 2); // Pillamos todos menos 2
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesionCasiLlena->id,
                'total_price' => count($casiLlenoSeats) * 11.00, // Es 3D
                'status' => 'confirmed',
                'seats_id' => $casiLlenoSeats 
            ]);

            // (El CASO 3 y 4 se ignoran en reservas para que estén totalmente limpios y libres para el usuario)
        }
    }
}
