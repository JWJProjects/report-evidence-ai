// Deliberately accept aggregate counts only, never source rows or untrusted free text.
const exact=(object,keys)=>object!==null && typeof object==='object' && !Array.isArray(object) &&
 Object.keys(object).length===keys.length && keys.every(k=>Object.prototype.hasOwnProperty.call(object,k));
export function aggregateSource(raw,template,now=new Date()){
 if(typeof raw!=='string'|| raw.length>4096) throw new Error('摘要檔超過 4 KB');
 let bundle;
 try{bundle=JSON.parse(raw);}catch{throw new Error('摘要檔不是有效的 JSON');}
 const keys=['totalRows','passedRows','reviewRows','rejectedRows'];
 if(!exact(bundle,['schema','profile','synthetic','result']) || bundle.schema!=='portfolio.qa-evidence.v1' || bundle.synthetic!==true ||
 !['education','policy'].includes(bundle.profile) || !exact(bundle.result,keys) ||
 !keys.every(k=>Number.isSafeInteger(bundle.result[k]) && bundle.result[k]>=0 && bundle.result[k]<=1000000)){
  throw new Error('只接受合成資料的資料品管彙總，不接受原始列、額外欄位或自由文字');
 }
 if(bundle.profile!==template) throw new Error('品管摘要與目前模板不符');
 const {totalRows,passedRows,reviewRows,rejectedRows}=bundle.result;
 if(totalRows!==passedRows+reviewRows+rejectedRows) throw new Error('品管摘要筆數合計不符');
 return {id:'qa-'+now.getTime(),icon:'▥',kind:'品管彙總',title:'資料匯入｜品管摘要',date:now.toISOString().slice(0,10),version:'v1.0',
  paragraphs:[['§ 1.1','資料品質檢查共 '+totalRows+' 筆，通過 '+passedRows+' 筆、待覆核 '+reviewRows+' 筆、退件 '+rejectedRows+' 筆。僅摘要，不含原始紀錄。']]};
}
