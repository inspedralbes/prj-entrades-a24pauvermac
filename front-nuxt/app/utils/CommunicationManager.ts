// CommunicationManager encapsula y centraliza todas las llamadas al backend de Laravel

// ─────────────────────────────────────────────────────────────────────
// fetchApi: helper para llamadas bajo demanda (clics, acciones del usuario).
// - Resuelve la URL base correcta según Docker vs Navegador
// - Inyecta automáticamente el header Authorization si hay token JWT
// - Si recibe un 401, intenta renovar el token UNA vez y reintenta la petición
// ─────────────────────────────────────────────────────────────────────
async function fetchApi(url: string, opciones: Record<string, any> = {}) {
  const config  = useRuntimeConfig()
  const baseURL = import.meta.client ? config.public.apiBase : config.apiUrlInternal

  // Obtenemos el token del store o directamente de localStorage como fallback
  const getToken = (): string | null => {
    if (import.meta.client) {
      return localStorage.getItem('access_token')
    }
    return null
  }

  // Construimos los headers con Authorization si hay token disponible
  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
      ...(opciones.headers || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const token = getToken()

  try {
    return await $fetch(url, {
      baseURL,
      ...opciones,
      headers: buildHeaders(token),
    })
  } catch (err: any) {
    // Si recibimos 401 (token expirado), intentamos renovarlo UNA vez
    if (err?.status === 401 && token && import.meta.client) {
      try {
        // Llamamos al endpoint de refresh con el token actual
        const respuesta: any = await $fetch('/api/refresh', {
          baseURL,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })

        const nuevoToken = respuesta?.access_token
        if (!nuevoToken) throw new Error('Sin token en la respuesta de refresh')

        // Guardamos el nuevo token
        localStorage.setItem('access_token', nuevoToken)

        // Actualizamos el store de Pinia si está disponible
        try {
          const { useAuthStore } = await import('~/stores/useAuthStore')
          const authStore = useAuthStore()
          authStore.accessToken = nuevoToken
        } catch { /* El store puede no estar disponible en todos los contextos */ }

        // Reintentamos la petición original con el token renovado
        return await $fetch(url, {
          baseURL,
          ...opciones,
          headers: buildHeaders(nuevoToken),
        })
      } catch {
        // Si el refresh también falla, limpiamos la sesión y redirigimos al login
        if (import.meta.client) {
          localStorage.removeItem('access_token')
          navigateTo('/login')
        }
        throw err
      }
    }
    throw err
  }
}

export const CommunicationManager = {

  // ─────────────────────────────────────────────────────────────────
  // PELÍCULAS (públicas, sin auth)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Listado de películas populares para la pantalla de inicio
   */
  getPopularMovies() {
    return useApi('/api/movies')
  },

  /**
   * Detalle completo de una película concreta (sinopsis, backdrop, créditos...)
   */
  getMovieById(movieId: string) {
    return useApi(`/api/movies/${movieId}`)
  },

  /**
   * Sesiones programadas con disponibilidad de asientos para una película
   */
  getScreeningsByMovieId(movieId: string) {
    return useApi(`/api/movies/${movieId}/screenings`)
  },

  // ─────────────────────────────────────────────────────────────────
  // PAGO (requiere sesión activa — envía token automáticamente)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Solicita a Laravel la creación de un PaymentIntent de Stripe.
   * Envía el token JWT en el header para identificar al usuario.
   */
  async solicitarIntencionDePagoStripe(cantidadTotal: number) {
    try {
      const respuestaData = await fetchApi('/api/create-payment-intent', {
        method: 'POST',
        body: { amount: cantidadTotal },
      })
      return { data: { value: respuestaData }, error: { value: null } }
    } catch (err) {
      return { data: { value: null }, error: { value: err } }
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // ADMINISTRADOR (rutas protegidas — token inyectado automáticamente)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Buscar películas en TMDB a través del proxy de Laravel
   */
  searchMoviesProxy(query: string) {
    return fetchApi(`/api/movies/search?query=${query}`)
  },

  /**
   * Opciones de salas y precios disponibles para crear sesiones
   */
  getAdminCreationOptions() {
    return fetchApi('/api/admin/options')
  },

  /**
   * Lista de sesiones activas con ocupación para el panel de admin
   */
  getAdminActiveScreenings() {
    return fetchApi('/api/admin/screenings')
  },

  /**
   * Crear una nueva sesión en la cartelera
   */
  createScreening(data: { tmdb_id: string, room_id: number, price_id: number, starts_at: string, language: string, format: string }) {
    return fetchApi('/api/admin/screenings', { method: 'POST', body: data })
  },

  /**
   * Estadísticas globales del panel de administración
   */
  getAdminGlobalStats() {
    return fetchApi('/api/admin/stats')
  },

  // ─────────────────────────────────────────────────────────────────
  // TICKETS (requiere sesión activa)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Genera un ticket PDF después de un pago exitoso.
   * Devuelve la URL del PDF para descargar/ver.
   */
  async generateTicket(bookingData: { screening_id: number, seats: number[], total_price: number }) {
    try {
      const respuestaData = await fetchApi('/api/tickets/generate', {
        method: 'POST',
        body: bookingData,
      })
      return { data: { value: respuestaData }, error: { value: null } }
    } catch (err) {
      return { data: { value: null }, error: { value: err } }
    }
  },

}
