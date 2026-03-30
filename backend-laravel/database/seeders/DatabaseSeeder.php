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

        // 5. Crear Películas (IDs reales de TMDB)
        $movie1 = Movie::updateOrCreate(['tmdb_id' => '1011985']); // Kung Fu Panda 4
        $movie2 = Movie::updateOrCreate(['tmdb_id' => '1022789']); // Inside Out 2
        $movie3 = Movie::updateOrCreate(['tmdb_id' => '693134']);  // Dune: Part Two
        
        // Películas requeridas por el usuario
        $movie4 = Movie::updateOrCreate(['tmdb_id' => '83533']);
        $movie5 = Movie::updateOrCreate(['tmdb_id' => '1115544']);

        // 6. Crear Sesiones (Screenings)
        if (Screening::count() == 0) {
            $today = Carbon::today();
            
            Screening::create([
                'movie_id' => $movie1->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->setHour(17)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            Screening::create([
                'movie_id' => $movie2->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->setHour(19)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            Screening::create([
                'movie_id' => $movie3->id,
                'room_id' => $room1->id,
                'price_id' => $price3D->id,
                'starts_at' => $today->copy()->setHour(22)->setMinute(0),
                'language' => 'eng',
                'format' => '3D'
            ]);

            // Sesion para la peli 83533 (Sala VIP)
            Screening::create([
                'movie_id' => $movie4->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDay()->setHour(20)->setMinute(0),
                'language' => 'esp',
                'format' => '3D'
            ]);

            // Sesion para la peli 1115544 (Sala Normal)
            Screening::create([
                'movie_id' => $movie5->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDay()->setHour(18)->setMinute(15),
                'language' => 'cat',
                'format' => '2D'
            ]);
        }

        // 7. Crear Reservas Falsas para probar asientos ocupados
        // Solo lo hacemos si no hay ninguna creada
        $cuentaReservas = Booking::count();
        if ($cuentaReservas == 0) {
            $usuarioPrueba = User::first();
            $sesionPrueba = Screening::first();

            // Reserva A: Esta reserva ESTA CONFIRMADA y tiene 3 asientos elegidos
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesionPrueba->id,
                'total_price' => 25.50,
                'status' => 'confirmed',
                'seats_id' => [1, 2, 3] // Laravel convierte esto en texto tipo JSON automaticamente
            ]);

            // Reserva B: Esta reserva ESTA PENDIENTE (alguien dudando) y tiene 2 asientos
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesionPrueba->id,
                'total_price' => 17.00,
                'status' => 'pending', 
                'seats_id' => [4, 5]
            ]);

            // Reserva C: Reserva confirmada para la peli 83533 (Ocupamos 5 asientos en VIP)
            $sesion83533 = Screening::where('movie_id', $movie4->id)->first();
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesion83533->id,
                'total_price' => 75.00,
                'status' => 'confirmed',
                'seats_id' => [1, 2, 3, 4, 5] 
            ]);

            // Reserva D: Reserva masiva confirmada para la peli 1115544 (Ocupamos 12 asientos en Sala 1)
            $sesion1115544 = Screening::where('movie_id', $movie5->id)->first();
            Booking::create([
                'user_id' => $usuarioPrueba->id,
                'screening_id' => $sesion1115544->id,
                'total_price' => 102.00,
                'status' => 'confirmed',
                'seats_id' => [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] 
            ]);
        }
    }
}
