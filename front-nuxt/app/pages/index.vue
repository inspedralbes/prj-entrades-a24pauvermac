<script setup>
const config = useRuntimeConfig();
// En SSR (servidor Docker) usamos la URL interna; en el navegador la URL pública
const apiUrl = import.meta.server ? config.apiUrlInternal : config.public.apiBase;
const { data: movies, pending, error } = await useFetch(`${apiUrl}/api/movies`);

const imgBase = 'https://image.tmdb.org/t/p/w300';
</script>

<template>
  <div class="container">
    <h1>Películas Populares</h1>
    
    <div v-if="pending" class="status">Cargando...</div>
    <div v-else-if="error" class="status">Error al cargar películas.</div>
    
    <div v-else>
      <ul>
        <li v-for="movie in movies.results" :key="movie.id" class="movie-item">
          <img
            v-if="movie.poster_path"
            :src="imgBase + movie.poster_path"
            :alt="movie.title"
            class="poster"
          />
          <div class="movie-info">
            <h2>{{ movie.title }}</h2>
            <p>{{ movie.overview }}</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
}

h1 {
  font-size: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 30px;
  color: #222;
}

ul {
  list-style: none;
  padding: 0;
}

.movie-item {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  align-items: flex-start;
}

.poster {
  width: 100px;
  min-width: 100px;
  border-radius: 6px;
  object-fit: cover;
}

.movie-info {
  flex: 1;
}

h2 {
  margin: 0 0 12px 0;
  color: #0066cc;
  font-size: 1.5rem;
}

p {
  color: #444;
  margin: 0;
  font-size: 1rem;
}

.status {
  padding: 50px;
  text-align: center;
  font-size: 1.2rem;
  color: #666;
}
</style>