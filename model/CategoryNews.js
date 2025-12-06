const { pool } = require('../db/index');
// Crear tabla de categorías de noticias
const createCategoryNewsTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS category_news (
          category_id SERIAL PRIMARY KEY ,
          category_name VARCHAR(100) UNIQUE NOT NULL,                    
          category_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    try {
        await pool.query(query);
        console.log('✅ Tabla "category_news" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla category_news:', error);
    }
}

// funcion para crear una nueva categoria de noticias
const createCategoryNews = async (categoryName) => {
    const query = 'INSERT INTO category_news (category_name) VALUES ($1) RETURNING *';
    const values = [categoryName];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error creando categoría de noticias: ' + error.message);
    }
};
// funcion para obtener todas las categorias de noticias
const getAllCategoryNews = async () => {
    const query = 'SELECT * FROM category_news';
    try {
        const res = await pool.query(query);
        return res.rows;
    } catch (error) {
        throw new Error('Error obteniendo categorías de noticias: ' + error.message);
    }
};
// funcion para obtener una categoria de noticias por su id
const getCategoryNewsById = async (categoryId) => {
    const query = 'SELECT * FROM category_news WHERE category_id = $1';
    const values = [categoryId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error obteniendo categoría de noticias: ' + error.message);
    }
};
// funcion para actualizar una categoria de noticias por su id
const updateCategoryNews = async (categoryId, categoryName) => {
    const query = 'UPDATE category_news SET category_name = $1 WHERE category_id = $2 RETURNING *';
    const values = [categoryName, categoryId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error actualizando categoría de noticias: ' + error.message);
    }
};
// funcion para eliminar una categoria de noticias por su id
const deleteCategoryNews = async (categoryId) => {
    const query = 'DELETE FROM category_news WHERE category_id = $1 RETURNING *';
    const values = [categoryId];
    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (error) {
        throw new Error('Error eliminando categoría de noticias: ' + error.message);
    }
};         
// Inicializar tabla de forma asíncrona con retries
const initializeCategoryNewsTable = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createCategoryNewsTable();
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tabla category_news (intento ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudo inicializar la tabla category_news después de varios intentos');
            }
        }
    }
};

setImmediate(() => {
    initializeCategoryNewsTable().catch(() => {});
});

module.exports = {
    createCategoryNews,
    getAllCategoryNews,
    getCategoryNewsById,
    updateCategoryNews,
    deleteCategoryNews

}; 