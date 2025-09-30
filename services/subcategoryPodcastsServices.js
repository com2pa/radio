const SubCategoryPodcasts = require('../model/subcategoryPodcasts');
const User = require('../model/User');

// Obtener todas las subcategorías de podcasts
const getAllSubCategoryPodcasts = async () => {
    try {
        const subcategories = await SubCategoryPodcasts.getAllSubCategoryPodcasts();
        return subcategories;
    } catch (error) {
        throw new Error('Error obteniendo subcategorías de podcasts: ' + error.message);
    }
}

// Crear subcategoría de podcasts
const createSubCategoryPodcasts = async ({ category_id, subcategory_name }, userId) => {
    // Validar que el category_id esté presente
    if (!category_id) {
        throw new Error('El ID de la categoría es obligatorio');
    }
    
    // Validar que el nombre de la subcategoría no esté vacío
    if (!subcategory_name || subcategory_name.trim() === '') {
        throw new Error('El nombre de la subcategoría es obligatorio');
    }
    
    // Validar que el usuario exista
    if (!userId) {
        throw new Error('El ID del usuario es obligatorio');
    }
    
    const trimmedName = subcategory_name.trim();
    
    // Validar longitud
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la subcategoría no puede exceder los 100 caracteres');
    }
    
    // Verificar que la categoría exista
    const categoryExist = await SubCategoryPodcasts.categoryExists(category_id);
    if (!categoryExist) {
        throw new Error('La categoría especificada no existe');
    }
    
    // Verificar que el usuario exista
    const existingUser = await User.getUserById(userId);
    if (!existingUser) {
        throw new Error('El usuario no existe');
    }
    
    // Verificar que el nombre de subcategoría sea único EN LA MISMA CATEGORÍA
    const isUnique = await SubCategoryPodcasts.isSubCategoryPodcastsUnique(category_id, trimmedName);
    if (!isUnique) {
        throw new Error('El nombre de la subcategoría ya existe en esta categoría');
    }
    
    // Crear la subcategoría
    try {
        const newSubCategory = await SubCategoryPodcasts.createSubCategoryPodcasts({ 
            category_id, 
            subcategory_name: trimmedName,
            user_id: userId
        });
        return newSubCategory;
    } catch (error) {
        throw error;
    }
}

// Actualizar subcategoría de podcasts
const updateSubCategoryPodcasts = async (subcategoryId, { category_id, subcategory_name }) => {
    // Validaciones 
    if (!subcategoryId) {
        throw new Error('El ID de la subcategoría es obligatorio');
    }
    
    if (!category_id) {
        throw new Error('El ID de la categoría es obligatorio');
    }
    
    if (!subcategory_name || subcategory_name.trim() === '') {
        throw new Error('El nombre de la subcategoría es obligatorio');
    }
    
    const trimmedName = subcategory_name.trim();
    
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la subcategoría no puede exceder los 100 caracteres');
    }
    
    // Verificar que la categoría exista
    const categoryExist = await SubCategoryPodcasts.categoryExists(category_id);
    if (!categoryExist) {
        throw new Error('La categoría especificada no existe');
    }
    
    // Verificar que la subcategoría exista
    const existingSubCategory = await SubCategoryPodcasts.getSubCategoryPodcastsById(subcategoryId);
    if (!existingSubCategory) {
        throw new Error('La subcategoría no existe');
    }
    
    // Verificar que el nuevo nombre sea único EN LA MISMA CATEGORÍA (excluyendo la subcategoría actual)
    const isUnique = await SubCategoryPodcasts.isSubCategoryPodcastsUnique(category_id, trimmedName, subcategoryId);
    if (!isUnique) {
        throw new Error('El nombre de la subcategoría ya existe en esta categoría');
    }
    
    // Actualizar la subcategoría
    try {
        const updatedSubCategory = await SubCategoryPodcasts.updateSubCategoryPodcasts(subcategoryId, { 
            category_id, 
            subcategory_name: trimmedName 
        });
        return updatedSubCategory;
    } catch (error) {
        throw error;
    }
}

// Eliminar subcategoría de podcasts
const deleteSubCategoryPodcasts = async (subcategoryId) => {
    if (!subcategoryId) {
        throw new Error('El ID de la subcategoría es obligatorio');
    }
    
    // Verificar que la subcategoría exista
    const existingSubCategory = await SubCategoryPodcasts.getSubCategoryPodcastsById(subcategoryId);
    if (!existingSubCategory) {
        throw new Error('La subcategoría no existe');
    }
    
    // Eliminar la subcategoría
    try {
        await SubCategoryPodcasts.deleteSubCategoryPodcasts(subcategoryId);
        return { message: 'Subcategoría de podcasts eliminada exitosamente' };
    } catch (error) {
        throw error;
    }
}

module.exports = {
    getAllSubCategoryPodcasts,
    createSubCategoryPodcasts,
    updateSubCategoryPodcasts,
    deleteSubCategoryPodcasts
};