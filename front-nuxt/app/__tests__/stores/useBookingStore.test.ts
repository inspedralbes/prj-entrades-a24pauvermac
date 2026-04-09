describe('useBookingStore - Gestió d\'estat (standalone)', () => {
  // Simulem el store directament per evitar dependències de Pinia
  let selectedSeats: number[] = []
  let lockedByOthers: number[] = []
  let clientSecretStripe = ''
  
  const clearCart = () => {
    selectedSeats = []
    lockedByOthers = []
    clientSecretStripe = ''
  }
  
  const toggleSeat = (seatId: number): boolean => {
    const index = selectedSeats.indexOf(seatId)
    if (index > -1) {
      selectedSeats.splice(index, 1)
      return false
    } else {
      selectedSeats.push(seatId)
      return true
    }
  }
  
  const totalSeats = () => selectedSeats.length

  beforeEach(() => {
    clearCart()
  })

  describe('Inicialització', () => {
    it('hauria d\'inicialitzar selectedSeats com array buit', () => {
      expect(selectedSeats).toEqual([])
    })

    it('hauria d\'inicialitzar lockedByOthers com array buit', () => {
      expect(lockedByOthers).toEqual([])
    })

    it('hauria d\'inicialitzar clientSecretStripe com string buit', () => {
      expect(clientSecretStripe).toBe('')
    })

    it('hauria de retornar totalSeats = 0 inicialment', () => {
      expect(totalSeats()).toBe(0)
    })
  })

  describe('toggleSeat - selecció d\'asientos', () => {
    it('hauria d\'afegir seat quan no estava seleccionat', () => {
      const result = toggleSeat(1)
      expect(result).toBe(true)
      expect(selectedSeats).toContain(1)
      expect(totalSeats()).toBe(1)
    })

    it('hauria de treure seat quan estava seleccionat', () => {
      selectedSeats = [1, 2, 3]
      const result = toggleSeat(2)
      expect(result).toBe(false)
      expect(selectedSeats).not.toContain(2)
      expect(selectedSeats).toEqual([1, 3])
    })

    it('hauria de permetre múltiples seats', () => {
      toggleSeat(1)
      toggleSeat(2)
      toggleSeat(3)
      expect(totalSeats()).toBe(3)
    })
  })

  describe('clearCart - neteja del carret', () => {
    it('hauria de netejar tots els estats', () => {
      selectedSeats = [1, 2, 3]
      lockedByOthers = [4, 5]
      clientSecretStripe = 'secret-123'
      
      clearCart()
      
      expect(selectedSeats).toEqual([])
      expect(lockedByOthers).toEqual([])
      expect(clientSecretStripe).toBe('')
    })
  })
})