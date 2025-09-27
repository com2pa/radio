const subcategoriesRouter = require('express').Router();
const SubCategoryServices = require('../services/subcategoryNewsServices');

// Crear una nueva subcategoría
subcategoriesRouter.post('/create', async (req, res) => {
    const { category_id, subcategory_name } = req.body;
    
    try {
        const newSubCategory = await SubCategoryServices.createSubCategory({ 
            category_id, 
            subcategory_name 
        });
        res.status(201).json(newSubCategory);
    } catch (error) {
        console.error('❌ Error creando subcategoría:', error);
        res.status(400).json({ error: error.message });
    }
});

// Obtener todas las subcategorías
subcategoriesRouter.get('/', async (req, res) => {
    try {
        const subcategories = await SubCategoryServices.getAllSubCategories();
        res.json(subcategories);
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías:', error);
        res.status(500).json({ error: 'Error obteniendo subcategorías' });
    }
});

// Obtener subcategorías por categoría
subcategoriesRouter.get('/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
        // Usar el modelo directamente para esta consulta específica
        const SubCategoryNew = require('../model/SubCategoryNew');
        const subcategories = await SubCategoryNew.getSubCategoriesByCategory(category_id);
        res.json(subcategories);
    } catch (error) {
        console.error('❌ Error obteniendo subcategorías por categoría:', error);
        res.status(500).json({ error: 'Error obteniendo subcategorías' });
    }
});

// Actualizar una subcategoría
subcategoriesRouter.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { category_id, subcategory_name } = req.body;
    
    try {
        const updatedSubCategory = await SubCategoryServices.updateSubCategory(id, { 
            category_id, 
            subcategory_name 
        });
        res.json(updatedSubCategory);
    } catch (error) {
        console.error('❌ Error actualizando subcategoría:', error);
        res.status(400).json({ error: error.message });
    }
});

// Eliminar una subcategoría
subcategoriesRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await SubCategoryServices.deleteSubCategory(id);
        res.status(200).json({ message: 'Subcategoría eliminada exitosamente' });
    } catch (error) {
        console.error('❌ Error eliminando subcategoría:', error);
        res.status(400).json({ error: error.message });
    }
});


module.exports = subcategoriesRouter;