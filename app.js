// Middleware
require('dotenv').config()

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const cors = require('cors')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { format } = require('util')

const Multer = require('multer')
const { Storage } = require('@google-cloud/storage')
const serviceKey = require('./keys.json')

// Global Variable
const app = express()

const port = parseInt(process.env.PORT)
const token = process.env.JWT_TOKEN
const adminUsername = process.env.ADMIN_USERNAME
const adminPassword = process.env.ADMIN_PASSWORD
const maxSize = parseInt(process.env.MAX_SIZE)

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

const dataMahasiswa = require('./data.json')

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

const validDataMahasiswa = (nama, nim) => {
    const index = dataMahasiswa.findIndex((mahasiswa) => {return (mahasiswa[0] === nama) && (mahasiswa[1] === nim || mahasiswa[2] === nim)})

    return index !== -1
}

// Admin
app.get('/admin/login', (req, res) => {
    const { body } = req

    if (body?.username === adminUsername && body?.password) {
        bcrypt.compare(body.password, adminPassword, (hashError, hashResult) => {
            if (hashError) {
                res.sendStatus(500)

            } else if (hashResult) {
                jwt.sign({username: body.username, password: adminPassword}, token, {expiresIn: '20m'}, (jwtError, jwtToken) => {
                    if (jwtError) {
                        res.sendStatus(401)

                    } else  {
                        req.session.jwtTokenAdmin = jwtToken
                        res.sendStatus(200)
                    }
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

app.get('/admin/get-team') // termasuk jumlah votenya

app.get('/admin/get-all-team') // diurutkan dari jumlah votenya

app.post('/admin/upload-team', multer.single('file'), (req, res, next) => {
    const { body, file } = req

    if (body?.title && body?.name && body?.type && body?.description && file) {
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
                        res.sendStatus(201)
                    }
                }
            )
        })

    } else {
        res.sendStatus(400)
    }
})

app.delete('/admin/delete-team')

app.put('/admin/update-team')

// User
app.get('/user/login', (req, res) => {
    const { body } = req

    if (body?.name && body?.idStudent) {
        connection.query(
            'SELECT Name, IDStudent FROM Voter WHERE Name = ? AND IDStudent = ?',
            [body.name, body.idStudent],
            (databaseError, databaseResults) => {
                if (databaseError) {
                    res.sendStatus(500)

                } else {
                    if (databaseResults.length !== 0) {
                        jwt.sign({name: body.name, idStudent: body.idStudent}, token, {expiresIn: '20m'}, (jwtError, jwtDecoded) => {
                            if (jwtError) {
                                res.sendStatus(401)

                            } else {
                                req.session.jwtTokenUser = jwtDecoded
                                res.sendStatus(200)
                            }
                        })

                    } else {
                        res.sendStatus(401)
                    }
                }
            }
        )
        
    } else {
        res.sendStatus(400)
    }
})

app.post('/user/register', (req, res) => {
    const { body } = req

    if (body?.name && body?.idStudent) {
        if (validDataMahasiswa(body.name, body.idStudent)) {
            connection.query(
                'INSERT INTO Voter (Name, IDStudent) values (?, ?)',
                [body.name, body.idStudent],
                (databaseError, databaseResults) => {
                    if (databaseError) {
                        res.sendStatus(500)

                    } else {
                        res.sendStatus(201)
                    }
                }
            )

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

app.get('/user/get-team')

app.get('/user/get-all-team')

app.put('/user/vote-team')

// Run app on localhost
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`)
})