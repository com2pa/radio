const { pool } = require('../db/index');
const { getUserById } = require('./User');

// ============================================
// CONFIGURACIÓN DE VALIDACIONES (Sujetas a cambios)
// ============================================
const VALIDATION_CONFIG = {
    // Duración del programa en minutos
    MIN_DURATION_MINUTES: 60,      // 1 hora mínimo
    MAX_DURATION_MINUTES: 120,     // 2 horas máximo
    
    // Espacio mínimo entre programas en minutos
    MIN_BREAK_MINUTES: 30,         // 30 minutos mínimo entre programas
    
    // Validación de roles de usuarios
    MIN_LOCUTOR_COUNT: 1,          // Mínimo 1 usuario con rol "locutor"
    MAX_PRODUCTOR_COUNT: 5,        // Máximo 5 usuarios con rol "productor"
    
    // Horario permitido para crear programas
    START_HOUR: 5,                 // 5:00 AM - hora de inicio permitida
    END_HOUR: 20                   // 8:00 PM (20:00) - hora de fin permitida
};

// Crear tabla de programas de radio
const createProgramsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS programs (
            program_id SERIAL PRIMARY KEY,
            program_title VARCHAR(200) NOT NULL,
            program_description TEXT,
            program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('tiktok_live', 'instagram_live', 'podcast')),
            tiktok_live_url VARCHAR(500),
            instagram_live_url VARCHAR(500),
            podcast_id INT REFERENCES podcasts(podcast_id) ON DELETE SET NULL,
            scheduled_date TIMESTAMP NOT NULL,
            duration_minutes INT NOT NULL CHECK (duration_minutes >= ${VALIDATION_CONFIG.MIN_DURATION_MINUTES} AND duration_minutes <= ${VALIDATION_CONFIG.MAX_DURATION_MINUTES}),
            program_status BOOLEAN DEFAULT TRUE,
            user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
            program_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            program_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            -- Validación: según el tipo, debe tener la URL o podcast_id correspondiente
            CONSTRAINT check_tiktok_live CHECK (
                program_type != 'tiktok_live' OR tiktok_live_url IS NOT NULL
            ),
            CONSTRAINT check_instagram_live CHECK (
                program_type != 'instagram_live' OR instagram_live_url IS NOT NULL
            ),
            CONSTRAINT check_podcast CHECK (
                program_type != 'podcast' OR podcast_id IS NOT NULL
            )
        );

        -- Crear tabla de relación programa-usuarios con roles específicos
        CREATE TABLE IF NOT EXISTS program_users (
            program_user_id SERIAL PRIMARY KEY,
            program_id INT NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            user_role VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(program_id, user_id)
        );

        -- Crear índices para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(program_type);
        CREATE INDEX IF NOT EXISTS idx_programs_scheduled_date ON programs(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(program_status);
        CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);
        CREATE INDEX IF NOT EXISTS idx_programs_podcast_id ON programs(podcast_id);
        CREATE INDEX IF NOT EXISTS idx_programs_duration ON programs(duration_minutes);
        CREATE INDEX IF NOT EXISTS idx_program_users_program_id ON program_users(program_id);
        CREATE INDEX IF NOT EXISTS idx_program_users_user_id ON program_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_program_users_role ON program_users(user_role);
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabla "programs" y "program_users" creadas/verificadas exitosamente');
    } catch (error) {
        console.error('❌ Error creando tablas programs:', error);
        throw error;
    }
};

// Función para verificar permisos de usuario
const checkUserPermissions = async (userId, allowedRoles = ['admin', 'superAdmin', 'editor']) => {
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        if (!allowedRoles.includes(user.role_name)) {
            throw new Error('No tienes permisos para realizar esta acción');
        }
        
        return user;
    } catch (error) {
        throw new Error(`Error verificando permisos: ${error.message}`);
    }
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

// Validar duración del programa
const validateDuration = (durationMinutes) => {
    if (!durationMinutes || durationMinutes < VALIDATION_CONFIG.MIN_DURATION_MINUTES) {
        throw new Error(`La duración mínima del programa es de ${VALIDATION_CONFIG.MIN_DURATION_MINUTES} minutos (1 hora)`);
    }
    
    if (durationMinutes > VALIDATION_CONFIG.MAX_DURATION_MINUTES) {
        throw new Error(`La duración máxima del programa es de ${VALIDATION_CONFIG.MAX_DURATION_MINUTES} minutos (2 horas)`);
    }
    
    return true;
};

