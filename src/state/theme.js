// --- Theme Management ---
const systemMedia = window.matchMedia('(prefers-color-scheme: dark)');

export function getSavedTheme() {
  return localStorage.getItem('snowflake_theme') || 'system';
}

export function applyTheme(theme) {
  const isDark = theme === 'system' ? systemMedia.matches : theme === 'dark';
  
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme-setting', theme);
  
  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(btn => {
    const isActive = btn.dataset.themeValue === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive.toString());
    btn.tabIndex = isActive ? 0 : -1;
  });
}

export function setTheme(theme) {
  localStorage.setItem('snowflake_theme', theme);
  applyTheme(theme);
}

export function initTheme() {
  const themeButtons = [...document.querySelectorAll('.theme-btn')];
  const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeValue);
    });
    btn.addEventListener('keydown', (e) => {
      const step = steps[e.key];
      if (!step) return;
      e.preventDefault();
      const next = themeButtons[(themeButtons.indexOf(btn) + step + themeButtons.length) % themeButtons.length];
      next.focus();
      setTheme(next.dataset.themeValue);
    });
  });

  systemMedia.addEventListener('change', () => {
    if (getSavedTheme() === 'system') {
      applyTheme('system');
    }
  });

  applyTheme(getSavedTheme());
}
