require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require("morgan")
// const { graphqlHTTP } = require('graphql-http')
const schema = require('./graphql/schema')
const root = require('./graphql/resolvers')


// verificar la conexión a la base de datos
const { testConnection } = require('./db/index')
const useRouter = require('./controllers/user')
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


module.exports = app