// Validar espacio mínimo entre programas (30 minutos)
const validateProgramSpacing = async (scheduledDate, durationMinutes, excludeProgramId = null) => {
    const programStart = new Date(scheduledDate);
    const programEnd = new Date(programStart.getTime() + durationMinutes * 60000);
    const minBreakMinutes = VALIDATION_CONFIG.MIN_BREAK_MINUTES;
    
    // Calcular las fechas con el espacio mínimo
    const minStartTime = new Date(programStart.getTime() - minBreakMinutes * 60000);
    const maxEndTime = new Date(programEnd.getTime() + minBreakMinutes * 60000);
    
    // Buscar programas que se solapen o estén muy cerca
    let query = `
        SELECT 
            program_id,
            program_title,
            scheduled_date,
            duration_minutes,
            (scheduled_date + (duration_minutes || ' minutes')::INTERVAL) as end_date
        FROM programs
        WHERE program_status = true
        AND (
            -- Programa que termina muy cerca del inicio del nuevo programa (menos de 30 min)
            (scheduled_date + (duration_minutes || ' minutes')::INTERVAL) > $1::TIMESTAMP
            AND (scheduled_date + (duration_minutes || ' minutes')::INTERVAL) <= $2::TIMESTAMP
            OR
            -- Programa que inicia muy cerca del final del nuevo programa (menos de 30 min)
            scheduled_date >= $3::TIMESTAMP
            AND scheduled_date < $4::TIMESTAMP
            OR
            -- Programas que se solapan completamente
            scheduled_date < $4::TIMESTAMP
            AND (scheduled_date + (duration_minutes || ' minutes')::INTERVAL) > $2::TIMESTAMP
        )
    `;
    
    const params = [
        minStartTime.toISOString(),
        programStart.toISOString(),
        programEnd.toISOString(),
        maxEndTime.toISOString()
    ];
    
    if (excludeProgramId) {
        query = query.replace('WHERE', 'WHERE program_id != $5 AND');
        params.push(excludeProgramId);
    }
    
    try {
        const result = await pool.query(query, params);
        if (result.rows.length > 0) {
            const conflictingProgram = result.rows[0];
            throw new Error(
                `No se puede crear el programa. Debe haber un espacio mínimo de ${minBreakMinutes} minutos entre programas. ` +
                `Conflicto con programa "${conflictingProgram.program_title}" (ID: ${conflictingProgram.program_id})`
            );
        }
    } catch (error) {
        if (error.message.includes('No se puede crear')) {
            throw error;
        }
        console.error('❌ Error validando espaciado de programas:', error);
        throw new Error('Error al validar el espaciado entre programas');
    }
    
    return true;
};

// Validar roles de usuarios asociados al programa
const validateProgramUsers = async (programUsers = []) => {
    if (!Array.isArray(programUsers)) {
        throw new Error('programUsers debe ser un array');
    }
    
    // Contar usuarios por rol
    const locutores = programUsers.filter(pu => pu.user_role === 'locutor' || pu.user_role === 'Locutor');
    const productores = programUsers.filter(pu => pu.user_role === 'productor' || pu.user_role === 'Productor');
    
    // Validar mínimo de locutores
    if (locutores.length < VALIDATION_CONFIG.MIN_LOCUTOR_COUNT) {
        throw new Error(`Debe haber al menos ${VALIDATION_CONFIG.MIN_LOCUTOR_COUNT} usuario(s) con rol "locutor"`);
    }
    
    // Validar máximo de productores
    if (productores.length > VALIDATION_CONFIG.MAX_PRODUCTOR_COUNT) {
        throw new Error(`No puede haber más de ${VALIDATION_CONFIG.MAX_PRODUCTOR_COUNT} usuario(s) con rol "productor"`);
    }
    
    // Validar que los usuarios existan y tengan los roles correctos
    for (const programUser of programUsers) {
        const user = await getUserById(programUser.user_id);
        if (!user) {
            throw new Error(`Usuario con ID ${programUser.user_id} no encontrado`);
        }
    }
    
    return true;
};

// Función auxiliar para calcular fecha de fin del programa
const calculateEndDate = (scheduledDate, durationMinutes) => {
    const start = new Date(scheduledDate);
    return new Date(start.getTime() + durationMinutes * 60000);
};

