import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

// Evitar que FontAwesome añada CSS adicional que colisiona con el SSR de Nuxt
config.autoAddCss = false

// Importar la colección de iconos solidos
library.add(fas)

export default defineNuxtPlugin((nuxtApp) => {
  // Registramos el componente <font-awesome-icon> a nivel global para que funcione en Vue
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
})
