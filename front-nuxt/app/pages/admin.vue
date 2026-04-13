<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAdminStore } from '@/stores/useAdminStore'
import { useSwal } from '~/composables/useSwal'

/**
 * ══ ESTADO Y CONFIGURACIÓN ══
 */
const adminStore = useAdminStore()
const runtimeConfig = useRuntimeConfig()
const Swal = useSwal()

// Conexión en tiempo real
let socketInstance: any = null
const idSesionSeleccionadaParaMonitoreo = ref<number | null>(null)

// Estado del buscador y selección de película
const textoBusquedaPelicula = ref('')
const idPeliculaSeleccionada = ref<number | null>(null)
const objetoPeliculaSeleccionada = ref<any>(null)

// Estado de la interfaz de usuario
const estaEnviandoFormulario = ref(false)
const elEnvioFueExitoso = ref(false)

// Datos del formulario de nueva sesión
const formularioNuevaSesion = ref({
  room_id: '',
  price_id: '',
  starts_at: '',
  language: 'esp',
  format: '2D'
})

/**
 * ══ PROPIEDADES COMPUTADAS ══
 */

// Cálculo de asientos que no están vendidos ni bloqueados temporalmente
const asientosLibresActuales = computed(() => {
  const capacidadTotal = adminStore.realTimePanel.totalCapacity
  const asientosVendidos = adminStore.realTimePanel.seatsSold
  const asientosBloqueados = adminStore.realTimePanel.temporarilyLockedSeats
  return capacidadTotal - asientosVendidos - asientosBloqueados
})

// Porcentaje de ocupación de la sala seleccionada
const porcentajeOcupacionReal = computed(() => {
  const capacidadTotal = adminStore.realTimePanel.totalCapacity
  const asientosVendidos = adminStore.realTimePanel.seatsSold
  
  if (capacidadTotal === 0) return 0
  return Math.round((asientosVendidos / capacidadTotal) * 100)
})

// Encuentra la información de la sesión que se está visualizando en el panel
const datosDeLaSesionActiva = computed(() => {
  const listaDeSesiones = adminStore.activeScreenings
  return listaDeSesiones?.find((sesion: any) => sesion.id === idSesionSeleccionadaParaMonitoreo.value)
})

// Busca el objeto de precio seleccionado para mostrar detalles adicionales
const detallePrecioSeleccionado = computed(() => {
  const opcionesDePrecios = (adminStore.creationOptions as any)?.pricings || []
  return opcionesDePrecios.find((precio: any) => precio.id == formularioNuevaSesion.value.price_id)
})

/**
 * ══ CICLO DE VIDA Y COMUNICACIÓN ══
 */

onMounted(async () => {
  // Carga inicial de datos desde el store
  await adminStore.fetchAdminDashboardData()

  // Configuración del servidor de sockets
  const urlServidor = import.meta.client ? runtimeConfig.public.socketUrl : 'http://localhost:3000'
  socketInstance = io(urlServidor)

  // Actualización de asientos bloqueados por otros usuarios en tiempo real
  socketInstance.on('admin_temporales_update', (totalAsientosBloqueados: number) => {
    adminStore.updateTemporarilyLocked(totalAsientosBloqueados)
  })

  // Actualización de asientos vendidos (cuando se confirma una venta)
  socketInstance.on('seats_sold_update', (data: { screening_id: number, seats_count: number }) => {
    if (data.screening_id === idSesionSeleccionadaParaMonitoreo.value) {
      const nuevoTotal = adminStore.realTimePanel.seatsSold + data.seats_count
      adminStore.updateSeatsSold(nuevoTotal)
    }
  })
})

onUnmounted(() => {
  if (socketInstance) {
    socketInstance.disconnect()
  }
})

/**
 * ══ MÉTODOS Y ACCIONES ══
 */

function realizarBusquedaDePelicula() {
  const busquedaLimpia = textoBusquedaPelicula.value.trim()
  if (busquedaLimpia.length > 0) {
    adminStore.searchMovies(busquedaLimpia)
  }
}

function asignarPeliculaASesion(pelicula: any) {
  idPeliculaSeleccionada.value = pelicula.id
  objetoPeliculaSeleccionada.value = pelicula
}

function manejarCambioDePrecio(evento: any) {
  const idSeleccionado = evento.target.value
  const listaPrecios = (adminStore.creationOptions as any)?.pricings || []
  const precioEncontrado = listaPrecios.find((p: any) => p.id == idSeleccionado)
  
  if (precioEncontrado) {
    formularioNuevaSesion.value.format = precioEncontrado.format
  }
}