// Validar horario permitido para programas (5:00 AM - 8:00 PM)
const validateProgramSchedule = (scheduledDate, durationMinutes) => {
    const programStart = new Date(scheduledDate);
    const programEnd = calculateEndDate(scheduledDate, durationMinutes);
    
    // Obtener la hora del inicio y fin del programa
    const startHour = programStart.getHours();
    const endHour = programEnd.getHours();
    const endMinutes = programEnd.getMinutes();
    
    // Verificar que el inicio esté dentro del horario permitido (5:00 AM - 8:00 PM)
    if (startHour < VALIDATION_CONFIG.START_HOUR || startHour >= VALIDATION_CONFIG.END_HOUR) {
        throw new Error(
            `El programa debe iniciar entre las ${VALIDATION_CONFIG.START_HOUR}:00 AM y las ${VALIDATION_CONFIG.END_HOUR}:00 PM. ` +
            `Hora de inicio programada: ${programStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        );
    }
    
    // Verificar que el fin también esté dentro del horario permitido
    // El programa debe terminar antes o exactamente a las 8:00 PM (20:00)
    if (endHour > VALIDATION_CONFIG.END_HOUR || (endHour === VALIDATION_CONFIG.END_HOUR && endMinutes > 0)) {
        throw new Error(
            `El programa debe terminar antes de las ${VALIDATION_CONFIG.END_HOUR}:00 PM (8:00 PM). ` +
            `Hora de fin programada: ${programEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        );
    }
    
    return true;
};

// ============================================
// FUNCIONES PARA GESTIONAR USUARIOS DEL PROGRAMA
// ============================================

// Agregar usuarios a un programa (puede usar un cliente de transacción o el pool)
const addProgramUsers = async (programId, programUsers = [], client = null) => {
    if (!programUsers || programUsers.length === 0) {
        return [];
    }
    
    const insertQuery = `
        INSERT INTO program_users (program_id, user_id, user_role)
        VALUES ($1, $2, $3)
        ON CONFLICT (program_id, user_id) DO UPDATE
        SET user_role = EXCLUDED.user_role
        RETURNING *
    `;
    
    const queryExecutor = client || pool;
    const insertedUsers = [];
    
    for (const programUser of programUsers) {
        try {
            const result = await queryExecutor.query(insertQuery, [
                programId,
                programUser.user_id,
                programUser.user_role
            ]);
            insertedUsers.push(result.rows[0]);
        } catch (error) {
            console.error(`❌ Error agregando usuario ${programUser.user_id} al programa:`, error);
            throw error;
        }
    }
    
    return insertedUsers;
};

// Obtener usuarios de un programa
const getProgramUsers = async (programId) => {
    const query = `
        SELECT 
            pu.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            r.role_name as user_system_role
        FROM program_users pu
        INNER JOIN users u ON pu.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE pu.program_id = $1
        ORDER BY pu.user_role, u.user_name
    `;
    
    try {
        const result = await pool.query(query, [programId]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo usuarios del programa:', error);
        throw error;
    }
};

// Eliminar usuarios de un programa (puede usar un cliente de transacción o el pool)
const removeProgramUsers = async (programId, userIds = [], client = null) => {
    const queryExecutor = client || pool;
    
    if (userIds.length === 0) {
        // Eliminar todos los usuarios del programa
        const query = `DELETE FROM program_users WHERE program_id = $1`;
        await queryExecutor.query(query, [programId]);
        return;
    }
    
    const query = `
        DELETE FROM program_users 
        WHERE program_id = $1 AND user_id = ANY($2::INT[])
    `;
    
    try {
        await queryExecutor.query(query, [programId, userIds]);
    } catch (error) {
        console.error('❌ Error eliminando usuarios del programa:', error);
        throw error;
    }
};

// CREATE - Crear un nuevo programa
const createProgram = async (programData, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId);
    
    const {
        program_title,
        program_description,
        program_type,
        tiktok_live_url,
        instagram_live_url,
        podcast_id,
        scheduled_date,
        duration_minutes,
        program_status = true,
        program_users = [] // Array de {user_id, user_role}
    } = programData;

    // ✅ VALIDACIÓN 1: Duración del programa (1-2 horas)
    if (!duration_minutes) {
        throw new Error('La duración del programa es requerida');
    }
    validateDuration(duration_minutes);

    // ✅ VALIDACIÓN 2: Horario permitido (5:00 AM - 8:00 PM)
    validateProgramSchedule(scheduled_date, duration_minutes);

    // ✅ VALIDACIÓN 3: Espacio mínimo de 30 minutos entre programas
    await validateProgramSpacing(scheduled_date, duration_minutes);

    // ✅ VALIDACIÓN 4: Validar roles de usuarios (mínimo 1 locutor, máximo 5 productores)
    if (program_users && program_users.length > 0) {
        await validateProgramUsers(program_users);
    } else {
        throw new Error('Debe asociar al menos un usuario con rol "locutor" al programa');
    }

    // Validar según el tipo de programa
    if (program_type === 'tiktok_live' && !tiktok_live_url) {
        throw new Error('Debe proporcionar la URL del live de TikTok');
    }
    
    if (program_type === 'instagram_live' && !instagram_live_url) {
        throw new Error('Debe proporcionar la URL del live de Instagram');
    }
    
    if (program_type === 'podcast' && !podcast_id) {
        throw new Error('Debe proporcionar el ID del podcast');
    }

    // Validar que no haya conflictos de tipo
    if (program_type === 'tiktok_live' && instagram_live_url) {
        throw new Error('No puede tener URL de Instagram Live si el tipo es TikTok Live');
    }
    
    if (program_type === 'instagram_live' && tiktok_live_url) {
        throw new Error('No puede tener URL de TikTok Live si el tipo es Instagram Live');
    }

    // Iniciar transacción
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Insertar programa
        const insertProgramQuery = `
            INSERT INTO programs (
                program_title, 
                program_description, 
                program_type,
                tiktok_live_url,
                instagram_live_url,
                podcast_id,
                scheduled_date,
                duration_minutes,
                program_status,
                user_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *
        `;
        
        const programValues = [
            program_title,
            program_description || null,
            program_type,
            tiktok_live_url || null,
            instagram_live_url || null,
            podcast_id || null,
            scheduled_date,
            duration_minutes,
            program_status,
            userId
        ];

        const programResult = await client.query(insertProgramQuery, programValues);
        const newProgram = programResult.rows[0];
        
        // Agregar usuarios al programa
        if (program_users && program_users.length > 0) {
            await addProgramUsers(newProgram.program_id, program_users, client);
        }
        
        await client.query('COMMIT');
        
        // Obtener programa completo con usuarios
        const completeProgram = await getProgramById(newProgram.program_id);
        console.log('✅ Programa creado exitosamente');
        return completeProgram;
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creando programa:', error);
        throw error;
    } finally {
        client.release();
    }
};

