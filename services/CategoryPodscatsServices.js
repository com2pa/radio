const CategoryPodscats = require('../model/CategoryPodscats');
const User = require('../model/User');

// Obtener todas las categorías de podcasts
const getAllCategoryPodscats = async () => {
    try {
        const categories = await CategoryPodscats.getAllCategoryPodscats();
        return categories;
    } catch (error) {
        throw new Error('Error obteniendo categorías de podcasts: ' + error.message);
    }
}

// Crear categoría de podcasts
const createCategoryPodscats = async (categoryName, userId) => {
    // Validar que el nombre de la categoría no esté vacío
    if (!categoryName || categoryName.trim() === '') {
        throw new Error('El nombre de la categoría es obligatorio');
    }
    
    // Validar que el usuario exista
    if (!userId) {
        throw new Error('El ID del usuario es obligatorio');
    }

    const trimmedName = categoryName.trim();
    
    // Validar longitud
    if (trimmedName.length > 100) {
        throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
    }

    // Verificar que el usuario exista
    const existingUser = await User.getUserById(userId);
    if (!existingUser) {
        throw new Error('El usuario no existe');
    }

    // Crear la categoría (la validación de unicidad se hace en la BD)
    try {
        const newCategory = await CategoryPodscats.createCategoryPodscats(trimmedName, userId);
        return newCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

// Obtener categorías de podcasts por usuario
const getCategoryPodscatsByUserId = async (userId) => {
    if (!userId) {
        throw new Error('El ID del usuario es obligatorio');
    }

    try {
        const categories = await CategoryPodscats.getCategoryPodscatsByUserId(userId);
        return categories;
    } catch (error) {
        throw new Error('Error obteniendo categorías de podcasts por usuario: ' + error.message);
    }
}

// Obtener categoría de podcasts por ID
const getCategoryPodscatsById = async (categoryId) => {
    if (!categoryId) {
        throw new Error('El ID de la categoría es obligatorio');
    }

    try {
        const category = await CategoryPodscats.getCategoryPodscatsById(categoryId);
        if (!category) {
            throw new Error('La categoría no existe');
        }
        return category;
    } catch (error) {
        throw new Error('Error obteniendo categoría de podcasts: ' + error.message);
    }
}

// Actualizar categoría de podcasts (SOLO nombre, sin userId)
const updateCategoryPodscats = async (categoryId, categoryName) => {
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
    const existingCategory = await CategoryPodscats.getCategoryPodscatsById(categoryId);
    if (!existingCategory) {
        throw new Error('La categoría no existe');
    }

    // Actualizar la categoría (solo el nombre)
    try {
        const updatedCategory = await CategoryPodscats.updateCategoryPodscats(categoryId, trimmedName);
        return updatedCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

// Eliminar categoría de podcasts
const deleteCategoryPodscats = async (categoryId) => {
    // Validar ID
    if (!categoryId) {
        throw new Error('El ID de la categoría es obligatorio');
    }

    // Verificar que la categoría exista
    const existingCategory = await CategoryPodscats.getCategoryPodscatsById(categoryId);
    if (!existingCategory) {
        throw new Error('La categoría no existe');
    }

    // Eliminar la categoría
    try {
        const deletedCategory = await CategoryPodscats.deleteCategoryPodscats(categoryId);
        return deletedCategory;
    } catch (error) {
        throw error; // Re-lanzar el error para manejarlo en el router
    }
}

module.exports = {
    createCategoryPodscats,
    getAllCategoryPodscats,
    getCategoryPodscatsById,
    getCategoryPodscatsByUserId,
    updateCategoryPodscats,
    deleteCategoryPodscats
}