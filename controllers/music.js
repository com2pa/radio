const musicRouter = require('express').Router();
const { userExtractor, roleAuthorization } = require('../middleware/auth');
const musicServices = require('../services/musicServices');
const systemLogger = require('../help/system/systemLogger');
const axios = require('axios');

// ENDPOINT: Debug del token y configuración (solo para desarrollo)
musicRouter.get('/debug-token', async (req, res) => {
    try {
        console.log('🔍 Probando configuración de Spotify...');
        
        // Importar servicio de autenticación
        const { getAccessToken, isTokenConfigured } = require('../services/spotifyAuth');
        
        // Verificar configuración
        if (!isTokenConfigured()) {
            return res.status(400).json({
                success: false,
                token_valid: false,
                message: '❌ Configuración de Spotify incompleta',
                solution: 'Configura SPOTIFY_ACCESS_TOKEN en .env, o SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET para renovación automática'
            });
        }
        
        // Obtener token automáticamente
        const currentToken = await getAccessToken();
        
        // Probar búsqueda (no probamos /me porque requiere autenticación de usuario)
        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
            params: {
                q: 'bad bunny',
                type: 'track',
                limit: 3
            },
            headers: { 'Authorization': `Bearer ${currentToken}` },
            timeout: 10000
        });
        
        // Verificar playlist de búsquedas
        await musicServices.ensureSearchPlaylist();
        
        res.json({
            success: true,
            token_valid: true,
            search_works: true,
            tracks_found: searchResponse.data.tracks.items.length,
            sample_tracks: searchResponse.data.tracks.items.map(t => ({
                name: t.name,
                artist: t.artists[0].name,
                id: t.id,
                preview_url: t.preview_url
            })),
            message: '✅ Token de Spotify funciona correctamente',
            auth_method: process.env.SPOTIFY_CLIENT_ID ? 'Client Credentials (automático)' : 'Access Token (manual)',
            note: '⚠️ Este endpoint es solo para desarrollo. Remueve en producción.'
        });
        
    } catch (error) {
        console.error('❌ Error en debug-token:', error.response?.data || error.message);
        res.status(400).json({
            success: false,
            token_valid: false,
            error: error.response?.data || error.message,
            message: '❌ Error con la configuración de Spotify',
            solution: error.message.includes('CLIENT_ID') 
                ? 'Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en .env, o usa SPOTIFY_ACCESS_TOKEN'
                : 'Verifica tu configuración en .env o actualiza el token'
        });
    }
});

musicRouter.get('/callback', (req, res) => {
    console.log('✅ Callback de Spotify accedido - Redirect URI válida');
    res.json({ 
        success: true,
        message: 'Callback de Spotify configurado correctamente',
        timestamp: new Date().toISOString(),
        note: 'Client Credentials Flow no usa OAuth redirects realmente'
    });
});

// GET - Buscar en Spotify (público)
musicRouter.get('/search', async (req, res) => {
    try {
        console.log('🔍 [SEARCH] Nueva búsqueda recibida:', req.query);
        
        const { 
            q, 
            type = 'track', 
            limit = 20, 
            offset = 0,
            track,
            artist,
            album,
            year,
            genre,
            tag,
            isrc,
            upc,
            include_external = 'audio',
            market,
            saveToDb = 'true'
        } = req.query;

        if (!q && !track && !artist && !album) {
            console.warn('⚠️ [SEARCH] Búsqueda sin parámetros válidos');
            return res.status(400).json({
                success: false,
                message: 'El parámetro de búsqueda "q" es requerido, o al menos uno de: track, artist, album',
                examples: {
                    simple: '/api/music/search?q=bad+bunny&type=track&limit=10',
                    advanced: '/api/music/search?track=Doxy&artist=Miles+Davis&type=album&limit=10',
                    with_market: '/api/music/search?q=pop&type=track&limit=10&market=US'
                }
            });
        }

        console.log('📋 [SEARCH] Parámetros procesados:', {
            q: q || '(vacío)',
            type,
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            saveToDb: saveToDb === 'true' || saveToDb === true
        });

        // Preparar opciones de búsqueda avanzada
        const searchOptions = {
            saveToDb: saveToDb === 'true' || saveToDb === true,
            track: track || null,
            artist: artist || null,
            album: album || null,
            year: year ? parseInt(year) : null,
            genre: genre || null,
            tag: tag || null,
            isrc: isrc || null,
            upc: upc || null,
            include_external: include_external || 'audio',
            market: market || null
        };

        console.log('🚀 [SEARCH] Llamando a searchSpotifyService...');
        const result = await musicServices.searchSpotifyService(
            q || '', 
            type, 
            parseInt(limit) || 20, 
            parseInt(offset) || 0,
            searchOptions
        );

        console.log('📊 [SEARCH] Resultado del servicio:', {
            success: result.success,
            message: result.message,
            count: result.count,
            hasData: !!result.data,
            source: result.data?.source || 'unknown',
            tracksCount: result.data?.results?.tracks?.length || 0
        });

        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('❌ [SEARCH] Error en endpoint de búsqueda:', error);
        console.error('❌ [SEARCH] Stack:', error.stack);
        console.error('❌ [SEARCH] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        res.status(500).json({
            success: false,
            error: 'Error buscando en Spotify',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET - Obtener todas las playlists (público)
musicRouter.get('/playlists', async (req, res) => {
    try {
        const result = await musicServices.getAllPlaylistsService();
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo playlists:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo playlists',
            details: error.message
        });
    }
});

// GET - Obtener canciones de una playlist (público)
musicRouter.get('/playlists/:id/songs', async (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        if (isNaN(playlistId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de playlist inválido'
            });
        }

        const filters = {
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const result = await musicServices.getSongsByPlaylistIdService(playlistId, filters);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo canciones de playlist:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo canciones de playlist',
            details: error.message
        });
    }
});

