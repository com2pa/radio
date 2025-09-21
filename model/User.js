const { pool } = require('../db/index');

// Crear tabla de usuarios con relación a roles
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
      role_id INT DEFAULT 3, -- DEFAULT 'user' (role_id = 3)
      user_status BOOLEAN DEFAULT FALSE,
      user_verify BOOLEAN DEFAULT FALSE,
      user_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_role
        FOREIGN KEY(role_id) 
        REFERENCES roles(role_id)
        ON DELETE SET DEFAULT
  
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
        user_age,
        role_id = 3 // Valor por defecto: 'user'
    } = userData;

    const query = `
    INSERT INTO users (
      user_name, user_lastname, user_email, user_password, 
      user_address, user_phone, user_age, role_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
            user_age,
            role_id
        ]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }
};

// READ - Obtener todos los usuarios con información de rol
const getAllUsers = async () => {
    const query = `
        SELECT 
            u.user_id, 
            u.user_name, 
            u.user_lastname, 
            u.user_email, 
            r.role_name as user_role,
            u.user_status,
            u.user_verify,
            u.user_created_at 
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.user_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting users: ${error.message}`);
    }
};

// READ - Obtener usuario por ID con información de rol
const getUserById = async (id) => {
    const query = `
        SELECT 
            u.*,
            r.role_name,
            r.role_description
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting user by id: ${error.message}`);
    }
};

// READ - Obtener usuario por email
const getUserByEmail = async (email) => {
    const query = `
        SELECT 
            u.*,
            r.role_name,
            r.role_description
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_email = $1
    `;
    try {
        const result = await pool.query(query, [email]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting user by email: ${error.message}`);
    }
};

// UPDATE - Actualizar usuario (incluyendo rol)
const updateUser = async (id, userData) => {
    const {
        user_name,
        user_lastname,
        user_email,
        user_address,
        user_phone,
        user_age,
        user_status,
        user_verify,
        role_id
    } = userData;

    const query = `
    UPDATE users 
    SET user_name = $1, user_lastname = $2, user_email = $3, 
        user_address = $4, user_phone = $5, user_age = $6, 
        user_status = $7, user_verify = $8, role_id = $9, 
        user_updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $10
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
            user_verify,
            role_id,
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

// UPDATE - Actualizar solo el estado online del usuario
// UPDATE - Actualizar solo el estado del usuario (user_status)
const updateUserStatus = async (id, status) => {
    const query = `
        UPDATE users 
        SET user_status = $1, 
            user_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING user_id, user_email, user_status
    `;

    try {
        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error updating user status: ${error.message}`);
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
    updateUserStatus,
    deleteUser
};