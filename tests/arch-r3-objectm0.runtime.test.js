const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine','object-m0-bridge.js'),'utf8');
const start=source.indexOf('  const metadataMatchesMissionCriteria');
const end=source.indexOf('  const eventMissionMetadata',start);
assert.ok(start>=0&&end>start);
const context={
  lower:v=>String(v??'').trim().toLowerCase(),
  asArray:v=>Array.isArray(v)?v:v==null?[]:[v],
  __criteria:null
};
vm.createContext(context);
vm.runInContext(
  source.slice(start,end)
    .replace(/\blower\(/g,'globalThis.lower(')
    .replace(/\basArray\(/g,'globalThis.asArray(')+
  '\nglobalThis.__criteria=metadataMatchesMissionCriteria;',
  context
);

test('M0 cuoTypes: OR strict arch/stele/tech_relic',()=>{
  const params={cuoTypes:['arch','stele','tech_relic']};
  for(const cuoType of ['arch','stele','tech_relic']){
    assert.equal(context.__criteria({cuoType,tags:[]},params),true,cuoType);
  }
  for(const cuoType of ['tree','debris','ancient_machine_wreck','pulse_core']){
    assert.equal(context.__criteria({cuoType,tags:['evidence']},params),false,cuoType);
  }
});

test('M0 cuoTypes: normalisation et compatibilité cuoType existant',()=>{
  assert.equal(context.__criteria({cuoType:'STELE',tags:[]},{cuoTypes:['arch','stele']}),true);
  assert.equal(context.__criteria({cuoType:'arch',tags:[]},{cuoType:'arch'}),true);
  assert.equal(context.__criteria({cuoType:'stele',tags:[]},{cuoType:'arch'}),false);
});

test('M0 cuoTypes: les autres filtres restent cumulés',()=>{
  const params={cuoTypes:['arch','stele'],tagsAll:['evidence']};
  assert.equal(context.__criteria({cuoType:'arch',tags:['evidence']},params),true);
  assert.equal(context.__criteria({cuoType:'arch',tags:[]},params),false);
});
