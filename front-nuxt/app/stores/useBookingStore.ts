import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBookingStore = defineStore('booking', () => {
  // Estado 1: Los asientos que NOSOTROS hemos seleccionado temporalmente (Verdes)
  const selectedSeats = ref<number[]>([])
  
  // Estado 2: Los asientos secuestrados por OTRAS personas en la sala (Amarillos)
  const lockedByOthers = ref<number[]>([])
  
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
  }

  return { 
    selectedSeats, 
    lockedByOthers, 
    totalSeats, 
    toggleSeat, 
    clearCart,
    setInitialLockedSeats,
    addLockedSeat,
    releaseLockedSeat
  }
})
