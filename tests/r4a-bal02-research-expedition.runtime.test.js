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
const runtime = new BF.BibleRuntimeV01();
const options = { ignoreUnlock: true, ignoreShelter: true, ignoreWorkbench: true };
const reward = BF.BibleCatalog.flatMap(m => Array.isArray(m.rewards) ? m.rewards : []).find(r => r?.id === 'deployed-beacon-v1');
assert(reward, 'BAL-02 deployed-beacon-v1 recipe must exist');
const accumulatorRequirement = reward.requirements.find(r => r.inventoryKey === 'accumulator');
assert.equal(accumulatorRequirement.inventorySource, 'expedition', 'only accumulator is explicitly sourced from Kit');
for (const key of ['core', 'parts', 'wood', 'stellar_iridium']) {
  const requirement = reward.requirements.find(r => r.inventoryKey === key);
  assert.notEqual(requirement?.inventorySource, 'expedition', `${key} must remain generic stock`);
}

// Positive BAL-02: normal stock + accumulator reserved in Kit must craft successfully.
BF.grantInventory('core', 1);
BF.grantInventory('accumulator', 1);
BF.grantInventory('parts', 6);
BF.grantInventory('wood', 8);
BF.grantInventory('stellar_iridium', 4);
assert.equal(BF.progression.availableInventory('accumulator'), 0, 'generic consumer cannot see reserved accumulator');
assert.equal(BF.getExpeditionQuantity('accumulator'), 1);
assert.equal(runtime.canCraftResearchReward('deployed-beacon-v1', 1, options), true, 'BAL-02 must see its explicitly authorized Kit accumulator');
assert.equal(runtime.craftResearchReward('deployed-beacon-v1', 1, options), 1, 'BAL-02 must craft one beacon');
let state = BF.getProgressionState();
assert.equal(state.inventory.accumulator || 0, 0, 'authorized Kit accumulator consumed');
assert.equal(state.inventory.core || 0, 0);
assert.equal(state.inventory.parts || 0, 0);
assert.equal(state.inventory.wood || 0, 0);
assert.equal(state.inventory.stellar_iridium || 0, 0);
assert.equal(state.inventory.deployed_beacon || 0, 1, 'beacon output created');
assert.equal(BF.getExpeditionQuantity('deployed_beacon'), 1, 'historical beacon remains Kit-locked');

// Negative: reserved parts must NOT become visible merely because accumulator is authorized.
BF.progression.reset();
BF.grantInventory('core', 1);
BF.grantInventory('accumulator', 1);
BF.grantInventory('parts', 6);
BF.allocateInventoryToExpedition('parts', 6);
BF.grantInventory('wood', 8);
BF.grantInventory('stellar_iridium', 4);
assert.equal(BF.progression.availableInventory('parts'), 0, 'reserved parts stay hidden from generic Research');
assert.equal(runtime.canCraftResearchReward('deployed-beacon-v1', 1, options), false, 'BAL-02 permission must not expose reserved parts');
assert.equal(runtime.craftResearchReward('deployed-beacon-v1', 1, options), 0);
state = BF.getProgressionState();
assert.equal(state.inventory.parts, 6);
assert.equal(state.expeditionAllocation.parts, 6);
assert.equal(BF.getExpeditionQuantity('accumulator'), 1, 'failed craft consumes nothing, including authorized accumulator');

console.log('PASS R4-A BAL-02 Research consumes only explicitly authorized Kit accumulator');
