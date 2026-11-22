import {corpus,demos} from './corpus.js';

const stages = [
 ['draft','草稿'],['review','審查中'],['approved','已核准'],['published','已發布']
];
export const templates={
 education:{
  name:'教育活動成果', project:'夏夜展演與地方學習計畫', series:'EDU / 01', tag:'活動評估',
  fields:[
   ['target','服務對象','地方創作者、社區民眾與志工','text'],
   ['sessions','實施場次','5','number'],
   ['metric','主要成果指標','現場問卷滿意度、有效回覆數','text'],
   ['summary','成果摘要','透過市集與晚間演出蒐集參與回饋，成果報告須同步提交佐證附件。','textarea'],
  ], publicFields:['target','sessions','metric','summary'], stages, corpus,demos: demos.map(({label,sub})=>[label,sub])
 },
 policy:{
  name:'施政計畫成果', project:'溪畔慢行改善計畫', series:'POL / 02', tag:'跨單位管考',
  fields:[
   ['unit','主責單位','示範市公共空間組','text'],
   ['period','填報期別','2026 第 3 季','text'],
   ['completion','工程成果（公尺）','320','number'],
   ['summary','執行與風險摘要','完成首批慢行標線與雨水設施巡查；第二階段排程仍待確認。','textarea'],
  ], publicFields:['period','completion','summary'], stages,
  corpus:[
   {id:'walk',icon:'◈',kind:'執行計畫', title:'第一期慢行改善｜執行計畫',date:'2026-06-10',version:'v1.1',paragraphs:[
    ['§ 2.1','本期工程目標為改善 320 公尺慢行空間，並重新標示兩處行人穿越點。'],
    ['§ 3.1','第一期成果報告交付期限為 2026-09-10，須附改善前後照片及巡檢紀錄。']]},
   {id:'audit',icon:'◉',kind:'現勘紀錄',title:'溪畔慢行｜現場抽查紀錄',date:'2026-08-04',version:'v1.0',paragraphs:[
    ['§ 1.2','成果報告驗收須檢附改善前後照片、里程實測紀錄以及雨水孔蓋巡檢表。'],
    ['§ 2.3','實測完工長度為 320 公尺；入口標示的位置仍待巡檢小組確認。']]},
   {id:'fund',icon:'▤',kind:'收支摘要',title:'慢行改善｜支出表',date:'2026-08-08',version:'v1.0',paragraphs:[
    ['§ 1.1','工程實際支出為 286,400 元，包含標線、標示牌與現場管制作業。'],
    ['§ 1.3','雨水孔蓋工程不在第一期支出清單範圍。']]},
  ],
  demos:[
   ['驗收要哪些附件？','核對照片與巡檢表'],
   ['成果報告交付期限？','查找第一期交付日'],
   ['工程實際支出多少？','核對支出與範圍'],
   ['承攬人保險金額？','辨認資料缺口']
  ]
 }
};
export const statuses={draft:'草稿',review:'審查中',returned:'已退回',approved:'已核准',published:'已發布'};
export const transitions={
 draft:{submit:['review','送交審查','填報人']},
 review:{return:['returned','退回補正','審核人'],approve:['approved','核准成果','審核人']},
 returned:{submit:['review','補正後再送審','填報人']},
 approved:{publish:['published','發布示範版本','發布人']},
 published:{}
};
export function initial(id){
 const t=templates[id];
 if(!t) throw new Error('找不到模板');
 return {template:id,status:'draft',fields:Object.fromEntries(t.fields.map(([key,,defaultValue])=>[key,defaultValue])),
  events:[{action:'建立示範草稿',from:null,to:'draft',role:'填報人',time:'2026-08-18T09:00:00+08:00',note:'依模板初始化填報欄位'}]};
}
export function edit(record,newFields){
 if(!['draft','returned'].includes(record.status)) throw new Error('此階段不可修改欄位');
 const template=templates[record.template];
 const fields=Object.fromEntries(template.fields.map(([key,label,,type])=>{
  const val=String(newFields[key]??'').trim().slice(0,1500);
  if(!val || (type==='number' && (!/^\d+$/.test(val) || !Number.isSafeInteger(Number(val))))) throw new Error('請檢查「'+label+'」欄位');
  return [key,val];
 }));
 return {...record, fields};
}
export function move(record,key,note='',now=new Date().toISOString()){
 const next=transitions[record.status]?.[key];
 if(!next) throw new Error('此階段不能執行此動作');
 if(key==='submit') edit(record,record.fields);
 note=note.trim().slice(0,800);
 if(key==='return'&&!note) throw new Error('退回前請輸入補正原因');
 const [to,action,role]=next;
 return {...record,status:to,events:[...record.events,{action,from:record.status,to,role,time:now,note}]};
}
export function toJSON(record) {
 return JSON.stringify({schemaVersion:1,synthetic:true,project:templates[record.template].project,
 templateFields:templates[record.template].fields.map(([id,label,,,])=>({id,label})),...record},null,2);
}
