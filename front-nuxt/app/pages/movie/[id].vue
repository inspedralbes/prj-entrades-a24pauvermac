<script setup>
const route = useRoute()
const movieId = route.params.id

// Usamos nuestro Gestor de Comunicación para el detalle de la película
const { data: movie, pending, error } = await CommunicationManager.getMovieById(movieId)

// URLs de imágenes de alta calidad
const backdropBase = 'https://image.tmdb.org/t/p/original'
const posterBase = 'https://image.tmdb.org/t/p/w500'

// Función para transformar minutos (105) en texto (1h 45m)
const formatRuntime = (minutes) => {
  if (!minutes) return 'Desconocida'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
</script>

<template>
  <div v-if="pending" class="loading">Cargando detalles de la película...</div>
  <div v-else-if="error" class="error">Se produjo un error al cargar la película.</div>
  
  <div v-else-if="movie" class="movie-detail">
    
    <!-- 1. Cabecera espectacular con la imagen panorámica -->
    <div class="backdrop" :style="{ backgroundImage: `url(${backdropBase}${movie.backdrop_path})` }">
      <div class="backdrop-gradient">
        <NuxtLink to="/" class="btn-back">← Volver a la cartelera</NuxtLink>
      </div>
    </div>

    <!-- 2. Contenido Principal -->
    <div class="content-wrapper">
      <div class="poster-container">
        <img v-if="movie.poster_path" :src="posterBase + movie.poster_path" :alt="movie.title" class="poster" />
      </div>

      <div class="info-container">
        <!-- Título -->
        <h1>{{ movie.title }}</h1>
        
        <!-- Eslogan (NUEVO) -->
        <p v-if="movie.tagline" class="tagline">"{{ movie.tagline }}"</p>

        <!-- Datos Técnicos: Duración y Puntuación -->
        <div class="tech-info">
          <span class="runtime">⏱️ {{ formatRuntime(movie.runtime) }}</span>
          <span class="rating">⭐ {{ Number(movie.vote_average || 0).toFixed(1) }} / 10</span>
        </div>

        <!-- Géneros (NUEVO) -->
        <div class="genres">
          <span v-for="genre in movie.genres" :key="genre.id" class="genre-tag">
            {{ genre.name }}
          </span>
        </div>

        <!-- Sinopsis -->
        <div class="overview">
          <h3>Sinopsis</h3>
          <p>{{ movie.overview || 'Sinopsis no disponible.' }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Reset básico para esta página */
.movie-detail {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #0f172a; /* Fondo oscuro elegante */
  color: white;
  min-height: 100vh;
  padding-bottom: 50px;
}

/* 1. Imagen panorámica superior */
.backdrop {
  width: 100%;
  height: 50vh;
  min-height: 300px;
  background-size: cover;
  background-position: center 20%;
  position: relative;
}

/* El degradado hace que oscurezca abajo para fusionarse con la página */
.backdrop-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 1) 100%);
  padding: 30px;
}

.btn-back {
  color: white;
  text-decoration: none;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5);
  padding: 10px 15px;
  border-radius: 6px;
  transition: 0.3s;
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 2. Contenedor de la información principal */
.content-wrapper {
  max-width: 1000px;
  margin: -100px auto 0; /* Lo subimos para que pise el final de la imagen panorámica */
  padding: 0 20px;
  display: flex;
  gap: 40px;
  position: relative;
  z-index: 10;
}

/* Póster a la izquierda */
.poster-container {
  flex-shrink: 0;
}
.poster {
  width: 300px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  border: 4px solid #1e293b;
}

/* Textos a la derecha */
.info-container {
  padding-top: 50px; /* Para alinearlo bien con el póster flotante */
}

h1 {
  font-size: 3rem;
  margin: 0;
  line-height: 1.1;
}

.tagline {
  font-size: 1.2rem;
  color: #94a3b8;
  font-style: italic;
  margin-top: 10px;
}

/* Datos técnicos y Géneros */
.tech-info {
  margin: 20px 0;
  display: flex;
  gap: 20px;
  font-size: 1.1rem;
}

.genres {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.genre-tag {
  background-color: #3b82f6; /* Azul eléctrico */
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
}

.overview h3 {
  font-size: 1.3rem;
  margin-bottom: 10px;
  color: #cbd5e1;
}

.overview p {
  line-height: 1.7;
  color: #e2e8f0;
  font-size: 1.1rem;
}

/* Ajustes para móvil */
@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
    align-items: center;
    margin-top: -50px;
  }
  .poster {
    width: 200px;
  }
  .info-container {
    padding-top: 10px;
    text-align: center;
  }
  .tech-info, .genres {
    justify-content: center;
  }
}

/* Extra: estilos de carga y error simples */
.loading, .error {
  text-align: center;
  padding: 100px 20px;
  font-size: 1.5rem;
  color: #333;
}
</style>
