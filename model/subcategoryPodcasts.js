const { pool } = require('../db/index');

// Verificar si la tabla category_podscats existe
const verifyCategoriesTable = async () => {
    try {
        await pool.query('SELECT 1 FROM category_podscats LIMIT 1');
        console.log('✅ Tabla "category_podscats" existe');
        return true;
    } catch (error) {
        console.error('❌ Tabla "category_podscats" no existe o hay error de conexión');
        return false;
    }
};

// Función para corregir la restricción UNIQUE si existe la vieja
const fixUniqueConstraint = async () => {
    try {
        // Verificar si existe la restricción vieja (solo en subcategory_name)
        const checkOldConstraint = `
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'subcategory_podcasts' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%subcategory_name%'
            AND constraint_name NOT LIKE '%category_id%'
        `;
        
        const result = await pool.query(checkOldConstraint);
        
        if (result.rows.length > 0) {
            // Eliminar la restricción vieja
            for (const row of result.rows) {
                await pool.query(`ALTER TABLE subcategory_podcasts DROP CONSTRAINT IF EXISTS ${row.constraint_name}`);
                console.log(`✅ Restricción UNIQUE vieja eliminada: ${row.constraint_name}`);
            }
        }
        
        // Verificar si ya existe la restricción compuesta
        const checkNewConstraint = `
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'subcategory_podcasts' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%unique_subcategory_per_category%'
        `;
        
        const newResult = await pool.query(checkNewConstraint);
        
        if (newResult.rows.length === 0) {
            // Verificar si existe alguna restricción UNIQUE que incluya category_id y subcategory_name
            const checkExistingComposite = `
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'subcategory_podcasts' 
                AND tc.constraint_type = 'UNIQUE'
                AND kcu.column_name IN ('category_id', 'subcategory_name')
                GROUP BY tc.constraint_name
                HAVING COUNT(DISTINCT kcu.column_name) = 2
            `;
            
            const compositeResult = await pool.query(checkExistingComposite);
            
            if (compositeResult.rows.length === 0) {
                // Agregar la nueva restricción compuesta
                await pool.query('ALTER TABLE subcategory_podcasts ADD CONSTRAINT unique_subcategory_per_category UNIQUE (category_id, subcategory_name)');
                console.log('✅ Restricción UNIQUE compuesta creada');
            } else {
                console.log('✅ Restricción UNIQUE compuesta ya existe con otro nombre:', compositeResult.rows[0].constraint_name);
            }
        } else {
            console.log('✅ Restricción UNIQUE compuesta ya existe');
        }
        
    } catch (error) {
        // Si el error es que la restricción ya existe, lo ignoramos
        if (error.message.includes('ya existe')) {
            console.log('✅ Restricción UNIQUE compuesta ya existe (ignorando error)');
        } else {
            console.error('❌ Error corrigiendo restricciones:', error);
        }
    }
};

// Crear tabla de subcategorías de podcasts (CON RESTRICCIÓN COMPUESTA)
const createSubCategoryPodcastsTable = async () => {
    const categoriesExist = await verifyCategoriesTable();
    if (!categoriesExist) {
        throw new Error('La tabla category_podscats no existe. Debe crearse primero.');
    }
    
    const query = ` 
        CREATE TABLE IF NOT EXISTS subcategory_podcasts (
            subcategory_id SERIAL PRIMARY KEY,
            category_id INT NOT NULL,
            subcategory_name VARCHAR(100) NOT NULL,  
            user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
            subcategory_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES category_podscats(category_id) ON DELETE CASCADE
            -- La restricción UNIQUE se agregará después para evitar conflictos
        )
    `;
    
    try {
        await pool.query(query);
        console.log('✅ Tabla "subcategory_podcasts" creada/verificada exitosamente');
        
        // Verificar y corregir la restricción si es necesario
        await fixUniqueConstraint();
        
    } catch (error) {
        console.error('❌ Error creando tabla subcategory_podcasts:', error);
        throw error;
    }
};

