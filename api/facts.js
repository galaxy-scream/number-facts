export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { number } = req.body;

  if (
    number === undefined ||
    number === null ||
    !Number.isInteger(number) ||
    number < 1 ||
    number > 999
  ) {
    return res.status(400).json({ error: 'Please enter a whole number between 1 and 999.' });
  }

  // Collect all configured API keys: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
  }

  const prompt = `You are a friendly, enthusiastic facts expert talking to a curious 10-13 year old boy in the UK.
Generate 4 interesting, surprising facts about the number ${number}.
Cover a mix of: maths, science/space, history/world events, and wildlife/nature.
Each fact must directly feature the number ${number}.
Write in short punchy sentences (max 2-3 sentences per fact).
Use British English spelling.
Do NOT use bullet points, numbers, or headers — just plain paragraphs separated by blank lines.
Be enthusiastic. Use language a smart 12-year-old would find cool, not babyish.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9 }
  });

  const errors = [];

  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKeys[i]}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message ?? err?.error?.status ?? response.status;
        errors.push(`key${i + 1}: ${response.status} — ${msg}`);
        continue;
      }

      const data = await response.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      text = text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-*•]\s+/gm, '')
        .trim();

      return res.status(200).json({ facts: text });
    } catch (err) {
      errors.push(`key${i + 1}: fetch error — ${err.message}`);
      continue;
    }
  }

  return res.status(502).json({ error: errors.join(' | ') });
}
