const FAV='chi-nav-favorites',REC='chi-nav-recent',REC_TIME='chi-nav-recent-time',LIMIT=8;

function loadStore(key){return load(key)}
function saveFavorites(items){save(FAV,items)}
function saveRecent(items){const next=items.slice(0,LIMIT);save(REC,next);const keep=new Set(next);const times=loadRecentTimes();let changed=false;for(const key of Object.keys(times)){if(!keep.has(key)){delete times[key];changed=true}}if(changed){try{localStorage.setItem(REC_TIME,JSON.stringify(times))}catch{}}}
function loadRecentTimes(){try{const x=JSON.parse(localStorage.getItem(REC_TIME)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{} }catch{return {}}}
function saveRecentTime(url){const times=loadRecentTimes();times[url]=Date.now();try{localStorage.setItem(REC_TIME,JSON.stringify(times))}catch{}}
function normalizeFavorites(items,map){return new Set([...items].map(norm).filter(k=>map.has(k)))}
function normalizeRecent(items,map){return [...new Set(items.map(norm).filter(k=>map.has(k)))].slice(0,LIMIT)}
function toggleFavorite(item,favorites){const k=key(item);if(favorites.has(k))favorites.delete(k);else favorites.add(k);saveFavorites([...favorites]);return favorites}
function reorderFavorites(favorites,fromKey,toKey){const items=[...favorites];const from=items.indexOf(fromKey),to=items.indexOf(toKey);if(from<0||to<0||from===to)return favorites;const [item]=items.splice(from,1);items.splice(to,0,item);saveFavorites(items);return new Set(items)}
function addRecent(item,recent){const k=key(item);const next=[k,...recent.filter(x=>x!==k)].slice(0,LIMIT);saveRecent(next);saveRecentTime(k);return next}
function getStoredFavorites(){return new Set(loadStore(FAV))}
function getStoredRecent(){return loadStore(REC)}
