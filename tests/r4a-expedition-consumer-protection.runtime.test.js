const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');

class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const store = new Map();
const listeners = new Map();
const window = {
  console, Date, Math, JSON, Set, Map, WeakMap,
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
  BlueFox3D: {}
};
window.window = window;
const ctx = vm.createContext(window);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/progression-registry.js'), 'utf8'), ctx);
const BF = window.BlueFox3D;

// Generic consumers: free bag first, then Camp; Kit reservation must survive.
BF.grantInventory('parts', 10);
BF.allocateInventoryToExpedition('parts', 6);
BF.grantCampStorage('parts', 4);
assert.equal(BF.availableInventory('parts'), 8, 'generic availability = 4 free bag + 4 camp');
assert.equal(BF.consumeInventoryPool(['parts'], 8), 8);
let s = BF.getProgressionState();
assert.equal(s.inventory.parts, 6, 'generic pool preserves 6 reserved parts');
assert.equal(s.expeditionAllocation.parts, 6);
assert.equal(s.campStorage.parts, 0);

// No Camp fallback: generic consume must fail rather than touch Kit.
assert.equal(BF.consumeInventoryPool(['parts'], 1), 0);
assert.equal(BF.consumeInventory('parts', 1), 0);
assert.equal(BF.getExpeditionQuantity('parts'), 6);

// Explicit key-level permission may consume only the named Kit item.
BF.grantInventory('accumulator', 2);
assert.equal(BF.availableInventory('accumulator'), 0, 'auto-Kit accumulator is protected by default');
assert.equal(
  BF.availableInventory('accumulator', { includeExpeditionKeys: ['accumulator'] }),
  2,
  'explicit accumulator consumer sees accumulator Kit stock'
);
assert.equal(
  BF.consumeInventoryPoolOnce(
    'ene13:accumulator:test',
    ['accumulator'],
    1,
    { includeExpeditionKeys: ['accumulator'] }
  ),
  1
);
assert.equal(BF.getExpeditionQuantity('accumulator'), 1);

// Permission is selective: allowing accumulator does not expose reserved parts.
assert.equal(
  BF.availableInventory(['parts', 'accumulator'], { includeExpeditionKeys: ['accumulator'] }),
  1,
  'reserved parts remain invisible when only accumulator is explicitly allowed'
);

// Locked beacon is protected by default but remains consumable by its explicit owner path.
BF.grantInventory('deployed_beacon', 1);
assert.equal(BF.availableInventory('deployed_beacon'), 0);
assert.equal(
  BF.consumeInventoryPool(
    'deployed_beacon',
    1,
    { includeExpeditionKeys: ['deployed_beacon'] }
  ),
  1
);
assert.equal(BF.getProgressionState().inventory.deployed_beacon, 0);

// Consumer propagation guards: Research remains generic/protected; historical Kit owners opt in explicitly.
const bible = fs.readFileSync(path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
const special = fs.readFileSync(path.join(ROOT, 'engine/special-object-runtime.js'), 'utf8');
assert(bible.includes('requirement?.inventorySource === \"expedition\"'), 'Research supports per-requirement expedition opt-in');
assert(bible.includes('BF.progression?.availableInventory?.(keys, inventoryOptions) >= quantity'), 'Research availability propagates only the requirement-specific inventory permission');
assert(bible.includes('BF.consumeInventoryPool?.(keys, quantity, inventoryOptions)'), 'Research consumption propagates only the requirement-specific inventory permission');
assert(bible.includes('requirement.inventorySource === "expedition"'), 'generic proximity inventoryConsume supports explicit expedition source');
assert(bible.includes('includeExpeditionKeys: ["accumulator"]'), 'ENE-13 explicitly opts into accumulator Kit stock');
const catalog = fs.readFileSync(path.join(ROOT, 'data/bible-catalog.js'), 'utf8');
assert(catalog.includes('inventorySource: "expedition"'), 'ENE-12 declares expedition inventory source');
assert(special.includes('key === "accumulator" ? ["accumulator"] : []'), 'drone recipes opt into accumulator only');
assert(special.includes('includeExpeditionKeys: ["deployed_beacon"]'), 'beacon owner explicitly opts into beacon Kit stock');

console.log('PASS R4-A generic consumers protect Kit; explicit historical Kit consumers remain functional');
