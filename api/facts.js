export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { number } = req.body;

  if (
    number === undefined ||
    number === null ||
    !Number.isInteger(number) ||
    number < 1 ||
    number > 999
  ) {
    return res
      .status(400)
      .json({ error: "Please enter a whole number between 1 and 999." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Server configuration error. Please try again later." });
  }

  const prompt = `You are a friendly, enthusiastic facts expert talking to a curious 10-13 year old boy in the UK.
Generate 4 interesting, surprising facts about the number ${number}.
Cover a mix of: maths, science/space, history/world events, and wildlife/nature.
Each fact must directly feature the number ${number}.
Write in short punchy sentences (max 2-3 sentences per fact).
Use British English spelling.
Do NOT use bullet points, numbers, or headers — just plain paragraphs separated by blank lines.
Be enthusiastic. Use language a smart 12-year-old would find cool, not babyish.

IMPORTANT RULES:
- Every fact must be grounded in the real world (a historical event, a scientific measurement, an animal behaviour, a maths property).
- NEVER write circular or tautological statements (e.g. "X is greater than X" or "X equals X").
- If you are unsure whether a fact is true, leave it out and replace it with one you are certain about.
- Do not compare the number to itself.`;

  function looksCircular(text, number) {
    const n = String(number);
    const pattern = new RegExp(`\\b${n}\\b.{0,40}\\b${n}\\b`, 'i');
    return pattern.test(text);
  }

  async function callGroq() {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.9,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Groq API error:", response.status, err);
      return null;
    }

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content ?? "";

    // Strip reasoning block from deepseek-r1
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Strip markdown: bold, italic, headers, bullet points
    text = text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*•]\s+/gm, "")
      .trim();

    return text;
  }

  try {
    let text = await callGroq();

    if (text === null) {
      return res.status(502).json({
        error: "Could not fetch facts right now. Try again in a moment!",
      });
    }

    // Retry up to 2 times if circular output is detected
    for (let i = 0; i < 2 && looksCircular(text, number); i++) {
      const retry = await callGroq();
      if (retry !== null) text = retry;
    }

    return res.status(200).json({ facts: text });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res
      .status(500)
      .json({ error: "Something went wrong. Give it another go!" });
  }
}
