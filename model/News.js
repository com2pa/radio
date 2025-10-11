const { pool } = require('../db/index');

// Crear tabla de noticias
const createNewsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS news (
            news_id SERIAL PRIMARY KEY,
            news_title VARCHAR(255) NOT NULL,
            news_subtitle VARCHAR(500),
            news_content TEXT NOT NULL,
            news_image VARCHAR(255) CHECK (news_image ~ '\.(jpg|png)$'),
            news_status BOOLEAN DEFAULT TRUE,
            news_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            news_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INT NOT NULL,
            subcategory_id INT NOT NULL,
            CONSTRAINT fk_user
                FOREIGN KEY(user_id) 
                REFERENCES users(user_id)
                ON DELETE CASCADE,
            CONSTRAINT fk_subcategory
                FOREIGN KEY(subcategory_id) 
                REFERENCES subcategories(subcategory_id)
                ON DELETE RESTRICT
        )
    `;
     
    try {
        await pool.query(query);
        console.log('✅ Tabla "news" creada/verificada exitosamente');
        
        // Verificar si la columna subcategory_id existe, si no, agregarla
        await addSubcategoryColumnIfNotExists();
    } catch (error) {
        console.error('❌ Error creando tabla news:', error);
    }
};

// Función para agregar la columna subcategory_id si no existe
const addSubcategoryColumnIfNotExists = async () => {
    try {
        // Verificar si la columna existe
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'news' AND column_name = 'subcategory_id'
        `;
        
        const result = await pool.query(checkColumnQuery);
        
        if (result.rows.length === 0) {
            console.log('🔧 Agregando columna subcategory_id a la tabla news...');
            
            // Agregar la columna
            const addColumnQuery = `
                ALTER TABLE news 
                ADD COLUMN subcategory_id INT DEFAULT 1
            `;
            
            await pool.query(addColumnQuery);
            
            // Agregar la restricción de clave foránea
            const addForeignKeyQuery = `
                ALTER TABLE news 
                ADD CONSTRAINT fk_subcategory
                FOREIGN KEY(subcategory_id) 
                REFERENCES subcategories(subcategory_id)
                ON DELETE RESTRICT
            `;
            
            await pool.query(addForeignKeyQuery);
            
            console.log('✅ Columna subcategory_id agregada exitosamente');
        } else {
            console.log('✅ Columna subcategory_id ya existe');
        }
    } catch (error) {
        console.error('❌ Error agregando columna subcategory_id:', error);
    }
};

// CREATE - Crear noticia (solo usuarios con rol 'edit' pueden crear)
const createNews = async (newsData, userId) => {
    const {
        news_title,
        news_subtitle,
        news_content,
        news_image,
        subcategory_id
    } = newsData;

    // Verificar que el usuario tenga rol 'edit' o superior (edit, admin, superAdmin)
    const userCheckQuery = `
        SELECT u.user_id, r.role_name, r.role_id
        FROM users u 
        INNER JOIN roles r ON u.role_id = r.role_id 
        WHERE u.user_id = $1 AND r.role_id >= 5
    `;

    // Verificar que la subcategoría existe
    const subcategoryCheckQuery = `
        SELECT subcategory_id FROM subcategories WHERE subcategory_id = $1
    `;

    try {
        console.log('📰 Verificando permisos para usuario:', userId);
        
        // Verificar permisos del usuario
        const userResult = await pool.query(userCheckQuery, [userId]);
        console.log('📰 Resultado de verificación de usuario:', userResult.rows);
        
        if (userResult.rows.length === 0) {
            throw new Error('Solo usuarios con rol "edit" o superior pueden crear noticias');
        }

        // Verificar que la subcategoría existe
        const subcategoryResult = await pool.query(subcategoryCheckQuery, [subcategory_id]);
        if (subcategoryResult.rows.length === 0) {
            throw new Error('La subcategoría especificada no existe');
        }

        // Validar extensión de imagen
        if (news_image && !/\.(jpg|png)$/i.test(news_image)) {
            throw new Error('La imagen debe tener extensión .jpg o .png');
        }

        const query = `
            INSERT INTO news (
                news_title, news_subtitle, news_content, news_image, user_id, subcategory_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            news_title,
            news_subtitle,
            news_content,
            news_image,
            userId,
            subcategory_id
        ]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error creating news: ${error.message}`);
    }
};

