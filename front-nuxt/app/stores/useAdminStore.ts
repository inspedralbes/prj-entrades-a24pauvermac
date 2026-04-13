import { defineStore } from 'pinia'
import { CommunicationManager } from '@/utils/CommunicationManager' // Usamos nuestro backend/proxy

export const useAdminStore = defineStore('admin', {
  state: () => ({
    // Estadisticas globales
    globalStats: {
      total_revenue: 0,
      occupancy_percentage: 0,
      sales_by_type: {} as Record<string, number>,
      total_seats_sold: 0
    },
    
    // Opciones para el formulario de crear sesión
    creationOptions: {
      rooms: [] as any[],
      pricings: [] as any[]
    },
    
    // Listado de sesiones activas (para el panel en vivo)
    activeScreenings: [] as any[],
    
    // Estado de la sesion en tiempo real que el admin esta mirando
    realTimePanel: {
      selectedScreeningId: null as number | null,
      temporarilyLockedSeats: 0,
      totalCapacity: 0,
      seatsSold: 0
    },
    
    // Resultados de la busqueda TMDB
    movieSearchResults: [] as any[]
  }),

  actions: {
    /**
     * Cargar todos los datos base del admin
     */
    async fetchAdminDashboardData() {
      try {
        // Cargar stats
        const stats = await CommunicationManager.getAdminGlobalStats();
        if (stats) this.globalStats = stats as any;

        // Cargar opciones
        const optionsData = await CommunicationManager.getAdminCreationOptions();
        if (optionsData) {
           this.creationOptions = optionsData as any;
        }

        // Cargar sesiones
        await this.fetchActiveScreenings();
      } catch (err) {
        console.error("Error al cargar datos del dashboard de admin", err);
      }
    },

    /**
     * Buscar películas en TMDB
     */
    async searchMovies(query: string) {
      try {
        const data = await CommunicationManager.searchMoviesProxy(query);
        if (data && (data as any).results) {
          this.movieSearchResults = (data as any).results;
        }
      } catch (err) {
        console.error("Error buscando peliculas", err);
      }
    },

    /**
     * Refrescar sólo la lista de sesiones
     */
    async fetchActiveScreenings() {
      try {
        const screenings = await CommunicationManager.getAdminActiveScreenings();
        if (screenings) {
          this.activeScreenings = screenings as any[];
        }
      } catch (err) {
        console.error("Error al cargar sesiones activas", err);
      }
    },

    /**
     * Crear una nueva sesión
     */
    async createScreening(form: { tmdb_id: string, room_id: number, price_id: number, starts_at: string, language: string, format: string }) {
      try {
        await CommunicationManager.createScreening(form);
        // Despues de crear, recargamos la lista de sesiones
        await this.fetchActiveScreenings();
        return true;
      } catch (err) {
        console.error("Error creando sesion", err);
        return false;
      }
    },

    /**
     * Actualiza el contador de bloqueados temporales (mandado por Sockets)
     */
    updateTemporarilyLocked(count: number) {
      this.realTimePanel.temporarilyLockedSeats = count;
    },

    /**
     * Actualiza el contador de asientos vendidos (mandado por Sockets cuando hay venta confirmada)
     */
    updateSeatsSold(count: number) {
      this.realTimePanel.seatsSold = count;
    },

    /**
     * Cambiar la sesion que estamos observando en el panel "en vivo"
     */
    selectScreeningForRealTime(screeningId: number) {
      this.realTimePanel.selectedScreeningId = screeningId;
      
      // Buscamos sus datos basicos en nuestro array
      const sesion = this.activeScreenings.find(s => s.id === screeningId);
      if (sesion) {
        this.realTimePanel.totalCapacity = sesion.total_capacity;
        this.realTimePanel.seatsSold = sesion.seats_sold;
      }
    }
  }
})
