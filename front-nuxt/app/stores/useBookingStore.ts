import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBookingStore = defineStore('booking', () => {
  // Estado: guardamos los asientos seleccionados
  const selectedSeats = ref<number[]>([])
  
  // Getter: Número de asientos seleccionados
  const totalSeats = computed(() => selectedSeats.value.length)
  
  // Acciones: Función de clic (agregar/quitar asiento)
  function toggleSeat(seatId: number) {
    const index = selectedSeats.value.indexOf(seatId)
    if (index > -1) {
      selectedSeats.value.splice(index, 1)
    } else {
      selectedSeats.value.push(seatId)
    }
  }

  function clearCart() {
    selectedSeats.value = []
  }

  return { selectedSeats, totalSeats, toggleSeat, clearCart }
})
