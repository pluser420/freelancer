/* ─────────────────────────────────────────────────
   app.js  –  Bid Generator page
   ───────────────────────────────────────────────── */

const generateBtn  = document.getElementById('generate-btn');
const bidAsSelect  = document.getElementById('bid-as');
const projectPost  = document.getElementById('project-post');
const bidOutput    = document.getElementById('bid-output');
const cutBtn       = document.getElementById('cut-btn');
const selectedAvatar = document.getElementById('selectedAvatar');

// ── On load ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  populateFreelancerDropdown();
});

function populateFreelancerDropdown() {
  const freelancers = loadFreelancers();
  bidAsSelect.innerHTML = '<option value="">— Select a freelancer —</option>';
  freelancers.forEach((fl, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = fl.name || `Freelancer ${i + 1}`;
    bidAsSelect.appendChild(opt);
  });

  // Auto-select last used
  const lastIdx = localStorage.getItem('bidcraft_last_fl');
  if (lastIdx !== null && freelancers[lastIdx]) {
    bidAsSelect.value = lastIdx;
    updateAvatar(freelancers[lastIdx]);
  }
}

bidAsSelect.addEventListener('change', () => {
  const freelancers = loadFreelancers();
  const fl = freelancers[bidAsSelect.value];
  if (fl) {
    updateAvatar(fl);
    localStorage.setItem('bidcraft_last_fl', bidAsSelect.value);
  } else {
    resetAvatar();
  }
});

function updateAvatar(fl) {
  if (fl.photo) {
    selectedAvatar.innerHTML = `<img src="${fl.photo}" alt="${fl.name}" />`;
  } else {
    selectedAvatar.innerHTML = `<span>${(fl.name || '?')[0].toUpperCase()}</span>`;
  }
}

function resetAvatar() {
  selectedAvatar.innerHTML = '<span>?</span>';
}

// ── Generate ─────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  const post = projectPost.value.trim();
  if (!post) {
    showToast('Please paste a project description first.', 'error');
    return;
  }

  const flIdx = bidAsSelect.value;
  if (flIdx === '') {
    showToast('Please select a freelancer first.', 'error');
    return;
  }

  const freelancers = loadFreelancers();
  const fl = freelancers[flIdx];
  if (!fl) { showToast('Freelancer not found.', 'error'); return; }

  const apiSettings = loadApiSettings();
  const provider = apiSettings.provider || 'openai';
  const apiKey   = provider === 'openai' ? apiSettings.openaiKey : apiSettings.geminiKey;

  if (!apiKey) {
    showToast('No API key found. Add one in Settings.', 'error');
    return;
  }

  setLoading(true);
  setBidOutput('', true);

  // Build prompt
  const systemPrompt = buildPrompt(fl);

  try {
    let text = '';
    if (provider === 'openai') {
      text = await callOpenAI(apiKey, systemPrompt, post);
    } else {
      text = await callGemini(apiKey, systemPrompt, post);
    }
    setBidOutput(text, false);
    cutBtn.style.display = 'inline-flex';

    // Parse budget/time from project post and show in pills
    parsePills(post);
  } catch (err) {
    showToast(err.message || 'Something went wrong.', 'error');
    setBidOutput('', true);
  } finally {
    setLoading(false);
  }
});

// ── Cut (copy) ────────────────────────────────────────────────
cutBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(bidOutput.textContent).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
});

// ── Helpers ──────────────────────────────────────────────────
function buildPrompt(fl) {
  const name   = fl.name   || 'a freelancer';
  const prompt = fl.prompt || '';

  if (prompt) {
    return `You are ${name}, a professional freelancer writing a bid proposal.\n\n${prompt}\n\nRespond with ONLY the bid text.`;
  }

  return `You are ${name}, a professional freelancer writing a compelling bid proposal. Be direct, personalised, and end with a call to action. Respond with ONLY the bid text.`;
}

async function callOpenAI(apiKey, systemPrompt, post) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Project post:\n\n${post}` },
      ],
      temperature: 0.75,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `OpenAI error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(apiKey, systemPrompt, post) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\nProject post:\n\n${post}` }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 700 },
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
}

function setBidOutput(text, empty) {
  if (empty || !text) {
    bidOutput.textContent = 'Your bid will appear here.';
    bidOutput.classList.add('empty');
    cutBtn.style.display = 'none';
  } else {
    bidOutput.textContent = text;
    bidOutput.classList.remove('empty');
  }
}

// Try to parse budget/time from post text for the nav pills
function parsePills(text) {
  const budgetMatch = text.match(/\$[\d,]+\s*[-–]\s*\$[\d,]+|\$[\d,]+\s*(?:USD|usd)?/);
  const timeMatch   = text.match(/(\d+)\s*(day|week|month)s?/i);

  const budgetPill = document.getElementById('budget-pill');
  const timePill   = document.getElementById('time-pill');

  if (budgetPill && budgetMatch) {
    budgetPill.textContent = '$ ' + budgetMatch[0].replace(/\$/g, '').trim();
  }
  if (timePill && timeMatch) {
    const num  = timeMatch[1];
    const unit = timeMatch[2].toLowerCase();
    const days = unit === 'week' ? num * 7 : unit === 'month' ? num * 30 : num;
    timePill.textContent = `⏱ ${days} days`;
  }
}

// ── Storage helpers ───────────────────────────────────────────
function loadFreelancers() {
  try { return JSON.parse(localStorage.getItem('bidcraft_freelancers') || '[]'); }
  catch { return []; }
}

function loadApiSettings() {
  try { return JSON.parse(localStorage.getItem('bidcraft_api') || '{}'); }
  catch { return {}; }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = ''; }, 3200);
}
