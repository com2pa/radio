const CategoryPodscats = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const systemLogger = require('../help/system/systemLogger');
const CategoryPodscatsServices = require('../services/CategoryPodscatsServices');

// Obtener todas las categorías de podcasts
CategoryPodscats.get('/all', async (req, res) => {
    try {
        const categories = await CategoryPodscatsServices.getAllCategoryPodscats();
        res.status(200).json(categories);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo categorías de podcasts: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo categorías de podcasts', 
            details: error.message 
        });
    }
});

// Obtener categorías de podcasts por usuario
CategoryPodscats.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const categories = await CategoryPodscatsServices.getCategoryPodscatsByUserId(userId);
        res.status(200).json({
            success: true,
            message: 'Categorías de podcasts del usuario obtenidas exitosamente',
            data: categories
        });
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo categorías de podcasts por usuario: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo categorías de podcasts por usuario', 
            details: error.message 
        });
    }
});

// Obtener categoría de podcasts por ID
CategoryPodscats.get('/:id', async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await CategoryPodscatsServices.getCategoryPodscatsById(categoryId);
        res.status(200).json({
            success: true,
            message: 'Categoría de podcasts obtenida exitosamente',
            data: category
        });
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo categoría de podcasts: ${error.message}`);
        if (error.message === 'La categoría no existe') {
            return res.status(404).json({ 
                success: false,
                error: 'Categoría de podcasts no encontrada' 
            });
        }
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo categoría de podcasts', 
            details: error.message 
        });
    }
});

// Crear categoría de podcasts (solo admin y superAdmin)
CategoryPodscats.post('/create', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const { categoryName } = req.body;
    const userId = req.user.id; // CAMBIADO: usar req.user.id en lugar de req.user.user_id
    
    try {
        const newCategory = await CategoryPodscatsServices.createCategoryPodscats(categoryName, userId);
        await systemLogger.logSystemEvent(req.user.id, req, `Categoría de podcasts creada: ${categoryName} por usuario: ${userId}`);
        
        res.status(201).json(newCategory);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error creando categoría de podcasts: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error creando categoría de podcasts', 
            details: error.message 
        });
    }
});

// Actualizar categoría de podcasts (solo admin y superAdmin)
CategoryPodscats.put('/update/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const categoryId = req.params.id;
    const { categoryName } = req.body;
    
    try {
        const updatedCategory = await CategoryPodscatsServices.updateCategoryPodscats(categoryId, categoryName);
        
        await systemLogger.logSystemEvent(req.user.id, req, `Categoría de podcasts actualizada: ID ${categoryId}`);
        res.status(200).json(updatedCategory);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error actualizando categoría de podcasts: ${error.message}`);
        
        if (error.message === 'La categoría no existe') {
            return res.status(404).json({ 
                success: false,
                error: 'Categoría de podcasts no encontrada' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando categoría de podcasts', 
            details: error.message 
        });
    }
});

// Eliminar categoría de podcasts (solo admin y superAdmin)
CategoryPodscats.delete('/delete/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const categoryId = req.params.id;
    
    try {
        const deletedCategory = await CategoryPodscatsServices.deleteCategoryPodscats(categoryId);
        
        await systemLogger.logSystemEvent(req.user.id, req, `Categoría de podcasts eliminada: ID ${categoryId}`);
        res.status(200).json(deletedCategory);
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error eliminando categoría de podcasts: ${error.message}`);
        
        if (error.message === 'La categoría no existe') {
            return res.status(404).json({ 
                success: false,
                error: 'Categoría de podcasts no encontrada' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Error eliminando categoría de podcasts', 
            details: error.message 
        });
    }
});

module.exports = CategoryPodscats;