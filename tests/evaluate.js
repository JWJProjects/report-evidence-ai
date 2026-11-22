import {cases} from './cases.js';
import {search,stats} from '../engine.js';
export function evaluate() {
 const rows=cases.map(([query,expected,...gold])=>{
  const r=search(query), top=r.claimRows.slice(0,3).map(r=>r.key);
  return {query,expected,actual:r.state, gold, top, statePass:r.state===expected,
   evidencePass:gold.length ? gold.every(id=>top.includes(id)) : null};
 });
 const relevant=rows.filter(r=>r.evidencePass!==null);
 return {stats,total:rows.length,routing:rows.filter(r=>r.statePass).length,evidenceTotal:relevant.length,evidence:relevant.filter(r=>r.evidencePass).length,rows};
}
if(typeof process!=='undefined'&&process.argv[1]?.endsWith('/evaluate.js')) console.log(JSON.stringify(evaluate(),null,2));
