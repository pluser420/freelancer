/* ─────────────────────────────────────────────────
   settings.js  –  Settings page logic
   ───────────────────────────────────────────────── */

const STORAGE_KEY = 'bidcraft_settings';

// ── Elements ──────────────────────────────────────────────────
const photoInput      = document.getElementById('photo-input');
const avatarPreview   = document.getElementById('avatar-preview');
const avatarPlaceholder = document.getElementById('avatar-placeholder');
const removePhotoBtn  = document.getElementById('remove-photo');

const displayName     = document.getElementById('display-name');
const yourTitle       = document.getElementById('your-title');

const openaiKey       = document.getElementById('openai-key');
const geminiKey       = document.getElementById('gemini-key');
const providerTabs    = document.querySelectorAll('.provider-tab');
const openaiField     = document.getElementById('openai-field');
const geminiField     = document.getElementById('gemini-field');

const bidStyle        = document.getElementById('bid-style');
const bidPrompt       = document.getElementById('bid-prompt');
const experienceSummary = document.getElementById('experience-summary');
const promptCount     = document.getElementById('prompt-count');
const expCount        = document.getElementById('exp-count');

const saveBtn         = document.getElementById('save-btn');
const savedBadge      = document.getElementById('saved-badge');

let selectedProvider  = 'openai';
let photoDataUrl      = null;

// ── Load saved settings on page load ─────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const s = load();

  displayName.value = s.displayName || '';
  yourTitle.value   = s.yourTitle   || '';
  openaiKey.value   = s.openaiKey   || '';
  geminiKey.value   = s.geminiKey   || '';
  bidStyle.value    = s.bidStyle    || 'professional';
  bidPrompt.value   = s.bidPrompt   || '';
  experienceSummary.value = s.experienceSummary || '';

  updateCharCounts();

  // Provider tab
  selectedProvider = s.provider || 'openai';
  setActiveProvider(selectedProvider);

  // Photo
  if (s.photoDataUrl) {
    showPhoto(s.photoDataUrl);
  }
});

// ── Provider tab switch ───────────────────────────────────────
providerTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    selectedProvider = tab.dataset.provider;
    setActiveProvider(selectedProvider);
  });
});

function setActiveProvider(provider) {
  providerTabs.forEach(t => t.classList.toggle('active', t.dataset.provider === provider));
  openaiField.classList.toggle('active', provider === 'openai');
  geminiField.classList.toggle('active', provider === 'gemini');
}

// ── Photo upload ──────────────────────────────────────────────
photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5 MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    photoDataUrl = ev.target.result;
    showPhoto(photoDataUrl);
  };
  reader.readAsDataURL(file);
});

removePhotoBtn.addEventListener('click', () => {
  photoDataUrl = null;
  avatarPreview.style.display = 'none';
  avatarPlaceholder.style.display = 'flex';
  removePhotoBtn.style.display = 'none';
  photoInput.value = '';
});

function showPhoto(dataUrl) {
  avatarPreview.src = dataUrl;
  avatarPreview.style.display = 'block';
  avatarPlaceholder.style.display = 'none';
  removePhotoBtn.style.display = 'inline-flex';
}

// ── Char counters ─────────────────────────────────────────────
bidPrompt.addEventListener('input', updateCharCounts);
experienceSummary.addEventListener('input', updateCharCounts);

function updateCharCounts() {
  promptCount.textContent = bidPrompt.value.length;
  expCount.textContent    = experienceSummary.value.length;
}

// ── Save ──────────────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
  const settings = {
    provider:           selectedProvider,
    openaiKey:          openaiKey.value.trim(),
    geminiKey:          geminiKey.value.trim(),
    displayName:        displayName.value.trim(),
    yourTitle:          yourTitle.value.trim(),
    bidStyle:           bidStyle.value,
    bidPrompt:          bidPrompt.value.trim(),
    experienceSummary:  experienceSummary.value.trim(),
    photoDataUrl:       photoDataUrl,
  };

  // Validate: at least one key
  if (!settings.openaiKey && !settings.geminiKey) {
    showToast('Please enter at least one API key.', 'error');
    return;
  }

  save(settings);
  showSavedBadge();
  showToast('Settings saved!', 'success');
});

function showSavedBadge() {
  savedBadge.classList.add('show');
  setTimeout(() => savedBadge.classList.remove('show'), 2500);
}

// ── Storage helpers ───────────────────────────────────────────
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
