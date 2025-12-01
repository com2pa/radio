require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require("morgan")
// GraphQL deshabilitado temporalmente
// const { graphqlHTTP } = require('graphql-http')
// const schema = require('./graphql/schema')
// const root = require('./graphql/resolvers')
const path = require('path');

// verificar la conexión a la base de datos
const { testConnection } = require('./db/index')
const { PAGE_URL } = require('./config')
const useRouter = require('./controllers/user')
const roleRouter = require('./controllers/role')
const loginRouter = require('./controllers/login')
const logoutRouter = require('./controllers/logout')
const MenuRouter = require('./controllers/menu')
const CategoryNewsRouter = require('./controllers/Category')
const subcategoriesRouter = require('./controllers/subcategorynew')
const CategoryPodscats = require('./controllers/CategoryPodscats')
const SubcategoryPodcasts = require('./controllers/SubcategoryPodcasts')
const podscatsRouter = require('./controllers/podscats')
const refresRouter = require('./controllers/refresh')
const newsRouter = require('./controllers/news')
const contactRouter = require('./controllers/contact')
const comentPodcastsRouter = require('./controllers/comentPodcasts')
const programsRouter = require('./controllers/programs')
const musicRouter = require('./controllers/music')
const activityLogRouter = require('./controllers/activityLog')
const perfilUserRouter = require('./controllers/perfilUser')
const authRouter = require('./controllers/auth')
testConnection()



// Configuración de CORS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['https://Radio.onrender.com'])
  : [
      PAGE_URL, // URL desde config.js
      'http://localhost:5173', 
      'http://localhost:3000', 
      'http://localhost:5174',
      'http://127.0.0.1:5173', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5174'
    ];

// Función para verificar si una IP es de red local (LAN)
const isLocalNetwork = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    // Permitir localhost y 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    
    // Permitir IPs de red local privada
    // 192.168.x.x
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    // 10.x.x.x
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    // 172.16.x.x - 172.31.x.x
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (móviles, Postman, etc.) solo en desarrollo
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // En producción, rechazar solicitudes sin origen
      return callback(new Error('No permitido por CORS: origen no especificado'));
    }
    
    // En desarrollo, permitir orígenes de la red local (para acceso desde móviles)
    if (process.env.NODE_ENV !== 'production' && isLocalNetwork(origin)) {
      console.log(`✅ CORS: Origen de red local permitido: ${origin}`);
      return callback(null, true);
    }
    
    // Verificar si el origen está en la lista de permitidos
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // En desarrollo, mostrar el origen que está siendo rechazado para debugging
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ CORS: Origen rechazado: ${origin}`);
        console.warn(`   Orígenes permitidos: ${allowedOrigins.join(', ')}`);
        console.warn(`   ¿Es red local? ${isLocalNetwork(origin) ? 'Sí' : 'No'}`);
      }
      callback(new Error(`No permitido por CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 horas para preflight cache
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'))

// Rutas de la API
// GraphQL deshabilitado temporalmente
// app.use('/graphql', graphqlHTTP({
//   schema: schema,
//   rootValue: root,
//   graphiql: true
// }))

app.use('/api/register',useRouter)
app.use('/api/role',roleRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
app.use('/api/auth', authRouter) // Endpoints de autenticación (verificación de email, reset de contraseña)
app.use('/api/menu', MenuRouter)
app.use('/api/category-news', CategoryNewsRouter)//categoria noticias
app.use('/api/subcategory-news',subcategoriesRouter) //categorizacion noticias
app.use('/api/category-podscats', CategoryPodscats) //Categorizacion podcasts
app.use('/api/subcategory-podscats', SubcategoryPodcasts) //subcategoria podcasts
app.use('/api/podcasts', podscatsRouter) // crear podcasts
app.use('/api/refres', refresRouter);// inicio de sesion persistida
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // // Servir archivos estáticos desde la carpeta uploads
app.use('/api/news',newsRouter)
app.use('/api/contacts', contactRouter) // gestión de contactos
app.use('/api/coment-podcasts', comentPodcastsRouter) // gestión de comentarios de podcasts
app.use('/api/programs', programsRouter)
app.use('/api/music', musicRouter) // gestión de programas de radio
app.use('/api/activity-log', activityLogRouter)
app.use('/api/perfilUser',perfilUserRouter)

// Middleware de manejo de errores de CORS
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    const origin = req.headers.origin || 'No especificado';
    return res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      origin: origin,
      isLocalNetwork: isLocalNetwork(origin),
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['https://Radio.onrender.com'])
        : [
            'http://localhost:5173', 
            'http://localhost:3000', 
            'http://localhost:5174', 
            'http://127.0.0.1:5173', 
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5174',
            'Cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x) en desarrollo'
          ],
      tip: process.env.NODE_ENV !== 'production' 
        ? 'En desarrollo, se permiten automáticamente orígenes de red local para acceso desde dispositivos móviles.'
        : 'Verifica que el origen esté en la lista de permitidos.'
    });
  }
  next(err);
});

module.exports = app