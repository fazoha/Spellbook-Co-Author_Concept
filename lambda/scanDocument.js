'use strict'

const OPENAI_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const MAX_SECTION_CHARS = 4000

exports.handler = async (event) => {
  const sections = Array.isArray(event.sections) ? event.sections : []

  if (sections.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No sections provided' }) }
  }

  if (!OPENAI_KEY?.trim()) {
    return { statusCode: 503, body: JSON.stringify({ error: 'OPENAI_API_KEY not set on Lambda' }) }
  }

  const sectionList = sections
    .map((s, i) => {
      const text = typeof s.body === 'string' ? s.body.slice(0, MAX_SECTION_CHARS) : ''
      return `Section ${i + 1} [id:${s.id}] "${s.title || 'Untitled'}":\n${text}`
    })
    .join('\n\n---\n\n')

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY.trim()}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content:
            'You are Co-Author, a contract review assistant. Analyze the contract sections provided and return a JSON array of annotations. Each annotation must be an object with exactly these fields:\n- "sectionId": the id from the section header (e.g. "abc123")\n- "quote": the EXACT verbatim phrase from the text that is problematic (5-15 words, must exist verbatim in the section text)\n- "issue": one sentence describing the problem\n- "suggestion": the exact replacement text for the quoted phrase only\n\nReturn ONLY a valid JSON array, no markdown, no explanation. If a section has no issues, omit it. Maximum 2 annotations per section.',
        },
        {
          role: 'user',
          content: `Analyze these contract sections and return a JSON array of annotations:\n\n${sectionList}`,
        },
      ],
    }),
  })

  const data = await openaiRes.json().catch(() => ({}))
  if (!openaiRes.ok) {
    const msg = data?.error?.message || 'OpenAI request failed'
    return { statusCode: 502, body: JSON.stringify({ error: msg }) }
  }

  const reply = data?.choices?.[0]?.message?.content?.trim() ?? '[]'
  let annotations = []
  try {
    const cleaned = reply.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    annotations = JSON.parse(cleaned)
    if (!Array.isArray(annotations)) annotations = []
  } catch {
    annotations = []
  }

  return { annotations }
}
