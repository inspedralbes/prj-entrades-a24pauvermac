import { createClient } from 'redis';

// Creamos el cliente de Redis apuntando al contenedor de Docker
// La variable REDIS_HOST viene del docker-compose.yml (valor: "redis")
// Si no hay variable de entorno, apuntamos a localhost para desarrollo sin Docker
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Si Redis falla la conexion, lo mostramos claramente en los logs
redisClient.on('error', (err) => {
  console.error('Error de conexion con Redis:', err);
});

// Conectamos al arrancar el modulo
await redisClient.connect();
console.log('✅ Conectado a Redis correctamente');

export default redisClient;
