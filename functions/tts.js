export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    if (!process.env.ELEVENLABS_API_KEY) return mp3(200, new Uint8Array());
    const { text, voice } = JSON.parse(event.body || '{}');
    if (!text) return mp3(200, new Uint8Array());

    // Voice list (you can replace with your preferred ones from ElevenLabs)
    const voices = {
      rachel: "21m00Tcm4TlvDq8ikWAM",  // Female - friendly
      bella: "EXAVITQu4vr4xnSDxMaL",   // Female - warm
      antoni: "ErXwobaYiN019PkySvjV",  // Male - deep
      dom: "AZnzlk1XvdvUeBnXmlld"      // Male - casual
    };

    const voiceId = voices[voice?.toLowerCase()] || voices.rachel;

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      })
    });

    if (!r.ok) {
      console.error("ElevenLabs Error:", await r.text());
      return mp3(200, new Uint8Array());
    }

    const arrayBuf = await r.arrayBuffer();
    return mp3(200, new Uint8Array(arrayBuf));

  } catch (e) {
    console.error("TTS Error:", e);
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
