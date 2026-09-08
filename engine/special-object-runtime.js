(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const SPECIAL_TYPES = new Set([
    "energy_crystal", "abandoned_drone", "nocturnal_animal",
    "electrostatic_storm", "mobile_islet", "carnivorous_plant",
    "scout_drone", "harvest_drone", "survey_beacon", "npc_translucent", "npc_rocky"
  ]);
  const sceneCache = new WeakMap();
  const STORAGE_KEY = "bluefox_special_objects_v1";
  const DRONE_TYPES = new Set(["scout_drone", "harvest_drone"]);
  const RECIPES = Object.freeze({
    scout_drone: Object.freeze({ accumulator: 1, core: 2, parts: 10, energy_crystal: 2, magnetic_ore: 12 }),
    harvest_drone: Object.freeze({ accumulator: 1, core: 2, parts: 15, energy_crystal: 3, magnetic_ore: 30, stellar_iridium: 6 })
  });
  const defaultState = () => ({ version: 1, drones: {}, resources: {} });
  const loadState = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      return saved?.version === 1
        ? { ...defaultState(), ...saved, drones: { ...(saved.drones || {}) }, resources: { ...(saved.resources || {}) } }
        : defaultState();
    } catch {
      return defaultState();
    }
  };
  const state = loadState();
  const saveState = () => global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const instanceKey = (root) => {
    const anchor = root.userData.specialBehavior?.anchor || root.position;
    const type = root.userData.libraryType || root.userData.catalogId || "object";
    return [
      BF.currentEngine?.currentMapId || "map",
      type,
      Number(anchor.x || 0).toFixed(2),
      Number(anchor.z || 0).toFixed(2),
      Number(root.userData.variant || 0)
    ].join(":");
  };
  const hitboxOf = (root) => {
    if (!root) return null;
    let found = null;
    root.traverse?.((child) => { if (!found && child.userData?.interactable) found = child; });
    return found;
  };
  const metadata = (root) => {
    root.userData.specialBehavior ||= {
      anchor: { x: root.position.x, y: root.position.y, z: root.position.z },
      lastHazardAt: 0,
      lastActionAt: 0
    };
    return root.userData.specialBehavior;
  };
  const distanceToPlayer = (root) => {
    const player = BF.currentEngine?.character?.root;
    if (!player) return Infinity;
    return Math.hypot(player.position.x - root.position.x, player.position.z - root.position.z);
  };
  const announce = (text) => BF.currentEngine?.callbacks?.onStatus?.(text);
  const applyHazard = (root, key, cooldown, pressure, text) => {
    const data = metadata(root);
    const now = Date.now();
    if (now - data.lastHazardAt < cooldown) return false;
    data.lastHazardAt = now;
    BF.survival?.applyHazard?.(key, pressure);
    announce(text);
    return true;
  };

  const collect = (scene) => {
    if (!scene) return [];
    const cached = sceneCache.get(scene);
    const childCount = scene.children?.length || 0;
    if (cached?.childCount === childCount) return cached.entries;
    const entries = [];
    scene.traverse?.((object) => {
      const type = object.userData?.libraryType;
      if (object.userData?.specialRuntimeRoot && SPECIAL_TYPES.has(type)) {
        entries.push({ root: object, type });
      }
    });
    sceneCache.set(scene, { childCount, entries });
    return entries;
  };

  const isNight = () => {
    const dayBlock = global.document?.querySelector?.(".day-block");
    return !dayBlock || dayBlock.classList.contains("night");
  };

  const updateLightning = (root, elapsed) => {
    root.children.filter((child) => child.name === "StormLightning").forEach((bolt, boltIndex) => {
      const attribute = bolt.geometry?.attributes?.position;
      if (!attribute) return;
      for (let index = 0; index < attribute.count; index += 1) {
        const y = 5.4 - index * 0.78;
        const angle = boltIndex * 1.31 + index * 0.52 + Math.sin(elapsed * 3.7 + boltIndex) * 0.34;
        const radius = 1.15 + (index % 2) * 0.62 + Math.sin(elapsed * 8.3 + index * 2.1 + boltIndex) * 0.22;
        attribute.setXYZ(index, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      }
      attribute.needsUpdate = true;
      bolt.material.opacity = 0.34 + Math.max(0, Math.sin(elapsed * 11 + boltIndex * 2.7)) * 0.66;
      const colorIndex = Math.floor(elapsed * 3 + boltIndex) % 4;
      bolt.material.color.setHex(colorIndex < 2 ? 0xffffff : colorIndex === 2 ? 0xffcf68 : 0xff8a3d);
    });
  };

  const updateObject = (entry, elapsed) => {
    const { root, type } = entry;
    const phase = (root.userData.variant || 0) * 0.71;
    if (type === "energy_crystal") {
      const pulse = 1 + Math.sin(elapsed * 2.2 + phase) * 0.055;
      root.children.forEach((child) => {
        if (child.name === "EnergyShard") child.scale.setScalar(pulse);
        if (child.name === "EnergyGlow") child.intensity = 2.8 + (pulse - 0.945) * 12;
      });
    } else if (type === "abandoned_drone") {
      root.children.forEach((child, index) => {
        if (child.name === "ResidualOptic") child.material.emissiveIntensity = 0.35 + Math.max(0, Math.sin(elapsed * 1.7 + index)) * 1.1;
      });
    } else if (type === "nocturnal_animal") {
      const awake = isNight();
      const data = metadata(root);
      root.visible = awake;
      const hitbox = hitboxOf(root);
      if (hitbox) hitbox.userData.active = awake;
      if (awake) {
        root.position.x = data.anchor.x + Math.sin(elapsed * 0.16 + phase) * 1.2;
        root.position.z = data.anchor.z + Math.cos(elapsed * 0.13 + phase) * 0.8;
      } else {
        root.position.set(data.anchor.x, data.anchor.y, data.anchor.z);
      }
      root.children.forEach((child, index) => {
        if (child.name === "NightGlow") child.material.emissiveIntensity = awake ? 1.2 + Math.sin(elapsed * 2 + index) * 0.35 : 0.12;
        if (child.name === "SensorEar") child.rotation.z = -0.18 + Math.sin(elapsed * 1.4 + index) * (awake ? 0.12 : 0.025);
      });
      const body = root.children.find((child) => child.name === "NocturnalBody");
      if (body) body.position.y = 0.78 + (awake ? Math.sin(elapsed * 1.1 + phase) * 0.025 : -0.08);
    } else if (type === "npc_translucent") {
      const core = root.children.find((child) => child.name === "NpcCore");
      if (core) { core.rotation.y = elapsed * 0.65; core.scale.setScalar(1 + Math.sin(elapsed * 1.7 + phase) * 0.07); }
      root.children.forEach((child, index) => { if (child.name === "TranslucentTorso" || child.name === "TranslucentHead") child.material.opacity = 0.48 + Math.sin(elapsed * 0.65 + index) * 0.035; });
    } else if (type === "npc_rocky") {
      root.rotation.z = Math.sin(elapsed * 0.38 + phase) * 0.003;
    } else if (type === "electrostatic_storm") {
      const data = metadata(root);
      root.position.x = data.anchor.x + Math.sin(elapsed * 0.08 + phase) * 2.1;
      root.position.z = data.anchor.z + Math.cos(elapsed * 0.065 + phase) * 1.6;
      root.children.forEach((child, index) => {
        if (child.name === "StormCloud") child.rotation.z += 0.0025 * child.userData.spinDirection * (1 + index * 0.08);
        if (child.name === "StormCore") child.material.opacity = 0.26 + (Math.sin(elapsed * 2.8) + 1) * 0.08;
        if (child.name === "StormLight") child.intensity = 4.2 + Math.max(0, Math.sin(elapsed * 9.5)) * 3.8;
      });
      updateLightning(root, elapsed);
      if (distanceToPlayer(root) < 5.6) {
        applyHazard(root, "electrostatic_storm", 8000, { rest: 1.4, safety: 2.2 }, "La tempête électrostatique perturbe les systèmes de BlueFox.");
      }
    } else if (type === "mobile_islet") {
      const data = metadata(root);
      root.position.x = data.anchor.x + Math.sin(elapsed * 0.075 + phase) * 1.5;
      root.position.z = data.anchor.z + Math.cos(elapsed * 0.06 + phase) * 1.1;
      const mass = root.children.find((child) => child.name === "FloatingMass");
      if (mass) {
        mass.position.y = 2.8 + Math.sin(elapsed * 0.55 + phase) * 0.24;
        mass.rotation.y = Math.sin(elapsed * 0.16 + phase) * 0.12;
        mass.children.forEach((child, index) => {
          if (child.name === "LiftCrystal") child.rotation.y = elapsed * (0.45 + index * 0.03);
        });
      }
    } else if (type === "carnivorous_plant") {
      const proximity = distanceToPlayer(root);
      const jaw = root.children.find((child) => child.name === "CarnivorousJaw");
      const alert = proximity < 4.2 ? 1 : 0;
      if (jaw) jaw.rotation.y = Math.sin(elapsed * (0.72 + alert * 1.4) + phase) * (0.12 + alert * 0.16);
      if (jaw) jaw.scale.y = 0.9 + (Math.sin(elapsed * (1.15 + alert * 2.2) + phase) + 1) * (0.08 + alert * 0.07);
      root.children.forEach((child, index) => {
        if (child.name === "PlantTendril") child.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.09;
      });
      if (proximity < 1.85) {
        applyHazard(root, "carnivorous_plant", 18000, { rest: 2.1, safety: 3.5 }, "La plante carnivore se referme : BlueFox recule de la zone dangereuse.");
      }
    } else if (type === "survey_beacon") {
      const deployed = root.userData?.contextRole === "deployed_beacon";
      const head = root.children?.find?.((child) => child.name === "SurveyBeaconHead");
      if (deployed && head && head.userData?.blueFoxBeaconStyle !== "deployed-violet") {
        if (head.material?.clone) head.material = head.material.clone();
        head.material?.color?.setHex?.(0xa855f7);
        head.material?.emissive?.setHex?.(0x6d28d9);
        if (head.material) head.material.emissiveIntensity = 1.65;
        head.userData.blueFoxBeaconStyle = "deployed-violet";
      }
    } else if (type === "scout_drone" || type === "harvest_drone") {
      const droneState = state.drones[type];
      const active = Boolean(droneState?.crafted && droneState?.active);
      const drone = root.children.find((child) => child.name === "FunctionalDrone");
      if (!drone) return;
      drone.userData.operational = active;
      drone.position.y = 1.45 + Math.sin(elapsed * 1.5 + phase) * 0.12;
      drone.rotation.z = Math.sin(elapsed * 0.9 + phase) * (active ? 0.06 : 0.015);
      if (active) drone.rotation.y = elapsed * (type === "scout_drone" ? 0.34 : 0.2);
      drone.children.forEach((child, index) => {
        if (child.name === "DroneRotor") child.rotation.z = elapsed * (8 + index);
        if (child.name === "DroneLight") child.intensity = 1.5 + (Math.sin(elapsed * 3 + index) + 1) * 0.5;
        if (child.name === "HarvestArm") child.rotation.z = Math.sin(elapsed * 1.1 + index) * 0.12;
      });
    }
  };

  const emitDroneEvent = (type, root, detail = {}) => BF.ObjectEvents?.emit?.(
    type,
    hitboxOf(root) || root,
    { mapId: BF.currentEngine?.currentMapId || null, interactionSource: "drone", ...detail }
  );

  const worldEntries = (specialEntries) => {
    const byRoot = new Map(specialEntries.map((entry) => [entry.root, entry]));
    (BF.currentEngine?.currentMap?.interactables || []).forEach((hitbox) => {
      const root = hitbox.userData?.worldAnchor || hitbox.parent;
      if (!root || byRoot.has(root)) return;
      byRoot.set(root, {
        root,
        type: root.userData?.libraryType || hitbox.userData?.libraryType || "object"
      });
    });
    return [...byRoot.values()];
  };

  const updateRespawns = (entries) => {
    const now = Date.now();
    entries.forEach(({ root }) => {
      const key = instanceKey(root);
      const respawnAt = Number(state.resources[key]?.respawnAt || 0);
      const hitbox = hitboxOf(root);
      if (!respawnAt) return;
      if (respawnAt > now) {
        root.visible = false;
        if (hitbox) hitbox.userData.active = false;
        return;
      }
      root.visible = true;
      if (hitbox) hitbox.userData.active = true;
      delete state.resources[key];
      saveState();
    });
  };

  const objectWorldPoint = (root) => {
    if (!root) return null;
    if (root.getWorldPosition && BF.currentEngine?.THREE) {
      const point = new BF.currentEngine.THREE.Vector3();
      root.getWorldPosition(point);
      return point;
    }
    return root.position || null;
  };

  const zoneIndexOf = (root) => {
    const map = BF.currentEngine?.currentMap;
    const point = objectWorldPoint(root);
    if (!map || !point) return 0;
    const zones = Array.isArray(map.zoneRegions) ? map.zoneRegions : [];
    for (let index = 0; index < zones.length; index += 1) {
      const zone = zones[index];
      const center = zone.center || {};
      const half = Number(zone.halfSize) || Math.max(
        0,
        (Number(zone.maxX) - Number(zone.minX)) / 2
      );
      const minX = Number.isFinite(Number(zone.minX)) ? Number(zone.minX) : Number(center.x) - half;
      const maxX = Number.isFinite(Number(zone.maxX)) ? Number(zone.maxX) : Number(center.x) + half;
      const minZ = Number.isFinite(Number(zone.minZ)) ? Number(zone.minZ) : Number(center.z) - half;
      const maxZ = Number.isFinite(Number(zone.maxZ)) ? Number(zone.maxZ) : Number(center.z) + half;
      if (point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ) {
        return Number(zone.index ?? index);
      }
    }
    return 0;
  };

  const observableByScout = (candidate, type) => {
    if (!candidate || DRONE_TYPES.has(type) || type === "survey_beacon" && candidate.userData?.contextRole === "deployed_beacon") return false;
    if (candidate.visible === false) return false;
    const definition = candidate.userData?.functional;
    const events = new Set(definition?.observation?.events || []);
    const actions = new Set(definition?.interaction?.actions || []);
    return events.has("OBJECT_SEEN") || actions.has("observe") || definition?.knowledge?.discoverable === true;
  };

  const scout = (entries, root = null) => {
    const droneState = state.drones.scout_drone;
    const mapId = String(BF.currentEngine?.currentMapId || "");
    const now = Date.now();
    if (
      !droneState?.active ||
      String(droneState.deployedMapId || "") !== mapId ||
      now - Number(droneState.lastActionAt || 0) < 120000
    ) return false;

    const zones = Array.isArray(BF.currentEngine?.currentMap?.zoneRegions)
      ? BF.currentEngine.currentMap.zoneRegions
      : [];
    const zoneIds = zones.length
      ? zones.map((zone, index) => Number(zone.index ?? index))
      : [0];
    droneState.scannedZones = droneState.scannedZones || {};
    const mapScans = droneState.scannedZones[mapId] || {};
    const zoneId = zoneIds.find((id) => !mapScans[id]);
    if (zoneId == null) return false;

    const known = BF.getProgressionState?.().discoveries?.instances || {};
    const targets = entries.filter(({ root: candidate, type }) =>
      candidate !== root &&
      observableByScout(candidate, type) &&
      zoneIndexOf(candidate) === zoneId &&
      !known[candidate.userData?.instanceId]
    );

    targets.forEach((target) => {
      emitDroneEvent(BF.ObjectEvents.types.OBJECT_SEEN, target.root, {
        state: "scouted",
        tags: ["drone-scouted"],
        zoneId,
        quantity: 1
      });
    });
    droneState.lastActionAt = now;
    mapScans[zoneId] = { scannedAt: now, observed: targets.length };
    droneState.scannedZones[mapId] = mapScans;
    saveState();
    announce(
      targets.length
        ? `Le drone éclaireur a balayé le plateau ${zoneId + 1} : ${targets.length} éléments observables enregistrés.`
        : `Le drone éclaireur a terminé le balayage du plateau ${zoneId + 1}.`
    );
    return true;
  };

  const harvest = (entries, root) => {
    const droneState = state.drones.harvest_drone;
    const now = Date.now();
    if (!droneState?.active || now - Number(droneState.lastActionAt || 0) < 90000) return;
    const target = entries.find(({ root: candidate, type }) => {
      if (candidate === root || DRONE_TYPES.has(type) || !candidate.visible) return false;
      const definition = candidate.userData.functional;
      const tags = new Set([
        ...(definition?.spawn?.tags || []),
        ...(definition?.spawnProfile?.tags || []),
        ...(definition?.situation?.tags || [])
      ]);
      return definition?.gameplay?.collectable === true &&
        definition?.resource?.inventoryKey &&
        !tags.has("unique") && !tags.has("rare") &&
        (Number(definition?.ai?.danger) || 0) <= 0.25 &&
        (tags.has("drone-collectable") || Number(definition?.progression?.mapExpertise || 0) <= 2);
    });
    if (!target) return;
    const hitbox = hitboxOf(target.root);
    const definition = target.root.userData.functional;
    const respawnMs = Math.max(30000, Number(definition?.interaction?.respawnSeconds || 300) * 1000);
    droneState.lastActionAt = now;
    state.resources[instanceKey(target.root)] = { respawnAt: now + respawnMs };
    target.root.visible = false;
    if (hitbox) hitbox.userData.active = false;
    emitDroneEvent(BF.ObjectEvents.types.RESOURCE_COLLECTED, target.root, {
      inventoryKey: definition.resource.inventoryKey,
      kind: definition.resource.family,
      quantity: 1,
      state: "harvested-by-drone",
      tags: ["drone-harvested"]
    });
    saveState();
    announce(`Le drone récolteur rapporte : ${definition.label}.`);
  };

  const updateDrones = (entries) => {
    const scoutRoot = entries.find((entry) => entry.type === "scout_drone")?.root || null;
    const harvestRoot = entries.find((entry) => entry.type === "harvest_drone")?.root;
    scout(entries, scoutRoot);
    if (harvestRoot) harvest(entries, harvestRoot);
  };

  const runtimeCategory = (type) => {
    if (type === "npc_translucent" || type === "npc_rocky") return "npc";
    if (type === "nocturnal_animal") return "fauna";
    if (type === "carnivorous_plant") return "flora";
    return "phenomenon";
  };

  let lastBehaviorUpdate = 0;
  const update = (scene, elapsed) => {
    ensureDeployedDroneVisual("scout_drone");
    const entries = collect(scene);
    entries.forEach((entry) => {
      const budget = BF.RuntimeBudget;
      if (
        budget?.shouldUpdate &&
        !budget.shouldUpdate(entry.root, runtimeCategory(entry.type), elapsed)
      ) return;
      updateObject(entry, elapsed);
    });
    const now = Date.now();
    if (now - lastBehaviorUpdate < 1000) return;
    lastBehaviorUpdate = now;
    const allEntries = worldEntries(entries);
    updateRespawns(allEntries);
    updateDrones(allEntries);
  };

  const canCraft = (type) => {
    const recipe = RECIPES[type];
    const mapId = BF.currentEngine?.currentMapId;
    const site = mapId
      ? BF.currentEngine?.missionManager?.memory?.state?.siteProgression?.[mapId]
      : null;
    if (!recipe || state.drones[type]?.crafted || Number(site?.stage || 0) < 3) return false;
    if (BF.canAccessCampInventory && !BF.canAccessCampInventory()) return false;
    if (BF.Research?.canAccessWorkbench?.(mapId) !== true) return false;
    return Object.entries(recipe).every(([key, amount]) => (BF.availableInventory?.(key) || 0) >= amount);
  };
  const craftDrone = (type) => {
    if (!canCraft(type)) {
      announce("Assemblage impossible : ressources, Base ou proximité insuffisantes.");
      return false;
    }
    Object.entries(RECIPES[type]).forEach(([key, amount]) => BF.consumeInventoryPool?.(key, amount));
    state.drones[type] = {
      crafted: true,
      active: false,
      inKit: true,
      deployedMapId: null,
      craftedAt: Date.now(),
      lastActionAt: 0,
      scannedZones: type === "scout_drone" ? {} : undefined
    };
    saveState();
    const root = collect(BF.currentEngine?.currentMap?.group).find((entry) => entry.type === type)?.root || null;
    emitDroneEvent(BF.ObjectEvents?.types.OBJECT_CRAFTED, root, {
      droneType: type,
      recipe: RECIPES[type],
      state: "kit-ready"
    });
    emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, root, {
      droneType: type,
      state: "kit-ready",
      accumulatorConsumed: true
    });
    announce(`${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} assemblé et rangé dans le Kit d’expédition.`);
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    return true;
  };

  const setDroneActive = (type, active) => {
    if (!state.drones[type]?.crafted) return false;
    state.drones[type].active = Boolean(active);
    saveState();
    if (active) emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, null, { droneType: type, state: "active" });
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    return true;
  };

  const deployedDroneVisual = (type) => {
    const group = BF.currentEngine?.currentMap?.group;
    if (!group) return null;
    let found = null;
    group.traverse?.((node) => {
      if (!found && node?.userData?.blueFoxDeployedDrone === type) found = node;
    });
    return found;
  };

  const ensureDeployedDroneVisual = (type) => {
    const droneState = state.drones[type];
    const engine = BF.currentEngine;
    const mapId = String(engine?.currentMapId || "");
    if (!droneState?.crafted || !droneState?.deployedMapId || String(droneState.deployedMapId) !== mapId) return null;
    const existing = deployedDroneVisual(type);
    if (existing) return existing;
    if (!engine?.THREE || !engine?.currentMap?.group || !BF.ObjectSpawner) return null;
    const anchor = droneState.deployedAnchor || engine.character?.root?.position || { x: 0, y: 0, z: 0 };
    const spawner = new BF.ObjectSpawner({
      THREE: engine.THREE,
      scene: engine.currentMap.group,
      palette: BF.maps?.[mapId]?.palette
    });
    const record = spawner.spawn(type, {
      position: { x: Number(anchor.x) || 0, y: Number(anchor.y) || 0, z: Number(anchor.z) || 0 },
      force: true,
      scene: engine.currentMap.group,
      source: "deployed-drone",
      instanceId: `${mapId}:${type}:deployed`
    });
    if (!record?.root) return null;
    record.root.name = `BlueFoxDeployedDrone:${type}`;
    record.root.userData.blueFoxDeployedDrone = type;
    if (record.instance?.hitbox?.userData) record.instance.hitbox.userData.active = false;
    sceneCache.delete(engine.currentMap.group);
    return record.root;
  };

  const removeDeployedDroneVisual = (type) => {
    const root = deployedDroneVisual(type);
    if (!root) return false;
    root.parent?.remove?.(root);
    if (BF.currentEngine?.currentMap?.group) sceneCache.delete(BF.currentEngine.currentMap.group);
    return true;
  };

  const deployDrone = (type) => {
    const droneState = state.drones[type];
    const mapId = String(BF.currentEngine?.currentMapId || "");
    if (!droneState?.crafted || !mapId) return false;
    const position = BF.currentEngine?.character?.root?.position || { x: 0, y: 0, z: 0 };
    droneState.deployedMapId = mapId;
    droneState.deployedAnchor = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0,
      z: Number(position.z) || 0
    };
    droneState.inKit = false;
    droneState.active = true;
    droneState.lastActionAt = Date.now();
    saveState();
    ensureDeployedDroneVisual(type);
    emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, null, {
      droneType: type,
      state: "deployed",
      mapId,
      accumulatorConsumed: true
    });
    announce(`${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} déployé sur ${mapId}.`);
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    return true;
  };

  const recallDrone = (type, reason = "manual") => {
    const droneState = state.drones[type];
    if (!droneState?.crafted) return false;
    const previousMapId = droneState.deployedMapId || null;
    if (String(previousMapId || "") === String(BF.currentEngine?.currentMapId || "")) {
      removeDeployedDroneVisual(type);
    }
    droneState.deployedMapId = null;
    droneState.deployedAnchor = null;
    droneState.inKit = true;
    droneState.active = false;
    saveState();
    announce(`${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} rappelé dans le Kit d’expédition.`);
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", {
      detail: { ...snapshot(), recallReason: reason, previousMapId }
    }));
    return true;
  };

  const deployedBeaconRecords = (mapId) => {
    const definition = BF.maps?.[mapId];
    if (!definition || !BF.PersistentMicroScenes?.list) return [];
    return BF.PersistentMicroScenes.list(definition).filter((record) =>
      record?.persistent !== false &&
      String(record?.contextRole || record?.kind || "") === "deployed_beacon"
    );
  };
  const hasDeployedBeacon = (mapId) => deployedBeaconRecords(String(mapId || "")).length > 0;
  const getPlanetMapMarkers = (mapId) => hasDeployedBeacon(mapId)
    ? [{ type: "beacon", label: "Balise BlueFox", mapId: String(mapId) }]
    : [];

  const installBeaconAt = (placement, options = {}) => {
    const engine = BF.currentEngine;
    const mapId = String(options.mapId || engine?.currentMapId || "");
    const definition = BF.maps?.[mapId];
    if (!engine?.THREE || !engine?.currentMap || !definition || !placement?.anchor) return false;
    if (hasDeployedBeacon(mapId)) {
      announce("Une balise BlueFox est déjà implantée sur cette map.");
      return false;
    }
    const bal03Lifecycle = engine?.missionManager?.memory?.state?.missionLifecycle?.["BAL-03"];
    if (String(options.missionId || "") === "BAL-03" && bal03Lifecycle?.status === "active") {
      const fact = engine.missionManager?.memory?.getFact?.("tutorialExcursion:BAL-03", null);
      const targetMapId = String(fact?.generatedTargetMapId || "");
      if (!targetMapId || targetMapId !== mapId) {
        announce("Cette première balise doit être implantée sur le plateau distant identifié par BAL-03.");
        return false;
      }
    }
    if ((BF.availableInventory?.("deployed_beacon") || 0) < 1) {
      announce("Aucune balise transportable dans le Kit d’expédition.");
      return false;
    }
    const rotation = Array.isArray(placement.rotation) ? placement.rotation : [0, Number(placement.rotation) || 0, 0];
    const record = {
      instanceId: `${mapId}:deployed-beacon:primary`,
      missionId: options.missionId || "BAL-03",
      kind: "deployed_beacon",
      microSceneId: "MSC-DEPLOYED-BEACON-001",
      contextRole: "deployed_beacon",
      anchor: { ...placement.anchor },
      rotation: Number(rotation[1]) || 0,
      fixedAnchor: true,
      persistent: true,
      spawnOnce: true,
      createdAt: Date.now()
    };
    const removed = BF.consumeInventoryPool?.("deployed_beacon", 1) || 0;
    if (removed !== 1) return false;
    const spawned = BF.PersistentMicroScenes?.spawnRecord?.(
      engine.THREE,
      engine.currentMap,
      definition,
      record
    );
    if (!spawned) {
      BF.progression?.addInventory?.("deployed_beacon", 1);
      BF.progression?.save?.();
      BF.progression?.publishChange?.("beacon-placement-refund", { mapId, quantity: 1 });
      return false;
    }
    // spawnRecord persiste déjà le record via MissionMemory ; ensure l'inscrit
    // aussi immédiatement dans la définition runtime afin que les consommateurs
    // (marqueur Planète, relais drone) le voient sans attendre un reload/hydrate.
    BF.PersistentMicroScenes?.ensure?.(definition, record);
    sceneCache.delete(engine.currentMap.group);
    update(engine.currentMap.group, Number(engine.clock?.elapsedTime) || 0);
    announce("Balise BlueFox implantée. Sa tête violette identifie ce relais comme une installation personnelle.");
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    global.dispatchEvent(new CustomEvent("bluefox:site-established", {
      detail: { missionId: options.missionId || "BAL-03", mapId, kind: "deployed_beacon" }
    }));
    return true;
  };

  const deployBeacon = (options = {}) => {
    const engine = BF.currentEngine;
    const mapId = String(engine?.currentMapId || "");
    if (!mapId || (BF.availableInventory?.("deployed_beacon") || 0) < 1) return false;
    if (hasDeployedBeacon(mapId)) return false;
    const source = options.source || "player";
    if (source === "autonomy") {
      const placement = BF.MicroScenePlacement?.suggest?.({
        id: `deployed-beacon:${mapId}`,
        microSceneId: "MSC-DEPLOYED-BEACON-001"
      }, engine);
      return placement ? installBeaconAt(placement, { ...options, mapId }) : false;
    }
    return BF.MicroScenePlacement?.start?.({
      id: `deployed-beacon:${mapId}`,
      missionId: options.missionId || "BAL-03",
      mapId,
      microSceneId: "MSC-DEPLOYED-BEACON-001",
      kind: "deployed_beacon",
      label: "la balise",
      onInstall: (placement) => installBeaconAt(placement, { ...options, mapId })
    }) === true;
  };

  const snapshot = () => JSON.parse(JSON.stringify({
    ...state,
    drones: Object.fromEntries(Object.entries(state.drones || {}).map(([type, drone]) => [type, {
      ...drone,
      inKit: drone.inKit ?? Boolean(drone.crafted && !drone.deployedMapId)
    }])),
    recipes: RECIPES
  }));

  const onMapTransitionCompleted = (event) => {
    const detail = event?.detail || {};
    const fromMapId = String(detail.fromMapId || "");
    const scoutState = state.drones.scout_drone;
    if (
      scoutState?.crafted &&
      fromMapId &&
      String(scoutState.deployedMapId || "") === fromMapId &&
      !hasDeployedBeacon(fromMapId)
    ) {
      recallDrone("scout_drone", "map-exit-without-beacon");
    }
  };
  global.addEventListener?.("bluefox:map-transition-completed", onMapTransitionCompleted);

  const baseBuildMap = BF.buildMap;
  if (typeof baseBuildMap === "function" && !baseBuildMap.specialObjectRuntimeWrapped) {
    const wrappedBuildMap = function buildMapWithSpecialObjectRuntime(...args) {
      const built = baseBuildMap.apply(this, args);
      const baseUpdate = built.update;
      built.update = function updateSpecialObjects(elapsed) {
        baseUpdate?.call(this, elapsed);
        update(built.group, elapsed);
      };
      return built;
    };
    wrappedBuildMap.specialObjectRuntimeWrapped = true;
    BF.buildMap = wrappedBuildMap;
  }

  BF.getPlanetMapMarkers = BF.getPlanetMapMarkers || ((mapId) => getPlanetMapMarkers(mapId));

  BF.SpecialObjectRuntime = Object.freeze({
    types: Object.freeze([...SPECIAL_TYPES]),
    collect,
    update,
    recipes: RECIPES,
    snapshot,
    canCraft,
    craftDrone,
    setDroneActive,
    deployDrone,
    recallDrone,
    deployBeacon,
    installBeaconAt,
    hasDeployedBeacon,
    getPlanetMapMarkers,
    invalidate(scene) { if (scene) sceneCache.delete(scene); }
  });
})(window);
