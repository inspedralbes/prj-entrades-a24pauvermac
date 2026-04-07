<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAdminStore } from '@/stores/useAdminStore'
import { io } from 'socket.io-client'

// Solo admins autenticados pueden acceder a esta página
definePageMeta({ middleware: 'auth' })

const adminStore = useAdminStore()
const config = useRuntimeConfig()

let socket: any = null
const selectedScreeningId = ref<number | null>(null)

const movieQuery = ref('')
const selectedMovieId = ref<number | null>(null)
const selectedMovie = ref<any>(null)
const isSubmitting = ref(false)
const submitSuccess = ref(false)

const form = ref({
  room_id: '',
  price_id: '',
  starts_at: '',
  language: 'esp',
  format: '2D'
})

// Asientos libres en tiempo real
const freeSeats = computed(() => {
  const tot  = adminStore.realTimePanel.totalCapacity
  const sold = adminStore.realTimePanel.seatsSold
  const temp = adminStore.realTimePanel.temporarilyLockedSeats
  return tot - sold - temp
})

const fillRate = computed(() => {
  const tot  = adminStore.realTimePanel.totalCapacity
  const sold = adminStore.realTimePanel.seatsSold
  if (!tot) return 0
  return Math.round((sold / tot) * 100)
})

// Sesión seleccionada en el panel en tiempo real
const sesionActiva = computed(() =>
  adminStore.activeScreenings?.find((s: any) => s.id === selectedScreeningId.value)
)

// Precio seleccionado (para mostrar en el resumen del formulario)
const precioSeleccionado = computed(() => {
  const pricings = (adminStore.creationOptions as any)?.pricings || []
  return pricings.find((p: any) => p.id == form.value.price_id)
})

