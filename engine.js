import { corpus } from './corpus.js';

const stop = new Set(['的','嗎','呢','要','有','和','於','在','是','請','這','及','為','都','將','以','想','或','最','還','甚','麼','什','多','少','哪','些','多','久']);
const concepts = [
 {id:'deadline', tokens:['期限','截止','交付日','何時交','哪天交','時程'], cue:/成果報告/, extract:/\b\d{4}-\d{2}-\d{2}\b/g},
 {id:'attachments', tokens:['驗收','附件','檢附','附什麼','交哪些'], cue:/成果報告.*(?:附件|檢附)|驗收.*附件/},
 {id:'retention', tokens:['保存年限','保存多久','保留多久','保留幾年','個資','保留期間'], cue:/(?:保存|保留).{0,8}(?:年限|期間|天|月|年)/},
 {id:'survey', tokens:['滿意度','滿意率','問卷'], cue:/(?:滿意度|滿意率).*?[\d.]+%|有效回覆/},
 {id:'cost', tokens:['實際支出','花費','支出多少','總支出'], cue:/(?:支出|花費).*?[0-9,]+\s*元/},
 {id:'teardown', tokens:['撤場','拆場','點交','設備移交'], cue:/(?:撤場|點交)/},
];
const norm = (s) => s.normalize('NFKC').toLowerCase();
const han = /\p{Script=Han}/u;
export function tokenize(text) {
 return (norm(text).match(/\p{Script=Han}+|[a-z0-9]+/gu) || []).flatMap(word => {
  if (!han.test(word)) return [word];
  const chars=[...word];
  return chars.flatMap((char,i) => [...(!stop.has(char)?[char]:[]), ...(i < chars.length-1 && !stop.has(char) && !stop.has(chars[i+1]) ? [char+chars[i+1]]:[])]);
 });
}
export function createEngine(documents) {
const flat = documents.flatMap(({paragraphs,...source}) => paragraphs.map(([section,text], index) => {
 const terms=tokenize(text), freq={};
 for (const term of terms) freq[term]=(freq[term]||0)+1;
 return {...source,key:source.id+':'+(index+1),section,text,terms,freq};
}));
const avg=flat.reduce((sum,row)=>sum+row.terms.length,0)/flat.length;
const df={};
for (const row of flat) for (const term of new Set(row.terms)) df[term]=(df[term]||0)+1;
const stats = {docs:documents.length, passages:flat.length, tokens:Object.keys(df).length};

function search(raw) {
 const query=norm(raw.trim()).slice(0,180);
 const terms=[...new Set(tokenize(query))];
 const matches=concepts.filter(c=>c.tokens.some(w=>query.includes(w)));
 const multi=matches.length>1;
 const intent=matches.length===1?matches[0]:null;
 const targetTerms=terms.filter(term=>term.length>1 || !han.test(term));
 const ranking=flat.map(row=>{
  const hit=terms.filter(term=>row.freq[term]);
  const bm25=hit.reduce((sum,t)=>{
   const f=row.freq[t], n=df[t];
   return sum + Math.log(1+(flat.length-n+.5)/(n+.5))*(f*2.35)/(f+1.35*(.27+.73*row.terms.length/avg))*(t.length>1?2.1:.38);
  },0);
  const cues=(intent?.cue.test(row.text))===true;
  const fullHitCount=targetTerms.filter(t=>row.freq[t]).length;
  return {...row,score:bm25*(intent?(cues?1.46:.70):1),bm25,cues,hit,fullHitCount};
 }).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
 // For numeric conflicts, group dates quoted in passages actually found by the retriever.
 // Date overlap is not a claim about authority: a draft and a plan may all disagree.
 const candidates=ranking.filter(r=>r.bm25>=2.0 && r.fullHitCount>=1);
 const claimRows=intent ? candidates.filter(r=>r.cues && (intent.id!=='deadline' || r.text.match(intent.extract))) : candidates.filter(r=>r.fullHitCount>=2);
 const values=intent?.extract ? [...new Set(claimRows.flatMap(r=>r.text.match(intent.extract)||[]))] : [];
 const state=!multi&&claimRows.length>0 ? (values.length>1?'conflict':'answer'):'unknown';
 return {query,state,ranked:candidates.slice(0,5),claimRows:state==='unknown'?[]:claimRows.slice(0,5),values,highlight:targetTerms.length?targetTerms:terms,stats};
}

 return {search,stats};
}
export const {search,stats}=createEngine(corpus);
