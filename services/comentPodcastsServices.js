const comentPodcastModel = require('../model/ComentPodcasts');
const podcastModel = require('../model/podcats');
const { getUserById } = require('../model/User');

// Crear nuevo comentario
const createComentPodcastService = async (comentData, userId) => {
    try {
        // Validaciones de negocio
        if (!comentData.coment_podcast_text || comentData.coment_podcast_text.trim().length === 0) {
            throw new Error('El texto del comentario es obligatorio');
        }

        if (comentData.coment_podcast_text.trim().length < 3) {
            throw new Error('El comentario debe tener al menos 3 caracteres');
        }

        if (comentData.coment_podcast_text.trim().length > 1000) {
            throw new Error('El comentario no puede exceder 1000 caracteres');
        }

        // Verificar que el podcast existe
        if (!comentData.podcast_id) {
            throw new Error('El ID del podcast es obligatorio');
        }

        const podcast = await podcastModel.getPodcastById(comentData.podcast_id);
        if (!podcast) {
            throw new Error('El podcast no existe');
        }

        // Verificar que el usuario existe
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Si hay un parent_comment_id, validar que el comentario padre existe
        if (comentData.parent_comment_id) {
            const parentComment = await comentPodcastModel.getComentPodcastById(comentData.parent_comment_id);
            if (!parentComment) {
                throw new Error('El comentario padre no existe');
            }
            if (parentComment.podcast_id !== comentData.podcast_id) {
                throw new Error('El comentario padre debe pertenecer al mismo podcast');
            }
        }

        // Crear el comentario
        const comentDataToSave = {
            coment_podcast_text: comentData.coment_podcast_text.trim(),
            podcast_id: comentData.podcast_id,
            user_id: userId,
            parent_comment_id: comentData.parent_comment_id || null
        };

        const comment = await comentPodcastModel.createComentPodcast(comentDataToSave);
        
        // Obtener información completa del comentario creado
        const commentWithDetails = await comentPodcastModel.getComentPodcastById(comment.coment_podcast_id);
        
        return {
            success: true,
            message: 'Comentario creado exitosamente',
            data: commentWithDetails
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener comentarios de un podcast
const getComentPodcastsByPodcastIdService = async (podcastId) => {
    try {
        if (!podcastId) {
            throw new Error('ID del podcast es requerido');
        }

        // Verificar que el podcast existe
        const podcast = await podcastModel.getPodcastById(podcastId);
        if (!podcast) {
            throw new Error('Podcast no encontrado');
        }

        const comments = await comentPodcastModel.getComentPodcastsByPodcastId(podcastId);
        
        return {
            success: true,
            message: 'Comentarios obtenidos exitosamente',
            data: comments,
            count: comments.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener comentarios en estructura de árbol
const getComentPodcastsTreeService = async (podcastId) => {
    try {
        if (!podcastId) {
            throw new Error('ID del podcast es requerido');
        }

        // Verificar que el podcast existe
        const podcast = await podcastModel.getPodcastById(podcastId);
        if (!podcast) {
            throw new Error('Podcast no encontrado');
        }

        const commentsTree = await comentPodcastModel.getComentPodcastsTree(podcastId);
        
        return {
            success: true,
            message: 'Comentarios en árbol obtenidos exitosamente',
            data: commentsTree,
            count: commentsTree.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener comentario por ID
const getComentPodcastByIdService = async (commentId) => {
    try {
        if (!commentId) {
            throw new Error('ID del comentario es requerido');
        }

        const comment = await comentPodcastModel.getComentPodcastById(commentId);
        
        if (!comment) {
            throw new Error('Comentario no encontrado');
        }
        
        return {
            success: true,
            message: 'Comentario obtenido exitosamente',
            data: comment
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener comentarios por usuario
const getComentPodcastsByUserIdService = async (userId) => {
    try {
        if (!userId) {
            throw new Error('ID del usuario es requerido');
        }

        // Verificar que el usuario existe
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const comments = await comentPodcastModel.getComentPodcastsByUserId(userId);
        
        return {
            success: true,
            message: 'Comentarios del usuario obtenidos exitosamente',
            data: comments,
            count: comments.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Obtener todos los comentarios (para administración)
const getAllComentPodcastsService = async (filters = {}) => {
    try {
        const comments = await comentPodcastModel.getAllComentPodcasts(filters);
        
        return {
            success: true,
            message: 'Comentarios obtenidos exitosamente',
            data: comments,
            count: comments.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Actualizar comentario
const updateComentPodcastService = async (commentId, comentData, userId) => {
    try {
        // Validaciones de negocio
        if (comentData.coment_podcast_text !== undefined) {
            if (comentData.coment_podcast_text.trim().length === 0) {
                throw new Error('El texto del comentario no puede estar vacío');
            }

            if (comentData.coment_podcast_text.trim().length < 3) {
                throw new Error('El comentario debe tener al menos 3 caracteres');
            }

            if (comentData.coment_podcast_text.trim().length > 1000) {
                throw new Error('El comentario no puede exceder 1000 caracteres');
            }
        }

        // Verificar que el comentario existe
        const existingComment = await comentPodcastModel.getComentPodcastById(commentId);
        if (!existingComment) {
            throw new Error('Comentario no encontrado');
        }

        // Verificar que el usuario es el autor del comentario
        if (existingComment.user_id !== userId) {
            throw new Error('No tienes permisos para modificar este comentario');
        }

        const updateData = {};
        if (comentData.coment_podcast_text !== undefined) {
            updateData.coment_podcast_text = comentData.coment_podcast_text.trim();
        }

        const updatedComment = await comentPodcastModel.updateComentPodcast(commentId, updateData, userId);
        
        // Obtener información actualizada completa
        const commentWithDetails = await comentPodcastModel.getComentPodcastById(commentId);
        
        return {
            success: true,
            message: 'Comentario actualizado exitosamente',
            data: commentWithDetails
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Actualizar estado del comentario (moderación)
const updateComentPodcastStatusService = async (commentId, status, userId) => {
    try {
        // Validar que el status sea booleano
        if (typeof status !== 'boolean') {
            throw new Error('El estado debe ser true o false');
        }

        // Verificar que el comentario existe
        const existingComment = await comentPodcastModel.getComentPodcastById(commentId);
        if (!existingComment) {
            throw new Error('Comentario no encontrado');
        }

        // Verificar permisos de administrador (debe venir de roleAuthorization en el controlador)
        // Aquí solo verificamos que el usuario existe
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const updatedComment = await comentPodcastModel.updateComentPodcastStatus(commentId, status);
        
        return {
            success: true,
            message: `Comentario ${status ? 'aprobado' : 'ocultado'} exitosamente`,
            data: updatedComment
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Eliminar comentario
const deleteComentPodcastService = async (commentId, userId) => {
    try {
        // Verificar que el comentario existe
        const existingComment = await comentPodcastModel.getComentPodcastById(commentId);
        if (!existingComment) {
            throw new Error('Comentario no encontrado');
        }

        // Verificar que el usuario es el autor del comentario
        if (existingComment.user_id !== userId) {
            throw new Error('No tienes permisos para eliminar este comentario');
        }

        const deletedComment = await comentPodcastModel.deleteComentPodcast(commentId, userId);
        
        return {
            success: true,
            message: 'Comentario eliminado exitosamente',
            data: deletedComment
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Eliminar comentario (solo para administradores)
const deleteComentPodcastByAdminService = async (commentId) => {
    try {
        // Verificar que el comentario existe
        const existingComment = await comentPodcastModel.getComentPodcastById(commentId);
        if (!existingComment) {
            throw new Error('Comentario no encontrado');
        }

        const deletedComment = await comentPodcastModel.deleteComentPodcastByAdmin(commentId);
        
        return {
            success: true,
            message: 'Comentario eliminado por administrador exitosamente',
            data: deletedComment
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener conteo de comentarios de un podcast
const getComentPodcastCountService = async (podcastId) => {
    try {
        if (!podcastId) {
            throw new Error('ID del podcast es requerido');
        }

        const count = await comentPodcastModel.getComentPodcastCount(podcastId);
        
        return {
            success: true,
            message: 'Conteo de comentarios obtenido exitosamente',
            data: { count },
            count: count
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: { count: 0 },
            count: 0
        };
    }
};

module.exports = {
    createComentPodcastService,
    getComentPodcastsByPodcastIdService,
    getComentPodcastsTreeService,
    getComentPodcastByIdService,
    getComentPodcastsByUserIdService,
    getAllComentPodcastsService,
    updateComentPodcastService,
    updateComentPodcastStatusService,
    deleteComentPodcastService,
    deleteComentPodcastByAdminService,
    getComentPodcastCountService
};

