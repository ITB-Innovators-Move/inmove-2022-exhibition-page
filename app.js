// Middleware
require('dotenv').config()
const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const cors = require('cors')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Global Variable
const app = express()
const port = parseInt(process.env.PORT)
const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
})
const saltRounds = parseInt(process.env.SALTROUND)
const token = parseInt(process.env.JWT_TOKEN)

// Configuration
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())
app.use(cors({
    origin: `http://localhost:${port}`
}))
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true
}))

// Route
app.get('/', (req, res) => {
    res.render('homepage.ejs')
})

app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`)
})