async function enviarFormularioDeSesion() {
  // Verificación de campos obligatorios
  const camposCompletos = idPeliculaSeleccionada.value && 
                         formularioNuevaSesion.value.room_id && 
                         formularioNuevaSesion.value.price_id && 
                         formularioNuevaSesion.value.starts_at

  if (!camposCompletos) return

  estaEnviandoFormulario.value = true

  if (!idPeliculaSeleccionada.value) return

  const datosParaBackend = {
    tmdb_id: idPeliculaSeleccionada.value.toString(),
    room_id: Number(formularioNuevaSesion.value.room_id),
    price_id: Number(formularioNuevaSesion.value.price_id),
    starts_at: formularioNuevaSesion.value.starts_at,
    language: formularioNuevaSesion.value.language,
    format: formularioNuevaSesion.value.format
  }

  const exito = await adminStore.createScreening(datosParaBackend)
  estaEnviandoFormulario.value = false

  if (exito) {
    elEnvioFueExitoso.value = true
    resetearCamposFormulario()
    
    // El mensaje de éxito desaparece tras unos segundos
    setTimeout(() => { 
      elEnvioFueExitoso.value = false 
    }, 3000)
  } else {
    Swal.error('Error', 'No se pudo crear la sesión. Por favor, revisa los datos.', 'xmark')
  }
}

function resetearCamposFormulario() {
  idPeliculaSeleccionada.value = null
  objetoPeliculaSeleccionada.value = null
  textoBusquedaPelicula.value = ''
  formularioNuevaSesion.value = { 
    room_id: '', 
    price_id: '', 
    starts_at: '', 
    language: 'esp', 
    format: '2D' 
  }
}

function vincularPanelATiempoReal() {
  const id = idSesionSeleccionadaParaMonitoreo.value
  if (id) {
    adminStore.selectScreeningForRealTime(id)
    socketInstance.emit('unirse_admin_sesion', id)
  }
}

