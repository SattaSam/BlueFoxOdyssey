(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const catalog = () =>
    Array.isArray(BF.BibleCatalog)
      ? BF.BibleCatalog
      : Object.values(BF.BibleCatalog || {});

  const missionById = (missionId) =>
    catalog().find((mission) => mission?.id === missionId) || null;

  const missionStatus = (engine, missionId) =>
    engine?.missionManager?.memory?.state?.missionLifecycle?.[missionId]?.status || null;

  const activeEventDrivenTravelNode = (engine, mission) => {
    if (!mission?.id) return null;
    const tree = engine?.missionManager?.trees?.get?.(mission.id);
    return tree?.availableLeaves?.().find((node) =>
      !node.isComplete &&
      node.params?.eventDriven === true &&
      BF.Missions?.normalizeActionType?.(node.type) === BF.Missions?.ActionType?.TRAVEL
    ) || null;
  };

  const parsedMissionEvidence = (node) =>
    (node?.historyValues || []).map((value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed?.owner === "object-m0" ? parsed.evidence || null : null;
      } catch {
        return null;
      }
    }).filter(Boolean);

  const resolveRequiredObjects = (engine, mission, prescription) => {
    const required = Array.isArray(prescription?.requiredObjects)
      ? prescription.requiredObjects
      : [];
    if (!required.length) return { requiredObjects: [], unresolved: false };

    const tree = engine?.missionManager?.trees?.get?.(mission.id);
    const resolved = [];
    let unresolved = false;

    required.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      if (entry.objectId || entry.type) {
        resolved.push(JSON.parse(JSON.stringify(entry)));
        return;
      }

      const sourceSlot = String(entry.sourceSlot || "").trim();
      const identityField = String(entry.identityField || "objectId").trim();
      const sourceNode = sourceSlot
        ? tree?.find?.(`${tree.id}:${sourceSlot}`)
        : null;
      const evidence = parsedMissionEvidence(sourceNode)
        .slice()
        .reverse()
        .find((candidate) => candidate?.[identityField] != null);
      const identity = evidence?.[identityField];

      if (identity == null || identity === "") {
        unresolved = true;
        return;
      }

      const concrete = {
        ...JSON.parse(JSON.stringify(entry)),
        [identityField]: identity
      };
      if (identityField === "objectId") {
        const normalizedId = String(identity).toLowerCase();
        const definition =
          BF.ObjectLibrary?.getById?.(identity) ||
          BF.ObjectLibrary?.list?.({ status: "active" })?.find?.((candidate) =>
            String(candidate?.id || "").toLowerCase() === normalizedId
          ) ||
          null;
        if (!definition?.id || !definition?.type) {
          unresolved = true;
          return;
        }
        concrete.objectId = definition.id;
        concrete.type = definition.type;
      } else if (identityField === "cuoType") {
        const definition = BF.ObjectLibrary?.get?.(String(identity));
        if (!definition?.type) {
          unresolved = true;
          return;
        }
        concrete.type = definition.type;
        concrete.objectId = definition.id || null;
      }
      delete concrete.sourceSlot;
      delete concrete.identityField;
      resolved.push(concrete);
    });

    return { requiredObjects: resolved, unresolved };
  };

  const resolveMissionMapGeneration = (engine, mission) => {
    if (!mission?.id) return null;
    const travelNode = activeEventDrivenTravelNode(engine, mission);
    const nextCount = Math.max(0, Number(travelNode?.progress) || 0) + 1;
    const staged = travelNode?.params?.mapGenerationOnCount?.[nextCount] ||
      travelNode?.params?.mapGenerationOnCount?.[String(nextCount)] ||
      null;
    const prescription = staged || mission?.mapGeneration || null;
    if (!prescription || typeof prescription !== "object") return null;

    const resolved = JSON.parse(JSON.stringify(prescription));
    if (Array.isArray(prescription.requiredObjects)) {
      const dynamicObjects = resolveRequiredObjects(engine, mission, prescription);
      resolved.requiredObjects = dynamicObjects.requiredObjects;
      resolved.unresolvedRequiredObjects = dynamicObjects.unresolved;
    }
    return resolved;
  };

  const activeMapGenerationPrescription = () => {
    const engine = BF.currentEngine;
    const manager = engine?.missionManager;
    const missionId = String(
      manager?.primaryMissionId ||
      manager?.activeMissionId ||
      ""
    );
    if (!missionId || missionStatus(engine, missionId) !== "active") return null;

    const mission = missionById(missionId);
    const prescription = resolveMissionMapGeneration(engine, mission);
    if (!prescription) return null;

    return {
      missionId: mission.id,
      ...JSON.parse(JSON.stringify(prescription))
    };
  };

  // API générique du propriétaire "Prescription Bible des maps".
  // Le générateur ne connaît aucune mission particulière : il demande seulement
  // si la mission primaire active porte une prescription de génération.
  BF.resolveBibleMapGenerationPrescription = activeMapGenerationPrescription;

  if (BF.mount?.__bibleMapPrescriptionV21) return;

  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const controlledNavigationMissions = () =>
    catalog().filter((mission) => mission?.navigation?.controlsUnknownTravel === true);

  const activeControlledNavigationMission = (engine) =>
    controlledNavigationMissions().find((mission) =>
      missionStatus(engine, mission.id) === "active"
    ) || null;

  const prerequisitesSatisfied = (engine, mission) =>
    (mission?.prerequisites || []).every((missionId) =>
      missionStatus(engine, missionId) === "completed"
    );

  const dormantMapDiscoveryPrescriptionMission = (engine, direction) =>
    catalog()
      .filter((mission) => {
        if (!mission?.id || !mission?.mapGeneration) return false;
        if (missionStatus(engine, mission.id) != null) return false;
        if (mission?.trigger?.type !== "exploration.map_discovered") return false;
        if (
          mission.trigger.direction != null &&
          String(mission.trigger.direction) !== String(direction)
        ) return false;
        return prerequisitesSatisfied(engine, mission);
      })
      .sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        catalog().indexOf(left) - catalog().indexOf(right)
      )[0] || null;

  const unknownTravelUnlocked = (engine) => {
    const controlled = controlledNavigationMissions();
    if (!controlled.length) return true;
    return controlled.some((mission) =>
      ["active", "completed"].includes(missionStatus(engine, mission.id))
    );
  };

  const resolveNavigationSuggestionPrescription = (engine, detail = {}) => {
    const targetMapId = String(detail?.mapId || "");
    if (targetMapId !== "crystal") return null;

    const mission = catalog().find((entry) => {
      if (missionStatus(engine, entry?.id) !== "active") return false;
      if (entry?.pattern !== "TRAVEL_CYCLE") return false;
      if (String(entry?.slots?.travel?.params?.toMapId || "") !== targetMapId) {
        return false;
      }
      const gate = entry?.completionGate;
      return gate?.type === "proximity.shelter" &&
        String(gate?.mapId || "") === targetMapId;
    });

    return mission
      ? { action: "return-base", missionId: mission.id, mapId: targetMapId }
      : null;
  };

  BF.resolveBibleNavigationSuggestion = resolveNavigationSuggestionPrescription;

  const matchesTarget = (object, target = {}) => {
    if (!object?.userData?.active) return false;
    const definition =
      object.userData.functional ||
      BF.ObjectLibrary?.getById?.(object.userData.catalogId) ||
      BF.ObjectLibrary?.get?.(object.userData.libraryType) ||
      null;
    if (!definition) return false;
    if (target.objectId != null && String(definition.id) !== String(target.objectId)) {
      return false;
    }
    if (target.cuoType != null && String(definition.type) !== String(target.cuoType)) {
      return false;
    }
    return true;
  };

  const ensureMissionMicroScenes = (mapId, mission) => {
    const definition = BF.maps?.[mapId];
    const required = mission?.mapGeneration?.requiredMicroScenes;
    if (!definition || !Array.isArray(required) || !required.length) return false;

    const existing = Array.isArray(definition.missionMicroScenes)
      ? definition.missionMicroScenes.slice()
      : [];
    let changed = false;

    required.forEach((scene) => {
      if (!scene?.id || scene.persistent === true) return;
      const recordId = `${mission.id}:${scene.id}`;
      if (existing.some((record) => record?.id === recordId)) return;
      existing.push({
        id: recordId,
        missionId: mission.id,
        microSceneId: scene.id,
        anchor: { x: 0, y: 0, z: 0 },
        rotation: 0,
        persistent: scene.persistent === true,
        spawnOnce: scene.spawnOnce !== false
      });
      changed = true;
    });

    if (changed) definition.missionMicroScenes = existing;
    return changed || existing.some((record) => record?.missionId === mission.id);
  };

  const bindGeneratedMissionTarget = (engine, mission) => {
    const target = mission?.navigation?.target;
    const manager = engine?.missionManager;
    if (!target || !manager?.memory || !engine?.currentMap?.interactables) return false;

    const object = engine.currentMap.interactables.find((candidate) =>
      candidate?.userData?.bibleMissionId === mission.id &&
      matchesTarget(candidate, target)
    );
    if (!object) return false;

    const definition =
      object.userData.functional ||
      BF.ObjectLibrary?.getById?.(object.userData.catalogId) ||
      BF.ObjectLibrary?.get?.(object.userData.libraryType) ||
      null;
    const instanceId =
      object.userData.instanceId ||
      object.userData.worldAnchor?.userData?.instanceId ||
      null;
    if (!instanceId || !definition) return false;

    manager.memory.setFact?.(`bibleTarget:${mission.id}`, {
      binding: target.binding || "instance",
      instanceId: target.binding === "instance" ? instanceId : null,
      objectId: target.binding === "instance"
        ? (definition.id || target.objectId || null)
        : (target.objectId || null),
      cuoType: target.cuoType || definition.type || null,
      missionSceneMissionId:
        target.binding === "type-or-mission-scene" ? mission.id : null,
      mapId: engine.currentMapId
    });
    manager.memory.setFact?.(`tutorialExcursion:${mission.id}`, {
      arrived: true,
      mapId: engine.currentMapId,
      boundInstanceId: instanceId,
      updatedAt: Date.now()
    });

    if (mission.navigation?.makePrimaryOnArrival === true) {
      const lifecycle = manager.ensureLifecycle?.(mission.id);
      if (lifecycle) lifecycle.autoPrimaryEligible = true;
      manager.setPrimaryMission?.(
        mission.id,
        false,
        "Première initiative semi-autonome sur la scène de reconnaissance."
      );
    }
    manager.memory.save?.();
    manager.publish?.();
    return true;
  };

  const applyTutorialAutonomy = (mode) => {
    const normalized = String(mode || "").toLowerCase();
    if (!["off", "semi", "full"].includes(normalized)) return false;
    if (normalized !== "off") BF.unlockAutonomyMode?.(normalized);
    return BF.setAutonomyMode?.(normalized, { source: "tutorial" }) !== false;
  };

  const applyTutorialSemiScope = (engine, mission) => {
    const manager = engine?.missionManager;
    if (!manager || !mission?.id) return false;

    const key = `tutorialSemiScope:${mission.id}`;
    const existing = manager.memory?.getFact?.(key, null);
    const activeMissionIds = [...new Set(manager.activeMissionIds || [])];
    if (
      existing &&
      activeMissionIds.length === 1 &&
      activeMissionIds[0] === mission.id &&
      manager.primaryMissionId === mission.id &&
      manager.activeMissionId === mission.id
    ) {
      return false;
    }
    const snapshot = Array.isArray(existing?.activeMissionIds)
      ? existing.activeMissionIds
      : activeMissionIds;

    if (!existing) {
      manager.memory?.setFact?.(key, {
        activeMissionIds: snapshot,
        appliedAt: Date.now()
      });
    }

    // SEMI tutoriel : une seule mission autonome candidate.
    // Les lifecycles et arbres des missions parallèles restent actifs afin
    // de conserver leur progression passive/fan-out.
    manager.activeMissionIds = [mission.id];
    manager.primaryMissionId = mission.id;
    manager.activeMissionId = mission.id;
    manager.tree = manager.trees?.get?.(mission.id) || manager.tree;

    manager.memory?.save?.();
    manager.publish?.();
    return true;
  };

  const restoreTutorialSemiScope = (engine, mission) => {
    const manager = engine?.missionManager;
    if (!manager || !mission?.id) return false;

    const key = `tutorialSemiScope:${mission.id}`;
    const snapshot = manager.memory?.getFact?.(key, null);
    if (!snapshot || snapshot.restored === true) return false;

    const restoredIds = [...new Set(snapshot.activeMissionIds || [])]
      .filter((id) => id !== mission.id)
      .filter((id) => manager.definition?.(id))
      .filter((id) =>
        manager.memory?.state?.missionLifecycle?.[id]?.status === "active"
      );

    restoredIds.forEach((id) => {
      if (!manager.trees?.has?.(id)) {
        manager.trees?.set?.(id, manager.planner?.restoreOrCreate?.(id));
      }
    });

    manager.memory?.setFact?.(key, {
      ...snapshot,
      restored: true,
      restoredAt: Date.now()
    });

    manager.activeMissionIds = restoredIds;

    if (
      manager.primaryMissionId === mission.id ||
      !restoredIds.includes(manager.primaryMissionId)
    ) {
      manager.primaryMissionId = "";
      manager.activeMissionId = "";
      manager.tree = null;
      if (restoredIds.length) {
        manager.setPrimaryMission?.(
          restoredIds[0],
          false,
          "Reprise des missions actives après la fenêtre tutorielle SEMI."
        );
      }
    }

    manager.syncMissionSelection?.();
    manager.memory?.save?.();
    manager.publish?.();
    return true;
  };

  const unlockCompletedMissionAutonomy = (state) => {
    (state?.missions || []).forEach((entry) => {
      if (entry.lifecycleStatus !== "completed") return;
      const mission = missionById(entry.missionId);
      const unlock = mission?.tutorialAutonomy?.unlockOnComplete;
      if (!unlock) return;
      BF.unlockAutonomyMode?.(unlock);
    });
  };

  const unknownDirectionsFrom = (engine) => {
    const definition = BF.maps?.[engine?.currentMapId];
    if (!definition) return [];
    return ["north", "south", "east", "west"].filter((direction) => {
      if (definition.exits?.[direction]?.targetMap) return false;
      const topologyTarget = engine.worldTopology?.targetFrom?.(
        engine.currentMapId,
        direction
      );
      return !topologyTarget?.mapId;
    });
  };

  const requestAutonomousUnknownTravel = async (engine, mission) => {
    if (mission?.navigation?.autonomousUnknownTravel !== true) return false;
    if (missionStatus(engine, mission.id) !== "active") return false;
    if (engine?.missionManager?.primaryMissionId !== mission.id) return false;
    if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") {
      return false;
    }
    if (
      engine.transitioning ||
      engine.pendingGate ||
      engine.pendingInteraction ||
      engine.currentRoutine ||
      engine.missionManager?.currentAction
    ) return false;

    const memory = engine.missionManager?.memory;
    const key = `tutorialExcursion:${mission.id}`;
    const previous = memory?.getFact?.(key, {}) || {};
    const repeatUntilComplete =
      mission?.navigation?.repeatUnknownTravelUntilComplete === true;
    const travelNode = activeEventDrivenTravelNode(engine, mission);

    if (previous.requesting === true) return false;
    if (!travelNode || travelNode.isComplete) return false;
    if (repeatUntilComplete) {
      const progress = Math.max(0, Number(travelNode.progress) || 0);
      const requestedProgress = Math.max(
        0,
        Number(previous.requestedProgress) || 0
      );
      // Une génération déjà demandée doit produire une vraie transition et
      // créditer la feuille TRAVEL avant qu'une seconde demande soit possible.
      if (requestedProgress > progress) return false;
    } else if (previous.generatedTargetMapId || previous.arrived === true) {
      return false;
    }

    const directions = unknownDirectionsFrom(engine);
    if (!directions.length) return false;
    const preferredDirection = String(travelNode?.params?.direction || "")
      .trim()
      .toLowerCase();
    const direction = directions.includes(preferredDirection)
      ? preferredDirection
      : (directions[
          Math.floor(Math.random() * directions.length)
        ] || directions[0]);

    memory?.setFact?.(key, {
      ...previous,
      direction,
      fromMapId: engine.currentMapId,
      requesting: true,
      requestedProgress: repeatUntilComplete
        ? (Math.max(0, Number(travelNode?.progress) || 0) + 1)
        : previous.requestedProgress,
      requestedAt: Date.now()
    });
    memory?.save?.();

    try {
      const result = await engine.generateUnknownPassage?.(direction, {
        bibleMissionId: mission.id,
        source: "autonomy"
      });
      if (result === false) {
        const current = memory?.getFact?.(key, {}) || {};
        memory?.setFact?.(key, { ...current, requesting: false });
        memory?.save?.();
        return false;
      }
      return true;
    } catch (error) {
      const current = memory?.getFact?.(key, {}) || {};
      memory?.setFact?.(key, { ...current, requesting: false });
      memory?.save?.();
      console.warn("[BlueFox] Voyage autonome Bible différé.", error);
      return false;
    }
  };

  const acknowledgeMissionAutonomy = (engine, detail = {}) => {
    const mission = missionById(detail.missionId);
    if (missionStatus(engine, mission?.id) !== "active") return false;
    if (mission?.tutorialAutonomy?.autonomousEligibleOnAcknowledge !== true) {
      return false;
    }

    const manager = engine?.missionManager;
    const lifecycle = manager?.ensureLifecycle?.(mission.id);
    if (!lifecycle) return false;
    lifecycle.autoPrimaryEligible = true;
    lifecycle.updatedAt = Date.now();
    manager.memory?.save?.();
    manager.selectBestPrimary?.(performance.now(), true);
    manager.publish?.();
    return true;
  };

  const wrapped = async function mountBibleMapPrescriptionV21(options) {
    const engine = await originalMount.call(this, options);
    const originalGenerateUnknownPassage =
      engine.generateUnknownPassage?.bind(engine);

    if (originalGenerateUnknownPassage) {
      engine.generateUnknownPassage =
        async function generateUnknownPassageWithBiblePrescription(direction, meta = {}) {
          const explicitMission = meta?.bibleMissionId
            ? missionById(meta.bibleMissionId)
            : null;
          const activeMission = activeControlledNavigationMission(engine);
          const dormantMission =
            !explicitMission && !activeMission
              ? dormantMapDiscoveryPrescriptionMission(engine, direction)
              : null;
          const mission = explicitMission || activeMission || dormantMission;

          if (!mission && !unknownTravelUnlocked(engine)) {
            engine.clearPersistentNavigationIntent?.();
            engine.callbacks?.onStatus?.(
              "BlueFox n’est pas encore prêt à quitter le territoire connu."
            );
            return false;
          }

          if (!mission) return originalGenerateUnknownPassage(direction);

          const prescription = resolveMissionMapGeneration(engine, mission);
          if (prescription?.unresolvedRequiredObjects === true) {
            engine.callbacks?.onStatus?.(
              "Le contenu requis par la mission doit être identifié avant de générer la prochaine zone."
            );
            return false;
          }

          const manager = engine.missionManager;
          const excursionKey = `tutorialExcursion:${mission.id}`;
          const previousExcursion =
            manager?.memory?.getFact?.(excursionKey, {}) || {};
          manager?.memory?.setFact?.(excursionKey, {
            ...previousExcursion,
            fromMapId: engine.currentMapId,
            direction,
            confirmedAt: Date.now()
          });
          manager?.memory?.save?.();

          if (prescription) {
            BF.__pendingBibleMapGeneration = {
              missionId: mission.id,
              ...JSON.parse(JSON.stringify(prescription))
            };
          }

          try {
            const result = await originalGenerateUnknownPassage(direction);
            const destinationMapId = BF.maps?.[engine.currentMapId]?.exits?.[direction]?.targetMap || null;
            const excursion = manager?.memory?.getFact?.(excursionKey, {}) || {};
            manager?.memory?.setFact?.(excursionKey, {
              ...excursion,
              requesting: false,
              generatedTargetMapId: destinationMapId || excursion.generatedTargetMapId || null,
              generatedAt: destinationMapId ? Date.now() : excursion.generatedAt || 0
            });
            manager?.memory?.save?.();
            if (destinationMapId) {
              ensureMissionMicroScenes(destinationMapId, mission);
              const target = mission.navigation?.target;
              if (target?.cuoType) {
                manager?.memory?.setFact?.(`bibleTarget:${mission.id}`, {
                  binding: target.binding || "type",
                  instanceId: null,
                  objectId: target.objectId || null,
                  cuoType: target.cuoType || null,
                  missionSceneMissionId: mission.id,
                  mapId: destinationMapId
                });
                manager?.memory?.save?.();
              }
            }
            return result;
          } finally {
            BF.__pendingBibleMapGeneration = null;
          }
        };
    }

    const onMapTransition = (event) => {
      const detail = event?.detail || {};
      const activeMission = activeControlledNavigationMission(engine);
      if (!activeMission) return;

      if (activeMission.navigation?.singleUnknownTransition === true) {
        // La suggestion T07 est consommée au premier passage : aucune
        // propagation de la direction sur les maps suivantes.
        engine.clearPersistentNavigationIntent?.();
        engine.navigationRoute = [];
      }

      const arrivalTarget = activeMission.navigation?.target;
      if (arrivalTarget?.cuoType || arrivalTarget?.binding === "type-or-mission-scene") {
        engine.missionManager?.memory?.setFact?.(
          `bibleTarget:${activeMission.id}`,
          {
            binding: arrivalTarget.binding || "type",
            instanceId: null,
            objectId: arrivalTarget.objectId || null,
            cuoType: arrivalTarget.cuoType || null,
            missionSceneMissionId: activeMission.id,
            mapId: detail.toMapId || detail.mapId || engine.currentMapId
          }
        );
        engine.missionManager?.memory?.save?.();
      }

      // T07 : à l'arrivée seulement, rendre la mission prioritaire puis
      // rétablir l'autonomie semi. Le planner existant reste propriétaire
      // du choix de la cible et du trajet jusqu'à la MSC.
      if (activeMission.navigation?.makePrimaryOnArrival === true) {
        const manager = engine.missionManager;
        const lifecycle = manager?.ensureLifecycle?.(activeMission.id);
        if (lifecycle) lifecycle.autoPrimaryEligible = true;
        manager?.setPrimaryMission?.(
          activeMission.id,
          false,
          "Première initiative semi-autonome sur la scène de reconnaissance."
        );
        const arrivalMode = activeMission.navigation?.autonomyModeOnArrival;
        if (arrivalMode) applyTutorialAutonomy(arrivalMode);
        if (arrivalMode === "semi") {
          applyTutorialSemiScope(engine, activeMission);
        }
        manager?.memory?.save?.();
        manager?.publish?.();
      }

      const bound = bindGeneratedMissionTarget(engine, activeMission);
      if (!bound) {
        engine.callbacks?.onStatus?.(
          "BlueFox a atteint la nouvelle zone et cherche la scène de reconnaissance."
        );
        return;
      }

      const memory = engine.missionManager?.memory;
      const previous = memory?.getFact?.(`tutorialExcursion:${activeMission.id}`, {}) || {};
      memory?.setFact?.(`tutorialExcursion:${activeMission.id}`, {
        ...previous,
        direction: previous.direction || detail.direction || null,
        fromMapId: previous.fromMapId || detail.fromMapId || null,
        toMapId: detail.toMapId || detail.mapId || engine.currentMapId,
        arrived: true,
        updatedAt: Date.now()
      });
      memory?.save?.();
    };

    const onMissionState = (event) => {
      const state = event?.detail || BF.getMissionState?.() || {};
      const manager = BF.currentEngine?.missionManager;
      (state?.missions || []).forEach((entry) => {
        if (entry.lifecycleStatus !== "active") return;
        const mission = missionById(entry.missionId);
        if (mission?.navigation?.controlsUnknownTravel !== true) return;
        const target = mission.navigation?.target;
        if (!target?.cuoType) return;
        const excursion = manager?.memory?.getFact?.(`tutorialExcursion:${mission.id}`, null);
        const bound = manager?.memory?.getFact?.(`bibleTarget:${mission.id}`, null);
        if (excursion?.arrived === true || bound?.mapId) return;
        manager?.memory?.setFact?.(`bibleTarget:${mission.id}`, {
          binding: target.binding || "type",
          instanceId: null,
          objectId: target.objectId || null,
          cuoType: target.cuoType,
          mapId: "__pending_tutorial_transition__"
        });
        manager?.memory?.save?.();
      });
      unlockCompletedMissionAutonomy(state);

      const primaryMission = missionById(manager?.primaryMissionId);
      if (
        primaryMission?.navigation?.autonomousUnknownTravel === true &&
        missionStatus(engine, primaryMission.id) === "active"
      ) {
        requestAutonomousUnknownTravel(engine, primaryMission);
      }

      (state?.missions || []).forEach((entry) => {
        if (entry.lifecycleStatus !== "active") return;
        const mission = missionById(entry.missionId);
        if (mission?.navigation?.autonomyModeOnArrival !== "semi") return;
        const excursion = manager?.memory?.getFact?.(
          `tutorialExcursion:${mission.id}`,
          null
        );
        if (excursion?.arrived !== true) return;
        if (BF.getAutonomyMode?.() !== "semi") return;
        applyTutorialSemiScope(engine, mission);
      });

      (state?.missions || []).forEach((entry) => {
        if (entry.lifecycleStatus !== "completed") return;
        const mission = missionById(entry.missionId);
        const mode = mission?.navigation?.autonomyModeOnComplete;
        if (!mode) return;

        // Une transition d'autonomie de fin de mission est un effet one-shot.
        // La mission reste "completed" dans l'historique et ne doit donc pas
        // réappliquer OFF à chaque publication d'état ultérieure (T08, UI, etc.).
        const memory = engine.missionManager?.memory;
        const appliedKey = `tutorialAutonomyCompletionApplied:${mission.id}`;
        if (memory?.getFact?.(appliedKey, false) === true) return;

        if (applyTutorialAutonomy(mode)) {
          restoreTutorialSemiScope(engine, mission);
          memory?.setFact?.(appliedKey, true);
          memory?.save?.();
        }
      });
    };

    const onTutorialGuidanceAcknowledged = (event) =>
      acknowledgeMissionAutonomy(engine, event?.detail || {});

    global.addEventListener("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener("bluefox:mission-state", onMissionState);
    global.addEventListener(
      "bluefox:tutorial-guidance-acknowledged",
      onTutorialGuidanceAcknowledged
    );
    engine.__disposeBibleMapPrescriptionV21 = () => {
      global.removeEventListener("bluefox:map-transition-completed", onMapTransition);
      global.removeEventListener("bluefox:mission-state", onMissionState);
      global.removeEventListener(
        "bluefox:tutorial-guidance-acknowledged",
        onTutorialGuidanceAcknowledged
      );
    };

    return engine;
  };

  wrapped.__bibleMapPrescriptionV21 = true;
  BF.mount = wrapped;
})(window);