// READ - Obtener todas las noticias con información del autor y subcategoría
const getAllNews = async () => {
    const query = `
        SELECT 
            n.news_id,
            n.news_title,
            n.news_subtitle,
            n.news_content,
            n.news_image,
            n.news_status,
            n.news_created_at,
            n.news_updated_at,
            u.user_id,
            u.user_name,
            u.user_lastname,
            u.user_email,
            r.role_name,
            s.subcategory_id,
            s.subcategory_name,
            c.category_id,
            c.category_name
        FROM news n
        INNER JOIN users u ON n.user_id = u.user_id
        INNER JOIN roles r ON u.role_id = r.role_id
        INNER JOIN subcategories s ON n.subcategory_id = s.subcategory_id
        INNER JOIN category_news c ON s.category_id = c.category_id
        WHERE n.news_status = TRUE
        ORDER BY n.news_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting news: ${error.message}`);
    }
};

// READ - Obtener noticia por ID con información del autor y subcategoría
const getNewsById = async (id) => {
    const query = `
        SELECT 
            n.news_id,
            n.news_title,
            n.news_subtitle,
            n.news_content,
            n.news_image,
            n.news_status,
            n.news_created_at,
            n.news_updated_at,
            u.user_id,
            u.user_name,
            u.user_lastname,
            u.user_email,
            r.role_name,
            s.subcategory_id,
            s.subcategory_name,
            c.category_id,
            c.category_name
        FROM news n
        INNER JOIN users u ON n.user_id = u.user_id
        INNER JOIN roles r ON u.role_id = r.role_id
        INNER JOIN subcategories s ON n.subcategory_id = s.subcategory_id
        INNER JOIN category_news c ON s.category_id = c.category_id
        WHERE n.news_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting news by id: ${error.message}`);
    }
};

// READ - Obtener noticias por usuario (autor)
const getNewsByUser = async (userId) => {
    const query = `
        SELECT 
            n.news_id,
            n.news_title,
            n.news_subtitle,
            n.news_content,
            n.news_image,
            n.news_status,
            n.news_created_at,
            n.news_updated_at,
            s.subcategory_id,
            s.subcategory_name,
            c.category_name
        FROM news n
        INNER JOIN subcategories s ON n.subcategory_id = s.subcategory_id
        INNER JOIN category_news c ON s.category_id = c.category_id
        WHERE n.user_id = $1
        ORDER BY n.news_created_at DESC
    `;
    try {
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting news by user: ${error.message}`);
    }
};

// READ - Obtener noticias por subcategoría
const getNewsBySubcategory = async (subcategoryId) => {
    const query = `
        SELECT 
            n.news_id,
            n.news_title,
            n.news_subtitle,
            n.news_content,
            n.news_image,
            n.news_status,
            n.news_created_at,
            n.news_updated_at,
            u.user_name,
            u.user_lastname,
            s.subcategory_name,
            c.category_name
        FROM news n
        INNER JOIN users u ON n.user_id = u.user_id
        INNER JOIN subcategories s ON n.subcategory_id = s.subcategory_id
        INNER JOIN category_news c ON s.category_id = c.category_id
        WHERE n.subcategory_id = $1 AND n.news_status = TRUE
        ORDER BY n.news_created_at DESC
    `;
    try {
        const result = await pool.query(query, [subcategoryId]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting news by subcategory: ${error.message}`);
    }
};

