const axios = require('axios');

// Configuración de autenticación de Spotify
const SPOTIFY_AUTH_CONFIG = {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN || '',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    // Cache del token
    cachedToken: null,
    tokenExpiresAt: null
};

/**
 * Obtener token de acceso de Spotify
 * Prioridad:
 * 1. Si tiene CLIENT_ID y CLIENT_SECRET: usa Client Credentials Flow (automático, se renueva)
 * 2. Si tiene ACCESS_TOKEN: usa ese token directamente (manual, debe renovarse manualmente)
 */
const getAccessToken = async () => {
    try {
        // OPCIÓN 1: Si tiene Client ID y Secret, usar autenticación automática
        if (SPOTIFY_AUTH_CONFIG.clientId && SPOTIFY_AUTH_CONFIG.clientSecret) {
            // Si tenemos un token válido en caché, devolverlo
            if (SPOTIFY_AUTH_CONFIG.cachedToken && SPOTIFY_AUTH_CONFIG.tokenExpiresAt) {
                const now = new Date();
                // Renovar 5 minutos antes de que expire
                const refreshTime = new Date(SPOTIFY_AUTH_CONFIG.tokenExpiresAt.getTime() - 5 * 60 * 1000);
                
                if (now < refreshTime) {
                    console.log('✅ Usando token de Spotify en caché (Client Credentials)');
                    return SPOTIFY_AUTH_CONFIG.cachedToken;
                } else {
                    console.log('🔄 Token de Spotify expirado, renovando...');
                }
            }

            console.log('🔐 Obteniendo nuevo token de Spotify (Client Credentials Flow)...');

            // Obtener token usando Client Credentials Flow
            const response = await axios.post(
                SPOTIFY_AUTH_CONFIG.tokenUrl,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_AUTH_CONFIG.clientId}:${SPOTIFY_AUTH_CONFIG.clientSecret}`).toString('base64')}`
                    },
                    timeout: 10000
                }
            );

            const { access_token, expires_in } = response.data;

            if (!access_token) {
                throw new Error('No se recibió token de acceso de Spotify');
            }

            // Guardar token en caché
            SPOTIFY_AUTH_CONFIG.cachedToken = access_token;
            // Calcular tiempo de expiración (expires_in está en segundos)
            SPOTIFY_AUTH_CONFIG.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

            console.log(`✅ Token de Spotify obtenido exitosamente (expira en ${expires_in} segundos)`);

            return access_token;
        }

        // OPCIÓN 2: Si solo tiene ACCESS_TOKEN, usarlo directamente
        if (SPOTIFY_AUTH_CONFIG.accessToken) {
            // Limpiar espacios y comillas si las tiene
            const token = SPOTIFY_AUTH_CONFIG.accessToken.trim().replace(/^['"]|['"]$/g, '');
            
            if (token && token.length > 50) {
                console.log('✅ Usando SPOTIFY_ACCESS_TOKEN de variables de entorno');
                return token;
            }
        }

        // Si no tiene ninguna opción configurada
        throw new Error(
            'Configuración de Spotify incompleta. ' +
            'Opciones:\n' +
            '1. Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET (recomendado - renovación automática)\n' +
            '2. O configura SPOTIFY_ACCESS_TOKEN (manual - debe renovarse cada hora)'
        );

    } catch (error) {
        console.error('❌ Error obteniendo token de Spotify:', error.message);
        
        if (error.response) {
            console.error('Respuesta de error:', error.response.data);
            throw new Error(`Error de autenticación de Spotify: ${error.response.data?.error_description || error.response.data?.error || 'Error desconocido'}`);
        }
        
        throw error;
    }
};

/**
 * Verificar si el token está configurado y válido
 */
const isTokenConfigured = () => {
    return !!(SPOTIFY_AUTH_CONFIG.clientId && SPOTIFY_AUTH_CONFIG.clientSecret) || 
           !!(SPOTIFY_AUTH_CONFIG.accessToken && SPOTIFY_AUTH_CONFIG.accessToken.trim().length > 50);
};

/**
 * Limpiar el token del caché (útil para forzar renovación)
 */
const clearTokenCache = () => {
    SPOTIFY_AUTH_CONFIG.cachedToken = null;
    SPOTIFY_AUTH_CONFIG.tokenExpiresAt = null;
    console.log('🗑️ Caché de token de Spotify limpiado');
};

module.exports = {
    getAccessToken,
    isTokenConfigured,
    clearTokenCache
};

