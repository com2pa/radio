const CategoryNewsRouter = require('express').Router();
const { roleAuthorization, userExtractor } = require('../middleware/auth');
const authLogger = require('../help/auth/authLogger');
const systemLogger = require('../help/system/systemLogger');
const CategoryNewsServices = require('../services/CategoryNewsServices');

// obtene todas las categorias de noticias
CategoryNewsRouter.get('/all', async (req, res) => {
    try {
        const categories = await CategoryNewsServices.getAllCategoryNews();
        res.status(200).json(categories);
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
        res.status(201).json(
           newCategory
        );
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error creando categoría de noticias: ${error.message}`);
        res.status(500).json({ error: 'Error creando categoría de noticias', details: error.message });
    } 
});
// actualizar categoria de noticias (solo admin)
CategoryNewsRouter.put('/update/:id', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
    const categoryId = req.params.id;
    const { categoryName } = req.body;
    try {
        const updatedCategory = await CategoryNewsServices.updateCategoryNews(categoryId, categoryName);    
        if (!updatedCategory) {
            return res.status(404).json({ error: 'Categoría de noticias no encontrada' });
        }
        await systemLogger.logSystemEvent(null, req, `Categoría de noticias actualizada: ${categoryName}`);
        res.status(200).json( updatedCategory
        );
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error actualizando categoría de noticias: ${error.message}`);
        res.status(500).json({ error: 'Error actualizando categoría de noticias', details: error.message });
    }
});
// eliminar categoria de noticias (solo admin)
CategoryNewsRouter.delete('/delete/:id', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {    
    const categoryId = req.params.id;
    try {
        const deletedCategory = await CategoryNewsServices.deleteCategoryNews(categoryId);
        if (!deletedCategory) {
            return res.status(404).json({ error: 'Categoría de noticias no encontrada' });
        }
        await systemLogger.logSystemEvent(null, req, `Categoría de noticias eliminada: ID ${categoryId}`);
        res.status(200).json(deletedCategory
        );
    } catch (error) {
        await systemLogger.logSystemError(null, req, `Error eliminando categoría de noticias: ${error.message}`);
        res.status(500).json({ error: 'Error eliminando categoría de noticias', details: error.message });
    }
});

module.exports = CategoryNewsRouter;