// READ - Obtener todos los programas con información completa
const getAllPrograms = async (filters = {}) => {
    let query = `
        SELECT 
            p.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            pod.podcast_title,
            pod.podcast_description,
            pod.podcast_url,
            pod.podcast_iframe,
            (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN podcasts pod ON p.podcast_id = pod.podcast_id
        WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    // Filtros opcionales
    if (filters.program_type) {
        paramCount++;
        query += ` AND p.program_type = $${paramCount}`;
        values.push(filters.program_type);
    }

    if (filters.program_status !== undefined) {
        paramCount++;
        query += ` AND p.program_status = $${paramCount}`;
        values.push(filters.program_status);
    }

    if (filters.user_id) {
        paramCount++;
        query += ` AND p.user_id = $${paramCount}`;
        values.push(filters.user_id);
    }

    if (filters.search) {
        paramCount++;
        query += ` AND (p.program_title ILIKE $${paramCount} OR p.program_description ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
    }

    if (filters.date_from) {
        paramCount++;
        query += ` AND p.scheduled_date >= $${paramCount}`;
        values.push(filters.date_from);
    }

    if (filters.date_to) {
        paramCount++;
        query += ` AND p.scheduled_date <= $${paramCount}`;
        values.push(filters.date_to);
    }

    // Ordenar por fecha programada
    query += ` ORDER BY p.scheduled_date ASC`;

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo programas:', error);
        throw error;
    }
};

// READ - Obtener un programa por ID con información completa
const getProgramById = async (id) => {
    const query = `
        SELECT 
            p.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            pod.podcast_title,
            pod.podcast_description,
            pod.podcast_url,
            pod.podcast_iframe,
            (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN podcasts pod ON p.podcast_id = pod.podcast_id
        WHERE p.program_id = $1
    `;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Programa no encontrado');
        }
        
        const program = result.rows[0];
        
        // Obtener usuarios asociados al programa
        const programUsers = await getProgramUsers(id);
        program.program_users = programUsers;
        
        return program;
    } catch (error) {
        console.error('❌ Error obteniendo programa por ID:', error);
        throw error;
    }
};

