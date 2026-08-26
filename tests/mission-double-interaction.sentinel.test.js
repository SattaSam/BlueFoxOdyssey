const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PROJECT_ROOT = process.env.BLUEFOX_SENTINEL_ROOT || path.join(__dirname, "..");

function loadRuntime({ objectM0 = true } = {}) {
  const listeners = new Map();
  const storage = new Map();
  const runtimeSetTimeout = (callback, delay, ...args) => {
    const handle = setTimeout(callback, delay, ...args);
    handle.unref?.();
    return handle;
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const window = {
    CustomEvent,
    console,
    setTimeout: runtimeSetTimeout,
    clearTimeout,
    queueMicrotask,
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
    setTimeout: runtimeSetTimeout,
    clearTimeout,
    queueMicrotask
  });
  const load = (file) => vm.runInContext(
    fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8"),
    context,
    { filename: file }
  );

  [
    "engine/object-library.js",
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
    "engine/bible-validation-v0-1.js",
    "engine/bible-runtime-v0-1-unified.js"
  ].forEach(load);

  window.BlueFox3D.mount = async (options) => options.engine;

  if (objectM0) {
    [
      "engine/object-m0-bridge.js",
      "engine/explore-scope-bridge.js",
      "engine/sequence-actions-bridge.js",
      "engine/context-msc-bridge.js",
      "engine/travel-cycle-bridge.js",
      "engine/bible-exploration-world-v19.js",
      "engine/mission-aware-analysis.js"
    ].forEach(load);
  }
  load("engine/mission-runtime-integration-v19-7.js");
  if (objectM0) load("engine/mission-target-arbitration-v19-12.js");

  return { window };
}

function createGame(window) {
  const BF = window.BlueFox3D;
  const position = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const character = {
    root: { position },
    target: position,
    stop() {},
    setTarget() {},
    facePoint() {},
    cancelInteraction() {},
    playInteraction() { return 0; },
    currentAnimation: "",
    actions: new Map()
  };
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {} },
    currentMapId: "crystal",
    currentZoneIndex: 0,
    currentMap: { interactables: [], colliders: [], group: null, gates: [] },
    character,
    pendingInteraction: null,
    currentRoutine: null,
    pendingGate: null,
    pendingZoneExploration: null,
    transitioning: false,
    resourceCooldowns: new WeakMap(),
    disposed: false,
    interactionApproachAttempts: 0,
    completedInteractions: 0,
    discoveredZones: new Set(),
    loadMap: async () => true,
    interactionWorldPosition: (object) => object.position,
    interactionValidationDistance: () => 2,
    interactionApproachPoint: (object) => ({
      point: object.position,
      approachDistance: 1
    }),
    showWorldMarker() {},
    targetInteraction(object) {
      this.pendingInteraction = object;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = performance.now();
      return true;
    },
    updateInteraction() {}
  };

  const manager = BF.Missions.MissionManager.create({ engine });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => engine.missionManager.getState();
  BF.startMission = (id, options) => engine.missionManager.startMission(id, options);
  return { BF, engine, manager, position };
}

function fiberObject(BF, position, instanceId) {
  const object = {
    position,
    visible: true,
    userData: {
      active: true,
      functional: BF.ObjectLibrary.get("fiber"),
      instanceId,
      interactionState: {
        inspected: false,
        observed: true,
        analyzed: false,
        identified: true,
        collected: false,
        inspectionCount: 0,
        observationCount: 1,
        analysisCount: 0,
        collectionCount: 0,
        acquisitionObservationSatisfied: true
      }
    }
  };
  object.userData.worldAnchor = object;
  return object;
}

function completeInteraction(engine, now) {
  engine.updateInteraction(now);
  engine.updateInteraction(now + 3000);
}

test("le chargement réel conserve ObjectM0 comme unique propriétaire missionnel", () => {
  const { window } = loadRuntime();
  const integration = window.BlueFox3D.MissionRuntimeIntegrationV19_7;
  assert.equal(integration?.active, false);
  assert.equal(integration?.mode, "compatibility-fallback");
  assert.equal(integration?.owner, "object-m0-bridge");
});

test("collecter une fibre déjà connue exécute toutes les études dues puis collecte la même instance", async () => {
  const { window } = loadRuntime();
  const { BF, engine, manager, position } = createGame(window);
  const fiber = fiberObject(BF, position, "fiber-sentinel-a");
  engine.currentMap.interactables = [fiber];

  manager.activateMission("GAME-shelter", { primary: true, source: "sentinel" });
  manager.activateMission("T06", { primary: false, source: "sentinel" });
  manager.setPrimaryMission("GAME-shelter", false, "sentinel");
  await BF.mount({ engine });

  fiber.userData.requestedInteraction = "collect";
  fiber.userData.requestedInteractionSource = "mission";
  fiber.userData.missionNarrativeVerb = "collect";
  fiber.userData.missionNodeId = "GAME-shelter:fibers";
  fiber.userData.missionId = "GAME-shelter";

  assert.equal(engine.targetInteraction(fiber), true);
  assert.equal(fiber.userData.requestedInteraction, "observe");
  assert.equal(fiber.userData.missionId, "GAME-shelter");
  assert.equal(fiber.userData.missionNodeId, "GAME-shelter:plantStudy");

  completeInteraction(engine, 10000);
  assert.equal(engine.pendingInteraction, fiber);
  assert.equal(fiber.userData.requestedInteraction, "collect");

  completeInteraction(engine, 14000);

  const events = BF.ObjectEvents.history().slice(-2);
  assert.equal(
    Array.from(events, (event) => event.type).join(","),
    [
      BF.ObjectEvents.types.PHENOMENON_OBSERVED,
      BF.ObjectEvents.types.RESOURCE_COLLECTED
    ].join(",")
  );
  assert.equal(
    Array.from(events, (event) => event.instanceId).join(","),
    "fiber-sentinel-a,fiber-sentinel-a"
  );
  assert.equal(fiber.userData.interactionState.observationCount, 2);
  assert.equal(manager.trees.get("GAME-shelter").find("GAME-shelter:plantStudy").progress, 1);
  assert.equal(manager.trees.get("GAME-shelter").find("GAME-shelter:fibers").progress, 1);
  assert.equal(manager.trees.get("T06").find("T06:flora").progress, 1);
});

test("le fallback V19 reste actif sans ObjectM0 pour les anciennes distributions", async () => {
  const { window } = loadRuntime({ objectM0: false });
  const { engine } = createGame(window);
  await window.BlueFox3D.mount({ engine });
  assert.equal(engine.__missionRuntimeIntegrationV19_7, true);
});
