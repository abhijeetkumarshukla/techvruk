const express = require('express')
const { generateSummary } = require('./ai')

const router = express.Router()

router.post('/', async (req, res) => {
  const { audit } = req.body || {}
  if (!audit) return res.status(400).json({ error: 'missing_audit' })

  const result = await generateSummary(audit)
  res.json({
    summary: result.text,
    meta: { error: result.error || null, raw: result.raw || null, provider: result.provider || null, fallback: !!result.error },
  })
})

module.exports = router
