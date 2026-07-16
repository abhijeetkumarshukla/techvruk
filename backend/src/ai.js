const buildPrompt = (audit) => {
  // Simple prompt constructing a summary based on audit payload
  const totalMonthly = (audit.tools || []).reduce(
    (s, t) => s + (Number(t.monthlySpend) || 0),
    0,
  );
  const lines = [];
  lines.push(`You are an expert product and finance analyst.`);
  lines.push(
    `User audit: team size ${audit.teamSize || "unknown"}, primary use case ${audit.primaryUseCase || "mixed"}.`,
  );
  lines.push(
    `They pay a total of $${totalMonthly} per month across these tools:`,
  );
  for (const t of audit.tools || []) {
    lines.push(
      `- ${t.vendor} (${t.plan || "plan unknown"}): $${t.monthlySpend}/mo, seats: ${t.seats}`,
    );
  }
  lines.push(
    "Give a concise ~100-word summary explaining whether they are overspending, one or two actionable recommendations, and next steps (book consultation if savings > $500).",
  );
  lines.push("Return only the summary paragraph.");
  return lines.join("\n");
};

async function generateSummary(audit) {
  const prompt = buildPrompt(audit);

  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY;

  let _fetch = global.fetch
  if (!_fetch) {
    try {
      _fetch = require('node-fetch')
    } catch (e) {
      return { text: fallbackSummary(audit), error: 'no_fetch_available' }
    }
  }

  try {
    if (anthropicKey) {
      const body = {
        model: process.env.ANTHROPIC_MODEL || 'claude-2.1',
        prompt,
        max_tokens_to_sample: 300,
      }

      const res = await _fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        return { text: fallbackSummary(audit), error: `anthropic_${res.status}`, detail: txt }
      }

      const j = await res.json()
      const text = j?.completion || j?.outputs?.[0]?.content?.[0]?.text || ''
      if (!text) return { text: fallbackSummary(audit), error: 'anthropic_no_text', raw: j }
      return { text: String(text).trim(), raw: j, provider: 'anthropic' }
    }

    if (openaiKey) {
      const body = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }

      const res = await _fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        return { text: fallbackSummary(audit), error: `openai_${res.status}`, detail: txt }
      }

      const j = await res.json()
      const msg = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text
      if (!msg) return { text: fallbackSummary(audit), error: 'openai_no_choice', raw: j }
      return { text: String(msg).trim(), raw: j, provider: 'openai' }
    }

    if (groqKey) {
      const res = await _fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
      })

      if (!res.ok) {
        const txt = await res.text()
        return { text: fallbackSummary(audit), error: `groq_${res.status}`, detail: txt }
      }

      const j = await res.json()
      const msg = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text
      if (!msg) return { text: fallbackSummary(audit), error: 'groq_no_choice', raw: j }
      return { text: String(msg).trim(), raw: j, provider: 'groq' }
    }

    return { text: fallbackSummary(audit), error: 'no_api_key' }
  } catch (e) {
    return { text: fallbackSummary(audit), error: String(e && e.message ? e.message : e) }
  }
}

function fallbackSummary(audit) {
  const totalMonthly = (audit.tools || []).reduce(
    (s, t) => s + (Number(t.monthlySpend) || 0),
    0,
  );
  const savingsHint =
    totalMonthly > 500
      ? "Potentially significant savings — consider a consultation."
      : "You appear close to optimal spend.";
  return `Summary: Your team (${audit.teamSize || "n/a"}) spends $${totalMonthly}/month on AI tools. ${savingsHint} Recommendations: review per-seat plans and evaluate lower-cost alternatives for non-core workflows.`;
}

module.exports = { generateSummary };
