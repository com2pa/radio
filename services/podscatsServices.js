const podcastModel = require('../model/podcats');
const subcategoryPodcastModel = require('../model/subcategoryPodcasts');

// Crear nuevo podcast
const createPodcastService = async (podcastData, userId) => {
    try {
        // Validaciones de negocio
        if (!podcastData.podcast_title) {
            throw new Error('El título del podcast es obligatorio');
        }

        if (podcastData.podcast_title.length < 3) {
            throw new Error('El título debe tener al menos 3 caracteres');
        }

        // Validar que al menos uno de los dos (URL o iframe) esté presente
        if (!podcastData.podcast_url && !podcastData.podcast_iframe) {
            throw new Error('Debe proporcionar al menos la URL o el iframe del podcast');
        }

        // ✅ CORREGIDO: Verificar que la SUBCATEGORÍA existe
        if (podcastData.podcast_subcategory_id) {
            const subcategoryExists = await subcategoryPodcastModel.subcategoryExists(podcastData.podcast_subcategory_id);
            if (!subcategoryExists) {
                throw new Error(`La subcategoría con ID ${podcastData.podcast_subcategory_id} no existe`);
            }
        } else {
            throw new Error('La subcategoría es obligatoria');
        }

        // Validar que no exista un podcast con el mismo título en la misma subcategoría
        const existingPodcast = await podcastModel.checkDuplicatePodcast(
            podcastData.podcast_title, 
            podcastData.podcast_subcategory_id
        );
        if (existingPodcast) {
            throw new Error(`Ya existe un podcast con el título "${podcastData.podcast_title}" en esta subcategoría`);
        }

        // Crear el podcast
        const podcast = await podcastModel.createPodcast(podcastData, userId);
        
        // Obtener información completa para auditoría
        const podcastWithDetails = await podcastModel.getPodcastById(podcast.podcast_id);
        
        return {
            success: true,
            message: 'Podcast creado exitosamente',
            data: podcastWithDetails
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};
// Obtener todos los podcasts con filtros
const getAllPodcastsService = async (filters = {}) => {
    try {
        const podcasts = await podcastModel.getAllPodcasts(filters);
        
        return {
            success: true,
            message: 'Podcasts obtenidos exitosamente',
            data: podcasts,
            count: podcasts.length
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

// Obtener podcast por ID
const getPodcastByIdService = async (podcastId) => {
    try {
        if (!podcastId) {
            throw new Error('ID del podcast es requerido');
        }

        const podcast = await podcastModel.getPodcastById(podcastId);
        
        if (!podcast) {
            throw new Error('Podcast no encontrado');
        }
        
        return {
            success: true,
            message: 'Podcast obtenido exitosamente',
            data: podcast
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};


// Obtener podcasts por categoría
const getPodcastsByCategoryService = async (categoryId) => {
    try {
        const podcasts = await podcastModel.getPodcastsByCategory(categoryId);
        
        return {
            success: true,
            message: `Podcasts de la categoría ${categoryId} obtenidos exitosamente`,
            data: podcasts,
            count: podcasts.length
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

// Obtener podcasts por subcategoría
const getPodcastsBySubcategoryService = async (subcategoryId) => {
    try {
        if (!subcategoryId) {
            throw new Error('ID de subcategoría es requerido');
        }

        const podcasts = await podcastModel.getPodcastsBySubcategory(subcategoryId);
        
        return {
            success: true,
            message: `Podcasts de la subcategoría obtenidos exitosamente`,
            data: podcasts,
            count: podcasts.length
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

// Actualizar podcast
const updatePodcastService = async (podcastId, podcastData, userId) => {
    try {
        // Validaciones de negocio
        if (podcastData.podcast_title && podcastData.podcast_title.length < 3) {
            throw new Error('El título debe tener al menos 3 caracteres');
        }

        // Validar que al menos uno de los dos (URL o iframe) esté presente si se están actualizando
        if (podcastData.podcast_url !== undefined || podcastData.podcast_iframe !== undefined) {
            const hasUrl = podcastData.podcast_url !== undefined ? podcastData.podcast_url : true;
            const hasIframe = podcastData.podcast_iframe !== undefined ? podcastData.podcast_iframe : true;
            
            if (!hasUrl && !hasIframe) {
                throw new Error('Debe proporcionar al menos la URL o el iframe del podcast');
            }
        }

        // ✅ CORREGIDO: Verificar que la SUBCATEGORÍA existe si se proporciona
        if (podcastData.podcast_subcategory_id) {
            const subcategoryExists = await subcategoryPodcastModel.subcategoryExists(podcastData.podcast_subcategory_id);
            if (!subcategoryExists) {
                throw new Error(`La subcategoría con ID ${podcastData.podcast_subcategory_id} no existe`);
            }
        }

        // Validar que no exista un podcast con el mismo título en la misma subcategoría (excluyendo el actual)
        if (podcastData.podcast_title && podcastData.podcast_subcategory_id) {
            const existingPodcast = await podcastModel.checkDuplicatePodcast(
                podcastData.podcast_title, 
                podcastData.podcast_subcategory_id,
                podcastId
            );
            if (existingPodcast) {
                throw new Error(`Ya existe un podcast con el título "${podcastData.podcast_title}" en esta subcategoría`);
            }
        }

        const updatedPodcast = await podcastModel.updatePodcastWithOwnership(podcastId, podcastData, userId);
        
        // Obtener información actualizada completa para auditoría
        const podcastWithDetails = await podcastModel.getPodcastById(podcastId);
        
        return {
            success: true,
            message: 'Podcast actualizado exitosamente',
            data: podcastWithDetails
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Eliminar podcast
const deletePodcastService = async (podcastId, userId) => {
    try {
        // Obtener información del podcast antes de eliminarlo para auditoría
        const podcastToDelete = await podcastModel.getPodcastById(podcastId);
        
        const deletedPodcast = await podcastModel.deletePodcastWithOwnership(podcastId, userId);
        
        return {
            success: true,
            message: 'Podcast eliminado exitosamente',
            data: {
                ...deletedPodcast,
                category_info: {
                    category_id: podcastToDelete.category_id,
                    category_name: podcastToDelete.category_name,
                    subcategory_name: podcastToDelete.subcategory_name
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Buscar podcasts
const searchPodcastsService = async (searchTerm, filters = {}) => {
    try {
        if (!searchTerm || searchTerm.length < 2) {
            throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
        }

        const searchFilters = {
            ...filters,
            search: searchTerm
        };

        const podcasts = await podcastModel.getAllPodcasts(searchFilters);
        
        return {
            success: true,
            message: `Búsqueda completada para "${searchTerm}"`,
            data: podcasts,
            count: podcasts.length
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

// Obtener podcasts del usuario actual
const getMyPodcastsService = async (userId) => {
    try {
        const filters = { user_id: userId };
        const podcasts = await podcastModel.getAllPodcasts(filters);
        
        return {
            success: true,
            message: 'Tus podcasts obtenidos exitosamente',
            data: podcasts,
            count: podcasts.length
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
    createPodcastService,
    getAllPodcastsService,
    getPodcastByIdService,
    getPodcastsByCategoryService,
    getPodcastsBySubcategoryService,
    updatePodcastService,
    deletePodcastService,
    searchPodcastsService,
    getMyPodcastsService,
};