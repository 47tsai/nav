const TRACKING_PARAMS=/^(utm_[a-z0-9_]+|fbclid|gclid|dclid|msclkid|_gl|mc_cid|mc_eid)$/i;

function norm(u){try{const x=new URL(u,location.href);x.hash='';x.hostname=x.hostname.toLowerCase();x.pathname=x.pathname.replace(/\/{2,}/g,'/').replace(/\/$/,'')||'/';for(const key of [...x.searchParams.keys()])if(TRACKING_PARAMS.test(key))x.searchParams.delete(key);const params=[...x.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b));x.search='';for(const [key,value] of params)x.searchParams.append(key,value);return x.toString()}catch{return String(u||'')}}
function key(l){return norm(l.url)}
function esc(v=''){return String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]))}
