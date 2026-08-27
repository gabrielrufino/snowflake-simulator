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
  });
}

export function setTheme(theme) {
  localStorage.setItem('snowflake_theme', theme);
  applyTheme(theme);
}

export function initTheme() {
  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeValue);
    });
  });

  systemMedia.addEventListener('change', () => {
    if (getSavedTheme() === 'system') {
      applyTheme('system');
    }
  });

  applyTheme(getSavedTheme());
}
