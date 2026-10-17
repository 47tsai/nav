(() => {
  const KEY = 'chi-nav-theme';
  const modes = ['light', 'dark', 'system'];
  const labels = { light: '亮色', dark: '暗色', system: '跟隨系統' };
  const icons = { light: 'fa-solid fa-sun', dark: 'fa-solid fa-moon', system: 'fa-solid fa-circle-half-stroke' };
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function getMode() {
    try {
      const saved = localStorage.getItem(KEY);
      return modes.includes(saved) ? saved : 'system';
    } catch {
      return 'system';
    }
  }

  function apply(mode) {
    const dark = mode === 'dark' || (mode === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themeMode = mode;
    const btn = document.querySelector('.theme-float button');
    if (btn) {
      btn.innerHTML = `<i class="${icons[mode]}"></i>`;
      btn.title = labels[mode];
      btn.setAttribute('aria-label', `外觀模式：${labels[mode]}，點擊切換`);
      btn.dataset.theme = mode;
    }
  }

  function createControl() {
    const box = document.createElement('div');
    box.className = 'theme-float';
    box.setAttribute('aria-label', '外觀模式');
    box.innerHTML = '<button type="button" aria-label="切換外觀模式"></button>';
    box.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const current = getMode();
      const next = modes[(modes.indexOf(current) + 1) % modes.length];
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      apply(next);
    });
    return box;
  }

  function createTopButton() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.title = '回到最上面';
    btn.setAttribute('aria-label', '回到最上面');
    btn.innerHTML = '<i class="fa-solid fa-location-arrow"></i>';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
    return btn;
  }

  function init() {
    if (!document.body) return;
    document.querySelector('.theme-control')?.remove();
    if (!document.querySelector('.floating-actions')) {
      const actions = document.createElement('div');
      actions.className = 'floating-actions';
      actions.append(createTopButton(), createControl());
      document.body.appendChild(actions);
    }
    apply(getMode());
  }

  media.addEventListener?.('change', () => {
    if (getMode() === 'system') apply('system');
  });

  window.addEventListener('DOMContentLoaded', init);
  init();
})();
