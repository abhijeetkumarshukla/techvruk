const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'data.json')
const state = loadState()

function loadState() {
  try {
    if (!fs.existsSync(dbPath)) return { audits: [], leads: [] }
    const raw = fs.readFileSync(dbPath, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      audits: Array.isArray(parsed.audits) ? parsed.audits : [],
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
    }
  } catch (error) {
    return { audits: [], leads: [] }
  }
}

function saveState() {
  fs.writeFileSync(dbPath, JSON.stringify(state, null, 2))
}

function prepare(sql) {
  const normalized = sql.trim().toUpperCase()

  return {
    run(...args) {
      if (normalized.startsWith('CREATE TABLE')) {
        saveState()
        return { changes: 0 }
      }

      if (normalized.startsWith('INSERT INTO AUDITS')) {
        const [id, publicId, payload, createdAt, isPublic] = args
        state.audits.push({ id, public_id: publicId, payload, created_at: createdAt, public: isPublic })
        saveState()
        return { changes: 1 }
      }

      if (normalized.startsWith('INSERT INTO LEADS')) {
        const [id, email, company, role, teamSize, auditId, honeypot, createdAt] = args
        state.leads.push({ id, email, company, role, team_size: teamSize, audit_id: auditId, honeypot, created_at: createdAt })
        saveState()
        return { changes: 1 }
      }

      saveState()
      return { changes: 0 }
    },

    get(...args) {
      if (normalized.startsWith('SELECT PAYLOAD')) {
        const [publicId] = args
        const row = state.audits.find((entry) => entry.public_id === publicId && entry.public === 1)
        if (!row) return undefined
        return { payload: row.payload, created_at: row.created_at }
      }

      return undefined
    },
  }
}

const db = { prepare }
prepare(`
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  payload TEXT,
  created_at INTEGER,
  public INTEGER DEFAULT 1
)
`).run()

prepare(`
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT,
  company TEXT,
  role TEXT,
  team_size INTEGER,
  audit_id TEXT,
  honeypot TEXT,
  created_at INTEGER
)
`).run()

module.exports = db
