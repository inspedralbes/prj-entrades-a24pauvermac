<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBookingStore } from '~/stores/useBookingStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { loadStripe } from '@stripe/stripe-js'
import { useSwal } from '~/composables/useSwal'

// 1. Invocamos nuestro plugin secreto .client ("walkie talkie" hacia Node)
const nuxtApp = useNuxtApp()
const $socket = nuxtApp.$socket
const Swal = useSwal()

const route = useRoute()
const movieId = route.params.id

const { data: screenings, pending } = await CommunicationManager.getScreeningsByMovieId(movieId)

const gestorDeReservas = useBookingStore()
const sesionSeleccionada = ref(null)
const entradasSeleccionadas = ref(1)

const pasoActual = ref(1)

// ======================= NUEVAS VARIABLES PARA EL DISEÑO =======================

// URL del poster de la sesión seleccionada (lo cargamos desde TMDB)
const posterUrl = ref(null)

// Día seleccionado en las pastillas de fecha (en formato ISO: "2026-04-14")
const diaSeleccionado = ref(null)

// Lista de días únicos disponibles (calculada a partir de las sesiones)
const diasUnicos = computed(() => {
  if (!screenings.value) return []

  const diasVistos = {}
  const resultado = []

  for (const sesion of screenings.value) {
    const fecha = new Date(sesion.hora_inicio)
    // Creamos una clave única por día (solo fecha, sin hora)
    const claveIso = fecha.toLocaleDateString('en-CA') // formato 2026-04-14

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
})

// Seleccionamos el primer día disponible automáticamente cuando carguen las sesiones
watch(diasUnicos, (nuevaLista) => {
  if (nuevaLista.length > 0 && !diaSeleccionado.value) {
    diaSeleccionado.value = nuevaLista[0].iso
  }
}, { immediate: true })

// Las sesiones filtradas por el día activo en las pastillas
const sesionesDeDiaSeleccionado = computed(() => {
  if (!screenings.value || !diaSeleccionado.value) return []

  return screenings.value.filter(sesion => {
    const fechaSesion = new Date(sesion.hora_inicio).toLocaleDateString('en-CA')
    return fechaSesion === diaSeleccionado.value
  })
})

// Cuando el usuario elige una sesión, cargamos su poster desde TMDB
watch(sesionSeleccionada, async (sesion) => {
  if (!sesion) {
    posterUrl.value = null
    return
  }
  // Usamos el proxy de Laravel para buscar por el tmdb_id de la película
  try {
    const datos = await CommunicationManager.getMovieById(movieId)
    if (datos?.data?.value?.poster_path) {
      posterUrl.value = 'https://image.tmdb.org/t/p/w300' + datos.data.value.poster_path
    }
  } catch (e) {
    posterUrl.value = null
  }
})

// Funciones de formato de fecha y hora para la UI
function formatHour(fechaIso) {
  return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
}

// ======================= FASE 3 WEBSOCKETS =======================

const router = useRouter()

function irAlPasoDeAsientos() {
  const authStore = useAuthStore()
  
  // Verificar autenticación antes de pasar a selección de asientos
  if (!authStore.isLoggedIn) {
    const currentPath = route.fullPath
    router.push({ path: '/login', query: { redirect: currentPath } })
    return
  }
  
  pasoActual.value = 2

  // FALTABA ESTO: Inyectamos los que ya estaban fijos en MySQL (ej: los del seeder)
  if (sesionSeleccionada.value?.asientos_ocupados_db) {
    gestorDeReservas.lockedByOthers = [...sesionSeleccionada.value.asientos_ocupados_db]
  }

  if ($socket) {
    $socket.emit('unirse_a_sesion', sesionSeleccionada.value.id)
  }
}

function volverAlFormulario() {
  pasoActual.value = 1
  gestorDeReservas.clearCart()

  if ($socket) { $socket.emit('liberar_asiento', { screening_id: sesionSeleccionada.value.id, asiento_id: -1 }) }
}

const HEARTBEAT_INTERVAL_MS = 30000
let intervaloHeartbeat = null

function iniciarHeartbeat() {
  if (intervaloHeartbeat) return

  intervaloHeartbeat = setInterval(() => {
    const misAsientos = gestorDeReservas.selectedSeats
    if (misAsientos.length === 0) return

    if ($socket && sesionSeleccionada.value) {
      for (const asiento_id of misAsientos) {
        $socket.emit('heartbeat_asiento', {
          screening_id: sesionSeleccionada.value.id,
          asiento_id
        })
      }
    }
  }, HEARTBEAT_INTERVAL_MS)
}

function detenerHeartbeat() {
  if (intervaloHeartbeat) {
    clearInterval(intervaloHeartbeat)
    intervaloHeartbeat = null
  }
}

onMounted(() => {
  if (!$socket) return

  $socket.on('estado_inicial_asientos', (listaSillasAmarillas) => {
    gestorDeReservas.setInitialLockedSeats(listaSillasAmarillas)
  })

  $socket.on('conflicto_asiento', (asiento_id) => {
    Swal.warning('Asiento no disponible', 'Este asiento acaba de ser reservado por otro cliente.', 'userLock')
    gestorDeReservas.addLockedSeat(asiento_id)
  })

  $socket.on('asiento_bloqueado_por_otro', (asiento_id) => {
    gestorDeReservas.addLockedSeat(asiento_id)
  })

  $socket.on('asiento_liberado', (asiento_id) => {
    gestorDeReservas.releaseLockedSeat(asiento_id)
  })

  iniciarHeartbeat()
})

onUnmounted(() => {
  if ($socket) {
    $socket.off('estado_inicial_asientos')
    $socket.off('conflicto_asiento')
    $socket.off('asiento_bloqueado_por_otro')
    $socket.off('asiento_liberado')
  }
  detenerHeartbeat()
  gestorDeReservas.clearCart()
})

// =================================================================

const mapaDeAsientos = computed(() => {
  if (sesionSeleccionada.value == null) return []

  let capacidadMaxima = sesionSeleccionada.value.capacidad_total
  let mapaFinal = []
  let numeroAsientoGlobal = 1
  let idLetraFila = 65
  let asientosPorFila = 16

  while (numeroAsientoGlobal <= capacidadMaxima) {
    let nuevaFila = { letra: String.fromCharCode(idLetraFila), asientos: [] }

    for (let asientoSuelto = 1; asientoSuelto <= asientosPorFila; asientoSuelto++) {
      if (numeroAsientoGlobal > capacidadMaxima) break

      let infoAsiento = { id: numeroAsientoGlobal, numero: asientoSuelto, esPasilloInterno: false }

      if (asientoSuelto === 4 || asientoSuelto === 12) {
        infoAsiento.esPasilloInterno = true
      }

      nuevaFila.asientos.push(infoAsiento)
      numeroAsientoGlobal = numeroAsientoGlobal + 1
    }

    mapaFinal.push(nuevaFila)
    idLetraFila = idLetraFila + 1
  }
  return mapaFinal.reverse()
})

function hacerClicEnAsiento(asiento_id) {
  if (esAsientoOcultoOdeOtro(asiento_id)) return

  const yaEstabaVerde = esAsientoSeleccionado(asiento_id)

  if (yaEstabaVerde === false && gestorDeReservas.totalSeats >= entradasSeleccionadas.value) {
    Swal.warning('Limite alcanzado', `Solo has pagado por ${entradasSeleccionadas.value} entradas. Deselecciona algún asiento primero.`, 'warning')
    return
  }

  const seQuedoVerdeOSeQuedoGris = gestorDeReservas.toggleSeat(asiento_id)

  if ($socket) {
    if (seQuedoVerdeOSeQuedoGris === true) {
      $socket.emit('bloquear_asiento', { screening_id: sesionSeleccionada.value.id, asiento_id: asiento_id })
    } else {
      $socket.emit('liberar_asiento', { screening_id: sesionSeleccionada.value.id, asiento_id: asiento_id })
    }
  }
}

function esAsientoSeleccionado(asiento_id) {
  return gestorDeReservas.selectedSeats.indexOf(asiento_id) > -1
}

function esAsientoOcultoOdeOtro(asiento_id) {
  return gestorDeReservas.lockedByOthers.indexOf(asiento_id) > -1
}

function calcularMaximoEntradas(sesion) {
  if (sesion == null) return 0
  let limite = 10
  if (sesion.asientos_disponibles < limite) {
    limite = sesion.asientos_disponibles
  }
  return limite
}

// ======================= STRIPE Y TEMPORIZADOR =======================
const procesandoPago = ref(false)
const mostrarPasarelaStripe = ref(false)
let instanciaStripe = null
let elementosStripe = null

const tiempoRestante = ref(300)
let intervaloTemporizador = null

const minutosFormateados = computed(() => Math.floor(tiempoRestante.value / 60))
const segundosFormateados = computed(() => {
  const segs = tiempoRestante.value % 60
  return segs < 10 ? '0' + segs : segs
})

function iniciarTemporizador() {
  tiempoRestante.value = 300
  intervaloTemporizador = setInterval(() => {
    if (tiempoRestante.value > 0) {
      tiempoRestante.value--
    } else {
      detenerTemporizador()
      Swal.warning('Tiempo agotado', 'El tiempo de reserva (5 min) ha expirado. Hemos liberado tus butacas para otros clientes.', 'clock')
      mostrarPasarelaStripe.value = false
      volverAlFormulario()
    }
  }, 1000)
}

function detenerTemporizador() {
  if (intervaloTemporizador) {
    clearInterval(intervaloTemporizador)
    intervaloTemporizador = null
  }
}

async function iniciarProcesoDePago() {
  procesandoPago.value = true

  const backendNosDioPermiso = await gestorDeReservas.prepararPagoConStripe(sesionSeleccionada.value.precio)

  if (backendNosDioPermiso) {
    mostrarPasarelaStripe.value = true
    iniciarTemporizador()

    instanciaStripe = await loadStripe('pk_test_51TH2YZFmdx0FAxJfQUEEKa3vWkVtUFCrUB9SjwCo3uZ4Bg2UNBaNTIaQYKPVpf5iYCPBWytlKCY3pt0kx4MYmGxy00UNN9uxqb')

    setTimeout(() => {
      elementosStripe = instanciaStripe.elements({ clientSecret: gestorDeReservas.clientSecretStripe })
      const formularioTarjeta = elementosStripe.create('payment')
      formularioTarjeta.mount('#pasarela-stripe-contenedor')
    }, 200)
  } else {
    Swal.error('Error', 'El backend no nos dio autorización para abrir la pasarela de pago.', 'xmark')
  }

  procesandoPago.value = false
}

const ticketUrl = ref('')
const reservationCode = ref('')
const showTicketModal = ref(false)

async function generarTicket() {
  const bookingData = {
    screening_id: sesionSeleccionada.value.id,
    seats: gestorDeReservas.selectedSeats,
    total_price: sesionSeleccionada.value.precio * entradasSeleccionadas.value
  }

  const { data, error } = await CommunicationManager.generateTicket(bookingData)

  if (error.value) {
    Swal.error('Error al generar ticket', 'Error al generar el ticket: ' + (error.value?.data?.message || 'Error desconocido'), 'xmark')
    return
  }

  const respuesta = data.value
  if (respuesta.success) {
    ticketUrl.value = respuesta.pdf_url
    reservationCode.value = respuesta.reservation_code
    showTicketModal.value = true
  }
}

async function confirmarElPagoFinal() {
  procesandoPago.value = true

  const resultadoDeStripe = await instanciaStripe.confirmPayment({
    elements: elementosStripe,
    redirect: 'if_required'
  })

  if (resultadoDeStripe.error) {
    Swal.error('Error de pago', 'Stripe ha rechazado la operación: ' + resultadoDeStripe.error.message, 'creditCard')
    procesandoPago.value = false
  } else {
    detenerTemporizador()
    Swal.success('Pago realizado', 'Tu pago ha sido procesado con éxito. Las entradas son tuyas.', 'check')
    mostrarPasarelaStripe.value = false
    procesandoPago.value = false
    
    // Generar el ticket PDF
    await generarTicket()
    
    gestorDeReservas.clearCart()
    pasoActual.value = 1
  }
}

function cerrarTicketModal() {
  showTicketModal.value = false
  ticketUrl.value = ''
  reservationCode.value = ''
}

function cancelarPagoManualmente() {
  detenerTemporizador()
  mostrarPasarelaStripe.value = false
}
</script>

<template>
  <div class="booking-container">

    <div v-if="pending" class="status">Cargando sesiones...</div>

    <div v-else-if="!screenings || screenings.length === 0" class="status">
      No hay sesiones programadas para esta película actualmente.
    </div>

    <!-- ======================= PASO 1 ========================== -->
    <div v-else-if="pasoActual === 1" class="session-layout">

      <!-- COLUMNA IZQUIERDA -->
      <div class="session-left">

        <div class="session-eyebrow text-label">
          <NuxtLink to="/" class="link-back">← Cartelera</NuxtLink>
          &nbsp;/&nbsp; Fase 01 — Selección &amp; Capacidad
        </div>

        <h1 class="session-heading">SESSION</h1>

        <!-- SELECTOR DE FECHA -->
        <div class="block-section">
          <p class="block-label text-label">Selecciona Fecha</p>
          <div class="date-pills">
            <button
              v-for="dia in diasUnicos"
              :key="dia.iso"
              class="date-pill"
              :class="{ active: diaSeleccionado === dia.iso }"
              @click="diaSeleccionado = dia.iso"
            >
              <span class="date-pill-month">{{ dia.mes }}</span>
              <span class="date-pill-day">{{ dia.dia }}</span>
              <span class="date-pill-weekday">{{ dia.semana }}</span>
            </button>
          </div>
        </div>

        <!-- SELECTOR DE HORA -->
        <div class="block-section">
          <p class="block-label text-label">Horario &amp; Disponibilidad</p>
          <div class="time-grid">
            <div
              v-for="sesion in sesionesDeDiaSeleccionado"
              :key="sesion.id"
              class="time-slot"
              :class="{
                selected: sesionSeleccionada?.id === sesion.id,
                'sold-out': sesion.asientos_disponibles === 0
              }"
              @click="sesion.asientos_disponibles > 0 && (sesionSeleccionada = sesion)"
            >
              <span class="time-slot-hour">{{ formatHour(sesion.hora_inicio) }}</span>
              <span class="time-slot-status text-label">
                {{ sesion.asientos_disponibles === 0 ? 'Agotado' : sesionSeleccionada?.id === sesion.id ? 'Seleccionado' : 'Disponible' }}
              </span>
            </div>
          </div>
        </div>

        <!-- TICKETS -->
        <div class="block-section" v-if="sesionSeleccionada">
          <p class="block-label text-label">Entradas</p>
          <div class="ticket-row">
            <div class="ticket-info">
              <span class="ticket-type">Adulto</span>
              <span class="ticket-subtype text-label">Entrada estándar</span>
            </div>
            <div class="ticket-counter">
              <button class="counter-btn" @click="entradasSeleccionadas > 1 && entradasSeleccionadas--">−</button>
              <span class="counter-value">{{ entradasSeleccionadas }}</span>
              <button class="counter-btn" @click="entradasSeleccionadas < calcularMaximoEntradas(sesionSeleccionada) && entradasSeleccionadas++">+</button>
            </div>
          </div>
        </div>

      </div>

      <!-- COLUMNA DERECHA -->
      <div class="session-right" v-if="sesionSeleccionada">
        <div class="summary-card">
          <img v-if="posterUrl" :src="posterUrl" alt="Poster" class="summary-poster" />
          <div class="summary-movie-title">{{ sesionSeleccionada.sala_nombre }}</div>
          <div class="summary-director text-label">{{ sesionSeleccionada.formato }} · {{ sesionSeleccionada.idioma?.toUpperCase() }}</div>
          <div class="summary-divider"></div>
          <ul class="summary-list">
            <li class="summary-item">
              <span class="text-label">Fecha</span>
              <span>{{ formatFullDate(sesionSeleccionada.hora_inicio) }}</span>
            </li>
            <li class="summary-item">
              <span class="text-label">Hora</span>
              <span>{{ formatHour(sesionSeleccionada.hora_inicio) }}</span>
            </li>
            <li class="summary-item">
              <span class="text-label">Entradas</span>
              <span>{{ entradasSeleccionadas }} Adulto</span>
            </li>
          </ul>
          <div class="summary-divider"></div>
          <div class="summary-total">
            <span class="text-label">Total</span>
            <span class="summary-price">{{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }} €</span>
          </div>
          <button class="btn-cta" :disabled="sesionSeleccionada.asientos_disponibles === 0" @click="irAlPasoDeAsientos">
            Continuar a la selección
          </button>
          <p class="summary-fine-print text-label">Tasas y reservas incluidas al pagar. Todas las condiciones son finales.</p>
        </div>
      </div>
      <div class="session-right" v-else>
        <div class="summary-card summary-empty">
          <p class="text-label">Selecciona una fecha y hora para ver el resumen.</p>
        </div>
      </div>

    </div>

    <!-- ======================= PASO 2: ASIENTOS ========================== -->
    <div class="sala-container" v-if="pasoActual === 2">
      <div class="sala-header">
        <button @click="volverAlFormulario" class="link-back-dark text-label">← Volver a sesión</button>
        <h2 class="session-heading session-heading-white">ASIENTOS</h2>
        <p class="text-label sala-counter-label">
          Selecciona {{ entradasSeleccionadas }} asiento(s) &nbsp;·&nbsp;
          Llevas: <strong class="sala-counter-strong">{{ gestorDeReservas.totalSeats }} / {{ entradasSeleccionadas }}</strong>
        </p>
      </div>

      <div class="grid-asientos">
        <div class="fila" v-for="fila in mapaDeAsientos" :key="fila.letra">
          <div class="letra-fila">{{ fila.letra }}</div>
          <div class="asientos-wrapper">
            <div
              v-for="asiento in fila.asientos"
              :key="asiento.id"
              class="contenedor-asiento"
              :class="{ 'con-pasillo': asiento.esPasilloInterno }"
            >
              <FontAwesomeIcon
                :icon="['fas', 'couch']"
                class="icono-asiento"
                :class="{
                  seleccionado: esAsientoSeleccionado(asiento.id),
                  'en-espera': esAsientoOcultoOdeOtro(asiento.id)
                }"
                @click="hacerClicEnAsiento(asiento.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="pantalla-cine">Pantalla</div>

      <div class="leyenda">
        <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-seleccionado" /> Míos</div>
        <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-espera" /> Reservando</div>
        <div class="item-leyenda"><FontAwesomeIcon :icon="['fas', 'couch']" class="ley-disponible" /> Libre</div>
      </div>

      <button
        class="btn-cta sala-cta"
        :disabled="gestorDeReservas.totalSeats !== entradasSeleccionadas || procesandoPago"
        @click="iniciarProcesoDePago"
      >
        {{ procesandoPago ? 'Conectando con Stripe...' : `Confirmar y pagar — ${(sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2)}€` }}
      </button>
    </div>

    <!-- ======================= MODAL STRIPE ========================== -->
    <div class="modal-stripe-fondo" v-if="mostrarPasarelaStripe">
      <div class="modal-stripe-contenido">
        <h2 class="session-heading" style="font-size: 1.8rem; margin-bottom: 4px;">PAGO</h2>
        <p class="text-label" style="margin-bottom: 16px; color: var(--color-on-surface-muted);">Modo de prueba · Stripe Sandbox</p>
        <div class="temporizador-alerta text-label">
          Tiempo restante: <strong>{{ minutosFormateados }}:{{ segundosFormateados }}</strong>
        </div>
        <p class="text-body" style="margin: 16px 0;">
          Total a cobrar: <strong>{{ (sesionSeleccionada.precio * entradasSeleccionadas).toFixed(2) }}€</strong>
        </p>
        <div id="pasarela-stripe-contenedor" class="contenedor-caja-fuerte"></div>
        <div class="modal-botones">
          <button class="btn-secondary" @click="cancelarPagoManualmente" :disabled="procesandoPago">Cancelar</button>
          <button class="btn-cta modal-pay-btn" @click="confirmarElPagoFinal" :disabled="procesandoPago">
            {{ procesandoPago ? 'Procesando...' : 'Pagar ahora' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================= MODAL TICKET ========================== -->
    <div class="modal-ticket-fondo" v-if="showTicketModal">
      <div class="modal-ticket-contenido">
        <h2 class="session-heading" style="font-size: 1.8rem; margin-bottom: 8px;">¡Entrada comprada!</h2>
        <p class="text-body" style="margin-bottom: 16px;">Tu reserva ha sido confirmada.</p>
        
        <div class="ticket-info-box">
          <p class="text-label" style="margin-bottom: 8px;">Código de reserva:</p>
          <p class="reservation-code-display">{{ reservationCode }}</p>
        </div>

        <div class="modal-ticket-botones">
          <a :href="ticketUrl" target="_blank" class="btn-cta">
            Ver / Descargar entrada
          </a>
          <button class="btn-secondary" @click="cerrarTicketModal">
            Cerrar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.booking-container {
  min-height: 100vh;
  background-color: var(--color-surface);
  padding: var(--spacing-lg) var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
}

.session-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--spacing-xl);
  align-items: start;
}