// READ - Obtener noticias por categoría
const getNewsByCategory = async (categoryId) => {
    const query = `
        SELECT 
            n.news_id,
            n.news_title,
            n.news_subtitle,
            n.news_content,
            n.news_image,
            n.news_status,
            n.news_created_at,
            n.news_updated_at,
            u.user_name,
            u.user_lastname,
            s.subcategory_name,
            c.category_name
        FROM news n
        INNER JOIN users u ON n.user_id = u.user_id
        INNER JOIN subcategories s ON n.subcategory_id = s.subcategory_id
        INNER JOIN category_news c ON s.category_id = c.category_id
        WHERE c.category_id = $1 AND n.news_status = TRUE
        ORDER BY n.news_created_at DESC
    `;
    try {
        const result = await pool.query(query, [categoryId]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting news by category: ${error.message}`);
    }
};

// UPDATE - Actualizar noticia (solo el autor o admin/superAdmin pueden actualizar)
const updateNews = async (id, newsData, userId) => {
    const {
        news_title,
        news_subtitle,
        news_content,
        news_image,
        news_status,
        subcategory_id
    } = newsData;

    // Verificar permisos: el autor o admin/superAdmin pueden actualizar
    const permissionQuery = `
        SELECT 
            n.user_id as news_author,
            r.role_name,
            r.role_id
        FROM news n
        INNER JOIN users u ON u.user_id = $2
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE n.news_id = $1 AND (n.user_id = $2 OR r.role_id >= 6)
    `;

    // Verificar que la subcategoría existe (si se está actualizando)
    const subcategoryCheckQuery = `
        SELECT subcategory_id FROM subcategories WHERE subcategory_id = $1
    `;

    try {
        // Verificar permisos
        const permissionResult = await pool.query(permissionQuery, [id, userId]);
        if (permissionResult.rows.length === 0) {
            throw new Error('No tienes permisos para actualizar esta noticia');
        }

        // Verificar que la subcategoría existe si se está actualizando
        if (subcategory_id) {
            const subcategoryResult = await pool.query(subcategoryCheckQuery, [subcategory_id]);
            if (subcategoryResult.rows.length === 0) {
                throw new Error('La subcategoría especificada no existe');
            }
        }

        // Validar extensión de imagen si se proporciona
        if (news_image && !/\.(jpg|png)$/i.test(news_image)) {
            throw new Error('La imagen debe tener extensión .jpg o .png');
        }

        // Construir query dinámica para actualizar solo los campos proporcionados
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (news_title !== undefined) {
            fields.push(`news_title = $${paramCount}`);
            values.push(news_title);
            paramCount++;
        }
        if (news_subtitle !== undefined) {
            fields.push(`news_subtitle = $${paramCount}`);
            values.push(news_subtitle);
            paramCount++;
        }
        if (news_content !== undefined) {
            fields.push(`news_content = $${paramCount}`);
            values.push(news_content);
            paramCount++;
        }
        if (news_image !== undefined) {
            fields.push(`news_image = $${paramCount}`);
            values.push(news_image);
            paramCount++;
        }
        if (news_status !== undefined) {
            fields.push(`news_status = $${paramCount}`);
            values.push(news_status);
            paramCount++;
        }
        if (subcategory_id !== undefined) {
            fields.push(`subcategory_id = $${paramCount}`);
            values.push(subcategory_id);
            paramCount++;
        }

        // Siempre actualizar la fecha de modificación
        fields.push(`news_updated_at = CURRENT_TIMESTAMP`);

        if (fields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        values.push(id);
        const query = `
            UPDATE news 
            SET ${fields.join(', ')}
            WHERE news_id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error updating news: ${error.message}`);
    }
};

// DELETE - Eliminar noticia (solo admin/superAdmin pueden eliminar)
const deleteNews = async (id, userId) => {
    // Verificar que el usuario tenga rol 'admin' o 'superAdmin'
    const permissionQuery = `
        SELECT r.role_name, r.role_id
        FROM users u 
        INNER JOIN roles r ON u.role_id = r.role_id 
        WHERE u.user_id = $1 AND r.role_id >= 6
    `;

    try {
        // Verificar permisos de administrador
        const permissionResult = await pool.query(permissionQuery, [userId]);
        if (permissionResult.rows.length === 0) {
            throw new Error('Solo administradores pueden eliminar noticias');
        }

        const query = 'DELETE FROM news WHERE news_id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error deleting news: ${error.message}`);
    }
};

// UPDATE - Cambiar estado de la noticia (activo/inactivo)
const updateNewsStatus = async (id, status, userId) => {
    // Verificar permisos: el autor o admin/superAdmin pueden cambiar estado
    const permissionQuery = `
        SELECT 
            n.user_id as news_author,
            r.role_name,
            r.role_id
        FROM news n
        INNER JOIN users u ON u.user_id = $2
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE n.news_id = $1 AND (n.user_id = $2 OR r.role_id >= 6)
    `;

    try {
        // Verificar permisos
        const permissionResult = await pool.query(permissionQuery, [id, userId]);
        if (permissionResult.rows.length === 0) {
            throw new Error('No tienes permisos para cambiar el estado de esta noticia');
        }

        const query = `
            UPDATE news 
            SET news_status = $1, 
                news_updated_at = CURRENT_TIMESTAMP
            WHERE news_id = $2
            RETURNING news_id, news_title, news_status
        `;

        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error updating news status: ${error.message}`);
    }
};

// Inicializar tabla
createNewsTable();

module.exports = {
    createNews,
    getAllNews,
    getNewsById,
    getNewsByUser,
    getNewsBySubcategory,
    getNewsByCategory,
    updateNews,
    updateNewsStatus,
    deleteNews
};