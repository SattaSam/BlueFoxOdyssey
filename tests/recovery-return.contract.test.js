const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT,'engine','mission-manager.js'),'utf8');

function boot() {
  const defs = {};
  const window = { console, localStorage:{getItem(){return null},setItem(){},removeItem(){}}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){}, BlueFox3D:{} };
  const CE = class { constructor(type,init={}){this.type=type;this.detail=init.detail;} };
  const context = vm.createContext({window, console, performance, CustomEvent:CE, setTimeout, clearTimeout});
  const BF=window.BlueFox3D;
  BF.getAutonomyMode=()=> 'full';
  BF.getProgressionState=()=>({inventory:{}});
  BF.Missions={
    ActionType:{OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',EXPLORE_ZONE:'explore-zone',TRAVEL:'travel',REST:'rest',EAT:'eat',RESEARCH:'research',CRAFT:'craft',BUILD:'build'},
    MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',FAILED:'failed',PAUSED:'paused'},
    normalizeActionType:v=>String(v||'observe'), definitions:defs, getDefinition:id=>defs[id]||null
  };
  class Node { constructor(raw){Object.assign(this,raw);this.params=raw.params||{};} get isComplete(){return false;} }
  class Tree { constructor(def){this.id=def.id;this.title=def.id;this.nodes=def.nodes.map(x=>new Node(x));this.root={isComplete:false,walk(fn){ for (const node of this._nodes) fn(node); },_nodes:this.nodes};} availableLeaves(){return this.nodes;} toJSON(){return {id:this.id,root:{}};} }
  class Memory { constructor(){this.state={activeMissionId:'',primaryMissionId:'',activeMissionIds:[],missionLifecycle:{},pendingActivations:{},missions:{},facts:{},history:[],rewardedMissions:{}};} save(){return true;} saveTree(){return true;} remember(){} setFact(k,v){this.state.facts[k]=v;} getFact(k,d=null){return Object.hasOwn(this.state.facts,k)?this.state.facts[k]:d;} }
  class Planner { constructor(){} restoreOrCreate(id){return new Tree(defs[id]);} nextAction(){return null;} }
  class Bridge { constructor(engine){this.engine=engine;} isEngineBusy(){return false;} context(){return {needs:{},energy:100};} execute(){return false;} }
  Object.assign(BF.Missions,{MissionMemory:Memory,MissionPlanner:Planner,ActionBridge:Bridge});
  vm.runInContext(source,context,{filename:'mission-manager.js'});
  return {BF,defs};
}

test('generic known-return intent survives as mission fact and executes only when not deferred/busy',()=>{
  const {BF,defs}=boot();
  defs['FUTURE-RETURN']={id:'FUTURE-RETURN',title:'future',priority:500,navigation:{autonomousKnownReturn:true},returnPolicy:{mode:'bac-discretion',deferForCurrentMapExclusiveMissions:true,maxDeferMs:45000},root:{},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  const pos={distanceTo:()=>0};
  let returns=0;
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,returnToBase(){returns++;}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('FUTURE-RETURN',{primary:true});
  const intent=m.ensureMissionReturnIntent();
  assert.equal(intent.active,true);
  assert.equal(intent.missionId,'FUTURE-RETURN');
  assert.equal(intent.mapId,'HOME');
  assert.equal(m.memory.getFact('missionReturnIntent:FUTURE-RETURN').mapId,'HOME');
  m.shouldDeferMissionReturn=()=>false;
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.equal(returns,1);
  m.currentAction={type:'collect'};
  assert.equal(m.resumeMissionReturnIntent(),false);
  assert.equal(returns,1);
});

test('primary known-return keeps mission authority while travel node is unfinished',()=>{
  const {BF,defs}=boot();
  defs['FUTURE-RETURN']={id:'FUTURE-RETURN',title:'future',priority:500,navigation:{autonomousKnownReturn:true},root:{},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  const pos={distanceTo:()=>0};
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('FUTURE-RETURN',{primary:true});
  assert.equal(m.hasPrimaryMissionAuthority(),true);
  assert.ok(m.primaryEventDrivenTravel());
});
