const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('./db')
const nodemailer = require('nodemailer')

const router = express.Router()

function getTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return null
}

router.post('/', async (req, res) => {
  const { email, company, role, teamSize, auditId, honeypot } = req.body || {}

  if (honeypot) return res.status(400).json({ error: 'bot' })

  const id = uuidv4()
  const created_at = Date.now()
  const stmt = db.prepare('INSERT INTO leads (id, email, company, role, team_size, audit_id, honeypot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  stmt.run(id, email, company, role, teamSize || null, auditId || null, honeypot || '', created_at)

  const transport = getTransport()
  const from = process.env.EMAIL_FROM || 'no-reply@localhost'
  const sendInfo = { logged: true }

  if (transport) {
    try {
      const info = await transport.sendMail({
        from,
        to: email,
        subject: 'Your TechVruk audit',
        text: `Thanks — your audit is saved. If you requested help, we'll reach out.`,
      })
      sendInfo.sent = true
      sendInfo.info = info
    } catch (e) {
      sendInfo.sent = false
      sendInfo.error = String(e.message || e)
    }
  }

  res.json({ id, email, sendInfo })
})

module.exports = router
