/* 回到頂部 — 舊站 js/theme.js 浮動按鈕的其中一顆。
 * 主題切換已由側邊欄底部的 data-chi-theme-toggle 接手，這裡只留回到頂部：
 * 位置與行為跟舊站一致（右下角浮動、點按平滑捲回最上面）。 */
(function () {
  'use strict';

  function init() {
    if (document.querySelector('.floating-actions')) return;
    var actions = document.createElement('div');
    actions.className = 'floating-actions';
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.title = '回到最上面';
    btn.setAttribute('aria-label', '回到最上面');
    btn.innerHTML = '<i class="fa-solid fa-location-arrow" aria-hidden="true"></i>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
    actions.appendChild(btn);
    document.body.appendChild(actions);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
