const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function boot() {
  const listeners = new Map();
  class CE { constructor(type, opts = {}) { this.type = type; this.detail = opts.detail; } }
  const window = {
    BlueFox3D: {}, CustomEvent: CE, console, performance, Date, Math, JSON, Set, Map, WeakMap,
    localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(listeners.get(event.type) || [])]) fn(event); return true; },
    setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){ return 1; }, clearInterval(){},
    queueMicrotask(callback){ callback(); }
  };
  window.window = window;
  const BF = window.BlueFox3D;
  const definitions = {};

  class Node {
    constructor(id) { this.id=id; this.type='observe'; this.title=id; this.params={}; this.target=1; this.progress=0; this.status='available'; this.isComplete=false; }
    increment(amount=1) { this.progress += amount; this.isComplete=this.progress>=this.target; this.status=this.isComplete?'completed':'active'; return true; }
  }
  class Tree {
    constructor(id) { this.id=id; this.title=id; this.description=id; this.node=new Node(`${id}:step`); this.root={status:'active',isComplete:false,completedAt:0,walk:(cb)=>cb(this.node)}; }
    availableLeaves(){ return this.node.isComplete ? [] : [this.node]; }
    find(id){ return id===this.node.id ? this.node : null; }
    refresh(){ this.root.isComplete=this.node.isComplete; this.root.status=this.node.isComplete?'completed':'active'; if (this.root.isComplete && !this.root.completedAt) this.root.completedAt=Date.now(); }
    toJSON(){ return {id:this.id,title:this.title,root:{status:this.root.status,children:[]}}; }
  }
  class Memory {
    constructor(){ this.state={missionLifecycle:{},missions:{},pendingActivations:{},activeMissionIds:[],primaryMissionId:'',activeMissionId:'',researchUnlocks:{}}; }
    save(){} saveTree(tree){ this.state.missions[tree.id]=tree.toJSON(); } remember(){} getFact(){return null;} setFact(){}
  }
  class Planner {
    constructor(memory){ this.memory=memory; }
    restoreOrCreate(id){ return new Tree(id); }
    nextAction(tree){ const node=tree.availableLeaves()[0]; return node ? {nodeId:node.id,type:node.type,title:node.title,params:{},issuedAt:Date.now()} : null; }
    applyCompletion(tree, action){ const node=tree.find(action.nodeId); if (!node) return false; node.increment(1); tree.refresh(); return true; }
  }
  class Bridge {
    constructor(engine){ this.engine=engine; }
    isEngineBusy(){ return false; }
    context(){ return {needs:{},energy:100}; }
    execute(){ return true; }
  }

  BF.Missions = {
    definitions,
    getDefinition: id => definitions[id] || null,
    MissionMemory: Memory, MissionPlanner: Planner, ActionBridge: Bridge,
    MissionStatus: {AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',PAUSED:'paused',FAILED:'failed'},
    ActionType: {OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',REST:'rest',EAT:'eat',TRAVEL:'travel'},
    normalizeActionType: value => String(value || '')
  };
  BF.getAutonomyMode = () => 'full';
  BF.getProgressionState = () => ({inventory:{}});
  BF.registerMissionDefinitions = list => { for (const def of list) definitions[def.id]=def; return list.length; };

  const context = vm.createContext({window,CustomEvent:CE,console,performance,Date,Math,JSON,Set,Map,WeakMap,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,queueMicrotask:window.queueMicrotask});
  vm.runInContext(read('engine/mission-manager.js'), context, {filename:'mission-manager.js'});
  vm.runInNewContext(read('data/bible-catalog.js'), {window,console,Object,Array,Map,Set,Math,JSON}, {filename:'bible-catalog.js'});

  BF.BibleContractV01 = {validateCatalog(){ return {ok:true,errors:[],warnings:[]}; }};
  BF.BiblePatterns = new Proxy({}, {get(){ return {steps:[]}; }});
  let runtimeSource = read('engine/bible-runtime-v0-1-unified.js')
    .replace('const runtime = new BibleRuntimeV01();', 'const runtime = Object.create(BibleRuntimeV01.prototype); runtime.catalog=[]; runtime.byId=new Map(); runtime.dynamicMissions=new Map(); runtime.state={};')
    .replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/m, '\n})(window);\n');
  vm.runInContext(runtimeSource, context, {filename:'bible-runtime-v0-1-unified.js'});

  const tutorial = BF.BibleCatalog.filter(m => /^T\d\d$/.test(m.id));
  for (const mission of tutorial) definitions[mission.id] = {id:mission.id,title:mission.title,priority:Number(mission.priority)||100,root:{}};
  const representativeIds = ['GAME-civilization_2','ENE-05','ARCH-09','CONTACT-02','TP-03','COL-WOOD-50','ENV-RELIC-50'];
  for (const id of representativeIds) {
    const mission = BF.BibleCatalog.find(m => m.id===id);
    if (mission) definitions[id]={id,title:mission.title,priority:Number(mission.priority)||100,root:{}};
  }
  definitions.PLAYER={id:'PLAYER',title:'PLAYER',priority:999,root:{}};

  const engine={currentMapId:'crystal',callbacks:{onAction(){},onStatus(){}},pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,character:{root:{position:{distanceTo(){return 0;}}},target:{}}};
  const manager=BF.Missions.MissionManager.create({engine});
  engine.missionManager=manager; BF.currentEngine=engine; BF.getMissionState=()=>manager.getState();

  const Runtime=BF.BibleRuntimeV01;
  const runtime=Object.create(Runtime.prototype);
  runtime.catalog=BF.BibleCatalog; runtime.byId=new Map(runtime.catalog.map(m=>[m.id,m])); runtime.dynamicMissions=new Map();
  runtime.state={triggerCounts:{},uniqueTriggerValues:{},progressNarrative:{},effectsApplied:{},gatesSatisfied:{},activationInventoryCredits:{},constructionInstances:{},localMissionInstances:{},faunaMissionInstances:{}};
  runtime.missionLifecycleStatuses=new Map(); runtime.observationCaptureQueued=false;
  runtime.pendingConstructionResourceMissions=new Set(); runtime.constructionResourceSignatures=new Map();
  runtime.compileMission=m=>definitions[m.id] || {id:m.id,title:m.title,priority:Number(m.priority)||0,root:{}};
  runtime.emitRevealedOnce=()=>false; runtime.initializeRuntimeCounters=()=>false; runtime.reconcileHistoricalCollections=()=>false;
  runtime.siteDistanceGateSatisfied=()=>true; runtime.isResearchRewardUnlocked=()=>true; runtime.completionGateState=()=>({managed:false,canFinalize:true});
  for (const name of ['captureObservationMap','reconcileSlotInventoryGrantEffects','reconcileSlotFactEffects','reconcileFinalDeparture','reconcileMissionProgressValidations','reconcileLongExpeditionValidations','reconcileWorldEventRequirements','reconcilePersistentWorldScenes','reconcileWorldTopologyLinks','migrateLegacyRationUnlock','activateNextDroneRepairMission','reconcileRuntimeCounters','reconcileHistoricalCollectionChains','reconcileStockBackedMissions','reconcileEnvironmentAll','refreshProximityContextMonitor','reconcileLocalExploration','restoreLocalExplorationSession','restoreLocalMissionDefinitions','reconcileLocalSiteProgression','reconcileFaunaSpeciesMissions','reconcileCivilizationContactContinuation']) runtime[name]=()=>false;
  runtime.missionsForState=()=>[]; runtime.localMissionTemplates=()=>[];
  BF.bibleRuntime=runtime;
  window.addEventListener('bluefox:mission-state', event => runtime.onMissionState(event.detail || {}));

  function reset() {
    manager.primaryMissionId=''; manager.activeMissionId=''; manager.activeMissionIds=[]; manager.trees=new Map(); manager.tree=null; manager.currentAction=null;
    manager.memory.state.missionLifecycle={}; manager.memory.state.missions={}; manager.memory.state.pendingActivations={}; manager.memory.state.primaryMissionId=''; manager.memory.state.activeMissionId=''; manager.memory.state.activeMissionIds=[];
    runtime.state.triggerCounts={}; runtime.missionLifecycleStatuses=new Map();
  }

  function triggerMission(targetId) {
    const mission=runtime.byId.get(targetId); assert.ok(mission, `${targetId} missing from catalog`);
    if (!/^T\d\d$/.test(targetId)) manager.memory.state.missionLifecycle.T08={status:'completed'};
    for (const prerequisite of mission.prerequisites || []) manager.memory.state.missionLifecycle[prerequisite]={status:'completed'};
    if (mission.trigger?.missionId) manager.memory.state.missionLifecycle[mission.trigger.missionId]={status:'completed'};
    const result=runtime.consumeTriggerEvent({type:mission.trigger.type,missionId:mission.trigger.missionId,amount:1,mapId:'crystal'});
    return {mission,lifecycle:manager.memory.state.missionLifecycle[targetId],result};
  }

  return {BF, manager, runtime, reset, triggerMission};
}

