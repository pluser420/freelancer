/* ─────────────────────────────────────────────────
   theme.js  –  Dark / Light mode toggle
   Default: dark. Saved to localStorage.
   ───────────────────────────────────────────────── */

(function () {
  const STORAGE_KEY = 'bidcraft_theme';
  const toggle      = document.getElementById('themeToggle');
  const icon        = toggle.querySelector('.toggle-icon');

  // Apply saved preference immediately (before paint)
  const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
  applyTheme(saved);

  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark');
    const next   = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function applyTheme(theme) {
    document.body.classList.toggle('dark',  theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
})();
