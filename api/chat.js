// api/chat.js
// Vercel serverless function — runs on the server, never exposes your API key to the browser.
// Uses Google's Gemini API (free tier) and reshapes the response to match the
// {content: [{type:"text", text:"..."}]} format the frontend (chat.js) expects.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid "messages" array' });
  }

  // Convert {role: "user"|"assistant", content: "..."} (Anthropic-style, used by the frontend)
  // into Gemini's {role: "user"|"model", parts: [{text: "..."}]} format.
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY // stored server-side, never in frontend code
        },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API request failed' });
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';

    // Reshape into the format chat.js already knows how to read.
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error contacting Gemini API' });
  }
}
