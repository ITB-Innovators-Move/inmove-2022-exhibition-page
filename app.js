// Middleware
require('dotenv').config()
const express = require('express')

// Global Variable
const app = express()
const port = parseInt(process.env.PORT)

// Configuration
app.use(express.static('public'))

// Route
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`)
})