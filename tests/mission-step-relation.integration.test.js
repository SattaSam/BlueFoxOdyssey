const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function fixture() {
  const root = path.join(__dirname, "..");
  const listeners = new Map();
  const storage = new Map();

  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const window = {
    CustomEvent,
    console,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    BlueFox3D: {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    }
  };

  const context = vm.createContext({
    window,
    console,
    CustomEvent,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });
  const load = (file) => vm.runInContext(
    fs.readFileSync(path.join(root, file), "utf8"),
    context,
    { filename: file }
  );

  load("engine/object-library.js");
  [
    "engine/mission-types.js",
    "engine/mission-tree.js",
    "engine/mission-memory.js",
    "engine/mission-planner.js",
    "engine/action-bridge.js",
    "engine/mission-manager.js",
    "engine/mission-empty-core.js",
    "engine/mission-catalog.js",
    "engine/object-event-registry.js",
    "engine/bible-contract-v0-1.js",
    "data/bible-patterns.js",
    "data/bible-catalog.js",
    "engine/bible-runtime-v0-1-unified.js"
  ].forEach(load);

  window.BlueFox3D.mount = async (options) => options.engine;
  load("engine/object-m0-bridge.js");
  return { window, storage };
}

function game(window) {
  const BF = window.BlueFox3D;
  const position = (distance = 0) => ({
    x: distance,
    y: 0,
    z: 0,
    distanceTo(other) {
      return Math.hypot(
        this.x - Number(other?.x || 0),
        this.y - Number(other?.y || 0),
        this.z - Number(other?.z || 0)
      );
    }
  });
  const rootPosition = position(0);
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {}, onSpeak() {} },
    currentMapId: "map-a",
    currentZoneIndex: 0,
    currentMap: { interactables: [], zoneRegions: [], gates: [] },
    character: {
      root: { position: rootPosition },
      target: rootPosition,
      stop() {}, setTarget() { return true; }, facePoint() {}, cancelInteraction() {},
      findAvailableClip() { return ""; }, actions: new Map(), play() {}, playInteraction() { return 0; },
      currentAnimation: ""
    },
    discoveredZones: new Set(), pendingInteraction: null, currentRoutine: null,
    pendingGate: null, pendingZoneExploration: null, transitioning: false,
    resourceCooldowns: new WeakMap(), disposed: false,
    interactionWorldPosition(object) { return object.position; },
    targetInteraction(object) {
      this.lastMissionTarget = object;
      this.pendingInteraction = object;
      return true;
    }
  };
  const manager = BF.Missions.MissionManager.create({ engine });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => manager.getState();
  return { BF, engine, manager, position };
}

function object(definition, instanceId, position) {
  const value = {
    position,
    userData: { active: true, functional: definition, instanceId }
  };
  value.userData.worldAnchor = value;
  return value;
}

function activateFlo02(BF, manager) {
  const definition = BF.BibleCatalog.find((entry) => entry.id === "FLO-02");
  assert.ok(definition);
  assert.equal(manager.startMission("FLO-02", { primary: true }), true);
  return definition;
}

function emitStudy(BF, objectValue, mapId, nodeId) {
  return BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED, objectValue, {
    mapId,
    missionId: "FLO-02",
    missionNodeId: nodeId,
    subject: "flora",
    cuoType: objectValue.userData.functional.type,
    interactionSource: "mission"
  });
}

test("le contrat refuse les relations inter-etapes ambiguës", () => {
  const { window } = fixture();
  const BF = window.BlueFox3D;
  const base = {
    id: "REL-CONTRACT",
    title: "Relation",
    pattern: "SEQUENCE_ACTIONS",
    trigger: { type: "manual" },
    slots: {},
    sequence: [
      { slot: "a", action: "analyze", target: 1, params: { subject: "flora" } },
      { slot: "b", action: "analyze", target: 1, requires: ["a"], params: { subject: "flora" } }
    ]
  };
  const validate = (relation) => BF.BibleContractV01.validateMission({
    ...base,
    sequence: [base.sequence[0], {
      ...base.sequence[1],
      params: { ...base.sequence[1].params, relation }
    }]
  }, BF.BiblePatterns);

  assert.equal(validate({ fromSlot: "a", sameBy: ["objectId"], differentBy: ["mapId"] }).ok, true);
  assert.equal(validate({ fromSlot: "missing", sameBy: ["objectId"] }).ok, false);
  assert.equal(validate({ fromSlot: "b", sameBy: ["objectId"] }).ok, false);
  assert.equal(validate({ fromSlot: "a" }).ok, false);
  assert.equal(validate({ fromSlot: "a", sameBy: ["unknown"] }).ok, false);
  assert.equal(validate({ fromSlot: "a", sameBy: ["objectId"], differentBy: ["objectId"] }).ok, false);
});

test("FLO-02 exige la même définition sur une autre map et guide l'autonomie vers elle", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  await BF.mount({ engine });
  activateFlo02(BF, manager);

  const sameDefinition = BF.ObjectLibrary.get("fern");
  const otherDefinition = BF.ObjectLibrary.get("luminescent_tree");
  assert.ok(sameDefinition && otherDefinition);
  const source = object(sameDefinition, "source", position(1));

  emitStudy(BF, source, "map-a", "FLO-02:referencePlant");
  const tree = manager.trees.get("FLO-02");
  const reference = tree.find("FLO-02:referencePlant");
  const compare = tree.find("FLO-02:comparePlant");
  assert.equal(reference.progress, 1);
  assert.equal(compare.progress, 0);
  assert.equal(reference.historyValues.length, 1);

  // Même définition, même map : interdit.
  emitStudy(BF, object(sameDefinition, "same-map", position(2)), "map-a", "FLO-02:comparePlant");
  assert.equal(compare.progress, 0);

  // Autre définition, autre map : interdit.
  emitStudy(BF, object(otherDefinition, "wrong-species", position(1)), "map-b", "FLO-02:comparePlant");
  assert.equal(compare.progress, 0);

  // Sur l'autre map, l'autonomie ignore l'espèce plus proche et choisit la même définition.
  engine.currentMapId = "map-b";
  const wrong = object(otherDefinition, "wrong-near", position(1));
  const right = object(sameDefinition, "right-far", position(3));
  engine.currentMap.interactables = [wrong, right];
  manager.retryAfter = 0;
  manager.lastPlanAt = 0;
  assert.equal(manager.update(10000), true);
  assert.equal(engine.lastMissionTarget, right);

  emitStudy(BF, right, "map-b", "FLO-02:comparePlant");
  assert.equal(compare.progress, 1);
  assert.equal(manager.ensureLifecycle("FLO-02").status, "completed");
});

test("la preuve relationnelle FLO-02 survit à la sérialisation de l'arbre", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  await BF.mount({ engine });
  activateFlo02(BF, manager);
  const definition = BF.ObjectLibrary.get("fern");
  const source = object(definition, "persist-source", position(1));
  emitStudy(BF, source, "map-a", "FLO-02:referencePlant");

  const saved = manager.trees.get("FLO-02").toJSON();
  const restored = BF.Missions.MissionTree.fromJSON(JSON.parse(JSON.stringify(saved)));
  manager.trees.set("FLO-02", restored);
  manager.tree = restored;

  const reference = restored.find("FLO-02:referencePlant");
  const compare = restored.find("FLO-02:comparePlant");
  assert.equal(reference.historyValues.length, 1);
  emitStudy(BF, object(definition, "persist-target", position(2)), "map-b", "FLO-02:comparePlant");
  assert.equal(compare.progress, 1);
});
