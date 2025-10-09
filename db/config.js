require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Opciones adicionales para mejor rendimiento
  max: 20, // máximo de clientes en el pool
  idleTimeoutMillis: 30000, // cierra clientes inactivos después de 30s
  connectionTimeoutMillis: 2000, // tiempo de espera para conexión
})

// Eventos para monitorear la conexión
pool.on('connect', () => {
  console.log('🔄 Nueva conexión establecida con PostgreSQL')
})

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err)
  process.exit(-1)
})

module.exports = pool