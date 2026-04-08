<?php

use App\Http\Controllers\MovieController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\TicketController;
use Illuminate\Support\Facades\Route;

// ── AUTENTICACIÓN ──────────────────────────────────────────────
// Rutas públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/refresh',  [AuthController::class, 'refresh']);

// Rutas protegidas por JWT
Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
    
    // Rutas para tickets (protegidas, requieren autenticación)
    Route::post('/tickets/generate', [TicketController::class, 'generate']);
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Obtener películas populares
Route::get('/movies', [MovieController::class, 'index']);

// Buscar películas
Route::get('/movies/search', [MovieController::class, 'search']);

// Obtener una película específica (por ID)
Route::get('/movies/{id}', [MovieController::class, 'show']);

// Obtener las sesiones y asientos de una película
Route::get('/movies/{id}/screenings', [MovieController::class, 'getScreeningsByMovie']);

// Rutas para la pasarela de pago (Stripe)
Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);

// Rutas de Administrador
use App\Http\Controllers\AdminController;

Route::prefix('admin')->group(function () {
    Route::get('/stats', [AdminController::class, 'getGlobalStats']);
    Route::get('/options', [AdminController::class, 'getCreationOptions']);
    Route::get('/screenings', [AdminController::class, 'getActiveScreenings']);
    Route::post('/screenings', [AdminController::class, 'storeScreening']);
});
