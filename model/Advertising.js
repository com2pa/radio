const { pool } = require('../db/index');

// Función para agregar columna publication_days si no existe
const addPublicationDaysColumnIfNotExists = async () => {
    try {
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'advertising' 
            AND column_name = 'publication_days'
        `;
        
        const result = await pool.query(checkColumnQuery);
        
        if (result.rows.length === 0) {
            await pool.query(`
                ALTER TABLE advertising 
                ADD COLUMN publication_days JSONB DEFAULT '[]'::jsonb
            `);
            console.log('✅ Columna "publication_days" agregada exitosamente a la tabla "advertising"');
        } else {
            console.log('✅ Columna "publication_days" ya existe en la tabla "advertising"');
        }
    } catch (error) {
        console.error('❌ Error agregando columna publication_days:', error);
    }
};

// Crear tabla de publicidad
const createAdvertisingTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS advertising (
            advertising_id SERIAL PRIMARY KEY,
            company_name VARCHAR(200) NOT NULL,
            rif VARCHAR(50) NOT NULL,
            company_address VARCHAR(500) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            time VARCHAR(50),
            advertising_days INT NOT NULL,
            publication_days JSONB DEFAULT '[]'::jsonb,
            status BOOLEAN DEFAULT TRUE,
            advertising_image VARCHAR(255) CHECK (advertising_image IS NULL OR advertising_image ~ '\.(jpg|jpeg|png|webp)$'),
            user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
            advertising_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            advertising_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_end_date_after_start CHECK (end_date >= start_date)
        )
    `;
    
    try {
        await pool.query(query);
        console.log('✅ Tabla "advertising" creada/verificada exitosamente');
        
        // Verificar si la columna publication_days existe, si no, agregarla
        await addPublicationDaysColumnIfNotExists();
    } catch (error) {
        console.error('❌ Error creando tabla advertising:', error);
        throw error;
    }
};

// CREATE - Crear publicidad
const createAdvertising = async (advertisingData) => {
    const {
        company_name,
        rif,
        company_address,
        phone,
        email,
        start_date,
        end_date,
        time,
        advertising_days,
        publication_days,
        status,
        advertising_image,
        user_id
    } = advertisingData;

    const query = `
        INSERT INTO advertising (
            company_name, rif, company_address, phone, email,
            start_date, end_date, time, advertising_days, publication_days, status,
            advertising_image, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    `;

    try {
        // Convertir publication_days a JSON si es un array
        const publicationDaysJson = publication_days 
            ? JSON.stringify(Array.isArray(publication_days) ? publication_days : [])
            : JSON.stringify([]);

        const result = await pool.query(query, [
            company_name,
            rif,
            company_address,
            phone,
            email,
            start_date,
            end_date,
            time || null,
            advertising_days,
            publicationDaysJson,
            status !== undefined ? status : true,
            advertising_image || null,
            user_id || null
        ]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando publicidad:', error);
        throw new Error(`Error creando publicidad: ${error.message}`);
    }
};

// READ - Obtener todas las publicidades
const getAllAdvertising = async () => {
    const query = `
        SELECT 
            a.*,
            u.user_name,
            u.user_lastname,
            u.user_email as user_creator_email
        FROM advertising a
        LEFT JOIN users u ON a.user_id = u.user_id
        ORDER BY a.advertising_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo publicidades:', error);
        throw new Error(`Error obteniendo publicidades: ${error.message}`);
    }
};

// READ - Obtener publicidades activas
const getActiveAdvertising = async () => {
    const query = `
        SELECT 
            a.*,
            u.user_name,
            u.user_lastname,
            u.user_email as user_creator_email
        FROM advertising a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE a.status = TRUE
        AND a.end_date >= CURRENT_DATE
        ORDER BY a.start_date ASC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo publicidades activas:', error);
        throw new Error(`Error obteniendo publicidades activas: ${error.message}`);
    }
};

// READ - Obtener publicidad por ID
const getAdvertisingById = async (id) => {
    const query = `
        SELECT 
            a.*,
            u.user_name,
            u.user_lastname,
            u.user_email as user_creator_email
        FROM advertising a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE a.advertising_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error obteniendo publicidad por ID:', error);
        throw new Error(`Error obteniendo publicidad por ID: ${error.message}`);
    }
};

// READ - Obtener publicidades por email de empresa
const getAdvertisingByEmail = async (email) => {
    const query = `
        SELECT 
            a.*,
            u.user_name,
            u.user_lastname,
            u.user_email as user_creator_email
        FROM advertising a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE a.email = $1
        ORDER BY a.advertising_created_at DESC
    `;
    try {
        const result = await pool.query(query, [email]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo publicidades por email:', error);
        throw new Error(`Error obteniendo publicidades por email: ${error.message}`);
    }
};

// READ - Obtener publicidades por RIF
const getAdvertisingByRif = async (rif) => {
    const query = `
        SELECT 
            a.*,
            u.user_name,
            u.user_lastname,
            u.user_email as user_creator_email
        FROM advertising a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE a.rif = $1
        ORDER BY a.advertising_created_at DESC
    `;
    try {
        const result = await pool.query(query, [rif]);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo publicidades por RIF:', error);
        throw new Error(`Error obteniendo publicidades por RIF: ${error.message}`);
    }
};

// UPDATE - Actualizar publicidad
const updateAdvertising = async (id, advertisingData) => {
    const {
        company_name,
        rif,
        company_address,
        phone,
        email,
        start_date,
        end_date,
        time,
        advertising_days,
        publication_days,
        status,
        advertising_image
    } = advertisingData;

    // Construir query dinámica para actualizar solo los campos proporcionados
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (company_name !== undefined) {
        fields.push(`company_name = $${paramCount}`);
        values.push(company_name);
        paramCount++;
    }
    if (rif !== undefined) {
        fields.push(`rif = $${paramCount}`);
        values.push(rif);
        paramCount++;
    }
    if (company_address !== undefined) {
        fields.push(`company_address = $${paramCount}`);
        values.push(company_address);
        paramCount++;
    }
    if (phone !== undefined) {
        fields.push(`phone = $${paramCount}`);
        values.push(phone);
        paramCount++;
    }
    if (email !== undefined) {
        fields.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
    }
    if (start_date !== undefined) {
        fields.push(`start_date = $${paramCount}`);
        values.push(start_date);
        paramCount++;
    }
    if (end_date !== undefined) {
        fields.push(`end_date = $${paramCount}`);
        values.push(end_date);
        paramCount++;
    }
    if (time !== undefined) {
        fields.push(`time = $${paramCount}`);
        values.push(time);
        paramCount++;
    }
    if (advertising_days !== undefined) {
        fields.push(`advertising_days = $${paramCount}`);
        values.push(advertising_days);
        paramCount++;
    }
    if (publication_days !== undefined) {
        fields.push(`publication_days = $${paramCount}`);
        // Convertir publication_days a JSON si es un array
        const publicationDaysJson = publication_days 
            ? JSON.stringify(Array.isArray(publication_days) ? publication_days : [])
            : JSON.stringify([]);
        values.push(publicationDaysJson);
        paramCount++;
    }
    if (status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
    }
    if (advertising_image !== undefined) {
        fields.push(`advertising_image = $${paramCount}`);
        values.push(advertising_image || null);
        paramCount++;
    }

    // Siempre actualizar la fecha de modificación
    fields.push(`advertising_updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
    }

    values.push(id);
    const query = `
        UPDATE advertising 
        SET ${fields.join(', ')}
        WHERE advertising_id = $${paramCount}
        RETURNING *
    `;

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Publicidad no encontrada');
        }
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando publicidad:', error);
        throw new Error(`Error actualizando publicidad: ${error.message}`);
    }
};