.session-eyebrow { color: var(--color-on-surface-muted); margin-bottom: var(--spacing-md); }

.link-back {
  color: var(--color-on-surface-muted);
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0;
  transition: color 0.2s;
}
.link-back:hover { color: var(--color-primary); }

.link-back-dark {
  color: rgba(255,255,255,0.4);
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
}
.link-back-dark:hover { color: white; }

.session-heading {
  font-family: var(--font-serif);
  font-size: 6rem;
  font-weight: 300;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 1;
  margin: var(--spacing-sm) 0 var(--spacing-lg) 0;
}
.session-heading-white { color: white; font-size: 3rem; }

.block-section { margin-bottom: var(--spacing-lg); }
.block-label { color: var(--color-on-surface-muted); margin-bottom: var(--spacing-sm); }

/* DATE PILLS */
.date-pills { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.date-pill {
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 16px; min-width: 64px;
  border: 1px solid rgba(26,26,26,0.15);
  border-radius: var(--radius-sm);
  background: var(--color-surface-container-lowest);
  cursor: pointer; transition: all 0.2s;
}
.date-pill:hover { border-color: var(--color-primary); }
.date-pill.active { background: var(--color-primary); border-color: var(--color-primary); color: white; }
.date-pill-month { font-family: var(--font-sans); font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
.date-pill-day { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 300; line-height: 1; margin: 2px 0; }
.date-pill-weekday { font-family: var(--font-sans); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }

/* TIME SLOTS */
.time-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-sm); }
.time-slot {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(26,26,26,0.1);
  border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.2s;
}
.time-slot:hover:not(.sold-out) { border-color: var(--color-primary); }
.time-slot.selected { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.time-slot.sold-out { background: var(--color-surface-container-low); cursor: not-allowed; opacity: 0.45; }
.time-slot-hour { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 300; }
.time-slot-status { font-size: 0.65rem; }
.time-slot.selected .time-slot-status { color: rgba(255,255,255,0.7); }

/* TICKET COUNTER */
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; border-bottom: 1px solid rgba(26,26,26,0.08); }
.ticket-info { display: flex; flex-direction: column; gap: 4px; }
.ticket-type { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 300; }
.ticket-subtype { color: var(--color-on-surface-muted); font-size: 0.7rem; }
.ticket-counter { display: flex; align-items: center; gap: var(--spacing-sm); }
.counter-btn {
  width: 28px; height: 28px; background: none;
  border: 1px solid var(--color-on-surface);
  border-radius: 50%; cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; line-height: 1;
}
.counter-btn:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.counter-value { font-family: var(--font-serif); font-size: 1.4rem; font-weight: 300; min-width: 24px; text-align: center; }

