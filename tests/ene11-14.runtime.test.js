const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function loadScript(path, ctx, stripStart = false) {
  let src = fs.readFileSync(path, 'utf8');
  if (stripStart) src = src.replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(src, ctx, { filename: path });
}

const storage = new Map();
const listeners = new Map();
class CE { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const window = {
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  WeakMap,
  Promise,
  performance: { now: () => 1000 },
  queueMicrotask: (fn) => fn(),
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout() {},
  setInterval: () => 1,
  clearInterval() {},
  CustomEvent: CE,
  localStorage: {
    getItem(k) { return storage.has(k) ? storage.get(k) : null; },
    setItem(k,v) { storage.set(k,String(v)); },
    removeItem(k) { storage.delete(k); }
  },
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
  BlueFox3D: {
    Missions: {},
    BiblePatterns: {},
    ObjectEvents: { types: { OBJECT_SEEN:'OBJECT_SEEN', DRONE_ACTIVATED:'DRONE_ACTIVATED' } }
  }
};
window.window = window;
const ctx = vm.createContext(window);
loadScript(path.join(ROOT, 'data/bible-catalog.js'), ctx);

const cat = window.BlueFox3D.BibleCatalog;
const byId = new Map(cat.map(m => [m.id, m]));
for (const id of ['ENE-11','ENE-12','ENE-13','ENE-14']) assert(byId.has(id), `${id} absent`);
assert(!byId.has('ENE-15'), 'ENE-15 ne doit pas être intégré');
const e11=byId.get('ENE-11'), e12=byId.get('ENE-12'), e13=byId.get('ENE-13'), e14=byId.get('ENE-14');
assert.deepStrictEqual(Array.from(e11.prerequisites), ['ENE-10','GAME-engineering_6']);
const prototypeStep=e11.sequence.find(step=>step.slot==='prototype');
assert.equal(prototypeStep.params.eventDriven,true,'ENE-11 prototype doit être non planifiable par ActionBridge');
assert.equal(prototypeStep.params.catalogManaged,true,'ENE-11 prototype doit être progressé uniquement par BibleRuntime');
assert.equal(e11.proximityContexts[0].microSceneId,'MSC-CUSTOM-ETABLI-VIDE');
assert.equal(e11.proximityContexts[0].slot,'prototype');
assert.equal(e11.effects[0].quantity, 12); assert.equal(e11.effects[1].quantity, 8); assert.equal(e11.effects[2].quantity, 6);
const recipe=e11.rewards.find(r=>r.id==='accumulator-basic-v1');
assert(recipe && recipe.output.objectId==='accumulator' && recipe.output.quantity===1);
assert.equal(recipe.requirements[0].inventoryKeys.length,4);
assert.equal(e12.proximityContexts[0].inventoryConsume.inventoryKey,'accumulator'); assert.equal(e12.proximityContexts[0].inventoryConsume.quantity,1);
assert.equal(e13.runtimeValidation.type,'ene13-scout-drone');
assert.equal(e14.runtimeValidation.reuseMissionId,'GEO-07');

loadScript(path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js'), ctx, true);
const BF=window.BlueFox3D;
const lifecycle={
  'ENE-13': {status:'active'},
  'ENE-14': {status:'active'},
  'GEO-07': {status:'completed'}
};
function node(target=1){ return { target, progress:0, isComplete:false, increment(n){ this.progress=Math.min(this.target,this.progress+n); this.isComplete=this.progress>=this.target; return true; } }; }
const nAct=node(), nScout=node(), nMeasurements=node(3);
const tree13={ find(id){ return id.endsWith(':activate')?nAct:id.endsWith(':scout')?nScout:null; }, availableLeaves(){ return nAct.isComplete?[nScout]:[nAct]; }, refresh(){} };
const tree14={ find(id){ return id.endsWith(':measurements')?nMeasurements:null; }, availableLeaves(){ return [nMeasurements]; }, refresh(){} };
const memory={ state:{missionLifecycle:lifecycle}, saveTree(){}, save(){}, getFact(){return null;}, setFact(){} };
const manager={ memory, trees:new Map([['ENE-13',tree13],['ENE-14',tree14]]), activeMissionIds:['ENE-13','ENE-14'], syncLifecycleFromTrees(){}, reevaluatePendingActivations(){}, catalogController:{schedule(){}}, publish(){} };
BF.currentEngine={ missionManager:manager, callbacks:{ onStatus(){} } };
let inventory={accumulator:1}; const tx={};
BF.consumeInventoryPoolOnce=(id,keys,amount)=>{ if(tx[id]) return tx[id]; if((inventory.accumulator||0)<amount) return 0; inventory.accumulator-=amount; tx[id]=amount; return amount; };
const runtime=new BF.BibleRuntimeV01();

assert.equal(runtime.handleEnergyMissionObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'drone'},tags:['drone-scouted']}), false);
assert.equal(nScout.progress,0,'scout ne doit pas avancer avant activation');
runtime.onObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'harvest_drone'},tags:[]});
assert.equal(inventory.accumulator,1,'mauvais drone ne consomme rien');
runtime.onObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'scout_drone'},tags:[]});
assert.equal(nAct.progress,1); assert.equal(inventory.accumulator,0,'activation scout consomme exactement 1 accumulateur via onObjectEvent');
runtime.onObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'scout_drone'},tags:[]});
assert.equal(inventory.accumulator,0,'réactivation ne double-débit pas');
assert.equal(runtime.handleEnergyMissionObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'player'},tags:['drone-scouted']}), false);
assert.equal(runtime.handleEnergyMissionObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'drone'},tags:[]}), false);
assert.equal(nScout.progress,0,'OBJECT_SEEN non qualifié ne valide pas ENE-13');
runtime.onObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'drone'},tags:['drone-scouted'],mapId:'map-test'});
assert.equal(nScout.progress,1,'seul OBJECT_SEEN drone-scouted valide ENE-13 via onObjectEvent');


