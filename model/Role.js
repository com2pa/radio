const { pool } = require('../db/index');

// Crear tabla de roles
const createRoleTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS roles (
          role_id SERIAL PRIMARY KEY,
          role_name VARCHAR(50) UNIQUE NOT NULL,
          role_description VARCHAR(200),
          role_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabla "roles" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla roles:', error);
    }
};

// Crear un nuevo rol
const createRole = async (roleData) => {
    const { role_name, role_description } = roleData;
    const query = `
      INSERT INTO roles (role_name, role_description)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [role_name, role_description]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error creating role: ${error.message}`);
    }
};

// Obtener todos los roles
const getAllRoles = async () => {
    const query = 'SELECT * FROM roles ORDER BY role_id';
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting roles: ${error.message}`);
    }
};

// Obtener rol por ID
const getRoleById = async (id) => {
    const query = 'SELECT * FROM roles WHERE role_id = $1';
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting role by id: ${error.message}`);
    }
};

// Obtener rol por nombre
const getRoleByName = async (name) => {
    const query = 'SELECT * FROM roles WHERE role_name = $1';
    try {
        const result = await pool.query(query, [name]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting role by name: ${error.message}`);
    }
};

// Inicializar tabla
createRoleTable();

module.exports = {
    createRole,
    getAllRoles,
    getRoleById,
    getRoleByName
};