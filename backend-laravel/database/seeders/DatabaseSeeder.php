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
        $admin = User::updateOrCreate(
            ['email' => 'admin@tiquet.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('12345678'),
                'role' => 'admin',
            ]
        );

        // 2. Crear usuario de prueba
        User::updateOrCreate(
            ['email' => 'user@example.com'],
            [
                'name' => 'User',
                'password' => Hash::make('123users'),
                'role' => 'user',
            ]
        );

        $user = User::where('email', 'user@example.com')->first();

        // 3. Crear las Salas
        $room1 = Room::updateOrCreate(['name' => 'Sala 1'], ['capacity' => 50]);
        $roomVip = Room::updateOrCreate(['name' => 'Sala VIP'], ['capacity' => 20]);

        // 4. Crear los Asientos
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

        // 5. Crear los Precios
        $price2D = Pricing::updateOrCreate(['format' => '2D', 'type' => 'normal'], ['price' => 8.50]);
        $price3D = Pricing::updateOrCreate(['format' => '3D', 'type' => 'normal'], ['price' => 11.00]);
        $priceVIP = Pricing::updateOrCreate(['format' => '2D', 'type' => 'VIP'], ['price' => 15.00]);

        // 6. Crear las Películas (IDs de TMDB proporcionados)
        $movie1 = Movie::updateOrCreate(['tmdb_id' => '1290821']); // Zelda
        $movie2 = Movie::updateOrCreate(['tmdb_id' => '1523145']); // Your Heart Will Be Broken
        $movie3 = Movie::updateOrCreate(['tmdb_id' => '83533']);  // Matilda
        $movie4 = Movie::updateOrCreate(['tmdb_id' => '1327819']); // Emilia
        $movie5 = Movie::updateOrCreate(['tmdb_id' => '502356']); // Super Mario Bros.: La Película

        // 7. Crear Sesiones (Screenings)
        if (Screening::count() == 0) {
            $today = Carbon::today();

            // Zelda (1290821) - 2 sesiones
            Screening::create(['movie_id' => $movie1->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->addDays(1)->setHour(18)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movie1->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(2)->setHour(20)->setMinute(0), 'language' => 'eng', 'format' => '2D']);

            // Your Heart Will Be Broken (1523145) - 2 sesiones
            Screening::create(['movie_id' => $movie2->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->addDays(1)->setHour(17)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movie2->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(3)->setHour(19)->setMinute(0), 'language' => 'esp', 'format' => '2D']);

            // Matilda (83533) - 2 sesiones
            Screening::create(['movie_id' => $movie3->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->addDays(1)->setHour(19)->setMinute(0), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movie3->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(4)->setHour(18)->setMinute(0), 'language' => 'eng', 'format' => '2D']);

            // Emilia (1327819) - 2 sesiones
            Screening::create(['movie_id' => $movie4->id, 'room_id' => $room1->id, 'price_id' => $price2D->id, 'starts_at' => $today->copy()->addDays(2)->setHour(16)->setMinute(30), 'language' => 'esp', 'format' => '2D']);
            Screening::create(['movie_id' => $movie4->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(5)->setHour(20)->setMinute(0), 'language' => 'esp', 'format' => '2D']);

            // Super Mario Bros (502356) - 2 sesiones
            Screening::create(['movie_id' => $movie5->id, 'room_id' => $room1->id, 'price_id' => $price3D->id, 'starts_at' => $today->copy()->addDays(1)->setHour(21)->setMinute(0), 'language' => 'esp', 'format' => '3D']);
            Screening::create(['movie_id' => $movie5->id, 'room_id' => $roomVip->id, 'price_id' => $priceVIP->id, 'starts_at' => $today->copy()->addDays(3)->setHour(18)->setMinute(30), 'language' => 'esp', 'format' => '2D']);
        }

        // 8. Generar las Reservas con diferentes estados de ocupación
        if (Booking::count() == 0) {
            $vipSeats = Seat::where('room_id', $roomVip->id)->pluck('id')->toArray();
            $normalSeats = Seat::where('room_id', $room1->id)->pluck('id')->toArray();

            $screenings = Screening::with('movie')->get();

            foreach ($screenings as $sesion) {
                $tmdb = $sesion->movie->tmdb_id ?? '';
                $isVip = $sesion->room_id == $roomVip->id;
                $seats = $isVip ? $vipSeats : $normalSeats;
                $precio = $isVip ? 15.00 : 8.50;

                if ($tmdb == '1290821') {
                    Booking::create(['user_id' => $user->id, 'screening_id' => $sesion->id, 'total_price' => count($seats) * $precio, 'status' => 'confirmed', 'seats_id' => $seats]);
                } elseif ($tmdb == '1523145') {
                    $partial = array_slice($seats, 0, count($seats) - 10);
                    Booking::create(['user_id' => $user->id, 'screening_id' => $sesion->id, 'total_price' => count($partial) * $precio, 'status' => 'confirmed', 'seats_id' => $partial]);
                } elseif ($tmdb == '502356') {
                    Booking::create(['user_id' => $user->id, 'screening_id' => $sesion->id, 'total_price' => count($seats) * $precio, 'status' => 'confirmed', 'seats_id' => $seats]);
                }
            }
        }
    }
}