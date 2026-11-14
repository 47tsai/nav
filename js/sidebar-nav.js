/* 側邊欄連結唯一來源 — 主站與 admin 共用同一段程式碼產生，不要在兩頁 HTML 各寫一份。
 *
 * 為什麼要共用：admin 側邊欄以前是另外手寫的（#js-admin-menu，inline SVG），跟主站
 * navigation.js 生成的分類連結是兩套寫法，長相遲早走歪。現在兩頁的 aside 裡都只有
 * 一個空的 <nav id="js-nav-menu">，連結全部由 renderSidebarNav() 產生，包含 Admin 連結。
 * 主站 navigation.js 的 sidebar() 與 admin.js 的 buildSidebarNav() 都只是呼叫它，
 * 差別只有傳進去的參數。兩邊要一起變時，只改這個檔案。
 *
 * 參數：
 * - groups: [{id, name, icon}]，已篩過有內容的分類。主站傳 GROUPS（tabsFor 過濾後），
 *   admin 傳 sidebarGroups(state.data)；兩者都以 data.json 的 section 順序編號
 *   group-0、group-1……，且每個子分類都有連結，所以篩選結果一致。
 * - activeId: 目前 active 的項目——主站是 currentNav（'recommendations' / 'recent' /
 *   'favorites' / 'group-N'），admin 固定是 'admin'。只有這一項不同，其餘完全一樣。
 * - prefix: 連結前綴。主站是 ''（站內 hash 路由，app.js 攔截）；admin 是 '/'，
 *   分類連結指回主站（例如 /#category-group-1），點了就跳回主站該分類頁，
 *   因為 admin 頁沒有載 app.js、無法在站內換內容。
 * - showFavorites: 有收藏時才顯示「我的收藏」。主站看 favorites.size，admin 直接
 *   讀 localStorage 的 chi-nav-favorites。
 */
function sidebarGroups(data) {
  return (Array.isArray(data) ? data : [])
    .filter(function (s) { return s && s.taxonomy && Array.isArray(s.list) && s.list.length; })
    .map(function (s, i) {
      return {
        id: 'group-' + i,
        name: s.taxonomy,
        icon: String(s.icon || 'fa-solid fa-layer-group').replace(/^fas\s+/, 'fa-solid ')
      };
    });
}

function renderSidebarNav(opts) {
  var o = opts || {};
  var groups = o.groups || [];
  var activeId = o.activeId || null;
  var prefix = o.prefix || '';
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var link = function (href, label, icon, cls, extra) {
    var id = extra && extra.id;
    var active = id && id === activeId;
    return '<a class="nav-item ' + cls + (active ? ' active' : '') + '" href="' + esc(href) + '"' +
      (extra && extra.dataQuick ? ' data-quick="' + esc(extra.dataQuick) + '"' : '') +
      (extra && extra.dataGroupNav ? ' data-group-nav="' + esc(extra.dataGroupNav) + '"' : '') +
      (extra && extra.ariaLabel ? ' aria-label="' + esc(extra.ariaLabel) + '"' : '') +
      ' title="' + esc(label) + '"' + (active ? ' aria-current="page"' : '') + '>' +
      '<span class="chi-sidebar__icon"><i class="' + esc(icon) + '" aria-hidden="true"></i></span>' +
      '<span class="chi-sidebar__label">' + esc(label) + '</span></a>';
  };
  var html = '';
  if (o.showFavorites) {
    html += link(prefix + '#favorites', '我的收藏', 'fa-solid fa-star', 'quick-nav', { id: 'favorites', dataQuick: 'favorites' });
  }
  html += link(prefix + '#recommendations', '常用', 'fa-solid fa-bolt', 'quick-nav', { id: 'recommendations', dataQuick: 'recommendations' });
  html += link(prefix + '#recent', '最近使用', 'fa-solid fa-clock-rotate-left', 'quick-nav', { id: 'recent', dataQuick: 'recent' });
  html += '<div class="nav-divider"></div>';
  html += groups.map(function (g) {
    return link(prefix + '#category-' + g.id, g.name, g.icon, 'section-nav', { id: g.id, dataGroupNav: g.id });
  }).join('');
  html += link('/admin/', 'Admin', 'fa-solid fa-shield-halved', 'sidebar-admin-link', { id: 'admin', ariaLabel: '開啟管理後台' });
  return html;
}
