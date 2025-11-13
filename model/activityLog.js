const { pool } = require('../db/index');

// Actualizar constraint de acciones si la tabla ya existe
const updateActionConstraint = async () => {
    try {
        // Verificar si la tabla existe
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'activity_logs'
            );
        `;
        const tableExists = await pool.query(checkTableQuery);
        
        if (tableExists.rows[0].exists) {
            // Eliminar el constraint antiguo si existe
            const dropConstraintQuery = `
                ALTER TABLE activity_logs 
                DROP CONSTRAINT IF EXISTS activity_logs_action_check;
            `;
            await pool.query(dropConstraintQuery);
            
            // Agregar el nuevo constraint con todas las acciones
            const addConstraintQuery = `
                ALTER TABLE activity_logs 
                ADD CONSTRAINT activity_logs_action_check 
                CHECK (action IN (
                    'login', 'logout', 'login_failed', 'access_denied', 
                    'create', 'read', 'update', 'delete', 'edit', 
                    'system_start', 'system_stop', 'system_error'
                ));
            `;
            await pool.query(addConstraintQuery);
            console.log('✅ Constraint de acciones actualizado exitosamente');
        }
    } catch (error) {
        console.error('❌ Error actualizando constraint de acciones:', error);
    }
};

// Crear tabla de logs de actividad
const createActivityLogTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS activity_logs (
            log_id SERIAL PRIMARY KEY,
            user_id INTEGER NULL,
            action VARCHAR(50) NOT NULL CHECK (action IN (
                'login', 'logout', 'login_failed', 'access_denied', 
                'create', 'read', 'update', 'delete', 'edit', 
                'system_start', 'system_stop', 'system_error'
            )),
            entity_type VARCHAR(100) NULL,
            entity_id INTEGER NULL,
            ip_address VARCHAR(45) NOT NULL,
            user_agent TEXT NULL,
            metadata JSONB NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user
                FOREIGN KEY(user_id) 
                REFERENCES users(user_id)
                ON DELETE SET NULL
        )
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabla "activity_logs" creada/verificada exitosamente');
        
        // Actualizar constraint si la tabla ya existía
        await updateActionConstraint();
        
        // Crear índices para mejor performance
        await createIndexes();
    } catch (error) {
        console.error('❌ Error creando tabla activity_logs:', error);
    }
};

// Crear índices para mejor performance
const createIndexes = async () => {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id)'
    ];

    try {
        for (const indexQuery of indexes) {
            await pool.query(indexQuery);
        }
        console.log('✅ Índices para activity_logs creados/verificados');
    } catch (error) {
        console.error('❌ Error creando índices para activity_logs:', error);
    }
};

// Crear un nuevo registro de actividad
const createActivityLog = async (logData) => {
    const {
        user_id,
        action,
        entity_type,
        entity_id,
        ip_address,
        user_agent,
        metadata
    } = logData;

    const query = `
        INSERT INTO activity_logs 
            (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [
            user_id,
            action,
            entity_type,
            entity_id,
            ip_address,
            user_agent,
            metadata
        ]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error creating activity log: ${error.message}`);
    }
};

// Obtener logs con paginación
const getActivityLogs = async (page = 1, limit = 10, filters = {}) => {
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Construir condiciones WHERE dinámicamente
    if (filters.user_id) {
        paramCount++;
        whereConditions.push(`user_id = $${paramCount}`);
        queryParams.push(filters.user_id);
    }

    if (filters.action) {
        paramCount++;
        whereConditions.push(`action = $${paramCount}`);
        queryParams.push(filters.action);
    }

    if (filters.entity_type) {
        paramCount++;
        whereConditions.push(`entity_type = $${paramCount}`);
        queryParams.push(filters.entity_type);
    }

    if (filters.start_date) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(filters.start_date);
    }

    if (filters.end_date) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(filters.end_date);
    }

    const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

    // Consulta para obtener los datos
    const dataQuery = `
        SELECT 
            al.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    // Consulta para contar el total de registros
    const countQuery = `
        SELECT COUNT(*) 
        FROM activity_logs al
        ${whereClause}
    `;

    try {
        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);

        // Ejecutar ambas consultas en paralelo
        const [dataResult, countResult] = await Promise.all([
            pool.query(dataQuery, queryParams),
            pool.query(countQuery, whereConditions.length > 0 ? queryParams.slice(0, -2) : [])
        ]);

        return {
            logs: dataResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        };
    } catch (error) {
        throw new Error(`Error getting activity logs: ${error.message}`);
    }
};

// Obtener log por ID
const getActivityLogById = async (id) => {
    const query = `
        SELECT 
            al.*,
            u.user_name,
            u.user_lastname,
            u.user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        WHERE al.log_id = $1
    `;

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting activity log by id: ${error.message}`);
    }
};

// Obtener estadísticas de actividad
const getActivityStats = async (days = 30) => {
    const query = `
        SELECT 
            action,
            COUNT(*) as count,
            DATE(created_at) as date
        FROM activity_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY action, DATE(created_at)
        ORDER BY date DESC, count DESC
    `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting activity stats: ${error.message}`);
    }
};

// Inicializar tabla
createActivityLogTable();

module.exports = {
    createActivityLog,
    getActivityLogs,
    getActivityLogById,
    getActivityStats
};