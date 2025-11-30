const activityLogRouter = require('express').Router();
const { getActivityLogs } = require('../model/activityLog'); 
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const { generateActionDescription, formatUserInfo } = require('../help/audit/auditDescriptionHelper');


// Mostrar todos los logs de actividad
activityLogRouter.get('/', userExtractor, roleAuthorization(['admin','superAdmin']), async (req, res) => {
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

        // Construir filtros para PostgreSQL
        const filters = {};
        
        if (action) filters.action = action;
        if (entityType) filters.entity_type = entityType;
        if (userId) filters.user_id = parseInt(userId);

        // Manejar fechas (PostgreSQL usa formato diferente)
        if (startDate) {
            filters.start_date = new Date(startDate);
        }
        
        if (endDate) {
            // Ajustar la fecha final para incluir todo el día
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filters.end_date = end;
        }

        // Obtener logs paginados usando la función del modelo
        // console.log('🔍 [ActivityLog] Buscando logs con filtros:', filters);
        // console.log('🔍 [ActivityLog] Paginación:', { page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
        
        const result = await getActivityLogs(
            parseInt(page) || 1,
            parseInt(limit) || 20,
            filters
        );

        // console.log('✅ [ActivityLog] Resultado obtenido:', {
        //     total: result.total,
        //     logsCount: result.logs?.length || 0,
        //     page: result.page,
        //     totalPages: result.totalPages
        // });

        // Log de ejemplo del primer log para debugging
        // if (result.logs && result.logs.length > 0) {
        //     console.log('📋 [ActivityLog] Ejemplo de log (primer registro):', JSON.stringify(result.logs[0], null, 2));
        // }

        // Formatear logs para asegurar que todos los campos estén presentes y aplanados
        const formattedLogs = (result.logs || []).map(log => {
            // Información del usuario (siempre debe haber algo)
            const userInfo = {
                user_id: log.user_id,
                user_name: log.user_name || null,
                user_lastname: log.user_lastname || null,
                user_email: log.user_email || null
            };

            // Generar descripción legible de la acción
            const description = generateActionDescription(
                log.action,
                log.entity_type,
                log.entity_id,
                log.metadata || {}
            );

            // Formatear información del usuario de manera legible
            const userDisplay = formatUserInfo(userInfo, log.user_id, log.ip_address);

            // Devolver log con datos aplanados para facilitar el uso en el frontend
            return {
                log_id: log.log_id,
                user_id: log.user_id,
                action: log.action,
                entity_type: log.entity_type,
                entity_id: log.entity_id,
                ip_address: log.ip_address,
                user_agent: log.user_agent,
                metadata: log.metadata,
                created_at: log.created_at,
                updated_at: log.updated_at || log.created_at,
                // Información del usuario aplanada (para facilitar el uso en frontend)
                user_name: log.user_name || null,
                user_lastname: log.user_lastname || null,
                user_email: log.user_email || null,
                // Información del usuario en objeto (para compatibilidad)
                user: userInfo,
                // Información adicional para mejor comprensión
                user_display: userDisplay, // Información legible del usuario
                description: description // Descripción legible de la acción
            };
        });

        // Formatear respuesta para que sea consistente
        const response = {
            success: true,
            data: {
                logs: formattedLogs,
                pagination: {
                    page: result.page,
                    limit: parseInt(limit) || 20,
                    total: result.total || 0,
                    totalPages: result.totalPages || 0
                }
            },
            message: result.total > 0 
                ? `Logs de actividad obtenidos exitosamente (${result.total} total, mostrando ${formattedLogs.length})` 
                : 'No se encontraron logs de actividad'
        };

        // Evitar caché del navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.status(200).json(response);

    } catch (error) {
        // console.error('Error obteniendo logs de actividad:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error al obtener los logs de actividad'
        });
    }
});

module.exports = activityLogRouter;