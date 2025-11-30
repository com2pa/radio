/**
 * Helper para generar descripciones legibles de acciones de auditoría
 */

/**
 * Genera una descripción legible basada en la acción y metadata
 * @param {String} action - Tipo de acción (login, create, read, update, delete, etc.)
 * @param {String} entityType - Tipo de entidad (program, menu_item, user, etc.)
 * @param {Number} entityId - ID de la entidad
 * @param {Object} metadata - Metadatos adicionales
 * @returns {String} Descripción legible de la acción
 */
const generateActionDescription = (action, entityType, entityId, metadata = {}) => {
    const { method, path, email, name, reason, attempted_email, changes, query, params } = metadata;
    
    // Mapeo de acciones a descripciones en español
    const actionDescriptions = {
        'login': () => {
            const userInfo = name ? `como ${name}` : email ? `con email ${email}` : '';
            return `Inició sesión ${userInfo}${path ? ` desde ${path}` : ''}`;
        },
        'logout': () => {
            return `Cerró sesión${path ? ` desde ${path}` : ''}`;
        },
        'login_failed': () => {
            const emailInfo = attempted_email || email || 'desconocido';
            const reasonInfo = reason ? ` - ${reason}` : '';
            return `Intento fallido de inicio de sesión con email ${emailInfo}${reasonInfo}`;
        },
        'access_denied': () => {
            const reasonInfo = reason ? ` - ${reason}` : '';
            return `Acceso denegado${path ? ` a ${path}` : ''}${reasonInfo}`;
        },
        'create': () => {
            const entityName = entityType ? getEntityNameInSpanish(entityType) : 'recurso';
            const entityInfo = entityId ? ` #${entityId}` : '';
            const pathInfo = path ? ` en ${path}` : '';
            return `Creó ${entityName}${entityInfo}${pathInfo}`;
        },
        'read': () => {
            const entityName = entityType ? getEntityNameInSpanish(entityType) : 'recurso';
            const pathInfo = path ? ` desde ${path}` : '';
            const queryInfo = query && Object.keys(query).length > 0 ? ` con filtros: ${JSON.stringify(query)}` : '';
            return `Consultó ${entityName}${pathInfo}${queryInfo}`;
        },
        'update': () => {
            const entityName = entityType ? getEntityNameInSpanish(entityType) : 'recurso';
            const entityInfo = entityId ? ` #${entityId}` : '';
            const pathInfo = path ? ` en ${path}` : '';
            const changesInfo = changes ? ` - Cambios: ${formatChanges(changes)}` : '';
            return `Actualizó ${entityName}${entityInfo}${pathInfo}${changesInfo}`;
        },
        'delete': () => {
            const entityName = entityType ? getEntityNameInSpanish(entityType) : 'recurso';
            const entityInfo = entityId ? ` #${entityId}` : '';
            const pathInfo = path ? ` desde ${path}` : '';
            return `Eliminó ${entityName}${entityInfo}${pathInfo}`;
        },
        'edit': () => {
            const entityName = entityType ? getEntityNameInSpanish(entityType) : 'recurso';
            const entityInfo = entityId ? ` #${entityId}` : '';
            return `Editó ${entityName}${entityInfo}`;
        },
        'system_start': () => {
            return 'Sistema iniciado';
        },
        'system_stop': () => {
            return 'Sistema detenido';
        },
        'system_error': () => {
            const errorInfo = reason || 'Error desconocido';
            return `Error del sistema: ${errorInfo}`;
        }
    };

    const descriptionFn = actionDescriptions[action];
    if (descriptionFn) {
        return descriptionFn();
    }

    // Descripción genérica si no hay una específica
    const entityInfo = entityType ? `${entityType} ` : '';
    const idInfo = entityId ? `#${entityId} ` : '';
    return `Acción ${action} en ${entityInfo}${idInfo}${path ? `(${path})` : ''}`;
};

/**
 * Obtiene el nombre en español de una entidad
 * @param {String} entityType - Tipo de entidad en inglés
 * @returns {String} Nombre en español
 */
const getEntityNameInSpanish = (entityType) => {
    const entityNames = {
        'program': 'programa',
        'programs': 'programas',
        'menu_item': 'elemento de menú',
        'menu_items': 'elementos de menú',
        'user': 'usuario',
        'users': 'usuarios',
        'podcast': 'podcast',
        'podcasts': 'podcasts',
        'news': 'noticia',
        'news_item': 'noticia',
        'contact': 'contacto',
        'contacts': 'contactos',
        'profile': 'perfil',
        'password': 'contraseña',
        'comment': 'comentario',
        'comments': 'comentarios'
    };

    return entityNames[entityType?.toLowerCase()] || entityType;
};

/**
 * Formatea los cambios de una actualización de manera legible
 * @param {Object} changes - Objeto con los cambios
 * @returns {String} Descripción de los cambios
 */
const formatChanges = (changes) => {
    if (!changes || typeof changes !== 'object') {
        return 'sin detalles';
    }

    const changeKeys = Object.keys(changes);
    if (changeKeys.length === 0) {
        return 'sin cambios';
    }

    // Limitar a los primeros 3 campos para no hacer la descripción muy larga
    const limitedChanges = changeKeys.slice(0, 3).map(key => {
        const value = changes[key];
        // Si el valor es muy largo, truncarlo
        const displayValue = typeof value === 'string' && value.length > 30 
            ? value.substring(0, 30) + '...' 
            : value;
        return `${key}: ${displayValue}`;
    });

    const moreInfo = changeKeys.length > 3 ? ` y ${changeKeys.length - 3} más` : '';
    return limitedChanges.join(', ') + moreInfo;
};

/**
 * Genera información del usuario de manera legible
 * @param {Object} user - Información del usuario
 * @param {Number} userId - ID del usuario
 * @param {String} ipAddress - Dirección IP
 * @returns {String} Información del usuario formateada
 */
const formatUserInfo = (user, userId, ipAddress) => {
    if (user && user.user_name && user.user_email) {
        const fullName = user.user_lastname 
            ? `${user.user_name} ${user.user_lastname}` 
            : user.user_name;
        return `${fullName} (${user.user_email})`;
    }
    
    if (user && user.user_email) {
        return user.user_email;
    }
    
    if (user && user.user_name) {
        return user.user_name;
    }
    
    if (userId) {
        return `Usuario ID: ${userId}${ipAddress ? ` (IP: ${ipAddress})` : ''}`;
    }
    
    // Si no hay información del usuario, usar IP o sistema
    if (ipAddress && ipAddress !== 'system') {
        return `Usuario anónimo (IP: ${ipAddress})`;
    }
    
    return 'Sistema';
};

module.exports = {
    generateActionDescription,
    formatUserInfo,
    getEntityNameInSpanish
};