// Verificar si la categoría existe
const categoryExists = async (category_id) => {
    const query = `SELECT COUNT(*) FROM category_podscats WHERE category_id = $1`;
    try {
        const result = await pool.query(query, [category_id]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando existencia de categoría:', error);
        throw error;
    }
};

// Verificar si la subcategoría existe - NUEVA FUNCIÓN
const subcategoryExists = async (subcategory_id) => {
    const query = `SELECT COUNT(*) FROM subcategory_podcasts WHERE subcategory_id = $1`;
    try {
        const result = await pool.query(query, [subcategory_id]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando existencia de subcategoría:', error);
        throw error;
    }
};

// Obtener todas las subcategorías de podcasts
const getAllSubCategoryPodcasts = async () => {
    const query = `
        SELECT 
            sp.*, 
            cp.category_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM subcategory_podcasts sp 
        JOIN category_podscats cp ON sp.category_id = cp.category_id
        LEFT JOIN users u ON sp.user_id = u.user_id
        ORDER BY sp.subcategory_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías de podcasts:', error);
        throw error;
    }
};

// Obtener subcategorías por categoría específica
const getSubCategoryPodcastsByCategory = async (category_id) => {
    const query = `
        SELECT 
            sp.*, 
            cp.category_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM subcategory_podcasts sp 
        JOIN category_podscats cp ON sp.category_id = cp.category_id
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE sp.category_id = $1
        ORDER BY sp.subcategory_name
    `;
    try {
        const result = await pool.query(query, [category_id]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías por categoría:', error);
        throw error;
    }
};

// Obtener una subcategoría por ID
const getSubCategoryPodcastsById = async (id) => {
    const query = `
        SELECT 
            sp.*, 
            cp.category_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM subcategory_podcasts sp 
        JOIN category_podscats cp ON sp.category_id = cp.category_id
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE sp.subcategory_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error obteniendo subcategoría por ID:', error);
        throw error;
    }
};

// Función para crear una nueva subcategoría de podcasts
const createSubCategoryPodcasts = async (subcategoryData) => {
    const { category_id, subcategory_name, user_id } = subcategoryData;
    
    const query = `
        INSERT INTO subcategory_podcasts (category_id, subcategory_name, user_id)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    try {
        const result = await pool.query(query, [category_id, subcategory_name, user_id]);
        console.log('✅ Subcategoría de podcasts creada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando subcategoría de podcasts:', error);
        throw error;
    }
};

// Verificar que una subcategoría no se repita
const isSubCategoryPodcastsUnique = async (category_id, subcategory_name, exclude_id = null) => {
    let query = `
        SELECT COUNT(*) FROM subcategory_podcasts 
        WHERE category_id = $1 AND LOWER(subcategory_name) = LOWER($2)
    `;
    let params = [category_id, subcategory_name];
    
    if (exclude_id) {
        query += ` AND subcategory_id != $3`;
        params.push(exclude_id);
    }
    
    try {
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count) === 0;
    } catch (error) {
        console.error('❌ Error verificando unicidad de subcategoría:', error);
        throw error;
    }
};

// Actualizar una subcategoría de podcasts
const updateSubCategoryPodcasts = async (id, subcategoryData) => {
    const { category_id, subcategory_name } = subcategoryData;
    
    const query = `
        UPDATE subcategory_podcasts
        SET category_id = $1, subcategory_name = $2
        WHERE subcategory_id = $3
        RETURNING *
    `;
    try {
        const result = await pool.query(query, [category_id, subcategory_name, id]);
        console.log('✅ Subcategoría de podcasts actualizada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando subcategoría de podcasts:', error);
        throw error;
    }
};

// Eliminar una subcategoría de podcasts
const deleteSubCategoryPodcasts = async (id) => {
    const query = `DELETE FROM subcategory_podcasts WHERE subcategory_id = $1 RETURNING *`;
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Subcategoría de podcasts no encontrada');
        }
        console.log('✅ Subcategoría de podcasts eliminada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando subcategoría de podcasts:', error);
        throw error;
    }
};

createSubCategoryPodcastsTable();

// Exportar funciones
module.exports = {
    createSubCategoryPodcasts,
    getAllSubCategoryPodcasts,
    getSubCategoryPodcastsByCategory,
    getSubCategoryPodcastsById,
    isSubCategoryPodcastsUnique,
    updateSubCategoryPodcasts,
    deleteSubCategoryPodcasts,
    categoryExists,
    subcategoryExists
};