function formatearFechaParaUsuario(cadenaFecha: string) {
  const fecha = new Date(cadenaFecha)
  return fecha.toLocaleString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<template>
  <div class="adm-page">

    <header class="adm-header">
      <span class="adm-logo text-label">VMK Cinema Admin</span>
      <nav class="adm-nav">
        <a href="#" class="adm-nav-link text-label adm-nav-active">Dashboard</a>
        <a href="#" class="adm-nav-link text-label">Sesiones</a>
        <a href="#" class="adm-nav-link text-label">Analítica</a>
        <NuxtLink to="/" class="adm-nav-link text-label">← Volver a Cartelera</NuxtLink>
      </nav>
    </header>

    <div class="adm-body container">

      <div class="adm-stats-row">
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Recaudación Total</p>
          <p class="adm-stat-value">
            €{{ Number(adminStore.globalStats?.total_revenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) }}
          </p>
          <p class="adm-stat-sub text-label">Ingresos acumulados hoy</p>
        </div>
        
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Entradas Vendidas</p>
          <p class="adm-stat-value">{{ adminStore.globalStats?.total_seats_sold ?? '0' }}</p>
          <p class="adm-stat-sub text-label">Total de butacas reservadas</p>
        </div>

        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Ocupación Media</p>
          <p class="adm-stat-value">{{ adminStore.globalStats?.occupancy_percentage ?? '0' }}%</p>
          <p class="adm-stat-sub text-label">Rendimiento de todas las salas</p>
        </div>

        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Sesiones Activas</p>
          <p class="adm-stat-value">{{ adminStore.activeScreenings?.length ?? '0' }}</p>
          <p class="adm-stat-sub text-label">En cartelera actualmente</p>
        </div>
      </div>

      <div class="adm-main-grid">

        <section class="adm-section">
          <h2 class="adm-section-title">Panel en Tiempo Real</h2>
          <p class="adm-section-sub text-body">Observa el flujo de ventas y bloqueos de asientos en vivo.</p>

          <div class="adm-field-group">
            <label class="adm-field-label text-label">Seleccionar Sesión para Monitorear</label>
            <div class="adm-select-wrapper">
              <select class="adm-select" v-model="idSesionSeleccionadaParaMonitoreo" @change="vincularPanelATiempoReal">
                <option :value="null">— Selecciona una sesión activa —</option>
                <option v-for="sesion in adminStore.activeScreenings" :key="sesion.id" :value="sesion.id">
                  {{ sesion.room_name }} — {{ sesion.movie_title }} ({{ formatearFechaParaUsuario(sesion.starts_at) }})
                </option>
              </select>
            </div>
          </div>

          <div v-if="datosDeLaSesionActiva" class="adm-live-card">
            <div class="adm-live-header">
              <p class="adm-live-label text-label">Estado de la Sesión</p>
              <div class="adm-live-title-row">
                <span class="adm-live-title">{{ datosDeLaSesionActiva.movie_title }}</span>
                <span class="adm-live-badge text-label">En Directo</span>
              </div>
            </div>

            <div class="adm-live-numbers">
              <div>
                <p class="adm-live-num-label text-label">Ocupación</p>
                <p class="adm-live-num">
                  {{ adminStore.realTimePanel.seatsSold }} /
                  <span class="adm-live-num-total">{{ adminStore.realTimePanel.totalCapacity }}</span>
                </p>
              </div>
              <div class="adm-live-revenue">
                <p class="adm-live-num-label text-label">Ingresos Parciales</p>
                <p class="adm-live-num">€{{ ((datosDeLaSesionActiva.price || 0) * adminStore.realTimePanel.seatsSold).toFixed(2) }}</p>
              </div>
            </div>

            <div class="adm-live-bar-wrap">
              <div class="adm-live-bar-label text-label">
                Tasa de Llenado
                <span>{{ porcentajeOcupacionReal }}%</span>
              </div>
              <div class="adm-progress-track">
                <div class="adm-progress-fill" :style="{ width: porcentajeOcupacionReal + '%' }"></div>
              </div>
            </div>

            <div class="adm-live-indicators">
              <div class="adm-indicator">
                <span class="adm-indicator-dot adm-dot-orange"></span>
                <span class="text-label">Seleccionando Asiento:</span>
                <strong>{{ adminStore.realTimePanel.temporarilyLockedSeats }}</strong>
              </div>
              <div class="adm-indicator">
                <span class="adm-indicator-dot adm-dot-grey"></span>
                <span class="text-label">Disponibles:</span>
                <strong>{{ asientosLibresActuales }}</strong>
              </div>
            </div>
          </div>

          <div v-else class="adm-empty-state">
            <p class="text-label">No hay ninguna sesión seleccionada para el panel en vivo.</p>
          </div>
        </section>

        <section class="adm-section">
          <h2 class="adm-section-title">Crear Nueva Sesión</h2>
          <p class="adm-section-sub text-body">Añade nuevas películas y horarios a la programación.</p>

          <div class="adm-search-box">
            <span class="adm-search-icon">⌕</span>
            <input
              class="adm-search-input"
              type="text"
              v-model="textoBusquedaPelicula"
              placeholder="Buscar título en TMDB..."
              @keyup.enter="realizarBusquedaDePelicula"
            />
          </div>

          <div v-if="adminStore.movieSearchResults?.length > 0" class="adm-movie-grid">
            <div
              v-for="pelicula in adminStore.movieSearchResults.slice(0, 5)"
              :key="pelicula.id"
              class="adm-movie-thumb"
              :class="{ 'adm-movie-thumb-active': idPeliculaSeleccionada === pelicula.id }"
              @click="asignarPeliculaASesion(pelicula)"
            >
              <img
                :src="pelicula.poster_path ? `https://image.tmdb.org/t/p/w200${pelicula.poster_path}` : ''"
                :alt="pelicula.title"
                class="adm-movie-img"
              />
              <p class="adm-movie-label text-label">{{ pelicula.title }}</p>
            </div>
          </div>

          <form v-if="idPeliculaSeleccionada" @submit.prevent="enviarFormularioDeSesion" class="adm-create-form">

            <div class="adm-form-row">
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Sala</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="formularioNuevaSesion.room_id" required>
                    <option value="">Selecciona sala...</option>
                    <option v-for="sala in adminStore.creationOptions?.rooms" :key="sala.id" :value="sala.id">
                      {{ sala.name }} ({{ sala.capacity }} butacas)
                    </option>
                  </select>
                </div>
              </div>
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Formato y Precio</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="formularioNuevaSesion.price_id" required @change="manejarCambioDePrecio">
                    <option value="">Selecciona formato...</option>
                    <option v-for="precio in adminStore.creationOptions?.pricings" :key="precio.id" :value="precio.id">
                      {{ precio.format }} — €{{ precio.price }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="adm-form-row">
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Horario de Inicio</label>
                <input class="adm-input" type="datetime-local" v-model="formularioNuevaSesion.starts_at" required />
              </div>
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Configuración Lingüística</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="formularioNuevaSesion.language" required>
                    <option value="esp">Español (Doblado)</option>
                    <option value="eng">VOSE (Inglés con Subs)</option>
                    <option value="cat">Català (Doblado)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" class="adm-submit-btn text-label" :disabled="estaEnviandoFormulario">
              {{ estaEnviandoFormulario ? 'Procesando...' : 'Confirmar y Guardar →' }}
            </button>

            <p v-if="elEnvioFueExitoso" class="adm-success-msg text-label">✓ La sesión ha sido publicada con éxito.</p>
          </form>

        </section>
      </div>
    </div>

    <footer class="adm-footer">
      <span class="text-label adm-footer-brand">© {{ new Date().getFullYear() }} VMK Cinema Admin Interface.</span>
      <div class="adm-footer-links">
        <a href="#" class="text-label">Privacidad</a>
        <a href="#" class="text-label">Términos legales</a>
        <NuxtLink to="/" class="text-label">Volver a Web Pública</NuxtLink>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* ESTRUCTURA GENERAL 
*/
.adm-page {
  min-height: 100vh;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  display: flex;
  flex-direction: column;
}

.adm-body {
  flex: 1;
  padding-top: var(--spacing-lg);
  padding-bottom: var(--spacing-xl);
}

/* CABECERA 
*/
.adm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  height: 60px;
  background: var(--color-surface-container-lowest);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.adm-logo {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-primary);
}

.adm-nav {
  display: flex;
  gap: var(--spacing-lg);
}

.adm-nav-link {
  text-decoration: none;
  color: var(--color-on-surface-muted);
  font-size: 0.75rem;
  transition: 0.2s color ease;
}

.adm-nav-link:hover {
  color: var(--color-primary);
}

.adm-nav-active {
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-primary);
}