/* SUMMARY CARD */
.session-right { position: sticky; top: var(--spacing-lg); }
.summary-card { background: var(--color-primary); color: white; padding: var(--spacing-lg); border-radius: var(--radius-sm); box-shadow: var(--shadow-ambient); }
.summary-empty { background: var(--color-surface-container-low); color: var(--color-on-surface-muted); min-height: 300px; display: flex; align-items: center; justify-content: center; text-align: center; }
.summary-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--spacing-md); display: block; }
.summary-movie-title { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 300; color: white; line-height: 1.2; margin-bottom: 4px; }
.summary-director { color: rgba(255,255,255,0.5); font-size: 0.7rem; margin-bottom: var(--spacing-md); }
.summary-divider { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: var(--spacing-md) 0; }
.summary-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.summary-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
.summary-item .text-label { color: rgba(255,255,255,0.5); font-size: 0.65rem; }
.summary-total { display: flex; justify-content: space-between; align-items: center; }
.summary-total .text-label { color: rgba(255,255,255,0.5); font-size: 0.65rem; }
.summary-price { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 300; }
.summary-fine-print { color: rgba(255,255,255,0.35); font-size: 0.6rem; text-align: center; margin-top: var(--spacing-sm); line-height: 1.5; }

.btn-cta {
  display: block; width: 100%; margin-top: var(--spacing-md);
  padding: 14px var(--spacing-md);
  background: white; color: var(--color-primary);
  border: none; border-radius: var(--radius-sm);
  font-family: var(--font-sans); font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  cursor: pointer; transition: opacity 0.2s;
}
.btn-cta:hover:not(:disabled) { opacity: 0.85; }
.btn-cta:disabled { opacity: 0.35; cursor: not-allowed; }

