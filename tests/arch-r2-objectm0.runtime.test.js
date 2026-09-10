
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'engine','object-m0-bridge.js'),'utf8');

const criteriaStart = source.indexOf('  const metadataMatchesMissionCriteria');
const criteriaEnd = source.indexOf('  const eventMissionMetadata', criteriaStart);
assert.ok(criteriaStart >= 0 && criteriaEnd > criteriaStart);


const context = {
  lower: v => String(v ?? '').trim().toLowerCase(),
  asArray: v => Array.isArray(v) ? v : v == null ? [] : [v],
  Missions: { ActionType:{OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze'}, normalizeActionType:v=>v },
  __criteria:null, __distinct:null
};
vm.createContext(context);
vm.runInContext(
  source.slice(criteriaStart, criteriaEnd)
    .replace(/\blower\(/g,'globalThis.lower(')
    .replace(/\basArray\(/g,'globalThis.asArray(') +
  '\nglobalThis.__criteria = metadataMatchesMissionCriteria;', context
);

test('ARCH-R2: ObjectM0 filtre bien microSceneId', () => {
  const metadata = { cuoType:'arch', microSceneId:'MSC-CUSTOM-SANCTUAIRE-RING', tags:[] };
  assert.equal(context.__criteria(metadata,{cuoType:'arch',microSceneId:'MSC-CUSTOM-SANCTUAIRE-RING'}),true);
  assert.equal(context.__criteria(metadata,{cuoType:'arch',microSceneId:'MSC-CUSTOM-RUINE-MODULAIRE2'}),false);
});
