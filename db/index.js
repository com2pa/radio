const { Pool } = require('pg');
require('dotenv').config();
const { POSTGRED_URL } = require('../config');

// Verificar que la URL de conexión esté definida
if (!POSTGRED_URL) {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no está configurada en las variables de entorno');
  console.error('Por favor, configura DATABASE_URL o DATABASE_URL_PRODUC en tu archivo .env');
}

// Configuración de la conexión PostgreSQL
const pool = new Pool({
  connectionString: POSTGRED_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Opciones adicionales para mejor rendimiento y estabilidad
  max: 20, // máximo de clientes en el pool
  idleTimeoutMillis: 30000, // cierra clientes inactivos después de 30s
  connectionTimeoutMillis: 10000, // tiempo de espera para conexión (10 segundos)
  query_timeout: 5000, // timeout para queries (5 segundos - operaciones simples deben ser rápidas)
  statement_timeout: 5000, // timeout para statements (5 segundos)
});

// Eventos para monitorear la conexión
pool.on('connect', () => {
  console.log('🔄 Nueva conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
  // No hacer exit inmediato, permitir que la aplicación intente recuperarse
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.error('⚠️ Error de conexión. Verifica que PostgreSQL esté corriendo y accesible.');
  }
});

// Verificar conexión con reintentos
const testConnection = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Conexión a PostgreSQL exitosa');
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ Error conectando a PostgreSQL (intento ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Reintentando conexión en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ No se pudo establecer conexión después de varios intentos');
        console.error('💡 Verifica:');
        console.error('   1. Que PostgreSQL esté corriendo');
        console.error('   2. Que DATABASE_URL esté correctamente configurada en .env');
        console.error('   3. Que las credenciales sean correctas');
        console.error('   4. Que el firewall permita la conexión');
        return false;
      }
    }
  }
  return false;
};

module.exports = { pool, testConnection };