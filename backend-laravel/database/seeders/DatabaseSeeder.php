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
        $movie1 = Movie::updateOrCreate(['tmdb_id' => '1523145']); // Your Heart Will Be Broken
        $movie2 = Movie::updateOrCreate(['tmdb_id' => '839233']);  // Avatar: Fuego y Ceniza
        $movie3 = Movie::updateOrCreate(['tmdb_id' => '1329334']); // Hoppers
        $movie4 = Movie::updateOrCreate(['tmdb_id' => '1196470']); // Shelter: El Protector
        $movie5 = Movie::updateOrCreate(['tmdb_id' => '1214481']); // Ruta de Escape
        $movie6 = Movie::updateOrCreate(['tmdb_id' => '1264372']); // Super Mario Galaxy: La Película
        $movie7 = Movie::updateOrCreate(['tmdb_id' => '502356']); // Super Mario Bros.: La Película
        $movie8 = Movie::updateOrCreate(['tmdb_id' => '1285140']); // Mike y Nick y Nick y Alice
        $movie9 = Movie::updateOrCreate(['tmdb_id' => '1305412']); // Como Cabras
        $movie10 = Movie::updateOrCreate(['tmdb_id' => '840430']); // El Día del Fin del Mundo: Migración

        // 7. Crear Sesiones (Screenings)
        if (Screening::count() == 0) {
            $today = Carbon::today();

            // Your Heart Will Be Broken - Sesión llena (Sala VIP)
            $sesion1_1 = Screening::create([
                'movie_id' => $movie1->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(18)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Your Heart Will Be Broken - Sesión casi vacía (Sala 1)
            $sesion1_2 = Screening::create([
                'movie_id' => $movie1->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(2)->setHour(20)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Avatar: Fuego y Ceniza - Sesión llena (Sala 1)
            $sesion2_1 = Screening::create([
                'movie_id' => $movie2->id,
                'room_id' => $room1->id,
                'price_id' => $price3D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(17)->setMinute(30),
                'language' => 'esp',
                'format' => '3D'
            ]);

            // Avatar: Fuego y Ceniza - Sesión parcial (Sala VIP)
            $sesion2_2 = Screening::create([
                'movie_id' => $movie2->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(3)->setHour(21)->setMinute(0),
                'language' => 'eng',
                'format' => '2D'
            ]);

            // Hoppers - Sesión vacía (Sala 1)
            $sesion3_1 = Screening::create([
                'movie_id' => $movie3->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(16)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Hoppers - Sesión casi llena (Sala VIP)
            $sesion3_2 = Screening::create([
                'movie_id' => $movie3->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(4)->setHour(19)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Shelter: El Protector - Sesión llena (Sala 1)
            $sesion4_1 = Screening::create([
                'movie_id' => $movie4->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(2)->setHour(18)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Shelter: El Protector - Sesión vacía (Sala VIP)
            $sesion4_2 = Screening::create([
                'movie_id' => $movie4->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(5)->setHour(20)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Ruta de Escape - Sesión parcial (Sala 1)
            $sesion5_1 = Screening::create([
                'movie_id' => $movie5->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(19)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Ruta de Escape - Sesión vacía (Sala VIP)
            $sesion5_2 = Screening::create([
                'movie_id' => $movie5->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(3)->setHour(22)->setMinute(0),
                'language' => 'eng',
                'format' => '2D'
            ]);

            // Super Mario Galaxy: La Película - Sesión llena (Sala 1)
            $sesion6_1 = Screening::create([
                'movie_id' => $movie6->id,
                'room_id' => $room1->id,
                'price_id' => $price3D->id,
                'starts_at' => $today->copy()->addDays(2)->setHour(16)->setMinute(30),
                'language' => 'esp',
                'format' => '3D'
            ]);

            // Super Mario Galaxy: La Película - Sesión parcial (Sala VIP)
            $sesion6_2 = Screening::create([
                'movie_id' => $movie6->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(4)->setHour(17)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Super Mario Bros.: La Película - Sesión vacía (Sala 1)
            $sesion7_1 = Screening::create([
                'movie_id' => $movie7->id,
                'room_id' => $room1->id,
                'price_id' => $price3D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(21)->setMinute(0),
                'language' => 'esp',
                'format' => '3D'
            ]);

            // Super Mario Bros.: La Película - Sesión casi llena (Sala VIP)
            $sesion7_2 = Screening::create([
                'movie_id' => $movie7->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(5)->setHour(18)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Mike y Nick y Nick y Alice - Sesión llena (Sala 1)
            $sesion8_1 = Screening::create([
                'movie_id' => $movie8->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(2)->setHour(20)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Mike y Nick y Nick y Alice - Sesión vacía (Sala VIP)
            $sesion8_2 = Screening::create([
                'movie_id' => $movie8->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(6)->setHour(19)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Como Cabras - Sesión parcial (Sala 1)
            $sesion9_1 = Screening::create([
                'movie_id' => $movie9->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(3)->setHour(17)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // Como Cabras - Sesión vacía (Sala VIP)
            $sesion9_2 = Screening::create([
                'movie_id' => $movie9->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(5)->setHour(21)->setMinute(30),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // El Día del Fin del Mundo: Migración - Sesión llena (Sala 1)
            $sesion10_1 = Screening::create([
                'movie_id' => $movie10->id,
                'room_id' => $room1->id,
                'price_id' => $price2D->id,
                'starts_at' => $today->copy()->addDays(1)->setHour(22)->setMinute(0),
                'language' => 'esp',
                'format' => '2D'
            ]);

            // El Día del Fin del Mundo: Migración - Sesión parcial (Sala VIP)
            $sesion10_2 = Screening::create([
                'movie_id' => $movie10->id,
                'room_id' => $roomVip->id,
                'price_id' => $priceVIP->id,
                'starts_at' => $today->copy()->addDays(4)->setHour(16)->setMinute(0),
                'language' => 'eng',
                'format' => '2D'
            ]);
        }

        // 8. Generar las Reservas con diferentes estados de ocupación
        if (Booking::count() == 0) {
            $vipSeats = Seat::where('room_id', $roomVip->id)->pluck('id')->toArray();
            $normalSeats = Seat::where('room_id', $room1->id)->pluck('id')->toArray();

            // Your Heart Will Be Broken - Sesión llena (20 asientos VIP)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion1_1->id,
                'total_price' => count($vipSeats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $vipSeats
            ]);

            // Your Heart Will Be Broken - Sesión casi vacía (5 asientos)
            $sesion1_2_seats = array_slice($normalSeats, 0, 5);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion1_2->id,
                'total_price' => count($sesion1_2_seats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $sesion1_2_seats
            ]);

            // Avatar: Fuego y Ceniza - Sesión llena (50 asientos Sala 1)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion2_1->id,
                'total_price' => count($normalSeats) * 11.00,
                'status' => 'confirmed',
                'seats_id' => $normalSeats
            ]);

            // Avatar: Fuego y Ceniza - Sesión parcial (12 asientos VIP)
            $sesion2_2_seats = array_slice($vipSeats, 0, 12);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion2_2->id,
                'total_price' => count($sesion2_2_seats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $sesion2_2_seats
            ]);

            // Hoppers - Sesión vacía (sin reservas)

            // Hoppers - Sesión casi llena (18 asientos VIP)
            $sesion3_2_seats = array_slice($vipSeats, 0, 18);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion3_2->id,
                'total_price' => count($sesion3_2_seats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $sesion3_2_seats
            ]);

            // Shelter: El Protector - Sesión llena (50 asientos)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion4_1->id,
                'total_price' => count($normalSeats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $normalSeats
            ]);

            // Shelter: El Protector - Sesión vacía (sin reservas)

            // Ruta de Escape - Sesión parcial (25 asientos)
            $sesion5_1_seats = array_slice($normalSeats, 0, 25);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion5_1->id,
                'total_price' => count($sesion5_1_seats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $sesion5_1_seats
            ]);

            // Ruta de Escape - Sesión vacía (sin reservas)

            // Super Mario Galaxy: La Película - Sesión llena (50 asientos)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion6_1->id,
                'total_price' => count($normalSeats) * 11.00,
                'status' => 'confirmed',
                'seats_id' => $normalSeats
            ]);

            // Super Mario Galaxy: La Película - Sesión parcial (8 asientos VIP)
            $sesion6_2_seats = array_slice($vipSeats, 0, 8);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion6_2->id,
                'total_price' => count($sesion6_2_seats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $sesion6_2_seats
            ]);

            // Super Mario Bros.: La Película - Sesión vacía (sin reservas)

            // Super Mario Bros.: La Película - Sesión casi llena (18 asientos VIP)
            $sesion7_2_seats = array_slice($vipSeats, 0, 18);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion7_2->id,
                'total_price' => count($sesion7_2_seats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $sesion7_2_seats
            ]);

            // Mike y Nick y Nick y Alice - Sesión llena (50 asientos)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion8_1->id,
                'total_price' => count($normalSeats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $normalSeats
            ]);

            // Mike y Nick y Nick y Alice - Sesión vacía (sin reservas)

            // Como Cabras - Sesión parcial (30 asientos)
            $sesion9_1_seats = array_slice($normalSeats, 0, 30);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion9_1->id,
                'total_price' => count($sesion9_1_seats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $sesion9_1_seats
            ]);

            // Como Cabras - Sesión vacía (sin reservas)

            // El Día del Fin del Mundo: Migración - Sesión llena (50 asientos)
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion10_1->id,
                'total_price' => count($normalSeats) * 8.50,
                'status' => 'confirmed',
                'seats_id' => $normalSeats
            ]);

            // El Día del Fin del Mundo: Migración - Sesión parcial (10 asientos VIP)
            $sesion10_2_seats = array_slice($vipSeats, 0, 10);
            Booking::create([
                'user_id' => $user->id,
                'screening_id' => $sesion10_2->id,
                'total_price' => count($sesion10_2_seats) * 15.00,
                'status' => 'confirmed',
                'seats_id' => $sesion10_2_seats
            ]);
        }
    }
}