import { useEffect, useState } from 'react'

type ToolEntry = {
  id: string
  vendor: string
  plan: string
  monthlySpend: number
  seats: number
}

type FormState = {
  teamSize: number
  primaryUseCase: string
  tools: ToolEntry[]
}

type ContactState = {
  email: string
  company: string
  role: string
}

type AuditResultState = {
  summary: string
  publicUrl: string
  auditId: string
  meta?: any
}

const STORAGE_KEY = 'tv_spend_v1'
const MAX_TOOLS = 2
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOOL_OPTIONS = [
  'Cursor',
  'GitHub Copilot',
  'Claude',
  'ChatGPT',
  'Anthropic API',
  'OpenAI API',
  'Gemini',
  'Windsurf',
]
const API_BASE = (import.meta.env.VITE_API_URL || 'https://techvruk-2.onrender.com/api').replace(/\/$/, '')

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function SpendForm() {
  const [state, setState] = useState<FormState>(() => ({
    teamSize: 1,
    primaryUseCase: 'mixed',
    tools: [],
  }))
  const [contact, setContact] = useState<ContactState>({ email: '', company: '', role: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AuditResultState | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>
        setState({
          teamSize: parsed.teamSize && parsed.teamSize > 0 ? parsed.teamSize : 1,
          primaryUseCase: parsed.primaryUseCase || 'mixed',
          tools: Array.isArray(parsed.tools) ? parsed.tools.slice(0, MAX_TOOLS) : [],
        })
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      // ignore
    }
  }, [state])

  function addTool() {
    setState((s) => {
      if (s.tools.length >= MAX_TOOLS) return s
      const t: ToolEntry = { id: uid(), vendor: TOOL_OPTIONS[0], plan: '', monthlySpend: 0, seats: 1 }
      return { ...s, tools: [...s.tools, t] }
    })
  }

  function updateTool(id: string, patch: Partial<ToolEntry>) {
    setState((s) => ({
      ...s,
      tools: s.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function removeTool(id: string) {
    setState((s) => ({ ...s, tools: s.tools.filter((t) => t.id !== id) }))
  }

  function validateForm() {
    if (!state.teamSize || state.teamSize < 1) {
      return 'Team size must be at least 1.'
    }

    if (contact.email && !EMAIL_REGEX.test(contact.email)) {
      return 'Please enter a valid email address.'
    }

    if (state.tools.length === 0) {
      return 'Please select at least one tool before running the audit.'
    }

    if (state.tools.length > MAX_TOOLS) {
      return `You can add up to ${MAX_TOOLS} tools.`
    }

    for (const tool of state.tools) {
      if (!tool.plan.trim()) {
        return 'Please add a plan name for each tool.'
      }

      if (tool.monthlySpend < 0) {
        return 'Monthly spend cannot be negative.'
      }

      if (tool.seats < 1) {
        return 'Seats must be at least 1.'
      }
    }

    return ''
  }

  const canSubmitAudit = !isSubmitting && state.tools.length > 0 && state.tools.length <= MAX_TOOLS && state.tools.every((tool) => {
    return tool.plan.trim() !== '' && tool.monthlySpend >= 0 && tool.seats >= 1
  })

  async function submitAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        teamSize: state.teamSize,
        primaryUseCase: state.primaryUseCase,
        tools: state.tools,
      }

      const auditResponse = await fetch(`${API_BASE}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!auditResponse.ok) {
        throw new Error('Unable to create the audit right now.')
      }

      const auditData = await auditResponse.json()
      // request AI summary before capturing email (email capture happens after value shown)
      const summaryResponse = await fetch(`${API_BASE}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit: payload }),
      })

      if (!summaryResponse.ok) {
        // don't fail the entire flow; show fallback text
        const txt = await summaryResponse.text()
        // set a visible result with fallback
        setResult({
          summary: 'Summary currently unavailable. Using fallback recommendations.',
          publicUrl: `${API_BASE.replace(/\/api$/, '')}${auditData.url}`,
          auditId: auditData.publicId || auditData.id,
          meta: { error: `summary_http_${summaryResponse.status}`, detail: txt },
        })
      } else {
        const summaryData = await summaryResponse.json()
        setResult({
          summary: summaryData.summary || 'No summary returned.',
          publicUrl: `${API_BASE.replace(/\/api$/, '')}${auditData.url}`,
          auditId: auditData.publicId || auditData.id,
          meta: summaryData.meta || null,
        })
      }

      // capture lead only after the user has seen the summary; send if email provided
      if (contact.email) {
        const leadResponse = await fetch(`${API_BASE}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: contact.email,
            company: contact.company,
            role: contact.role,
            teamSize: state.teamSize,
            auditId: auditData.id,
            honeypot: '',
          }),
        })

        if (!leadResponse.ok) {
          console.warn('Lead capture failed')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submitAudit} aria-label="Spend input form" className="audit-form">
      <div className="form-intro">
        <div>
          <p className="section-kicker">Audit setup</p>
          <h2>Share your stack and we’ll turn it into a clean optimization plan.</h2>
        </div>
        <div className="form-chip">Secure • Fast • Actionable</div>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Team size</span>
          <input
            type="number"
            min={1}
            value={state.teamSize}
            onChange={(e) => setState({ ...state, teamSize: Number(e.target.value) || 1 })}
          />
        </label>
        <label className="field">
          <span>Primary use case</span>
          <select value={state.primaryUseCase} onChange={(e) => setState({ ...state, primaryUseCase: e.target.value })}>
            <option value="coding">coding</option>
            <option value="writing">writing</option>
            <option value="data">data</option>
            <option value="research">research</option>
            <option value="mixed">mixed</option>
          </select>
        </label>
      </div>

      <div className="card-section">
        <div className="section-heading">
          <div>
            <h3>Contact details</h3>
            <p className="section-subtitle">We’ll only use this to send your audit result and follow-up summary.</p>
          </div>
        </div>
        <div className="form-row">
          <label className="field">
            <span>Email</span>
            <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Company</span>
            <input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
          </label>
          <label className="field">
            <span>Role</span>
            <input value={contact.role} onChange={(e) => setContact({ ...contact, role: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card-section">
        <div className="section-heading">
          <div>
            <h3>Tools</h3>
            <p className="section-subtitle">Pick the AI tools your team is currently using and paying for.</p>
          </div>
          <button type="button" className="secondary-btn" onClick={addTool} disabled={state.tools.length >= MAX_TOOLS}>
            {state.tools.length >= MAX_TOOLS ? 'Max 2 tools' : 'Add tool'}
          </button>
        </div>
        <p className="muted">Select {MAX_TOOLS} tools or fewer to enable the audit. You can add up to {MAX_TOOLS} tools.</p>
        {state.tools.length === 0 && <p className="empty-state">No tools yet — add one to start the audit.</p>}
        {state.tools.map((t) => (
          <div key={t.id} className="tool-card">
            <div className="form-row">
              <label className="field">
                <span>Tool</span>
                <select value={t.vendor} onChange={(e) => updateTool(t.id, { vendor: e.target.value })}>
                  {TOOL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Plan</span>
                <input value={t.plan} onChange={(e) => updateTool(t.id, { plan: e.target.value })} />
              </label>
              <label className="field">
                <span>Monthly $</span>
                <input type="number" min={0} value={t.monthlySpend} onChange={(e) => updateTool(t.id, { monthlySpend: Number(e.target.value) || 0 })} />
              </label>
              <label className="field">
                <span>Seats</span>
                <input type="number" min={1} value={t.seats} onChange={(e) => updateTool(t.id, { seats: Number(e.target.value) || 1 })} />
              </label>
            </div>
            <button type="button" className="remove-btn" onClick={() => removeTool(t.id)}>
              Remove
            </button>
          </div>
        ))}
        <div className="actions-row">
          <button type="submit" className="primary-btn" disabled={!canSubmitAudit}>
            {isSubmitting ? 'Submitting…' : 'Run audit'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {result && (
        <section className="result-card">
          <h3>Audit ready</h3>
          <p>
            <strong>Audit ID:</strong> {result.auditId}
          </p>
          <p>
            <strong>Public link:</strong>{' '}
            <a href={result.publicUrl} target="_blank" rel="noreferrer">
              {result.publicUrl}
            </a>
          </p>
          <p>{result.summary}</p>
          {result.meta?.error && (
            <p className="muted">Note: summary generated with fallback or error ({String(result.meta.error)})</p>
          )}

          {/* simple CTA for high-potential savings (heuristic: total spend > $500/mo) */}
          {state.tools.reduce((s, t) => s + (Number(t.monthlySpend) || 0), 0) > 500 && (
            <div className="cta-row">
              <a className="primary-btn" href="/book" onClick={(e) => e.preventDefault()}>
                Book a Techvruk consultation
              </a>
            </div>
          )}
        </section>
      )}
    </form>
  )
}
