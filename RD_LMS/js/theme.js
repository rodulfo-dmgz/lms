/**
 * RD WORKFLOW — Theme Manager
 * Gestion du basculement thème Clair/Sombre avec persistance
 */
const THEME_KEY = 'rd-theme';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.attachEvents());
    } else {
      this.attachEvents();
    }
    this.watchSystem();
  }

  getStoredTheme()  { return localStorage.getItem(THEME_KEY); }
  getSystemTheme()  { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }

  applyTheme(theme, save = true) {
    this.html.classList.toggle('dark', theme === 'dark');
    this.currentTheme = theme;
    if (save) localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    this.updateToggleButton();
  }

  toggleTheme() { this.applyTheme(this.currentTheme === 'light' ? 'dark' : 'light'); }

  attachEvents() {
    if (this._delegationAttached) return;
    // Event delegation: works regardless of how many #themeToggle buttons are in DOM
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-toggle]')) this.toggleTheme();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
    this._delegationAttached = true;
  }

  updateToggleButton() {
    // Update ALL theme toggle buttons in the DOM (login page + topbar can coexist)
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const isDark = this.currentTheme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', isDark ? 'Passer au thème clair' : 'Passer au thème sombre');
      btn.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      btn.appendChild(icon);
      if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
    });
  }

  watchSystem() {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      if (!this.getStoredTheme()) this.applyTheme(e.matches ? 'dark' : 'light', false);
    };
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
  }

  setTheme(t)  { if (t === 'light' || t === 'dark') this.applyTheme(t); }
  getTheme()   { return this.currentTheme; }
  reset()      { localStorage.removeItem(THEME_KEY); this.applyTheme(this.getSystemTheme(), false); }
}

const themeManager = new ThemeManager();
window.themeManager = themeManager;
