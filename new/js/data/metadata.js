const NAVMetadata=(()=>{
  function buildTags(link,taxonomy,term){
    const text=`${link.title||''} ${link.description||''}`.toLowerCase();
    const tags=new Set([taxonomy,term]);
    const rules=[['AI',['ai','人工智慧','助手','生成']],['搜尋',['搜尋','search','google']],['翻譯',['翻譯','translate']],['PDF',['pdf']],['圖片',['圖片','photo','image','設計','canva','pinterest']],['影音',['影片','影音','動畫','串流','直播','youtube','bilibili','twitch']],['音樂',['音樂','audio','spotify','music']],['文件',['文件','文字','筆記','notion']],['檔案',['檔案','file','雲端','儲存','分享']],['轉換',['轉換','convert']],['開發',['程式碼','開發','github','cloudflare','oracle']],['iOS',['ios','iphone','apptesters']],['資安',['資安','安全','病毒','pwned','cyberchef']],['工具',['工具']],['遊戲',['遊戲','drops']],['漫畫',['漫畫','bangumi']],['小說',['小說']],['社群',['社群','交流']],['購物',['購物','淘寶','momo']],['設計',['設計','白板','繪圖']],['音訊',['音訊','人聲','伴奏']],['影片',['影片','剪輯']],['雲端',['雲端','主機','vps']],['個人服務',['個人服務']]];
    rules.forEach(([tag,words])=>{if(words.some(w=>text.includes(w)))tags.add(tag)});
    link.tags=[...tags].filter(Boolean);
    return link.tags;
  }
  function applyTags(data){
    data.forEach(s=>{
      if(s.links)s.links.forEach(l=>{l._taxonomy=s.taxonomy;l._term='常用';buildTags(l,s.taxonomy,'常用')});
      else(s.list||[]).forEach(group=>group.links?.forEach(l=>{l._taxonomy=s.taxonomy;l._term=group.term;buildTags(l,s.taxonomy,group.term)}));
    });
  }
  function buildMetadata(link){
    let domain='';
    try{domain=new URL(link.url).hostname.replace(/^www\./,'')}catch{}
    link.metadata={domain,type:'website',taxonomy:link._taxonomy||'',subcategory:link._term||'',tags:Array.isArray(link.tags)?[...link.tags]:[],status:'unverified'};
    return link.metadata;
  }
  function applyMetadata(data){
    data.forEach(s=>{
      if(s.links)s.links.forEach(buildMetadata);
      else(s.list||[]).forEach(group=>group.links?.forEach(buildMetadata));
    });
  }
  return Object.freeze({buildTags,applyTags,buildMetadata,applyMetadata});
})();
