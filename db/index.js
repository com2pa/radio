const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Verificar conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL exitosa');
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
  }
};

module.exports = { pool, testConnection };