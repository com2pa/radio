require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require("morgan")
// const { graphqlHTTP } = require('graphql-http')
const schema = require('./graphql/schema')
const root = require('./graphql/resolvers')
const path = require('path');

// verificar la conexión a la base de datos
const { testConnection } = require('./db/index')
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
testConnection()



app.use(cors())
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'))

//rutas 
// app.use('/graphql', graphqlHTTP({
//   schema: schema,
//   rootValue: root,
//   graphiql: true // Habilita la interfaz web para probar consultas
// }))

app.use('/api/register',useRouter)
app.use('/api/role',roleRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
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


module.exports = app