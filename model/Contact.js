const { pool } = require('../db/index');

// Crear tabla de contactos
const createContactTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS contacts (
            contact_id SERIAL PRIMARY KEY,
            contact_name VARCHAR(100) NOT NULL,
            contact_lastname VARCHAR(100) NOT NULL,
            contact_email VARCHAR(100) NOT NULL,
            contact_phone VARCHAR(15),
            contact_message TEXT NOT NULL,
            contact_status BOOLEAN DEFAULT TRUE,
            contact_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            contact_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
     
    try {
        await pool.query(query);
        console.log('✅ Tabla "contacts" creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error creando tabla contacts:', error);
    }
};

// CREATE - Crear contacto
const createContact = async (contactData) => {
    const {
        contact_name,
        contact_lastname,
        contact_email,
        contact_phone,
        contact_message
    } = contactData;

    const query = `
        INSERT INTO contacts (
            contact_name, contact_lastname, contact_email, contact_phone, contact_message
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [
            contact_name,
            contact_lastname,
            contact_email,
            contact_phone,
            contact_message
        ]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error creating contact: ${error.message}`);
    }
};

// READ - Obtener todos los contactos
const getAllContacts = async () => {
    const query = `
        SELECT 
            contact_id,
            contact_name,
            contact_lastname,
            contact_email,
            contact_phone,
            contact_message,
            contact_status,
            contact_created_at,
            contact_updated_at
        FROM contacts
        ORDER BY contact_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting contacts: ${error.message}`);
    }
};

// READ - Obtener contactos activos
const getActiveContacts = async () => {
    const query = `
        SELECT 
            contact_id,
            contact_name,
            contact_lastname,
            contact_email,
            contact_phone,
            contact_message,
            contact_created_at
        FROM contacts
        WHERE contact_status = TRUE
        ORDER BY contact_created_at DESC
    `;
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting active contacts: ${error.message}`);
    }
};

// READ - Obtener contacto por ID
const getContactById = async (id) => {
    const query = `
        SELECT 
            contact_id,
            contact_name,
            contact_lastname,
            contact_email,
            contact_phone,
            contact_message,
            contact_status,
            contact_created_at,
            contact_updated_at
        FROM contacts
        WHERE contact_id = $1
    `;
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting contact by id: ${error.message}`);
    }
};

// READ - Obtener contactos por email
const getContactsByEmail = async (email) => {
    const query = `
        SELECT 
            contact_id,
            contact_name,
            contact_lastname,
            contact_email,
            contact_phone,
            contact_message,
            contact_status,
            contact_created_at
        FROM contacts
        WHERE contact_email = $1
        ORDER BY contact_created_at DESC
    `;
    try {
        const result = await pool.query(query, [email]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting contacts by email: ${error.message}`);
    }
};

// UPDATE - Actualizar contacto
const updateContact = async (id, contactData) => {
    const {
        contact_name,
        contact_lastname,
        contact_email,
        contact_phone,
        contact_message,
        contact_status
    } = contactData;

    // Construir query dinámica para actualizar solo los campos proporcionados
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (contact_name !== undefined) {
        fields.push(`contact_name = $${paramCount}`);
        values.push(contact_name);
        paramCount++;
    }
    if (contact_lastname !== undefined) {
        fields.push(`contact_lastname = $${paramCount}`);
        values.push(contact_lastname);
        paramCount++;
    }
    if (contact_email !== undefined) {
        fields.push(`contact_email = $${paramCount}`);
        values.push(contact_email);
        paramCount++;
    }
    if (contact_phone !== undefined) {
        fields.push(`contact_phone = $${paramCount}`);
        values.push(contact_phone);
        paramCount++;
    }
    if (contact_message !== undefined) {
        fields.push(`contact_message = $${paramCount}`);
        values.push(contact_message);
        paramCount++;
    }
    if (contact_status !== undefined) {
        fields.push(`contact_status = $${paramCount}`);
        values.push(contact_status);
        paramCount++;
    }

    // Siempre actualizar la fecha de modificación
    fields.push(`contact_updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
    }

    values.push(id);
    const query = `
        UPDATE contacts 
        SET ${fields.join(', ')}
        WHERE contact_id = $${paramCount}
        RETURNING *
    `;

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error updating contact: ${error.message}`);
    }
};

// UPDATE - Cambiar estado del contacto (activo/inactivo)
const updateContactStatus = async (id, status) => {
    const query = `
        UPDATE contacts 
        SET contact_status = $1, 
            contact_updated_at = CURRENT_TIMESTAMP
        WHERE contact_id = $2
        RETURNING contact_id, contact_name, contact_lastname, contact_status
    `;

    try {
        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error updating contact status: ${error.message}`);
    }
};

// DELETE - Eliminar contacto
const deleteContact = async (id) => {
    const query = 'DELETE FROM contacts WHERE contact_id = $1 RETURNING *';
    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error deleting contact: ${error.message}`);
    }
};

// Inicializar tabla
createContactTable();

module.exports = {
    createContact,
    getAllContacts,
    getActiveContacts,
    getContactById,
    getContactsByEmail,
    updateContact,
    updateContactStatus,
    deleteContact
};
