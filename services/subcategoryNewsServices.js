const subcategoryNew = require('../model/SubCategoryNew')

// Obtener todas las subcategorías de noticias
const getAllSubCategories = async () => {
    try {
        const subcategories = await subcategoryNew.getAllSubCategories();
        return subcategories;
    } catch (error) {
        throw new Error('Error obteniendo subcategorías: ' + error.message);
    }
}

// Crear subcategoría de noticias
const createSubCategory = async ({ category_id, subcategory_name }) => {
    // Validar que el category_id esté presente
    if (!category_id) {
        throw new Error('El ID de la categoría es obligatorio');
    }
    
    // Validar que el nombre de la subcategoría no esté vacío
    if (!subcategory_name || subcategory_name.trim() === '') {
        throw new Error('El nombre de la subcategoría es obligatorio');
    }   
    
    const trimmedName = subcategory_name.trim();
    
    // Validar longitud
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la subcategoría no puede exceder los 100 caracteres');
    }
    
    // Verificar que la categoría exista
    const categoryExist = await subcategoryNew.categoryExists(category_id);
    if (!categoryExist) {
        throw new Error('La categoría especificada no existe');
    }
    
    // Verificar que el nombre de subcategoría sea único EN LA MISMA CATEGORÍA
    const isUnique = await subcategoryNew.isSubCategoryUnique(category_id, trimmedName);
    if (!isUnique) {
        throw new Error('El nombre de la subcategoría ya existe en esta categoría');
    }
    
    // Crear la subcategoría
    try {
        const newSubCategory = await subcategoryNew.createSubCategory({ 
            category_id, 
            subcategory_name: trimmedName 
        }); 
        return newSubCategory;
    } catch (error) {
        throw error;
    }   
}
// Actualizar subcategoría de noticias
const updateSubCategory = async (subcategoryId, { category_id, subcategory_name }) => {
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
    const categoryExist = await subcategoryNew.categoryExists(category_id);
    if (!categoryExist) {
        throw new Error('La categoría especificada no existe');
    }
    
    // Verificar que la subcategoría exista
    const existingSubCategory = await subcategoryNew.getSubCategoryById(subcategoryId);
    if (!existingSubCategory) {
        throw new Error('La subcategoría no existe');
    }
    
    // Verificar que el nuevo nombre sea único EN LA MISMA CATEGORÍA (excluyendo la subcategoría actual)
    const isUnique = await subcategoryNew.isSubCategoryUnique(category_id, trimmedName, subcategoryId);
    if (!isUnique) {
        throw new Error('El nombre de la subcategoría ya existe en esta categoría');
    }
    
    // Actualizar la subcategoría
    try {
        const updatedSubCategory = await subcategoryNew.updateSubCategory(subcategoryId, { 
            category_id, 
            subcategory_name: trimmedName 
        });  
        return updatedSubCategory;
    } catch (error) {
        throw error;
    }
}

// Eliminar subcategoría de noticias
const deleteSubCategory = async (subcategoryId) => {
    if (!subcategoryId) {
        throw new Error('El ID de la subcategoría es obligatorio');
    }
    
    // Verificar que la subcategoría exista
    const existingSubCategory = await subcategoryNew.getSubCategoryById(subcategoryId);
    if (!existingSubCategory) {
        throw new Error('La subcategoría no existe');
    }   
    
    // Eliminar la subcategoría
    try {
        await subcategoryNew.deleteSubCategory(subcategoryId);
        return { message: 'Subcategoría eliminada exitosamente' };
    } catch (error) {
        throw error;  
    }       
}



module.exports = {
    getAllSubCategories,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    
}