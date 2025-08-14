export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  try {
    if (!process.env.OPENAI_API_KEY) return mp3(200, new Uint8Array()); // empty => frontend will fallback
    const { text } = JSON.parse(event.body || '{}');
    if (!text) return mp3(200, new Uint8Array());

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',         // try 'verse', 'aria', etc. if available
        input: text,
        format: 'mp3'
      })
    });

    if (!r.ok) {
      const t = await r.text();
      // return empty so client falls back to browser TTS
      return mp3(200, new Uint8Array());
    }
    const arrayBuf = await r.arrayBuffer();
    return mp3(200, new Uint8Array(arrayBuf));
  } catch (e) {
    return mp3(200, new Uint8Array());
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}
function mp3(status, bytes) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'audio/mpeg', ...corsHeaders() },
    body: Buffer.from(bytes).toString('base64'),
    isBase64Encoded: true
  };
}
