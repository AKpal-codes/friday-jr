import { SYSTEM_PROMPT } from './persona.js';

const messagesEl = document.getElementById('messages');
const micBtn = document.getElementById('micBtn');
const sendBtn = document.getElementById('sendBtn');
const textInput = document.getElementById('textInput');
const statusEl = document.getElementById('status');
const voiceSelect = document.getElementById('voiceSelect');
const speakToggle = document.getElementById('speakToggle');
const cloudTtsToggle = document.getElementById('cloudTtsToggle');

let convo = JSON.parse(localStorage.getItem('convo') || '[]');
let speaking = false;
let recognition = null;
let installPromptEvent = null;

// PWA install
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPromptEvent = e;
  const btn = document.getElementById('installBtn');
  btn.hidden = false;
  btn.onclick = async () => { if (installPromptEvent) await installPromptEvent.prompt(); };
});

// voices
function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}
window.speechSynthesis.onvoiceschanged = loadVoices; loadVoices();

// UI helpers
function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function setStatus(s) { statusEl.textContent = s; }
function saveConvo() { localStorage.setItem('convo', JSON.stringify(convo.slice(-12))); }

// TTS - browser fallback
function speakLocal(text) {
  if (!speakToggle.checked) return;
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const v = voices.find(v => v.name === voiceSelect.value) || voices[0]; // fallback
  if (v) u.voice = v;
  speaking = true;
  u.onend = () => { speaking = false; };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

async function speakCloud(text, voice) {
  if (!speakToggle.checked) return;

  // Read voice from dropdown if not explicitly passed
  if (!voice) {
    const voiceSelect = document.getElementById("voiceSelect");
    voice = voiceSelect ? voiceSelect.value : "rachel";
  }

  try {
    const r = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ text, voice })
    });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (e) {
    console.warn('Cloud TTS failed, falling back to local:', e);
    speakLocal(text);
  }
}

// STT using Web Speech API (works on HTTPS origins)
function getRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = false;
  return r;
}
recognition = getRecognizer();

function holdToTalkPress() {
  recognition = getRecognizer();
  if (!recognition) { alert('Speech recognition not supported on this browser. Type instead.'); return; }
  textInput.value = '';
  setStatus('listening…');
  navigator.mediaDevices?.getUserMedia?.({ audio: true }).catch(()=>{});
  recognition.start();

  recognition.onresult = (e) => {
    let final = '';
    for (const res of e.results) final += res[0].transcript;
    textInput.value = final.trim();
  };
  recognition.onerror = (ev) => { console.warn('STT error:', ev.error); setStatus('error (mic)'); };
  recognition.onend = () => setStatus('idle');
}

function holdToTalkRelease() {
  if (recognition) recognition.stop();
  setStatus('processing…');
}
if (recognition) {
  recognition.onresult = (e) => {
    let final = '';
    for (const res of e.results) final += res[0].transcript;
    textInput.value = final.trim();
  };
  recognition.onerror = (ev) => { console.warn('STT error:', ev.error); setStatus('error (mic)'); };
  recognition.onend = () => setStatus('idle');
}
// press-and-hold UX
let pressTimer = null;
micBtn.addEventListener('mousedown', () => { pressTimer = setTimeout(holdToTalkPress, 50); });
micBtn.addEventListener('mouseup', () => { clearTimeout(pressTimer); holdToTalkRelease(); });
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); pressTimer = setTimeout(holdToTalkPress, 50); }, {passive:false});
micBtn.addEventListener('touchend', (e) => { e.preventDefault(); clearTimeout(pressTimer); holdToTalkRelease(); }, {passive:false});

// LLM via Netlify function (Groq)
async function chatLLM(userText) {
  const body = {
    system: SYSTEM_PROMPT,
    history: convo.map(m => ({ role: m.role, content: m.content })),
    user: userText
  };
  setStatus('talking to FRIDAY…');
  const resp = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data.reply?.trim() || '(no reply)';
}

async function sendText() {
  const user = textInput.value.trim();
  if (!user) return;
  addMsg('user', user);
  convo.push({ role:'user', content:user });
  textInput.value = '';
  try {
    const reply = await chatLLM(user);
    addMsg('assistant', reply);
    convo.push({ role:'assistant', content:reply });
    saveConvo();
    if (cloudTtsToggle.checked) await speakCloud(reply);
    else speakLocal(reply);
  } catch (e) {
    console.error(e);
    addMsg('assistant', 'Sorry Peter, my uplink just glitched.');
  } finally {
    setStatus('idle');
  }
}

sendBtn.onclick = sendText;
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }});

// greet on first load
if (!convo.length) {
  const hello = 'Hello, Peter. Welcome back!';
  addMsg('assistant', hello);
  convo.push({ role:'assistant', content: hello });
  saveConvo();

  // Speak using cloud TTS (random or fixed voice)
  window.addEventListener("DOMContentLoaded", () => {
    if (cloudTtsToggle.checked) {
      speakCloud(hello, "rachel");
    } else {
      speakLocal(hello);
    }
  });
}


// service worker
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
