export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  try {
    const { system, history = [], user } = JSON.parse(event.body || '{}');
    if (!user) return json(400, { error: 'Missing user text' });

    const messages = [{ role: 'system', content: system }, ...history, { role: 'user', content: user }];

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return json(r.status, { error: t });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '…';
    return json(200, { reply });
  } catch (e) {
    return json(500, { error: e.message || 'server error' });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}
function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify(obj) };
}
