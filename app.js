require('dotenv').config()
const express =require('express')
const app = express()
const cors =require('cors')
const cookieParser = require('cookie-parser')
const morgan =require("morgan")

// 
app.use(cors())
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'))

//rutas 

module.exports = app