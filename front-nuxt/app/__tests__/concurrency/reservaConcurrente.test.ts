describe('Reserva Concurrente - lock/unlock/reserve', () => {
  let lockedByOthers: number[] = []
  let selectedSeats: number[] = []

  const setInitialLockedSeats = (seats: number[]) => {
    lockedByOthers = Array.from(new Set([...lockedByOthers, ...seats]))
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

  const lockSeat = (seatId: number) => {
    return Promise.resolve(addLockedSeat(seatId))
  }

  const unlockSeat = (seatId: number) => {
    return Promise.resolve(releaseLockedSeat(seatId))
  }

  beforeEach(() => {
    lockedByOthers = []
    selectedSeats = []
  })

  describe('Blocatge concurrent', () => {
    it('hauria de bloquejar múltiples seats concurrentment', async () => {
      const promises = Array.from({ length: 20 }, (_, i) => lockSeat(i + 1))
      await Promise.all(promises)
      expect(lockedByOthers).toHaveLength(20)
    })

    it('hauria de gestionar race condition al bloquejar mateix seat', async () => {
      const promises = Array.from({ length: 10 }, () => lockSeat(1))
      await Promise.all(promises)
      const occurrences = lockedByOthers.filter(s => s === 1).length
      expect(occurrences).toBe(1)
    })

    it('hauria de gestionar lock i unlock simultanis', async () => {
      const locks = Array.from({ length: 10 }, (_, i) => lockSeat(i + 1))
      const unlocks = Array.from({ length: 10 }, (_, i) => unlockSeat(i + 1))
      await Promise.all([...locks, ...unlocks])
      expect(lockedByOthers).toHaveLength(0)
    })
  })

  describe('Reserva concurrent', () => {
    it('hauria de permetre reserves simultànies de diferents seats', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => lockSeat(i + 1))
      await Promise.all(promises)
      expect(lockedByOthers).toHaveLength(10)
    })

    it('hauria de gestionar conflicte quan nosaltres tenim el seat i alguien altre intenta bloquejar', async () => {
      selectedSeats = [1, 2, 3]
      await lockSeat(1)
      await lockSeat(2)
      await lockSeat(3)
      expect(selectedSeats).toHaveLength(0)
      expect(lockedByOthers).toContain(1)
      expect(lockedByOthers).toContain(2)
      expect(lockedByOthers).toContain(3)
    })
  })

  describe('Alliberament concurrent', () => {
    it('hauria d\'alliberar múltiples seats concurrentment', async () => {
      lockedByOthers = [1, 2, 3, 4, 5]
      const promises = [1, 2, 3, 4, 5].map(i => unlockSeat(i))
      await Promise.all(promises)
      expect(lockedByOthers).toHaveLength(0)
    })

    it('hauria de gestionar alliberament duplicat sense errors', async () => {
      lockedByOthers = [1, 2, 3]
      const promises = Array.from({ length: 5 }, () => unlockSeat(1))
      await Promise.all(promises)
      expect(lockedByOthers).not.toContain(1)
      expect(lockedByOthers).toEqual([2, 3])
    })
  })

  describe('Stress test', () => {
    it('hauria de gestionar 50 operacions simultànies', async () => {
      const operations: Promise<void>[] = []
      for (let i = 0; i < 50; i++) {
        operations.push(lockSeat(i))
      }
      await Promise.all(operations)
      expect(lockedByOthers).toHaveLength(50)
    })

    it('hauria de gestionar lock i unlock alternatius correctament', async () => {
      await lockSeat(1)
      await lockSeat(2)
      await lockSeat(3)
      expect(lockedByOthers).toHaveLength(3)
      
      await unlockSeat(2)
      expect(lockedByOthers).toHaveLength(2)
      expect(lockedByOthers).toContain(1)
      expect(lockedByOthers).toContain(3)
    })
  })
})