onMounted(async () => {
  await adminStore.fetchAdminDashboardData()

  const socketUrl = import.meta.client ? config.public.socketUrl : 'http://localhost:3000'
  socket = io(socketUrl)

  socket.on('admin_temporales_update', (totalTemp: number) => {
    adminStore.updateTemporarilyLocked(totalTemp)
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})

function searchMovie() {
  if (movieQuery.value.trim()) {
    adminStore.searchMovies(movieQuery.value)
  }
}

function selectMovie(movie: any) {
  selectedMovieId.value = movie.id
  selectedMovie.value = movie
}

function onPriceSelected(event: any) {
  const priceId = event.target.value
  const pricings = (adminStore.creationOptions as any)?.pricings || []
  const found = pricings.find((p: any) => p.id == priceId)
  if (found) form.value.format = found.format
}

async function submitScreening() {
  if (!selectedMovieId.value || !form.value.room_id || !form.value.price_id || !form.value.starts_at) return

  isSubmitting.value = true
  const payload = {
    tmdb_id: selectedMovieId.value.toString(),
    room_id: Number(form.value.room_id),
    price_id: Number(form.value.price_id),
    starts_at: form.value.starts_at,
    language: form.value.language,
    format: form.value.format
  }

  const success = await adminStore.createScreening(payload)
  isSubmitting.value = false

  if (success) {
    submitSuccess.value = true
    selectedMovieId.value = null
    selectedMovie.value = null
    movieQuery.value = ''
    form.value = { room_id: '', price_id: '', starts_at: '', language: 'esp', format: '2D' }
    setTimeout(() => { submitSuccess.value = false }, 3000)
  } else {
    alert('Hubo un error al crear la sesión.')
  }
}

function onScreeningSelected() {
  if (selectedScreeningId.value) {
    adminStore.selectScreeningForRealTime(selectedScreeningId.value)
    socket.emit('unirse_admin_sesion', selectedScreeningId.value)
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="adm-page">

    <!-- ══ HEADER ══ -->
    <header class="adm-header">
      <span class="adm-logo text-label">UT·Cinema Admin</span>
      <nav class="adm-nav">
        <a href="#" class="adm-nav-link text-label adm-nav-active">Dashboard</a>
        <a href="#" class="adm-nav-link text-label">Sesiones</a>
        <a href="#" class="adm-nav-link text-label">Analítica</a>
        <NuxtLink to="/" class="adm-nav-link text-label">← Cartelera</NuxtLink>
      </nav>
    </header>

    <div class="adm-body container">

      <!-- ══ STATS ROW ══ -->
      <div class="adm-stats-row">
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Recaudación Total</p>
          <p class="adm-stat-value">
            €{{ Number(adminStore.globalStats?.total_revenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) }}
          </p>
          <p class="adm-stat-sub text-label">Ingresos acumulados</p>
        </div>
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Entradas Vendidas</p>
          <p class="adm-stat-value">{{ adminStore.globalStats?.total_seats_sold ?? '—' }}</p>
          <p class="adm-stat-sub text-label">Total de reservas</p>
        </div>
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Ocupación Global</p>
          <p class="adm-stat-value">{{ adminStore.globalStats?.occupancy_percentage ?? '—' }}%</p>
          <p class="adm-stat-sub text-label">Media de todas las salas</p>
        </div>
        <div class="adm-stat-card">
          <p class="adm-stat-label text-label">Sesiones Activas</p>
          <p class="adm-stat-value">{{ adminStore.activeScreenings?.length ?? '—' }}</p>
          <p class="adm-stat-sub text-label">En programación hoy</p>
        </div>
      </div>

      <!-- ══ MAIN GRID ══ -->
      <div class="adm-main-grid">

        <!-- COLUMNA IZQUIERDA: Panel Tiempo Real -->
        <section class="adm-section">
          <h2 class="adm-section-title">Panel en Tiempo Real</h2>
          <p class="adm-section-sub text-body">
            Monitoreo directo de la afluencia y rendimiento de la sesión actual.
          </p>

          <!-- Selector de sesión -->
          <div class="adm-field-group">
            <label class="adm-field-label text-label">Seleccionar Sesión Activa</label>
            <div class="adm-select-wrapper">
              <select class="adm-select" v-model="selectedScreeningId" @change="onScreeningSelected">
                <option :value="null">— Selecciona una sesión —</option>
                <option v-for="s in adminStore.activeScreenings" :key="s.id" :value="s.id">
                  {{ s.room_name }} — {{ s.movie_title || 'Sesión #' + s.id }} ({{ formatDate(s.starts_at) }})
                </option>
              </select>
            </div>
          </div>

          <!-- Panel en vivo -->
          <div v-if="sesionActiva" class="adm-live-card">
            <div class="adm-live-header">
              <p class="adm-live-label text-label">Progreso de la Sesión</p>
              <div class="adm-live-title-row">
                <span class="adm-live-title">{{ sesionActiva.movie_title || sesionActiva.room_name }}</span>
                <span class="adm-live-badge text-label">En Curso</span>
              </div>
            </div>

            <div class="adm-live-numbers">
              <div>
                <p class="adm-live-num-label text-label">Asientos<br>Ocupados</p>
                <p class="adm-live-num">
                  {{ adminStore.realTimePanel.seatsSold }} /
                  <span class="adm-live-num-total">{{ adminStore.realTimePanel.totalCapacity }}</span>
                </p>
              </div>
              <div class="adm-live-revenue">
                <p class="adm-live-num-label text-label">Venta Bruta</p>
                <p class="adm-live-num">€{{ ((sesionActiva.price || 0) * adminStore.realTimePanel.seatsSold).toFixed(2) }}</p>
              </div>
            </div>

            <!-- Barra de llenado -->
            <div class="adm-live-bar-wrap">
              <div class="adm-live-bar-label text-label">
                Tasa de Llenado
                <span>{{ fillRate }}%</span>
              </div>
              <div class="adm-progress-track">
                <div class="adm-progress-fill" :style="{ width: fillRate + '%' }"></div>
              </div>
            </div>

            <!-- Indicadores adicionales -->
            <div class="adm-live-indicators">
              <div class="adm-indicator">
                <span class="adm-indicator-dot adm-dot-orange"></span>
                <span class="text-label">En Proceso</span>
                <strong>{{ adminStore.realTimePanel.temporarilyLockedSeats }}</strong>
              </div>
              <div class="adm-indicator">
                <span class="adm-indicator-dot adm-dot-grey"></span>
                <span class="text-label">Libres</span>
                <strong>{{ freeSeats }}</strong>
              </div>
            </div>
          </div>

          <div v-else class="adm-empty-state">
            <p class="text-label">Selecciona una sesión para ver sus datos en tiempo real.</p>
          </div>
        </section>

        <!-- COLUMNA DERECHA: Crear Sesión -->
        <section class="adm-section">
          <h2 class="adm-section-title">Crear Nueva Sesión</h2>
          <p class="adm-section-sub text-body">
            Gestión de la cartelera y asignación de horarios para proyecciones futuras.
          </p>

          <!-- Buscador TMDB -->
          <div class="adm-search-box">
            <span class="adm-search-icon">⌕</span>
            <input
              class="adm-search-input"
              type="text"
              v-model="movieQuery"
              placeholder="Buscar película en TMDB..."
              @keyup.enter="searchMovie"
            />
          </div>

          <!-- Resultados de búsqueda -->
          <div v-if="adminStore.movieSearchResults?.length > 0" class="adm-movie-grid">
            <div
              v-for="movie in adminStore.movieSearchResults.slice(0, 5)"
              :key="movie.id"
              class="adm-movie-thumb"
              :class="{ 'adm-movie-thumb-active': selectedMovieId === movie.id }"
              @click="selectMovie(movie)"
            >
              <img
                :src="movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : ''"
                :alt="movie.title"
                class="adm-movie-img"
              />
              <p class="adm-movie-label text-label">{{ movie.title }}</p>
            </div>
          </div>

          <!-- Formulario de creación -->
          <form v-if="selectedMovieId" @submit.prevent="submitScreening" class="adm-create-form">

            <!-- Sala + Formato en la misma fila -->
            <div class="adm-form-row">
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Sala de Proyección</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="form.room_id" required>
                    <option value="">Elegir sala...</option>
                    <option v-for="room in adminStore.creationOptions?.rooms" :key="room.id" :value="room.id">
                      {{ room.name }} ({{ room.capacity }} butacas)
                    </option>
                  </select>
                </div>
              </div>
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Formato y Precio</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="form.price_id" required @change="onPriceSelected">
                    <option value="">Elegir formato...</option>
                    <option v-for="price in adminStore.creationOptions?.pricings" :key="price.id" :value="price.id">
                      {{ price.format }} — €{{ price.price }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Fecha + Idioma -->
            <div class="adm-form-row">
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Fecha y Hora</label>
                <input class="adm-input" type="datetime-local" v-model="form.starts_at" required />
              </div>
              <div class="adm-field-group">
                <label class="adm-field-label text-label">Idioma y Subtítulos</label>
                <div class="adm-select-wrapper">
                  <select class="adm-select" v-model="form.language" required>
                    <option value="esp">Español (Doblada)</option>
                    <option value="eng">VOSE (Inglés / Subs. Español)</option>
                    <option value="cat">Català (Doblada)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" class="adm-submit-btn text-label" :disabled="isSubmitting">
              {{ isSubmitting ? 'Creando...' : 'Confirmar Sesión →' }}
            </button>

            <p v-if="submitSuccess" class="adm-success-msg text-label">✓ Sesión creada correctamente.</p>
          </form>

        </section>
      </div>
    </div>

    <!-- ══ FOOTER ══ -->
    <footer class="adm-footer">
      <span class="text-label adm-footer-brand">© {{ new Date().getFullYear() }} UT·Cinema. Archival Precision.</span>
      <div class="adm-footer-links">
        <a href="#" class="text-label">Privacidad</a>
        <a href="#" class="text-label">Términos</a>
        <NuxtLink to="/" class="text-label">Inicio</NuxtLink>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* ── PAGE ─────────────────────────────────────────────────────── */
.adm-page {
  min-height: 100vh;
  background: var(--color-surface);
  color: var(--color-on-surface);
  display: flex;
  flex-direction: column;
}

/* ── HEADER ───────────────────────────────────────────────────── */
.adm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  height: 56px;
  background: var(--color-surface-container-lowest);
  border-bottom: 1px solid rgba(26,26,26,0.08);
}

.adm-logo {
  font-family: var(--font-serif);
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  font-style: normal;
  text-transform: none;
}

.adm-nav { display: flex; gap: var(--spacing-lg); }
.adm-nav-link {
  text-decoration: none;
  color: var(--color-on-surface-muted);
  font-size: 0.7rem;
  transition: color 0.2s;
  padding-bottom: 2px;
}
.adm-nav-link:hover { color: var(--color-primary); }
.adm-nav-active {
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-primary);
}

/* ── BODY ─────────────────────────────────────────────────────── */
.adm-body {
  flex: 1;
  padding-top: var(--spacing-lg);
  padding-bottom: var(--spacing-xl);
}

/* ── STATS ROW ────────────────────────────────────────────────── */
.adm-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  margin-bottom: var(--spacing-sm);
}

.adm-stat-value {
  font-family: var(--font-serif);
  font-size: 2.2rem;
  font-weight: 200;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 8px;
}

.adm-stat-sub {
  color: var(--color-on-surface-muted);
  font-size: 0.6rem;
}

/* ── MAIN GRID ────────────────────────────────────────────────── */
.adm-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: var(--spacing-xl);
  align-items: start;
}

/* ── SECCIÓN GENÉRICA ─────────────────────────────────────────── */
.adm-section { }

.adm-section-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 200;
  font-style: italic;
  color: var(--color-primary);
  margin-bottom: 8px;
  line-height: 1.2;
}

