// Middleware
require('dotenv').config()

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const cors = require('cors')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')
const { format } = require('util')

const Multer = require('multer')
const { Storage } = require('@google-cloud/storage')
const serviceKey = require('./keys.json')


// Global Variable
const app = express()

const port = parseInt(process.env.PORT)
const token = parseInt(process.env.JWT_TOKEN)
const adminUsername = process.env.ADMIN_USERNAME
const adminPassword = process.env.ADMIN_PASSWORD
const maxSize = parseInt(process.env.MAX_SIZE)
const checkURL = process.env.NAMA_NIM_URL

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
})

const storage = new Storage({
    keyFilename: serviceKey,
    projectId: 'exhibition-page'
})
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: maxSize * 1024 * 1024
    }
})
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET)

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

const getDataMahasiswa = async () => {
    const response = await fetch(checkURL)
    const data = await response.json()

    return data
}

const validDataMahasiswa = async (nama, nim) => {
    const dataMahasiswa = await getDataMahasiswa()
    const index = await dataMahasiswa.findIndex((mahasiswa) => {return (mahasiswa[0] === nama) && (mahasiswa[1] === nim || mahasiswa[2] === nim)})

    return index !== -1
}

// Admin
app.get('/admin', (req, res) => {
    const { body } = req

    if (body?.username === adminUsername && body?.password) {
        bcrypt.compare(body.password, adminPassword, (hashError, hashResult) => {
            if (hashResult) {
                jwt.sign({username: body.username, password: adminPassword}, token, {expiresIn: '20m'}, (jwtError, jwtToken) => {
                    req.session.jwtTokenAdmin = jwtToken

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

app.get('/admin/logout', (req, res) => {
    req.session.jwtTokenAdmin = null;
})

app.post('/admin/upload', multer.single('file'), (req, res, next) => {
    const { body, file } = req

    if (body?.title && body?.name && body?.type) {
        if (file) {
            const blob = bucket.file(file.originalname)
            const blobStream = blob.createWriteStream()

            blobStream.on('error', (blobStreamError) => {
                next(blobStreamError)
            })

            blobStream.on('finish', () => {
                const publicURL = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`)

                connection.query(
                    'INSERT INTO Team (Title, Name, Type, Description, LinkToHeader) values (?, ?, ?, ?, ?)', 
                    [body.title, body.name, body.type, body.description, publicURL], 
                    (databaseError, databaseResults) => {
                        if (databaseError) {
                            res.sendStatus(500)
                        } else {
                            res.sendStatus(200)
                        }
                    }
                )
            })

        } else {
            connection.query(
                'INSERT INTO Team (Title, Name, Type, Description) values (?, ?, ?, ?)', 
                [body.title, body.name, body.type, body.description],
                (databaseError, databaseResults) => {
                    if (databaseError) {
                        res.sendStatus(500)
                    } else {
                        res.sendStatus(200)
                    }
                }
            )
        }

    } else {
        res.sendStatus(400)
    }
})

// User
app.get('/user', async (req, res) => {
    const { body } = req

    if (body?.name && body?.idStudent) {
        const valid = await validDataMahasiswa(body.name, body.idStudent)

        if (valid) {
            jwt.sign({name: body.name, idStudent: body.idStudent}, token, {expiresIn: '20m'}, (jwtError, jwtToken) => {
                req.session.jwtTokenUser = jwtToken

                res.sendStatus(200)
            })

        } else {
            res.sendStatus(401)
        }
        
    } else {
        res.sendStatus(400)
    }
})

app.all('/user/*', requireLogin, (req, res, next) => {
    next()
})

app.get('/user/logout', (req, res) => {
    req.session.jwtTokenUser = null;
})

// Run app on localhost
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`)
})