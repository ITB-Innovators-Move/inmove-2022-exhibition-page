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
const token = parseInt(process.env.JWT_TOKEN)
const adminUsername = process.env.ADMIN_USERNAME
const adminPassword = process.env.ADMIN_PASSWORD
const geprekURL = 'https://cdn.jsdelivr.net/gh/mkamadeus'

// Configuration
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

// Function
const requireAdmin = (req, res, next) => {
    jwt.verify(req.session.jwtTokenAdmin, token, (jwtError, jwtDecoded) => {
        if (jwtError) {
            res.sendStatus(401)
        } else {
            req.session.admin = jwtDecoded
            next()
        }
    })
}

const requireLogin = (req, res, next) => {
    jwt.verify(req.session.jwtTokenUser, token, (jwtError, jwtDecoded) => {
        if (jwtError) {
            res.sendStatus(401)
        } else {
            req.session.user = jwtDecoded
            next()
        }
    })
}

// Landing Page
app.get('/', (req, res) => {
    req.session.jwtTokenAdmin = null;
    req.session.jwtTokenUser = null;
})

// Admin
app.get('/admin', (req, res) => {
    const { body } = req.body

    if (body?.username === adminUsername && body?.password) {
        bcrypt.compare(body.password, adminPassword, (hashError, hashResult) => {
            if (hashResult) {
                jwt.sign({username: body.username, password: adminPassword}, token, {expiresIn: '20m'}, (jwtError, jwtToken) => {
                    req.session.jwtTokenAdmin = jwtToken
                    req.session.jwtTokenUser = null

                    res.sendStatus(200)
                })

            } else {
                res.sendStatus(401)
            }
        })

    } else {
        res.sendStatus(400)
    }
})

app.all('/admin/*', requireAdmin, (req, res, next) => {
    next()
})

// User

// Run app on localhost
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`)
})