// GET - Obtener playlist por ID con canciones (público)
musicRouter.get('/playlists/:id', async (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        if (isNaN(playlistId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de playlist inválido'
            });
        }

        const result = await musicServices.getPlaylistByIdService(playlistId);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error obteniendo playlist:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo playlist',
            details: error.message
        });
    }
});

// GET - Obtener todas las canciones (público)
musicRouter.get('/songs', async (req, res) => {
    try {
        const filters = {
            playlist_id: req.query.playlist_id ? parseInt(req.query.playlist_id) : undefined,
            search: req.query.search || undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const result = await musicServices.getAllSongsService(filters);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error obteniendo canciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo canciones',
            details: error.message
        });
    }
});

// POST - Sincronizar playlist desde Spotify (requiere autenticación y rol admin)
musicRouter.post('/sync/:playlistId', 
    userExtractor, 
    roleAuthorization(['admin', 'superAdmin']), 
    async (req, res) => {
    try {
        const spotifyPlaylistId = req.params.playlistId;
        
        if (!spotifyPlaylistId) {
            return res.status(400).json({
                success: false,
                message: 'ID de playlist de Spotify es requerido'
            });
        }

        console.log(`🔄 Iniciando sincronización de playlist: ${spotifyPlaylistId}`);

        const result = await musicServices.syncPlaylistFromSpotify(spotifyPlaylistId);

        if (result.success) {
            await systemLogger.logCrudAction(
                req.user,
                'create',
                'playlist_sync',
                result.data?.playlist_id,
                req,
                {
                    spotify_playlist_id: spotifyPlaylistId,
                    songs_count: result.data?.songs?.length || 0
                }
            );
        } else {
            await systemLogger.logSystemError(
                req.user._id,
                req,
                'Error sincronizando playlist',
                new Error(result.message || 'Error desconocido')
            );
        }

        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error sincronizando playlist:', error);
        
        await systemLogger.logSystemError(
            req.user?._id,
            req,
            'Error crítico sincronizando playlist',
            error
        );

        res.status(500).json({
            success: false,
            error: 'Error sincronizando playlist',
            details: error.message
        });
    }
});

// GET - Verificar si playlist necesita sincronización (requiere autenticación)
musicRouter.get('/sync/check/:playlistId',
    userExtractor,
    roleAuthorization(['admin', 'superAdmin']),
    async (req, res) => {
    try {
        const spotifyPlaylistId = req.params.playlistId;
        const needsSyncResult = await musicServices.needsSync(spotifyPlaylistId);

        res.status(200).json({
            success: true,
            needs_sync: needsSyncResult,
            message: needsSyncResult 
                ? 'La playlist necesita sincronización' 
                : 'La playlist está actualizada'
        });
    } catch (error) {
        console.error('Error verificando sincronización:', error);
        res.status(500).json({
            success: false,
            error: 'Error verificando sincronización',
            details: error.message
        });
    }
});

// ENDPOINT: Estado del sistema de música
musicRouter.get('/status', async (req, res) => {
    try {
        const playlists = await musicServices.getAllPlaylistsService();
        const songs = await musicServices.getAllSongsService({ limit: 5 });
        
        res.json({
            success: true,
            system: 'Música API',
            status: 'operational',
            stats: {
                playlists_count: playlists.data?.length || 0,
                songs_count: songs.data?.length || 0,
                recent_songs: songs.data?.slice(0, 3) || []
            },
            endpoints: {
                search: 'GET /api/music/search?q=...',
                songs: 'GET /api/music/songs',
                playlists: 'GET /api/music/playlists',
                debug: 'GET /api/music/debug-token'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del sistema',
            details: error.message
        });
    }
});

// Endpoint para probar autenticación manual con Spotify
musicRouter.get('/test-auth-manual', async (req, res) => {
    try {
        const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
        
        console.log('🔐 Verificando credenciales...');
        console.log('Client ID:', SPOTIFY_CLIENT_ID ? '✅ Presente' : '❌ Faltante');
        console.log('Client Secret:', SPOTIFY_CLIENT_SECRET ? '✅ Presente' : '❌ Faltante');
        
        if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
            return res.status(400).json({
                success: false,
                error: 'Faltan Client ID o Client Secret en .env',
                client_id: SPOTIFY_CLIENT_ID ? '✅ Presente' : '❌ Faltante',
                client_secret: SPOTIFY_CLIENT_SECRET ? '✅ Presente' : '❌ Faltante',
                solution: 'Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET a tu archivo .env'
            });
        }

        // Autenticación manual con Spotify
        const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
        
        console.log('🔄 Contactando a Spotify API...');
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            }
        );

        console.log('✅ Autenticación exitosa!');
        res.json({
            success: true,
            message: '✅ Autenticación exitosa con Spotify API',
            token_type: response.data.token_type,
            expires_in: response.data.expires_in,
            access_token_preview: response.data.access_token.substring(0, 30) + '...',
            token_length: response.data.access_token.length
        });

    } catch (error) {
        console.error('❌ Error en autenticación:', error.response?.data || error.message);
        
        res.status(400).json({
            success: false,
            error: 'Error de autenticación con Spotify',
            details: error.response?.data || error.message,
            debug_info: {
                has_client_id: !!process.env.SPOTIFY_CLIENT_ID,
                has_client_secret: !!process.env.SPOTIFY_CLIENT_SECRET,
                client_id_length: process.env.SPOTIFY_CLIENT_ID?.length,
                client_secret_length: process.env.SPOTIFY_CLIENT_SECRET?.length
            },
            solution: 'Verifica que Client ID y Client Secret sean correctos en Spotify Dashboard'
        });
    }
});
module.exports = musicRouter;