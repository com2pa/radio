const { pool } = require('../db/index');

// Crear tabla de categorización de podcasts
const createCategoryPodscatsTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS category_podscats (
          category_id SERIAL PRIMARY KEY,
          category_name VARCHAR(100) UNIQUE NOT NULL,                          
          category_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INT REFERENCES users(user_id) ON DELETE SET NULL
      )
    `;
    try {
        await pool.query(query);
        console.log('✅ Tabla "category_podscats" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla category_podscats:', error);
    }
};

// Función para crear una nueva categoría de podcasts
const createCategoryPodscats = async (categoryName, userId) => {
    const query = 'INSERT INTO category_podscats (category_name, user_id) VALUES ($1, $2) RETURNING *';
    const values = [categoryName, userId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error creando categoría de podcasts: ' + error.message);
    }
};

// Función para obtener todas las categorías de podcasts
const getAllCategoryPodscats = async () => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM category_podscats cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        ORDER BY cp.category_created_at DESC
    `;
    try {
        const res = await pool.query(query);
        return res.rows;
    } catch (error) {
        throw new Error('Error obteniendo categorías de podcasts: ' + error.message);
    }
};

// Función para obtener una categoría de podcasts por su id
const getCategoryPodscatsById = async (categoryId) => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM category_podscats cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.category_id = $1
    `;
    const values = [categoryId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error obteniendo categoría de podcasts: ' + error.message);
    }
};

// Función para obtener categorías de podcasts por usuario
const getCategoryPodscatsByUserId = async (userId) => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM category_podscats cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.user_id = $1
        ORDER BY cp.category_created_at DESC
    `;
    const values = [userId];
    try {
        const res = await pool.query(query, values);
        return res.rows;
    } catch (error) {
        throw new Error('Error obteniendo categorías de podcasts por usuario: ' + error.message);
    }
};

// Función para actualizar una categoría de podcasts por su id
const updateCategoryPodscats = async (categoryId, categoryName) => {
    const query = 'UPDATE category_podscats SET category_name = $1 WHERE category_id = $2 RETURNING *';
    const values = [categoryName, categoryId];
    
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error actualizando categoría de podcasts: ' + error.message);
    }
};

// Función para eliminar una categoría de podcasts por su id
const deleteCategoryPodscats = async (categoryId) => {
    const query = 'DELETE FROM category_podscats WHERE category_id = $1 RETURNING *';
    const values = [categoryId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error eliminando categoría de podcasts: ' + error.message);
    }
};

// Inicializar tabla
createCategoryPodscatsTable();

module.exports = {
    createCategoryPodscats,
    getAllCategoryPodscats,
    getCategoryPodscatsById,
    getCategoryPodscatsByUserId,
    updateCategoryPodscats,
    deleteCategoryPodscats
};