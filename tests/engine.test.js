import test from 'node:test';
import assert from 'node:assert/strict';
import {search, tokenize} from '../engine.js';
import {evaluate} from './evaluate.js';

test('Chinese character + adjacent bigram tokenization', () => assert.deepEqual(tokenize('問卷？PDF'),['問','問卷','卷','pdf']));
test('conflicts preserve three dates and independent provenance', () => {
 const result=search('成果報告交付期限？');
 assert.equal(result.state,'conflict');
 assert.deepEqual(result.values.sort(), ['2026-08-28','2026-09-02','2026-09-04']);
 assert.equal(new Set(result.claimRows.map(x=>x.id)).size,3);
});
test('refuses weak and compound queries without leaking a claim', () => {
 for (const q of ['個資保存年限多久？','動畫製作軟體價格？','問卷及成果報告交付期限？','']) {
  const r=search(q);
  assert.equal(r.state,'unknown',q); assert.equal(r.claimRows.length,0);
 }
});
test('every claim text is an original quote, and repeated retrieval is stable', () => {
 const r=search('問卷滿意度是多少？');
 assert.match(r.claimRows[0].text,/89\.1%/); assert.deepEqual(r,search('問卷滿意度是多少？'));
});
test('fixture routing/evidence quality is reported, not averaged over unknown evidence', ()=>{
 const r=evaluate();
 assert.equal(r.total,12);
 assert.equal(r.routing,12,JSON.stringify(r.rows.filter(x=>!x.statePass)));
 assert.equal(r.evidence,9,JSON.stringify(r.rows.filter(x=>x.evidencePass===false)));
});
