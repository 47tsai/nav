const bookmarks = [
  {title:"Chi 的工具箱", url:"https://nav.chi.qzz.io/", description:"Chi 的個人網站導航", icon:"fa-solid fa-compass"},
  {title:"Google", url:"https://www.google.com/", description:"網路搜尋", icon:"fa-brands fa-google"},
  {title:"FB", url:"https://www.facebook.com/", description:"社群平台", icon:"fa-brands fa-facebook"},
  {title:"YT", url:"https://www.youtube.com/", description:"影音平台", icon:"fa-brands fa-youtube"},
  {title:"YT Music", url:"https://music.youtube.com/", description:"音樂串流", icon:"fa-brands fa-youtube"},
  {title:"bilibili", url:"https://www.bilibili.com/", description:"彈幕影音平台", icon:"fa-solid fa-play"},
  {title:"GitHub", url:"https://github.com/", description:"程式碼託管", icon:"fa-brands fa-github"},
  {title:"IG", url:"https://www.instagram.com/", description:"圖片與影音社群", icon:"fa-brands fa-instagram"},
  {title:"ChatGPT", url:"https://chatgpt.com/", description:"AI 助手", icon:"fa-solid fa-comments"},
  {title:"Threads", url:"https://www.threads.net/", description:"文字社群", icon:"fa-brands fa-threads"},
  {title:"Gmail", url:"https://mail.google.com/", description:"電子郵件", icon:"fa-solid fa-envelope"},
  {title:"Notion", url:"https://app.notion.com/", description:"筆記與知識管理", icon:"fa-solid fa-n"},
  {title:"Ente Auth", url:"https://auth.ente.com/", description:"2FA 驗證碼", icon:"fa-solid fa-shield-halved"},
  {title:"Raindrop.io", url:"https://app.raindrop.io/", description:"網頁書籤管理", icon:"fa-solid fa-bookmark"},
  {title:"Alist", url:"https://alist.chi.qzz.io", description:"雲端儲存整合", icon:"fa-solid fa-cloud"}
];

const grid = document.getElementById("bookmark-grid");
const search = document.getElementById("search-input");
const clear = document.getElementById("search-clear");
const empty = document.getElementById("empty-state");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}

function render() {
  const query = search.value.trim().toLowerCase();
  const visible = bookmarks.filter(item =>
    !query || [item.title, item.url, item.description].join(" ").toLowerCase().includes(query)
  );

  grid.innerHTML = visible.map(item => `
    <a class="card card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
      <div class="card-main">
        <div class="card-logo-container">
          <i class="${escapeHtml(item.icon)} card-logo" aria-hidden="true"></i>
        </div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(item.title)}</div>
          <div class="card-desc">${escapeHtml(item.description)}</div>
        </div>
      </div>
    </a>
  `).join("");

  empty.hidden = visible.length !== 0;
}

search.addEventListener("input", render);
clear.addEventListener("click", () => {
  search.value = "";
  render();
  search.focus();
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.focus();
  }
});

render();

/* 側邊欄與版本 — 跟主站／admin 共用同一份來源，不要在這頁手寫側邊欄連結。
 * 側邊欄：分類來自 ../data/data.json，renderSidebarNav() 產生；前綴 '/' 指回主站，
 * 這頁沒有對應的 active 項目；有收藏時才顯示「我的收藏」（跟 admin 一樣讀
 * localStorage 的 chi-nav-favorites）。載不到 data.json 時側邊欄留空，不影響書籤。 */
(function initSidebar() {
  var menu = document.getElementById("js-nav-menu");
  if (!menu || typeof renderSidebarNav !== "function" || typeof sidebarGroups !== "function") return;
  var showFavorites = false;
  try {
    var fav = JSON.parse(localStorage.getItem("chi-nav-favorites") || "[]");
    showFavorites = Array.isArray(fav) && fav.length > 0;
  } catch (e) {}
  fetch("../data/data.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("data.json HTTP " + r.status); return r.json(); })
    .then(function (data) {
      menu.innerHTML = renderSidebarNav({ groups: sidebarGroups(data), activeId: null, prefix: "/", showFavorites: showFavorites });
    })
    .catch(function (err) { console.warn("bookmarks sidebar failed:", err); });
})();

/* 頁尾版本號 — 主站 js/update.js 的 checkVersion() 是寫死抓站內 version.json，
 * 從 /bookmarks/ 抓會變成 /bookmarks/version.json（不存在），所以這頁自己抓 ../version.json。 */
(function initVersion() {
  var label = document.getElementById("site-version");
  if (!label) return;
  fetch("../version.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("version.json HTTP " + r.status); return r.json(); })
    .then(function (info) {
      if (!info || !info.version) return;
      label.textContent = "v" + info.version;
      label.title = info.message ? (info.date || "") + " · " + info.message : (info.date || "");
      label.setAttribute("aria-label", "目前版本 v" + info.version);
    })
    .catch(function (err) { console.warn("bookmarks version check failed:", err); });
})();