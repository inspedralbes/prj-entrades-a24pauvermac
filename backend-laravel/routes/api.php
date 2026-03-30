<?php

use App\Http\Controllers\MovieController;
use Illuminate\Support\Facades\Route;

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
