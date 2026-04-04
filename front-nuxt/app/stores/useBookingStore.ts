import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBookingStore = defineStore('booking', () => {
  // Estado 1: Los asientos que NOSOTROS hemos seleccionado temporalmente (Verdes)
  const selectedSeats = ref<number[]>([])
  
  // Estado 2: Los asientos secuestrados por OTRAS personas en la sala (Amarillos)
  const lockedByOthers = ref<number[]>([])
  
  // Estado 3: El Secreto del Cliente proporcionado por Stripe (necesario para la pasarela confirmada en el frontend)
  const clientSecretStripe = ref<string>('')
  
  // Getter
  const totalSeats = computed(() => selectedSeats.value.length)
  
  // Modificar nuestros asientos
  function toggleSeat(seatId: number) {
    const index = selectedSeats.value.indexOf(seatId)
    if (index > -1) {
      selectedSeats.value.splice(index, 1)
      return false // Devolvemos 'false' para avisar que se desvinculó (gris libre)
    } else {
      selectedSeats.value.push(seatId)
      return true // Devolvemos 'true' para indicar que se ató a nosotros temporalmente
    }
  }

  // --- NUEVAS FUNCIONES DE WEBSOCKET (TIEMPO REAL) ---
  
  // Para cargar el golpe inicial de la base de datos de RAM de Node.js
  function setInitialLockedSeats(seats: number[]) {
    lockedByOthers.value = seats;
  }

  // Cuando otra persona pulsa una silla y recibimos la onda de choque en nuestra consola
  function addLockedSeat(seatId: number) {
    if (lockedByOthers.value.indexOf(seatId) === -1) {
      lockedByOthers.value.push(seatId);
    }

    // SI LA SILLA AMARILLA ERA NUESTRA, SIGNIFICA QUE Node.js NOS ACABA DE GRITAR "¡HAY CONFLICTO, QUÍTATELA!"
    const misVerdes = selectedSeats.value.indexOf(seatId);
    if (misVerdes > -1) {
      selectedSeats.value.splice(misVerdes, 1);
    }
  }

  // Cuando otra persona libera una silla que estaba amarrilla
  function releaseLockedSeat(seatId: number) {
    const amarilloLibre = lockedByOthers.value.indexOf(seatId);
    if (amarilloLibre > -1) {
      lockedByOthers.value.splice(amarilloLibre, 1);
    }
  }

  function clearCart() {
    selectedSeats.value = []
    lockedByOthers.value = [] // Por seguridad y limpieza de caché cuando se retrocede
    clientSecretStripe.value = '' // Limpiar el secreto de Stripe por seguridad
  }

  // --- NUEVAS FUNCIONES PARA STRIPE ---
  
  /**
   * Esta función calcula el precio final de las butacas, llama explícitamente
   * al backend de Laravel a través de CommunicationManager y guarda el secreto de Stripe
   */
  async function prepararPagoConStripe(precioPorEntrada: number) {
    const cantidadTotal = totalSeats.value * precioPorEntrada;
    
    if (cantidadTotal <= 0) {
      console.error("Stripe Error: No se puede pagar una cantidad de 0 o menor.");
      return false;
    }

    try {
      // Llamamos explícitamente a nuestra función del CommunicationManager (que usa useFetch por debajo)
      const { data, error } = await CommunicationManager.solicitarIntencionDePagoStripe(cantidadTotal);
      
      if (error.value) {
         console.error("Error devuelto por el servidor HTTP al crear la intención de pago:", error.value);
         return false; // Fracaso
      }

      // Extraemos la respuesta real del envoltorio reactivo data.value
      const datos: any = data.value;

      // La respuesta viene con un campo 'clientSecret' que necesitamos guardar en este store
      if (datos && datos.clientSecret) {
         clientSecretStripe.value = datos.clientSecret;
         console.log("El Secreto de Stripe se obtuvo correctamente del Backend.");
         return true; // Éxito
      } else {
         console.error("El backend no devolvió un client secret válido.", datos);
         return false; // Fracaso
      }
    } catch (err) {
      console.error("Error de código al preparar la conexión con nuestro Laravel/Stripe:", err);
      return false; // Fracaso
    }
  }

  return { 
    selectedSeats, 
    lockedByOthers,
    clientSecretStripe, // Exponemos para que el Frontend lo use en Phase 3
    totalSeats, 
    toggleSeat, 
    clearCart,
    setInitialLockedSeats,
    addLockedSeat,
    releaseLockedSeat,
    prepararPagoConStripe // Exponemos para que el botón "Comprar" lo inicie
  }
})