const nPrototype=node();
lifecycle['ENE-11']={status:'active'};
manager.activeMissionIds.push('ENE-11');
manager.trees.set('ENE-11',{find(id){return id.endsWith(':prototype')?nPrototype:null;},availableLeaves(){return [nPrototype];},refresh(){}});
BF.currentEngine.currentMapId='crystal';
BF.currentEngine.character={root:{position:{x:20,z:0}}};
BF.currentEngine.currentMap={group:{userData:{microScenes:[{id:'MSC-CUSTOM-ETABLI-VIDE',instanceRoot:{position:{x:0,y:0,z:0}}}]}}};
runtime.reviewProximityContexts();
assert.equal(nPrototype.progress,0,'ENE-11 ne doit pas assembler le prototype hors portée de l établi');
BF.currentEngine.character.root.position={x:4,z:0};
runtime.reviewProximityContexts();
assert.equal(nPrototype.progress,1,'ENE-11 assemble le prototype uniquement à proximité réelle de l établi');

const nMachine=node();
lifecycle['ENE-12']={status:'active'};
manager.activeMissionIds.push('ENE-12');
manager.trees.set('ENE-12',{find(id){return id.endsWith(':machine')?nMachine:null;},availableLeaves(){return [nMachine];},refresh(){}});
inventory.accumulator=1;
BF.currentEngine.currentMapId='map-machine';
BF.currentEngine.character={root:{position:{x:0,z:0}}};
BF.currentEngine.currentMap={group:{userData:{microScenes:[{id:'MSC-CUSTOM-MACHINE-ABANDONNEE',instanceRoot:{position:{x:0,y:0,z:0}}}]}}};
runtime.reviewProximityContexts();
assert.equal(nMachine.progress,1,'ENE-12 valide seulement à proximité réelle de la machine');
assert.equal(inventory.accumulator,0,'ENE-12 consomme l accumulateur à la machine');

assert.equal(runtime.reconcileEnergyMissionRuntime(e14), true);
assert.equal(nMeasurements.progress,3,'GEO-07 terminé crédite les 3 mesures ENE-14');


// Le craft de série accepte bien un pool minéral réel et produit un objet d'inventaire réel.
const craftInv={magnetic_ore:4,azure_ferrite:3,resonant_basalt:3,stellar_iridium:2,crystal:8,fiber:6,accumulator:0};
BF.progression={
  availableInventory(keys){ return keys.reduce((sum,k)=>sum+(craftInv[k]||0),0); },
  addInventory(key,n){ craftInv[key]=(craftInv[key]||0)+n; },
  save(){}, publishChange(){}
};
BF.consumeInventoryPool=(keys,amount)=>{
  if(BF.progression.availableInventory(keys)<amount) return 0;
  let left=amount;
  for(const k of keys){ const take=Math.min(craftInv[k]||0,left); craftInv[k]-=take; left-=take; }
  return amount;
};
assert.equal(runtime.canCraftResearchReward('accumulator-basic-v1',1,{ignoreUnlock:true,ignoreShelter:true}),true);
assert.equal(runtime.craftResearchReward('accumulator-basic-v1',1,{ignoreUnlock:true,ignoreShelter:true}),1);
assert.equal(craftInv.accumulator,1,'le craft produit un accumulateur réel');
assert.equal(craftInv.crystal,0); assert.equal(craftInv.fiber,0);
assert.equal(craftInv.magnetic_ore+craftInv.azure_ferrite+craftInv.resonant_basalt+craftInv.stellar_iridium,0,'12 minéraux réellement consommés');

console.log('PASS ene11-14 targeted runtime');
