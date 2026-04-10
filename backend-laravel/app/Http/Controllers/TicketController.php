<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\Screening;
use App\Models\Seat;
use App\Models\User;
use App\Services\MovieService;
use Tymon\JWTAuth\Facades\JWTAuth;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    protected $movieService;

    public function __construct(MovieService $movieService)
    {
        $this->movieService = $movieService;
    }
    /**
     * Genera un ticket PDF después de un pago exitoso.
     * 
     * Recibe del frontend:
     * - screening_id: ID de la sesión
     * - seats: array de IDs de asientos
     * - total_price: precio total de la reserva
     * - user_id: ID del usuario (del token)
     */
    public function generate(Request $request)
    {
        try {
            // Validar datos recibidos
            $validated = $request->validate([
                'screening_id' => 'required|integer|exists:screenings,id',
                'seats' => 'required|array|min:1',
                'seats.*' => 'integer|exists:seats,id',
                'total_price' => 'required|numeric|min:0',
            ]);

            // Obtener el usuario autenticado desde el token
            $user = JWTAuth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener la sesión (screening) con sus relaciones
            $screening = Screening::with(['movie', 'room', 'pricing'])->find($validated['screening_id']);

            if (!$screening) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sesión no encontrada'
                ], 404);
            }

            // Obtener el título de la película desde TMDB usando el tmdb_id
            $movieTitle = 'Película';
            $posterUrl = null;
            try {
                $movieData = $this->movieService->getMovieById($screening->movie->tmdb_id);
                if (isset($movieData['title']) && !empty($movieData['title'])) {
                    $movieTitle = $movieData['title'];
                }
                if (isset($movieData['poster_path']) && !empty($movieData['poster_path'])) {
                    $posterUrl = 'https://image.tmdb.org/t/p/w300' . $movieData['poster_path'];
                }
            } catch (\Exception $e) {
                // Si falla, usamos el valor por defecto
            }

            // Obtener información de los asientos
            $seatsData = Seat::whereIn('id', $validated['seats'])->get();
            
            // Formatear datos de asientos para la plantilla
            $seats = $seatsData->map(function ($seat) {
                return [
                    'row' => $seat->row,
                    'number' => $seat->number,
                ];
            })->toArray();

            // Generar códigos únicos
            $reservationCode = strtoupper(Str::uuid()->toString());
            $barcode = $this->generateFakeBarcode();

            // Formatear fecha y hora
            $date = $screening->starts_at->format('d \d\e F \d\e Y');
            $time = $screening->starts_at->format('H:i');

            // Datos para la plantilla
            $data = [
                'movieTitle' => $movieTitle,
                'posterUrl' => $posterUrl,
                'date' => $date,
                'time' => $time,
                'room' => $screening->room->name ?? 'Sala',
                'format' => $screening->format ?? '2D',
                'language' => strtoupper($screening->language ?? 'ES'),
                'ticketCount' => count($seats),
                'seats' => $seats,
                'buyerName' => $user->name,
                'barcode' => $barcode,
                'reservationCode' => $reservationCode,
                'totalPrice' => number_format($validated['total_price'], 2),
            ];

            // Generar el PDF con soporte para imágenes externas
            $pdf = Pdf::loadView('tickets.ticket', $data)
                      ->setOptions(['isRemoteEnabled' => true]);

            // Nombre del archivo: reservation_code.pdf
            $filename = $reservationCode . '.pdf';

            // Guardar en storage/app/public/tickets/
            $path = 'tickets/' . $filename;
            Storage::disk('public')->put($path, $pdf->output());

            // Crear el registro de booking
            $booking = Booking::create([
                'user_id' => $user->id,
                'screening_id' => $screening->id,
                'total_price' => $validated['total_price'],
                'status' => 'confirmed',
                'seats_id' => $validated['seats'],
                'reservation_code' => $reservationCode,
            ]);

            // Devolver la URL del PDF
            $pdfUrl = asset('storage/' . $path);

            return response()->json([
                'success' => true,
                'pdf_url' => $pdfUrl,
                'reservation_code' => $reservationCode,
                'booking_id' => $booking->id,
            ], 200);

        } catch (\Exception $error) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el ticket: ' . $error->getMessage()
            ], 500);
        }
    }

    /**
     * Genera un código de barras falso (estético)
     */
    private function generateFakeBarcode()
    {
        // Generar una serie de números aleatorios para efecto visual
        $barcode = '';
        for ($i = 0; $i < 12; $i++) {
            $barcode .= rand(0, 9);
        }
        return $barcode;
    }
}