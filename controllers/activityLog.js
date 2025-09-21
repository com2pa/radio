const activityLogRouter = require('express').Router();
const ActivityLog = require('../models/ActivityLog'); // Asegúrate de importar el modelo

// Mostrar todos los logs de actividad
activityLogRouter.get('/', async (req, res) => {
    try {
        const {
            action,
            entityType,
            userId,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        // Construir filtros
        const filter = {};
        
        if (action) filter.action = action;
        if (entityType) filter.entity_type = entityType; // Cambiado a entity_type para coincidir con PostgreSQL
        if (userId) filter.user_id = parseInt(userId); // Cambiado a user_id y convertido a número

        // Manejar fechas
        if (startDate || endDate) {
            filter.created_at = {}; // Cambiado a created_at para PostgreSQL
            
            if (startDate) {
                filter.created_at.$gte = new Date(startDate);
            }
            
            if (endDate) {
                // Ajustar la fecha final para incluir todo el día
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.created_at.$lte = end;
            }
        }

        // Opciones de paginación
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { created_at: -1 }, // Cambiado a created_at
            populate: { 
                path: 'user', 
                select: 'user_name user_email role_id' // Campos ajustados para PostgreSQL
            }
        };

        // Obtener logs paginados
        const logs = await ActivityLog.paginate(filter, options);

        // Respuesta exitosa
        res.status(200).json({
            success: true,
            data: logs,
            message: 'Logs de actividad obtenidos exitosamente'
        });

    } catch (error) {
        console.error('Error obteniendo logs de actividad:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error al obtener los logs de actividad'
        });
    }
});

module.exports = activityLogRouter;