// READ - Obtener programas por tipo
const getProgramsByType = async (programType) => {
    const query = `
        SELECT 
            p.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            pod.podcast_title,
            pod.podcast_description,
            pod.podcast_url,
            pod.podcast_iframe,
            (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN podcasts pod ON p.podcast_id = pod.podcast_id
        WHERE p.program_type = $1
        AND p.program_status = true
        ORDER BY p.scheduled_date ASC
    `;
    
    try {
        const result = await pool.query(query, [programType]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo programas por tipo:', error);
        throw error;
    }
};

// READ - Obtener programas próximos (futuros)
const getUpcomingPrograms = async (limit = 10) => {
    const query = `
        SELECT 
            p.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            pod.podcast_title,
            pod.podcast_description,
            pod.podcast_url,
            pod.podcast_iframe,
            (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN podcasts pod ON p.podcast_id = pod.podcast_id
        WHERE p.scheduled_date >= CURRENT_TIMESTAMP
        AND p.program_status = true
        ORDER BY p.scheduled_date ASC
        LIMIT $1
    `;
    
    try {
        const result = await pool.query(query, [limit]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo programas próximos:', error);
        throw error;
    }
};

// READ - Obtener programa actual (en curso)
const getCurrentProgram = async () => {
    const query = `
        SELECT 
            p.*,
            u.user_name,
            u.user_lastname,
            u.user_email,
            pod.podcast_title,
            pod.podcast_description,
            pod.podcast_url,
            pod.podcast_iframe,
            (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN podcasts pod ON p.podcast_id = pod.podcast_id
        WHERE p.scheduled_date <= CURRENT_TIMESTAMP
        AND (p.scheduled_date + (p.duration_minutes || ' minutes')::INTERVAL) >= CURRENT_TIMESTAMP
        AND p.program_status = true
        ORDER BY p.scheduled_date DESC
        LIMIT 1
    `;
    
    try {
        const result = await pool.query(query);
        if (result.rows.length === 0) {
            return null;
        }
        const program = result.rows[0];
        const programUsers = await getProgramUsers(program.program_id);
        program.program_users = programUsers;
        return program;
    } catch (error) {
        console.error('❌ Error obteniendo programa actual:', error);
        throw error;
    }
};

// UPDATE - Actualizar un programa
const updateProgram = async (id, programData, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId);
    
    const {
        program_title,
        program_description,
        program_type,
        tiktok_live_url,
        instagram_live_url,
        podcast_id,
        scheduled_date,
        duration_minutes,
        program_status,
        program_users
    } = programData;

    // Obtener programa actual
    const currentProgram = await getProgramById(id);
    
    // Determinar valores nuevos o mantener los actuales
    const newType = program_type || currentProgram.program_type;
    const newTiktokUrl = tiktok_live_url !== undefined ? tiktok_live_url : currentProgram.tiktok_live_url;
    const newInstagramUrl = instagram_live_url !== undefined ? instagram_live_url : currentProgram.instagram_live_url;
    const newPodcastId = podcast_id !== undefined ? podcast_id : currentProgram.podcast_id;
    const newScheduledDate = scheduled_date || currentProgram.scheduled_date;
    const newDuration = duration_minutes || currentProgram.duration_minutes;

    // ✅ VALIDACIÓN 1: Duración del programa (1-2 horas)
    if (duration_minutes !== undefined) {
        validateDuration(duration_minutes);
    }

    // ✅ VALIDACIÓN 2: Horario permitido (5:00 AM - 8:00 PM) - solo si cambió fecha o duración
    if (scheduled_date !== undefined || duration_minutes !== undefined) {
        validateProgramSchedule(newScheduledDate, newDuration);
    }

    // ✅ VALIDACIÓN 3: Espacio mínimo de 30 minutos entre programas (solo si cambió fecha o duración)
    if (scheduled_date !== undefined || duration_minutes !== undefined) {
        await validateProgramSpacing(newScheduledDate, newDuration, id);
    }

    // ✅ VALIDACIÓN 4: Validar roles de usuarios si se están actualizando
    if (program_users !== undefined && Array.isArray(program_users)) {
        if (program_users.length > 0) {
            await validateProgramUsers(program_users);
        } else {
            // Si se envía un array vacío, verificar que al menos haya un locutor en los usuarios actuales
            const currentUsers = await getProgramUsers(id);
            const currentLocutores = currentUsers.filter(u => 
                u.user_role === 'locutor' || u.user_role === 'Locutor'
            );
            if (currentLocutores.length === 0) {
                throw new Error('Debe mantener al menos un usuario con rol "locutor" en el programa');
            }
        }
    }

    // Validar según el tipo de programa
    if (newType === 'tiktok_live' && !newTiktokUrl) {
        throw new Error('Debe proporcionar la URL del live de TikTok');
    }
    
    if (newType === 'instagram_live' && !newInstagramUrl) {
        throw new Error('Debe proporcionar la URL del live de Instagram');
    }
    
    if (newType === 'podcast' && !newPodcastId) {
        throw new Error('Debe proporcionar el ID del podcast');
    }

    // Iniciar transacción
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const updateQuery = `
            UPDATE programs 
            SET 
                program_title = COALESCE($1, program_title),
                program_description = COALESCE($2, program_description),
                program_type = COALESCE($3, program_type),
                tiktok_live_url = $4,
                instagram_live_url = $5,
                podcast_id = $6,
                scheduled_date = COALESCE($7, scheduled_date),
                duration_minutes = COALESCE($8, duration_minutes),
                program_status = COALESCE($9, program_status),
                program_updated_at = CURRENT_TIMESTAMP
            WHERE program_id = $10
            RETURNING *
        `;
        
        const values = [
            program_title,
            program_description,
            program_type,
            newTiktokUrl,
            newInstagramUrl,
            newPodcastId,
            scheduled_date,
            duration_minutes,
            program_status,
            id
        ];

        const result = await client.query(updateQuery, values);
        if (result.rows.length === 0) {
            throw new Error('Programa no encontrado');
        }
        
        // Actualizar usuarios si se proporcionaron
        if (program_users !== undefined) {
            // Eliminar usuarios actuales
            await removeProgramUsers(id, [], client);
            
            // Agregar nuevos usuarios
            if (program_users.length > 0) {
                await addProgramUsers(id, program_users, client);
            }
        }
        
        await client.query('COMMIT');
        
        // Obtener programa completo actualizado
        const updatedProgram = await getProgramById(id);
        console.log('✅ Programa actualizado exitosamente');
        return updatedProgram;
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error actualizando programa:', error);
        throw error;
    } finally {
        client.release();
    }
};

