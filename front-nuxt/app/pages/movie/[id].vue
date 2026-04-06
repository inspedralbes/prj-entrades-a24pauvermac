<script setup>
const route = useRoute()
const movieId = route.params.id

const { data: movie, pending, error } = await CommunicationManager.getMovieById(movieId)

const backdropBase = 'https://image.tmdb.org/t/p/original'
const posterBase   = 'https://image.tmdb.org/t/p/w500'

const formatRuntime = (minutes) => {
  if (!minutes) return 'N/A'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
}

// Director viene en movie.credits.crew
const director = computed(() => {
  const crew = movie.value?.credits?.crew || []
  return crew.find(p => p.job === 'Director')?.name || 'Desconocido'
})

// Cast principales (primeros 3)
const mainCast = computed(() => {
  const cast = movie.value?.credits?.cast || []
  return cast.slice(0, 3).map(a => a.name).join(', ') || 'N/A'
})

const scorePercent = computed(() => {
  return Math.round((movie.value?.vote_average || 0) * 10)
})
</script>

<template>
  <div>
    <div v-if="pending" class="status">Cargando película...</div>
    <div v-else-if="error" class="status">Error al cargar la película.</div>

    <article v-else-if="movie" class="detail-page">

      <!-- ══ HERO: Imagen panorámica a pantalla completa ══ -->
      <div
        class="hero"
        :style="movie.backdrop_path ? { backgroundImage: `url(${backdropBase}${movie.backdrop_path})` } : {}"
      >
        <div class="hero-gradient">
          <div class="hero-inner">
            <NuxtLink to="/" class="hero-back text-label">← Cartelera</NuxtLink>
            <div class="hero-tag text-label">Ahora en cartelera</div>
            <h1 class="hero-title">{{ movie.title }}</h1>
          </div>
        </div>
      </div>

      <!-- ══ CUERPO ══ -->
      <div class="body-layout container">

        <!-- COLUMNA IZQUIERDA: sinopsis -->
        <div class="body-left">
          <p class="body-eyebrow text-label">La Sinopsis</p>

          <p class="body-tagline text-title" v-if="movie.tagline">
            {{ movie.tagline }}
          </p>

          <p class="body-overview text-body">
            {{ movie.overview || 'Sinopsis no disponible.' }}
          </p>

          <!-- Géneros -->
          <div class="genre-list" v-if="movie.genres?.length">
            <span
              v-for="genre in movie.genres"
              :key="genre.id"
              class="genre-tag text-label"
            >
              {{ genre.name }}
            </span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: ficha técnica + CTA -->
        <div class="body-right">
          <div class="tech-card">

            <p class="tech-eyebrow text-label">Créditos &amp; Detalles</p>

            <dl class="tech-list">
              <div class="tech-row">
                <dt class="text-label">Dirigida por</dt>
                <dd>{{ director }}</dd>
              </div>
              <div class="tech-row">
                <dt class="text-label">Starring</dt>
                <dd>{{ mainCast }}</dd>
              </div>
              <div class="tech-row">
                <dt class="text-label">Duración</dt>
                <dd>{{ formatRuntime(movie.runtime) }}</dd>
              </div>
              <div class="tech-row">
                <dt class="text-label">Estreno</dt>
                <dd>{{ formatDate(movie.release_date) }}</dd>
              </div>
              <div class="tech-row" v-if="movie.vote_average">
                <dt class="text-label">Puntuación</dt>
                <dd class="score-value">
                  {{ Number(movie.vote_average).toFixed(1) }}
                  <span class="score-bar">
                    <span class="score-fill" :style="{ width: scorePercent + '%' }"></span>
                  </span>
                </dd>
              </div>
            </dl>

            <NuxtLink :to="`/booking/${movieId}`" class="btn-book text-label">
              Reservar Entradas
            </NuxtLink>

            <p class="tech-fine text-label">Precios sujetos a disponibilidad de sala</p>
          </div>
        </div>

      </div>

    </article>
  </div>
</template>

<style scoped>
/* ── HERO ─────────────────────────────────────────────────────── */
.detail-page { background-color: var(--color-surface); }

.hero {
  width: 100%;
  height: 75vh;
  min-height: 480px;
  background-color: var(--color-primary);
  background-size: cover;
  background-position: center 20%;
  position: relative;
}

.hero-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.15) 0%,
    rgba(249,249,249,0) 50%,
    rgba(249,249,249,1) 100%
  );
  display: flex;
  align-items: flex-end;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  width: 100%;
}

.hero-back {
  display: inline-block;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  margin-bottom: var(--spacing-xl);
  transition: color 0.2s;
  /* Posicionamos el botón arriba */
  position: absolute;
  top: var(--spacing-md);
  left: var(--spacing-md);
}
.hero-back:hover { color: white; }

.hero-tag {
  color: rgba(255,255,255,0.6);
  margin-bottom: 8px;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 200;
  color: white;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 0.95;
  margin: 0;
  text-shadow: 0 2px 40px rgba(0,0,0,0.3);
}

/* ── BODY ─────────────────────────────────────────────────────── */
.body-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--spacing-xl);
  align-items: start;
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
}

/* COLUMNA IZQUIERDA */
.body-eyebrow { color: var(--color-on-surface-muted); margin-bottom: var(--spacing-md); }

.body-tagline {
  font-size: 1.6rem;
  line-height: 1.35;
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
  max-width: 540px;
}

.body-overview {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-on-surface-muted);
  max-width: 560px;
  margin-bottom: var(--spacing-lg);
}

.genre-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.genre-tag {
  padding: 5px 12px;
  border: 1px solid rgba(26,26,26,0.2);
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  color: var(--color-on-surface-muted);
}

/* COLUMNA DERECHA */
.body-right { position: sticky; top: var(--spacing-lg); }

.tech-card {
  background: var(--color-surface-container-lowest);
  padding: var(--spacing-lg);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-ambient);
}

.tech-eyebrow {
  color: var(--color-on-surface-muted);
  font-size: 0.65rem;
  margin-bottom: var(--spacing-md);
}

.tech-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin: 0 0 var(--spacing-lg) 0;
  padding: 0;
}

.tech-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(26,26,26,0.07);
}
.tech-row:last-child { border-bottom: none; padding-bottom: 0; }

.tech-row dt {
  font-family: var(--font-sans);
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-muted);
}

.tech-row dd {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 300;
  color: var(--color-primary);
  margin: 0;
}

/* Score bar */
.score-value { display: flex; flex-direction: column; gap: 6px; }
.score-bar {
  display: block;
  width: 100%;
  height: 2px;
  background: rgba(26,26,26,0.1);
  border-radius: 1px;
}
.score-fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  border-radius: 1px;
  transition: width 1s ease;
}

/* CTA */
.btn-book {
  display: block;
  width: 100%;
  padding: 16px;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  text-align: center;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  transition: opacity 0.2s;
}
.btn-book:hover { opacity: 0.85; }

.tech-fine {
  text-align: center;
  color: var(--color-on-surface-muted);
  font-size: 0.6rem;
  margin-top: var(--spacing-sm);
}
</style>
