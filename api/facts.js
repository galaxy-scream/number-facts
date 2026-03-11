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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = err?.error?.message ?? err?.error?.status ?? response.status;
      return res.status(502).json({ error: `Gemini error: ${detail}` });
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown: bold, italic, headers, bullet points
    text = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*•]\s+/gm, '')
      .trim();

    return res.status(200).json({ facts: text });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong. Give it another go!' });
  }
}
