const news = require('../model/News');
const user = require('../model/User');
const role = require('../model/Role');
const subcategory = require('../model/SubCategoryNew');

// Servicio para crear noticia
const createNewsService = async (newsData, userId) => {
    try {
        // Validar datos requeridos
        if (!newsData.news_title || !newsData.news_content) {
            throw new Error('El título y contenido son obligatorios');
        }

        // Validar que se proporcione subcategoría
        if (!newsData.subcategory_id) {
            throw new Error('La subcategoría es requerida');
        }

        // Verificar que la subcategoría existe
        const subcategoryExists = await subcategory.categoryExists(newsData.subcategory_id);
        if (!subcategoryExists) {
            throw new Error('La subcategoría especificada no existe');
        }

        // Crear la noticia
        const newNews = await news.createNews(newsData, userId);
        return {
            success: true,
            message: 'Noticia creada exitosamente',
            data: newNews
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Servicio para obtener todas las noticias
const getAllNewsService = async () => {
    try {
        const allNews = await news.getAllNews();
        return {
            success: true,
            message: 'Noticias obtenidas exitosamente',
            data: allNews,
            count: allNews.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Servicio para obtener noticia por ID
const getNewsByIdService = async (newsId) => {
    try {
        const newsItem = await news.getNewsById(newsId);
        if (!newsItem) {
            throw new Error('Noticia no encontrada');
        }
        
        return {
            success: true,
            message: 'Noticia obtenida exitosamente',
            data: newsItem
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Servicio para obtener noticias por usuario
const getNewsByUserService = async (userId) => {
    try {
        const userNews = await news.getNewsByUser(userId);
        return {
            success: true,
            message: 'Noticias del usuario obtenidas exitosamente',
            data: userNews,
            count: userNews.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Servicio para obtener noticias por subcategoría
const getNewsBySubcategoryService = async (subcategoryId) => {
    try {
        const subcategoryNews = await news.getNewsBySubcategory(subcategoryId);
        return {
            success: true,
            message: 'Noticias de la subcategoría obtenidas exitosamente',
            data: subcategoryNews,
            count: subcategoryNews.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Servicio para obtener noticias por categoría
const getNewsByCategoryService = async (categoryId) => {
    try {
        const categoryNews = await news.getNewsByCategory(categoryId);
        return {
            success: true,
            message: 'Noticias de la categoría obtenidas exitosamente',
            data: categoryNews,
            count: categoryNews.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

// Servicio para actualizar noticia
const updateNewsService = async (newsId, newsData, userId) => {
    try {
        // Validar que la noticia existe
        const existingNews = await news.getNewsById(newsId);
        if (!existingNews) {
            throw new Error('Noticia no encontrada');
        }

        // Si se está actualizando la subcategoría, verificar que existe
        if (newsData.subcategory_id) {
            const subcategoryExists = await subcategory.categoryExists(newsData.subcategory_id);
            if (!subcategoryExists) {
                throw new Error('La subcategoría especificada no existe');
            }
        }

        // Actualizar la noticia
        const updatedNews = await news.updateNews(newsId, newsData, userId);
        return {
            success: true,
            message: 'Noticia actualizada exitosamente',
            data: updatedNews
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Servicio para eliminar noticia
const deleteNewsService = async (newsId, userId) => {
    try {
        // Validar que la noticia existe
        const existingNews = await news.getNewsById(newsId);
        if (!existingNews) {
            throw new Error('Noticia no encontrada');
        }

        // Eliminar la noticia
        const deletedNews = await news.deleteNews(newsId, userId);
        return {
            success: true,
            message: 'Noticia eliminada exitosamente',
            data: deletedNews
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Servicio para cambiar estado de la noticia
const updateNewsStatusService = async (newsId, status, userId) => {
    try {
        // Validar que la noticia existe
        const existingNews = await news.getNewsById(newsId);
        if (!existingNews) {
            throw new Error('Noticia no encontrada');
        }

        // Validar estado
        if (typeof status !== 'boolean') {
            throw new Error('El estado debe ser un valor booleano');
        }

        // Actualizar estado
        const updatedNews = await news.updateNewsStatus(newsId, status, userId);
        return {
            success: true,
            message: `Noticia ${status ? 'activada' : 'desactivada'} exitosamente`,
            data: updatedNews
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Servicio para buscar noticias por título
const searchNewsByTitleService = async (searchTerm) => {
    try {
        // Obtener todas las noticias y filtrar por título
        const allNews = await news.getAllNews();
        const filteredNews = allNews.filter(newsItem => 
            newsItem.news_title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            success: true,
            message: `Búsqueda completada para: "${searchTerm}"`,
            data: filteredNews,
            count: filteredNews.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
            count: 0
        };
    }
};

module.exports = {
    createNewsService,
    getAllNewsService,
    getNewsByIdService,
    getNewsByUserService,
    getNewsBySubcategoryService,
    getNewsByCategoryService,
    updateNewsService,
    deleteNewsService,
    updateNewsStatusService,
    searchNewsByTitleService
};