test('catalog omission inherits MissionManager autoPrimaryEligible=true while explicit false/true remain authoritative', () => {
  const {manager, runtime, reset, triggerMission}=boot();
  for (const id of ['T02','GAME-civilization_2','ENE-05','ARCH-09','CONTACT-02','TP-03','COL-WOOD-50']) {
    reset();
    const {mission,lifecycle}=triggerMission(id);
    assert.equal(mission.autoPrimaryEligible, undefined, `${id} must exercise the absent-declaration path`);
    assert.equal(lifecycle?.autoPrimaryEligible, true, `${id} must inherit MissionManager default true`);
  }
  reset();
  const env=triggerMission('ENV-RELIC-50');
  assert.equal(env.mission.autoPrimaryEligible,false);
  assert.equal(env.lifecycle?.autoPrimaryEligible,false,'explicit false must remain false');
  reset();
  const t10=runtime.byId.get('T10');
  manager.memory.state.missionLifecycle.T09={status:'completed'};
  runtime.consumeTriggerEvent({type:'progression.mission_completed',missionId:'T09',amount:1,mapId:'crystal'});
  assert.equal(t10.autoPrimaryEligible,true);
  assert.equal(manager.memory.state.missionLifecycle.T10?.autoPrimaryEligible,true,'explicit true must remain true');
});

