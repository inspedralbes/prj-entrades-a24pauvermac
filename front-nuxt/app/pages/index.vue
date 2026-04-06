<script setup>
const { data: movies, pending, error } = await CommunicationManager.getPopularMovies();

const imgBasePoster = 'https://image.tmdb.org/t/p/w300';
const imgBaseBackdrop = 'https://image.tmdb.org/t/p/w780';

const currentSlide = ref(0);
let autoplayInterval = null;

const nextSlide = () => {
  if (movies.value?.results?.length) {
    currentSlide.value = (currentSlide.value + 1) % movies.value.results.length;
  }
};

const prevSlide = () => {
  if (movies.value?.results?.length) {
    currentSlide.value = (currentSlide.value - 1 + movies.value.results.length) % movies.value.results.length;
  }
};

const startAutoplay = () => {
  stopAutoplay();
  autoplayInterval = setInterval(nextSlide, 5000);
};

const stopAutoplay = () => {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
};

const currentMovie = computed(() => {
  return movies.value?.results?.[currentSlide.value] || null;
});

onMounted(() => {
  startAutoplay();
});

onUnmounted(() => {
  stopAutoplay();
});
</script>

<template>
  <div>
    <div v-if="pending" class="status">Cargando...</div>
    <div v-else-if="error" class="status">Error al cargar películas.</div>
    
    <h2 class="section-title-left">CARTELERA</h2>
    
    <div class="container">
    
    <ClientOnly>
      <div 
        v-if="currentMovie" 
        class="carousel"
        @mouseenter="stopAutoplay"
        @mouseleave="startAutoplay"
      >
        <div class="carousel-slide" :key="currentMovie.id">
          <img
            v-if="currentMovie.backdrop_path"
            :src="imgBaseBackdrop + currentMovie.backdrop_path"
            :alt="currentMovie.title"
            class="carousel-image"
          />
          <div v-else class="carousel-placeholder"></div>
          
          <div class="carousel-content">
            <h2 class="carousel-title">{{ currentMovie.title }}</h2>
            <NuxtLink :to="`/booking/${currentMovie.id}`" class="carousel-btn">
              Comprar entradas
            </NuxtLink>
          </div>
        </div>
        
        <button class="carousel-nav carousel-prev" @click="prevSlide" aria-label="Anterior">
          ‹
        </button>
        <button class="carousel-nav carousel-next" @click="nextSlide" aria-label="Siguiente">
          ›
        </button>
        
          <div class="carousel-indicators">
            <span 
              v-for="(_, index) in movies?.results?.slice(0, 5)" 
              :key="index"
              class="carousel-dot"
              :class="{ active: index === currentSlide }"
              @click="currentSlide = index"
            ></span>
          </div>
      </div>
    </ClientOnly>
    
    <div v-if="movies?.results" class="thumbnails-section">
      <div v-for="row in Math.ceil(movies.results.length / 5)" :key="row" class="thumbnails-row">
        <div 
          v-for="movie in movies.results.slice((row - 1) * 5, row * 5)" 
          :key="movie.id" 
          class="thumbnail-card"
        >
          <img
            v-if="movie.poster_path"
            :src="imgBasePoster + movie.poster_path"
            :alt="movie.title"
            class="thumbnail-poster"
          />
          <div class="thumbnail-buttons">
            <NuxtLink :to="`/booking/${movie.id}`" class="thumbnail-btn entradas">
              Entradas
            </NuxtLink>
            <NuxtLink :to="`/movie/${movie.id}`" class="thumbnail-btn info">
              i
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
</style>
