import thinky from 'thinky'
require('dotenv').config()

export default thinky({
  db: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT
})