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
    const prescription = mission?.mapGeneration;
    const required = prescription?.requiredMicroScenes;
    if (!prescription || !Array.isArray(required) || !required.length) return null;

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

  const unknownTravelUnlocked = (engine) => {
    const controlled = controlledNavigationMissions();
    if (!controlled.length) return true;
    return controlled.some((mission) =>
      ["active", "completed"].includes(missionStatus(engine, mission.id))
    );
  };

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
      if (!scene?.id) return;
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
    const snapshot = Array.isArray(existing?.activeMissionIds)
      ? existing.activeMissionIds
      : [...new Set(manager.activeMissionIds || [])];

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
          const mission = explicitMission || activeControlledNavigationMission(engine);

          if (!mission && !unknownTravelUnlocked(engine)) {
            engine.callbacks?.onStatus?.(
              "BlueFox n’est pas encore prêt à quitter le territoire connu."
            );
            return false;
          }

          if (!mission) return originalGenerateUnknownPassage(direction);

          const prescription = mission.mapGeneration || null;

          const manager = engine.missionManager;
          manager?.memory?.setFact?.(`tutorialExcursion:${mission.id}`, {
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

    global.addEventListener("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener("bluefox:mission-state", onMissionState);
    engine.__disposeBibleMapPrescriptionV21 = () => {
      global.removeEventListener("bluefox:map-transition-completed", onMapTransition);
      global.removeEventListener("bluefox:mission-state", onMissionState);
    };

    return engine;
  };

  wrapped.__bibleMapPrescriptionV21 = true;
  BF.mount = wrapped;
})(window);
