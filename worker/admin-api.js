const JSON_HEADERS = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const ALLOWED_ORIGINS = new Set(["https://nav.chi.qzz.io"]);
function reply(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...extra}})}
function corsHeaders(origin){if(!origin||!ALLOWED_ORIGINS.has(origin))return{};return{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type, If-Match","Access-Control-Max-Age":"600","Vary":"Origin"}}
function withCors(response,origin){const headers=new Headers(response.headers);Object.entries(corsHeaders(origin)).forEach(([k,v])=>headers.set(k,v));return new Response(response.body,{status:response.status,headers})}
function normalizeUrl(value){try{const u=new URL(String(value||"").trim());if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return null;return u.href}catch{return null}}
function validateDataset(data){if(!Array.isArray(data))throw new Error("網站資料必須是陣列。");let count=0;for(const section of data){if(!section||typeof section!=="object"||typeof section.taxonomy!=="string"||!section.taxonomy.trim())throw new Error("每個主要分類都必須有名稱。");const groups=Array.isArray(section.list)?section.list:[section];for(const group of groups){if(!group||typeof group!=="object"||!Array.isArray(group.links))throw new Error("分類的 links 格式不正確。");for(const link of group.links){if(!link||typeof link.title!=="string"||!link.title.trim()||link.title.length>80)throw new Error("網站名稱必須為 1 到 80 個字元。");if(typeof(link.description||"")!=="string"||(link.description||"").length>240)throw new Error("網站描述不得超過 240 個字元。");if(!normalizeUrl(link.url))throw new Error("網站網址格式不正確，只接受 HTTP 或 HTTPS。");count++}}}return{count,categories:data.length}}
async function authenticate(request,env){const m=(request.headers.get("Authorization")||"").match(/^Bearer ([A-Za-z0-9_-]{40,80})$/);if(!m)return{ok:false,status:401,error:"請先使用 Chi Auth 登入。"};if(!env.CHI_AUTH_CLIENT_ID)return{ok:false,status:503,error:"後端尚未設定 Chi Auth Client ID。"};const r=await fetch("https://auth.chi.qzz.io/api/userinfo?client_id="+encodeURIComponent(env.CHI_AUTH_CLIENT_ID),{headers:{Authorization:"Bearer "+m[1],Accept:"application/json"},cache:"no-store"});if(!r.ok)return{ok:false,status:401,error:"Chi Auth Token 無效或已過期。"};const user=await r.json().catch(()=>null);if(!user||user.sub!=="chi-owner"||user.aud!==env.CHI_AUTH_CLIENT_ID)return{ok:false,status:403,error:"此帳號沒有 NAV 管理權限。"};return{ok:true,subject:user.sub}}
async function githubRequest(env,path,init={}){const r=await fetch("https://api.github.com"+path,{...init,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+env.NAV_GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"Chi-NAV-Admin",...(init.headers||{})}});const t=await r.text();let data=null;try{data=t?JSON.parse(t):null}catch{data={message:t.slice(0,300)}}return{response:r,data}}
async function readData(env){const path="/repos/"+env.GITHUB_REPOSITORY+"/contents/data/data.json?ref="+encodeURIComponent(env.GITHUB_BRANCH||"main");const{response,data}=await githubRequest(env,path);if(!response.ok)throw new Error("GitHub 讀取失敗（HTTP "+response.status+"）。");if(!data||data.type!=="file"||!data.content)throw new Error("GitHub 回傳的網站資料格式不正確。");const binary=atob(data.content.replace(/\n/g,""));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const json=JSON.parse(new TextDecoder().decode(bytes));validateDataset(json);return{data:json,sha:data.sha}}
async function writeData(env,data,message,expectedSha){const validated=validateDataset(data);const current=await readData(env);if(expectedSha&&expectedSha!==current.sha)return{conflict:true};const path="/repos/"+env.GITHUB_REPOSITORY+"/contents/data/data.json";const bytes=new TextEncoder().encode(JSON.stringify(data,null,2)+"\n");let binary="";for(const b of bytes)binary+=String.fromCharCode(b);const encoded=btoa(binary);const{response,data:result}=await githubRequest(env,path,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:message.slice(0,120),content:encoded,sha:current.sha,branch:env.GITHUB_BRANCH||"main"})});if(response.status===409||response.status===422)return{conflict:true};if(!response.ok)throw new Error("GitHub 寫入失敗（HTTP "+response.status+"）。");return{ok:true,sha:result.content?.sha||null,commit:result.commit?.sha||null,...validated}}
function locateLink(data,id){for(let si=0;si<data.length;si++){const section=data[si],groups=Array.isArray(section.list)?section.list:[section];for(let gi=0;gi<groups.length;gi++){const group=groups[gi],li=group.links.findIndex(link=>link.id===id);if(li>=0)return{group,link:group.links[li],linkIndex:li}}}return null}
function createId(){return"nav_"+crypto.randomUUID()}
function cleanSite(body){const title=String(body?.title||"").trim(),url=normalizeUrl(body?.url),description=String(body?.description||"").trim(),taxonomy=String(body?.taxonomy||"").trim(),subcategory=String(body?.subcategory||"").trim();if(!title||title.length>80)throw new Error("請輸入網站名稱（最多 80 字）。");if(!url)throw new Error("請輸入有效的 HTTP 或 HTTPS 網址。");if(description.length>240)throw new Error("描述不得超過 240 字。");if(!taxonomy||taxonomy.length>60)throw new Error("請選擇有效的分類。");return{title,url,description,taxonomy,subcategory}}
function findTarget(data,taxonomy,subcategory){const section=data.find(x=>x.taxonomy===taxonomy);if(!section)return null;if(!Array.isArray(section.list))return subcategory?null:section;if(!subcategory)return null;return section.list.find(x=>x.term===subcategory)||null}
function hasDuplicate(data,site){return data.some(section=>(Array.isArray(section.list)?section.list:[section]).some(group=>group.links.some(link=>link.title.trim().toLocaleLowerCase()===site.title.toLocaleLowerCase()&&normalizeUrl(link.url)===site.url)))}
async function route(request,env){
 const url=new URL(request.url);
 const path=url.pathname.replace(/\/+$/,"")||"/";
 const origin=request.headers.get("Origin");
 if(request.method==="OPTIONS"){
  if(!origin||!ALLOWED_ORIGINS.has(origin))return reply({error:"Origin not allowed."},403);
  return new Response(null,{status:204,headers:corsHeaders(origin)});
 }
 if(origin&&!ALLOWED_ORIGINS.has(origin))return reply({error:"Origin not allowed."},403);
 if(path==="/health"&&request.method==="GET")return reply({ok:true,service:"chi-nav-admin-api",version:1});
 if(!path.startsWith("/api/admin/"))return reply({error:"Not found."},404);
 if(!env.NAV_GITHUB_TOKEN)return reply({error:"後端尚未設定 GitHub 寫入 Token。"},503);
 const auth=await authenticate(request,env);
 if(!auth.ok)return reply({error:auth.error},auth.status);
 if(path==="/api/admin/session"&&request.method==="GET")return reply({ok:true,user:{sub:auth.subject,role:"admin"}});
 if(path==="/api/admin/migrate-ids"&&request.method==="POST"){
  try{
   const current=await readData(env);let changed=false;
   for(const section of current.data){const groups=Array.isArray(section.list)?section.list:[section];for(const group of groups){for(const link of group.links){if(!link.id){link.id=createId();changed=true}}}}
   if(!changed)return reply({ok:true,changed:false,message:"所有網站已經有穩定 ID。",sha:current.sha});
   const result=await writeData(env,current.data,"Admin: migrate stable site IDs",current.sha);
   if(result.conflict)return reply({error:"資料剛被其他操作更新，請重新載入後再試。"},409);
   return reply({ok:true,changed:true,count:result.count,sha:result.sha,commit:result.commit});
  }catch(e){return reply({error:e.message||"網站 ID 遷移失敗。"},502)}
 }
 if(path==="/api/admin/sites"&&request.method==="GET"){
  try{const current=await readData(env);return reply({ok:true,data:current.data,sha:current.sha,...validateDataset(current.data)})}
  catch(e){return reply({error:e.message||"無法讀取網站資料。"},502)}
 }
 if(path==="/api/admin/sites"&&request.method==="POST"){
  try{
   const site=cleanSite(await request.json()),current=await readData(env),target=findTarget(current.data,site.taxonomy,site.subcategory);
   if(!target)return reply({error:"找不到指定分類或子分類。"},400);
   if(hasDuplicate(current.data,site))return reply({error:"同名稱或同網址已存在。"},409);
   const id=createId();target.links.push({id,title:site.title,url:site.url,description:site.description});
   const result=await writeData(env,current.data,"Admin: add site "+site.title,current.sha);
   if(result.conflict)return reply({error:"資料剛被其他操作更新，請重新載入後再試。"},409);
   return reply({ok:true,site:{...site,id},sha:result.sha,commit:result.commit,count:result.count});
  }catch(e){return reply({error:e.message||"新增網站失敗。"},e.message?.startsWith("GitHub 寫入失敗")?502:400)}
 }
 const match=path.match(/^\/api\/admin\/sites\/([A-Za-z0-9_-]{1,100})$/);
 if(match&&["PUT","DELETE"].includes(request.method)){
  const id=match[1];
  try{
   const current=await readData(env),found=locateLink(current.data,id);
   if(!found)return reply({error:"找不到這個網站，請重新載入資料。"},404);
   let auditTitle=found.link.title;
   if(request.method==="DELETE"){found.group.links.splice(found.linkIndex,1)}
   else{
    const site=cleanSite(await request.json()),target=findTarget(current.data,site.taxonomy,site.subcategory);
    if(!target)return reply({error:"找不到指定分類或子分類。"},400);
    
    auditTitle=site.title;
    if(target!==found.group){found.group.links.splice(found.linkIndex,1);target.links.push({id,title:site.title,url:site.url,description:site.description})}
    else Object.assign(found.link,{title:site.title,url:site.url,description:site.description});
   }
   const result=await writeData(env,current.data,(request.method==="DELETE"?"Admin: delete site ":"Admin: update site ")+auditTitle,current.sha);
   if(result.conflict)return reply({error:"資料剛被其他操作更新，請重新載入後再試。"},409);
   return reply({ok:true,sha:result.sha,commit:result.commit,count:result.count});
  }catch(e){return reply({error:e.message||"網站資料更新失敗。"},e.message?.startsWith("GitHub 寫入失敗")?502:400)}
 }
 if(path==="/api/admin/categories"&&request.method==="GET"){
  try{
   const{data,sha}=await readData(env);
   const categories=data.map(section=>({taxonomy:section.taxonomy,icon:section.icon||"",subcategories:Array.isArray(section.list)?section.list.map(group=>group.term):[]}));
   return reply({ok:true,sha,categories});
  }catch(e){return reply({error:e.message||"無法讀取分類。"},502)}
 }
 return reply({error:"Method not allowed."},405);
}
export default{async fetch(request,env){try{return withCors(await route(request,env),request.headers.get("Origin"))}catch(e){console.error("Chi NAV Admin API error",e);return withCors(reply({error:"伺服器發生未預期錯誤。"},500),request.headers.get("Origin"))}}};
