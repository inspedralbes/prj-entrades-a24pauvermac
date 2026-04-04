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
  },

  /**
   * Función explícita para solicitar a Stripe (a través de nuestro Laravel) la intención de pago
   * @param cantidadTotal La cantidad de dinero a cobrar (en euros)
   */
  async solicitarIntencionDePagoStripe(cantidadTotal: number) {
    // Cuando hacemos una petición a raíz de un "Click" de un botón (fuera del setup inicial), 
    // Nuxt 3 requiere usar $fetch en lugar de useFetch. useFetch pierde su URL base si no es carga de página.
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;

    try {
      const respuestaData = await $fetch('/api/create-payment-intent', {
        baseURL: baseURL,
        method: 'POST',
        body: {
          amount: cantidadTotal
        }
      });
      
      // Envolvemos la respuesta para que el UseBookingStore no se rompa (que espera .data.value)
      return { data: { value: respuestaData }, error: { value: null } };
    } catch (err) {
      return { data: { value: null }, error: { value: err } };
    }
  },

  // ----------------------------------------------------
  // MÉTODOS DE ADMINISTRADOR
  // ----------------------------------------------------

  /**
   * Petición para buscar películas en TMDB desde nuestro propio buscador
   */
  searchMoviesProxy(query: string) {
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;
    return $fetch(`/api/movies/search?query=${query}`, { baseURL });
  },

  /**
   * Obtiene las opciones de Salas y Precios pre-creados para el admin
   */
  getAdminCreationOptions() {
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;
    return $fetch('/api/admin/options', { baseURL });
  },

  /**
   * Obtiene la lista de sesiones activas con el número de asientos vendidos y total
   */
  getAdminActiveScreenings() {
    // Usamos $fetch directo para evitar problemas de caché con botones
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;
    return $fetch('/api/admin/screenings', { baseURL });
  },

  /**
   * Crea una sesión en base de datos mandando la petición pura a Laravel
   */
  createScreening(data: { tmdb_id: string, room_id: number, price_id: number, starts_at: string, language: string, format: string }) {
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;
    
    return $fetch('/api/admin/screenings', {
      baseURL: baseURL,
      method: 'POST',
      body: data
    });
  },

  /**
   * Petición para obtener las estadísticas globales del panel
   */
  getAdminGlobalStats() {
    const config = useRuntimeConfig();
    const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal;
    return $fetch('/api/admin/stats', { baseURL });
  }

}
