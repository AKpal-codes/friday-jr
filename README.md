# FRIDAY-Jr — AI Voice Assistant (Netlify Deployable)

A **lightweight, mobile-friendly voice assistant** that listens, chats with an LLM, and replies with **natural TTS**.

* LLM via **Groq** (`llama-3.1-8b-instant`)
* STT via **Web Speech API** (browser)
* TTS via **ElevenLabs** (free tier) with **browser TTS** fallback
* One-click deploy on **Netlify** (serverless functions for API keys)

---

## Features

* Real-time **press-and-hold** speech input (mobile friendly)
* **Role-play persona** (FRIDAY talking to Peter Parker)
* **Natural voices** (selectable: Rachel, Bella, Dom, Antoni)
* PWA install prompt + offline shell via Service Worker
* Local conversation memory (per-device) with `localStorage`

---

## Project Structure

```
.
├─ index.html              # UI (chat, mic, voice selector)
├─ style.css               # Styling
├─ persona.js              # System prompt (FRIDAY persona)
├─ script.js               # Frontend logic (STT, chat, TTS)
├─ sw.js                   # Service worker cache
├─ manifest.webmanifest    # PWA metadata
├─ netlify.toml            # Netlify config (publish, functions, CORS)
└─ functions/
   ├─ chat.js              # Calls Groq Chat Completions
   └─ tts.js               # Proxies ElevenLabs TTS (hides API key)
```

---

## Getting Started

### 1) Clone the Repo

```bash
git clone https://github.com/AKpal-codes/friday-jr.git
cd friday-jr
```

### 2) (Optional) Install Netlify CLI for local dev

```bash
npm install -g netlify-cli
```

### 3) Set Environment Variables

In **Netlify** → `Site settings` → `Build & deploy` → `Environment variables`

Required:

```env
GROQ_API_KEY=your_groq_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

> 🔐 Keys stay on the server (in functions), never in client JS.

### 4) Run Locally (with functions)

```bash
netlify dev
```

This serves the site + functions at a local URL.

### 5) Deploy

Push to GitHub, connect repo on Netlify, or deploy from CLI:

```bash
netlify deploy --prod
```

---

## Usage

1. Open the app (HTTPS required).
2. Tap 🎙️ **Hold to talk** → speak → release.
3. FRIDAY-Jr replies in text, then speaks using your selected voice.
4. Toggle **Use natural TTS** (ElevenLabs) as desired.

* By default, TTS is wired to **ElevenLabs** via the `/tts` function.
* If disabled, it falls back to **browser speechSynthesis voices**.

---

## Configuration

### LLM (Groq) — `functions/chat.js`

* Model: `llama-3.1-8b-instant`
* Endpoint: `https://api.groq.com/openai/v1/chat/completions`
* Reads `GROQ_API_KEY` from env

### TTS (ElevenLabs) — `functions/tts.js`

* Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
* Voices (defaults in code):

  * Rachel → `21m00Tcm4TlvDq8ikWAM`
  * Bella → `EXAVITQu4vr4xnSDxMaL`
  * Antoni → `ErXwobaYiN019PkySvjV`
  * Dom → `AZnzlk1XvdvUeBnXmlld`
* Reads `ELEVENLABS_API_KEY` from env
* Frontend calls `/.netlify/functions/tts` with `{ text, voice }`

### Browser TTS Fallback

If cloud TTS fails or toggle is off:

```js
new SpeechSynthesisUtterance(text)
```

…and applies the selected local voice if available.

---

## HTML Controls (excerpt)

```html
<label>Voice (cloud TTS):</label>
<select id="voiceSelect">
  <option value="rachel">Rachel</option>
  <option value="bella">Bella</option>
  <option value="antoni">Antoni</option>
  <option value="dom">Dom</option>
</select>

<label><input type="checkbox" id="speakToggle" checked /> Speak replies</label>
<label><input type="checkbox" id="cloudTtsToggle" /> Use natural TTS (ElevenLabs)</label>
```

---

## Troubleshooting

* **HTML changes not showing after deploy**

  * Netlify → Deploys → Trigger deploy → Clear cache and redeploy
  * Hard refresh (`Cmd+Shift+R` / `Ctrl+F5`) or try incognito
  * Check `netlify.toml` publish path
  * Service Worker may cache files → bump CACHE version in `sw.js`

* **Mic permission granted but no transcript**

  * Some mobile browsers have limited `SpeechRecognition` support
  * Ensure HTTPS, recreate recognizer per press
  * iOS Safari doesn’t support Web Speech API → add cloud STT if needed

* **No audio playback on iOS**

  * Audio must start after a user gesture
  * Ensure first `Audio.play()` is triggered from a tap

* **TTS silent**

  * Check `ELEVENLABS_API_KEY` in Netlify env vars
  * Verify selected voice name matches server mapping
  * Inspect console/network: `/.netlify/functions/tts` should return `200` with `audio/mpeg`

---

## Notes

* This is a fan role-play app (**FRIDAY / Peter Parker**). Not affiliated with Marvel.
* Avoid copyrighted quotes; persona prompt paraphrases.

---

## License

[MIT](./LICENSE) — free to use, modify, and share. Attribution appreciated.

---

## Author

Built by [**Ankur Pal**](https://github.com/AKpal-codes).
PRs welcome! 🚀
