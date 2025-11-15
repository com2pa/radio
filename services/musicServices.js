const musicModel = require('../model/music');
const axios = require('axios');
const { getAccessToken } = require('./spotifyAuth');

// Configuración de la API oficial de Spotify
const SPOTIFY_API_CONFIG = {
    baseURL: 'https://api.spotify.com/v1',
    /**
     * Obtener headers con token de acceso automáticamente
     * El token se renueva automáticamente cuando es necesario
     * 
     * @returns {Promise<Object>} Headers con Authorization Bearer token
     */
    getHeaders: async function() {
        const token = await getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
};

// Función para asegurar que existe la playlist de búsquedas
const ensureSearchPlaylist = async () => {
    try {
        let searchPlaylist = await musicModel.getPlaylistBySpotifyId('spotify_search_results');
        
        if (!searchPlaylist) {
            console.log('🆕 Creando playlist de búsquedas de Spotify...');
            searchPlaylist = await musicModel.createOrUpdatePlaylist({
                spotify_playlist_id: 'spotify_search_results',
                playlist_name: 'Búsquedas de Spotify',
                playlist_description: 'Canciones encontradas mediante búsqueda en Spotify',
                total_tracks: 0,
                sync_interval_hours: 24
            });
            console.log('✅ Playlist de búsquedas creada:', searchPlaylist.playlist_id);
        }
        
        return searchPlaylist.playlist_id;
    } catch (error) {
        console.error('❌ Error creando playlist de búsquedas:', error);
        return null;
    }
};

// Sincronizar playlist desde Spotify
const syncPlaylistFromSpotify = async (spotifyPlaylistId) => {
    try {
        console.log(`🔄 Sincronizando playlist de Spotify: ${spotifyPlaylistId}`);

        // Obtener información de la playlist desde Spotify
        const playlistResponse = await axios.get(`${SPOTIFY_API_CONFIG.baseURL}/playlists/${spotifyPlaylistId}`, {
            headers: await SPOTIFY_API_CONFIG.getHeaders()
        });

        const spotifyData = playlistResponse.data;

        if (!spotifyData || !spotifyData.name) {
            throw new Error('No se pudo obtener información de la playlist de Spotify');
        }

        // Preparar datos de la playlist
        const playlistData = {
            spotify_playlist_id: spotifyPlaylistId,
            playlist_name: spotifyData.name || 'Playlist sin nombre',
            playlist_description: spotifyData.description || null,
            playlist_image_url: spotifyData.images && spotifyData.images.length > 0 
                ? spotifyData.images[0].url 
                : null,
            total_tracks: spotifyData.tracks?.total || 0,
            sync_interval_hours: 6
        };

        // Crear o actualizar playlist en la BD
        const playlist = await musicModel.createOrUpdatePlaylist(playlistData);
        console.log(`✅ Playlist "${playlist.playlist_name}" guardada/actualizada (ID: ${playlist.playlist_id})`);

        // Obtener todas las canciones de la playlist (la API oficial devuelve tracks.items)
        let tracks = spotifyData.tracks?.items || [];
        const activeTrackIds = [];

        // Si hay más canciones, obtenerlas todas (paginación)
        let nextUrl = spotifyData.tracks?.next;
        while (nextUrl) {
            try {
                const nextResponse = await axios.get(nextUrl, {
                    headers: await SPOTIFY_API_CONFIG.getHeaders()
                });
                tracks = tracks.concat(nextResponse.data.items || []);
                nextUrl = nextResponse.data.next;
            } catch (error) {
                console.warn('⚠️ Error obteniendo más canciones de la playlist:', error.message);
                break;
            }
        }

        // Procesar cada canción
        for (let i = 0; i < tracks.length; i++) {
            const trackItem = tracks[i];
            const track = trackItem.track || trackItem;
            
            if (!track || !track.id) {
                console.warn(`⚠️ Canción sin ID en posición ${i}, saltando...`);
                continue;
            }

            const songData = {
                spotify_track_id: track.id,
                playlist_id: playlist.playlist_id,
                title: track.name || 'Sin título',
                artist: track.artists && track.artists.length > 0 
                    ? track.artists.map(a => a.name).join(', ') 
                    : 'Artista desconocido',
                artists_json: track.artists || [],
                album: track.album?.name || null,
                album_id: track.album?.id || null,
                duration_ms: track.duration_ms || null,
                preview_url: track.preview_url || null,
                image_url: track.album?.images && track.album.images.length > 0 
                    ? track.album.images[0].url 
                    : null,
                spotify_url: track.external_urls?.spotify || null,
                popularity: track.popularity || null,
                explicit: track.explicit || false,
                is_local: track.is_local || false,
                added_at: trackItem.added_at ? new Date(trackItem.added_at) : null,
                position_in_playlist: i + 1
            };

            await musicModel.createOrUpdateSong(songData);
            activeTrackIds.push(track.id);
        }

        // Desactivar canciones que ya no están en la playlist
        if (activeTrackIds.length > 0) {
            await musicModel.removeSongsNotInList(playlist.playlist_id, activeTrackIds);
        }

        // Actualizar última sincronización
        await musicModel.updateLastSync(playlist.playlist_id);

        // Obtener playlist completa con canciones
        const completePlaylist = await getPlaylistWithSongs(playlist.playlist_id);

        console.log(`✅ Playlist sincronizada exitosamente: ${completePlaylist.songs.length} canciones`);

        return {
            success: true,
            message: 'Playlist sincronizada exitosamente',
            data: completePlaylist
        };

    } catch (error) {
        console.error('❌ Error sincronizando playlist:', error);
        
        if (error.response) {
            console.error('Respuesta de error de API:', error.response.data);
            return {
                success: false,
                message: `Error de API: ${error.response.data?.message || error.message}`,
                data: null
            };
        }

        return {
            success: false,
            message: error.message || 'Error sincronizando playlist',
            data: null
        };
    }
};

// Obtener playlist con sus canciones
const getPlaylistWithSongs = async (playlistId) => {
    try {
        const playlist = await musicModel.getPlaylistById(playlistId);
        if (!playlist) {
            throw new Error('Playlist no encontrada');
        }

        const songs = await musicModel.getSongsByPlaylistId(playlistId);
        return {
            ...playlist,
            songs: songs
        };
    } catch (error) {
        console.error('❌ Error obteniendo playlist con canciones:', error);
        throw error;
    }
};

// Obtener todas las playlists
const getAllPlaylistsService = async () => {
    try {
        const playlists = await musicModel.getAllPlaylists();
        return {
            success: true,
            message: 'Playlists obtenidas exitosamente',
            data: playlists,
            count: playlists.length
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

// Obtener playlist por ID
const getPlaylistByIdService = async (playlistId) => {
    try {
        const playlist = await getPlaylistWithSongs(playlistId);
        return {
            success: true,
            message: 'Playlist obtenida exitosamente',
            data: playlist
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

// Obtener todas las canciones
const getAllSongsService = async (filters = {}) => {
    try {
        const songs = await musicModel.getAllSongs(filters);
        return {
            success: true,
            message: 'Canciones obtenidas exitosamente',
            data: songs,
            count: songs.length
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

// Obtener canciones de una playlist
const getSongsByPlaylistIdService = async (playlistId, filters = {}) => {
    try {
        const songs = await musicModel.getSongsByPlaylistId(playlistId, filters);
        return {
            success: true,
            message: 'Canciones obtenidas exitosamente',
            data: songs,
            count: songs.length
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

// Verificar si necesita sincronización
const needsSync = async (spotifyPlaylistId) => {
    try {
        const playlist = await musicModel.getPlaylistBySpotifyId(spotifyPlaylistId);
        
        if (!playlist) {
            return true; // No existe, necesita sincronización
        }

        if (!playlist.last_synced_at) {
            return true; // Nunca se ha sincronizado
        }

        // Calcular si ha pasado el intervalo de sincronización
        const lastSync = new Date(playlist.last_synced_at);
        const now = new Date();
        const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

        return hoursSinceSync >= playlist.sync_interval_hours;
    } catch (error) {
        console.error('❌ Error verificando necesidad de sincronización:', error);
        return true; // En caso de error, sincronizar
    }
};

// Guardar canciones encontradas en Spotify a la base de datos
const saveTracksToDatabase = async (tracks, defaultPlaylistId = null) => {
    const savedTracks = [];
    
    for (const track of tracks) {
        try {
            if (!track || !track.id) continue;

            // Verificar si la canción ya existe en la BD
            const existingSong = await musicModel.getSongBySpotifyId(track.id);
            
            if (!existingSong) {
                // Crear una playlist temporal si no hay una por defecto
                let playlistId = defaultPlaylistId;
                if (!playlistId) {
                    playlistId = await ensureSearchPlaylist();
                }

                const songData = {
                    spotify_track_id: track.id,
                    playlist_id: playlistId,
                    title: track.name || 'Sin título',
                    artist: track.artists && track.artists.length > 0 
                        ? track.artists.map(a => a.name).join(', ') 
                        : 'Artista desconocido',
                    artists_json: track.artists || [],
                    album: track.album?.name || null,
                    album_id: track.album?.id || null,
                    duration_ms: track.duration_ms || null,
                    preview_url: track.preview_url || null,
                    image_url: track.album?.images && track.album.images.length > 0 
                        ? track.album.images[0].url 
                        : null,
                    spotify_url: track.external_urls?.spotify || null,
                    popularity: track.popularity || null,
                    explicit: track.explicit || false,
                    is_local: track.is_local || false,
                    position_in_playlist: savedTracks.length + 1
                };

                const savedSong = await musicModel.createOrUpdateSong(songData);
                savedTracks.push(savedSong);
            } else {
                savedTracks.push(existingSong);
            }
        } catch (error) {
            console.error('Error guardando canción:', error);
        }
    }

    return savedTracks;
};

// Buscar en Spotify usando la API oficial y guardar resultados en BD
const searchSpotifyService = async (query, type = 'track', limit = 20, offset = 0, options = {}) => {
    try {
        // Extraer opciones
        const {
            saveToDb = true,
            track = null,
            artist = null,
            album = null,
            year = null,
            genre = null,
            tag = null,
            isrc = null,
            upc = null,
            include_external = 'audio',
            market = null
        } = options;

        // Si no hay query pero hay operadores, construir query
        let searchQuery = query || '';
        
        // Construir query de búsqueda avanzada si se proporcionan operadores
        const queryParts = [];
        if (track) queryParts.push(`track:${track}`);
        if (artist) queryParts.push(`artist:${artist}`);
        if (album) queryParts.push(`album:${album}`);
        if (year) queryParts.push(`year:${year}`);
        if (genre) queryParts.push(`genre:${genre}`);
        if (tag) queryParts.push(`tag:${tag}`);
        if (isrc) queryParts.push(`isrc:${isrc}`);
        if (upc) queryParts.push(`upc:${upc}`);
        
        // Si hay operadores, combinarlos con el query principal
        if (queryParts.length > 0) {
            searchQuery = queryParts.join(' ') + (searchQuery.trim() ? ` ${searchQuery.trim()}` : '');
        }

        if (!searchQuery || searchQuery.trim() === '') {
            throw new Error('El término de búsqueda es requerido, o al menos uno de: track, artist, album');
        }

        // Validar tipos permitidos
        const allowedTypes = ['albums', 'artists', 'playlists', 'track', 'multi'];
        if (!allowedTypes.includes(type)) {
            throw new Error(`Tipo de búsqueda inválido. Debe ser uno de: ${allowedTypes.join(', ')}`);
        }

        console.log(`🔍 Buscando: "${searchQuery}" (tipo: ${type}, limit: ${limit}, offset: ${offset})`);

        // PRIMERO: SIEMPRE buscar en la base de datos local primero (caché)
        if (type === 'track' || type === 'multi') {
            try {
                console.log(`📚 Buscando primero en la base de datos local (caché)...`);
                
                const dbFilters = { 
                    search: searchQuery,
                    limit: limit * 2
                };
                
                // Si hay operadores específicos, usarlos para búsqueda más precisa
                if (artist) dbFilters.artist = artist;
                if (album) dbFilters.album = album;
                
                const dbResults = await musicModel.getAllSongs(dbFilters);

                if (dbResults && dbResults.length > 0) {
                    console.log(`✅ Encontradas ${dbResults.length} canciones en la BD local (caché)`);
                    
                    // Actualizar last_accessed_at para las canciones encontradas
                    for (const song of dbResults.slice(0, limit)) {
                        await musicModel.updateSongAccess(song.spotify_track_id);
                    }
                    
                    // Formatear resultados de BD para que coincidan con el formato de Spotify
                    const formattedTracks = dbResults.slice(0, limit).map(song => {
                        let artists = [];
                        if (song.artists_json) {
                            try {
                                artists = typeof song.artists_json === 'string' 
                                    ? JSON.parse(song.artists_json) 
                                    : song.artists_json;
                            } catch (e) {
                                artists = song.artist ? [{ name: song.artist }] : [];
                            }
                        } else {
                            artists = song.artist ? [{ name: song.artist }] : [];
                        }
                        
                        return {
                            id: song.spotify_track_id,
                            name: song.title,
                            artists: artists,
                            album: song.album ? { 
                                id: song.album_id,
                                name: song.album, 
                                images: song.image_url ? [{ url: song.image_url }] : [] 
                            } : null,
                            duration_ms: song.duration_ms,
                            preview_url: song.preview_url,
                            external_urls: { spotify: song.spotify_url },
                            popularity: song.popularity,
                            explicit: song.explicit,
                            song_id: song.song_id,
                            playlist_id: song.playlist_id,
                            image_url: song.image_url,
                            artist: song.artist,
                            source: 'database',
                            last_accessed: song.last_accessed_at
                        };
                    });

                    return {
                        success: true,
                        message: `Búsqueda realizada exitosamente (desde caché local)`,
                        data: {
                            query: searchQuery,
                            original_query: query || null,
                            type: type,
                            total_results: formattedTracks.length,
                            results: {
                                tracks: formattedTracks
                            },
                            source: 'database',
                            cached: true
                        },
                        count: formattedTracks.length
                    };
                } else {
                    console.log(`📭 No se encontraron resultados en BD, buscando en Spotify...`);
                }
            } catch (dbError) {
                console.warn('⚠️ Error buscando en BD local, continuando con Spotify:', dbError.message);
            }
        }

        // SEGUNDO: Si no hay resultados en BD, buscar en Spotify
        console.log(`🌐 [searchSpotifyService] Buscando en Spotify: "${searchQuery}" (tipo: ${type}, limit: ${limit}, offset: ${offset})`);

        // La API oficial de Spotify requiere que los tipos estén separados por comas
        const searchTypes = type === 'multi' 
            ? 'album,artist,playlist,track' 
            : type;

        // Construir parámetros de la petición
        const params = {
            q: searchQuery,
            type: searchTypes,
            limit: Math.min(Math.max(limit, 1), 50),
            offset: Math.max(offset, 0)
        };

        // Agregar parámetros opcionales
        if (include_external) {
            params.include_external = include_external;
        }
        if (market) {
            params.market = market;
        }

        console.log('🔑 [searchSpotifyService] Obteniendo headers de autenticación...');
        const headers = await SPOTIFY_API_CONFIG.getHeaders();
        console.log('✅ [searchSpotifyService] Headers obtenidos, haciendo petición a Spotify...');
        console.log('📡 [searchSpotifyService] URL:', `${SPOTIFY_API_CONFIG.baseURL}/search`);
        console.log('📡 [searchSpotifyService] Params:', params);
        console.log('🌐 [searchSpotifyService] Haciendo request a Spotify API...');
        console.log('🔗 URL:', `${SPOTIFY_API_CONFIG.baseURL}/search`);
        console.log('📦 Parámetros finales:', params);


        const response = await axios.get(`${SPOTIFY_API_CONFIG.baseURL}/search`, {
            params: params,
            headers: headers
        });
        
        console.log('✅ [searchSpotifyService] Respuesta recibida de Spotify, status:', response.status);

        const spotifyData = response.data;

        // Debug: Ver qué está devolviendo la API
        console.log('✅ [searchSpotifyService] Respuesta recibida de Spotify, status:', response.status);
        console.log('📊 [searchSpotifyService] Estructura completa de respuesta:', {
            status: response.status,
            hasTracks: !!response.data.tracks,
            tracksTotal: response.data.tracks?.total || 0,
            tracksItems: response.data.tracks?.items?.length || 0,
            hasAlbums: !!response.data.albums,
            hasArtists: !!response.data.artists
        });

        // Formatear resultados según el tipo
        let formattedResults = {
            query: searchQuery,
            original_query: query || null,
            type: type,
            total_results: 0,
            results: {},
            search_params: {
                limit: limit,
                offset: offset,
                include_external: include_external,
                market: market,
                operators: {
                    track: track || null,
                    artist: artist || null,
                    album: album || null,
                    year: year || null,
                    genre: genre || null,
                    tag: tag || null,
                    isrc: isrc || null,
                    upc: upc || null
                }
            }
        };

        // Procesar albums
        if (type === 'multi' || type === 'albums') {
            const albums = spotifyData.albums?.items || spotifyData.albums || [];
            formattedResults.results.albums = Array.isArray(albums) ? albums : [];
            formattedResults.total_results += formattedResults.results.albums.length;
            console.log(`✅ Albums encontrados: ${formattedResults.results.albums.length}`);
        }

        // Procesar artists
        if (type === 'multi' || type === 'artists') {
            const artists = spotifyData.artists?.items || spotifyData.artists || [];
            formattedResults.results.artists = Array.isArray(artists) ? artists : [];
            formattedResults.total_results += formattedResults.results.artists.length;
            console.log(`✅ Artists encontrados: ${formattedResults.results.artists.length}`);
        }

        // Procesar playlists
        if (type === 'multi' || type === 'playlists') {
            const playlists = spotifyData.playlists?.items || spotifyData.playlists || [];
            formattedResults.results.playlists = Array.isArray(playlists) ? playlists : [];
            formattedResults.total_results += formattedResults.results.playlists.length;
            console.log(`✅ Playlists encontradas: ${formattedResults.results.playlists.length}`);
        }

        // Procesar tracks        
        if (type === 'multi' || type === 'track') {
            console.log('🔍 [searchSpotifyService] Procesando tracks...');
            console.log('📦 Estructura de datos de tracks:', {
                hasTracks: !!spotifyData.tracks,
                hasItems: !!spotifyData.tracks?.items,
                itemsCount: spotifyData.tracks?.items?.length || 0,
                tracksData: spotifyData.tracks
            });
            
            const tracks = spotifyData.tracks?.items || spotifyData.tracks || [];
            formattedResults.results.tracks = Array.isArray(tracks) ? tracks : [];
            formattedResults.total_results += formattedResults.results.tracks.length;
            
            console.log(`✅ [searchSpotifyService] Tracks procesados: ${formattedResults.results.tracks.length}`);
            
            if (formattedResults.results.tracks.length > 0) {
                console.log('🎵 Primer track:', {
                    name: formattedResults.results.tracks[0].name,
                    artist: formattedResults.results.tracks[0].artists?.[0]?.name,
                    id: formattedResults.results.tracks[0].id,
                    preview_url: formattedResults.results.tracks[0].preview_url
                });
            }
            
            // SIEMPRE guardar tracks en la base de datos para caché (independiente del token)
            if (formattedResults.results.tracks.length > 0) {
                console.log(`💾 Guardando ${formattedResults.results.tracks.length} canciones en la base de datos (caché)...`);
                try {
                    const savedTracks = await saveTracksToDatabase(formattedResults.results.tracks);
                    console.log(`✅ ${savedTracks.length} canciones guardadas/actualizadas en la BD (caché)`);
                    
                    // Marcar que se guardó en caché
                    formattedResults.cached = true;
                    formattedResults.cached_count = savedTracks.length;
                    
                    // Reemplazar tracks de Spotify con los de la BD (que tienen más información)
                    if (savedTracks.length > 0) {
                        formattedResults.results.tracks = savedTracks.map(savedTrack => {
                            // Parsear artists_json si existe
                            let artists = [];
                            if (savedTrack.artists_json) {
                                try {
                                    artists = typeof savedTrack.artists_json === 'string' 
                                        ? JSON.parse(savedTrack.artists_json) 
                                        : savedTrack.artists_json;
                                } catch (e) {
                                    artists = savedTrack.artist ? [{ name: savedTrack.artist }] : [];
                                }
                            } else {
                                artists = savedTrack.artist ? [{ name: savedTrack.artist }] : [];
                            }
                            
                            return {
                                id: savedTrack.spotify_track_id,
                                name: savedTrack.title,
                                artists: artists,
                                album: savedTrack.album ? { 
                                    id: savedTrack.album_id,
                                    name: savedTrack.album, 
                                    images: savedTrack.image_url ? [{ url: savedTrack.image_url }] : [] 
                                } : null,
                                duration_ms: savedTrack.duration_ms,
                                preview_url: savedTrack.preview_url,
                                external_urls: { spotify: savedTrack.spotify_url },
                                popularity: savedTrack.popularity,
                                explicit: savedTrack.explicit,
                                song_id: savedTrack.song_id,
                                playlist_id: savedTrack.playlist_id,
                                image_url: savedTrack.image_url,
                                artist: savedTrack.artist,
                                source: 'database',
                                cached: true
                            };
                        });
                    }
                } catch (error) {
                    console.error('⚠️ Error guardando en caché (continuando con resultados de Spotify):', error.message);
                    formattedResults.cached = false;
                }
            }
        }

        console.log(`📈 [searchSpotifyService] Total de resultados: ${formattedResults.total_results}`);

        const finalResult = {
            success: true,
            message: `Búsqueda realizada exitosamente${formattedResults.cached ? ' y guardada en caché' : ''}`,
            data: {
                ...formattedResults,
                source: formattedResults.cached ? 'spotify_and_cache' : 'spotify'
            },
            count: formattedResults.total_results
        };
        
        console.log('✅ [searchSpotifyService] Resultado final preparado:', {
            success: finalResult.success,
            count: finalResult.count,
            tracksCount: finalResult.data.results.tracks?.length || 0,
            source: finalResult.data.source
        });
        
        return finalResult;

    } catch (error) {
        console.error('❌ Error buscando en Spotify:', error);
        
        if (error.response) {
            const errorData = error.response.data;
            const status = error.response.status;
            
            let errorMessage = errorData?.message || error.message;
            
            if (status === 401) {
                errorMessage = 'Token de acceso inválido o expirado. Por favor, genera un nuevo token.';
            } else if (status === 403) {
                errorMessage = 'Acceso denegado. Verifica los permisos del token de acceso.';
            } else if (status === 429) {
                errorMessage = 'Límite de solicitudes excedido. Por favor, espera un momento.';
            }
            
            return {
                success: false,
                message: errorMessage,
                data: null,
                count: 0,
                error_details: {
                    status: status,
                    data: errorData
                }
            };
        }

        return {
            success: false,
            message: error.message || 'Error buscando en Spotify',
            data: null,
            count: 0
        };
    }
};

module.exports = {
    syncPlaylistFromSpotify,
    getAllPlaylistsService,
    getPlaylistByIdService,
    getAllSongsService,
    getSongsByPlaylistIdService,
    needsSync,
    getPlaylistWithSongs,
    searchSpotifyService,
    ensureSearchPlaylist
};