const PAGE_URL = process.env.NODE_ENV === 'production'
    ? 'https://oxigenoradio.com'
    : 'http://localhost:5173';

// Configuración de URL de base de datos
const POSTGRED_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL_PRODUC || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

// Validar que la URL esté configurada
if (!POSTGRED_URL && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️ ADVERTENCIA: DATABASE_URL no está configurada');
  console.warn('   Configura DATABASE_URL en tu archivo .env');
}

// Tiempo de inactividad antes de cerrar sesión automáticamente (en milisegundos)
// Por defecto: 30 minutos (30 * 60 * 1000)
// Se puede configurar con variable de entorno SESSION_INACTIVITY_TIMEOUT_MS
const SESSION_INACTIVITY_TIMEOUT = process.env.SESSION_INACTIVITY_TIMEOUT_MS 
  ? parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MS, 10)
  : 30 * 60 * 1000; // 30 minutos por defecto

module.exports = {
  PAGE_URL,
  POSTGRED_URL,
  SESSION_INACTIVITY_TIMEOUT,
};
