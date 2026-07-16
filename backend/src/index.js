try {
  require('dotenv').config()
} catch (e) {
}
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const audits = require('./audits')
const leads = require('./leads')
const summary = require('./summary')

const app = express()
const requestedPort = Number(process.env.PORT || 4000)

app.use(express.json())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }))

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 })
app.use(limiter)

app.use('/api/audits', audits)
app.use('/api/leads', leads)
app.use('/api/summary', summary)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

function startServer(port) {
  const server = app.listen(port, () => {
    const address = server.address()
    const actualPort = typeof address === 'object' && address ? address.port : port
    console.log(`Backend listening on port ${actualPort}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port !== 0) {
      console.log(`Port ${port} is busy, retrying with a dynamic port`)
      server.close()
      startServer(0)
      return
    }

    throw error
  })
}

startServer(requestedPort)