.adm-section-sub {
  color: var(--color-on-surface-muted);
  margin-bottom: var(--spacing-lg);
  font-size: 0.9rem;
}

/* ── FIELDS ───────────────────────────────────────────────────── */
.adm-field-group { flex: 1; }
.adm-field-label {
  display: block;
  color: var(--color-on-surface-muted);
  font-size: 0.65rem;
  margin-bottom: 8px;
}

.adm-select-wrapper { position: relative; }
.adm-select {
  width: 100%;
  padding: 14px 16px;
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(26,26,26,0.12);
  border-radius: var(--radius-sm);
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 300;
  color: var(--color-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.adm-select:focus { outline: none; border-color: var(--color-primary); }

.adm-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(26,26,26,0.12);
  border-radius: var(--radius-sm);
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 300;
  color: var(--color-primary);
}
.adm-input:focus { outline: none; border-color: var(--color-primary); }

/* ── LIVE CARD ────────────────────────────────────────────────── */
.adm-live-card {
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-ambient);
  margin-top: var(--spacing-md);
}

.adm-live-header { margin-bottom: var(--spacing-md); }
.adm-live-label { color: var(--color-on-surface-muted); font-size: 0.65rem; margin-bottom: 8px; }

.adm-live-title-row { display: flex; align-items: center; justify-content: space-between; }
.adm-live-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--color-primary);
}
.adm-live-badge {
  background: var(--color-primary);
  color: white;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.6rem;
}