// DELETE - Eliminar un programa
const deleteProgram = async (id, userId) => {
    // Verificar permisos del usuario
    await checkUserPermissions(userId, ['admin', 'superAdmin']);
    
    const query = `DELETE FROM programs WHERE program_id = $1 RETURNING *`;
    
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Programa no encontrado');
        }
        console.log('✅ Programa eliminado exitosamente');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando programa:', error);
        throw error;
    }
};

// Función para verificar si el usuario es el creador del programa o tiene permisos superiores
const canModifyProgram = async (programId, userId) => {
    try {
        // Obtener información del programa
        const program = await getProgramById(programId);
        
        // Obtener información del usuario
        const user = await getUserById(userId);
        
        // Si el usuario es superAdmin o admin, puede modificar cualquier programa
        if (user.role_name === 'superAdmin' || user.role_name === 'admin') {
            return true;
        }
        
        // Si el usuario es editor, solo puede modificar sus propios programas
        if (user.role_name === 'editor' && program.user_id === userId) {
            return true;
        }
        
        return false;
    } catch (error) {
        throw new Error(`Error verificando permisos de modificación: ${error.message}`);
    }
};

// UPDATE - Actualizar programa con verificación de propiedad
const updateProgramWithOwnership = async (id, programData, userId) => {
    const canModify = await canModifyProgram(id, userId);
    if (!canModify) {
        throw new Error('No tienes permisos para modificar este programa');
    }
    
    return await updateProgram(id, programData, userId);
};

// DELETE - Eliminar programa con verificación de propiedad
const deleteProgramWithOwnership = async (id, userId) => {
    const canModify = await canModifyProgram(id, userId);
    if (!canModify) {
        throw new Error('No tienes permisos para eliminar este programa');
    }
    
    return await deleteProgram(id, userId);
};

// Función para verificar si ya existe un programa programado en la misma fecha/hora
const checkScheduledConflict = async (scheduledDate, excludeProgramId = null) => {
    let query = `
        SELECT COUNT(*) 
        FROM programs 
        WHERE scheduled_date = $1
        AND program_status = true
    `;
    
    let params = [scheduledDate];
    
    if (excludeProgramId) {
        query += ` AND program_id != $2`;
        params.push(excludeProgramId);
    }
    
    try {
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando conflicto de programación:', error);
        throw error;
    }
};

