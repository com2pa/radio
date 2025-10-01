// podcats.js - Modelo actualizado
const { pool } = require('../db/index');
const { getUserById } = require('./User');

// Crear tabla de podcasts simplificada
// Crear tabla de podcasts CORREGIDA
const createPodcastsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS podcasts (
            podcast_id SERIAL PRIMARY KEY,
            podcast_title VARCHAR(200) NOT NULL,
            podcast_description TEXT,
            podcast_url VARCHAR(500),
            podcast_iframe VARCHAR(1000),
            podcast_subcategory_id INT REFERENCES subcategory_podcasts(subcategory_id) ON DELETE SET NULL,
            user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
            podcast_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            podcast_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            -- Validación a nivel de base de datos: al menos uno debe estar presente
            CONSTRAINT at_least_one_url_or_iframe CHECK (
                podcast_url IS NOT NULL OR podcast_iframe IS NOT NULL
            )
        )
    `;
    try {
        await pool.query(query);
        console.log('✅ Tabla "podcasts" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla podcasts:', error);
    }    
};

// Función para verificar permisos de usuario
const checkUserPermissions = async (userId, allowedRoles = ['admin', 'superAdmin', 'editor']) => {
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        if (!allowedRoles.includes(user.role_name)) {
            throw new Error('No tienes permisos para realizar esta acción');
        }
        
        return user;
    } catch (error) {
        throw new Error(`Error verificando permisos: ${error.message}`);
    }
};


// CREATE - Crear un nuevo podcast - ACTUALIZADO
const createPodcast = async (podcastData, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId);
    
    const {
        podcast_title,
        podcast_description,
        podcast_url,
        podcast_iframe,
        podcast_subcategory_id
    } = podcastData;

    // Validar que al menos URL o iframe esté presente
    if (!podcast_url && !podcast_iframe) {
        throw new Error('Debe proporcionar al menos la URL o el iframe del podcast');
    }

    const query = `
        INSERT INTO podcasts (
            podcast_title, 
            podcast_description, 
            podcast_url, 
            podcast_iframe, 
            podcast_subcategory_id,
            user_id
        ) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
    `;
    
    const values = [
        podcast_title,
        podcast_description,
        podcast_url || null,  // Si no hay URL, se guarda como NULL
        podcast_iframe || null, // Si no hay iframe, se guarda como NULL
        podcast_subcategory_id,
        userId
    ];

    try {
        const result = await pool.query(query, values);
        console.log('✅ Podcast creado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando podcast:', error);
        throw error;
    }
};
// READ - Obtener todos los podcasts con información completa de categoría
const getAllPodcasts = async (filters = {}) => {
    let query = `
        SELECT 
            p.*,
            cp.category_id,
            cp.category_name,
            sp.subcategory_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM podcasts p
        LEFT JOIN subcategory_podcasts sp ON p.podcast_subcategory_id = sp.subcategory_id
        LEFT JOIN category_podscats cp ON sp.category_id = cp.category_id  -- CORREGIDO: category_podscats
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    // Filtros opcionales
    if (filters.category_id) {
        paramCount++;
        query += ` AND cp.category_id = $${paramCount}`;
        values.push(filters.category_id);
    }

    if (filters.subcategory_id) {
        paramCount++;
        query += ` AND p.podcast_subcategory_id = $${paramCount}`;
        values.push(filters.subcategory_id);
    }

    if (filters.user_id) {
        paramCount++;
        query += ` AND p.user_id = $${paramCount}`;
        values.push(filters.user_id);
    }

    if (filters.search) {
        paramCount++;
        query += ` AND (p.podcast_title ILIKE $${paramCount} OR p.podcast_description ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
    }

    query += ` ORDER BY p.podcast_created_at DESC`;

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo podcasts:', error);
        throw error;
    }
};

// READ - Obtener un podcast por ID con información completa
const getPodcastById = async (id) => {
    const query = `
        SELECT 
            p.*,
            cp.category_id,
            cp.category_name,
            sp.subcategory_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM podcasts p
        LEFT JOIN subcategory_podcasts sp ON p.podcast_subcategory_id = sp.subcategory_id
        LEFT JOIN category_podscats cp ON sp.category_id = cp.category_id  -- CORREGIDO: category_podscats
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.podcast_id = $1
    `;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Podcast no encontrado');
        }
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error obteniendo podcast por ID:', error);
        throw error;
    }
};

// READ - Obtener podcasts por categoría (a través de subcategoría)
const getPodcastsByCategory = async (categoryId) => {
    const query = `
        SELECT 
            p.*,
            cp.category_id,
            cp.category_name,
            sp.subcategory_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM podcasts p
        LEFT JOIN subcategory_podcasts sp ON p.podcast_subcategory_id = sp.subcategory_id
        LEFT JOIN category_podscats cp ON sp.category_id = cp.category_id  -- CORREGIDO: category_podscats
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE cp.category_id = $1
        ORDER BY p.podcast_created_at DESC
    `;
    
    try {
        const result = await pool.query(query, [categoryId]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo podcasts por categoría:', error);
        throw error;
    }
};

// READ - Obtener podcasts por subcategoría
const getPodcastsBySubcategory = async (subcategoryId) => {
    const query = `
        SELECT 
            p.*,
            cp.category_id,
            cp.category_name,
            sp.subcategory_name,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM podcasts p
        LEFT JOIN subcategory_podcasts sp ON p.podcast_subcategory_id = sp.subcategory_id
        LEFT JOIN category_podscats cp ON sp.category_id = cp.category_id  -- CORREGIDO: category_podscats
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.podcast_subcategory_id = $1
        ORDER BY p.podcast_created_at DESC
    `;
    
    try {
        const result = await pool.query(query, [subcategoryId]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo podcasts por subcategoría:', error);
        throw error;
    }
};
// UPDATE - Actualizar un podcast - ACTUALIZADO
const updatePodcast = async (id, podcastData, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId);
    
    const {
        podcast_title,
        podcast_description,
        podcast_url,
        podcast_iframe,
        podcast_subcategory_id
    } = podcastData;

    // Validar que al menos URL o iframe esté presente si se están actualizando ambos
    const currentPodcast = await getPodcastById(id);
    
    const newUrl = podcast_url !== undefined ? podcast_url : currentPodcast.podcast_url;
    const newIframe = podcast_iframe !== undefined ? podcast_iframe : currentPodcast.podcast_iframe;
    
    if (!newUrl && !newIframe) {
        throw new Error('Debe mantener al menos la URL o el iframe del podcast');
    }

    const query = `
        UPDATE podcasts 
        SET 
            podcast_title = COALESCE($1, podcast_title),
            podcast_description = COALESCE($2, podcast_description),
            podcast_url = $3,
            podcast_iframe = $4,
            podcast_subcategory_id = COALESCE($5, podcast_subcategory_id),
            podcast_updated_at = CURRENT_TIMESTAMP
        WHERE podcast_id = $6
        RETURNING *
    `;
    
    const values = [
        podcast_title,
        podcast_description,
        newUrl,
        newIframe,
        podcast_subcategory_id,
        id
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Podcast no encontrado');
        }
        console.log('✅ Podcast actualizado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando podcast:', error);
        throw error;
    }
};

// DELETE - Eliminar un podcast
const deletePodcast = async (id, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId, ['admin', 'superAdmin']);
    
    const query = `DELETE FROM podcasts WHERE podcast_id = $1 RETURNING *`;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Podcast no encontrado');
        }
        console.log('✅ Podcast eliminado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando podcast:', error);
        throw error;
    }
};

// Función para verificar si el usuario es el creador del podcast o tiene permisos superiores
const canModifyPodcast = async (podcastId, userId) => {
    try {
        // Obtener información del podcast
        const podcast = await getPodcastById(podcastId);
        
        // Obtener información del usuario
        const user = await getUserById(userId);
        
        // Si el usuario es superAdmin o admin, puede modificar cualquier podcast
        if (user.role_name === 'superAdmin' || user.role_name === 'admin') {
            return true;
        }
        
        // Si el usuario es editor, solo puede modificar sus propios podcasts
        if (user.role_name === 'editor' && podcast.user_id === userId) {
            return true;
        }
        
        return false;
    } catch (error) {
        throw new Error(`Error verificando permisos de modificación: ${error.message}`);
    }
};

// UPDATE - Actualizar podcast con verificación de propiedad
const updatePodcastWithOwnership = async (id, podcastData, userId) => {
    const canModify = await canModifyPodcast(id, userId);
    if (!canModify) {
        throw new Error('No tienes permisos para modificar este podcast');
    }
    
    return await updatePodcast(id, podcastData, userId);
};

// DELETE - Eliminar podcast con verificación de propiedad
const deletePodcastWithOwnership = async (id, userId) => {
    const canModify = await canModifyPodcast(id, userId);
    if (!canModify) {
        throw new Error('No tienes permisos para eliminar este podcast');
    }
    
    return await deletePodcast(id, userId);
};

// Función para verificar si ya existe un podcast con el mismo título en la misma subcategoría
const checkDuplicatePodcast = async (podcastTitle, subcategoryId, excludePodcastId = null) => {
    let query = `
        SELECT COUNT(*) 
        FROM podcasts 
        WHERE LOWER(podcast_title) = LOWER($1) 
        AND podcast_subcategory_id = $2
    `;
    
    let params = [podcastTitle, subcategoryId];
    
    if (excludePodcastId) {
        query += ` AND podcast_id != $3`;
        params.push(excludePodcastId);
    }
    
    try {
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando duplicado de podcast:', error);
        throw error;
    }
};

// Inicializar tabla
createPodcastsTable();

module.exports = {
    createPodcastsTable,
    createPodcast,
    getAllPodcasts,
    getPodcastById,
    getPodcastsByCategory,
    getPodcastsBySubcategory,
    updatePodcast,
    updatePodcastWithOwnership,
    deletePodcast,
    deletePodcastWithOwnership,
    checkUserPermissions,
    canModifyPodcast,
    checkDuplicatePodcast
};