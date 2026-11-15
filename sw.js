/* Service Worker — Chi導航
 * 重要：每次推上 main、且有改到 CORE_ASSETS 裡的檔案（css/js/data/manifest/圖示），
 * 就要把 CACHE_NAME 版號 +1（v23 → v24 …）。不 bump 的話，瀏覽器不會裝新 SW，
 * 舊 SW 快取＋GitHub Pages 的 Cache-Control: max-age=14400 會讓手機繼續吃舊檔、
 * 刷新也好不了（2026-11-15 教訓：v22 從 sidebar-nav 那輪起連推四版都沒 bump，
 * v3.0.263.1 的 is-home 舊 CSS/JS 被快取住，刷新後大標題直接消失）。
 * bump 後：瀏覽器下次開站就會裝新 SW、刪掉舊快取，最多再刷新一次一定是新版。 */
const CACHE_NAME="chi-nav-main-v27";
const CORE_ASSETS=["./","./index.html","./css/nav.css","./js/utils.js","./js/data.js","./js/storage.js","./js/update.js","./js/search.js","./js/sidebar-nav.js","./js/sidebar-shell.js","./js/navigation.js","./js/render.js","./js/data/metadata.js","./js/app.js","./js/back-to-top.js","./js/theme.js","./chi-system/tokens.css","./chi-system/components.css","./chi-system/icon.js","./chi-system/theme.js","./chi-system/sidebar.js","./chi-system/tabs.js","./chi-system/dialog.js","./js/card-tooltip.js","./js/bootstrap.js","./data/data.json","./manifest.json","./bookmarks/","./bookmarks/index.html","./bookmarks/bookmarks.js","./bookmarks/bookmarks.css","./assets/icon/icon-bw.png","./assets/icon/icon-wb.png"];
const NETWORK_FIRST=["/","/index.html","/data/data.json","/manifest.json"];
const NETWORK_FIRST_EXTENSIONS=[".css",".js"];
const CACHE_FIRST_EXTENSIONS=[".svg",".png",".jpg",".jpeg",".webp",".ico",".woff",".woff2"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS.map(url=>new Request(url,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("chi-nav-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
async function networkFirst(request){try{const response=await fetch(request,{cache:"no-store"});if(response.ok){try{const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}catch{}return response}const cached=await caches.match(request);return cached||response}catch{const cached=await caches.match(request);if(cached)return cached;if(request.mode==="navigate"){const fallback=await caches.match("./index.html");if(fallback)return fallback}throw new Error("Network unavailable and no cached response")}}
async function cacheFirst(request){const cached=await caches.match(request);if(cached)return cached;try{const response=await fetch(request,{cache:"no-store"});if(response.ok){try{const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}catch{}}return response}catch{throw new Error("Resource unavailable")}}
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;const path=url.pathname;const isNetworkFirst=NETWORK_FIRST.some(item=>path===item||path.endsWith(item))||NETWORK_FIRST_EXTENSIONS.some(extension=>path.endsWith(extension));const isCacheFirst=!isNetworkFirst&&CACHE_FIRST_EXTENSIONS.some(extension=>path.endsWith(extension));if(isNetworkFirst){event.respondWith(networkFirst(event.request));return}if(isCacheFirst)event.respondWith(cacheFirst(event.request))});
