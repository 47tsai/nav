/* 側邊欄外殼與手機版標頭唯一來源 — 主站／admin／bookmarks 三頁共用，不要再各寫一份
 * aside 或手機標頭。
 *
 * 為什麼用 JS 注入而不是靜態 HTML：三頁的 aside 外殼（品牌、收合鈕、底部主題切換＋
 * 版本）與手機版標頭（☰ 開抽屜鈕＋站名）一字相同，靜態各寫一份遲早走歪；本站沒有
 * 建置步驟，唯一能在不加建置的前提下共用的辦法就是由這支小腳本在解析期把外殼與標頭
 * 寫進頁面。
 *
 * 為什麼這樣寫是安全的：
 * - 這支腳本放在 <div id="js-mobile-header"></div> 緊接著的下一行、同步載入，執行時
 *   兩個 placeholder 都已經解析完成；chi-system 的 sidebar.js／theme.js 都是等
 *   DOMContentLoaded 才綁按鈕（[data-chi-sidebar-toggle]／[data-chi-theme-toggle]），
 *   外殼與標頭在那之前就已經在 DOM 裡，按鈕照常綁得到。
 * - 注入用 outerHTML 整段替換 placeholder，不留多餘 wrapper，.chi-shell 的子層
 *   結構跟以前靜態寫法完全一樣（aside＋scrim 為直接子層；手機標頭為 .chi-content
 *   的第一個子層）。
 * - logo 是絕對路徑熱連結、品牌連結 href="/"，三頁不需要任何差異。
 * - 腳本位置不能往上移：它必須在兩個 placeholder 之後執行，否則手機標頭那個
 *   placeholder 還沒被解析，注不進去。
 *
 * 限制：關掉 JS 就沒有側邊欄外殼與手機標頭。但本站內容本來就全靠 JS 渲染（卡片、
 * admin 表格、書籤皆然），無 JS 時整站本來就無法使用，所以這不算新增的退化。
 * 改品牌／logo／收合鈕／底部列／手機標頭時，只改這裡的 SHELL／MOBILE_HEADER 各一處。 */
(function () {
  'use strict';
  var SHELL =
    '<aside id="chi-sidebar" class="chi-sidebar" aria-label="側邊欄">' +
    '<div class="chi-sidebar__top">' +
    '<a class="chi-sidebar__brand" href="/" aria-label="Chi導航首頁">' +
    '<img class="chi-sidebar__logo chi-sidebar__logo--light" src="https://raw.githubusercontent.com/47tsai/chi-system/main/logo/nav-b.png" alt="" width="32" height="32">' +
    '<img class="chi-sidebar__logo chi-sidebar__logo--dark" src="https://raw.githubusercontent.com/47tsai/chi-system/main/logo/nav-w.png" alt="" width="32" height="32">' +
    '<span class="chi-sidebar__name">Chi導航</span>' +
    '</a>' +
    '<button class="chi-sidebar__trigger" type="button" data-chi-sidebar-toggle aria-controls="chi-sidebar" aria-expanded="true" aria-label="收合側邊欄" title="收合側邊欄">‹</button>' +
    '</div>' +
    '<nav class="chi-sidebar__nav" id="js-nav-menu" aria-label="網站分類"></nav>' +
    '<div class="chi-sidebar__bottom">' +
    '<button class="chi-sidebar__theme" type="button" data-chi-theme-toggle aria-label="切換主題" title="切換主題"><span aria-hidden="true" data-chi-theme-icon>◐</span></button>' +
    '<span class="chi-sidebar__version">nav.chi.qzz.io</span>' +
    '</div>' +
    '</aside>' +
    '<div class="chi-sidebar__scrim" data-chi-sidebar-scrim aria-hidden="true"></div>';
  var MOBILE_HEADER =
    '<div class="chi-mobile-header">' +
    '<button class="chi-sidebar__trigger" type="button" data-chi-sidebar-toggle aria-controls="chi-sidebar" aria-expanded="false" aria-label="開啟導覽選單" title="開啟導覽選單">☰</button>' +
    '<span class="chi-header__name">Chi導航</span>' +
    '</div>';
  var host = document.getElementById('js-sidebar-shell');
  if (host) host.outerHTML = SHELL;
  var mobile = document.getElementById('js-mobile-header');
  if (mobile) mobile.outerHTML = MOBILE_HEADER;
})();
