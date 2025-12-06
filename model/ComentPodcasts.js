const { pool } = require('../db/index');

// Crear tabla de comentarios de podcasts
const createComentPodcastsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS coment_podcasts (
            coment_podcast_id SERIAL PRIMARY KEY,
            coment_podcast_text TEXT NOT NULL,
            podcast_id INT NOT NULL,
            user_id INT NOT NULL,
            parent_comment_id INT NULL,
            coment_podcast_status BOOLEAN DEFAULT TRUE,
            coment_podcast_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            coment_podcast_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_podcast
                FOREIGN KEY(podcast_id) 
                REFERENCES podcasts(podcast_id)
                ON DELETE CASCADE,
            CONSTRAINT fk_user
                FOREIGN KEY(user_id) 
                REFERENCES users(user_id)
                ON DELETE CASCADE,
            CONSTRAINT fk_parent_comment
                FOREIGN KEY(parent_comment_id) 
                REFERENCES coment_podcasts(coment_podcast_id)
                ON DELETE CASCADE
        )
    `;
     
    try {
        await pool.query(query);
        console.log('✅ Tabla "coment_podcasts" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla coment_podcasts:', error);
    }
};

// CREATE - Crear un nuevo comentario
const createComentPodcast = async (comentData) => {
    const {
        coment_podcast_text,
        podcast_id,
        user_id,
        parent_comment_id
    } = comentData;

    // Validar que el texto no esté vacío
    if (!coment_podcast_text || coment_podcast_text.trim().length === 0) {
        throw new Error('El texto del comentario no puede estar vacío');
    }

    // Si hay un parent_comment_id, validar que el comentario padre pertenezca al mismo podcast
    if (parent_comment_id) {
        const parentComment = await getComentPodcastById(parent_comment_id);
        if (!parentComment) {
            throw new Error('El comentario padre no existe');
        }
        if (parentComment.podcast_id !== podcast_id) {
            throw new Error('El comentario padre debe pertenecer al mismo podcast');
        }
    }

    const query = `
        INSERT INTO coment_podcasts (
            coment_podcast_text, 
            podcast_id, 
            user_id, 
            parent_comment_id
        ) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
    `;
    
    const values = [
        coment_podcast_text.trim(),
        podcast_id,
        user_id,
        parent_comment_id || null
    ];

    try {
        const result = await pool.query(query, values);
        console.log('✅ Comentario creado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando comentario:', error);
        throw error;
    }
};

// READ - Obtener todos los comentarios de un podcast
const getComentPodcastsByPodcastId = async (podcastId) => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM coment_podcasts cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.podcast_id = $1 
        AND cp.coment_podcast_status = TRUE
        ORDER BY cp.coment_podcast_created_at ASC
    `;
    
    try {
        const result = await pool.query(query, [podcastId]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo comentarios del podcast:', error);
        throw error;
    }
};

// READ - Obtener comentarios con sus respuestas (árbol de comentarios)
const getComentPodcastsTree = async (podcastId) => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM coment_podcasts cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.podcast_id = $1 
        AND cp.coment_podcast_status = TRUE
        ORDER BY cp.coment_podcast_created_at ASC
    `;
    
    try {
        const result = await pool.query(query, [podcastId]);
        const comments = result.rows;
        
        // Organizar comentarios en árbol (comentarios principales y sus respuestas)
        const commentsMap = new Map();
        const rootComments = [];
        
        comments.forEach(comment => {
            commentsMap.set(comment.coment_podcast_id, { ...comment, replies: [] });
        });
        
        comments.forEach(comment => {
            if (comment.parent_comment_id) {
                const parent = commentsMap.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies.push(commentsMap.get(comment.coment_podcast_id));
                }
            } else {
                rootComments.push(commentsMap.get(comment.coment_podcast_id));
            }
        });
        
        return rootComments;
    } catch (error) {
        console.error('❌ Error obteniendo árbol de comentarios:', error);
        throw error;
    }
};

// READ - Obtener un comentario por ID
const getComentPodcastById = async (id) => {
    const query = `
        SELECT 
            cp.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM coment_podcasts cp
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.coment_podcast_id = $1
    `;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error obteniendo comentario por ID:', error);
        throw error;
    }
};

// READ - Obtener comentarios por usuario
const getComentPodcastsByUserId = async (userId) => {
    const query = `
        SELECT 
            cp.*,
            p.podcast_title,
            u.user_name,
            u.user_lastname
        FROM coment_podcasts cp
        LEFT JOIN podcasts p ON cp.podcast_id = p.podcast_id
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE cp.user_id = $1
        ORDER BY cp.coment_podcast_created_at DESC
    `;
    
    try {
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo comentarios por usuario:', error);
        throw error;
    }
};

// READ - Obtener todos los comentarios (para administración)
const getAllComentPodcasts = async (filters = {}) => {
    let query = `
        SELECT 
            cp.*,
            p.podcast_title,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM coment_podcasts cp
        LEFT JOIN podcasts p ON cp.podcast_id = p.podcast_id
        LEFT JOIN users u ON cp.user_id = u.user_id
        WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    // Filtros opcionales
    if (filters.podcast_id) {
        paramCount++;
        query += ` AND cp.podcast_id = $${paramCount}`;
        values.push(filters.podcast_id);
    }

    if (filters.user_id) {
        paramCount++;
        query += ` AND cp.user_id = $${paramCount}`;
        values.push(filters.user_id);
    }

    if (filters.status !== undefined) {
        paramCount++;
        query += ` AND cp.coment_podcast_status = $${paramCount}`;
        values.push(filters.status);
    }

    query += ` ORDER BY cp.coment_podcast_created_at DESC`;

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo todos los comentarios:', error);
        throw error;
    }
};

