<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MovieService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.tmdb.base_url');
        $this->apiKey = config('services.tmdb.api_key');
    }

    public function getPopularMovies()
    {
        $response = Http::get("{$this->baseUrl}/movie/popular", [
            'api_key' => $this->apiKey,
            'language' => 'es-ES',
            'page' => 1
        ]);

        return $response->json();
    }

    public function getMovieById($id)
    {
        $response = Http::get("{$this->baseUrl}/movie/{$id}", [
            'api_key' => $this->apiKey,
            'language' => 'es-ES',
            'append_to_response' => 'videos,credits,images'
        ]);

        return $response->json();
    }

    public function searchMovies($query)
    {
        $response = Http::get("{$this->baseUrl}/search/movie", [
            'api_key' => $this->apiKey,
            'language' => 'es-ES',
            'query' => $query
        ]);

        return $response->json();
    }
}