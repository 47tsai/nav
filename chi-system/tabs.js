/* chi-system Tabs — accessible horizontal tablist behavior. */
(function () {
  'use strict';

  const ROOT_SELECTOR = '[data-chi-tabs]';
  const TAB_SELECTOR = '[role="tab"]';

  function init(root) {
    if (!root || root.getAttribute('data-chi-tabs-initialized') === 'true') return;
    const tabs = Array.from(root.querySelectorAll(TAB_SELECTOR));
    if (!tabs.length) return;

    const enabledTabs = () => tabs.filter((tab) => !tab.disabled && tab.getAttribute('aria-disabled') !== 'true');
    const panelFor = (tab) => {
      const id = tab.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    };

    function activate(activeTab, moveFocus) {
      if (!activeTab || activeTab.disabled || activeTab.getAttribute('aria-disabled') === 'true') return;
      for (const tab of tabs) {
        const selected = tab === activeTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('tabindex', selected ? '0' : '-1');
        const panel = panelFor(tab);
        if (panel) panel.hidden = !selected;
      }
      if (moveFocus) activeTab.focus();
    }

    const initial = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true' && !tab.disabled && tab.getAttribute('aria-disabled') !== 'true')
      || enabledTabs()[0];
    if (initial) activate(initial, false);
    root.setAttribute('data-chi-tabs-initialized', 'true');

    root.addEventListener('click', (event) => {
      const tab = event.target && typeof event.target.closest === 'function' ? event.target.closest(TAB_SELECTOR) : null;
      if (tab && root.contains(tab)) activate(tab, false);
    });

    root.addEventListener('keydown', (event) => {
      const current = event.target && typeof event.target.closest === 'function' ? event.target.closest(TAB_SELECTOR) : null;
      if (!current || !root.contains(current)) return;
      const available = enabledTabs();
      if (!available.length) return;
      const index = available.indexOf(current);
      if (index < 0) return;
      let next = null;
      if (event.key === 'ArrowRight') next = available[(index + 1) % available.length];
      else if (event.key === 'ArrowLeft') next = available[(index - 1 + available.length) % available.length];
      else if (event.key === 'Home') next = available[0];
      else if (event.key === 'End') next = available[available.length - 1];
      if (!next) return;
      event.preventDefault();
      activate(next, true);
    });
  }

  function initAll() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  window.ChiTabs = { init, initAll };
})();