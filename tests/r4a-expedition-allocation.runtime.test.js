const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');

class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const storageMap = new Map();
const listeners = new Map();
const storage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k)
};
const window = {
  console, Date, Math, JSON, Set, Map, WeakMap,
  CustomEvent: CE,
  localStorage: storage,
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatchEvent(event) {
    for (const fn of listeners.get(event.type) || []) fn(event);
    return true;
  },
  BlueFox3D: {}
};
window.window = window;
const ctx = vm.createContext(window);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'engine/progression-registry.js'), 'utf8'),
  ctx,
  { filename: 'engine/progression-registry.js' }
);
const BF = window.BlueFox3D;

// Refutation: generic consumers must never consume quantities reserved in the Kit.
assert.equal(BF.grantInventory('test_resource', 10), 10);
assert.equal(BF.allocateInventoryToExpedition('test_resource', 6), 6);
assert.equal(BF.availableInventory('test_resource'), 4, 'generic availability excludes Kit reservation');
const protectedBeforePool = BF.getProgressionState();
assert.equal(BF.consumeInventoryPool(['test_resource'], 8), 0, 'generic pool cannot consume through Kit reservation');
assert.deepEqual(BF.getProgressionState().inventory, protectedBeforePool.inventory);
assert.deepEqual(BF.getProgressionState().expeditionAllocation, protectedBeforePool.expeditionAllocation);
assert.equal(BF.consumeInventory('test_resource', 8), 4, 'direct generic consume is capped to unallocated bag stock');
assert.equal(BF.getExpeditionQuantity('test_resource'), 6, 'direct generic consume preserves reserved Kit quantity');
assert.equal(BF.getProgressionState().inventory.test_resource, 6);

assert.equal(BF.grantInventory('parts', 20), 20);
assert.equal(BF.allocateInventoryToExpedition('parts', 7), 7);
assert.equal(BF.getExpeditionQuantity('parts'), 7);
assert.equal(BF.getUnallocatedInventoryQuantity('parts'), 13);

assert.equal(BF.grantInventory('deployed_beacon', 1), 1);
assert.equal(BF.depositAllInventory(), 13, 'auto/all deposit only moves unallocated bag quantity');
let s = BF.getProgressionState();
assert.equal(s.inventory.parts, 7);
assert.equal(s.campStorage.parts, 13);
assert.equal(s.inventory.deployed_beacon, 1, 'locked beacon stays transported');
assert.equal(s.campStorage.deployed_beacon || 0, 0);
assert.equal(BF.depositInventory('deployed_beacon', 1), 0, 'locked beacon cannot be deposited');

assert.equal(BF.releaseExpeditionAllocation('parts', 2), 2);
assert.equal(BF.getExpeditionQuantity('parts'), 5);
assert.equal(BF.getUnallocatedInventoryQuantity('parts'), 2);
assert.equal(BF.transferExpeditionToCamp('parts', 3), 3);
s = BF.getProgressionState();
assert.equal(s.inventory.parts, 4);
assert.equal(s.expeditionAllocation.parts, 2);
assert.equal(s.campStorage.parts, 16);

BF.getInventoryCapacityState = () => ({ count: 198, capacity: 200 });
assert.equal(BF.transferCampToExpedition('parts', 10), 2, 'camp->kit respects remaining bag capacity');
s = BF.getProgressionState();
assert.equal(s.inventory.parts, 6);
assert.equal(s.expeditionAllocation.parts, 4);
assert.equal(s.campStorage.parts, 14);

assert.equal(BF.grantInventory('magnetic_ore', 6), 6);
assert.equal(BF.allocateInventoryToExpedition('magnetic_ore', 6), 6);
const beforeFailed = BF.getProgressionState();
assert.equal(
  BF.consumeExpeditionRequirementsOnce('repair:fail', { parts: 5, magnetic_ore: 6 }),
  0,
  'incomplete Kit requirements consume nothing'
);
assert.deepEqual(BF.getProgressionState().inventory, beforeFailed.inventory);
assert.deepEqual(BF.getProgressionState().expeditionAllocation, beforeFailed.expeditionAllocation);

assert.equal(
  BF.consumeExpeditionRequirementsOnce('repair:ok', { parts: 4, magnetic_ore: 6 }),
  10,
  'complete multi-resource repair requirements consume atomically'
);
s = BF.getProgressionState();
assert.equal(s.inventory.parts, 2);
assert.equal(s.inventory.magnetic_ore, 0);
assert.equal(BF.getExpeditionQuantity('parts'), 0);
assert.equal(BF.getExpeditionQuantity('magnetic_ore'), 0);
const consumedSnapshot = JSON.stringify(BF.getProgressionState());
assert.equal(BF.consumeExpeditionRequirementsOnce('repair:ok', { parts: 4, magnetic_ore: 6 }), 10);
assert.equal(JSON.stringify(BF.getProgressionState()), consumedSnapshot, 'transaction replay is idempotent');

assert.equal(BF.grantInventory('accumulator', 2), 2);
assert.equal(BF.getExpeditionQuantity('accumulator'), 2, 'new accumulators keep historical Kit placement');
assert.equal(BF.depositAllInventory(), 2, 'only unallocated remaining parts are deposited');
assert.equal(BF.getExpeditionQuantity('accumulator'), 2);
assert.equal(BF.transferExpeditionToCamp('accumulator', 1), 1);
assert.equal(BF.getExpeditionQuantity('accumulator'), 1);

const historyBeforeReload = BF.getProgressionState().history.length;
const Reloaded = BF.ProgressionRegistry;
const reloaded = new Reloaded(storage);
assert.equal(reloaded.expeditionQuantity('accumulator'), 1, 'Kit allocation persists across reload');
assert.equal(reloaded.expeditionQuantity('deployed_beacon'), 1, 'locked historical beacon persists');
assert.equal(reloaded.state.history.length, historyBeforeReload, 'transfers create no fake collection history');

console.log('PASS R4-A expedition allocation / transfer / atomic repair stock');
