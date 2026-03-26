<?php

namespace App\Http\Controllers;

use App\Services\MovieService;
use Illuminate\Http\Request;

class MovieController extends Controller
{
    protected $movieService;

    // Laravel inyecta automáticamente el Service aquí
    public function __construct(MovieService $movieService)
    {
        $this->movieService = $movieService;
    }

    /**
     * Obtener una lista de películas populares.
     */
    public function index()
    {
        $movies = $this->movieService->getPopularMovies();
        
        return response()->json($movies);
    }

    /**
     * Obtener detalles de una película específica.
     */
    public function show($id)
    {
        $movie = $this->movieService->getMovieById($id);
        
        return response()->json($movie);
    }

    /**
     * Buscar películas por nombre.
     */
    public function search(Request $request)
    {
        $query = $request->query('query');
        
        if (!$query) {
            return response()->json(['error' => 'No query provided'], 400);
        }

        $movies = $this->movieService->searchMovies($query);
        
        return response()->json($movies);
    }
}
