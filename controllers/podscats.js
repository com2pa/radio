const podscatsRouter = require('express').Router();
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const podscatsServices = require('../services/podscatsServices');
const systemLogger = require('../help/system/systemLogger');
const { activityLogger } = require('../middleware/activityLogger');

// Obtener todos los podcasts con filtros
podscatsRouter.get('/all', async (req, res) => {
    try {
        const filters = req.query;
        const result = await podscatsServices.getAllPodcastsService(filters);
        
        // ✅ LOG: Registrar lectura de podcasts
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'podcast', 
            null, 
            req, 
            { filters, count: result.data?.length || 0 }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo podcasts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo podcasts',
            details: error.message 
        });
    }
});

// Crear nuevo podcast
podscatsRouter.post('/create', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    try {
        const userId = req.user._id;
        const podcastData = req.body;
        const result = await podscatsServices.createPodcastService(podcastData, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar creación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'create', 
                'podcast', 
                result.data?.id || result.data?._id, 
                req, 
                { 
                    title: podcastData.title,
                    subcategory: podcastData.subcategoryId 
                }
            );
        } else {
            // ✅ LOG: Registrar error en creación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error creando podcast', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Error creando podcast:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico creando podcast', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error creando podcast',
            details: error.message 
        });
    }
});

// Obtener podcast por ID
podscatsRouter.get('/:id', async (req, res) => {
    try {
        const podcastId = req.params.id;
        const result = await podscatsServices.getPodcastByIdService(podcastId);
        
        if (result.success) {
            // ✅ LOG: Registrar lectura específica
            await systemLogger.logCrudAction(
                req.user, 
                'read', 
                'podcast', 
                podcastId, 
                req
            );
        }
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo podcast por ID:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo podcast',
            details: error.message 
        });
    }
});

// Obtener podcasts por subcategoría
podscatsRouter.get('/subcategory/:subcategoryId', async (req, res) => {
    try {
        const subcategoryId = req.params.subcategoryId;
        const result = await podscatsServices.getPodcastsBySubcategoryService(subcategoryId);
        
        // ✅ LOG: Registrar lectura por subcategoría
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'podcast', 
            null, 
            req, 
            { 
                subcategoryId,
                count: result.data?.length || 0 
            }
        );
        
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo podcasts por subcategoría:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo podcasts por subcategoría',
            details: error.message 
        });
    }
});

// Actualizar podcast
podscatsRouter.put('/:id', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    try {
        const podcastId = req.params.id;
        const podcastData = req.body;
        const userId = req.user._id;
        const result = await podscatsServices.updatePodcastService(podcastId, podcastData, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar actualización exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'update', 
                'podcast', 
                podcastId, 
                req, 
                { 
                    changes: Object.keys(podcastData),
                    updated_fields: podcastData 
                }
            );
        } else {
            // ✅ LOG: Registrar error en actualización
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error actualizando podcast', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        activityLogger(req, res, 'update', 'podcast', result.success ? 'Podcast actualizado exitosamente' : `Error al actualizar podcast: ${result.message}`);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error actualizando podcast:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico actualizando podcast', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error actualizando podcast',
            details: error.message 
        });
    }
});

// Eliminar podcast
podscatsRouter.delete('/:id', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    try {
        const podcastId = req.params.id;
        const userId = req.user._id;
        const result = await podscatsServices.deletePodcastService(podcastId, userId);
        
        if (result.success) {
            // ✅ LOG: Registrar eliminación exitosa
            await systemLogger.logCrudAction(
                req.user, 
                'delete', 
                'podcast', 
                podcastId, 
                req
            );
        } else {
            // ✅ LOG: Registrar error en eliminación
            await systemLogger.logSystemError(
                userId, 
                req, 
                'Error eliminando podcast', 
                new Error(result.message || 'Error desconocido')
            );
        }
        
        activityLogger(req, res, 'delete', 'podcast', result.success ? 'Podcast eliminado exitosamente' : `Error al eliminar podcast: ${result.message}`);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error eliminando podcast:', error);
        
        // ✅ LOG: Registrar error crítico
        await systemLogger.logSystemError(
            req.user?._id, 
            req, 
            'Error crítico eliminando podcast', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error eliminando podcast',
            details: error.message 
        });
    }
});

// Buscar podcasts
podscatsRouter.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const result = await podscatsServices.searchPodcastsService(query);
        
        // ✅ LOG: Registrar búsqueda
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'podcast', 
            null, 
            req, 
            { 
                search_query: query,
                results_count: result.data?.length || 0 
            }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error buscando podcasts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error buscando podcasts',
            details: error.message 
        });
    }
});

// Obtener podcasts del usuario autenticado
podscatsRouter.get('/my/podcasts', userExtractor, async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await podscatsServices.getMyPodcastsService(userId);
        
        // ✅ LOG: Registrar lectura de podcasts del usuario
        await systemLogger.logCrudAction(
            req.user, 
            'read', 
            'podcast', 
            null, 
            req, 
            { 
                user_podcasts: true,
                count: result.data?.length || 0 
            }
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo podcasts del usuario:', error);
        
        // ✅ LOG: Registrar error
        await systemLogger.logSystemError(
            userId, 
            req, 
            'Error obteniendo podcasts del usuario', 
            error
        );
        
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo podcasts del usuario',
            details: error.message 
        });
    }
});

module.exports = podscatsRouter;