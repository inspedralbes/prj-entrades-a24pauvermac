describe('useBookingStore - Events Socket.IO (standalone)', () => {
  // Simulem el store directament
  let selectedSeats: number[] = []
  let lockedByOthers: number[] = []
  let clientSecretStripe = ''
  
  const setInitialLockedSeats = (seats: number[]) => {
    lockedByOthers = seats
  }
  
  const addLockedSeat = (seatId: number) => {
    if (lockedByOthers.indexOf(seatId) === -1) {
      lockedByOthers.push(seatId)
    }
    const misVerdes = selectedSeats.indexOf(seatId)
    if (misVerdes > -1) {
      selectedSeats.splice(misVerdes, 1)
    }
  }
  
  const releaseLockedSeat = (seatId: number) => {
    const amarilloLibre = lockedByOthers.indexOf(seatId)
    if (amarilloLibre > -1) {
      lockedByOthers.splice(amarilloLibre, 1)
    }
  }
  
  const clearCart = () => {
    selectedSeats = []
    lockedByOthers = []
    clientSecretStripe = ''
  }

  beforeEach(() => {
    clearCart()
  })

  describe('setInitialLockedSeats', () => {
    it('hauria de carregar estat inicial de seats bloquejats', () => {
      const seatsInicials = [1, 2, 3, 4, 5]
      setInitialLockedSeats(seatsInicials)
      expect(lockedByOthers).toEqual([1, 2, 3, 4, 5])
    })

    it('hauria de substituir estat anterior', () => {
      setInitialLockedSeats([1, 2])
      setInitialLockedSeats([3, 4, 5])
      expect(lockedByOthers).toEqual([3, 4, 5])
    })

    it('hauria de manejar array buit', () => {
      setInitialLockedSeats([])
      expect(lockedByOthers).toEqual([])
    })
  })

  describe('addLockedSeat (asiento_bloqueado_por_otro)', () => {
    it('hauria d\'afegir seat a lockedByOthers', () => {
      addLockedSeat(10)
      expect(lockedByOthers).toContain(10)
    })

    it('no hauria de duplicar seats ja presents', () => {
      addLockedSeat(1)
      addLockedSeat(1)
      const count = lockedByOthers.filter((s: number) => s === 1).length
      expect(count).toBe(1)
    })

    it('hauria d\'afegir múltiples seats diferents', () => {
      addLockedSeat(1)
      addLockedSeat(2)
      addLockedSeat(3)
      expect(lockedByOthers).toHaveLength(3)
    })
  })

  describe('conflicto_asiento - Nos treuen el nostre seat', () => {
    it('hauria de treure seat seleccionat quan altre persona el bloqueja', () => {
      selectedSeats = [1, 2, 3]
      addLockedSeat(2)
      
      expect(selectedSeats).not.toContain(2)
      expect(selectedSeats).toEqual([1, 3])
    })

    it('hauria de mantenir lockedByOthers actualitzat', () => {
      addLockedSeat(2)
      expect(lockedByOthers).toContain(2)
    })

    it('hauria de no afectar altres seats seleccionats', () => {
      selectedSeats = [1, 2, 3, 4]
      addLockedSeat(2)
      
      expect(selectedSeats).toContain(1)
      expect(selectedSeats).toContain(3)
      expect(selectedSeats).toContain(4)
    })
  })

  describe('releaseLockedSeat (asiento_liberado)', () => {
    it('hauria de treure seat de lockedByOthers', () => {
      lockedByOthers = [1, 2, 3]
      releaseLockedSeat(2)
      expect(lockedByOthers).not.toContain(2)
    })

    it('no hauria de generar error si seat no existeix', () => {
      lockedByOthers = [1, 2, 3]
      expect(() => releaseLockedSeat(99)).not.toThrow()
    })

    it('hauria de mantenir altres seats quan treiem un', () => {
      lockedByOthers = [1, 2, 3]
      releaseLockedSeat(2)
      expect(lockedByOthers).toEqual([1, 3])
    })
  })

  describe('Flux complet - Escena tipus', () => {
    it('hauria de simular el flux complet d\'una sessió', () => {
      setInitialLockedSeats([5, 10, 15])
      expect(lockedByOthers).toHaveLength(3)

      selectedSeats = [1, 2]
      expect(selectedSeats).toHaveLength(2)

      addLockedSeat(1)
      expect(selectedSeats).not.toContain(1)
      expect(lockedByOthers).toContain(1)

      releaseLockedSeat(10)
      expect(lockedByOthers).not.toContain(10)

      clearCart()
      expect(selectedSeats).toEqual([])
      expect(lockedByOthers).toEqual([])
    })
  })
})