test('tutorial relay T01→T10 always promotes the next eligible tutorial mission when previous Top1 completes', () => {
  const {manager,runtime}=boot();
  assert.equal(runtime.startMissionThroughBible('T01',{primary:true,prerequisites:[]}),true);
  assert.equal(manager.primaryMissionId,'T01');
  runtime.onMissionState(manager.getState());

  for (let n=1; n<=9; n++) {
    const current=`T${String(n).padStart(2,'0')}`;
    const next=`T${String(n+1).padStart(2,'0')}`;
    const tree=manager.trees.get(current);
    assert.ok(tree, `${current} tree missing`);
    manager.currentAction={missionId:current,nodeId:`${current}:step`,type:'observe',title:current,params:{},issuedAt:Date.now()};
    assert.equal(manager.notifyActionCompleted('observe',{amount:1},{passive:false}),true,`${current} completion failed`);
    assert.equal(manager.memory.state.missionLifecycle[current]?.status,'completed',`${current} lifecycle must complete`);
    assert.equal(manager.memory.state.missionLifecycle[next]?.status,'active',`${next} must activate from ${current}`);
    assert.equal(manager.primaryMissionId,next,`${next} must become Top1 after ${current}`);
    if (n < 9) assert.equal(manager.memory.state.missionLifecycle[next]?.autoPrimaryEligible,true,`${next} must be auto-primary eligible`);
  }
});

test('new eligible mission never steals an existing player-selected Top1', () => {
  const {manager,reset,triggerMission}=boot();
  reset();
  manager.trees.set('PLAYER', manager.planner.restoreOrCreate('PLAYER'));
  manager.activeMissionIds=['PLAYER'];
  manager.memory.state.missionLifecycle.PLAYER={status:'active',autoPrimaryEligible:true,selectionReason:'Priorité suggérée par le joueur.'};
  manager.primaryMissionId='PLAYER'; manager.activeMissionId='PLAYER'; manager.tree=manager.trees.get('PLAYER'); manager.selectionReason='Priorité suggérée par le joueur.';
  manager.assessMission=id=>({missionId:id,score:id==='PLAYER'?10:1000,action:{type:'observe'},reasons:['test']});
  const {lifecycle}=triggerMission('T02');
  assert.equal(lifecycle?.autoPrimaryEligible,true);
  assert.equal(manager.primaryMissionId,'PLAYER','player Top1 must stay authoritative');
});

test('MissionManager only auto-promotes non-primary activation when no active Top1 exists', () => {
  const {manager,reset}=boot();
  reset();
  manager.assessMission=id=>({missionId:id,score:100,action:{type:'observe'},reasons:['test']});
  assert.equal(manager.startMission('T02',{primary:false,autoPrimaryEligible:true}),true);
  assert.equal(manager.primaryMissionId,'T02','eligible activation must fill an empty Top1');
  reset();
  assert.equal(manager.startMission('ENV-RELIC-50',{primary:false,autoPrimaryEligible:false}),true);
  assert.equal(manager.primaryMissionId,'','explicit secondary mission must not become Top1');
});
