const { pool } = require('../db/index');

// Verificar si la tabla category_news existe
const verifyCategoriesTable = async () => {
    try {
        await pool.query('SELECT 1 FROM category_news LIMIT 1');
        console.log('✅ Tabla "category_news" existe');
        return true;
    } catch (error) {
        console.error('❌ Tabla "category_news" no existe o hay error de conexión');
        return false;
    }
};

// Crear tabla de subcategorías (CON RESTRICCIÓN COMPUESTA)
const createSubCategoryTable = async () => {
    const categoriesExist = await verifyCategoriesTable();
    if (!categoriesExist) {
        throw new Error('La tabla category_news no existe. Debe crearse primero.');
    }
    
    const query = ` 
        CREATE TABLE IF NOT EXISTS subcategories (
            subcategory_id SERIAL PRIMARY KEY,
            category_id INT NOT NULL,
            subcategory_name VARCHAR(100) NOT NULL,  
            subcategory_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES category_news(category_id) ON DELETE CASCADE,
            UNIQUE (category_id, subcategory_name)  -- RESTRICCIÓN COMPUESTA
        )
    `;
    
    try {
        await pool.query(query);
        console.log('✅ Tabla "subcategories" creada/verificada exitosamente');
        
        // Verificar y corregir la restricción si es necesario
        await fixUniqueConstraint();
        
    } catch (error) {
        console.error('❌ Error creando tabla subcategories:', error);
        throw error;
    }
};

// Función para corregir la restricción UNIQUE si existe la vieja
const fixUniqueConstraint = async () => {
    try {
        // Verificar si existe la restricción vieja (solo en subcategory_name)
        const checkOldConstraint = `
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'subcategories' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%subcategory_name%'
        `;
        
        const result = await pool.query(checkOldConstraint);
        
        if (result.rows.length > 0) {
            // Eliminar la restricción vieja
            await pool.query('ALTER TABLE subcategories DROP CONSTRAINT IF EXISTS subcategories_subcategory_name_key');
            console.log('✅ Restricción UNIQUE vieja eliminada');
        }
        
        // Verificar si ya existe la restricción compuesta
        const checkNewConstraint = `
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'subcategories' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%unique_subcategory_per_category%'
        `;
        
        const newResult = await pool.query(checkNewConstraint);
        
        if (newResult.rows.length === 0) {
            // Agregar la nueva restricción compuesta
            await pool.query('ALTER TABLE subcategories ADD CONSTRAINT unique_subcategory_per_category UNIQUE (category_id, subcategory_name)');
            console.log('✅ Restricción UNIQUE compuesta creada');
        }
        
    } catch (error) {
        console.error('❌ Error corrigiendo restricciones:', error);
    }
};

// Verificar si la categoría existe (YA ESTABA CORRECTO)
const categoryExists = async (category_id) => {
    const query = `SELECT COUNT(*) FROM category_news WHERE category_id = $1`;
    try {
        const result = await pool.query(query, [category_id]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando existencia de categoría:', error);
        throw error;
    }
};

// Obtener todas las subcategorías (CORREGIDO)
const getAllSubCategories = async () => {
    const query = `
        SELECT s.*, c.category_name 
        FROM subcategories s 
        JOIN category_news c ON s.category_id = c.category_id
        ORDER BY s.subcategory_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías:', error);
        throw error;
    }
};

// Obtener subcategorías por categoría específica (CORREGIDO)
const getSubCategoriesByCategory = async (category_id) => {
    const query = `
        SELECT s.*, c.category_name 
        FROM subcategories s 
        JOIN category_news c ON s.category_id = c.category_id 
        WHERE s.category_id = $1
        ORDER BY s.subcategory_name
    `;
    try {
        const result = await pool.query(query, [category_id]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías por categoría:', error);
        throw error;
    }
};

// Obtener una subcategoría por ID (CORREGIDO)
const getSubCategoryById = async (id) => {
    const query = `
        SELECT s.*, c.category_name 
        FROM subcategories s 
        JOIN category_news c ON s.category_id = c.category_id 
        WHERE s.subcategory_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error obteniendo subcategoría por ID:', error);
        throw error;
    }
};

// Función para crear una nueva subcategoría (YA ESTABA CORRECTO)
const createSubCategory = async (subcategoryData) => {
    const { category_id, subcategory_name } = subcategoryData;
    
    const query = `
        INSERT INTO subcategories (category_id, subcategory_name)
        VALUES ($1, $2)
        RETURNING *
    `;
    try {
        const result = await pool.query(query, [category_id, subcategory_name]);
        console.log('✅ Subcategoría creada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando subcategoría:', error);
        throw error;
    }
};


// Verificar que una subcategoría no se repita (YA ESTABA CORRECTO)
const isSubCategoryUnique = async (category_id, subcategory_name, exclude_id = null) => {
    let query = `
        SELECT COUNT(*) FROM subcategories 
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

// Actualizar una subcategoría (YA ESTABA CORRECTO)
const updateSubCategory = async (id, subcategoryData) => {
    const { category_id, subcategory_name } = subcategoryData;
    
    const query = `
        UPDATE subcategories
        SET category_id = $1, subcategory_name = $2
        WHERE subcategory_id = $3
        RETURNING *
    `;
    try {
        const result = await pool.query(query, [category_id, subcategory_name, id]);
        console.log('✅ Subcategoría actualizada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando subcategoría:', error);
        throw error;
    }
};

// Eliminar una subcategoría (YA ESTABA CORRECTO)
const deleteSubCategory = async (id) => {
    const query = `DELETE FROM subcategories WHERE subcategory_id = $1 RETURNING *`;
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Subcategoría no encontrada');
        }
        console.log('✅ Subcategoría eliminada exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando subcategoría:', error);
        throw error;
    }
};

// Inicializar tabla de forma asíncrona con retries
const initializeSubCategoryTable = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar a category_news
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createSubCategoryTable();
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tabla subcategories (intento ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudo inicializar la tabla subcategories después de varios intentos');
            }
        }
    }
};

setImmediate(() => {
    initializeSubCategoryTable().catch(() => {});
});

// Exportar funciones
module.exports = {
    createSubCategory,
    getAllSubCategories,
    getSubCategoriesByCategory,
    getSubCategoryById,
    isSubCategoryUnique,
    updateSubCategory,
    deleteSubCategory,
    categoryExists,
    
   
};