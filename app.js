import {templates,statuses,transitions,initial,edit,move,toJSON} from './workflow.js';
import {createEngine} from './engine.js';
import {aggregateSource} from './import-evidence.js';
import {evaluate} from './tests/evaluate.js';
const $=selector=>document.querySelector(selector);
const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='aj-portfolio-v1:';
const views={report:['▤','成果審核'],evidence:['⌕','證據檢索'],sources:['◫','來源文件'],quality:['▥','驗證紀錄']};
const dateFmt=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const qs=new URLSearchParams(location.search);
let current=Object.prototype.hasOwnProperty.call(templates,qs.get('template'))?qs.get('template'):'education';
let view=Object.prototype.hasOwnProperty.call(views,qs.get('tab'))?qs.get('tab'):'report';
let query=qs.get('q')||templates[current].demos[0][0];
let msg='',hasError=false, storageError=false;
const records={};
function load(id){
 if (records[id]) return records[id];
 try {
  const stored=JSON.parse(localStorage.getItem(key+id)??'null');
  if (stored?.template===id&&Object.prototype.hasOwnProperty.call(statuses,stored.status)&&Array.isArray(stored.events)&&typeof stored.fields==='object') {
   stored.sources=Array.isArray(stored.sources)?stored.sources:[];
   records[id]=stored; return stored;
  }
 }catch{storageError=true;}
 return records[id]={...initial(id),sources:[]};
}
function save(next){
 records[current]=next;
 try {localStorage.setItem(key+current,JSON.stringify(next));}catch{storageError=true;}
}
const docList=()=>[...templates[current].corpus,...load(current).sources];
const stateText={answer:'已找到可引用的原文',conflict:'同一問題出現多個日期',unknown:'現有文件沒有足夠證據'};
const descriptions={answer:'以下是文件摘錄，不是模型補寫的結論。',conflict:'保留各來源，不自動決定哪一個日期有效。此結果交由審核人判讀。',unknown:'不替文件補答案。請補佐證、確認問法，或將複合問題拆開再找。'};
function sourceButton(id,text,section=''){
 return '<button type="button" class="src-link" data-doc="'+esc(id)+'" data-section="'+esc(section)+'">'+esc(text)+'</button>';
}
function highlight(text,tokens){
 const match=[...new Set(tokens)].filter(t=>t.length>1).sort((a,b)=>b.length-a.length);
 if(!match.length) return esc(text);
 const re=new RegExp(match.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'giu');
 let out='',end=0;
 for (const m of text.matchAll(re)){
  out+=esc(text.slice(end,m.index))+'<mark>'+esc(m[0])+'</mark>';end=m.index+m[0].length;
 }
 return out+esc(text.slice(end));
}
function drawHero(record,t){
 const now=record.status==='returned'?'draft':record.status;
 const stageIndex=t.stages.findIndex(([id])=>id===now);
 const date=record.events[record.events.length-1]?.time;
 return '<section class="hero"><div class="hero-title"><div><p class="file-kicker">案號 <span class="id-data">'+esc(t.series)+'</span> ・ 卷宗版本 <span class="id-data">1.0</span></p><h1>'+esc(t.project)+'</h1><p class="folio">'+esc(t.name)+' ・ '+esc(t.tag)+'</p></div><span class="status" data-state="'+esc(record.status)+'"><b>目前狀態</b>'+statuses[record.status]+(date?'<small>'+esc(dateFmt.format(new Date(date)).split(' ')[0])+'</small>':'')+'</span></div>'+
     '<ol class="steps" aria-label="流程進度">'+t.stages.map(([id,label],i)=>'<li class="step '+(i===stageIndex?(record.status==='returned'?'returned':'active'):i<stageIndex?'done':'')+'" '+(i===stageIndex?'aria-current="step"':'')+'><span>'+esc(i===stageIndex&&record.status==='returned'?'退回補正':label)+'</span></li>').join('')+'</ol></section>';
}
function drawEvidence(t,engine){
 const r=engine.search(query);
 const quote=hit=>'<article class="'+(r.state==='conflict'?'conflict-card':'')+'"><div class="src-row"><strong class="source-title">'+esc(hit.title)+'</strong><span class="source-meta">'+esc(hit.section+' · '+hit.version+' · '+hit.date+' · '+hit.kind)+'</span>'+
  sourceButton(hit.id,'查閱原文',hit.section)+'</div><p>'+highlight(hit.text,r.highlight)+'</p></article>';
 return {
  paper:'<section class="card query-box"><h2>從文件找答案</h2><p class="subtext">以中文詞彙比對並排序，回傳可回查的原文；不生成答案。</p><form class="query-form" id="ask"><input class="text" type="search" name="question" aria-label="輸入問題" maxlength="180" placeholder="例如：驗收要哪些附件？" value="'+esc(query)+'" required><button class="primary">找證據</button></form><div class="pills">'+t.demos.map(([q,caption])=>'<button type="button" class="pill" title="'+esc(caption)+'" aria-pressed="'+(q===query)+'" data-query="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div></section>'+
   '<section class="card" aria-label="證據結果" aria-live="polite"><div class="outcome '+r.state+'"><span class="symbol" aria-hidden="true">'+({answer:'✓',conflict:'!',unknown:'?'})[r.state]+'</span><div><strong>'+stateText[r.state]+'</strong><p>'+descriptions[r.state]+'</p></div></div>'+
   (r.state==='conflict'?'<div class="value-list" aria-label="文件中的日期">'+r.values.slice().sort().map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>':'')+
   (r.claimRows.length?'<div class="hits '+(r.state==='conflict'?'compare':'')+'">'+r.claimRows.map(quote).join('')+'</div>':'<div class="callout">這份報告不應把「還沒找到」當成「不存在」。如果有具體文件，可在「來源文件」新增佐證再查一次。</div>')+'</section>',
  margin:'<section class="card marginal"><p class="sidebar-label">索引附註</p><h2>段落相關度</h2><p class="subtext">排序分數，不等於可信度或答案機率。</p>'+
   (r.ranked.length?'<ol class="ranked">'+r.ranked.map((h,i)=>'<li><div class="bar-head">'+sourceButton(h.id,h.title,h.section)+'<b>'+h.score.toFixed(1)+'</b></div><span class="source-meta">'+esc(String(i+1).padStart(2,'0')+' · '+h.section+' · '+h.version)+'</span></li>').join('')+'</ol>':'<p class="help">沒有達到最低字詞命中的段落。</p>')+'</section>'
 };
}
function drawLog(events,limit=8){
 return '<ol class="log">'+events.slice(-limit).reverse().map(ev=>'<li><strong>'+esc(ev.action)+'</strong><span class="source-meta">'+esc((ev.from?statuses[ev.from]+' → ':'')+statuses[ev.to]+' · '+ev.role+' · '+dateFmt.format(new Date(ev.time)))+'</span>'+(ev.note?'<p>'+esc(ev.note)+'</p>':'')+'</li>').join('')+'</ol>';
}
function drawReport(record,t){
 const editable=['draft','returned'].includes(record.status), links=transitions[record.status];
 const fieldHTML=t.fields.map(([id,label,,kind])=>'<label class="field">'+esc(label)+(editable?' <span class="help">必填</span>':'')+(kind==='textarea'?'<textarea name="'+esc(id)+'" rows="3" maxlength="1500" '+(editable?'required':'disabled')+'>'+esc(record.fields[id])+'</textarea>':'<input class="text" '+(kind==='number'?'inputmode="numeric" pattern="[0-9]+"':'')+' name="'+esc(id)+'" value="'+esc(record.fields[id])+'" maxlength="1500" '+(editable?'required':'disabled')+'>')+'</label>').join('');
 const publicSheet='<section class="card public-sheet"><p class="sidebar-label">卷宗副本 ・ 對外欄位</p><h2>公開版預覽</h2><p class="subtext">僅顯示欄位白名單。</p><dl class="preview">'+t.fields.map(([id,label])=>'<div><dt>'+esc(label)+'</dt><dd>'+(t.publicFields.includes(id)?esc(record.fields[id]):'<span class="redacted">不公開</span>')+'</dd></div>').join('')+
  '<div><dt>審查意見與原始佐證</dt><dd><span class="redacted">不公開</span></dd></div></dl></section>';
 const latestReturn=record.events.slice().reverse().find(x=>x.to==='returned');
 const recentNote=record.status==='returned'&&latestReturn?.note ? '<div class="callout review-note"><strong>請補正</strong><p class="document-copy">'+esc(latestReturn.note)+'</p></div>' : '';
 return {
  paper:'<section class="card"><h2>成果填報單</h2><p class="subtext">'+(editable?'填寫示範欄位，送出後欄位鎖定，退回時可補正。':'這個階段只能檢閱內容。審查期間可退回補正。')+'</p>'+recentNote+'<form id="report"><div class="fields">'+fieldHTML+
  (record.status==='review'?'<label class="field review-note wide">審查意見<textarea name="note" rows="2" maxlength="800" placeholder="退回時必填，例如：請補兩張活動照片"></textarea></label>':'')+'</div><div class="actions">'+
   Object.entries(links).map(([id,[,label,role]])=>'<button class="'+(id==='return'?'warn':'primary')+'" name="move" value="'+id+'" title="模擬角色：'+esc(role)+'">'+esc(label)+'</button>').join('')+
   (editable?'<button class="quiet" name="move" value="save">儲存草稿</button>':'')+
   '<button type="button" class="quiet" id="download">匯出 JSON</button><button type="button" class="quiet" data-view="evidence">檢查佐證 →</button></div></form>'+
   '<p class="cc">角色為流程示意，非登入權限。發布僅更新本機示範狀態。</p><p role="status" tabindex="-1" class="notice '+(hasError?'error':'')+'">'+esc(msg)+'</p></section>',
  margin:'<div class="stack">'+(record.status==='published'?publicSheet:'')+
   '<section class="card marginal"><p class="sidebar-label">頁邊批註</p><h2>審核軌跡</h2><p class="subtext">每筆記錄含角色、時間、原狀態與新狀態。</p>'+drawLog(record.events)+'</section>'+
   (record.status==='published'?'':'<section class="card marginal"><h2>佐證材料</h2><p class="subtext">目前有 '+docList().length+' 份文件可回查；摘要不取代原文。</p><div class="actions"><button type="button" class="quiet" data-view="sources">查看文件 →</button></div></section>')+'</div>'
 };
}
function drawSources(docs,record){
 const editable=['draft','returned'].includes(record.status);
 return {
  paper:'<section class="card"><h2>來源清單</h2><p class="subtext">每份文件有版本、日期與段落，點開可閱讀原文。</p><div class="file-list">'+docs.map(d=>'<button type="button" class="quiet" data-doc="'+esc(d.id)+'"><b aria-hidden="true">'+esc(d.icon)+'</b> '+esc(d.title)+'<br><span class="source-meta">'+esc(d.kind+' · '+d.date+' · '+d.version+' · '+d.paragraphs.length+' 段')+'</span></button>').join('')+'</div></section>',
  margin:'<section class="card marginal source-editor"><p class="sidebar-label">卷宗增補</p><h2>補充文字佐證</h2><p class="subtext">將合成範例或已脫敏的原文貼進來，儲存後重新建立檢索索引。</p>'+
   (editable?'<form id="source-add" class="fields"><label class="field">文件標題<input required maxlength="80" class="text" name="title"></label><label class="field">原文段落<textarea required maxlength="1500" rows="4" name="body"></textarea></label><button class="primary">新增到本機佐證</button></form><form id="source-import" class="fields"><label class="field">匯入品管摘要（JSON，不含原始列）<input type="file" name="file" accept=".json,application/json" required></label><button class="quiet">匯入彙總，建立佐證</button></form>':'<p class="callout">只在草稿或退回補正階段可新增佐證。</p>')+
   '<p role="status" tabindex="-1" class="notice '+(hasError?'error':'')+'">'+esc(msg)+'</p></section>'
 };
}
function drawQuality(){
 const e=evaluate();
 return '<section class="card"><h2>可重跑的檢索驗證</h2><p class="subtext">固定教育活動合成集。原文 Top-3 只計有標註原文的題目；不把拒答當成找對證據。</p><div class="score-grid"><div><b>'+e.routing+'/'+e.total+'</b><span>狀態判定正確</span></div><div><b>'+e.evidence+'/'+e.evidenceTotal+'</b><span>必需證據皆在前三</span></div><div><b>'+e.stats.docs+'/'+e.stats.passages+'</b><span>文件／段落</span></div></div>'+
 '<ul class="eval-list">'+e.rows.map(row=>'<li>'+esc(row.query)+' <small>'+((row.statePass&&row.evidencePass!==false)?'通過':'未通過')+'</small></li>').join('')+'</ul><p class="cc">手工小測試，不代表正式驗收或生產準確率；測試題與評估程式隨原始碼附上。</p></section>';
}
function render(){
 const t=templates[current],r=load(current),docs=docList(),engine=createEngine(docs);
 const items=Object.entries(views);
 $('#template').value=current;
 $('#sidebar-project').innerHTML='<div class="project"><span>'+esc(t.series)+'</span><span>'+esc(t.project)+'</span></div>';
 $('#nav').innerHTML=items.map(([id,[,label]],i)=>'<button type="button" class="nav-btn" data-view="'+id+'" '+(id===view?'aria-current="page"':'')+'><span aria-hidden="true">0'+(i+1)+'</span>'+label+'</button>').join('');
 const picker=$('#view-picker');
 if(!picker.options.length)picker.innerHTML=items.map(([id,[,label]])=>'<option value="'+id+'">'+label+'</option>').join('');
 picker.value=view;
 $('#index-summary').innerHTML='<p class="guide-nums"><strong>'+engine.stats.docs+'</strong> 索引文件<br><strong>'+engine.stats.passages+'</strong> 可回查段落</p>';
 const contents=({report:()=>drawReport(r,t),evidence:()=>drawEvidence(t,engine),sources:()=>drawSources(docs,r),quality:()=>({paper:drawQuality(),margin:'<section class="card marginal"><p class="sidebar-label">驗證附註</p><h2>資料範圍</h2><p class="subtext">使用固定的合成集核對檢索行為。發現衝突或缺乏資料時，仍由審核人判讀。</p></section>'})})[view]();
 $('#main').innerHTML='<div class="case-layout"><div class="paper">'+drawHero(r,t)+'<div class="paper-body"><div class="reading">'+
  (storageError?'<p class="callout">此瀏覽器無法持續保存目前變更；請以匯出檔保留紀錄。</p>':'')+contents.paper+
  '</div></div></div>'+contents.margin+'</div>';
}
let sourceOpener=null;
function showDoc(id,section,opener){
 const doc=docList().find(d=>d.id===id);
 if (!doc) return;
 const tokens=(section&&view==='evidence')?createEngine(docList()).search(query).highlight:[];
 $('#source-detail').innerHTML='<div class="dialog-heading"><p class="sidebar-label">卷內原文</p><h2 id="source-title">'+esc(doc.title)+'</h2><span class="source-meta">'+esc(doc.kind+' · '+doc.version+' · '+doc.date)+'</span></div>'+
 doc.paragraphs.map(([seg,txt])=>'<section '+(seg===section?'class="selected"':'')+'><b class="source-meta">'+esc(seg)+'</b><p>'+(seg===section?highlight(txt,tokens):esc(txt))+'</p></section>').join('');
 const dialog=$('#source-dialog');
 sourceOpener=opener;
 dialog.showModal();
 const target=dialog.querySelector('.selected');
 if(target)target.scrollIntoView({block:'nearest'});
}
const sourceDialog=$('#source-dialog');
sourceDialog.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&sourceDialog.open){e.preventDefault();sourceDialog.close();}
});
sourceDialog.addEventListener('close',()=>{
 if(sourceOpener?.isConnected)sourceOpener.focus({preventScroll:true});
 sourceOpener=null;
});
$('#template').addEventListener('change',e=>{current=e.target.value;query=templates[current].demos[0][0];msg='';hasError=false;render();});
$('#view-picker').addEventListener('change',e=>{view=e.target.value;msg='';hasError=false;render();$('#main').focus();});
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');
 if(!btn) return;
 if(btn.dataset.view){view=btn.dataset.view;msg='';hasError=false;render();(btn.closest('#nav')?$('#nav button[aria-current]'):$('#main')).focus();}
 else if(btn.dataset.query){query=btn.dataset.query;render();$('.pill[aria-pressed=true]').focus();}
 else if(btn.dataset.doc) showDoc(btn.dataset.doc,btn.dataset.section,btn);
 else if(btn.id==='download'){
  const r=load(current);
  const url=URL.createObjectURL(new Blob([toJSON(r)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='anji-'+current+'-'+r.status+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(!['ask','report','source-add','source-import'].includes(f.id)) return;
 e.preventDefault();
 const data=Object.fromEntries(new FormData(f)); const r=load(current);
 hasError=false;msg='';
 try {
  if(f.id==='ask'){query=String(data.question).trim();render();$('#ask input').focus();return;}
  if(f.id==='report'){
   const action=e.submitter?.value||'save';
   const updated=['draft','returned'].includes(r.status)?edit(r,data):r;
   if(action==='save') save(updated); else save(move(updated,action,data.note||''));
   msg=action==='save'?'草稿已儲存。':'狀態已更新。';
  }else{
   if(!['draft','returned'].includes(r.status)) throw new Error('目前不可增補佐證');
   if(r.sources.length>=20) throw new Error('本機示範每模板最多新增 20 份佐證');
   let doc;
   if(f.id==='source-import'){
    if(data.file.size>4096) throw new Error('摘要檔超過 4 KB');
    const selected=current,raw=await data.file.text();
    if(selected!==current || load(current)!==r) throw new Error('工作區已變更，請重新選擇摘要檔');
    doc=aggregateSource(raw,current);
   }else{
    const title=data.title.trim().slice(0,80),body=data.body.trim().slice(0,1500);
    if(!title||!body) throw new Error('請輸入標題及原文');
    doc={id:'local-'+Date.now(),icon:'◇',kind:'補充文字',title,date:new Date().toISOString().slice(0,10),version:'v1.0',paragraphs:[['§ 1.1',body]]};
   }
   save({...r,sources:[...r.sources,doc],events:[...r.events,{action:'新增佐證',from:r.status,to:r.status,role:'填報人',time:new Date().toISOString(),note:doc.title}]}); msg='文件已新增，可到證據檢索查詢。';
  }
 }catch(error){hasError=true;msg=error.message;const n=$('.notice');if(n){n.textContent=msg;n.classList.add('error');}if(f.id==='report'&&e.submitter?.value==='return')$("#report [name=note]")?.focus();else n?.focus();return;}
 render();
 $('.notice')?.focus();
});
render();
