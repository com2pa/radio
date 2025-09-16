const { pool } = require('../db/index');

// Crear tabla de usuarios
const createUserTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      user_name VARCHAR(100) NOT NULL,
      user_lastname VARCHAR(100) NOT NULL,
      user_email VARCHAR(100) UNIQUE NOT NULL,
      user_password VARCHAR(100) NOT NULL,
      user_address VARCHAR(200) NOT NULL,
      user_phone VARCHAR(15) NOT NULL,
      user_age INT NOT NULL,
      user_role VARCHAR(50) DEFAULT 'user',
      user_status BOOLEAN DEFAULT TRUE,
      user_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await pool.query(query);
    console.log('✅ Tabla "users" creada/verificada exitosamente');
  } catch (error) {
    console.error('❌ Error creando tabla users:', error);
  }
};

// CREATE - Crear usuario
const createUser = async (userData) => {
  const {
    user_name,
    user_lastname,
    user_email,
    user_password,
    user_address,
    user_phone,
    user_age
  } = userData;

  const query = `
    INSERT INTO users (
      user_name, user_lastname, user_email, user_password, 
      user_address, user_phone, user_age
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [
      user_name,
      user_lastname,
      user_email,
      user_password,
      user_address,
      user_phone,
      user_age
    ]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

// READ - Obtener todos los usuarios
const getAllUsers = async () => {
  const query = 'SELECT user_id, user_name, user_lastname, user_email, user_role, user_status, user_created_at FROM users';
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw new Error(`Error getting users: ${error.message}`);
  }
};

// READ - Obtener usuario por ID
const getUserById = async (id) => {
  const query = 'SELECT * FROM users WHERE user_id = $1';
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error getting user by id: ${error.message}`);
  }
};

// READ - Obtener usuario por email
const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE user_email = $1';
  try {
    const result = await pool.query(query, [email]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error getting user by email: ${error.message}`);
  }
};

// UPDATE - Actualizar usuario
const updateUser = async (id, userData) => {
  const {
    user_name,
    user_lastname,
    user_email,
    user_address,
    user_phone,
    user_age,
    user_status
  } = userData;

  const query = `
    UPDATE users 
    SET user_name = $1, user_lastname = $2, user_email = $3, 
        user_address = $4, user_phone = $5, user_age = $6, 
        user_status = $7, user_updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $8
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [
      user_name,
      user_lastname,
      user_email,
      user_address,
      user_phone,
      user_age,
      user_status,
      id
    ]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

// DELETE - Eliminar usuario
const deleteUser = async (id) => {
  const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error deleting user: ${error.message}`);
  }
};

// Inicializar tabla
createUserTable();

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser
};