function load(k){try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function save(k,x){try{localStorage.setItem(k,JSON.stringify(x))}catch{}}
function src(n){return data.find(x=>x.taxonomy===n)}
function flat(s){return s?(s.links?[...s.links]:(s.list||[]).flatMap(x=>x.links||[])):[]}
function uniq(a){const seen=new Set();return a.filter(l=>{const k=key(l);if(seen.has(k))return false;seen.add(k);return true})}
function tabData(g,t){const [label,source,term]=t,s=src(source);return uniq(s?.list?.find(group=>group.term===term)?.links||[])}
