const SubcategoryPodcasts = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const systemLogger = require('../help/system/systemLogger');
const SubCategoryPodcastsServices = require('../services/subcategoryPodcastsServices');

// Obtener todas las subcategorías de podcasts
SubcategoryPodcasts.get('/all', async (req, res) => {
    try {
        const subcategories = await SubCategoryPodcastsServices.getAllSubCategoryPodcasts();
        res.status(200).json(subcategories);
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo subcategorías de podcasts: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo subcategorías de podcasts', 
            details: error.message 
        });
    }
});

// Obtener subcategorías por categoría específica
SubcategoryPodcasts.get('/category/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
        const SubCategoryPodcasts = require('../model/subcategoryPodcasts');
        const subcategories = await SubCategoryPodcasts.getSubCategoryPodcastsByCategory(category_id);
        
        res.status(200).json(
             subcategories
        );
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo subcategorías de podcasts por categoría: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo subcategorías de podcasts', 
            details: error.message 
        });
    }
});

// Obtener una subcategoría por ID
SubcategoryPodcasts.get('/:id', async (req, res) => {
    const subcategoryId = req.params.id;
    try {
        const SubCategoryPodcasts = require('../model/subcategoryPodcasts');
        const subcategory = await SubCategoryPodcasts.getSubCategoryPodcastsById(subcategoryId);
        
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                error: 'Subcategoría de podcasts no encontrada'
            });
        }
        
        res.status(200).json(subcategory
        );
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo subcategoría de podcasts: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo subcategoría de podcasts', 
            details: error.message 
        });
    }
});

// Crear una nueva subcategoría de podcasts (solo admin y superAdmin)
SubcategoryPodcasts.post('/create', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const { category_id, subcategory_name } = req.body;
    const userId = req.user.id; // Obtenemos el ID del usuario autenticado
    
    try {
        const newSubCategory = await SubCategoryPodcastsServices.createSubCategoryPodcasts(
            { category_id, subcategory_name }, 
            userId
        );
        
        await systemLogger.logSystemEvent(req.user.id, req, `Subcategoría de podcasts creada: ${subcategory_name} por usuario: ${userId}`);
        
        res.status(201).json( newSubCategory
        );
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error creando subcategoría de podcasts: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Error creando subcategoría de podcasts', 
            details: error.message 
        });
    }
});

// Actualizar una subcategoría de podcasts (solo admin y superAdmin)
SubcategoryPodcasts.put('/update/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const subcategoryId = req.params.id;
    const { category_id, subcategory_name } = req.body;
    
    try {
        const updatedSubCategory = await SubCategoryPodcastsServices.updateSubCategoryPodcasts(subcategoryId, { 
            category_id, 
            subcategory_name 
        });
        
        await systemLogger.logSystemEvent(req.user.id, req, `Subcategoría de podcasts actualizada: ID ${subcategoryId}`);
        
        res.status(200).json( updatedSubCategory
        );
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error actualizando subcategoría de podcasts: ${error.message}`);
        
        if (error.message === 'La subcategoría no existe') {
            return res.status(404).json({ 
                success: false,
                error: 'Subcategoría de podcasts no encontrada' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando subcategoría de podcasts', 
            details: error.message 
        });
    }
});

// Eliminar una subcategoría de podcasts (solo admin y superAdmin)
SubcategoryPodcasts.delete('/delete/:id', userExtractor, roleAuthorization(['admin', 'superAdmin']), async (req, res) => {
    const subcategoryId = req.params.id;
    
    try {
        const result = await SubCategoryPodcastsServices.deleteSubCategoryPodcasts(subcategoryId);
        
        await systemLogger.logSystemEvent(req.user.id, req, `Subcategoría de podcasts eliminada: ID ${subcategoryId}`);
        
        res.status(200).json( result
        );
    } catch (error) {
        await systemLogger.logSystemError(req.user?.id, req, `Error eliminando subcategoría de podcasts: ${error.message}`);
        
        if (error.message === 'La subcategoría no existe') {
            return res.status(404).json({ 
                success: false,
                error: 'Subcategoría de podcasts no encontrada' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Error eliminando subcategoría de podcasts', 
            details: error.message 
        });
    }
});

module.exports = SubcategoryPodcasts;