// ============================================
// FUNCIONES DE ANÁLISIS DE PROGRAMACIÓN
// ============================================

// Obtener programas de un día específico ordenados por horario
const getProgramsByDate = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(VALIDATION_CONFIG.START_HOUR, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(VALIDATION_CONFIG.END_HOUR, 0, 0, 0);
    
    const query = `
        SELECT 
            program_id,
            program_title,
            scheduled_date,
            duration_minutes,
            program_status,
            (scheduled_date + (duration_minutes || ' minutes')::INTERVAL) as program_end_date
        FROM programs
        WHERE DATE(scheduled_date) = DATE($1)
        AND program_status = true
        ORDER BY scheduled_date ASC
    `;
    
    try {
        const result = await pool.query(query, [date]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo programas por fecha:', error);
        throw error;
    }
};

// Calcular cuántos programas faltan para cubrir el día completo
const getProgramsNeededForDay = async (date) => {
    try {
        // Obtener todos los programas del día
        const programs = await getProgramsByDate(date);
        
        // Calcular el tiempo total del día disponible (5 AM - 8 PM = 15 horas = 900 minutos)
        const totalMinutesInDay = (VALIDATION_CONFIG.END_HOUR - VALIDATION_CONFIG.START_HOUR) * 60; // 900 minutos
        
        // Calcular tiempo ocupado por programas
        let occupiedMinutes = 0;
        programs.forEach(program => {
            occupiedMinutes += program.duration_minutes;
        });
        
        // Calcular tiempo libre
        const freeMinutes = totalMinutesInDay - occupiedMinutes;
        
        // Calcular cuántos programas faltan
        // Considerando: programa mínimo (60 min) + espacio (30 min) = 90 min por bloque
        // O programa máximo (120 min) + espacio (30 min) = 150 min por bloque
        const minBlockSize = VALIDATION_CONFIG.MIN_DURATION_MINUTES + VALIDATION_CONFIG.MIN_BREAK_MINUTES; // 90 min
        const maxBlockSize = VALIDATION_CONFIG.MAX_DURATION_MINUTES + VALIDATION_CONFIG.MIN_BREAK_MINUTES; // 150 min
        
        // Calcular programas faltantes (optimista y pesimista)
        const programsNeededOptimistic = Math.ceil(freeMinutes / maxBlockSize); // Asumiendo programas largos
        const programsNeededPessimistic = Math.ceil(freeMinutes / minBlockSize); // Asumiendo programas cortos
        
        // Calcular espacios publicitarios libres (cada espacio de 30 min)
        const advertisingSlots = Math.floor(freeMinutes / VALIDATION_CONFIG.MIN_BREAK_MINUTES);
        
        return {
            date: new Date(date).toISOString().split('T')[0],
            total_minutes_available: totalMinutesInDay,
            occupied_minutes: occupiedMinutes,
            free_minutes: freeMinutes,
            programs_scheduled: programs.length,
            programs_needed_min: programsNeededOptimistic, // Mínimo de programas necesarios (programas largos)
            programs_needed_max: programsNeededPessimistic, // Máximo de programas necesarios (programas cortos)
            advertising_slots_available: advertisingSlots,
            coverage_percentage: ((occupiedMinutes / totalMinutesInDay) * 100).toFixed(2)
        };
    } catch (error) {
        console.error('❌ Error calculando programas necesarios:', error);
        throw error;
    }
};

// Obtener espacios publicitarios libres (espacios de 30 minutos sin programar)
const getAvailableAdvertisingSlots = async (date) => {
    try {
        const programs = await getProgramsByDate(date);
        
        // Crear array de bloques de tiempo ocupados
        const occupiedBlocks = programs.map(program => ({
            start: new Date(program.scheduled_date),
            end: new Date(program.program_end_date),
            program_id: program.program_id,
            program_title: program.program_title
        }));
        
        // Ordenar por hora de inicio
        occupiedBlocks.sort((a, b) => a.start - b.start);
        
        // Calcular inicio y fin del día
        const dayStart = new Date(date);
        dayStart.setHours(VALIDATION_CONFIG.START_HOUR, 0, 0, 0);
        
        const dayEnd = new Date(date);
        dayEnd.setHours(VALIDATION_CONFIG.END_HOUR, 0, 0, 0);
        
        // Encontrar espacios libres
        const freeSlots = [];
        let currentTime = new Date(dayStart);
        
        for (const block of occupiedBlocks) {
            // Si hay espacio antes del programa
            if (currentTime < block.start) {
                const slotDuration = (block.start - currentTime) / 60000; // en minutos
                const slotsInGap = Math.floor(slotDuration / VALIDATION_CONFIG.MIN_BREAK_MINUTES);
                
                if (slotsInGap > 0) {
                    freeSlots.push({
                        start: new Date(currentTime),
                        end: new Date(block.start),
                        duration_minutes: slotDuration,
                        available_slots: slotsInGap
                    });
                }
            }
            
            // Mover el tiempo actual al final del programa + espacio mínimo
            currentTime = new Date(block.end);
            currentTime.setMinutes(currentTime.getMinutes() + VALIDATION_CONFIG.MIN_BREAK_MINUTES);
        }
        
        // Si hay espacio después del último programa
        if (currentTime < dayEnd) {
            const slotDuration = (dayEnd - currentTime) / 60000; // en minutos
            const slotsInGap = Math.floor(slotDuration / VALIDATION_CONFIG.MIN_BREAK_MINUTES);
            
            if (slotsInGap > 0) {
                freeSlots.push({
                    start: new Date(currentTime),
                    end: new Date(dayEnd),
                    duration_minutes: slotDuration,
                    available_slots: slotsInGap
                });
            }
        }
        
        // Calcular total de espacios publicitarios disponibles
        const totalAdvertisingSlots = freeSlots.reduce((sum, slot) => sum + slot.available_slots, 0);
        
        return {
            date: new Date(date).toISOString().split('T')[0],
            total_advertising_slots: totalAdvertisingSlots,
            free_slots: freeSlots,
            free_slots_count: freeSlots.length,
            total_free_minutes: freeSlots.reduce((sum, slot) => sum + slot.duration_minutes, 0)
        };
    } catch (error) {
        console.error('❌ Error obteniendo espacios publicitarios:', error);
        throw error;
    }
};

// Obtener cantidad de programas ocupados (programados y activos)
const getOccupiedProgramsCount = async (date = null) => {
    try {
        let query;
        let params = [];
        
        if (date) {
            // Programas de un día específico
            query = `
                SELECT COUNT(*) as count
                FROM programs
                WHERE DATE(scheduled_date) = DATE($1)
                AND program_status = true
            `;
            params = [date];
        } else {
            // Todos los programas activos
            query = `
                SELECT COUNT(*) as count
                FROM programs
                WHERE program_status = true
            `;
        }
        
        const result = await pool.query(query, params);
        const count = parseInt(result.rows[0].count);
        
        // Si es para un día específico, también obtener detalles
        if (date) {
            const programs = await getProgramsByDate(date);
            const totalMinutes = programs.reduce((sum, p) => sum + p.duration_minutes, 0);
            
            return {
                date: new Date(date).toISOString().split('T')[0],
                occupied_programs_count: count,
                total_minutes_occupied: totalMinutes,
                programs: programs.map(p => ({
                    program_id: p.program_id,
                    program_title: p.program_title,
                    start_time: p.scheduled_date,
                    duration_minutes: p.duration_minutes,
                    end_time: p.program_end_date
                }))
            };
        }
        
        return {
            occupied_programs_count: count,
            date: date ? new Date(date).toISOString().split('T')[0] : 'all_days'
        };
    } catch (error) {
        console.error('❌ Error obteniendo programas ocupados:', error);
        throw error;
    }
};

// Inicializar tabla
createProgramsTable();

module.exports = {
    // Configuración de validaciones
    VALIDATION_CONFIG,
    
    // Funciones de tabla
    createProgramsTable,
    
    // Funciones CRUD de programas
    createProgram,
    getAllPrograms,
    getProgramById,
    getProgramsByType,
    getUpcomingPrograms,
    getCurrentProgram,
    updateProgram,
    updateProgramWithOwnership,
    deleteProgram,
    deleteProgramWithOwnership,
    
    // Funciones de gestión de usuarios del programa
    addProgramUsers,
    getProgramUsers,
    removeProgramUsers,
    
    // Funciones de validación
    validateDuration,
    validateProgramSchedule,
    validateProgramSpacing,
    validateProgramUsers,
    calculateEndDate,
    
    // Funciones de permisos y utilidades
    checkUserPermissions,
    canModifyProgram,
    checkScheduledConflict,
    
    // Funciones de análisis de programación
    getProgramsByDate,
    getProgramsNeededForDay,
    getAvailableAdvertisingSlots,
    getOccupiedProgramsCount
};
