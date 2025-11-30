const { pool } = require('../db/index');

// Crear tabla de playlists de Spotify
const createPlaylistsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS playlists (
            playlist_id SERIAL PRIMARY KEY,
            spotify_playlist_id VARCHAR(255) UNIQUE NOT NULL,
            playlist_name VARCHAR(255) NOT NULL,
            playlist_description TEXT,
            playlist_image_url VARCHAR(500),
            total_tracks INT DEFAULT 0,
            last_synced_at TIMESTAMP,
            sync_interval_hours INT DEFAULT 6,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS songs (
            song_id SERIAL PRIMARY KEY,
            spotify_track_id VARCHAR(255) UNIQUE NOT NULL,
            playlist_id INT REFERENCES playlists(playlist_id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            artist VARCHAR(255),
            artists_json JSONB,
            album VARCHAR(255),
            album_id VARCHAR(255),
            duration_ms INT,
            preview_url VARCHAR(500),
            image_url VARCHAR(500),
            spotify_url VARCHAR(500),
            added_at TIMESTAMP,
            position_in_playlist INT,
            popularity INT,
            explicit BOOLEAN DEFAULT FALSE,
            is_local BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            last_accessed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_songs_playlist_id ON songs(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_songs_spotify_track_id ON songs(spotify_track_id);
        CREATE INDEX IF NOT EXISTS idx_playlists_spotify_id ON playlists(spotify_playlist_id);
        CREATE INDEX IF NOT EXISTS idx_songs_title ON songs USING gin(to_tsvector('spanish', title));
        CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs USING gin(to_tsvector('spanish', artist));
    `;
    
    try {
        await pool.query(query);
        console.log('✅ Tablas "playlists" y "songs" creadas/verificadas exitosamente');
        
        await updateSongsTableSchema();
        
    } catch (error) {
        console.error('❌ Error creando tablas de música:', error.message);
        // No hacer throw para evitar que crashee el servidor
        // El error se manejará en la función de inicialización
        throw error;
    }
};

// Actualizar esquema de la tabla songs con nuevas columnas
const updateSongsTableSchema = async () => {
    const alterQueries = [
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS artists_json JSONB`,
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_id VARCHAR(255)`,
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS popularity INT`,
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS explicit BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE songs ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP`,
        `ALTER TABLE songs ALTER COLUMN playlist_id DROP NOT NULL`
    ];

    try {
        for (const alterQuery of alterQueries) {
            try {
                await pool.query(alterQuery);
            } catch (error) {
                if (error.code !== '42701' && error.code !== '0A000') {
                    console.warn(`⚠️ Advertencia al actualizar esquema: ${error.message}`);
                }
            }
        }
        console.log('✅ Esquema de tabla "songs" actualizado exitosamente');
    } catch (error) {
        console.error('❌ Error actualizando esquema de tabla songs:', error);
    }
};

// CREATE - Crear o actualizar playlist
const createOrUpdatePlaylist = async (playlistData) => {
    const {
        spotify_playlist_id,
        playlist_name,
        playlist_description,
        playlist_image_url,
        total_tracks,
        sync_interval_hours = 6
    } = playlistData;

    const query = `
        INSERT INTO playlists (
            spotify_playlist_id,
            playlist_name,
            playlist_description,
            playlist_image_url,
            total_tracks,
            sync_interval_hours,
            last_synced_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (spotify_playlist_id) 
        DO UPDATE SET
            playlist_name = EXCLUDED.playlist_name,
            playlist_description = EXCLUDED.playlist_description,
            playlist_image_url = EXCLUDED.playlist_image_url,
            total_tracks = EXCLUDED.total_tracks,
            sync_interval_hours = EXCLUDED.sync_interval_hours,
            last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const values = [
        spotify_playlist_id,
        playlist_name,
        playlist_description || null,
        playlist_image_url || null,
        total_tracks || 0,
        sync_interval_hours
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando/actualizando playlist:', error);
        throw error;
    }
};

// CREATE - Crear o actualizar canción
const createOrUpdateSong = async (songData) => {
    const {
        spotify_track_id,
        playlist_id,
        title,
        artist,
        artists_json,
        album,
        album_id,
        duration_ms,
        preview_url,
        image_url,
        spotify_url,
        added_at,
        position_in_playlist,
        popularity,
        explicit,
        is_local
    } = songData;

    const query = `
        INSERT INTO songs (
            spotify_track_id,
            playlist_id,
            title,
            artist,
            artists_json,
            album,
            album_id,
            duration_ms,
            preview_url,
            image_url,
            spotify_url,
            added_at,
            position_in_playlist,
            popularity,
            explicit,
            is_local
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (spotify_track_id) 
        DO UPDATE SET
            playlist_id = COALESCE(EXCLUDED.playlist_id, songs.playlist_id),
            title = COALESCE(EXCLUDED.title, songs.title),
            artist = COALESCE(EXCLUDED.artist, songs.artist),
            artists_json = COALESCE(EXCLUDED.artists_json, songs.artists_json),
            album = COALESCE(EXCLUDED.album, songs.album),
            album_id = COALESCE(EXCLUDED.album_id, songs.album_id),
            duration_ms = COALESCE(EXCLUDED.duration_ms, songs.duration_ms),
            preview_url = COALESCE(EXCLUDED.preview_url, songs.preview_url),
            image_url = COALESCE(EXCLUDED.image_url, songs.image_url),
            spotify_url = COALESCE(EXCLUDED.spotify_url, songs.spotify_url),
            added_at = COALESCE(EXCLUDED.added_at, songs.added_at),
            position_in_playlist = COALESCE(EXCLUDED.position_in_playlist, songs.position_in_playlist),
            popularity = COALESCE(EXCLUDED.popularity, songs.popularity),
            explicit = COALESCE(EXCLUDED.explicit, songs.explicit),
            is_local = COALESCE(EXCLUDED.is_local, songs.is_local),
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const values = [
        spotify_track_id,
        playlist_id || null,
        title,
        artist || null,
        artists_json ? JSON.stringify(artists_json) : null,
        album || null,
        album_id || null,
        duration_ms || null,
        preview_url || null,
        image_url || null,
        spotify_url || null,
        added_at || null,
        position_in_playlist || null,
        popularity || null,
        explicit || false,
        is_local || false
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creando/actualizando canción:', error);
        throw error;
    }
};

// UPDATE - Actualizar last_accessed_at cuando se consulta una canción
const updateSongAccess = async (spotifyTrackId) => {
    const query = `
        UPDATE songs 
        SET last_accessed_at = CURRENT_TIMESTAMP
        WHERE spotify_track_id = $1
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [spotifyTrackId]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando acceso de canción:', error);
        return null;
    }
};

// READ - Obtener todas las playlists
const getAllPlaylists = async () => {
    const query = `
        SELECT * FROM playlists 
        WHERE is_active = TRUE
        ORDER BY playlist_name ASC
    `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo playlists:', error);
        throw error;
    }
};

// READ - Obtener playlist por ID
const getPlaylistById = async (playlistId) => {
    const query = `
        SELECT * FROM playlists 
        WHERE playlist_id = $1 AND is_active = TRUE
    `;

    try {
        const result = await pool.query(query, [playlistId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error obteniendo playlist:', error);
        throw error;
    }
};

// READ - Obtener playlist por Spotify ID
const getPlaylistBySpotifyId = async (spotifyPlaylistId) => {
    const query = `
        SELECT * FROM playlists 
        WHERE spotify_playlist_id = $1 AND is_active = TRUE
    `;

    try {
        const result = await pool.query(query, [spotifyPlaylistId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error obteniendo playlist por Spotify ID:', error);
        throw error;
    }
};

// READ - Obtener canción por Spotify Track ID
const getSongBySpotifyId = async (spotifyTrackId) => {
    const query = `
        SELECT * FROM songs 
        WHERE spotify_track_id = $1 AND is_active = TRUE
    `;

    try {
        const result = await pool.query(query, [spotifyTrackId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error obteniendo canción por Spotify ID:', error);
        throw error;
    }
};

// READ - Obtener canciones de una playlist
const getSongsByPlaylistId = async (playlistId, filters = {}) => {
    let query = `
        SELECT * FROM songs 
        WHERE playlist_id = $1 AND is_active = TRUE
    `;
    
    const values = [playlistId];
    let paramCount = 1;

    if (filters.limit) {
        paramCount++;
        query += ` ORDER BY position_in_playlist ASC, created_at ASC LIMIT $${paramCount}`;
        values.push(parseInt(filters.limit));
    } else {
        query += ` ORDER BY position_in_playlist ASC, created_at ASC`;
    }

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo canciones:', error);
        throw error;
    }
};

// READ - Obtener todas las canciones (de todas las playlists activas)
const getAllSongs = async (filters = {}) => {
    let query = `
        SELECT 
            s.*,
            p.playlist_name,
            p.spotify_playlist_id
        FROM songs s
        LEFT JOIN playlists p ON s.playlist_id = p.playlist_id
        WHERE s.is_active = TRUE
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.playlist_id) {
        paramCount++;
        query += ` AND s.playlist_id = $${paramCount}`;
        values.push(filters.playlist_id);
    }

    if (filters.search) {
        paramCount++;
        query += ` AND (s.title ILIKE $${paramCount} OR s.artist ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
    }

    if (filters.artist) {
        paramCount++;
        query += ` AND s.artist ILIKE $${paramCount}`;
        values.push(`%${filters.artist}%`);
    }

    if (filters.album) {
        paramCount++;
        query += ` AND s.album ILIKE $${paramCount}`;
        values.push(`%${filters.album}%`);
    }

    if (filters.limit) {
        paramCount++;
        query += ` ORDER BY s.created_at DESC LIMIT $${paramCount}`;
        values.push(parseInt(filters.limit));
    } else {
        query += ` ORDER BY s.created_at DESC`;
    }

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error obteniendo todas las canciones:', error);
        throw error;
    }
};

// UPDATE - Actualizar última sincronización
const updateLastSync = async (playlistId) => {
    const query = `
        UPDATE playlists 
        SET last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE playlist_id = $1
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [playlistId]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error actualizando última sincronización:', error);
        throw error;
    }
};

// DELETE - Desactivar canción (soft delete)
const deactivateSong = async (songId) => {
    const query = `
        UPDATE songs 
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE song_id = $1
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [songId]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error desactivando canción:', error);
        throw error;
    }
};

// DELETE - Eliminar canciones que ya no están en la playlist
const removeSongsNotInList = async (playlistId, activeSpotifyTrackIds) => {
    if (!activeSpotifyTrackIds || activeSpotifyTrackIds.length === 0) {
        return { deleted: 0 };
    }

    const query = `
        UPDATE songs 
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE playlist_id = $1 
        AND spotify_track_id != ALL($2::VARCHAR[])
        RETURNING song_id
    `;

    try {
        const result = await pool.query(query, [playlistId, activeSpotifyTrackIds]);
        return { deleted: result.rows.length };
    } catch (error) {
        console.error('❌ Error eliminando canciones:', error);
        throw error;
    }
};

// Inicializar tablas de forma asíncrona y no bloqueante
// Esperar un poco para asegurar que la conexión esté establecida
const initializeMusicTables = async () => {
    // Esperar un poco para asegurar que la conexión esté establecida
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
        try {
            await createPlaylistsTable();
            console.log('✅ Tablas de música inicializadas correctamente');
            return;
        } catch (error) {
            console.warn(`⚠️ Error inicializando tablas de música (intento ${i + 1}/${retries}):`, error.message);
            
            if (i < retries - 1) {
                console.log(`⏳ Reintentando en ${delay / 1000} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ No se pudieron inicializar las tablas de música después de varios intentos');
                console.error('   La aplicación continuará, pero las funcionalidades de música pueden no estar disponibles.');
            }
        }
    }
};

// Ejecutar inicialización de forma asíncrona sin bloquear
// Usar setImmediate para ejecutar después de que el módulo se cargue completamente
setImmediate(() => {
    initializeMusicTables().catch(err => {
        console.warn('⚠️ Error en inicialización asíncrona de tablas de música:', err.message);
        // No crashear el servidor si falla la inicialización
    });
});

module.exports = {
    createPlaylistsTable,
    createOrUpdatePlaylist,
    createOrUpdateSong,
    getAllPlaylists,
    getPlaylistById,
    getPlaylistBySpotifyId,
    getSongBySpotifyId,
    getSongsByPlaylistId,
    getAllSongs,
    updateLastSync,
    updateSongAccess,
    deactivateSong,
    removeSongsNotInList
};