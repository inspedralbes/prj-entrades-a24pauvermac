<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Pricing;
use App\Models\Movie;
use App\Models\Screening;
use App\Models\Booking;

class AdminController extends Controller
{
    /**
     * Obtener estadísticas globales.
     */
    public function getGlobalStats()
    {
        // 1. Recaudación Total
        $totalRevenue = Booking::where('status', 'confirmed')->sum('total_price');

        // 2. Ocupación (%): Asientos vendidos vs Capacidad total histórica
        $allConfirmedBookings = Booking::where('status', 'confirmed')->get();
        $totalSeatsSold = 0;
        foreach ($allConfirmedBookings as $booking) {
            $totalSeatsSold += count($booking->seats_id ?? []);
        }

        $allScreenings = Screening::with('room')->get();
        $totalHistoricalCapacity = 0;
        foreach ($allScreenings as $screening) {
            if ($screening->room) {
                $totalHistoricalCapacity += $screening->room->capacity;
            }
        }

        $occupancyPercentage = 0;
        if ($totalHistoricalCapacity > 0) {
            $occupancyPercentage = round(($totalSeatsSold / $totalHistoricalCapacity) * 100, 2);
        }

        // 3. Ventas por tipo (agrupamos por el type del Pricing)
        // Ejemplo de resultado: ["normal" => 500, "VIP" => 150]
        $salesByType = [];
        
        $bookingsWithRelations = Booking::with(['screening.pricing'])
                                        ->where('status', 'confirmed')
                                        ->get();
                                        
        foreach ($bookingsWithRelations as $booking) {
            if ($booking->screening && $booking->screening->pricing) {
                $type = $booking->screening->pricing->type;
                if (!isset($salesByType[$type])) {
                    $salesByType[$type] = 0;
                }
                $salesByType[$type] += $booking->total_price;
            }
        }

        return response()->json([
            'total_revenue' => $totalRevenue,
            'occupancy_percentage' => $occupancyPercentage,
            'sales_by_type' => $salesByType,
            'total_seats_sold' => $totalSeatsSold
        ]);
    }

    /**
     * Obtener opciones para crear sesiones (Salas y Precios ya definidos).
     */
    public function getCreationOptions()
    {
        $rooms = Room::all();
        $pricings = Pricing::all();

        return response()->json([
            'rooms' => $rooms,
            'pricings' => $pricings
        ]);
    }
    
    /**
     * Obtener todas las sesiones para el panel en tiempo real
     */
    public function getActiveScreenings()
    {
        // Traemos todas las sesiones con sus relaciones útiles
        $screenings = Screening::with(['movie', 'room'])->orderBy('starts_at', 'desc')->get();
        
        $listaFinal = [];
        foreach ($screenings as $sesion) {
            $reservas = Booking::where('screening_id', $sesion->id)->where('status', 'confirmed')->get();
            $asientosOcupados = 0;
            foreach ($reservas as $reserva) {
                $asientosOcupados += count($reserva->seats_id ?? []);
            }
            
            $capacidadTotal = $sesion->room ? $sesion->room->capacity : 0;
            
            $listaFinal[] = [
                'id' => $sesion->id,
                'tmdb_id' => $sesion->movie ? $sesion->movie->tmdb_id : null,
                'starts_at' => $sesion->starts_at,
                'room_name' => $sesion->room ? $sesion->room->name : 'Sala Desconocida',
                'format' => $sesion->format,
                'total_capacity' => $capacidadTotal,
                'seats_sold' => $asientosOcupados
            ];
        }
        
        return response()->json($listaFinal);
    }

    /**
     * Crear una nueva sesión.
     */
    public function storeScreening(Request $request)
    {
        // Validacion super sencilla
        if (!$request->tmdb_id || !$request->room_id || !$request->price_id || !$request->starts_at) {
            return response()->json(['error' => 'Faltan datos requeridos'], 400);
        }

        // Crear o buscar la película local
        $movie = Movie::firstOrCreate(['tmdb_id' => $request->tmdb_id]);

        $screening = Screening::create([
            'movie_id' => $movie->id,
            'room_id' => $request->room_id,
            'price_id' => $request->price_id,
            'starts_at' => $request->starts_at,
            'language' => $request->language ?? 'esp',
            'format' => $request->format ?? '2D'
        ]);

        return response()->json([
            'message' => 'Sesión creada exitosamente',
            'screening' => $screening
        ], 201);
    }
}