/* TARJETAS DE ESTADÍSTICAS 
*/
.adm-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.adm-stat-card {
  background: var(--color-surface-container-lowest);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-ambient);
}

.adm-stat-label {
  color: var(--color-on-surface-muted);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.adm-stat-value {
  font-family: var(--font-serif);
  font-size: 2.4rem;
  font-weight: 200;
  color: var(--color-primary);
  margin-bottom: 8px;
  line-height: 1;
}

.adm-stat-sub {
  color: var(--color-on-surface-muted);
  font-size: 0.65rem;
}

/* DISEÑO DE CUADRÍCULA PRINCIPAL 
*/
.adm-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--spacing-xl);
  align-items: start;
}

.adm-section-title {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  font-weight: 300;
  font-style: italic;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.adm-section-sub {
  color: var(--color-on-surface-muted);
  margin-bottom: var(--spacing-lg);
  font-size: 0.85rem;
}

/* TARJETA DE TIEMPO REAL (LIVE) 
*/
.adm-live-card {
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-sm);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-ambient);
  margin-top: var(--spacing-md);
}

.adm-live-title {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  font-weight: 400;
  color: var(--color-primary);
}

.adm-live-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.adm-live-numbers {
  display: flex;
  justify-content: space-between;
  margin: var(--spacing-md) 0;
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.adm-live-num {
  font-family: var(--font-serif);
  font-size: 2.2rem;
  font-weight: 300;
  color: var(--color-primary);
}

.adm-live-num-total {
  font-size: 1rem;
  opacity: 0.4;
}

.adm-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  margin-top: 8px;
}

.adm-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.adm-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.adm-dot-orange { background: #e67e22; }
.adm-dot-grey { background: #bdc3c7; }

/* COMPONENTES DE FORMULARIO 
*/
.adm-search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-lg);
}

.adm-search-input {
  border: none;
  background: transparent;
  width: 100%;
  font-size: 0.9rem;
}

.adm-search-input:focus { outline: none; }

.adm-movie-grid {
  display: flex;
  gap: var(--spacing-md);
  overflow-x: auto;
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.adm-movie-thumb {
  width: 120px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.adm-movie-thumb:hover { transform: translateY(-4px); }

.adm-movie-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
}

.adm-movie-thumb-active .adm-movie-img {
  border-color: var(--color-primary);
}

.adm-create-form {
  background: var(--color-surface-container-lowest);
  padding: var(--spacing-lg);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-ambient);
}

.adm-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.adm-input, .adm-select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: var(--radius-sm);
  background: white;
  font-family: var(--font-sans);
}

.adm-submit-btn {
  width: 100%;
  padding: 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  transition: opacity 0.2s;
}

.adm-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* PIE DE PÁGINA 
*/
.adm-footer {
  padding: var(--spacing-lg) var(--spacing-md);
  background: var(--color-surface-container-lowest);
  border-top: 1px solid rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
}

.adm-footer-brand {
  font-size: 0.7rem;
  color: var(--color-on-surface-muted);
}

.adm-footer-links {
  display: flex;
  gap: var(--spacing-md);
}

.adm-footer-links a {
  text-decoration: none;
  font-size: 0.7rem;
  color: var(--color-on-surface-muted);
}
</style>