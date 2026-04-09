describe('Temporitzador de Reserva (5 min = 300 segons)', () => {
  function decrementarTemps(temps: number): number {
    if (temps > 0) return temps - 1
    return 0
  }

  function formatMinuts(temps: number): number {
    return Math.floor(temps / 60)
  }

  function formatSegons(temps: number): number {
    return temps % 60
  }

  function formatSegonsAmbZero(temps: number): string {
    const segons = temps % 60
    return segons < 10 ? '0' + segons : String(segons)
  }

  function tempsExpirat(temps: number): boolean {
    return temps <= 0
  }

  describe('decrementarTemps', () => {
    it('hauria de decrementar en 1 quan temps > 0', () => {
      expect(decrementarTemps(300)).toBe(299)
      expect(decrementarTemps(100)).toBe(99)
      expect(decrementarTemps(1)).toBe(0)
    })

    it('hauria de romandre a 0 quan temps = 0', () => {
      expect(decrementarTemps(0)).toBe(0)
    })

    it('no hauria de ser negatiu', () => {
      const result = decrementarTemps(0)
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('formatMinuts', () => {
    it('hauria de retornar 5 quan 300 segons', () => {
      expect(formatMinuts(300)).toBe(5)
    })

    it('hauria de retornar 4 quan 299 segons', () => {
      expect(formatMinuts(299)).toBe(4)
    })

    it('hauria de retornar 0 quan < 60 segons', () => {
      expect(formatMinuts(59)).toBe(0)
    })
  })

  describe('formatSegons', () => {
    it('hauria de retornar 0 quan 300 segons', () => {
      expect(formatSegons(300)).toBe(0)
    })

    it('hauria de retornar 30 quan 90 segons', () => {
      expect(formatSegons(90)).toBe(30)
    })

    it('hauria de retornar segons directament quan < 60', () => {
      expect(formatSegons(45)).toBe(45)
    })
  })

  describe('formatSegonsAmbZero', () => {
    it('hauria d\'afegir 0 quan segons < 10', () => {
      expect(formatSegonsAmbZero(5)).toBe('05')
      expect(formatSegonsAmbZero(9)).toBe('09')
    })

    it('hauria de retornar sense 0 quan segons >= 10', () => {
      expect(formatSegonsAmbZero(10)).toBe('10')
      expect(formatSegonsAmbZero(59)).toBe('59')
    })
  })

  describe('tempsExpirat', () => {
    it('hauria de retornar true quan temps <= 0', () => {
      expect(tempsExpirat(0)).toBe(true)
      expect(tempsExpirat(-1)).toBe(true)
    })

    it('hauria de retornar false quan temps > 0', () => {
      expect(tempsExpirat(1)).toBe(false)
      expect(tempsExpirat(300)).toBe(false)
    })
  })

  describe('Integració - format complet', () => {
    it('hauria de formatar 305 segons com 5:05', () => {
      const minuts = formatMinuts(305)
      const segons = formatSegonsAmbZero(305)
      expect(minuts).toBe(5)
      expect(segons).toBe('05')
    })

    it('hauria de formatar 125 segons com 2:05', () => {
      const minuts = formatMinuts(125)
      const segons = formatSegonsAmbZero(125)
      expect(minuts).toBe(2)
      expect(segons).toBe('05')
    })
  })
})