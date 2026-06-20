// api/chat.js
// Vercel serverless function — runs on the server, never exposes your API key to the browser.
// Uses Google's Gemini API (free tier) and reshapes the response to match the
// {content: [{type:"text", text:"..."}]} format the frontend (chat.js) expects.

// Map the Anthropic-style tiers shown in the UI to real Gemini model names.
// Adjust these if you want different underlying Gemini models.
const MODEL_MAP = {
  opus: 'gemini-2.5-pro',         // most capable tier
  sonnet: 'gemini-2.5-flash',     // balanced, default
  haiku: 'gemini-2.5-flash-lite'  // fastest, lightweight
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid "messages" array' });
  }

  const geminiModel = MODEL_MAP[model] || MODEL_MAP.sonnet;

  // Gemini's inline-data limit is 20MB per request (text + all files combined).
  // Re-sending full image/PDF data on every turn of a long conversation can
  // exceed this, so only the most recent message's attachments are sent in
  // full; older attachments are referenced by name only.
  const lastIndex = messages.length - 1;

  const contents = messages.map((m, idx) => {
    const parts = [];
    let textContent = m.content || '';

    if (m.attachments && m.attachments.length) {
      const isRecent = idx === lastIndex;
      m.attachments.forEach(att => {
        if (!isRecent) {
          textContent += `\n\n[Previously attached file: ${att.name} — content not resent]`;
          return;
        }
        if (att.kind === 'image' || att.kind === 'pdf') {
          const base64 = (att.dataUrl || '').split(',')[1];
          if (base64) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: base64
              }
            });
          }
        } else if (att.kind === 'text' && att.text) {
          textContent += `\n\n[Attached file: ${att.name}]\n${att.text}`;
        }
      });
    }

    parts.push({ text: textContent || ' ' });

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
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

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';

    // Reshape into the format chat.js already knows how to read.
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error contacting Gemini API' });
  }
}
