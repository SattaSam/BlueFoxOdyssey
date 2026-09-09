const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');

class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const store = new Map();
const listeners = new Map();
const window = {
  console, Date, Math, JSON, Set, Map, WeakMap, Promise,
  performance: { now: () => 1000 },
  queueMicrotask: (fn) => fn(),
  setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  CustomEvent: CE,
  localStorage: {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
  BlueFox3D: { Missions: {}, BiblePatterns: {}, ObjectEvents: { types: {} } }
};
window.window = window;
const ctx = vm.createContext(window);
const run = (rel, stripStart = false) => {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (stripStart) src = src.replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(src, ctx, { filename: rel });
};

run('engine/progression-registry.js');
run('data/bible-catalog.js');
run('engine/bible-runtime-v0-1-unified.js', true);
const BF = window.BlueFox3D;
const e12 = BF.BibleCatalog.find((mission) => mission.id === 'ENE-12');
assert(e12, 'ENE-12 must exist');
const consume = e12.proximityContexts.find((context) => context.inventoryConsume)?.inventoryConsume;
assert.equal(consume.inventoryKey, 'accumulator');
assert.equal(consume.inventorySource, 'expedition', 'ENE-12 must explicitly consume from Kit');

function node(id) {
  return {
    id, target: 1, progress: 0, isComplete: false,
    increment(n = 1) {
      this.progress = Math.min(this.target, this.progress + n);
      this.isComplete = this.progress >= this.target;
      return true;
    }
  };
}
const approach = node('ENE-12:approach');
const machine = node('ENE-12:machine');
const tree = {
  root: { isComplete: false },
  find(id) { return id.endsWith(':approach') ? approach : id.endsWith(':machine') ? machine : null; },
  availableLeaves() { return approach.isComplete ? [machine] : [approach]; },
  refresh() { this.root.isComplete = approach.isComplete && machine.isComplete; }
};
const facts = {};
const memory = {
  state: { missionLifecycle: { 'ENE-12': { status: 'active' } } },
  saveTree() {}, save() {},
  getFact(key, fallback = null) { return Object.prototype.hasOwnProperty.call(facts, key) ? facts[key] : fallback; },
  setFact(key, value) { facts[key] = value; return true; }
};
const manager = {
  memory,
  trees: new Map([['ENE-12', tree]]),
  activeMissionIds: ['ENE-12'],
  syncLifecycleFromTrees() {}, reevaluatePendingActivations() {},
  catalogController: { schedule() {} }, publish() {}
};
BF.currentEngine = {
  currentMapId: 'machine-map',
  missionManager: manager,
  callbacks: { onStatus() {} },
  character: { root: { position: { x: 0, z: 0 } } },
  currentMap: {
    group: {
      userData: {
        microScenes: [{
          id: 'MSC-CUSTOM-MACHINE-ABANDONNEE',
          instanceRoot: { position: { x: 0, y: 0, z: 0 } }
        }]
      }
    }
  }
};

assert.equal(BF.grantInventory('accumulator', 1), 1);
assert.equal(BF.getExpeditionQuantity('accumulator'), 1);
assert.equal(BF.progression.availableInventory('accumulator'), 0, 'generic stock cannot see reserved accumulator');

const runtime = new BF.BibleRuntimeV01();
runtime.reviewProximityContexts();
assert.equal(approach.progress, 1, 'ENE-12 approach progresses at real machine proximity');
assert.equal(machine.progress, 1, 'ENE-12 consumes Kit accumulator and progresses machine slot');
assert.equal(BF.getExpeditionQuantity('accumulator'), 0);
assert.equal(BF.getProgressionState().inventory.accumulator || 0, 0);

console.log('PASS R4-A ENE-12 explicit expedition accumulator consumption');
