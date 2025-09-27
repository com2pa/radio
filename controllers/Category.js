const CategoryNewsRouter = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const authLogger = require('../help/auth/authLogger');
const systemLogger = require('../help/system/systemLogger');
const CategoryNewsServices = require('../services/CategoryNewsServices');

// obtene todas las categorias de noticias
CategoryNewsRouter.get('/all', async (req, res) => {
    try {
        const categories = await CategoryNewsServices.getAllCategoryNews();
        res.status(200).json({
            success: true,
            message: 'Categorías de noticias obtenidas exitosamente',
            data: categories
        });
    }
    catch (error) {
        await systemLogger.logSystemError(null, req, `Error obteniendo categorías de noticias: ${error.message}`);
        res.status(500).json({ error: 'Error obteniendo categorías de noticias', details: error.message });
    }
});

// crear categoria de noticias (solo admin)
CategoryNewsRouter.post('/create', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    const { categoryName } = req.body;
    try {
        // const newCategory = await CategoryNewsServices.createCategoryNews(categoryName);
        const newCategory= await CategoryNewsServices.createCategoryNews(categoryName);
        await systemLogger.logSystemEvent(null, req, `Categoría de noticias creada: ${categoryName}`);  
        res.status(201).json({
            success: true,
            message: 'Categoría de noticias creada exitosamente',
            data: newCategory
        });
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error creando categoría de noticias: ${error.message}`);
        res.status(500).json({ error: 'Error creando categoría de noticias', details: error.message });
    } 
});

module.exports = CategoryNewsRouter;