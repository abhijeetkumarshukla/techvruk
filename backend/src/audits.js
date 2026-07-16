const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('./db')

const router = express.Router()

router.post('/', (req, res) => {
  const payload = req.body
  const id = uuidv4()
  const public_id = id.slice(0, 8)
  const created_at = Date.now()
  const stmt = db.prepare('INSERT INTO audits (id, public_id, payload, created_at, public) VALUES (?, ?, ?, ?, ?)')
  stmt.run(id, public_id, JSON.stringify(payload), created_at, 1)
  res.json({ id, publicId: public_id, url: `/public/${public_id}` })
})

router.get('/public/:publicId', (req, res) => {
  const { publicId } = req.params
  const row = db.prepare('SELECT payload, created_at FROM audits WHERE public_id = ? AND public = 1').get(publicId)
  if (!row) return res.status(404).json({ error: 'Not found' })
  try {
    const payload = JSON.parse(row.payload)
    if (payload.lead) {
      delete payload.lead.email
      delete payload.lead.company
      delete payload.lead.role
    }
    return res.json({ payload, createdAt: row.created_at })
  } catch (e) {
    return res.status(500).json({ error: 'parse_error' })
  }
})

module.exports = router
