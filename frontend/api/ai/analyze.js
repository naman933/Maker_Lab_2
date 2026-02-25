export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured. Add it in Vercel Environment Variables.' });
  }

  const systemMsg = 'You are an admissions query analyst. Analyze the candidate\'s query and return a JSON object only, with no extra text.';
  const userMsg = `Analyze this admissions query and return ONLY a valid JSON object with these exact keys:
{
  "summary": "2-3 sentence plain English summary of what the candidate is asking",
  "intent": "one of: Information Request | Document Submission | Payment Issue | Technical Problem | Eligibility Clarification | Complaint | Other",
  "urgency": "one of: High | Medium | Low",
  "urgencyReason": "one short sentence explaining why this urgency level was assigned",
  "draftResponse": "a polite, professional 3-5 sentence draft reply to the candidate that addresses their query. Do not use placeholders. Write as if from the admissions team."
}

Candidate Query: ${description}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
    }

    const content = data.choices?.[0]?.message?.content || '';

    try {
      const result = JSON.parse(content);
      return res.status(200).json(result);
    } catch {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        const result = JSON.parse(content.substring(start, end));
        return res.status(200).json(result);
      }
      return res.status(500).json({ error: 'Could not parse AI response', raw: content });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
