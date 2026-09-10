const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'engine', 'object-m0-bridge.js'), 'utf8');
const start = source.indexOf('  const STEP_RELATION_FIELDS');
const end = source.indexOf('  const nodeNeedsObjectEvidence', start);
assert.ok(start >= 0 && end > start, 'bloc relation ObjectM0 introuvable');

const context = {
  __result: null,
  lower: (value) => String(value ?? '').trim().toLowerCase(),
  asArray: (value) => Array.isArray(value) ? value : value == null ? [] : [value]
};
vm.createContext(context);
const exactOwnerBlock = source.slice(start, end)
  .replace(/\blower\(/g, 'globalThis.lower(')
  .replace(/\basArray\(/g, 'globalThis.asArray(');
vm.runInContext(`${exactOwnerBlock}\nglobalThis.__relationMatches = relationMatches;`, context);

function treeWithObservedInstance(instanceId) {
  const sourceNode = {
    historyValues: [JSON.stringify({
      owner: 'object-m0',
      evidence: { instanceId, cuoType: 'relay_block', mapId: 'map-arch-04' }
    })]
  };
  return {
    id: 'ARCH-04',
    find(id) {
      return id === 'ARCH-04:observeComponent' ? sourceNode : null;
    }
  };
}

const collectNode = {
  params: {
    relation: {
      fromSlot: 'observeComponent',
      sameBy: ['instanceId']
    }
  }
};

test('ARCH-04: ObjectM0 accepte la collecte de l’instance observée', () => {
  assert.equal(
    context.__relationMatches(
      treeWithObservedInstance('relay-1'),
      collectNode,
      { instanceId: 'relay-1', cuoType: 'relay_block', mapId: 'map-arch-04' }
    ),
    true
  );
});

test('ARCH-04: ObjectM0 refuse une autre instance relay_block', () => {
  assert.equal(
    context.__relationMatches(
      treeWithObservedInstance('relay-1'),
      collectNode,
      { instanceId: 'relay-2', cuoType: 'relay_block', mapId: 'map-arch-04' }
    ),
    false
  );
});
