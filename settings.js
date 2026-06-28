/* ─────────────────────────────────────────────────
   settings.js  –  Settings page
   Multi-freelancer management + API key storage
   ───────────────────────────────────────────────── */

const FL_KEY  = 'bidcraft_freelancers';
const API_KEY = 'bidcraft_api';

// ── Elements ──────────────────────────────────────────────────
const formPhotoInput       = document.getElementById('form-photo-input');
const formPhotoPreview     = document.getElementById('form-photo-preview');
const formPhotoPlaceholder = document.getElementById('form-photo-placeholder');
const formName             = document.getElementById('form-name');
const formPrompt           = document.getElementById('form-prompt');
const addBtn               = document.getElementById('add-btn');
const cancelEditBtn        = document.getElementById('cancel-edit-btn');
const formModeTitle        = document.getElementById('form-mode-title');
const freelancerList       = document.getElementById('freelancer-list');

const providerTabs  = document.querySelectorAll('.provider-tab');
const openaiField   = document.getElementById('openai-field');
const geminiField   = document.getElementById('gemini-field');
const openaiKey     = document.getElementById('openai-key');
const geminiKey     = document.getElementById('gemini-key');
const saveApiBtn    = document.getElementById('save-api-btn');
const apiSaved      = document.getElementById('api-saved');

let selectedProvider = 'openai';
let formPhotoData    = null;  // base64
let editingIndex     = null;  // null = add mode, number = edit mode

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadApiForm();
  renderFreelancers();
});

// ── API Key section ───────────────────────────────────────────
function loadApiForm() {
  const s = loadApiSettings();
  selectedProvider = s.provider || 'openai';
  openaiKey.value  = s.openaiKey || '';
  geminiKey.value  = s.geminiKey || '';
  setActiveProvider(selectedProvider);
}

providerTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    selectedProvider = tab.dataset.provider;
    setActiveProvider(selectedProvider);
  });
});

function setActiveProvider(p) {
  providerTabs.forEach(t => t.classList.toggle('active', t.dataset.provider === p));
  openaiField.classList.toggle('active', p === 'openai');
  geminiField.classList.toggle('active', p === 'gemini');
}

// Toggle show/hide keys
document.querySelectorAll('.toggle-key-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show  = input.type === 'password';
    input.type  = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
  });
});

saveApiBtn.addEventListener('click', () => {
  const settings = {
    provider:  selectedProvider,
    openaiKey: openaiKey.value.trim(),
    geminiKey: geminiKey.value.trim(),
  };
  localStorage.setItem(API_KEY, JSON.stringify(settings));
  apiSaved.classList.add('show');
  setTimeout(() => apiSaved.classList.remove('show'), 2500);
});

// ── Photo upload ──────────────────────────────────────────────
formPhotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = ev => {
    formPhotoData = ev.target.result;
    formPhotoPreview.src = formPhotoData;
    formPhotoPreview.style.display = 'block';
    formPhotoPlaceholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// ── Add / Save freelancer ─────────────────────────────────────
addBtn.addEventListener('click', () => {
  const name   = formName.value.trim();
  const prompt = formPrompt.value.trim();

  if (!name) { showToast('Please enter a name.', 'error'); formName.focus(); return; }

  const freelancers = loadFreelancers();
  const fl = { name, prompt, photo: formPhotoData };

  if (editingIndex !== null) {
    // Preserve photo if not changed
    if (!formPhotoData && freelancers[editingIndex]?.photo) {
      fl.photo = freelancers[editingIndex].photo;
    }
    freelancers[editingIndex] = fl;
    showToast(`${name} updated.`, 'success');
  } else {
    freelancers.push(fl);
    showToast(`${name} added.`, 'success');
  }

  saveFreelancers(freelancers);
  renderFreelancers();
  resetForm();
});

cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
  editingIndex  = null;
  formPhotoData = null;
  formName.value   = '';
  formPrompt.value = '';
  formPhotoPreview.style.display     = 'none';
  formPhotoPlaceholder.style.display = 'flex';
  formPhotoInput.value = '';
  addBtn.textContent        = 'Add freelancer';
  cancelEditBtn.style.display = 'none';
  formModeTitle.textContent = 'Add freelancer';
}

// ── Render list ───────────────────────────────────────────────
function renderFreelancers() {
  const freelancers = loadFreelancers();
  freelancerList.innerHTML = '';

  if (!freelancers.length) {
    freelancerList.innerHTML = '<p class="empty-list">No freelancers added yet.</p>';
    return;
  }

  freelancers.forEach((fl, i) => {
    const item = document.createElement('div');
    item.className = 'freelancer-item';

    const avatarHTML = fl.photo
      ? `<div class="fl-avatar"><img src="${fl.photo}" alt="${fl.name}" /></div>`
      : `<div class="fl-avatar">${(fl.name || '?')[0].toUpperCase()}</div>`;

    const previewText = fl.prompt
      ? fl.prompt.substring(0, 80) + (fl.prompt.length > 80 ? '…' : '')
      : '<em>No prompt</em>';

    item.innerHTML = `
      ${avatarHTML}
      <div class="fl-info">
        <div class="fl-name">${escapeHtml(fl.name)}</div>
        <div class="fl-prompt-preview">${escapeHtml(previewText)}</div>
      </div>
      <div class="fl-actions">
        <button class="fl-btn edit" data-index="${i}" title="Edit">✏️</button>
        <button class="fl-btn delete" data-index="${i}" title="Delete">🗑️</button>
      </div>
    `;

    item.querySelector('.edit').addEventListener('click', () => startEdit(i));
    item.querySelector('.delete').addEventListener('click', () => deleteFreelancer(i));

    freelancerList.appendChild(item);
  });
}

function startEdit(i) {
  const freelancers = loadFreelancers();
  const fl = freelancers[i];

  editingIndex  = i;
  formPhotoData = fl.photo || null;
  formName.value   = fl.name || '';
  formPrompt.value = fl.prompt || '';

  if (fl.photo) {
    formPhotoPreview.src = fl.photo;
    formPhotoPreview.style.display     = 'block';
    formPhotoPlaceholder.style.display = 'none';
  } else {
    formPhotoPreview.style.display     = 'none';
    formPhotoPlaceholder.style.display = 'flex';
  }

  addBtn.textContent          = 'Save changes';
  cancelEditBtn.style.display = 'inline-flex';
  formModeTitle.textContent   = 'Edit freelancer';
  formName.focus();
}

function deleteFreelancer(i) {
  const freelancers = loadFreelancers();
  const name = freelancers[i]?.name || 'Freelancer';
  freelancers.splice(i, 1);
  saveFreelancers(freelancers);
  renderFreelancers();
  showToast(`${name} removed.`, 'success');
  if (editingIndex === i) resetForm();
}

// ── Storage ───────────────────────────────────────────────────
function loadFreelancers() {
  try { return JSON.parse(localStorage.getItem(FL_KEY) || '[]'); }
  catch { return []; }
}

function saveFreelancers(list) {
  localStorage.setItem(FL_KEY, JSON.stringify(list));
}

function loadApiSettings() {
  try { return JSON.parse(localStorage.getItem(API_KEY) || '{}'); }
  catch { return {}; }
}

// ── Utils ─────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = ''; }, 3200);
}