// UPDATE - Cambiar estado de la publicidad
const updateAdvertisingStatus = async (id, status) => {
    const query = `
        UPDATE advertising 
        SET status = $1, 
            advertising_updated_at = CURRENT_TIMESTAMP
        WHERE advertising_id = $2
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [status, id]);
        if (result.rows.length === 0) {
            throw new Error('Publicidad no encontrada');
        }
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando estado de publicidad:', error);
        throw new Error(`Error actualizando estado de publicidad: ${error.message}`);
    }
};

// DELETE - Eliminar publicidad
const deleteAdvertising = async (id) => {
    const query = 'DELETE FROM advertising WHERE advertising_id = $1 RETURNING *';
    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Publicidad no encontrada');
        }
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error eliminando publicidad:', error);
        throw new Error(`Error eliminando publicidad: ${error.message}`);
    }
};

// Verificar si la publicidad existe
const advertisingExists = async (id) => {
    const query = `SELECT COUNT(*) FROM advertising WHERE advertising_id = $1`;
    try {
        const result = await pool.query(query, [id]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error verificando existencia de publicidad:', error);
        throw error;
    }
};

// Inicializar tabla de forma asíncrona con retries
const initializeAdvertisingTable = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createAdvertisingTable();
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tabla advertising (intento ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudo inicializar la tabla advertising después de varios intentos');
            }
        }
    }
};

setImmediate(() => {
    initializeAdvertisingTable().catch(() => {});
});

module.exports = {
    createAdvertising,
    getAllAdvertising,
    getActiveAdvertising,
    getAdvertisingById,
    getAdvertisingByEmail,
    getAdvertisingByRif,
    updateAdvertising,
    updateAdvertisingStatus,
    deleteAdvertising,
    advertisingExists
};

