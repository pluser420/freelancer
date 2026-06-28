/* ─────────────────────────────────────────────────
   app.js  –  Bid Generator page logic
   ───────────────────────────────────────────────── */

const generateBtn = document.getElementById('generate-btn');
const clearBtn    = document.getElementById('clear-btn');
const copyBtn     = document.getElementById('copy-btn');
const bidOutput   = document.getElementById('bid-output');
const projectPost = document.getElementById('project-post');
const noKeyWarn   = document.getElementById('no-key-warning');

// ── On load: check for API key ──────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();
  const hasKey = (settings.provider === 'openai' && settings.openaiKey) ||
                 (settings.provider === 'gemini'  && settings.geminiKey);
  if (!hasKey) {
    noKeyWarn.style.display = 'block';
  }
});

// ── Generate ────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  const post = projectPost.value.trim();
  if (!post) {
    showToast('Please paste a project description first.', 'error');
    projectPost.focus();
    return;
  }

  const settings = loadSettings();
  const provider = settings.provider || 'openai';
  const apiKey   = provider === 'openai' ? settings.openaiKey : settings.geminiKey;

  if (!apiKey) {
    showToast('No API key found. Please add one in Settings.', 'error');
    return;
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(settings);

  setLoading(true);
  setBidOutput('', false);

  try {
    let bidText = '';

    if (provider === 'openai') {
      bidText = await callOpenAI(apiKey, systemPrompt, post);
    } else {
      bidText = await callGemini(apiKey, systemPrompt, post);
    }

    setBidOutput(bidText, false);
    copyBtn.style.display  = 'inline-flex';
    clearBtn.style.display = 'inline-flex';
    noKeyWarn.style.display = 'none';
    showToast('Bid generated!', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong. Check your API key.', 'error');
    setBidOutput('', true);
  } finally {
    setLoading(false);
  }
});

// ── Copy ─────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const text = bidOutput.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
});

// ── Clear ────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  setBidOutput('', true);
  copyBtn.style.display  = 'none';
  clearBtn.style.display = 'none';
  projectPost.value = '';
});

// ── Helpers ──────────────────────────────────────────────────

function buildSystemPrompt(settings) {
  const name       = settings.displayName     || 'a freelancer';
  const style      = settings.bidStyle         || 'professional';
  const customPrompt = settings.bidPrompt      || '';

  // Style descriptions
  const styleMap = {
    professional: 'Write in a professional and formal tone.',
    friendly:     'Write in a friendly, warm, and conversational tone.',
    concise:      'Keep the bid short and concise — maximum 150 words.',
    detailed:     'Write a detailed, comprehensive bid that covers all aspects.',
    custom:       '',
  };

  let prompt = '';

  if (style === 'custom' && customPrompt) {
    // User's fully custom prompt
    prompt = customPrompt;
  } else {
    // Build structured prompt
    prompt = customPrompt
      ? customPrompt
      : `You are a professional freelancer writing a bid proposal for a client project. ${styleMap[style] || styleMap.professional}

Your goal is to write a compelling, personalised bid that:
1. Opens with a hook that directly references the project's specific needs
2. Briefly explains why you are the perfect fit
3. Mentions relevant skills and past experience
4. Proposes a clear plan or approach
5. Ends with a confident, friendly call to action

Keep it genuine — do NOT use filler phrases like "I hope this message finds you well".`;
  }

  // Append identity context
  if (name) prompt += `\n\nFreelancer name: ${name}`;

  prompt += '\n\nRespond with ONLY the bid text — no extra commentary, no labels, no "here is your bid" intro.';

  return prompt;
}

async function callOpenAI(apiKey, systemPrompt, projectPost) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Project post:\n\n${projectPost}` },
      ],
      temperature: 0.75,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `OpenAI error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response from OpenAI.';
}

async function callGemini(apiKey, systemPrompt, projectPost) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const combined = `${systemPrompt}\n\nProject post:\n\n${projectPost}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: combined }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 600,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response from Gemini.';
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
}

function setBidOutput(text, empty) {
  if (empty || !text) {
    bidOutput.textContent = '';
    bidOutput.innerHTML   = 'Your bid will appear here.<br/>Click <strong>Generate Bid</strong> to start.';
    bidOutput.classList.add('empty');
  } else {
    bidOutput.textContent = text;
    bidOutput.classList.remove('empty');
  }
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('bidcraft_settings') || '{}');
  } catch {
    return {};
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = '';
  }, 3200);
}
