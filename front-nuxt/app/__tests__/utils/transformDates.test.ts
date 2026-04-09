describe('Transformació de dates per a sessions de cinema', () => {
  // Funcions extretes del component booking/[id].vue

  function formatHour(fechaIso: string): string {
    return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFullDate(fechaIso: string): string {
    return new Date(fechaIso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
  }

  function calcularDiasUnicos(screenings: any[]): any[] {
    const diasVistos: Record<string, boolean> = {}
    const resultado: any[] = []

    for (const sesion of screenings) {
      const fecha = new Date(sesion.hora_inicio)
      const claveIso = fecha.toLocaleDateString('en-CA')

      if (!diasVistos[claveIso]) {
        diasVistos[claveIso] = true
        resultado.push({
          iso: claveIso,
          mes: fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
          dia: fecha.getDate(),
          semana: fecha.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
        })
      }
    }

    return resultado
  }

  function filtrarSessionsPorDia(screenings: any[], diaSeleccionado: string): any[] {
    return screenings.filter(sesion => {
      const fechaSesion = new Date(sesion.hora_inicio).toLocaleDateString('en-CA')
      return fechaSesion === diaSeleccionado
    })
  }

  describe('formatHour', () => {
    it('hauria de formatar hora correctament', () => {
      const result = formatHour('2026-04-08T18:30:00Z')
      expect(result).toContain(':')
    })

    it('hauria de retornar format espanyol (24h)', () => {
      const result = formatHour('2026-04-08T22:00:00Z')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatFullDate', () => {
    it('hauria de retornar data en majúscules', () => {
      const result = formatFullDate('2026-04-08')
      expect(result).toBe(result.toUpperCase())
    })

    it('hauria de contenir el dia de la setmana', () => {
      const result = formatFullDate('2026-04-08')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('calcularDiasUnicos', () => {
    it('hauria de retornar array buit quan no hi ha sessions', () => {
      const result = calcularDiasUnicos([])
      expect(result).toEqual([])
    })

    it('hauria de retornar un sol dia quan totes les sessions son del mateix dia', () => {
      const screenings = [
        { hora_inicio: '2026-04-08T10:00:00Z' },
        { hora_inicio: '2026-04-08T14:00:00Z' },
        { hora_inicio: '2026-04-08T18:00:00Z' }
      ]
      const result = calcularDiasUnicos(screenings)
      expect(result).toHaveLength(1)
      expect(result[0].iso).toBe('2026-04-08')
    })

    it('hauria de retornar múltiples dies quan sessions son de dies diferents', () => {
      const screenings = [
        { hora_inicio: '2026-04-08T18:00:00Z' },
        { hora_inicio: '2026-04-09T18:00:00Z' },
        { hora_inicio: '2026-04-10T18:00:00Z' }
      ]
      const result = calcularDiasUnicos(screenings)
      expect(result).toHaveLength(3)
    })

    it('hauria de retornar objectes amb propietats correctes', () => {
      const screenings = [{ hora_inicio: '2026-04-08T18:00:00Z' }]
      const result = calcularDiasUnicos(screenings)
      expect(result[0]).toHaveProperty('iso')
      expect(result[0]).toHaveProperty('mes')
      expect(result[0]).toHaveProperty('dia')
      expect(result[0]).toHaveProperty('semana')
    })
  })

  describe('filtrarSessionsPorDia', () => {
    const screenings = [
      { id: 1, hora_inicio: '2026-04-08T18:00:00Z' },
      { id: 2, hora_inicio: '2026-04-08T20:00:00Z' },
      { id: 3, hora_inicio: '2026-04-09T18:00:00Z' }
    ]

    it('hauria de filtrar sessions del dia seleccionat', () => {
      const result = filtrarSessionsPorDia(screenings, '2026-04-08')
      expect(result).toHaveLength(2)
    })

    it('hauria de retornar array buit quan cap sessió és del dia', () => {
      const result = filtrarSessionsPorDia(screenings, '2026-04-15')
      expect(result).toHaveLength(0)
    })
  })

  describe('Integració - flux complet de dates', () => {
    it('hauria de funcionar tot el flux de dates', () => {
      const screenings = [
        { id: 1, hora_inicio: '2026-04-08T18:00:00Z' },
        { id: 2, hora_inicio: '2026-04-08T20:00:00Z' },
        { id: 3, hora_inicio: '2026-04-09T18:00:00Z' }
      ]

      const dias = calcularDiasUnicos(screenings)
      expect(dias).toHaveLength(2)

      const sessionsDelPrimerDia = filtrarSessionsPorDia(screenings, dias[0].iso)
      expect(sessionsDelPrimerDia).toHaveLength(2)
    })
  })
})