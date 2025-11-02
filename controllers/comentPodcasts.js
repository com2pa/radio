const comentPodcastsRouter = require('express').Router();
const comentPodcastsServices = require('../services/comentPodcastsServices');
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const systemLogger = require('../help/system/systemLogger');
const { activityLogger } = require('../middleware/activityLogger');
const webSocketService = require('../services/websocketService');
const podcastModel = require('../model/podcats');

// Middleware para log de peticiones
const logRequest = (req, res, next) => {
    console.log(`[COMENT PODCASTS] ${req.method} ${req.originalUrl} - User: ${req.user?.user_id || 'No auth'}`);
    next();
};

comentPodcastsRouter.use(logRequest);

// POST - Crear un nuevo comentario (requiere autenticación)
comentPodcastsRouter.post('/create', userExtractor, async (req, res) => {
    try {
        const userId = req.user._id;
        const comentData = req.body;

        // Validar datos básicos en el controlador
        if (!comentData.podcast_id) {
            return res.status(400).json({
                success: false,
                message: 'El ID del podcast es requerido'
            });
        }

        if (!comentData.coment_podcast_text) {
            return res.status(400).json({
                success: false,
                message: 'El texto del comentario es requerido'
            });
        }

        const result = await comentPodcastsServices.createComentPodcastService(comentData, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar creación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'create', 
                'comment_podcast', 
                result.data?.coment_podcast_id, 
                req, 
                { 
                    podcast_id: comentData.podcast_id,
                    has_parent: !!comentData.parent_comment_id
                }
            );

            // ✅ WEBSOCKET: Notificar nuevo comentario en tiempo real
            try {
                // Obtener información del podcast para incluir en la notificación
                const podcast = await podcastModel.getPodcastById(comentData.podcast_id);
                
                // Preparar datos del comentario para WebSocket
                const commentForWebSocket = {
                    ...result.data,
                    podcast_title: podcast?.podcast_title || null
                };

                // Enviar notificación WebSocket
                webSocketService.notifyNewComment(commentForWebSocket);

                // Actualizar conteo de comentarios en tiempo real
                const commentCount = await comentPodcastsServices.getComentPodcastCountService(comentData.podcast_id);
                if (commentCount.success) {
                    webSocketService.broadcastCommentCount(comentData.podcast_id, commentCount.count);
                }
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket:', wsError);
                // No fallar la operación si WebSocket falla
            }
        } else {
            // ✅ LOG: Registrar error en creación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error creando comentario', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Error creando comentario:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico creando comentario', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener comentarios de un podcast (público)
comentPodcastsRouter.get('/podcast/:podcastId', async (req, res) => {
    try {
        const { podcastId } = req.params;
        const podcastIdInt = parseInt(podcastId);

        if (isNaN(podcastIdInt)) {
            return res.status(400).json({
                success: false,
                message: 'ID de podcast inválido'
            });
        }

        const result = await comentPodcastsServices.getComentPodcastsByPodcastIdService(podcastIdInt);
        
        // ✅ LOG: Registrar lectura
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'comment_podcast', 
            null, 
            req, 
            { 
                podcast_id: podcastIdInt,
                count: result.count || 0 
            }
        );
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo comentarios del podcast:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener comentarios en estructura de árbol (público)
comentPodcastsRouter.get('/podcast/:podcastId/tree', async (req, res) => {
    try {
        const { podcastId } = req.params;
        const podcastIdInt = parseInt(podcastId);

        if (isNaN(podcastIdInt)) {
            return res.status(400).json({
                success: false,
                message: 'ID de podcast inválido'
            });
        }

        const result = await comentPodcastsServices.getComentPodcastsTreeService(podcastIdInt);
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo árbol de comentarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener comentario por ID (público)
comentPodcastsRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de comentario inválido'
            });
        }

        const result = await comentPodcastsServices.getComentPodcastByIdService(commentId);
        
        if (result.success) {
            // ✅ LOG: Registrar lectura específica
            await systemLogger.logCrudAction(
                req.user, 
                'read', 
                'comment_podcast', 
                commentId, 
                req
            );
        }
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo comentario por ID:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener comentarios del usuario autenticado
comentPodcastsRouter.get('/user/my-comments', userExtractor, async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await comentPodcastsServices.getComentPodcastsByUserIdService(userId);
        
        // ✅ LOG: Registrar lectura de comentarios del usuario
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'comment_podcast', 
            null, 
            req, 
            { 
                user_comments: true,
                count: result.count || 0 
            }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo comentarios del usuario:', error);
        
        // ✅ LOG: Registrar error
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error obteniendo comentarios del usuario', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener todos los comentarios (solo administradores)
comentPodcastsRouter.get('/admin/all', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    try {
        const filters = req.query;
        const result = await comentPodcastsServices.getAllComentPodcastsService(filters);
        
        // ✅ LOG: Registrar lectura administrativa
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'comment_podcast', 
            null, 
            req, 
            { 
                admin_view: true,
                filters,
                count: result.count || 0 
            }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo todos los comentarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Obtener conteo de comentarios de un podcast (público)
comentPodcastsRouter.get('/podcast/:podcastId/count', async (req, res) => {
    try {
        const { podcastId } = req.params;
        const podcastIdInt = parseInt(podcastId);

        if (isNaN(podcastIdInt)) {
            return res.status(400).json({
                success: false,
                message: 'ID de podcast inválido'
            });
        }

        const result = await comentPodcastsServices.getComentPodcastCountService(podcastIdInt);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo conteo de comentarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// PUT - Actualizar comentario (solo el autor)
comentPodcastsRouter.put('/:id', userExtractor, async (req, res) => {
    try {
        const { id } = req.params;
        const { body, user } = req;
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de comentario inválido'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const result = await comentPodcastsServices.updateComentPodcastService(commentId, body, user._id);
        
        if (result.success) {
            // ✅ LOG: Registrar actualización exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'comment_podcast', 
                commentId, 
                req, 
                { 
                    changes: Object.keys(body)
                }
            );

            // ✅ WEBSOCKET: Notificar actualización de comentario en tiempo real
            try {
                webSocketService.notifyCommentUpdated(result.data);
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket:', wsError);
                // No fallar la operación si WebSocket falla
            }
        } else {
            // ✅ LOG: Registrar error en actualización
            await systemLogger.logSystemError(
                user._id, 
                req, 
                'Error actualizando comentario', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        activityLogger(req, res, 'update', 'comment_podcast', result.success ? 'Comentario actualizado exitosamente' : `Error al actualizar comentario: ${result.message}`);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error actualizando comentario:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico actualizando comentario', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// PATCH - Actualizar estado del comentario (moderación - solo administradores)
comentPodcastsRouter.patch('/:id/status', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { user } = req;
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de comentario inválido'
            });
        }

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo "status" es requerido y debe ser booleano'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const result = await comentPodcastsServices.updateComentPodcastStatusService(commentId, status, user._id);
        
        if (result.success) {
            // ✅ LOG: Registrar cambio de estado
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'comment_podcast', 
                commentId, 
                req, 
                { 
                    status_change: status,
                    action: 'moderation'
                }
            );

            // ✅ WEBSOCKET: Notificar cambio de estado de comentario en tiempo real
            try {
                webSocketService.notifyCommentStatusChanged(result.data, status);
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket:', wsError);
                // No fallar la operación si WebSocket falla
            }
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error actualizando estado del comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// DELETE - Eliminar comentario (solo el autor)
comentPodcastsRouter.delete('/:id', userExtractor, async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de comentario inválido'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        const result = await comentPodcastsServices.deleteComentPodcastService(commentId, user._id);
        
        if (result.success) {
            // ✅ LOG: Registrar eliminación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'delete', 
                'comment_podcast', 
                commentId, 
                req
            );

            // ✅ WEBSOCKET: Notificar eliminación de comentario en tiempo real
            try {
                webSocketService.notifyCommentDeleted(result.data);
                
                // Actualizar conteo de comentarios en tiempo real
                const commentCount = await comentPodcastsServices.getComentPodcastCountService(result.data.podcast_id);
                if (commentCount.success) {
                    webSocketService.broadcastCommentCount(result.data.podcast_id, commentCount.count);
                }
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket:', wsError);
                // No fallar la operación si WebSocket falla
            }
        } else {
            // ✅ LOG: Registrar error en eliminación
            await systemLogger.logSystemError(
                user._id, 
                req, 
                'Error eliminando comentario', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        activityLogger(req, res, 'delete', 'comment_podcast', result.success ? 'Comentario eliminado exitosamente' : `Error al eliminar comentario: ${result.message}`);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico eliminando comentario', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// DELETE - Eliminar comentario (solo administradores)
comentPodcastsRouter.delete('/admin/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de comentario inválido'
            });
        }

        const result = await comentPodcastsServices.deleteComentPodcastByAdminService(commentId);
        
        if (result.success) {
            // ✅ LOG: Registrar eliminación administrativa
            await systemLogger.logCrudAction(
                req.user, 
                'delete', 
                'comment_podcast', 
                commentId, 
                req,
                {
                    admin_delete: true
                }
            );

            // ✅ WEBSOCKET: Notificar eliminación de comentario por admin en tiempo real
            try {
                webSocketService.notifyCommentDeleted(result.data);
                
                // Actualizar conteo de comentarios en tiempo real
                const commentCount = await comentPodcastsServices.getComentPodcastCountService(result.data.podcast_id);
                if (commentCount.success) {
                    webSocketService.broadcastCommentCount(result.data.podcast_id, commentCount.count);
                }
            } catch (wsError) {
                console.error('Error enviando notificación WebSocket:', wsError);
                // No fallar la operación si WebSocket falla
            }
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error eliminando comentario (admin):', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico eliminando comentario (admin)', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET - Endpoint para estadísticas de WebSocket de comentarios
comentPodcastsRouter.get('/websocket/stats', async (req, res) => {
    try {
        const stats = webSocketService.getConnectionStats();
        
        // Obtener estadísticas adicionales de salas de podcasts
        const io = req.app.get('io');
        if (io) {
            const podcastRooms = {};
            const rooms = io.sockets.adapter.rooms;
            
            // Filtrar salas de podcasts (formato: podcast-{id})
            for (const [roomName, room] of rooms.entries()) {
                if (roomName.startsWith('podcast-')) {
                    const podcastId = roomName.replace('podcast-', '');
                    podcastRooms[podcastId] = room.size;
                }
            }
            
            stats.podcast_rooms = podcastRooms;
        }
        
        return res.status(200).json({
            success: true,
            data: stats,
            message: 'Estadísticas de WebSocket obtenidas exitosamente'
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de WebSocket:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = comentPodcastsRouter;