.adm-live-numbers {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(26,26,26,0.07);
}

.adm-live-num-label { color: var(--color-on-surface-muted); font-size: 0.6rem; margin-bottom: 6px; }
.adm-live-num {
  font-family: var(--font-serif);
  font-size: 2.5rem;
  font-weight: 200;
  color: var(--color-primary);
  line-height: 1;
}
.adm-live-num-total { font-size: 1.2rem; opacity: 0.4; }
.adm-live-revenue { text-align: right; }

.adm-live-bar-wrap { margin-bottom: var(--spacing-md); }
.adm-live-bar-label {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-sans);
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-muted);
  margin-bottom: 6px;
}

.adm-progress-track {
  width: 100%;
  height: 2px;
  background: rgba(26,26,26,0.1);
  border-radius: 1px;
}
.adm-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 1px;
  transition: width 0.8s ease;
}

.adm-live-indicators {
  display: flex;
  gap: var(--spacing-md);
}
.adm-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 0.7rem;
  color: var(--color-on-surface-muted);
}
.adm-indicator strong { color: var(--color-primary); margin-left: 4px; }
.adm-indicator-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.adm-dot-orange { background: #f59e0b; }
.adm-dot-grey   { background: rgba(26,26,26,0.2); }

.adm-empty-state {
  margin-top: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-surface-container-low);
  border-radius: var(--radius-sm);
  text-align: center;
  color: var(--color-on-surface-muted);
}

/* ── SEARCH BOX ───────────────────────────────────────────────── */
.adm-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(26,26,26,0.12);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  background: var(--color-surface-container-lowest);
  margin-bottom: var(--spacing-md);
}
.adm-search-icon { font-size: 1.2rem; color: var(--color-on-surface-muted); }
.adm-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--color-on-surface);
}
.adm-search-input:focus { outline: none; }
.adm-search-input::placeholder { color: var(--color-on-surface-muted); }

/* ── MOVIE THUMBNAILS ─────────────────────────────────────────── */
.adm-movie-grid {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  overflow-x: auto;
}
.adm-movie-thumb {
  flex-shrink: 0;
  width: 110px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
}
.adm-movie-thumb:hover { opacity: 1; transform: translateY(-3px); }
.adm-movie-thumb-active { opacity: 1; }

.adm-movie-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  margin-bottom: 6px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.adm-movie-thumb-active .adm-movie-img { border-color: var(--color-primary); }

.adm-movie-label {
  font-size: 0.6rem;
  color: var(--color-on-surface-muted);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── CREATE FORM ──────────────────────────────────────────────── */
.adm-create-form {
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-sm);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-ambient);
}

.adm-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.adm-submit-btn {
  display: block;
  width: 100%;
  margin-top: var(--spacing-md);
  padding: 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  transition: opacity 0.2s;
  letter-spacing: 0.12em;
}
.adm-submit-btn:hover:not(:disabled) { opacity: 0.85; }
.adm-submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.adm-success-msg {
  text-align: center;
  color: var(--color-on-surface-muted);
  font-size: 0.7rem;
  margin-top: var(--spacing-sm);
}

/* ── FOOTER ───────────────────────────────────────────────────── */
.adm-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-md);
  border-top: 1px solid rgba(26,26,26,0.07);
  background: var(--color-surface-container-lowest);
}

.adm-footer-brand { color: var(--color-on-surface-muted); font-size: 0.65rem; }
.adm-footer-links { display: flex; gap: var(--spacing-md); }
.adm-footer-links a {
  text-decoration: none;
  color: var(--color-on-surface-muted);
  font-size: 0.65rem;
  transition: color 0.2s;
}
.adm-footer-links a:hover { color: var(--color-primary); }
</style>