// UPDATE - Actualizar un comentario
const updateComentPodcast = async (id, comentData, userId) => {
    const {
        coment_podcast_text
    } = comentData;

    // Verificar que el comentario existe
    const existingComment = await getComentPodcastById(id);
    if (!existingComment) {
        throw new Error('Comentario no encontrado');
    }

    // Verificar que el usuario es el dueño del comentario
    if (existingComment.user_id !== userId) {
        throw new Error('No tienes permisos para modificar este comentario');
    }

    // Validar que el texto no esté vacío
    if (!coment_podcast_text || coment_podcast_text.trim().length === 0) {
        throw new Error('El texto del comentario no puede estar vacío');
    }

    const query = `
        UPDATE coment_podcasts 
        SET 
            coment_podcast_text = $1,
            coment_podcast_updated_at = CURRENT_TIMESTAMP
        WHERE coment_podcast_id = $2
        RETURNING *
    `;
    
    const values = [
        coment_podcast_text.trim(),
        id
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Comentario no encontrado');
        }
        console.log('✅ Comentario actualizado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando comentario:', error);
        throw error;
    }
};

// UPDATE - Actualizar estado del comentario (moderación)
const updateComentPodcastStatus = async (id, status) => {
    const query = `
        UPDATE coment_podcasts 
        SET 
            coment_podcast_status = $1,
            coment_podcast_updated_at = CURRENT_TIMESTAMP
        WHERE coment_podcast_id = $2
        RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [status, id]);
        if (result.rows.length === 0) {
            throw new Error('Comentario no encontrado');
        }
        console.log('✅ Estado del comentario actualizado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando estado del comentario:', error);
        throw error;
    }
};

// DELETE - Eliminar un comentario
const deleteComentPodcast = async (id, userId) => {
    // Verificar que el comentario existe
    const existingComment = await getComentPodcastById(id);
    if (!existingComment) {
        throw new Error('Comentario no encontrado');
    }

    // Verificar que el usuario es el dueño del comentario o es admin
    // Nota: Asumiendo que tienes una función para verificar roles. Si no, puedes ajustar esta lógica.
    if (existingComment.user_id !== userId) {
        throw new Error('No tienes permisos para eliminar este comentario');
    }

    const query = `DELETE FROM coment_podcasts WHERE coment_podcast_id = $1 RETURNING *`;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Comentario no encontrado');
        }
        console.log('✅ Comentario eliminado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando comentario:', error);
        throw error;
    }
};

// DELETE - Eliminar comentario (solo para administradores)
const deleteComentPodcastByAdmin = async (id) => {
    const query = `DELETE FROM coment_podcasts WHERE coment_podcast_id = $1 RETURNING *`;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Comentario no encontrado');
        }
        console.log('✅ Comentario eliminado por administrador exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando comentario:', error);
        throw error;
    }
};

// Función para obtener el conteo de comentarios de un podcast
const getComentPodcastCount = async (podcastId) => {
    const query = `
        SELECT COUNT(*) as count
        FROM coment_podcasts
        WHERE podcast_id = $1 
        AND coment_podcast_status = TRUE
    `;
    
    try {
        const result = await pool.query(query, [podcastId]);
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error('❌ Error obteniendo conteo de comentarios:', error);
        throw error;
    }
};

// Inicializar tabla de forma asíncrona con retries
const initializeComentPodcastsTable = async () => {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar a podcasts y users
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createComentPodcastsTable();
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tabla coment_podcasts (intento ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudo inicializar la tabla coment_podcasts después de varios intentos');
            }
        }
    }
};

setImmediate(() => {
    initializeComentPodcastsTable().catch(() => {});
});

module.exports = {
    createComentPodcastsTable,
    createComentPodcast,
    getComentPodcastsByPodcastId,
    getComentPodcastsTree,
    getComentPodcastById,
    getComentPodcastsByUserId,
    getAllComentPodcasts,
    updateComentPodcast,
    updateComentPodcastStatus,
    deleteComentPodcast,
    deleteComentPodcastByAdmin,
    getComentPodcastCount
};

