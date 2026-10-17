async function checkVersion(){
  try{
    const response=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`version.json HTTP ${response.status}`);
    const info=await response.json();
    if(!info?.version)return;
    const footer=document.querySelector('.site-footer');
    if(!footer)return;
    let label=document.getElementById('site-version');
    if(!label){
      label=document.createElement('span');
      label.id='site-version';
      label.className='site-version';
      footer.appendChild(document.createTextNode(' · '));
      footer.appendChild(label);
    }
    label.textContent=`v${info.version}`;
    label.title=info.message?`${info.date||''} · ${info.message}`:`${info.date||''}`;
    label.setAttribute('aria-label',`目前版本 v${info.version}`);
  }catch(error){
    console.warn('NAV version check failed:',error);
  }
}