/* PASO 2: SALA */
.sala-container { padding: var(--spacing-lg) var(--spacing-md); background: #111; border-radius: var(--radius-sm); text-align: center; color: white; }
.sala-header { margin-bottom: var(--spacing-lg); }
.sala-counter-label { color: rgba(255,255,255,0.45); }
.sala-counter-strong { color: white; }

.grid-asientos { display: flex; flex-direction: column; gap: 12px; }
.fila { display: flex; align-items: center; justify-content: center; gap: 12px; }
.letra-fila { color: #444; font-weight: bold; width: 20px; font-size: 0.8rem; }
.asientos-wrapper { display: flex; gap: 6px; }
.contenedor-asiento { display: flex; }
.con-pasillo { margin-right: 36px; }
.icono-asiento { font-size: 1.5rem; color: #2e2e2e; cursor: pointer; transition: transform 0.1s, color 0.1s; }
.icono-asiento:hover { transform: translateY(-3px); color: #666; }
.icono-asiento.seleccionado { color: #e8e8e8; }
.icono-asiento.en-espera { color: #555; pointer-events: none; }

.pantalla-cine { margin: var(--spacing-lg) auto 0; padding: 8px; border-top: 2px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.25); letter-spacing: 3px; font-family: var(--font-sans); font-size: 0.7rem; text-transform: uppercase; width: 50%; }
.leyenda { display: flex; justify-content: center; gap: var(--spacing-md); margin-top: var(--spacing-lg); font-size: 0.8rem; color: rgba(255,255,255,0.4); }
.item-leyenda { display: flex; align-items: center; gap: 8px; }
.ley-seleccionado { color: #e8e8e8; }
.ley-disponible   { color: #2e2e2e; }
.ley-espera       { color: #555; }
.sala-cta { max-width: 400px; margin: var(--spacing-lg) auto 0; }

/* MODAL STRIPE */
.modal-stripe-fondo { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(6px); }
.modal-stripe-contenido { background: var(--color-surface-container-lowest); padding: var(--spacing-lg); border-radius: var(--radius-sm); width: 460px; color: var(--color-on-surface); box-shadow: 0 40px 80px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto; }
.temporizador-alerta { background: var(--color-surface-container-low); padding: 10px var(--spacing-md); border-radius: var(--radius-sm); text-align: center; margin-bottom: var(--spacing-sm); font-size: 0.75rem; color: var(--color-on-surface-muted); }
.contenedor-caja-fuerte { min-height: 220px; padding: var(--spacing-sm) 0; }
.modal-botones { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md); align-items: stretch; }
.modal-pay-btn { background: var(--color-primary); color: white; margin-top: 0; flex: 1; }

/* MODAL TICKET */
.modal-ticket-fondo { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(6px); }
.modal-ticket-contenido { background: var(--color-surface-container-lowest); padding: var(--spacing-lg); border-radius: var(--radius-sm); width: 400px; color: var(--color-on-surface); box-shadow: 0 40px 80px rgba(0,0,0,0.25); text-align: center; }
.ticket-info-box { background: var(--color-surface-container-low); padding: var(--spacing-md); border-radius: var(--radius-sm); margin: var(--spacing-md) 0; }
.reservation-code-display { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 600; letter-spacing: 2px; color: var(--color-primary); }
.modal-ticket-botones { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.modal-ticket-botones .btn-cta { margin-top: 0; }
</style>
