import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,edit,move,toJSON,templates} from '../workflow.js';
import {createEngine} from '../engine.js';

test('submit, return with reason, amend, approve, publish and export are auditable',()=>{
 let r=initial('education');
 assert.throws(()=>move(r,'approve'));
 r=move(r,'submit');
 assert.throws(()=>move(r,'return'));
 assert.throws(()=>edit(r,r.fields));
 r=move(r,'return','補上活動照片');
 r=edit(r,{...r.fields,sessions:'6'});
 r=move(move(move(r,'submit'),'approve'),'publish');
 assert.equal(r.status,'published');
 const exported=JSON.parse(toJSON(r));
 assert.equal(exported.fields.sessions,'6');
 assert.equal(exported.events[2].note,'補上活動照片');
 assert.equal(exported.events.length,6);
});
test('templates have different required fields and independent corpus indexes',()=>{
 const p=initial('policy');
 assert.throws(()=>edit(p,{...p.fields,completion:'abc'}));
 assert.equal('sessions' in p.fields,false);
 assert.equal(createEngine(templates.policy.corpus).search('成果報告交付期限？').state,'answer');
 assert.equal(createEngine(templates.education.corpus).search('成果報告交付期限？').state,'conflict');
});

import {aggregateSource} from '../import-evidence.js';
test('imports only synthetic allowlisted aggregate, checks totals and target template',()=>{
 const payload={schema:'portfolio.qa-evidence.v1',profile:'education',synthetic:true,result:{totalRows:6,passedRows:3,reviewRows:2,rejectedRows:1}};
 const doc=aggregateSource(JSON.stringify(payload),'education');
 assert.match(doc.paragraphs[0][1],/共 6 筆/);
 assert.throws(()=>aggregateSource(JSON.stringify(payload),'policy'));
 assert.throws(()=>aggregateSource(JSON.stringify({...payload,rawRows:['data']}),'education'));
 assert.throws(()=>aggregateSource(JSON.stringify({...payload,result:{...payload.result,totalRows:7}}),'education'));
 assert.throws(()=>aggregateSource(JSON.stringify({...payload,synthetic:false}),'education'));
});
