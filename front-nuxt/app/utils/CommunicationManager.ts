// CommunicationManager encapsula y centraliza todas las llamadas al backend de Laravel
// Para hacer peticiones HTTP usamos nuestra propia función 'useApi' (que soluciona el tema Docker vs Navegador)

export const CommunicationManager = {
  
  /**
   * Petición para conseguir el listado entero de películas de inicio
   */
  getPopularMovies() {
    return useApi('/api/movies');
  },

  /**
   * Petición para sacar el detalle gigante de una película concreta (sinopsis larga, duracion, fondo...)
   */
  getMovieById(movieId: string) {
    return useApi(`/api/movies/${movieId}`);
  },

  /**
   * Petición para conseguir todas las sesiones (horarios, precio de sala, asientos libres)
   */
  getScreeningsByMovieId(movieId: string) {
    return useApi(`/api/movies/${movieId}/screenings`);
  }

}
