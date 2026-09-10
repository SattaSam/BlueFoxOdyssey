const fs=require('fs'),assert=require('assert');
const B='/mnt/data/fau_r3_delivery/BASE', C='/mnt/data/fau_r3_delivery/CANDIDAT';
const br=fs.readFileSync(B+'/engine/fauna-runtime.js','utf8'), cr=fs.readFileSync(C+'/engine/fauna-runtime.js','utf8');
const bc=fs.readFileSync(B+'/data/bible-catalog.js','utf8'), cc=fs.readFileSync(C+'/data/bible-catalog.js','utf8');
function block(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,`${a} -> ${b}`);return s.slice(i,j)}
// Historical FAU 01..12 definitions remain byte-identical; R3 is appended after FAU12.
// The comparison above includes the inserted A-series; compare each historical mission individually instead.
for(let n=1;n<=12;n++){
 const id=String(n).padStart(2,'0'); const a=`  const FAU${id} =`;
 const next=n<12?`  const FAU${String(n+1).padStart(2,'0')} =`:'  const T04 =';
 const bb=block(bc,a,next); let cb=block(cc,a,next);
 if(n===12) cb=cb.slice(0,cb.indexOf('\n  const FAU01A ='))+'\n';
 assert.strictEqual(cb,bb,`FAU-${id} changed`);
}
// Critical R2 behavior producers are byte-identical.
for(const [a,b] of [
 ['  const updateToolUse =','  const isNight ='],
 ['  const emitCalmFacts =','  const updateObservedBehavior ='],
 ['  const updateObservedBehavior =','  const peacefulSceneMembers ='],
 ['  const updatePeacefulGroupObservation =','  const parentalYoungState ='],
 ['  const updateParentalProtection =','  const updateApproach ='],
 ['  const animateMovement =','  const update =']
]) assert.strictEqual(block(cr,a,b),block(br,a,b),a+' regressed');
// No new timer/polling introduced in modified files.
function count(s,re){return (s.match(re)||[]).length}
for(const f of ['engine/fauna-runtime.js','engine/settings-ui-bridge.js','engine/bible-runtime-v0-1-unified.js']){
 const b=fs.readFileSync(B+'/'+f,'utf8'),c=fs.readFileSync(C+'/'+f,'utf8');
 assert.strictEqual(count(c,/setInterval\s*\(/g),count(b,/setInterval\s*\(/g),f+' added setInterval');
}
assert(!cc.includes('GAME-contact_ambassador —')); // no repurposing of GAME-contact family
console.log('PASS fau-r3 static non-regression / no polling');
