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

    /**
     * Obtener las sesiones de una película con asientos calculados
     */
    public function getScreeningsByMovie($id)
    {
        // 1. El $id que nos manda Nuxt es el de TMDB (ej: 83533). Tenemos que buscar nuestra película local.
        $pelicula = \App\Models\Movie::where('tmdb_id', $id)->first();

        $listaFinal = array();

        // Si la película no existe en nuestra base de datos (nadie ha programado sesiones), devolvemos array vacío
        if ($pelicula == null) {
            return response()->json($listaFinal);
        }

        // 2. Buscamos todas las sesiones de esta pelicula usando el ID real interno de Laravel ($pelicula->id)
        $sesiones = \App\Models\Screening::where('movie_id', $pelicula->id)->get();

        foreach ($sesiones as $sesion) {
            // 2. Buscamos que sala es y cuanta capacidad total tiene
            $sala = \App\Models\Room::find($sesion->room_id);
            $capacidadTotal = $sala->capacity;

            // 3. Buscamos el precio para mandarlo tambien
            $precio = \App\Models\Pricing::find($sesion->price_id);

            // 4. Usamos el accessor del modelo Screening para obtener los asientos ocupados
            // La logica de conteo vive en Screening::getOccupiedSeatsAttribute(), no repetimos codigo aqui
            $asientosOcupados = $sesion->occupied_seats;

            // 5. Resta simple
            $asientosDisponibles = $capacidadTotal - $asientosOcupados;

            // 6. Agrupamos los datos limpios para evitar mandar campos basura a Nuxt
            $datosLimpios = array(
                'id' => $sesion->id,
                'hora_inicio' => $sesion->starts_at,
                'idioma' => $sesion->language,
                'formato' => $sesion->format,
                'precio' => $precio->price,
                'sala_nombre' => $sala->name,
                'capacidad_total' => $capacidadTotal,
                'asientos_disponibles' => $asientosDisponibles
            );

            array_push($listaFinal, $datosLimpios);
        }

        return response()->json($listaFinal);
    }
}
