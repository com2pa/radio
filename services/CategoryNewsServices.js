const CategoryNews = require('../model/CategoryNews')

// Obtener todas las categorías de noticias
const getAllCategoryNews = async () => {
    try {
        const categories = await CategoryNews.getAllCategoryNews();
        return categories;
    } catch (error) {
        throw new Error('Error obteniendo categorías: ' + error.message);
    }
}

// Crear categoría de noticias
const createCategoryNews = async (categoryName) => {
    // Validar que el nombre de la categoría no esté vacío
    if (!categoryName || categoryName.trim() === '') {
        throw new Error('El nombre de la categoría es obligatorio');
    }
    
    const trimmedName = categoryName.trim();
    
    // Validar longitud
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
    }

    // Crear la categoría (la validación de unicidad se hace en la BD)
    try {
        const newCategory = await CategoryNews.createCategoryNews(trimmedName);
        return newCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

// Actualizar categoría de noticias
const updateCategoryNews = async (categoryId, categoryName) => {
    // Validaciones
    if (!categoryId) {
        throw new Error('El ID de la categoría es obligatorio');
    }
    
    if (!categoryName || categoryName.trim() === '') {
        throw new Error('El nombre de la categoría es obligatorio');
    }
    
    const trimmedName = categoryName.trim();
    
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
    }

    // Verificar que la categoría exista
    const existingCategory = await CategoryNews.getCategoryNewsById(categoryId);
    if (!existingCategory) {
        throw new Error('La categoría no existe');
    }

    // Actualizar la categoría
    try {
        const updatedCategory = await CategoryNews.updateCategoryNews(categoryId, trimmedName);
        return updatedCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

// Eliminar categoría de noticias
const deleteCategoryNews = async (categoryId) => {
    // Validar ID
    if (!categoryId) {
        throw new Error('El ID de la categoría es obligatorio');
    }

    // Verificar que la categoría exista
    const existingCategory = await CategoryNews.getCategoryNewsById(categoryId);
    if (!existingCategory) {
        throw new Error('La categoría no existe');
    }

    // Eliminar la categoría
    try {
        const deletedCategory = await CategoryNews.deleteCategoryNews(categoryId);
        return deletedCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

module.exports = {
    createCategoryNews,
    getAllCategoryNews,
    updateCategoryNews,
    deleteCategoryNews
}