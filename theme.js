/* ─────────────────────────────────────────────────
   theme.js  –  Dark / Light mode toggle
   Shared by index.html and settings.html
   ───────────────────────────────────────────────── */

(function () {
  const STORAGE_KEY = 'bidcraft_theme';
  const toggle      = document.getElementById('themeToggle');
  const icon        = toggle.querySelector('.toggle-icon');
  const label       = toggle.querySelector('.toggle-label');

  // Apply saved theme immediately (no flash)
  const saved = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(saved);

  // Button click
  toggle.addEventListener('click', () => {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      icon.textContent  = '☀️';
      label.textContent = 'Light';
    } else {
      document.body.classList.remove('dark');
      icon.textContent  = '🌙';
      label.textContent = 'Dark';
    }
  }
})();
