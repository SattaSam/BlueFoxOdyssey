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
  const MAX_HARVEST_DRONES = 4;
  const HARVEST_CARGO_CAPACITY = 150;
  const HARVEST_INTERVAL_MS = 90000;
  const SCOUT_INTERVAL_MS = 120000;
  const OFFLINE_INTERVAL_MULTIPLIER = 2;
  const RECIPES = Object.freeze({
    scout_drone: Object.freeze({ accumulator: 1, core: 2, parts: 10, energy_crystal: 2, magnetic_ore: 12 }),
    harvest_drone: Object.freeze({ accumulator: 1, core: 2, parts: 15, energy_crystal: 3, magnetic_ore: 30, stellar_iridium: 6 })
  });
  const defaultState = () => ({ version: 1, drones: {}, harvestFleet: [], resources: {}, lastRuntimeAt: Date.now() });
  const loadState = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      return saved?.version === 1
        ? {
          ...defaultState(),
          ...saved,
          drones: { ...(saved.drones || {}) },
          harvestFleet: Array.isArray(saved.harvestFleet)
            ? saved.harvestFleet.map((entry) => ({ ...entry, cargo: { ...(entry?.cargo || {}) } }))
            : [],
          resources: { ...(saved.resources || {}) }
        }
        : defaultState();
    } catch {
      return defaultState();
    }
  };
  const state = loadState();
  if (!state.harvestFleet.length && state.drones.harvest_drone?.crafted) {
    state.harvestFleet.push({
      id: "harvest-1",
      crafted: true,
      active: Boolean(state.drones.harvest_drone.active),
      inKit: state.drones.harvest_drone.inKit !== false,
      deployedMapId: state.drones.harvest_drone.deployedMapId || null,
      deployedAnchor: state.drones.harvest_drone.deployedAnchor || null,
      priority: "collect_all",
      cargo: {},
      cargoTotal: 0,
      craftedAt: state.drones.harvest_drone.craftedAt || Date.now(),
      lastActionAt: state.drones.harvest_drone.lastActionAt || 0
    });
  }
  const saveState = () => {
    state.lastRuntimeAt = Date.now();
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };
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
      const droneState = type === "harvest_drone"
        ? (state.harvestFleet || []).find((entry) =>
            entry.id === root.userData?.blueFoxHarvestDroneId
          ) || state.drones[type]
        : state.drones[type];
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
    { mapId: detail.mapId || BF.currentEngine?.currentMapId || null, interactionSource: "drone", ...detail }
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

  const zoneIndexForPoint = (point, map = BF.currentEngine?.currentMap) => {
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

  const zoneIndexOf = (root) =>
    zoneIndexForPoint(objectWorldPoint(root));

  const zoneLabelFor = (mapId, zoneId) => {
    const definition = BF.maps?.[String(mapId || "")] || null;
    const labels = Array.isArray(definition?.zones) ? definition.zones : [];
    return String(labels[Number(zoneId) || 0] || `Plateau ${(Number(zoneId) || 0) + 1}`);
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

  const harvestFleet = () => state.harvestFleet || (state.harvestFleet = []);
  const harvestById = (id) =>
    harvestFleet().find((entry) => entry.id === String(id || "")) || null;
  const cargoTotal = (drone) =>
    Object.values(drone?.cargo || {}).reduce(
      (sum, amount) => sum + Math.max(0, Number(amount) || 0),
      0
    );
  const definitionTags = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.situation?.tags || [])
  ].map((tag) => String(tag).toLowerCase()));
  const harvestEligibleDefinition = (definition) => {
    if (definition?.gameplay?.collectable !== true || !definition?.resource?.inventoryKey) {
      return false;
    }
    const tags = definitionTags(definition);
    if (
      tags.has("construction") ||
      tags.has("decorative") ||
      tags.has("decoration")
    ) return false;
    const missionLockedUnique =
      tags.has("unique") &&
      (
        tags.has("mission") ||
        tags.has("mission-locked") ||
        definition?.missionLocked === true ||
        definition?.gameplay?.missionLocked === true
      );
    return !missionLockedUnique;
  };
  const knownResourceInstances = (mapId) => {
    const discoveries = BF.getProgressionState?.().discoveries?.instances || {};
    return Object.entries(discoveries)
      .map(([instanceId, record]) => ({ instanceId, ...(record || {}) }))
      .filter((record) => String(record.mapId || "") === String(mapId || ""))
      .map((record) => ({
        ...record,
        definition: BF.ObjectLibrary?.getById?.(record.objectId) || null
      }))
      .filter((record) => harvestEligibleDefinition(record.definition));
  };
  const knownPriorityKeys = (mapId) =>
    [...new Set(
      knownResourceInstances(mapId)
        .map((record) => record.definition.resource.inventoryKey)
    )].sort();
  const captureHarvestManifest = (drone) => {
    const mapId = String(BF.currentEngine?.currentMapId || "");
    if (!drone || !mapId || String(drone.deployedMapId || "") !== mapId) {
      return false;
    }
    const entries = worldEntries(collect(BF.currentEngine?.currentMap?.group));
    drone.remoteManifest = entries
      .filter(({ root, type }) =>
        !DRONE_TYPES.has(type) &&
        root?.visible !== false &&
        harvestEligibleDefinition(root?.userData?.functional)
      )
      .map(({ root }) => ({
        objectId:
          root.userData?.functional?.id ||
          root.userData?.catalogId ||
          null,
        instanceId: root.userData?.instanceId || instanceKey(root),
        zoneId: zoneIndexOf(root)
      }))
      .filter((item) => item.objectId);
    return true;
  };
  const remoteHarvestRecords = (drone) => {
    const manifest = Array.isArray(drone?.remoteManifest)
      ? drone.remoteManifest
      : [];
    return manifest
      .map((record) => ({
        ...record,
        definition: BF.ObjectLibrary?.getById?.(record.objectId) || null
      }))
      .filter((record) => harvestEligibleDefinition(record.definition));
  };
  const availablePriorities = (droneId) => {
    const drone = harvestById(droneId);
    if (!drone?.deployedMapId) return ["collect_all"];
    const known = new Set(knownPriorityKeys(drone.deployedMapId));
    const physicallyAvailable = new Set(
      remoteHarvestRecords(drone)
        .map((record) => record.definition?.resource?.inventoryKey)
        .filter(Boolean)
    );
    return [
      "collect_all",
      ...[...known].filter((key) => physicallyAvailable.has(key)).sort()
    ];
  };
  const syntheticSource = (record) => ({
    userData: {
      catalogId: record.definition?.id || record.objectId || null,
      instanceId: record.instanceId || null,
      functional: record.definition || {}
    }
  });
  const chooseRemoteRecord = (drone, now = Date.now()) => {
    const records = remoteHarvestRecords(drone)
      .filter((record) =>
        Number(
          state.resources[
            `remote:${drone.deployedMapId}:${record.instanceId}`
          ]?.respawnAt || 0
        ) <= now
      );
    if (!records.length) return null;
    const priority = String(drone.priority || "collect_all");
    return records.find((record) =>
      priority !== "collect_all" &&
      record.definition.resource.inventoryKey === priority
    ) || records[0];
  };
  const depositCargo = (drone, reason = "capacity") => {
    if (!drone) return 0;
    const total = cargoTotal(drone);
    if (!total) return 0;
    let deposited = 0;
    Object.entries(drone.cargo || {}).forEach(([key, amount]) => {
      deposited += BF.grantCampStorage?.(key, amount, {
        source: "drone-cargo",
        reason,
        mapId: drone.deployedMapId,
        droneId: drone.id
      }) || 0;
    });
    if (!deposited) return 0;
    drone.cargo = {};
    drone.cargoTotal = 0;
    drone.lastDepositAt = Date.now();
    emitDroneEvent(
      BF.ObjectEvents?.types.DRONE_CARGO_DEPOSITED,
      null,
      {
        droneType: "harvest_drone",
        droneId: drone.id,
        mapId: drone.deployedMapId,
        quantity: deposited,
        state: "cargo-deposited",
        reason
      }
    );
    saveState();
    return deposited;
  };
  const addCargo = (drone, key, quantity) => {
    drone.cargo ||= {};
    drone.cargo[key] = (Number(drone.cargo[key]) || 0) + quantity;
    drone.cargoTotal = cargoTotal(drone);
    if (drone.cargoTotal >= HARVEST_CARGO_CAPACITY) {
      depositCargo(drone, "capacity");
    }
  };
  const remoteHarvestOnce = (drone, options = {}) => {
    if (
      !drone?.active ||
      !drone.deployedMapId ||
      !hasDeployedBeacon(drone.deployedMapId)
    ) return false;
    if (
      String(BF.currentEngine?.currentMapId || "") ===
        String(drone.deployedMapId) &&
      options.forceRemote !== true
    ) return false;
    const now = Number(options.now) || Date.now();
    const record = chooseRemoteRecord(drone, now);
    if (!record) return false;
    const definition = record.definition;
    const key = definition.resource.inventoryKey;
    const quantity = Math.max(1, Number(options.quantity) || 1);
    const respawnMs = Math.max(
      30000,
      Number(definition?.interaction?.respawnSeconds || 300) * 1000
    );
    state.resources[`remote:${drone.deployedMapId}:${record.instanceId}`] = {
      respawnAt: now + respawnMs
    };
    drone.lastActionAt = now;
    emitDroneEvent(
      BF.ObjectEvents.types.RESOURCE_COLLECTED,
      syntheticSource(record),
      {
        droneType: "harvest_drone",
        droneId: drone.id,
        mapId: drone.deployedMapId,
        inventoryKey: key,
        kind: definition.resource.family,
        quantity,
        inventoryCredit: false,
        remote: true,
        state: "harvested-by-drone",
        tags: ["drone-harvested", "remote"]
      }
    );
    addCargo(drone, key, quantity);
    saveState();
    return true;
  };

  const harvest = (entries, root, drone) => {
    const now = Date.now();
    if (
      !drone?.active ||
      String(drone.deployedMapId || "") !==
        String(BF.currentEngine?.currentMapId || "") ||
      now - Number(drone.lastActionAt || 0) < HARVEST_INTERVAL_MS
    ) return false;
    const candidates = entries.filter(({ root: candidate, type }) => {
      if (
        candidate === root ||
        DRONE_TYPES.has(type) ||
        candidate.visible === false
      ) return false;
      return harvestEligibleDefinition(candidate.userData?.functional);
    });
    const priority = String(drone.priority || "collect_all");
    const target = candidates.find(({ root: candidate }) =>
      priority !== "collect_all" &&
      candidate.userData?.functional?.resource?.inventoryKey === priority
    ) || candidates[0];
    if (!target) return false;
    const hitbox = hitboxOf(target.root);
    const definition = target.root.userData.functional;
    const respawnMs = Math.max(
      30000,
      Number(definition?.interaction?.respawnSeconds || 300) * 1000
    );
    drone.lastActionAt = now;
    state.resources[instanceKey(target.root)] = { respawnAt: now + respawnMs };
    target.root.visible = false;
    if (hitbox) hitbox.userData.active = false;
    emitDroneEvent(
      BF.ObjectEvents.types.RESOURCE_COLLECTED,
      target.root,
      {
        droneType: "harvest_drone",
        droneId: drone.id,
        mapId: drone.deployedMapId,
        inventoryKey: definition.resource.inventoryKey,
        kind: definition.resource.family,
        quantity: 1,
        inventoryCredit: false,
        remote: false,
        state: "harvested-by-drone",
        tags: ["drone-harvested"]
      }
    );
    addCargo(drone, definition.resource.inventoryKey, 1);
    saveState();
    return true;
  };

  const updateDrones = (entries) => {
    const scoutRoot =
      entries.find((entry) => entry.type === "scout_drone")?.root || null;
    scout(entries, scoutRoot);
    remoteScout();
    harvestFleet().forEach((drone) => {
      if (!drone.active) return;
      if (
        String(drone.deployedMapId || "") ===
        String(BF.currentEngine?.currentMapId || "")
      ) {
        const root = entries.find((entry) =>
          entry.root?.userData?.blueFoxHarvestDroneId === drone.id
        )?.root ||
          entries.find((entry) => entry.type === "harvest_drone")?.root ||
          null;
        harvest(entries, root, drone);
      } else if (
        Date.now() - Number(drone.lastActionAt || 0) >= HARVEST_INTERVAL_MS
      ) {
        remoteHarvestOnce(drone);
      }
    });
  };

  const runtimeCategory = (type) => {
    if (type === "npc_translucent" || type === "npc_rocky") return "npc";
    if (type === "nocturnal_animal") return "fauna";
    if (type === "carnivorous_plant") return "flora";
    return "phenomenon";
  };

  const emitOfflineHarvestCollection = (drone, record, quantity) => {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!amount) return 0;
    emitDroneEvent(
      BF.ObjectEvents.types.RESOURCE_COLLECTED,
      syntheticSource(record),
      {
        droneType: "harvest_drone",
        droneId: drone.id,
        mapId: drone.deployedMapId,
        inventoryKey: record.definition.resource.inventoryKey,
        kind: record.definition.resource.family,
        quantity: amount,
        inventoryCredit: false,
        remote: true,
        offline: true,
        state: "harvested-by-drone-offline",
        tags: ["drone-harvested", "remote", "offline"]
      }
    );
    return amount;
  };

  const applyOfflineHarvestCargo = (drone, record, quantity) => {
    let remaining = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!remaining) return 0;
    const key = record.definition.resource.inventoryKey;
    const original = remaining;

    // Complète d'abord le cargo déjà en cours : s'il atteint 150, le
    // mécanisme normal effectue son dépôt canonique.
    const current = cargoTotal(drone);
    if (current > 0 && current < HARVEST_CARGO_CAPACITY) {
      const take = Math.min(remaining, HARVEST_CARGO_CAPACITY - current);
      emitOfflineHarvestCollection(drone, record, take);
      addCargo(drone, key, take);
      remaining -= take;
    }

    // Les cargaisons complètes sont agrégées CPU-side, mais représentent bien
    // des retours logiques successifs de 150 unités. Aucun tick de 90 s n'est
    // rejoué individuellement.
    const fullLoads = Math.floor(remaining / HARVEST_CARGO_CAPACITY);
    if (fullLoads > 0) {
      const fullQuantity = fullLoads * HARVEST_CARGO_CAPACITY;
      emitOfflineHarvestCollection(drone, record, fullQuantity);
      const deposited = BF.grantCampStorage?.(key, fullQuantity, {
        source: "drone-cargo",
        reason: "offline-capacity",
        mapId: drone.deployedMapId,
        droneId: drone.id,
        cargoLoads: fullLoads
      }) || 0;
      if (deposited > 0) {
        emitDroneEvent(
          BF.ObjectEvents?.types.DRONE_CARGO_DEPOSITED,
          null,
          {
            droneType: "harvest_drone",
            droneId: drone.id,
            mapId: drone.deployedMapId,
            quantity: deposited,
            cargoLoads: fullLoads,
            cargoCapacity: HARVEST_CARGO_CAPACITY,
            offline: true,
            state: "cargo-deposited",
            reason: "offline-capacity"
          }
        );
      }
      remaining -= fullQuantity;
    }

    // Le reliquat reste dans le cargo courant et reprendra au prochain cycle.
    if (remaining > 0) {
      emitOfflineHarvestCollection(drone, record, remaining);
      addCargo(drone, key, remaining);
    }
    return original;
  };

  const offlineRecordCapacity = (drone, record, elapsed, sessionEndedAt) => {
    const interval = HARVEST_INTERVAL_MS * OFFLINE_INTERVAL_MULTIPLIER;
    if (!drone || !record || elapsed < interval) return 0;
    const respawnMs = Math.max(
      30000,
      Number(record.definition?.interaction?.respawnSeconds || 300) * 1000
    );
    const resourceKey = `remote:${drone.deployedMapId}:${record.instanceId}`;
    const pendingRespawnAt = Number(state.resources[resourceKey]?.respawnAt || 0);
    const pendingDelay = Math.max(0, pendingRespawnAt - sessionEndedAt);
    const firstSlot = Math.ceil(
      Math.max(interval, pendingDelay) / interval
    ) * interval;
    if (firstSlot > elapsed) return 0;
    const slotGap = Math.max(
      interval,
      Math.ceil(respawnMs / interval) * interval
    );
    return 1 + Math.floor((elapsed - firstSlot) / slotGap);
  };

  const applyOfflineRecordHarvest = (
    drone,
    record,
    quantity,
    elapsed,
    sessionEndedAt
  ) => {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!amount) return 0;
    const interval = HARVEST_INTERVAL_MS * OFFLINE_INTERVAL_MULTIPLIER;
    const respawnMs = Math.max(
      30000,
      Number(record.definition?.interaction?.respawnSeconds || 300) * 1000
    );
    const resourceKey = `remote:${drone.deployedMapId}:${record.instanceId}`;
    const pendingRespawnAt = Number(state.resources[resourceKey]?.respawnAt || 0);
    const pendingDelay = Math.max(0, pendingRespawnAt - sessionEndedAt);
    const firstSlot = Math.ceil(
      Math.max(interval, pendingDelay) / interval
    ) * interval;
    const slotGap = Math.max(
      interval,
      Math.ceil(respawnMs / interval) * interval
    );
    const lastHarvestDelay = Math.min(
      elapsed,
      firstSlot + Math.max(0, amount - 1) * slotGap
    );
    state.resources[resourceKey] = {
      respawnAt: sessionEndedAt + lastHarvestDelay + respawnMs
    };
    return applyOfflineHarvestCargo(drone, record, amount);
  };

  let offlineCatchupDone = false;
  const runOfflineCatchup = () => {
    if (offlineCatchupDone) return false;
    offlineCatchupDone = true;
    const now = Date.now();
    const sessionEndedAt = Number(state.lastRuntimeAt || now);
    const elapsed = Math.max(0, now - sessionEndedAt);
    const interval = HARVEST_INTERVAL_MS * OFFLINE_INTERVAL_MULTIPLIER;
    const maxActions = Math.floor(elapsed / interval);
    if (maxActions <= 0) return false;

    let changed = false;
    harvestFleet().forEach((drone) => {
      if (
        !drone.active ||
        !drone.deployedMapId ||
        !hasDeployedBeacon(drone.deployedMapId)
      ) return;
      const records = remoteHarvestRecords(drone);
      if (!records.length) return;
      const priority = String(drone.priority || "collect_all");
      const ordered = [
        ...records.filter((record) =>
          priority !== "collect_all" &&
          record.definition.resource.inventoryKey === priority
        ),
        ...records.filter((record) =>
          priority === "collect_all" ||
          record.definition.resource.inventoryKey !== priority
        )
      ];
      let remainingActions = maxActions;
      let droneChanged = false;
      ordered.forEach((record) => {
        if (remainingActions <= 0) return;
        const capacity = offlineRecordCapacity(
          drone,
          record,
          elapsed,
          sessionEndedAt
        );
        const take = Math.min(remainingActions, capacity);
        if (!take) return;
        applyOfflineRecordHarvest(
          drone,
          record,
          take,
          elapsed,
          sessionEndedAt
        );
        remainingActions -= take;
        droneChanged = true;
      });
      if (droneChanged) {
        drone.lastActionAt = now;
        changed = true;
      }
    });
    if (changed) saveState();
    return changed;
  };

  let lastBehaviorUpdate = 0;
  const update = (scene, elapsed) => {
    runOfflineCatchup();
    ensureDeployedDroneVisual("scout_drone");
    harvestFleet().forEach((drone) =>
      ensureDeployedDroneVisual("harvest_drone", drone.id)
    );
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
    const hasBase = Boolean(
      site?.sites?.base ||
      site?.kind === "base" ||
      Number(site?.stage || 0) >= 3
    );
    if (!recipe || !hasBase) return false;
    if (type === "scout_drone" && state.drones[type]?.crafted) return false;
    if (type === "harvest_drone" && harvestFleet().length >= MAX_HARVEST_DRONES) return false;
    if (
      type === "harvest_drone" &&
      BF.Research?.isUnlocked?.("harvest-drone-blueprint-v1") !== true
    ) return false;
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
    let craftedRecord;
    if (type === "harvest_drone") {
      craftedRecord = {
        id: `harvest-${harvestFleet().length + 1}`,
        crafted: true,
        active: false,
        inKit: true,
        deployedMapId: null,
        deployedAnchor: null,
        priority: "collect_all",
        cargo: {},
        cargoTotal: 0,
        craftedAt: Date.now(),
        lastActionAt: 0
      };
      harvestFleet().push(craftedRecord);
      state.drones.harvest_drone = {
        crafted: true,
        count: harvestFleet().length,
        active: harvestFleet().some((entry) => entry.active)
      };
    } else {
      craftedRecord = state.drones[type] = {
        crafted: true,
        active: false,
        inKit: true,
        deployedMapId: null,
        craftedAt: Date.now(),
        lastActionAt: 0,
        scannedZones: {}
      };
    }
    saveState();
    const root = collect(BF.currentEngine?.currentMap?.group).find((entry) => entry.type === type)?.root || null;
    emitDroneEvent(BF.ObjectEvents?.types.OBJECT_CRAFTED, root, {
      droneType: type,
      droneId: craftedRecord?.id || type,
      recipe: RECIPES[type],
      state: "kit-ready"
    });
    emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, root, {
      droneType: type,
      droneId: craftedRecord?.id || type,
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

  const deployedDroneVisual = (type, droneId = null) => {
    const group = BF.currentEngine?.currentMap?.group;
    if (!group) return null;
    let found = null;
    group.traverse?.((node) => {
      if (found || node?.userData?.blueFoxDeployedDrone !== type) return;
      if (
        type === "harvest_drone" &&
        String(node.userData?.blueFoxHarvestDroneId || "") !== String(droneId || "")
      ) return;
      found = node;
    });
    return found;
  };

  const droneRecord = (type, droneId = null) =>
    type === "harvest_drone"
      ? harvestById(droneId)
      : state.drones[type];

  const ensureDeployedDroneVisual = (type, droneId = null) => {
    const droneState = droneRecord(type, droneId);
    const engine = BF.currentEngine;
    const mapId = String(engine?.currentMapId || "");
    if (
      !droneState?.crafted ||
      !droneState?.deployedMapId ||
      String(droneState.deployedMapId) !== mapId
    ) return null;
    const visualId = droneState.id || droneId || type;
    const existing = deployedDroneVisual(type, visualId);
    if (existing) return existing;
    if (!engine?.THREE || !engine?.currentMap?.group || !BF.ObjectSpawner) return null;
    const anchor = droneState.deployedAnchor ||
      engine.character?.root?.position || { x: 0, y: 0, z: 0 };
    const spawner = new BF.ObjectSpawner({
      THREE: engine.THREE,
      scene: engine.currentMap.group,
      palette: BF.maps?.[mapId]?.palette
    });
    const record = spawner.spawn(type, {
      position: {
        x: Number(anchor.x) || 0,
        y: Number(anchor.y) || 0,
        z: Number(anchor.z) || 0
      },
      force: true,
      scene: engine.currentMap.group,
      source: "deployed-drone",
      instanceId: `${mapId}:${type}:${visualId}`
    });
    if (!record?.root) return null;
    record.root.name = `BlueFoxDeployedDrone:${type}:${visualId}`;
    record.root.userData.blueFoxDeployedDrone = type;
    if (type === "harvest_drone") {
      record.root.userData.blueFoxHarvestDroneId = visualId;
    }
    if (record.instance?.hitbox?.userData) record.instance.hitbox.userData.active = false;
    sceneCache.delete(engine.currentMap.group);
    return record.root;
  };

  const removeDeployedDroneVisual = (type, droneId = null) => {
    const visualId = type === "harvest_drone" ? droneId : type;
    const root = deployedDroneVisual(type, visualId);
    if (!root) return false;
    root.parent?.remove?.(root);
    if (BF.currentEngine?.currentMap?.group) {
      sceneCache.delete(BF.currentEngine.currentMap.group);
    }
    return true;
  };

  const captureScoutManifest = () => {
    const mapId = String(BF.currentEngine?.currentMapId || "");
    const scoutState = state.drones.scout_drone;
    if (!scoutState?.crafted || !mapId) return false;
    const entries = worldEntries(collect(BF.currentEngine?.currentMap?.group));
    scoutState.remoteManifest = entries
      .filter(({ root, type }) => observableByScout(root, type))
      .map(({ root, type }) => ({
        objectId:
          root.userData?.functional?.id ||
          root.userData?.catalogId ||
          null,
        instanceId:
          root.userData?.instanceId || instanceKey(root),
        zoneId: zoneIndexOf(root),
        type
      }))
      .filter((item) => item.objectId);
    return true;
  };

  const remoteScout = () => {
    const drone = state.drones.scout_drone;
    if (
      !drone?.active ||
      !drone.deployedMapId ||
      !hasDeployedBeacon(drone.deployedMapId)
    ) return false;
    if (
      String(BF.currentEngine?.currentMapId || "") ===
      String(drone.deployedMapId)
    ) return false;
    const now = Date.now();
    if (now - Number(drone.lastActionAt || 0) < SCOUT_INTERVAL_MS) return false;
    const scans = drone.scannedZones ||= {};
    const mapScans = scans[drone.deployedMapId] ||= {};
    const manifest = Array.isArray(drone.remoteManifest)
      ? drone.remoteManifest
      : [];
    const zones = [...new Set(
      manifest.map((item) => Number(item.zoneId) || 0)
    )].sort((left, right) => left - right);
    const zoneId = zones.find((id) => !mapScans[id]);
    if (zoneId == null) return false;
    const known = BF.getProgressionState?.().discoveries?.instances || {};
    const targets = manifest.filter(
      (item) =>
        (Number(item.zoneId) || 0) === zoneId &&
        !known[item.instanceId]
    );
    targets.forEach((item) => {
      const definition = BF.ObjectLibrary?.getById?.(item.objectId);
      if (!definition) return;
      emitDroneEvent(
        BF.ObjectEvents.types.OBJECT_SEEN,
        {
          userData: {
            catalogId: item.objectId,
            instanceId: item.instanceId,
            functional: definition
          }
        },
        {
          droneType: "scout_drone",
          mapId: drone.deployedMapId,
          zoneId,
          state: "scouted",
          tags: ["drone-scouted", "remote"],
          quantity: 1,
          remote: true
        }
      );
    });
    mapScans[zoneId] = { scannedAt: now, observed: targets.length };
    drone.lastActionAt = now;
    saveState();
    return true;
  };

  const deployDrone = (type, droneId = null) => {
    const mapId = String(BF.currentEngine?.currentMapId || "");
    if (!mapId) return false;
    const droneState = type === "harvest_drone"
      ? harvestById(droneId)
      : state.drones[type];
    if (!droneState?.crafted) return false;
    if (type === "harvest_drone" && !hasDeployedBeacon(mapId)) {
      announce(
        "Un Harvest ne peut être laissé en autonomie distante que sur une map équipée d'une balise BlueFox."
      );
      return false;
    }
    const position = BF.currentEngine?.character?.root?.position || {
      x: 0, y: 0, z: 0
    };
    droneState.deployedMapId = mapId;
    droneState.deployedAnchor = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0,
      z: Number(position.z) || 0
    };
    droneState.deployedZoneId = zoneIndexForPoint(position);
    droneState.deployedZoneLabel = zoneLabelFor(
      mapId,
      droneState.deployedZoneId
    );
    droneState.inKit = false;
    droneState.active = true;
    droneState.lastActionAt = Date.now();
    if (type === "scout_drone") captureScoutManifest();
    if (type === "harvest_drone") {
      captureHarvestManifest(droneState);
      state.drones.harvest_drone ||= { crafted: true };
      state.drones.harvest_drone.active = harvestFleet().some((entry) => entry.active);
      state.drones.harvest_drone.count = harvestFleet().length;
    }
    saveState();
    ensureDeployedDroneVisual(type, droneState.id || type);
    emitDroneEvent(
      BF.ObjectEvents?.types.DRONE_ACTIVATED,
      null,
      {
        droneType: type,
        droneId: droneState.id || type,
        state: "deployed",
        mapId,
        beaconLinked: hasDeployedBeacon(mapId),
        accumulatorConsumed: true
      }
    );
    announce(
      `${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} déployé sur ${mapId}.`
    );
    global.dispatchEvent(new CustomEvent(
      "bluefox:special-objects-changed",
      { detail: snapshot() }
    ));
    return true;
  };

  const recallDrone = (type, reason = "manual", droneId = null) => {
    const droneState = type === "harvest_drone"
      ? harvestById(droneId)
      : state.drones[type];
    if (!droneState?.crafted) return false;
    const previousMapId = droneState.deployedMapId || null;
    if (
      String(previousMapId || "") ===
        String(BF.currentEngine?.currentMapId || "")
    ) {
      removeDeployedDroneVisual(type, droneState.id || droneId || type);
    }
    droneState.deployedMapId = null;
    droneState.deployedAnchor = null;
    droneState.deployedZoneId = null;
    droneState.deployedZoneLabel = null;
    droneState.inKit = true;
    droneState.active = false;
    if (type === "harvest_drone") {
      state.drones.harvest_drone ||= { crafted: true };
      state.drones.harvest_drone.active = harvestFleet().some((entry) => entry.active);
      state.drones.harvest_drone.count = harvestFleet().length;
    }
    saveState();
    announce(
      `${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} rappelé.`
    );
    global.dispatchEvent(new CustomEvent(
      "bluefox:special-objects-changed",
      {
        detail: {
          ...snapshot(),
          recallReason: reason,
          previousMapId
        }
      }
    ));
    return true;
  };

  const setHarvestPriority = (droneId, priority) => {
    const drone = harvestById(droneId);
    if (!drone) return false;
    const allowed = availablePriorities(droneId);
    const next = String(priority || "collect_all");
    if (!allowed.includes(next)) return false;
    drone.priority = next;
    saveState();
    emitDroneEvent(
      BF.ObjectEvents?.types.DRONE_PRIORITY_CHANGED,
      null,
      {
        droneType: "harvest_drone",
        droneId: drone.id,
        mapId: drone.deployedMapId,
        priority: next,
        state: "priority-changed"
      }
    );
    global.dispatchEvent(new CustomEvent(
      "bluefox:special-objects-changed",
      { detail: snapshot() }
    ));
    return true;
  };

  const noteConsoleViewed = () => {
    emitDroneEvent(
      BF.ObjectEvents?.types.DRONE_CONSOLE_VIEWED,
      null,
      {
        droneType: "harvest_drone",
        state: "console-viewed"
      }
    );
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
  const getPlanetMapMarkers = (mapId) => {
    const target = String(mapId || "");
    const markers = [];
    if (hasDeployedBeacon(target)) {
      markers.push({ type: "beacon", label: "Balise BlueFox", mapId: target });
    }
    if (String(state.drones.scout_drone?.deployedMapId || "") === target) {
      markers.push({ type: "drone", label: "Scout", mapId: target });
    }
    harvestFleet()
      .filter((drone) => String(drone.deployedMapId || "") === target)
      .forEach((drone, index) => markers.push({
        type: "drone",
        label: `Harvest ${index + 1}`,
        mapId: target,
        droneId: drone.id
      }));
    return markers;
  };

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
    drones: Object.fromEntries(
      Object.entries(state.drones || {}).map(([type, drone]) => [type, {
        ...drone,
        inKit: drone.inKit ?? Boolean(drone.crafted && !drone.deployedMapId)
      }])
    ),
    harvestFleet: harvestFleet().map((drone) => ({
      ...drone,
      cargoTotal: cargoTotal(drone)
    })),
    recipes: RECIPES,
    maxHarvestDrones: MAX_HARVEST_DRONES,
    cargoCapacity: HARVEST_CARGO_CAPACITY
  }));

  const consoleState = () => ({
    unlocked:
      BF.Research?.isUnlocked?.("harvest-drone-blueprint-v1") === true,
    maxSlots: MAX_HARVEST_DRONES,
    cargoCapacity: HARVEST_CARGO_CAPACITY,
    harvestFleet: snapshot().harvestFleet.map((drone) => ({
      ...drone,
      priorities: availablePriorities(drone.id)
    })),
    canCraftHarvest: canCraft("harvest_drone")
  });

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
  global.addEventListener?.("beforeunload", () => saveState());

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
    harvestFleet: () => snapshot().harvestFleet,
    consoleState,
    availablePriorities,
    setHarvestPriority,
    noteConsoleViewed,
    depositCargo: (droneId) => depositCargo(harvestById(droneId), "manual"),
    hasDeployedBeacon,
    getPlanetMapMarkers,
    invalidate(scene) { if (scene) sceneCache.delete(scene); }
  });
})(window);
