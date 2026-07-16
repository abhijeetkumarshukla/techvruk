import SpendForm from '../components/SpendForm'

export default function Home() {
  return (
    <main className="home-page">
      <header className="hero-panel">
        <div className="hero-copy">
          <div className="hero-badge">AI Spend Audit</div>
          <h1>See where your team is overpaying for AI tools.</h1>
          <p>
            Enter your current subscriptions and get a clear, fast view of what to keep, cut, or optimize.
          </p>
          <div className="hero-actions">
            <span className="pill">Live recommendations</span>
            <span className="pill">Fast setup</span>
            <span className="pill">Shared summary</span>
          </div>
        </div>

        <div className="hero-highlight">
          <div className="stat-card">
            <p className="stat-label">Typical savings</p>
            <p className="stat-value">20–35%</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Audit time</p>
            <p className="stat-value">Under 2 min</p>
          </div>
        </div>
      </header>

      <section className="content-panel">
        <SpendForm />
      </section>
    </main>
  )
}
