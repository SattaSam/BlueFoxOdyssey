(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "0.2-map-scoped-construction";
  const STORAGE_KEY = "bluefox_bible_runtime_v0_1_unified";

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));
  const lower = (value) => String(value ?? "").trim().toLowerCase();
  const asArray = (value) =>
    Array.isArray(value) ? value : value == null ? [] : [value];

  const OBJECT_TYPE_TO_TRIGGER = Object.freeze({
    OBJECT_SEEN: "interaction.observe",
    PHENOMENON_OBSERVED: "interaction.observe",
    OBJECT_INSPECTED: "interaction.inspect",
    OBJECT_ANALYZED: "interaction.analyze",
    RESOURCE_COLLECTED: "interaction.collect",
    RESOURCE_EXTRACTED: "interaction.extract"
  });

  class BibleRuntimeV01 {
    constructor() {
      this.patterns = BF.BiblePatterns || {};
      this.catalog = Array.isArray(BF.BibleCatalog)
        ? BF.BibleCatalog
        : Object.values(BF.BibleCatalog || {});
      this.byId = new Map(this.catalog.map((mission) => [mission.id, mission]));
      this.state = this.loadState();
      this.dynamicMissions = new Map();
      this.activePlacement = null;
      this.restoreConstructionInstances();

      // Migration de structure uniquement : l'ancien runtime utilisait une
      // seconde vérité "revealed/completed" qui pouvait empêcher une mission
      // de se réactiver alors que MissionManager ne l'avait plus en mémoire.
      // On ne réinitialise JAMAIS la mémoire de mission ici.
      try {
        global.localStorage?.removeItem?.("bluefox_bible_runtime_v0");
      } catch {}

      this.unsubscribeObjectEvents = null;
      this.activationEventIds = new Set();
      this.activationEventMissionIds = new Map();
      // Cache strictement runtime : reconstruit une seule fois pour chaque
      // instance de map chargée. La mémoire persistante reste dans MissionMemory.
      this.observationResolvers = new WeakMap();
      this.observationCaptureQueued = false;
      this.started = false;
      this.lastGateReviewAt = 0;
      this.lastActivationAttempt = null;
      this.boundMissionState = (event) =>
        this.onMissionState(event.detail || BF.getMissionState?.() || {});
      this.boundMapTransition = (event) =>
        this.onMapTransition(event.detail || {});
      this.boundExplorationChange = (event) =>
        this.onExplorationChanged(event.detail || {});
      this.boundRationConsumed = (event) =>
        this.onRationConsumed(event.detail || {});
      this.boundSurvivalChanged = (event) =>
        this.onSurvivalChanged(event.detail || {});
      this.boundRationsChanged = () =>
        this.reconcileRuntimeCounters();
      this.pendingManualRationProof = null;
      this.proximityContextTimer = null;
      this.localExplorationReconciling = false;
      this.localExplorationSessionRestored = false;
      this.localExplorationSessionMapId = null;
      this.localExplorationAwaitingPostArrival = null;
      this.localSiteProgressionReconciling = false;
      this.environmentReconciling = false;
      this.pendingConstructionResourceMissions = new Set();
      this.constructionResourceSignatures = new Map();
      this.boundProgressionChanged = (event) =>
        this.onProgressionChanged(event.detail || {});
    }

    defaultState() {
      return {
        version: VERSION,
        triggerCounts: {},
        uniqueTriggerValues: {},
        progressNarrative: {},
        effectsApplied: {},
        gatesSatisfied: {},
        activationInventoryCredits: {},
        constructionInstances: {},
        localMissionInstances: {},
      };
    }

    loadState() {
      try {
        const saved = JSON.parse(
          global.localStorage?.getItem?.(STORAGE_KEY) || "null"
        );
        return {
          ...this.defaultState(),
          ...(saved || {}),
          version: VERSION,
          triggerCounts: { ...(saved?.triggerCounts || {}) },
          uniqueTriggerValues: { ...(saved?.uniqueTriggerValues || {}) },
          progressNarrative: { ...(saved?.progressNarrative || {}) },
          effectsApplied: { ...(saved?.effectsApplied || {}) },
          gatesSatisfied: { ...(saved?.gatesSatisfied || {}) },
          activationInventoryCredits: { ...(saved?.activationInventoryCredits || {}) },
          constructionInstances: { ...(saved?.constructionInstances || {}) },
          localMissionInstances: { ...(saved?.localMissionInstances || {}) },
        };
      } catch {
        return this.defaultState();
      }
    }

    saveState() {
      try {
        global.localStorage?.setItem?.(
          STORAGE_KEY,
          JSON.stringify(this.state)
        );
        return true;
      } catch {
        return false;
      }
    }

    allMissions() {
      return [...this.catalog, ...this.dynamicMissions.values()];
    }

    localExplorationTemplates() {
      return this.catalog
        .filter((mission) =>
          mission?.instanceScope === "map" && mission?.localExploration
        )
        .sort((left, right) =>
          Number(left.localExploration.activationThreshold) -
          Number(right.localExploration.activationThreshold)
        );
    }

    localExplorationInstanceId(baseId, mapId) {
      return `${String(baseId || "")}@${String(mapId || "")}`;
    }

    localExplorationMission(instanceId) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId);
      if (!template?.localExploration || !mapId) return null;
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        title: template.title
      };
    }

    localMissionTemplates() {
      return this.catalog.filter((mission) =>
        mission?.instanceScope === "map" && mission?.localMission
      );
    }

    localMissionContext(instanceId, event = null) {
      const key = String(instanceId || "");
      const stored = this.state.localMissionInstances?.[key] || {};
      if (!event) return stored;
      this.state.localMissionInstances = this.state.localMissionInstances || {};
      const next = {
        ...stored,
        mapId: event.mapId || stored.mapId || null,
        family: event.family || event.subject || stored.family || null,
        persistentMicroSceneId:
          event.persistentMicroSceneId || stored.persistentMicroSceneId || null,
        activatedAt: stored.activatedAt || Date.now()
      };
      this.state.localMissionInstances[key] = next;
      this.saveState();
      return next;
    }

    localMissionInstance(instanceId, event = null) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId) ||
        this.catalog.find((mission) => mission?.id === baseId);
      if (!template?.localMission || !mapId) return null;
      if (event) this.localMissionContext(instanceId, event);
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        targetMapId: mapId,
        title: template.title
      };
    }

    localMissionActivationMatches(activation, event) {
      if (!activation || !event || activation.type !== event.type) return false;
      const exactKeys = [
        "objectId", "kind", "family", "subject", "persistentMicroSceneId"
      ];
      for (const key of exactKeys) {
        if (activation[key] != null && lower(activation[key]) !== lower(event[key])) {
          return false;
        }
      }
      const tags = new Set(asArray(event.tags).map(lower));
      if (activation.tagsAny?.length &&
          !activation.tagsAny.some((tag) => tags.has(lower(tag)))) return false;
      if (activation.tagsAll?.length &&
          !activation.tagsAll.every((tag) => tags.has(lower(tag)))) return false;
      if (activation.requireMicroScene === true && !event.persistentMicroSceneId) {
        return false;
      }
      return true;
    }

    localMissionsUnlocked() {
      const manager = this.manager();
      return Boolean(
        manager?.memory?.getFact?.("localExplorationUnlocked:v1", false) ||
        manager?.memory?.state?.missionLifecycle?.T10?.status === "completed"
      );
    }

    localMissionEligibleOnMap(template, mapId) {
      if (!template?.localMission || !mapId || !this.localMissionsUnlocked()) return false;
      if (template.localMission.newMapOnly === true) {
        const definition = BF.maps?.[mapId] || {};
        const generated = definition.generated === true ||
          String(mapId).startsWith("generated-") ||
          String(mapId).startsWith("map-");
        if (!generated || String(mapId) === "crystal") return false;
      }
      const constructionKind = lower(template.localMission.constructionKind);
      if (constructionKind && this.siteBucket(mapId)?.[constructionKind]) return false;
      return true;
    }

    restoreLocalMissionDefinitions() {
      return false;
    }


    reconcileLocalSiteProgression() {
      if (this.localSiteProgressionReconciling) return false;
      const manager = this.manager();
      if (!manager?.trees?.size) return false;
      this.localSiteProgressionReconciling = true;
      try {
        let changed = false;
        [...(manager.activeMissionIds || [])].forEach((missionId) => {
          const mission = this.localMissionInstance(missionId);
          const kind = lower(mission?.localMission?.constructionKind);
          if (!mission || !kind) return;
          const tree = manager.trees.get(missionId);
          const node = tree?.find?.(`${mission.baseMissionId}:construct@${mission.scopeId}`) ||
            tree?.find?.(`${missionId}:construct`);
          if (!node || node.isComplete || !this.siteBucket(mission.scopeId)?.[kind]) return;
          if (node.increment?.(1)) {
            tree.refresh?.();
            manager.memory?.saveTree?.(tree);
            changed = true;
          }
        });
        if (changed) {
          manager.syncLifecycleFromTrees?.();
          manager.memory?.save?.();
          manager.publish?.();
        }
        return changed;
      } finally {
        this.localSiteProgressionReconciling = false;
      }
    }

    missionsForState(state) {
      const missions = [...this.allMissions()];
      (state?.missions || []).forEach((entry) => {
        const missionId = entry.missionId || entry.id;
        const mission = this.localExplorationMission(missionId) ||
          this.localMissionInstance(missionId) ||
          this.environmentLocalMission(missionId);
        if (mission) missions.push(mission);
      });
      return missions;
    }

    environmentLocalTemplates() {
      return this.catalog.filter((mission) =>
        mission?.instanceScope === "map" && mission?.envLocal
      );
    }

    environmentLocalMission(instanceId) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId);
      if (!template?.envLocal || !mapId) return null;
      const family = String(template.envLocal.family || "").toUpperCase();
      const percent = Number(template.envLocal.targetPercent) || 0;
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        targetMapId: mapId,
        prerequisites: percent >= 100
          ? [`ENV-MAP-${family}-50@${mapId}`]
          : ["T13"],
        title: template.title
      };
    }

    suppressLocalNarrative(mission, surfacePercent) {
      if (!mission) return;
      let changed = false;
      const revealedKey = `${mission.id}:revealed`;
      if (!this.state.progressNarrative[revealedKey]) {
        this.state.progressNarrative[revealedKey] = Date.now();
        changed = true;
      }
      (mission.narrative?.progress || []).forEach((milestone, index) => {
        const threshold = milestone.atCount != null
          ? Number(milestone.atCount)
          : Number(milestone.at) *
            Number(mission.localExploration?.completionThreshold || 100);
        if (Number(surfacePercent) >= threshold) {
          const key = `${mission.id}:progress:${index}`;
          if (!this.state.progressNarrative[key]) {
            this.state.progressNarrative[key] = Date.now();
            changed = true;
          }
        }
      });
      if (
        Number(surfacePercent) >=
        Number(mission.localExploration?.completionThreshold || Infinity)
      ) {
        const completedKey = `${mission.id}:completed`;
        if (!this.state.progressNarrative[completedKey]) {
          this.state.progressNarrative[completedKey] = Date.now();
          changed = true;
        }
      }
      if (changed) this.saveState();
    }

    reconcileLocalExplorationMap(mapId, surfacePercent) {
      const manager = this.manager();
      const targetMapId = String(mapId || "");
      if (!manager || !targetMapId) return false;
      const percent = Math.max(0, Math.min(100, Number(surfacePercent) || 0));
      const currentMapId = String(BF.currentEngine?.currentMapId || "");
      let changed = false;

      for (const template of this.localExplorationTemplates()) {
        const activationThreshold = Number(
          template.localExploration.activationThreshold
        ) || 0;
        const instanceId = this.localExplorationInstanceId(
          template.id,
          targetMapId
        );
        let lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        if (percent < activationThreshold && !lifecycle) continue;

        const mission = this.localExplorationMission(instanceId);
        if (targetMapId !== currentMapId) {
          this.suppressLocalNarrative(mission, percent);
        }

        if (!lifecycle || ["available", "hidden"].includes(lifecycle.status)) {
          changed = manager.startMission(instanceId, {
            primary: false,
            autoPrimaryEligible: false,
            source: "local-exploration",
            reason: `Seuil local atteint sur ${targetMapId}.`
          }) === true || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        } else if (lifecycle.status === "paused" && targetMapId === currentMapId) {
          changed = manager.resumeMission(instanceId, {
            primary: false,
            autoPrimaryEligible: false,
            source: "local-exploration"
          }) === true || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        }

        if (lifecycle?.status === "active") {
          changed = Boolean(BF.progressExploreScopeMissions?.({
            mapId: targetMapId,
            zoneId: null,
            surfacePercent: percent,
            amount: 0
          })) || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        }

        if (lifecycle?.status === "active" && targetMapId !== currentMapId) {
          changed = manager.pauseMission(
            instanceId,
            "Mission locale masquée hors de sa map."
          ) === true || changed;
        }
      }
      return changed;
    }

    reconcileLocalExploration(state = BF.getMissionState?.() || {}) {
      if (this.localExplorationReconciling) return false;
      const manager = this.manager();
      if (!manager) return false;
      const unlockFact = "localExplorationUnlocked:v1";
      const backfillFact = "localExplorationBackfillComplete:v1";
      const t10Completed =
        manager.memory?.state?.missionLifecycle?.T10?.status === "completed";
      const unlocked = Boolean(manager.memory?.getFact?.(unlockFact, false));
      const backfilled = Boolean(manager.memory?.getFact?.(backfillFact, false));
      if (!unlocked && !t10Completed) return false;
      if (unlocked && backfilled) return false;

      this.localExplorationReconciling = true;
      try {
        if (!unlocked) {
          manager.memory?.setFact?.(unlockFact, {
            missionId: "T10",
            unlockedAt: Date.now()
          });
        }
        const maps = BF.getExplorationSummary?.().maps || {};
        let changed = false;
        Object.entries(maps).forEach(([mapId, exploration]) => {
          changed = this.reconcileLocalExplorationMap(
            mapId,
            exploration?.surfacePercent
          ) || changed;
        });
        manager.memory?.setFact?.(backfillFact, {
          completedAt: Date.now(),
          mapCount: Object.keys(maps).length
        });
        manager.memory?.save?.();
        return changed;
      } finally {
        this.localExplorationReconciling = false;
      }
    }

    pauseOffMapLocalExploration(currentMapId) {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      [...(manager.activeMissionIds || [])].forEach((missionId) => {
        const definition = manager.definition?.(missionId);
        if (
          definition?.localVisibility === "current-map" &&
          String(definition.scopeId || "") !== String(currentMapId || "")
        ) {
          changed = manager.pauseMission(
            missionId,
            "Mission locale masquée hors de sa map."
          ) === true || changed;
        }
      });
      return changed;
    }

    resumeCurrentMapLocalMissions(currentMapId) {
      const manager = this.manager();
      const lifecycles = manager?.memory?.state?.missionLifecycle || {};
      if (!manager || !currentMapId) return false;
      let changed = false;
      Object.entries(lifecycles).forEach(([missionId, lifecycle]) => {
        if (lifecycle?.status !== "paused") return;
        const separator = String(missionId).indexOf("@");
        if (separator < 1) return;
        const baseId = String(missionId).slice(0, separator);
        const scopeId = String(missionId).slice(separator + 1);
        const template = this.byId.get(baseId);
        if (!template?.localMission || scopeId !== String(currentMapId)) return;
        changed = manager.resumeMission?.(missionId, {
          primary: false,
          autoPrimaryEligible: false,
          source: "local-mission-return"
        }) === true || changed;
      });
      return changed;
    }

    restoreLocalExplorationSession() {
      if (this.localExplorationSessionRestored) return false;
      const manager = this.manager();
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return false;
      }
      this.localExplorationSessionRestored = true;
      const mapId = String(BF.currentEngine?.currentMapId || "");
      if (!mapId) return false;
      this.localExplorationSessionMapId = mapId;
      this.localExplorationAwaitingPostArrival = null;
      const paused = this.pauseOffMapLocalExploration(mapId);
      const resumed = this.resumeCurrentMapLocalMissions(mapId);
      const exploration = BF.getMapExplorationState?.(mapId);
      return this.reconcileLocalExplorationMap(
        mapId,
        exploration?.surfacePercent
      ) || resumed || paused;
    }

    constructionTemplate(kind) {
      return BF.BibleConstructionTemplates?.[lower(kind)] || null;
    }

    constructionMissionId(kind, mapId) {
      return `${String(kind || "").trim().toUpperCase()}@${String(mapId || "").trim()}`;
    }

    buildConstructionMission(kind, mapId, source = "player") {
      const normalizedKind = lower(kind);
      const targetMapId = String(mapId || "").trim();
      const template = this.constructionTemplate(normalizedKind);
      if (!template || !targetMapId) return null;
      const id = this.constructionMissionId(normalizedKind, targetMapId);
      return {
        ...clone(template),
        id,
        title: template.title,
        constructionMission: true,
        constructionKind: normalizedKind,
        targetMapId,
        instanceScope: "map",
        activationSource: source === "autonomy" ? "autonomy" : "player",
        trigger: { type: "manual" },
        completionGate: {
          type: "proximity.shelter",
          mapId: targetMapId,
          shelterKinds: [normalizedKind],
          radius: 9999,
          scope: "current-map"
        }
      };
    }

    restoreConstructionInstances() {
      Object.values(this.state?.constructionInstances || {}).forEach((record) => {
        const mission = this.buildConstructionMission(
          record?.kind,
          record?.mapId,
          record?.source || "player"
        );
        if (!mission) return;
        this.dynamicMissions.set(mission.id, mission);
        this.byId.set(mission.id, mission);
      });
    }

    registerDynamicMission(mission) {
      if (!mission?.id) return false;
      this.dynamicMissions.set(mission.id, mission);
      this.byId.set(mission.id, mission);
      const compiled = this.compileMission(mission);
      if (!compiled || typeof BF.registerMissionDefinitions !== "function") {
        return false;
      }
      BF.registerMissionDefinitions([compiled]);
      return Boolean(Missions.getDefinition?.(mission.id));
    }

    siteBucket(mapId) {
      const memory = this.manager()?.memory;
      const raw = memory?.state?.siteProgression?.[mapId] || null;
      if (!raw) return { camp: null, refuge: null, base: null };
      const sites = raw.sites && typeof raw.sites === "object"
        ? raw.sites
        : { [raw.kind]: raw };
      return {
        camp: sites.camp || null,
        refuge: sites.refuge || null,
        base: sites.base || null
      };
    }

    constructionAvailability(kind, mapId = BF.currentEngine?.currentMapId) {
      const normalizedKind = lower(kind);
      const targetMapId = String(mapId || "");
      const rewardId = normalizedKind === "camp"
        ? "camp-establish-v1"
        : normalizedKind === "refuge"
          ? "refuge-build-v1"
          : null;
      const missionId = this.constructionMissionId(normalizedKind, targetMapId);
      const lifecycle = this.missionLifecycle(missionId);
      const sites = this.siteBucket(targetMapId);
      const unlocked = Boolean(rewardId && this.isResearchRewardUnlocked(rewardId));
      let allowed = unlocked && Boolean(targetMapId) && !lifecycle.active && !lifecycle.completed;
      let reason = "Disponible sur cette map.";

      if (!unlocked) {
        allowed = false;
        reason = "Plan non débloqué.";
      } else if (lifecycle.active) {
        allowed = false;
        reason = "Construction déjà suivie dans les missions actives.";
      } else if (normalizedKind === "camp" && (sites.camp || sites.refuge || sites.base)) {
        allowed = false;
        reason = "Une infrastructure est déjà implantée sur cette map.";
      } else if (normalizedKind === "refuge" && !sites.camp) {
        allowed = false;
        reason = "Un camp doit d'abord être établi sur cette map.";
      } else if (normalizedKind === "refuge" && (sites.refuge || sites.base)) {
        allowed = false;
        reason = "Un refuge ou une base existe déjà sur cette map.";
      }

      return {
        kind: normalizedKind,
        mapId: targetMapId,
        missionId,
        rewardId,
        unlocked,
        active: lifecycle.active,
        completed: lifecycle.completed,
        allowed,
        reason,
        sites
      };
    }

    startConstruction(kind, options = {}) {
      const targetMapId = String(options.mapId || BF.currentEngine?.currentMapId || "");
      const source = options.source === "autonomy" ? "autonomy" : "player";
      const availability = this.constructionAvailability(kind, targetMapId);
      if (!availability.allowed) return false;
      const mission = this.buildConstructionMission(kind, targetMapId, source);
      if (!mission || !this.registerDynamicMission(mission)) return false;
      this.state.constructionInstances[mission.id] = {
        missionId: mission.id,
        kind: mission.constructionKind,
        mapId: targetMapId,
        source,
        createdAt: Date.now()
      };
      this.saveState();
      const activated = this.activateMission(mission, {
        type: source === "autonomy" ? "autonomy.construction" : "research.blueprint",
        mapId: targetMapId,
        subject: mission.constructionKind
      });
      if (!activated) return false;
      this.applyActivationInventoryCredits(mission);
      global.dispatchEvent?.(new CustomEvent("bluefox:construction-mission-started", {
        detail: { missionId: mission.id, kind: mission.constructionKind, mapId: targetMapId, source }
      }));
      return mission.id;
    }

    validate() {
      if (!BF.BibleContractV01?.validateCatalog) {
        return {
          ok: false,
          errors: ["BibleContractV01 indisponible."],
          warnings: []
        };
      }

      return BF.BibleContractV01.validateCatalog(
        this.catalog,
        this.patterns,
        { compatibility: "strict" }
      );
    }

    compileMission(mission) {
      const pattern = this.patterns[mission?.pattern];
      if (!mission || !pattern) return null;

      const psychology = {
        ponderation: mission.ponderation ?? null,
        obsessionEligible: mission.obsessionEligible === true,
        obsessionIntensity: mission.obsessionIntensity ?? null,
        souvenir: mission.souvenir === true,
        memoryValence: mission.memoryValence ?? null,
        scoreTrauma: mission.scoreTrauma ?? null,
        narrativeAxis: mission.narrativeAxis ?? null,
        reinforcesNarrativeAxis: mission.reinforcesNarrativeAxis
          ? clone(mission.reinforcesNarrativeAxis)
          : null
      };

      if (mission.pattern === "SEQUENCE_ACTIONS") {
        const steps = asArray(mission.sequence)
          .filter((step) => step && typeof step === "object");
        if (steps.length < (mission.constructionMission === true ? 1 : 2)) return null;

        const nodeIds = steps.map((step, index) =>
          `${mission.id}:${step.slot || `step${index + 1}`}`
        );

        const children = steps.map((step, index) => {
          const slot = step.slot || `step${index + 1}`;
          const requires = step.requires != null
            ? asArray(step.requires)
                .map((required) => {
                  const requiredIndex = steps.findIndex(
                    (candidate, candidateIndex) =>
                      (
                        candidate.slot ||
                        `step${candidateIndex + 1}`
                      ) === required
                  );
                  return requiredIndex >= 0
                    ? nodeIds[requiredIndex]
                    : null;
                })
                .filter(Boolean)
            : index > 0
              ? [nodeIds[index - 1]]
              : [];

          return {
            id: nodeIds[index],
            title: step.title || slot,
            description: step.description || "",
            type:
              Missions.normalizeActionType?.(step.action) ||
              String(step.action || "").trim().toLowerCase(),
            target: Math.max(1, Number(step.target) || 1),
            params: {
              ...(step.params || {}),
              bibleMissionId: mission.id,
              biblePattern: mission.pattern,
              sequenceIndex: index,
              sequenceSlot: slot,
              sameTarget:
                mission.sameTarget === true ||
                step.sameTarget === true
            },
            requires,
            optional: step.optional === true
          };
        });

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description || "",
          instanceScope: mission.instanceScope || null,
          localVisibility: mission.localVisibility || null,
          backgroundHud: mission.backgroundHud === true,
          targetMapId: mission.targetMapId || null,
          narrativeOnly:
            mission.narrativeOnly === true || mission.pattern === "NARRATIVE_ONLY",
          priority: Number(mission.priority) || 0,
          passivePriorityAxis:
            mission.passivePriorityAxis ||
            pattern.autonomyAxis ||
            null,
          ...psychology,
          journalIntro: mission.narrative?.revealed?.[0] || "",
          navigation: mission.navigation ? clone(mission.navigation) : null,
          returnPolicy: mission.returnPolicy ? clone(mission.returnPolicy) : null,
          allowsAutonomousRationCraft:
            mission.allowsAutonomousRationCraft === true,
          runtimeCounters: Array.isArray(mission.runtimeCounters)
            ? clone(mission.runtimeCounters)
            : null,
          sequence: Array.isArray(mission.sequence)
            ? clone(mission.sequence)
            : null,
          bible: {
            version: VERSION,
            pattern: mission.pattern
          },
          root: {
            id: `${mission.id}:root`,
            title: mission.title,
            type: "group",
            target: 1,
            children
          }
        };
      }

      const nodeIds = Object.fromEntries(
        (pattern.steps || []).map((step) => [
          step.slot,
          `${mission.id}:${step.slot}`
        ])
      );

      const children = [];
      (pattern.steps || []).forEach((step) => {
        const specific = mission.slots?.[step.slot] || {};
        const requirements =
          mission.pattern === "COLLECT_THEN_REWARD" &&
          step.slot === "collect" &&
          Array.isArray(specific.requirements) &&
          specific.requirements.length
            ? specific.requirements
            : null;

        if (requirements) {
          requirements.forEach((requirement, index) => {
            children.push({
              id: `${mission.id}:${step.slot}:${index + 1}`,
              title:
                requirement.title ||
                specific.title ||
                `${step.slot} ${index + 1}`,
              description:
                requirement.description ||
                specific.description ||
                "",
              type: step.action,
              target: Math.max(1, Number(requirement.target) || 1),
              params: {
                ...(specific.params || {}),
                ...(requirement.params || {}),
                bibleMissionId: mission.id,
                biblePattern: mission.pattern,
                bibleRequirementIndex: index,
                catalogManaged:
                  requirement.params?.historicalCollection === true ||
                  specific.params?.historicalCollection === true
              },
              requires: (step.requires || [])
                .map((slot) => nodeIds[slot])
                .filter(Boolean)
            });
          });
          return;
        }

        children.push({
          id: nodeIds[step.slot],
          title: specific.title || step.slot,
          description: specific.description || "",
          type: step.action,
          target: Math.max(1, Number(specific.target) || 1),
          params: {
            ...(specific.params || {}),
            catalogManaged: specific.params?.catalogManaged === true,
            bibleMissionId: mission.id,
            biblePattern: mission.pattern
          },
          requires: (step.requires || [])
            .map((slot) => nodeIds[slot])
            .filter(Boolean)
        });
      });

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description || "",
        instanceScope: mission.instanceScope || null,
        localVisibility: mission.localVisibility || null,
        backgroundHud: mission.backgroundHud === true,
        targetMapId: mission.targetMapId || null,
        narrativeOnly:
          mission.narrativeOnly === true || mission.pattern === "NARRATIVE_ONLY",
        priority: Number(mission.priority) || 0,
        passivePriorityAxis:
          mission.passivePriorityAxis ||
          pattern.autonomyAxis ||
          null,
        ...psychology,
        journalIntro: mission.narrative?.revealed?.[0] || "",
        navigation: mission.navigation ? clone(mission.navigation) : null,
        returnPolicy: mission.returnPolicy ? clone(mission.returnPolicy) : null,
        allowsAutonomousRationCraft:
          mission.allowsAutonomousRationCraft === true,
        runtimeCounters: Array.isArray(mission.runtimeCounters)
          ? clone(mission.runtimeCounters)
          : null,
        sequence: Array.isArray(mission.sequence)
          ? clone(mission.sequence)
          : null,
        bible: {
          version: VERSION,
          pattern: mission.pattern
        },
        root: {
          id: `${mission.id}:root`,
          title: mission.title,
          type: "group",
          target: 1,
          children
        }
      };
    }

    registerDefinitions() {
      const report = this.validate();
      if (!report.ok) {
        console.error("[BlueFox] Bible Runtime V0.1 : contrat invalide.", report);
        return { ...report, registered: 0 };
      }

      const definitions = this.allMissions()
        .map((mission) => this.compileMission(mission))
        .filter(Boolean);

      const registered =
        typeof BF.registerMissionDefinitions === "function"
          ? BF.registerMissionDefinitions(definitions)
          : 0;

      return {
        ...report,
        registered: Number(registered) || definitions.length
      };
    }

    manager() {
      return BF.currentEngine?.missionManager || null;
    }

    observationMemoryKey() {
      return "observationCoverage:v1";
    }

    observationMemory() {
      const memory = this.manager()?.memory;
      const current = memory?.getFact?.(this.observationMemoryKey(), null);
      return current && typeof current === "object"
        ? current
        : {
            version: 1,
            maps: {},
            mapsReached50: [],
            mapsReached100: []
          };
    }

    observationPoint(object, engine = BF.currentEngine) {
      const anchor = object?.userData?.worldAnchor || object;
      if (!anchor) return { x: 0, y: 0, z: 0 };
      if (anchor.getWorldPosition && engine?.THREE?.Vector3) {
        const point = anchor.getWorldPosition(new engine.THREE.Vector3());
        return {
          x: Number(point.x) || 0,
          y: Number(point.y) || 0,
          z: Number(point.z) || 0
        };
      }
      const point = anchor.position || object?.position || {};
      return {
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
        z: Number(point.z) || 0
      };
    }

    observationCoordinate(value) {
      return (Math.round((Number(value) || 0) * 1000) / 1000)
        .toFixed(3);
    }

    observationObjectKey(mapId, object, engine = BF.currentEngine) {
      const anchor = object?.userData?.worldAnchor || object;
      const data = object?.userData || {};
      const rootData = anchor?.userData || {};
      const definition =
        data.functional ||
        rootData.functional ||
        BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
        BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
        null;
      const catalogId = String(
        data.catalogId ||
        rootData.catalogId ||
        definition?.id ||
        data.libraryType ||
        rootData.libraryType ||
        "object"
      );
      const variant = Number(
        data.variant ?? rootData.variant ?? 0
      ) || 0;
      const point = this.observationPoint(object, engine);
      return `${mapId}:obj:${catalogId}:${variant}:` +
        `${this.observationCoordinate(point.x)}:` +
        `${this.observationCoordinate(point.y)}:` +
        `${this.observationCoordinate(point.z)}`;
    }

    observationMicroSceneKey(mapId, entry, engine = BF.currentEngine) {
      const records = Array.isArray(entry?.records) ? entry.records : [];
      const anchor = entry?.instanceRoot || records[0]?.root || null;
      const point = anchor
        ? this.observationPoint(anchor, engine)
        : { x: 0, y: 0, z: 0 };
      return `${mapId}:msc:${String(entry?.id || "unknown")}:` +
        `${this.observationCoordinate(point.x)}:` +
        `${this.observationCoordinate(point.y)}:` +
        `${this.observationCoordinate(point.z)}`;
    }

    isObservationCandidate(object) {
      // Le dénominateur représente le peuplement initial, pas seulement les
      // objets encore actifs au premier événement d'étude. Un objet déjà
      // collecté reste donc comptable s'il faisait partie des interactables.
      if (!object) return false;
      const anchor = object.userData?.worldAnchor || object;
      const data = object.userData || {};
      const rootData = anchor?.userData || {};
      const definition =
        data.functional ||
        rootData.functional ||
        BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
        BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
        null;
      const actions = new Set(
        asArray(
          definition?.interaction?.actions ||
          data.interaction?.actions ||
          rootData.interaction?.actions
        ).map(lower)
      );
      return ["observe", "inspect", "analyze"].some((action) =>
        actions.has(action)
      );
    }

    environmentDefinition(objectId) {
      const id = String(objectId || "");
      if (!id) return null;
      return BF.ObjectLibrary?.getById?.(id) ||
        BF.ObjectLibrary?.get?.(id) ||
        BF.ObjectLibrary?.list?.({ status: "active" })?.find?.((definition) =>
          String(definition?.id || "") === id ||
          String(definition?.type || "") === id
        ) || null;
    }

    environmentMetadata(definition = {}) {
      const actions = new Set(asArray(definition?.interaction?.actions).map(lower));
      const tags = new Set([
        ...asArray(definition?.spawn?.tags),
        ...asArray(definition?.situation?.tags)
      ].map(lower));
      const type = lower(definition?.type);
      const category = lower(definition?.category);
      const family = lower(definition?.knowledge?.family || definition?.family || category);
      const subject = lower(definition?.semantic?.subject || family || category || type);
      const collectable =
        definition?.gameplay?.collectable === true ||
        actions.has("collect") || actions.has("extract") ||
        Boolean(definition?.resource?.inventoryKey) ||
        lower(definition?.resource?.exploitability) === "extractable";
      const observable = ["observe", "inspect", "analyze"].some((action) => actions.has(action));
      return { actions, tags, type, category, family, subject, collectable, observable };
    }

    environmentFamilyMatches(familyName, definition) {
      if (!definition) return false;
      const familyKey = String(familyName || "").toUpperCase();
      const metadata = this.environmentMetadata(definition);
      if (!metadata.observable) return false;

      if (familyKey === "RELIC") {
        if (["ancient-ruin", "relic", "ruin"].includes(metadata.family) ||
            ["ancient-ruin", "relic", "ruin"].includes(metadata.subject) ||
            metadata.category === "ruins" || metadata.tags.has("ruin")) {
          return true;
        }
        if (metadata.type === "stele" || metadata.tags.has("stele")) return true;
        const explicitAncientTrace =
          metadata.tags.has("ancient") ||
          metadata.tags.has("ancient-ruin") ||
          metadata.tags.has("relic") ||
          metadata.family === "ancient" ||
          metadata.subject === "ancient";
        return metadata.type === "arch" && explicitAncientTrace;
      }

      if (familyKey === "ROCK") {
        if (metadata.collectable) return false;
        return ["geology", "geological", "rock", "stone"].includes(metadata.family) ||
          ["geology", "geological", "rock", "stone"].includes(metadata.subject) ||
          ["rock", "stone", "boulder", "cliff"].includes(metadata.type) ||
          metadata.tags.has("rock") || metadata.tags.has("geology");
      }

      if (familyKey === "PLANT") {
        if (metadata.collectable) return false;
        return metadata.family === "flora" ||
          metadata.subject === "flora" ||
          metadata.category === "flora" ||
          ["plant", "tree", "fern", "vine", "liana", "liane"].includes(metadata.type) ||
          ["plant", "tree", "fern", "vine", "liana", "liane"].some((tag) => metadata.tags.has(tag));
      }
      return false;
    }

    environmentHistoricalCount(familyName) {
      const snapshot = BF.progression?.snapshot?.() || BF.progression?.state || {};
      const instances = snapshot?.discoveries?.instances || {};
      let total = 0;
      Object.entries(instances).forEach(([instanceId, record]) => {
        if (!instanceId) return;
        const definition = this.environmentDefinition(record?.objectId);
        if (this.environmentFamilyMatches(familyName, definition)) total += 1;
      });
      return total;
    }

    buildObservationResolver(engine = BF.currentEngine) {
      const map = engine?.currentMap;
      const mapId = engine?.currentMapId;
      if (!map || !mapId) return null;

      const cached = this.observationResolvers.get(map);
      if (cached?.mapId === mapId) return cached;

      const byInstance = new Map();
      const observable = new Set();
      const envEligible = { RELIC: new Set(), ROCK: new Set(), PLANT: new Set() };
      const initialMscInstances = Array.isArray(map.group?.userData?.microScenes)
        ? map.group.userData.microScenes
        : [];
      const initialMscMembers = new Map();

      initialMscInstances.forEach((entry) => {
        const key = this.observationMicroSceneKey(mapId, entry, engine);
        (entry.records || []).forEach((record) => {
          if (record?.instanceId) {
            initialMscMembers.set(String(record.instanceId), key);
          }
        });
      });

      (map.interactables || []).forEach((object) => {
        if (!this.isObservationCandidate(object)) return;
        const anchor = object.userData?.worldAnchor || object;
        const data = object.userData || {};
        const rootData = anchor?.userData || {};
        const instanceId = String(
          data.instanceId || rootData.instanceId || ""
        );
        if (!instanceId) return;

        const definition =
          data.functional ||
          rootData.functional ||
          BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
          BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
          null;
        ["RELIC", "ROCK", "PLANT"].forEach((family) => {
          if (this.environmentFamilyMatches(family, definition)) {
            envEligible[family].add(instanceId);
          }
        });

        const initialMscKey = initialMscMembers.get(instanceId);
        if (initialMscKey) {
          byInstance.set(instanceId, initialMscKey);
          observable.add(initialMscKey);
          return;
        }

        const landmarkId = String(
          data.biomeLandmark || rootData.biomeLandmark || ""
        );
        if (landmarkId && BF.MicroScenes?.get?.(landmarkId)) {
          const landmarkKey = `${mapId}:msc:${landmarkId}:landmark`;
          byInstance.set(instanceId, landmarkKey);
          observable.add(landmarkKey);
          return;
        }

        if (data.microSceneId || rootData.microSceneId) return;

        const key = this.observationObjectKey(mapId, object, engine);
        byInstance.set(instanceId, key);
        observable.add(key);
      });

      const resolver = {
        mapId,
        byInstance,
        observable: [...observable],
        envEligible: Object.fromEntries(
          Object.entries(envEligible).map(([family, ids]) => [family, [...ids]])
        )
      };
      this.observationResolvers.set(map, resolver);
      return resolver;
    }

    environmentFamilyCoverageSeed(mapId, resolver) {
      const discoveredInstances = BF.progression?.snapshot?.()?.discoveries?.instances ||
        BF.progression?.state?.discoveries?.instances || {};
      return Object.fromEntries(
        ["RELIC", "ROCK", "PLANT"].map((family) => {
          const eligibleInstanceIds = [...(resolver?.envEligible?.[family] || [])];
          const eligible = new Set(eligibleInstanceIds);
          const observedInstanceIds = Object.entries(discoveredInstances)
            .filter(([instanceId, record]) =>
              eligible.has(String(instanceId)) && String(record?.mapId || "") === String(mapId)
            )
            .map(([instanceId]) => String(instanceId));
          return [family, { eligibleInstanceIds, observedInstanceIds }];
        })
      );
    }

    captureObservationMap(engine = BF.currentEngine) {
      const manager = this.manager();
      const mapId = engine?.currentMapId;
      if (!manager?.memory || !mapId) return false;

      const coverage = this.observationMemory();
      const resolver = this.buildObservationResolver(engine);
      if (coverage.maps?.[mapId]?.frozen === true) {
        if (!resolver) return false;
        const current = coverage.maps[mapId];
        const hasEnvCoverage = current?.envFamilies &&
          ["RELIC", "ROCK", "PLANT"].every((family) => current.envFamilies[family]);
        if (hasEnvCoverage) return false;
        const next = clone(coverage);
        next.maps[mapId].envFamilies = this.environmentFamilyCoverageSeed(mapId, resolver);
        manager.memory.setFact(this.observationMemoryKey(), next);
        return true;
      }


      if (!resolver) return false;
      const next = clone(coverage);
      next.maps = next.maps || {};
      next.mapsReached50 = asArray(next.mapsReached50);
      next.mapsReached100 = asArray(next.mapsReached100);
      next.maps[mapId] = {
        mapId,
        observableEntityIds: [...resolver.observable],
        observedEntityIds: [],
        envFamilies: this.environmentFamilyCoverageSeed(mapId, resolver),
        frozen: true,
        frozenAt: Date.now(),
        seed: BF.maps?.[mapId]?.seed ?? null
      };
      manager.memory.setFact(this.observationMemoryKey(), next);

      global.dispatchEvent?.(
        new CustomEvent("bluefox:observation-coverage-changed", {
          detail: this.observationCoverage(mapId, next)
        })
      );
      return true;
    }

    observationCoverage(mapId = BF.currentEngine?.currentMapId, source = null) {
      const coverage = source || this.observationMemory();
      const entry = coverage.maps?.[mapId] || null;
      const total = entry?.observableEntityIds?.length || 0;
      const observed = entry?.observedEntityIds?.length || 0;
      const percent = total > 0
        ? Math.min(100, (observed / total) * 100)
        : 0;
      return {
        mapId: mapId || null,
        observed,
        total,
        percent,
        reached50: asArray(coverage.mapsReached50).includes(mapId),
        reached100: asArray(coverage.mapsReached100).includes(mapId),
        frozen: entry?.frozen === true
      };
    }

    environmentMapCoverage(mapId, familyName, source = null) {
      const coverage = source || this.observationMemory();
      const family = String(familyName || "").toUpperCase();
      const entry = coverage.maps?.[mapId] || null;
      const familyEntry = entry?.envFamilies?.[family] || null;
      if (!familyEntry) {
        return { mapId: mapId || null, family, known: false, observed: 0, total: 0, percent: 0 };
      }
      const eligible = new Set(asArray(familyEntry.eligibleInstanceIds));
      const observed = new Set(
        asArray(familyEntry.observedInstanceIds).filter((instanceId) => eligible.has(instanceId))
      );
      const total = eligible.size;
      return {
        mapId: mapId || null,
        family,
        known: true,
        observed: observed.size,
        total,
        percent: total === 0 ? 100 : Math.min(100, (observed.size / total) * 100)
      };
    }

    observationTotals(source = null) {
      const coverage = source || this.observationMemory();
      return {
        mapsObserved50Count: new Set(asArray(coverage.mapsReached50)).size,
        mapsObserved100Count: new Set(asArray(coverage.mapsReached100)).size
      };
    }

    recordObservation(rawEvent) {
      if (![
        "OBJECT_SEEN",
        "OBJECT_INSPECTED",
        "OBJECT_ANALYZED",
        "PHENOMENON_OBSERVED"
      ].includes(rawEvent?.type)) {
        return false;
      }

      const engine = BF.currentEngine;
      const manager = this.manager();
      const mapId = rawEvent?.mapId || engine?.currentMapId;
      if (!engine?.currentMap || !manager?.memory || !mapId) return false;
      if (String(engine.currentMapId || "") !== String(mapId)) return false;

      this.captureObservationMap(engine);
      const resolver = this.buildObservationResolver(engine);
      const instanceId = String(rawEvent?.instanceId || "");
      const entityId = instanceId
        ? resolver?.byInstance?.get(instanceId)
        : null;
      const environmentEligible = instanceId && ["RELIC", "ROCK", "PLANT"].some((family) =>
        asArray(resolver?.envEligible?.[family]).includes(instanceId)
      );
      if (!entityId && !environmentEligible) return false;

      const coverage = this.observationMemory();
      const mapCoverage = coverage.maps?.[mapId];
      if (!mapCoverage?.frozen) return false;
      if (entityId && !mapCoverage.observableEntityIds?.includes(entityId)) return false;

      const next = clone(coverage);
      const entry = next.maps[mapId];
      entry.observedEntityIds = asArray(entry.observedEntityIds);
      let changed = false;
      if (entityId && !entry.observedEntityIds.includes(entityId)) {
        entry.observedEntityIds.push(entityId);
        changed = true;

        const observed = entry.observedEntityIds.length;
        const total = entry.observableEntityIds.length;
        if (total > 0 && observed * 2 >= total) {
          const reached50 = new Set(asArray(next.mapsReached50));
          reached50.add(mapId);
          next.mapsReached50 = [...reached50];
        }
        if (total > 0 && observed >= total) {
          const reached100 = new Set(asArray(next.mapsReached100));
          reached100.add(mapId);
          next.mapsReached100 = [...reached100];
        }
      }

      const physicalInstanceId = String(rawEvent?.instanceId || "");
      if (physicalInstanceId) {
        ["RELIC", "ROCK", "PLANT"].forEach((family) => {
          const familyEntry = next.maps?.[mapId]?.envFamilies?.[family];
          if (!familyEntry) return;
          if (!asArray(familyEntry.eligibleInstanceIds).includes(physicalInstanceId)) return;
          familyEntry.observedInstanceIds = asArray(familyEntry.observedInstanceIds);
          if (!familyEntry.observedInstanceIds.includes(physicalInstanceId)) {
            familyEntry.observedInstanceIds.push(physicalInstanceId);
            changed = true;
          }
        });
      }

      if (!changed) return false;
      manager.memory.setFact(this.observationMemoryKey(), next);

      global.dispatchEvent?.(
        new CustomEvent("bluefox:observation-coverage-changed", {
          detail: {
            ...this.observationCoverage(mapId, next),
            ...this.observationTotals(next),
            entityId
          }
        })
      );
      return true;
    }

    missionLifecycle(missionId) {
      const manager = this.manager();
      const lifecycle =
        manager?.memory?.state?.missionLifecycle?.[missionId] || null;
      const tree = manager?.trees?.get?.(missionId) || null;
      const publicEntry =
        (BF.getMissionState?.()?.missions || []).find((entry) =>
          (entry.missionId || entry.id) === missionId
        ) || null;

      const status =
        lifecycle?.status ||
        publicEntry?.lifecycleStatus ||
        publicEntry?.status ||
        null;

      return {
        status,
        lifecycle,
        tree,
        active:
          status === "active" ||
          status === "paused" ||
          manager?.activeMissionIds?.includes?.(missionId) === true,
        completed:
          status === "completed"
      };
    }

    normalizeObjectEvent(event) {
      const type = OBJECT_TYPE_TO_TRIGGER[event?.type];
      if (!type) return null;

      const definition =
        BF.ObjectLibrary?.getById?.(event?.objectId) ||
        BF.ObjectLibrary?.get?.(event?.detail?.kind) ||
        null;

      const tags = [...new Set([
        ...(event?.tags || []),
        ...(event?.detail?.tags || []),
        ...(definition?.spawn?.tags || []),
        ...(definition?.situation?.tags || [])
      ].map(lower).filter(Boolean))];

      const family = lower(
        event?.family ||
        event?.knowledgeFamily ||
        event?.detail?.family ||
        definition?.knowledge?.family
      );

      const category = lower(
        event?.category ||
        event?.detail?.category ||
        definition?.category
      );

      const subject = lower(
        // Sur le dépôt propre, une ressource peut avoir family="fiber"
        // tout en ayant knowledgeFamily="flora". La sémantique narrative
        // doit donc privilégier la famille de connaissance.
        definition?.semantic?.subject ||
        event?.knowledgeFamily ||
        definition?.knowledge?.family ||
        event?.subject ||
        event?.detail?.subject ||
        category ||
        family
      );

      const kind = lower(
        event?.inventoryKey ||
        event?.detail?.kind ||
        definition?.resource?.inventoryKey ||
        definition?.type ||
        event?.family ||
        event?.objectId
      );

      return {
        eventId: event.id || null,
        type,
        rawType: event.type,
        objectId: lower(event.objectId),
        cuoType: lower(event.detail?.cuoType || definition?.type),
        objectLabel:
          event.objectLabel ||
          event.displayName ||
          event.detail?.label ||
          definition?.label ||
          null,
        instanceId: event.instanceId || null,
        persistentMicroSceneId:
          event.persistentMicroSceneId ||
          event.detail?.persistentMicroSceneId ||
          null,
        kind,
        family,
        category,
        subject,
        tags,
        mapId: event.mapId ?? BF.currentEngine?.currentMapId ?? null,
        zoneId: event.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
        amount: Math.max(
          1,
          Number(event.quantity ?? event.detail?.amount ?? 1) || 1
        )
      };
    }

    eventMatchesTrigger(trigger, event) {
      if (!trigger || !event || trigger.type !== event.type) return false;
      if (
        trigger.studyOnly === true &&
        !["interaction.observe", "interaction.inspect", "interaction.analyze"].includes(
          OBJECT_TYPE_TO_TRIGGER[event.rawType] || event.rawType
        )
      ) return false;

      const exactKeys = [
        "objectId", "kind", "family", "subject",
        "mapId", "zoneId", "direction", "fromMapId", "toMapId",
        "missionId", "milestoneId", "skillId", "biome"
      ];

      for (const key of exactKeys) {
        if (
          trigger[key] != null &&
          lower(trigger[key]) !== lower(event[key])
        ) {
          return false;
        }
      }

      const eventTags = new Set(asArray(event.tags).map(lower));

      if (
        trigger.tagsAny?.length &&
        !trigger.tagsAny.some((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (
        trigger.tagsAll?.length &&
        !trigger.tagsAll.every((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (trigger.threshold != null) {
        const value = Number(
          event.surfacePercent ??
          event.thresholdValue ??
          event.percent ??
          0
        );
        if (value < Number(trigger.threshold)) return false;
      }

      return true;
    }

    triggerKey(mission) {
      return `${mission.id}:${mission.trigger?.type || "none"}`;
    }

    incrementTrigger(mission, event) {
      const trigger = mission.trigger;
      const key = this.triggerKey(mission);

      if (trigger.uniqueOnly) {
        const identity =
          event.instanceId ||
          event.toMapId ||
          `${event.mapId ?? ""}:${event.zoneId ?? ""}:${event.objectId ?? ""}`;

        const values = new Set(this.state.uniqueTriggerValues[key] || []);
        if (identity) values.add(String(identity));
        this.state.uniqueTriggerValues[key] = [...values];
        this.state.triggerCounts[key] = values.size;
      } else {
        this.state.triggerCounts[key] =
          (Number(this.state.triggerCounts[key]) || 0) +
          Math.max(1, Number(event.amount) || 1);
      }

      this.saveState();
      return Number(this.state.triggerCounts[key]) || 0;
    }

    prerequisitesSatisfied(mission) {
      const missionPrerequisites = asArray(mission?.prerequisites).every((missionId) =>
        this.missionLifecycle(missionId).completed
      );
      if (!missionPrerequisites) return false;
      const memory = this.manager()?.memory;
      return asArray(mission?.requiredFacts).every((factKey) =>
        Boolean(memory?.getFact?.(factKey, false))
      );
    }

    survivalCapabilityUnlocked(capability) {
      const key = String(capability || "").trim();
      if (!key) return false;
      return this.catalog.some((mission) =>
        asArray(mission?.tutorialSurvivalUnlocks).includes(key) &&
        this.missionLifecycle(mission.id).completed
      );
    }

    runtimeCounterValue(source) {
      if (source === "rations.craftedTotal") {
        return Math.max(
          0,
          Number(BF.getRationState?.().craftedTotal) || 0
        );
      }
      if (source === "observations.distinctFamiliesHistorical") {
        const globalCounters = BF.getProgressionState?.().counters?.global || {};
        const eventType = String(
          BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED"
        );
        const prefix = `${eventType}:`;
        const families = new Set();
        Object.entries(globalCounters).forEach(([key, amount]) => {
          if (!String(key).startsWith(prefix)) return;
          if (Math.max(0, Number(amount) || 0) <= 0) return;
          const family = String(key).slice(prefix.length).trim().toLowerCase();
          if (family && family !== "unknown") families.add(family);
        });
        return families.size;
      }
      return null;
    }

    runtimeCounterBaselineKey(missionId, slot) {
      return `runtimeCounterBaseline:${missionId}:${slot}`;
    }

    initializeRuntimeCounters(mission) {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      asArray(mission?.runtimeCounters).forEach((counter) => {
        if (!counter?.slot || !counter?.source) return;
        const key = this.runtimeCounterBaselineKey(mission.id, counter.slot);
        if (manager.memory.getFact?.(key, null) != null) return;
        const current = this.runtimeCounterValue(counter.source);
        if (current == null) return;
        manager.memory.setFact?.(key, {
          source: counter.source,
          value: counter.baselineOnActivation === false ? 0 : current,
          capturedAt: Date.now()
        });
        changed = true;
      });
      if (changed) manager.memory.save?.();
      return changed;
    }

    reconcileRuntimeCounters(missionFilter = null) {
      const manager = this.manager();
      if (!manager?.memory) return 0;
      let changed = 0;
      this.catalog.forEach((mission) => {
        if (missionFilter && mission.id !== missionFilter) return;
        const counters = asArray(mission?.runtimeCounters);
        if (!counters.length) return;
        if (!this.missionLifecycle(mission.id).active) return;
        this.initializeRuntimeCounters(mission);
        const tree = manager.trees?.get?.(mission.id);
        if (!tree) return;
        let treeChanged = false;
        counters.forEach((counter) => {
          const node = tree.find?.(`${mission.id}:${counter.slot}`);
          if (!node || node.isComplete) return;
          const current = this.runtimeCounterValue(counter.source);
          if (current == null) return;
          const baselineRecord = manager.memory.getFact?.(
            this.runtimeCounterBaselineKey(mission.id, counter.slot),
            { value: 0 }
          );
          const baseline = Math.max(0, Number(baselineRecord?.value) || 0);
          const value = Math.max(0, current - baseline);
          const absolute = Math.min(Number(node.target) || value, value);
          const delta = absolute - Number(node.progress || 0);
          if (delta > 0 && node.increment?.(delta)) {
            changed += 1;
            treeChanged = true;
          }
        });
        if (treeChanged) {
          tree.refresh?.();
          manager.memory.saveTree?.(tree);
        }
      });
      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    progressRuntimeValidationSlot(missionId, slot, amount = 1) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(missionId);
      const node = tree?.find?.(`${missionId}:${slot}`);
      if (!node || node.isComplete) return false;
      if (!tree.availableLeaves?.().includes?.(node)) return false;
      if (!node.increment?.(Math.max(1, Number(amount) || 1))) return false;
      tree.refresh?.();
      manager.memory?.saveTree?.(tree);
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish?.();
      return true;
    }

    onRationConsumed(detail = {}) {
      if (detail.automatic === true) return false;
      const energyBefore = Number(BF.getSurvivalState?.().energy);
      const mission = this.catalog.find((entry) =>
        this.missionLifecycle(entry.id).active &&
        entry?.runtimeValidation?.type === "manual-ration-energy-gain"
      );
      if (!mission || !Number.isFinite(energyBefore)) return false;
      const slot = mission.runtimeValidation.consumeSlot;
      if (!this.progressRuntimeValidationSlot(mission.id, slot, 1)) return false;
      this.pendingManualRationProof = {
        missionId: mission.id,
        energyBefore,
        consumedAt: Date.now()
      };
      return true;
    }

    onSurvivalChanged(detail = {}) {
      const proof = this.pendingManualRationProof;
      if (!proof) return false;
      if (String(detail.reason || "") !== "routine:food") return false;
      const mission = this.byId.get(proof.missionId);
      if (!mission || !this.missionLifecycle(mission.id).active) {
        this.pendingManualRationProof = null;
        return false;
      }
      const energyAfter = Number(
        detail?.state?.energy ?? BF.getSurvivalState?.().energy
      );
      const gained = Number.isFinite(energyAfter) &&
        energyAfter > Number(proof.energyBefore);
      this.pendingManualRationProof = null;
      if (!gained) return false;
      return this.progressRuntimeValidationSlot(
        mission.id,
        mission.runtimeValidation.gainSlot,
        1
      );
    }

    proximityContextEntries() {
      const manager = this.manager();
      if (!manager?.memory) return [];
      const entries = [];
      this.catalog.forEach((mission) => {
        const contexts = asArray(mission?.proximityContexts);
        if (!contexts.length) return;
        if (!this.missionLifecycle(mission.id).active) return;
        contexts.forEach((context) => {
          if (!context?.microSceneId || !context?.fact) return;
          if (manager.memory.getFact?.(context.fact, false)) return;
          entries.push({ mission, context });
        });
      });
      return entries;
    }

    microSceneProximityAnchor(microSceneId) {
      const map = BF.currentEngine?.currentMap;
      const entries = Array.isArray(map?.group?.userData?.microScenes)
        ? map.group.userData.microScenes
        : [];
      const normalized = String(microSceneId || "");
      const entry = entries.find((item) => String(item?.id || "") === normalized);
      if (!entry) return null;
      return entry.instanceRoot || entry.records?.[0]?.root || null;
    }

    reviewProximityContexts() {
      const engine = BF.currentEngine;
      const manager = this.manager();
      const player = engine?.character?.root?.position;
      if (!engine || !manager?.memory || !player) return false;
      let changed = false;
      this.proximityContextEntries().forEach(({ mission, context }) => {
        const anchor = this.microSceneProximityAnchor(context.microSceneId);
        if (!anchor) return;
        const point = this.observationPoint(anchor, engine);
        const radius = context.useSceneRadius === true
          ? Math.max(1, Number(BF.MicroScenes?.get?.(context.microSceneId)?.radius) || 8)
          : Math.max(1, Number(context.radius) || 8);
        const distance = Math.hypot(
          Number(player.x) - Number(point.x),
          Number(player.z) - Number(point.z)
        );
        if (distance > radius) return;
        manager.memory.setFact?.(context.fact, {
          active: true,
          missionId: mission.id,
          microSceneId: context.microSceneId,
          mapId: engine.currentMapId,
          reachedAt: Date.now()
        });
        manager.memory.save?.();
        changed = true;
        global.dispatchEvent?.(
          new CustomEvent("bluefox:bible-context-proximity", {
            detail: {
              id: context.id || context.fact,
              fact: context.fact,
              missionId: mission.id,
              microSceneId: context.microSceneId,
              mapId: engine.currentMapId,
              distance,
              radius
            }
          })
        );
      });
      if (changed) manager.publish?.();
      this.refreshProximityContextMonitor();
      return changed;
    }

    refreshProximityContextMonitor() {
      const needed = this.proximityContextEntries().length > 0;
      if (!needed && this.proximityContextTimer) {
        global.clearInterval?.(this.proximityContextTimer);
        this.proximityContextTimer = null;
        return false;
      }
      if (needed && !this.proximityContextTimer) {
        this.proximityContextTimer = global.setInterval?.(
          () => this.reviewProximityContexts(),
          750
        ) || null;
      }
      return needed;
    }

    narrativeDisplayDuration(text) {
      const length = String(text || "").trim().length;
      return Math.min(12000, Math.max(4500, 3000 + length * 40));
    }

    queueNarrativeLine(payload) {
      this.narrativeQueue = this.narrativeQueue || [];
      this.narrativeQueue.push(payload);
      if (this.narrativeTimer) return;

      const playNext = () => {
        const next = this.narrativeQueue.shift();
        if (!next) {
          this.narrativeTimer = null;
          return;
        }

        const engine = BF.currentEngine;
        const now = performance.now();
        const duration = this.narrativeDisplayDuration(next.text);
        if (engine) {
          engine.speechQuietUntil = Math.max(
            Number(engine.speechQuietUntil) || 0,
            now + duration
          );
          engine.lastSpeechAt = now;
          engine.lastFatigueSpeechAt = now;
          if (engine.speechVisible !== false) {
            engine.callbacks?.onSpeak?.(next.text);
          }
          engine.callbacks?.onAction?.(next.text);
        }

        this.narrativeTimer = global.setTimeout?.(playNext, duration) || null;
      };

      playNext();
    }

    emitNarrative(mission, moment, context = {}) {
      const lines = mission?.narrative?.[moment] || [];
      if (!lines.length) return false;

      lines.forEach((item, index) => {
        const text =
          typeof item === "string"
            ? item
            : item?.text || "";

        if (!text) return;

        const payload = {
          id: `bible:${mission.id}:${moment}:${index}:${Date.now()}`,
          title: mission.title,
          text,
          mapId: context.mapId ?? BF.currentEngine?.currentMapId ?? null,
          zoneId: context.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
          important: moment === "revealed" || moment === "completed"
        };

        if (item?.route === "journal") {
          BF.addJournalEntry?.({
            ...payload,
            type: "bible"
          });
          return;
        }

        this.queueNarrativeLine(payload);
      });

      return true;
    }

    activateMission(mission, event = {}) {
      const manager = this.manager();
      const diagnostic = {
        at: Date.now(),
        missionId: mission?.id || null,
        triggerType: event?.type || null,
        subject: event?.subject || null,
        objectId: event?.objectId || null,
        managerAvailable: Boolean(manager),
        definitionExists: Boolean(
          mission?.id && Missions.getDefinition?.(mission.id)
        ),
        lifecycleBefore: null,
        startResult: false,
        activated: false,
        lifecycleAfter: null,
        error: null
      };

      if (!mission?.id || !manager) {
        diagnostic.error = !manager
          ? "MissionManager indisponible"
          : "Mission invalide";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      let lifecycleState = this.missionLifecycle(mission.id);
      diagnostic.lifecycleBefore = clone(lifecycleState.lifecycle);


      if (lifecycleState.active) {
        diagnostic.error = "Mission déjà active";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (lifecycleState.completed) {
        diagnostic.error = "Mission déjà terminée";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (!Missions.getDefinition?.(mission.id)) {
        const compiled = this.compileMission(mission);
        if (compiled && typeof BF.registerMissionDefinitions === "function") {
          BF.registerMissionDefinitions([compiled]);
        }
      }

      if (!Missions.getDefinition?.(mission.id)) {
        diagnostic.error = "Définition mission absente";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      try {
        diagnostic.startResult =
          manager.startMission(mission.id, {
            primary: mission.primaryOnActivation === true,
            autoPrimaryEligible: mission.autoPrimaryEligible === true,
            prerequisites: asArray(mission.prerequisites),
            source: "bible-runtime-v0.1",
            reason: `Déclencheur Bible V0.1 : ${event.type || "event"}`
          }) === true;

        const after = this.missionLifecycle(mission.id);
        diagnostic.lifecycleAfter = clone(after.lifecycle);
        diagnostic.activated = after.active || Boolean(after.tree);

        if (!diagnostic.startResult || !diagnostic.activated) {
          diagnostic.error =
            "MissionManager n'a pas confirmé l'activation";
          this.lastActivationAttempt = diagnostic;
          return false;
        }

        // triggerOnly signifie : l’événement révèle la mission mais ne lie pas
        // la suite à l’objet qui a servi de déclencheur. Cette règle était
        // auparavant portée par bible-runtime-trigger-fix-v19.js.
        if (mission.bindActivationMap === true && event.mapId) {
          manager.memory?.setFact?.(`bibleActivation:${mission.id}`, {
            mapId: String(event.mapId),
            fromMapId: event.fromMapId || null,
            toMapId: event.toMapId || event.mapId,
            activatedAt: Date.now()
          });
        }
        if (mission.triggerOnly === true) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
        } else if (mission.targetBinding) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, {
            binding: mission.targetBinding,
            instanceId: event.instanceId || null,
            objectId: event.objectId || null,
            cuoType: event.cuoType || null
          });
        }
        manager.memory?.save?.();

        // La rencontre déclenche uniquement la révélation. L'autonomie ne doit
        // pas consommer le premier objectif dans la même séquence d'interaction.
        // Une action manuelle reste immédiatement possible et sera forcée par
        // la directive de mission ; l'autonomie reprendra à la séquence suivante.
        manager.retryAfter = Math.max(
          Number(manager.retryAfter || 0),
          performance.now() + 3500
        );

        this.emitRevealedOnce(mission, event);
        this.initializeRuntimeCounters(mission);
        this.reconcileRuntimeCounters(mission.id);
        this.reconcileHistoricalCollections(mission.id);
        this.refreshProximityContextMonitor();
        this.lastActivationAttempt = diagnostic;

        global.dispatchEvent?.(
          new CustomEvent("bluefox:bible-mission-revealed-v0-1", {
            detail: {
              missionId: mission.id,
              title: mission.title,
              trigger: event.type || null,
              subject: event.subject || null,
              objectId: event.objectId || null
            }
          })
        );

        return true;
      } catch (error) {
        diagnostic.error = error?.message || String(error);
        this.lastActivationAttempt = diagnostic;
        console.error(
          "[BlueFox] Bible Runtime V0.1 : activation impossible.",
          diagnostic,
          error
        );
        return false;
      }
    }

    consumeTriggerEvent(event, options = {}) {
      const candidates = [];

      for (const template of this.localMissionTemplates()) {
        const mapId = String(event?.mapId || BF.currentEngine?.currentMapId || "");
        if (!this.localMissionEligibleOnMap(template, mapId)) continue;
        if (!this.localMissionActivationMatches(template.localMission.activation, event)) continue;
        const instanceId = this.localExplorationInstanceId(template.id, mapId);
        const lifecycleState = this.missionLifecycle(instanceId);
        if (lifecycleState.completed || lifecycleState.active) continue;
        const mission = this.localMissionInstance(instanceId, event);
        if (!mission || !this.prerequisitesSatisfied(mission)) continue;
        candidates.push(mission);
      }

      for (const mission of this.catalog) {
        if (mission?.localMission) continue;
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;

        const lifecycleState = this.missionLifecycle(mission.id);
        if (lifecycleState.completed || lifecycleState.active) continue;
        if (!this.prerequisitesSatisfied(mission)) continue;

        const count = this.incrementTrigger(mission, event);
        const required = Math.max(1, Number(mission.trigger?.count) || 1);
        if (count >= required) candidates.push(mission);
      }

      candidates.sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        this.catalog.indexOf(left) - this.catalog.indexOf(right)
      );

      const selected = options.allowActivation === false
        ? null
        : candidates[0] || null;
      const activatedMissionId = selected && this.activateMission(selected, event)
        ? selected.id
        : null;

      return { matched: candidates.length, activatedMissionId };
    }

    onObjectEvent(rawEvent) {
      const normalized = this.normalizeObjectEvent(rawEvent);
      if (!normalized) return;
      this.recordObservation(rawEvent);
      const activeBefore = new Set(
        this.catalog
          .filter((mission) => this.missionLifecycle(mission.id).active)
          .map((mission) => mission.id)
      );

      // 1) Evénement concret : collect/analyze/observe/etc.
      let result = this.consumeTriggerEvent(normalized);
      let activatedMissionId = result.activatedMissionId || null;
      let allowActivation = !activatedMissionId;

      // 2) Evénement narratif générique : toute interaction réelle avec
      // l'objet. Il est volontairement indépendant de l'état "connu" CUO.
      // Cela permet à une mission ajoutée plus tard de se révéler même si
      // BlueFox a déjà observé/analysé/collecté ce type d'objet auparavant.
      result = this.consumeTriggerEvent({
        ...normalized,
        type: "interaction.any",
        amount: 1
      }, { allowActivation });
      activatedMissionId = activatedMissionId || result.activatedMissionId || null;
      allowActivation = allowActivation && !result.activatedMissionId;

      // 3) Première interaction d'étude : conservée comme vocabulaire
      // distinct pour les missions qui exigent explicitement une découverte.
      if ([
        "interaction.observe",
        "interaction.inspect",
        "interaction.analyze"
      ].includes(normalized.type)) {
        result = this.consumeTriggerEvent({
          ...normalized,
          type: "interaction.discovery",
          amount: 1
        }, { allowActivation });
        activatedMissionId = activatedMissionId || result.activatedMissionId || null;
      }

      const activatedNow = Boolean(activatedMissionId) || this.allMissions().some((mission) =>
        !activeBefore.has(mission.id) && this.missionLifecycle(mission.id).active
      );
      if (activatedNow && rawEvent.id) {
        this.activationEventIds.add(rawEvent.id);
        if (activatedMissionId) {
          this.activationEventMissionIds.set(rawEvent.id, activatedMissionId);
        }
        global.setTimeout?.(() => {
          this.activationEventIds.delete(rawEvent.id);
          this.activationEventMissionIds.delete(rawEvent.id);
        }, 0);
      }

      this.bridgeMissionProgress(rawEvent);
      this.reconcileEnvironmentLocalMap(rawEvent?.mapId || BF.currentEngine?.currentMapId);
      this.reconcileEnvironmentWorld();
    }

    onExplorationChanged(detail) {
      const manager = this.manager();
      const mapId = String(detail.mapId || "");
      if (!mapId) return false;
      let changed = this.reconcileEnvironmentAll(mapId);
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return changed;
      }

      // WorldEngine place BlueFox avant l'événement de transition. Le tracker
      // peut donc émettre une première surface au spawn : elle ne doit jamais
      // révéler une nouvelle LOC-05. La première variation d'exploration
      // post-arrivée, elle, est une preuve de déplacement/exploration réelle.
      if (this.localExplorationSessionMapId &&
          mapId !== this.localExplorationSessionMapId) {
        this.localExplorationAwaitingPostArrival = mapId;
        return false;
      }
      if (this.localExplorationAwaitingPostArrival === mapId) {
        this.localExplorationAwaitingPostArrival = null;
      }
      this.localExplorationSessionMapId = mapId;
      return this.reconcileLocalExplorationMap(mapId, detail.surfacePercent) || changed;
    }

    onMapTransition(detail) {
      // La transition est émise après chargement de la map courante.
      this.captureObservationMap(BF.currentEngine);
      this.reconcileEnvironmentAll(detail.toMapId || detail.mapId || BF.currentEngine?.currentMapId);

      const event = {
        fromMapId: detail.fromMapId || null,
        toMapId: detail.toMapId || detail.mapId || null,
        mapId: detail.toMapId || detail.mapId || null,
        direction: lower(detail.direction) || null,
        biome: lower(detail.biome) || null,
        amount: 1
      };

      const crossing = this.consumeTriggerEvent({
        ...event,
        type: "movement.portal_crossed"
      });

      if (detail.isNew === true) {
        this.consumeTriggerEvent({
          ...event,
          type: "exploration.map_discovered"
        }, { allowActivation: !crossing.activatedMissionId });
      }
      this.reviewConstructionReadiness();
      this.scheduleCurrentSiteRestore(event.mapId);

      if (this.manager()?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        this.pauseOffMapLocalExploration(event.mapId);
        this.resumeCurrentMapLocalMissions(event.mapId);
        const manager = this.manager();
        const hasExistingLocalInstance = this.localExplorationTemplates().some((template) => {
          const instanceId = this.localExplorationInstanceId(template.id, event.mapId);
          return Boolean(manager?.memory?.state?.missionLifecycle?.[instanceId]);
        });
        this.localExplorationSessionMapId = event.mapId;
        if (hasExistingLocalInstance) {
          this.localExplorationAwaitingPostArrival = null;
          const exploration = BF.getMapExplorationState?.(event.mapId);
          this.reconcileLocalExplorationMap(event.mapId, exploration?.surfacePercent);
        } else {
          this.localExplorationAwaitingPostArrival = event.mapId;
        }
      }
    }

    isActivationEvent(eventId) {
      return Boolean(eventId && this.activationEventIds.has(eventId));
    }

    activationMissionForEvent(eventId) {
      return eventId ? this.activationEventMissionIds.get(eventId) || null : null;
    }

    bridgeMissionProgress(event) {
      const manager = this.manager();
      if (!manager?.consumeObjectEvent) return false;

      // Object-M0 possède déjà le fan-out standard. On ne le double pas.
      return false;
    }

    findMissionEntry(state, missionId) {
      return (state?.missions || []).find((entry) =>
        (entry.missionId || entry.id) === missionId
      ) || null;
    }

    walkTree(node, callback) {
      if (!node) return;
      callback(node);
      (node.children || []).forEach((child) =>
        this.walkTree(child, callback)
      );
    }

    nodeForSlot(entry, missionId, slot) {
      let found = null;
      const separator = String(missionId || "").indexOf("@");
      const scopedNodeId = separator > 0
        ? `${missionId.slice(0, separator)}:${slot}@${missionId.slice(separator + 1)}`
        : null;
      this.walkTree(entry?.tree?.root, (node) => {
        if (
          node.id === `${missionId}:${slot}` ||
          (scopedNodeId && node.id === scopedNodeId)
        ) found = node;
      });
      return found;
    }

    emitRevealedOnce(mission, context = {}) {
      const key = `${mission.id}:revealed`;
      if (this.state.progressNarrative[key]) return false;

      this.state.progressNarrative[key] = Date.now();
      this.saveState();
      return this.emitNarrative(mission, "revealed", context);
    }

    emitProgressNarrative(mission, entry) {
      for (const [index, milestone] of
        (mission.narrative?.progress || []).entries()) {
        const key = `${mission.id}:progress:${index}`;
        if (this.state.progressNarrative[key]) continue;

        let reached = false;

        if (milestone.slot) {
          const node = this.nodeForSlot(entry, mission.id, milestone.slot);
          if (!node) continue;

          if (milestone.atCount != null) {
            reached =
              Number(node.progress) >= Number(milestone.atCount);
          } else if (milestone.at != null) {
            reached =
              Number(node.progress) /
                Math.max(1, Number(node.target) || 1) >=
              Number(milestone.at);
          }
        } else if (milestone.at != null) {
          reached = Number(entry.progress) >= Number(milestone.at);
        }

        if (!reached) continue;

        this.state.progressNarrative[key] = Date.now();
        this.saveState();

        if (milestone.route === "journal") {
          BF.addJournalEntry?.({
            id: `bible:${key}`,
            type: "bible",
            title: mission.title,
            text: milestone.text,
            mapId: BF.currentEngine?.currentMapId || null,
            zoneId: BF.currentEngine?.currentZoneIndex ?? null,
            important: false
          });
          continue;
        }

        this.queueNarrativeLine({
          id: `bible:${key}`,
          title: mission.title,
          text: milestone.text,
          mapId: BF.currentEngine?.currentMapId || null,
          zoneId: BF.currentEngine?.currentZoneIndex ?? null,
          important: false
        });
      }
    }

    shelterObjects() {
      const engine = BF.currentEngine;
      if (!engine?.scene) return [];

      const result = [];
      engine.scene.traverse?.((object) => {
        const id = lower(
          object?.userData?.catalogId ||
          object?.userData?.libraryType ||
          object?.userData?.functional?.id ||
          object?.name
        );
        if (!id) return;
        let kind = null;
        if (id.includes("refuge")) kind = "refuge";
        else if (id.includes("base")) kind = "base";
        else if (id === "camp" || id.includes("camp_") || id.includes("_camp")) kind = "camp";
        if (kind) result.push({ kind, object });
      });

      const sites = this.siteBucket(engine.currentMapId);
      Object.values(sites).filter(Boolean).forEach((site) => {
        if (!Number.isFinite(Number(site?.anchor?.x)) || !Number.isFinite(Number(site?.anchor?.z))) return;
        result.push({ kind: site.kind, site: true, id: site.id, position: site.anchor });
      });
      return result;
    }

    missionTargetMapId(mission) {
      const direct = mission?.targetMapId || mission?.completionGate?.mapId;
      if (direct) return String(direct);
      const factKey = String(mission?.targetMapFact || "").trim();
      if (!factKey) return "";
      const fact = this.manager()?.memory?.getFact?.(factKey, null);
      const field = String(mission?.targetMapField || "mapId").trim();
      return String(fact?.[field] || fact?.mapId || "");
    }

    shelterProximitySatisfied(gate, mapOverride = null) {
      const engine = BF.currentEngine;
      const requiredMapId = mapOverride || (gate?.mapId != null ? String(gate.mapId) : null);
      const p = engine?.character?.root?.position;
      if (!p) return false;
      const allowed = new Set(gate?.shelterKinds || ["camp", "refuge", "base"]);
      const radius = Math.max(0.5, Number(gate?.radius) || 8);
      const requiredSiteId = gate?.siteId != null ? String(gate.siteId) : null;
      if (requiredMapId && String(engine.currentMapId || "") !== requiredMapId) return false;
      return this.shelterObjects().some((record) => {
        if (!allowed.has(record.kind)) return false;
        const recordSiteId = String(
          record.object?.userData?.establishedSite ||
          record.object?.userData?.siteId ||
          record.id || ""
        );
        if (requiredSiteId != null && recordSiteId !== requiredSiteId) return false;
        const q = record.object?.getWorldPosition
          ? record.object.getWorldPosition(new engine.THREE.Vector3())
          : record.position;
        return q && Math.hypot(p.x - q.x, p.z - q.z) <= radius;
      });
    }

    gateSatisfied(mission) {
      const gate = mission?.completionGate;
      if (!gate) return true;
      if (this.state.gatesSatisfied[mission.id]) return true;
      if (gate.type !== "proximity.shelter") return false;

      const requiredMapId = this.missionTargetMapId(mission) || null;
      const satisfied = this.shelterProximitySatisfied(gate, requiredMapId);
      if (!satisfied || gate.requireDeposit === true) return false;
      if (!this.bagCounterSatisfied(gate)) return false;
      if (!this.inventoryEffectsReady(mission)) return false;
      this.state.gatesSatisfied[mission.id] = Date.now();
      this.saveState();
      return true;
    }

    markDepositCompletionGates() {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      this.allMissions().forEach((mission) => {
        const gate = mission?.completionGate;
        if (gate?.type !== "proximity.shelter" || gate.requireDeposit !== true) return;
        if (this.state.gatesSatisfied[mission.id]) return;
        const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
        const tree = manager.trees?.get?.(mission.id);
        if (lifecycle?.status !== "active" || !tree?.root?.isComplete) return;
        const targetMapId = this.missionTargetMapId(mission) || null;
        if (!this.shelterProximitySatisfied(gate, targetMapId)) return;
        if (!this.bagCounterSatisfied(gate)) return;
        if (!this.inventoryEffectsReady(mission)) return;
        this.state.gatesSatisfied[mission.id] = Date.now();
        changed = true;
      });
      if (changed) {
        this.saveState();
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    canFinalizeMission(missionId) {
      const mission = this.byId.get(missionId);
      if (!mission) return true;
      const standaloneConsumes = this.standaloneInventoryConsumeMission(mission);
      if (!mission.completionGate && !standaloneConsumes) return true;

      const establish = this.constructionPlacementEffect(mission);
      if (establish) {
        const kind = lower(establish.kind);
        const mapId = this.missionTargetMapId(mission);
        const site = mapId ? this.siteBucket(mapId)?.[kind] : null;
        const established =
          Boolean(site) &&
          String(site.mapId || "") === mapId &&
          String(site.missionId || "") === String(mission.id || "");

        // Pour une construction répétable, un ancien gate/receipt ne constitue
        // jamais une preuve de fin : le site réel de CETTE mission doit exister.
        if (!established) {
          delete this.state.gatesSatisfied[mission.id];
          return false;
        }

        if (!this.state.gatesSatisfied[mission.id]) {
          this.state.gatesSatisfied[mission.id] = Date.now();
          this.saveState();
        }
        return true;
      }

      if (mission.completionGate && !this.gateSatisfied(mission)) return false;
      if (standaloneConsumes) {
        const receiptId = `${mission.id}:completion:v${mission.version || 1}`;
        const memory = this.manager()?.memory;
        if (memory?.hasEffectReceipt?.(receiptId)) {
          this.pendingConstructionResourceMissions.delete(mission.id);
          return true;
        }
        if (!this.inventoryEffectsReady(mission)) {
          const resourceStatus = this.constructionResourceStatus(mission);
          this.pendingConstructionResourceMissions.add(mission.id);
          this.publishConstructionResourceStatus(mission, resourceStatus);
          return false;
        }
        this.pendingConstructionResourceMissions.delete(mission.id);
        return this.applyEffects(mission, { source: "mission-completion" });
      }
      return true;
    }

    updateCompletionGates(now = performance.now()) {
      if (now - this.lastGateReviewAt < 500) return false;
      this.lastGateReviewAt = now;
      const manager = this.manager();
      if (!manager) return false;
      const waiting = this.allMissions().some((mission) => {
        if (!mission.completionGate && !this.standaloneInventoryConsumeMission(mission)) {
          return false;
        }
        const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
        const tree = manager.trees?.get?.(mission.id);
        return lifecycle?.status === "active" && tree?.root?.isComplete;
      });
      if (!waiting) return false;
      const before = JSON.stringify(manager.memory.state.missionLifecycle);
      manager.syncLifecycleFromTrees?.();
      const changed = before !== JSON.stringify(manager.memory.state.missionLifecycle);
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    completionGateState(missionId) {
      const mission = this.byId.get(missionId);
      const standaloneConsumes = this.standaloneInventoryConsumeMission(mission);
      if (!mission?.completionGate && !standaloneConsumes) {
        return { managed: false, canFinalize: true, message: "" };
      }
      const canFinalize = this.canFinalizeMission(missionId);
      const kind = this.constructionPlacementEffect(mission)?.kind;
      const targetMapId = this.missionTargetMapId(mission);
      const message = kind === "refuge"
        ? `Rendez-vous sur ${targetMapId} pour installer le refuge.`
        : kind === "camp"
          ? `Rendez-vous sur ${targetMapId} pour établir le camp.`
          : standaloneConsumes && !this.inventoryEffectsReady(mission)
            ? "Les ressources missionnelles requises doivent encore être réunies."
            : "Une validation dans le monde est encore requise.";
      return { managed: true, canFinalize, message };
    }

    resolveSpawnOrigin(effect) {
      const engine = BF.currentEngine;
      const capsule = engine?.currentMap?.crashCapsule;
      const player = engine?.character?.root?.position;
      const anchor = effect?.placement?.anchor === "crash-capsule" && capsule
        ? capsule.position : player;
      if (!anchor) return null;
      const distance = Math.max(4, Number(effect?.placement?.distance) || 7);
      let dx = Number(anchor.x) || 0;
      let dz = Number(anchor.z) || 0;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) { dx = 1; dz = 0; }
      else { dx /= length; dz /= length; }
      return {
        x: (Number(anchor.x) || 0) + dx * distance,
        y: 0,
        z: (Number(anchor.z) || 0) + dz * distance
      };
    }

    sitePlacementPreset(microSceneId, engine = BF.currentEngine) {
      return engine?.currentMap?.definition?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || BF.maps?.[engine?.currentMapId]?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || null;
    }

    resolveSitePlacement(effect) {
      const preset = this.sitePlacementPreset(effect?.microSceneId);
      if (preset?.position) {
        return {
          anchor: clone(preset.position),
          rotation: Array.isArray(preset.rotation)
            ? preset.rotation.map((value) => Number(value) || 0)
            : [0, Number(preset.rotation) || 0, 0]
        };
      }
      const anchor = this.resolveSpawnOrigin(effect);
      if (!anchor) return null;
      const requestedRotation = effect?.placement?.rotation;
      return {
        anchor,
        rotation: Array.isArray(requestedRotation)
          ? requestedRotation.map((value) => Number(value) || 0)
          : [0, Number(requestedRotation) || 0, 0]
      };
    }

    applyCanonicalSitePlacement(site, engine = BF.currentEngine) {
      if (site?.placementSource === "player") return site;
      const preset = this.sitePlacementPreset(site?.microSceneId, engine);
      if (!preset?.position) return site;
      site.anchor = clone(preset.position);
      site.rotation = Array.isArray(preset.rotation)
        ? preset.rotation.map((value) => Number(value) || 0)
        : [0, Number(preset.rotation) || 0, 0];
      return site;
    }

    attachSiteRecords(records, site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!map || !records?.length) return false;
      const structuralSite = [
        "MSC-CUSTOM-CAMP",
        "MSC-CUSTOM-CAMP-BASE",
        "MSC-CUSTOM-CAMP-BASE-REINFORCED"
      ].includes(site?.microSceneId);
      if (structuralSite && Array.isArray(map.interactables)) {
        map.interactables = map.interactables.filter((object) =>
          String(object?.userData?.microSceneId || "") !== String(site.microSceneId)
        );
      }
      records.forEach((record, index) => {
        const root = record.root;
        if (!root) return;
        root.userData.bibleMissionId = site.missionId;
        root.userData.establishedSite = site.id;
        if (index === 0) {
          root.name = `BlueFoxSite:${site.id}`;
          root.userData.catalogId = site.kind;
          root.userData.libraryType = site.kind;
          root.userData.shelterKind = site.kind;
        }
        if (!structuralSite && record.instance?.hitbox) {
          map.interactables.push(record.instance.hitbox);
        }
        (record.instance?.colliders || []).forEach((collider) => {
          const transformRoot = record.objectRoot || root;
          transformRoot.updateWorldMatrix(true, false);
          const position = transformRoot.localToWorld(collider.offset.clone());
          map.colliders.push({ position, radius: collider.radius, owner: root });
        });
      });
      engine.character?.setColliders?.(map.colliders);
      return true;
    }

    renderSite(site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!site?.id || !site?.microSceneId || !site?.anchor) return false;
      if (!engine?.THREE || !map?.group || !BF.ObjectSpawner) return false;
      if (site.mapId !== engine.currentMapId) return false;
      if (map.group.getObjectByProperty?.("name", `BlueFoxSite:${site.id}`)) return true;
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: map.group,
        palette: BF.maps?.[engine.currentMapId]?.palette
      });
      const records = spawner.spawnMicroScene(
        site.microSceneId,
        {
          origin: site.anchor,
          rotation: site.rotation || [0, 0, 0],
          scene: map.group,
          force: true,
          source: `site:${site.id}`
        }
      );
      return this.attachSiteRecords(records, site, engine);
    }

    removeEstablishedSite(site, memory = this.manager()?.memory, engine = BF.currentEngine) {
      if (!site?.id || !site?.mapId || !site?.kind || !memory) return false;

      const map = engine?.currentMap;
      if (map && String(engine?.currentMapId || "") === String(site.mapId)) {
        const roots = [];
        map.group?.traverse?.((object) => {
          if (String(object?.userData?.establishedSite || "") === String(site.id)) {
            roots.push(object);
          }
        });
        roots.forEach((root) => {
          if (typeof BF.disposeObject === "function") BF.disposeObject(root);
          else root?.parent?.remove?.(root);
        });

        if (Array.isArray(map.interactables)) {
          map.interactables = map.interactables.filter((object) =>
            String(object?.userData?.establishedSite || object?.parent?.userData?.establishedSite || "") !== String(site.id)
          );
        }
        if (Array.isArray(map.colliders)) {
          map.colliders = map.colliders.filter((collider) =>
            String(collider?.owner?.userData?.establishedSite || "") !== String(site.id)
          );
          engine.character?.setColliders?.(map.colliders);
        }
      }

      const progression = memory.state?.siteProgression?.[site.mapId];
      const sites = progression?.sites;
      if (sites && typeof sites === "object") {
        const persisted = sites[site.kind];
        if (String(persisted?.id || "") === String(site.id)) {
          delete sites[site.kind];
        }
      } else if (String(progression?.id || "") === String(site.id)) {
        delete memory.state.siteProgression[site.mapId];
      }
      memory.save?.();
      return true;
    }

    storeSite(site, memory = this.manager()?.memory) {
      if (!memory || !site?.mapId || !site?.kind) return false;
      memory.state.siteProgression = memory.state.siteProgression || {};
      const previous = memory.state.siteProgression[site.mapId] || null;
      const previousSites = previous?.sites && typeof previous.sites === "object"
        ? { ...previous.sites }
        : previous?.kind
          ? { [previous.kind]: previous }
          : {};
      previousSites[site.kind] = site;
      memory.state.siteProgression[site.mapId] = {
        ...site,
        sites: previousSites
      };
      return true;
    }

    inventoryKeysForRequirement(requirement = {}) {
      const explicitKeys = asArray(requirement.inventoryKeys)
        .map((key) => String(key || "").trim())
        .filter(Boolean);
      if (explicitKeys.length) return [...new Set(explicitKeys)];
      if (requirement.inventoryKey) return [String(requirement.inventoryKey)];
      const subject = lower(requirement.subject);
      if (!subject) return [];

      const keys = new Set();
      BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
        const inventoryKey = definition?.resource?.inventoryKey;
        if (!inventoryKey) return;
        const descriptors = new Set([
          definition?.semantic?.subject,
          definition?.knowledge?.family,
          definition?.resource?.family,
          definition?.category,
          definition?.type,
          ...(definition?.spawn?.tags || []),
          ...(definition?.situation?.tags || [])
        ].map(lower).filter(Boolean));
        if (descriptors.has(subject)) keys.add(String(inventoryKey));
      });
      return [...keys];
    }

    inventoryConsumptionPlan(consumes = []) {
      const requirements = asArray(consumes)
        .filter((effect) => effect?.type === "inventory.consume")
        .map((effect) => ({
          quantity: Math.max(0, Number(effect.quantity) || 0),
          inventoryKeys: this.inventoryKeysForRequirement(effect)
        }));
      const keySet = new Set(requirements.flatMap((entry) => entry.inventoryKeys));
      const balances = Object.fromEntries([...keySet].map((key) => [
        key,
        Math.max(0, Number(BF.progression?.availableInventory?.([key])) || 0)
      ]));

      for (const requirement of requirements) {
        if (!requirement.quantity || !requirement.inventoryKeys.length) {
          return { ready: false, balances };
        }
        let remaining = requirement.quantity;
        for (const key of requirement.inventoryKeys) {
          if (remaining <= 0) break;
          const available = Math.max(0, Number(balances[key]) || 0);
          const removed = Math.min(available, remaining);
          balances[key] = available - removed;
          remaining -= removed;
        }
        if (remaining > 0) return { ready: false, balances };
      }
      return { ready: true, balances };
    }

    inventoryEffectsReady(mission) {
      const consumes = asArray(mission?.effects)
        .filter((effect) => effect?.type === "inventory.consume");
      return !consumes.length || this.inventoryConsumptionPlan(consumes).ready;
    }

    standaloneInventoryConsumeMission(mission) {
      const effects = asArray(mission?.effects);
      return (
        effects.some((effect) => effect?.type === "inventory.consume") &&
        !effects.some((effect) => effect?.type === "site.establish")
      );
    }

    bagCounterValue(counter = {}) {
      if (counter.inventoryKey) {
        const state = BF.getProgressionState?.() || BF.progression?.snapshot?.() || {};
        return Math.max(
          0,
          Number(state?.inventory?.[String(counter.inventoryKey)]) || 0
        );
      }
      if (counter.source === "rations") {
        return Math.max(0, Number(BF.getRationState?.().rations) || 0);
      }
      return null;
    }

    bagCounterSatisfied(gate = {}) {
      if (!gate.bagCounter) return true;
      const value = this.bagCounterValue(gate.bagCounter);
      if (value == null) return false;
      return value >= Math.max(1, Number(gate.bagCounter.minimum) || 1);
    }

    constructionResourceStatus(missionOrId) {
      const mission = typeof missionOrId === "string"
        ? this.byId.get(String(missionOrId))
        : missionOrId;
      if (!mission) return null;
      const consumes = asArray(mission.effects)
        .filter((effect) => effect?.type === "inventory.consume");
      if (!consumes.length) {
        return {
          missionId: mission.id,
          ready: true,
          missingTotal: 0,
          requirements: []
        };
      }
      const requirements = consumes.map((consume, index) => {
        const inventoryKeys = this.inventoryKeysForRequirement(consume);
        const required = Math.max(0, Number(consume.quantity) || 0);
        const available = inventoryKeys.length
          ? Math.max(0, Number(BF.progression?.availableInventory?.(inventoryKeys)) || 0)
          : 0;
        const missing = Math.max(0, required - available);
        return {
          index,
          inventoryKey: consume.inventoryKey || null,
          subject: consume.subject || null,
          inventoryKeys,
          required,
          available,
          missing,
          deficitRatio: required > 0 ? missing / required : 0
        };
      });
      return {
        missionId: mission.id,
        ready: requirements.every((entry) => entry.missing <= 0),
        missingTotal: requirements.reduce((sum, entry) => sum + entry.missing, 0),
        requirements
      };
    }

    constructionResourceSignature(status) {
      if (!status) return "";
      return status.requirements
        .map((entry) => `${entry.index}:${entry.available}/${entry.required}`)
        .join("|");
    }

    publishConstructionResourceStatus(mission, status = this.constructionResourceStatus(mission)) {
      if (!mission?.id || !status) return false;
      const signature = this.constructionResourceSignature(status);
      const previous = this.constructionResourceSignatures.get(mission.id) || "";
      this.constructionResourceSignatures.set(mission.id, signature);
      if (signature === previous) return false;
      global.dispatchEvent?.(new CustomEvent("bluefox:construction-resources-changed", {
        detail: clone(status)
      }));
      return true;
    }

    environmentManagedMission(mission) {
      return Boolean(
        mission?.slots?.study?.params?.envHistoricalFamily ||
        mission?.envLocal ||
        mission?.envWorld
      );
    }

    reconcileEnvironmentHistorical() {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      this.catalog.forEach((mission) => {
        const family = mission?.slots?.study?.params?.envHistoricalFamily;
        if (!family || !this.missionLifecycle(mission.id).active) return;
        const tree = manager.trees?.get?.(mission.id);
        const node = tree?.find?.(`${mission.id}:study`);
        if (!node) return;
        const absolute = Math.min(
          Math.max(0, Number(node.target) || 0),
          this.environmentHistoricalCount(family)
        );
        if (Number(node.progress || 0) === absolute) return;
        node.progress = absolute;
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        changed = true;
      });
      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    activateEnvironmentGlobalFollowers() {
      for (const mission of this.catalog) {
        if (!mission?.slots?.study?.params?.envHistoricalFamily) continue;
        const sourceId = String(mission?.trigger?.missionId || "");
        if (!sourceId || !this.missionLifecycle(sourceId).completed) continue;
        const lifecycle = this.missionLifecycle(mission.id);
        if (lifecycle.active || lifecycle.completed) continue;
        if (!this.prerequisitesSatisfied(mission)) continue;
        if (this.activateMission(mission, {
          type: "progression.mission_completed",
          missionId: sourceId,
          amount: 1
        })) return 1;
      }
      return 0;
    }

    environmentInstanceId(baseId, mapId) {
      return `${String(baseId || "")}@${String(mapId || "")}`;
    }

    setEnvironmentManagedProgress(missionId, slot, value) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(missionId);
      if (!tree) return false;
      const separator = String(missionId || "").indexOf("@");
      const baseId = separator > 0 ? missionId.slice(0, separator) : missionId;
      const scopeId = separator > 0 ? missionId.slice(separator + 1) : null;
      const node = tree.find?.(`${missionId}:${slot}`) ||
        (scopeId ? tree.find?.(`${baseId}:${slot}@${scopeId}`) : null);
      if (!node) return false;
      const absolute = Math.min(
        Math.max(0, Number(node.target) || 0),
        Math.max(0, Number(value) || 0)
      );
      if (Number(node.progress || 0) === absolute) return false;
      node.progress = absolute;
      tree.refresh?.();
      manager.memory?.saveTree?.(tree);
      return true;
    }

    reconcileEnvironmentLocalMap(mapId) {
      const manager = this.manager();
      const targetMapId = String(mapId || "");
      if (!manager || !targetMapId || !this.missionLifecycle("T13").completed) return false;
      if (String(BF.currentEngine?.currentMapId || "") === targetMapId) {
        this.captureObservationMap(BF.currentEngine);
      }
      let changed = false;
      let activationUsed = false;
      for (const family of ["RELIC", "ROCK", "PLANT"]) {
        const coverage = this.environmentMapCoverage(targetMapId, family);
        if (!coverage.known || coverage.total === 0) continue;
        const id50 = this.environmentInstanceId(`ENV-MAP-${family}-50`, targetMapId);
        const mission50 = this.environmentLocalMission(id50);
        let lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        if (!lifecycle50 && !activationUsed && mission50) {
          if (this.activateMission(mission50, { type: "environment.map", mapId: targetMapId, amount: 1 })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        } else if (lifecycle50?.status === "paused" && String(BF.currentEngine?.currentMapId || "") === targetMapId) {
          changed = manager.resumeMission(id50, { primary: false, autoPrimaryEligible: false, source: "env-local" }) === true || changed;
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        }
        if (lifecycle50?.status === "active") {
          changed = this.setEnvironmentManagedProgress(id50, "study", coverage.percent) || changed;
          manager.syncLifecycleFromTrees?.();
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        }
        if (lifecycle50?.status !== "completed") continue;

        const id100 = this.environmentInstanceId(`ENV-MAP-${family}-100`, targetMapId);
        const mission100 = this.environmentLocalMission(id100);
        let lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        if (!lifecycle100 && !activationUsed && mission100) {
          if (this.activateMission(mission100, {
            type: "progression.mission_completed", missionId: id50, mapId: targetMapId, amount: 1
          })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        } else if (lifecycle100?.status === "paused" && String(BF.currentEngine?.currentMapId || "") === targetMapId) {
          changed = manager.resumeMission(id100, { primary: false, autoPrimaryEligible: false, source: "env-local" }) === true || changed;
          lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        }
        if (lifecycle100?.status === "active") {
          changed = this.setEnvironmentManagedProgress(id100, "study", coverage.percent) || changed;
          manager.syncLifecycleFromTrees?.();
        }
      }
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    environmentMapBiome(mapId, mapState = null) {
      return lower(
        mapState?.biomeId || mapState?.biome ||
        BF.maps?.[mapId]?.biomeId || BF.maps?.[mapId]?.biome ||
        (String(BF.currentEngine?.currentMapId || "") === String(mapId || "")
          ? BF.currentEngine?.currentMap?.definition?.biomeId || BF.currentEngine?.currentMap?.definition?.biome
          : null)
      );
    }

    environmentQualifiedBiomeTypes() {
      const rawMaps = BF.getExplorationSummary?.()?.maps || {};
      const maps = Array.isArray(rawMaps)
        ? rawMaps
        : Object.entries(rawMaps).map(([mapId, mapState]) => ({
            ...(mapState || {}),
            mapId: mapState?.mapId || mapState?.id || mapId
          }));
      const qualified = new Set();
      maps.forEach((mapState) => {
        const mapId = String(mapState?.mapId || mapState?.id || "");
        if (!mapId || Number(mapState?.surfacePercent) < 100) return;
        const biome = this.environmentMapBiome(mapId, mapState);
        if (!biome) return;
        const complete = ["RELIC", "ROCK", "PLANT"].every((family) => {
          const coverage = this.environmentMapCoverage(mapId, family);
          return coverage.known && coverage.percent >= 100;
        });
        if (complete) qualified.add(biome);
      });
      return qualified;
    }

    reconcileEnvironmentWorld(options = {}) {
      const manager = this.manager();
      if (!manager || !this.missionLifecycle("T13").completed) return false;
      let changed = false;
      let activationUsed = options.allowActivation === false;
      const count = this.environmentQualifiedBiomeTypes().size;
      for (const threshold of [10, 20]) {
        const missionId = `ENV-WORLD-${threshold}`;
        const sourceId = threshold === 10 ? "T13" : "ENV-WORLD-10";
        if (!this.missionLifecycle(sourceId).completed) continue;
        let lifecycle = manager.memory?.state?.missionLifecycle?.[missionId];
        if (!lifecycle && !activationUsed) {
          const mission = this.byId.get(missionId);
          if (mission && this.activateMission(mission, {
            type: "progression.mission_completed", missionId: sourceId, amount: 1
          })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle = manager.memory?.state?.missionLifecycle?.[missionId];
        }
        if (lifecycle?.status === "active") {
          changed = this.setEnvironmentManagedProgress(missionId, "explore", count) || changed;
          manager.syncLifecycleFromTrees?.();
        }
      }
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    reconcileEnvironmentAll(mapId = BF.currentEngine?.currentMapId) {
      if (this.environmentReconciling) return false;
      this.environmentReconciling = true;
      try {
        let changed = false;
        const activated = this.activateEnvironmentGlobalFollowers();
        changed = this.reconcileEnvironmentHistorical() || Boolean(activated) || changed;
        const localChanged = mapId ? this.reconcileEnvironmentLocalMap(mapId) : false;
        changed = localChanged || changed;
        changed = this.reconcileEnvironmentWorld({
          allowActivation: !activated && !localChanged
        }) || changed;
        if (changed) this.manager()?.publish?.();
        return changed;
      } finally {
        this.environmentReconciling = false;
      }
    }

    progressionChangeAffectsEnvironmentObservations(detail = {}) {
      if (String(detail.reason || "") !== "event-consumed") return false;
      return [
        "OBJECT_SEEN",
        "OBJECT_INSPECTED",
        "OBJECT_ANALYZED",
        "PHENOMENON_OBSERVED",
        "KNOWLEDGE_ACQUIRED"
      ].includes(String(detail.event?.type || ""));
    }

    progressionChangeAffectsHistoricalCollections(detail = {}) {
      return (
        String(detail.reason || "") === "event-consumed" &&
        String(detail.event?.type || "") === String(
          BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED"
        )
      );
    }

    progressionChangeAffectsObservationRuntimeCounters(detail = {}) {
      return (
        String(detail.reason || "") === "event-consumed" &&
        String(detail.event?.type || "") === String(
          BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED"
        )
      );
    }

    reconcileHistoricalCollections(missionFilter = null) {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;

      this.catalog.forEach((mission) => {
        if (missionFilter && mission.id !== missionFilter) return;
        if (!this.missionLifecycle(mission.id).active) return;
        const tree = manager.trees?.get?.(mission.id);
        if (!tree?.root) return;

        let treeChanged = false;
        tree.root.walk?.((node) => {
          if (node?.params?.historicalCollection !== true) return;
          const total = Math.max(
            0,
            Number(
              BF.progression?.historicalCollectionTotal?.(node.params) ??
              BF.getHistoricalCollectionTotal?.(node.params)
            ) || 0
          );
          const absolute = Math.min(
            Math.max(0, Number(node.target) || 0),
            total
          );
          if (Number(node.progress || 0) === absolute) return;
          node.progress = absolute;
          treeChanged = true;
        });

        if (!treeChanged) return;
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        changed = true;
      });

      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    isHistoricalCollectionMission(mission) {
      const requirements = asArray(mission?.slots?.collect?.requirements);
      return requirements.some((requirement) =>
        requirement?.params?.historicalCollection === true
      );
    }

    activateHistoricalCollectionFollowers() {
      let activated = 0;
      this.catalog.forEach((mission) => {
        if (!this.isHistoricalCollectionMission(mission)) return;
        if (mission?.trigger?.type !== "progression.mission_completed") return;
        const sourceId = String(mission.trigger?.missionId || "");
        if (!sourceId || !this.missionLifecycle(sourceId).completed) return;
        const lifecycle = this.missionLifecycle(mission.id);
        if (lifecycle.active || lifecycle.completed) return;
        if (!this.prerequisitesSatisfied(mission)) return;
        if (this.activateMission(mission, {
          type: "progression.mission_completed",
          missionId: sourceId,
          amount: 1
        })) activated += 1;
      });
      return activated;
    }

    reconcileHistoricalCollectionChains() {
      let changed = false;
      const limit = Math.max(1, this.catalog.length + 1);
      for (let guard = 0; guard < limit; guard += 1) {
        const progressed = this.reconcileHistoricalCollections();
        const activated = this.activateHistoricalCollectionFollowers();
        if (!progressed && !activated) break;
        changed = true;
      }
      return changed;
    }

    progressionChangeAffectsInventory(detail = {}) {
      const reason = String(detail.reason || "");
      if (["inventory-consumed", "inventory-pool-consumed", "inventory-reset"].includes(reason)) {
        return true;
      }
      if (reason !== "event-consumed") return false;
      const type = String(detail.event?.type || "");
      return [
        String(BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED"),
        String(BF.ObjectEvents?.types?.RESOURCE_EXTRACTED || "RESOURCE_EXTRACTED")
      ].includes(type);
    }

    onProgressionChanged(detail = {}) {
      let changed = false;
      if (this.progressionChangeAffectsEnvironmentObservations(detail)) {
        changed = this.reconcileEnvironmentAll(detail.event?.mapId || BF.currentEngine?.currentMapId) || changed;
      }
      if (this.progressionChangeAffectsHistoricalCollections(detail)) {
        changed = this.reconcileHistoricalCollectionChains() || changed;
      }
      if (this.progressionChangeAffectsObservationRuntimeCounters(detail)) {
        changed = Boolean(this.reconcileRuntimeCounters()) || changed;
      }
      if (String(detail.reason || "") === "inventory-deposited") {
        changed = this.markDepositCompletionGates() || changed;
      }
      if (!this.progressionChangeAffectsInventory(detail)) return changed;
      if (!this.pendingConstructionResourceMissions.size) return changed;
      for (const missionId of [...this.pendingConstructionResourceMissions]) {
        const mission = this.byId.get(missionId);
        const manager = this.manager();
        const tree = manager?.trees?.get?.(missionId);
        const lifecycle = manager?.memory?.state?.missionLifecycle?.[missionId];
        if (!mission || lifecycle?.status !== "active" || !tree?.root?.isComplete) {
          this.pendingConstructionResourceMissions.delete(missionId);
          this.constructionResourceSignatures.delete(missionId);
          continue;
        }
        const status = this.constructionResourceStatus(mission);
        changed = this.publishConstructionResourceStatus(mission, status) || changed;
        if (!status?.ready) continue;
        this.pendingConstructionResourceMissions.delete(missionId);
        this.handleConstructionReady(mission);
      }
      return changed;
    }

    constructionCollectionCandidate(engine, now = performance.now()) {
      if (!engine || !this.pendingConstructionResourceMissions.size) return null;
      const manager = engine.missionManager;
      const missions = [...this.pendingConstructionResourceMissions]
        .map((missionId) => this.byId.get(missionId))
        .filter(Boolean)
        .map((mission) => ({ mission, status: this.constructionResourceStatus(mission) }))
        .filter(({ mission, status }) => {
          const tree = manager?.trees?.get?.(mission.id);
          const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission.id];
          return lifecycle?.status === "active" && tree?.root?.isComplete && status && !status.ready;
        })
        .sort((left, right) =>
          Math.max(...right.status.requirements.map((entry) => entry.deficitRatio), 0) -
          Math.max(...left.status.requirements.map((entry) => entry.deficitRatio), 0) ||
          Number(right.mission.priority || 0) - Number(left.mission.priority || 0)
        );
      const selected = missions[0];
      if (!selected) return null;
      const deficits = selected.status.requirements
        .filter((entry) => entry.missing > 0)
        .sort((left, right) =>
          right.deficitRatio - left.deficitRatio ||
          right.missing - left.missing
        );
      if (!deficits.length) return null;
      const deficit = deficits[0];
      const keySet = new Set(deficit.inventoryKeys);
      const interactables = (engine.currentMap?.interactables || []).filter((object) => {
        if (!object?.userData?.active || engine.canInteractWith?.(object, now) === false) return false;
        const data = object.userData || {};
        const definition = data.functional || BF.ObjectLibrary?.get?.(data.libraryType) || BF.ObjectLibrary?.get?.(data.kind) || {};
        const key = definition?.resource?.inventoryKey || data.inventoryKey || null;
        if (!key || !keySet.has(String(key))) return false;
        const actions = new Set(definition?.interaction?.actions || []);
        return actions.has("collect") || actions.has("extract") || definition?.gameplay?.collectable === true;
      });
      if (!interactables.length) return null;
      const origin = engine.character?.root?.position;
      const point = (object) => object?.userData?.worldAnchor?.position || object?.position || null;
      const target = [...interactables].sort((left, right) => {
        if (!origin) return 0;
        const lp = point(left); const rp = point(right);
        const ld = lp ? origin.distanceTo(lp) : Infinity;
        const rd = rp ? origin.distanceTo(rp) : Infinity;
        return ld - rd;
      })[0];
      if (!target) return null;
      const definition = target.userData?.functional || BF.ObjectLibrary?.get?.(target.userData?.libraryType) || BF.ObjectLibrary?.get?.(target.userData?.kind) || {};
      const actions = new Set(definition?.interaction?.actions || []);
      const configured = String(definition?.interaction?.acquisitionAction || definition?.interaction?.afterInspectionAction || "").toLowerCase();
      const action = configured === "extract" && actions.has("extract")
        ? "extract"
        : actions.has("collect") || definition?.gameplay?.collectable === true
          ? "collect"
          : actions.has("extract")
            ? "extract"
            : null;
      if (!action) return null;
      const ratio = Math.max(0, Math.min(1, deficit.deficitRatio));
      const absoluteBoost = Math.min(18, Math.log2(1 + deficit.missing) * 2.4);
      const missionPriorityBoost = Math.min(20, Math.max(0, Number(selected.mission.priority) || 0) / 10);
      return {
        id: "bible-construction-resource-deficit",
        axis: "collection",
        baseWeight: Math.round(44 + ratio * 30 + absoluteBoost + missionPriorityBoost),
        available: true,
        allowDuringPrimaryMission: manager?.primaryMissionId === selected.mission.id,
        missionDriven: true,
        missionId: selected.mission.id,
        inventoryKeys: [...deficit.inventoryKeys],
        missing: deficit.missing,
        required: deficit.required,
        availableQuantity: deficit.available,
        execute: () => {
          target.userData.requestedInteraction = action;
          target.userData.requestedInteractionSource = "autonomy";
          const accepted = engine.targetInteraction?.(target);
          if (accepted === false) {
            target.userData.requestedInteraction = null;
            target.userData.requestedInteractionSource = null;
            target.userData.lastInteractionAt = performance.now();
            return false;
          }
          engine.callbacks?.onStatus?.(
            `BlueFox cherche les composants manquants pour ${selected.mission.title}.`
          );
          return true;
        }
      };
    }

    applyEffects(mission, options = {}) {
      const effects = mission.effects || [];
      if (!effects.length) return true;
      const memory = this.manager()?.memory;
      const receiptId = `${mission.id}:completion:v${mission.version || 1}`;
      if (!memory) return false;
      if (memory.hasEffectReceipt?.(receiptId)) {
        this.renderCurrentSite();
        return true;
      }
      const consumes = effects.filter((effect) => effect.type === "inventory.consume");
      const establish = effects.find((effect) => effect.type === "site.establish");
      if (!this.inventoryConsumptionPlan(consumes).ready) return false;

      if (!establish) {
        if (effects.some((effect) => effect.type !== "inventory.consume")) return false;
        for (const [index, consume] of consumes.entries()) {
          const quantity = Math.max(0, Number(consume.quantity) || 0);
          const inventoryKeys = this.inventoryKeysForRequirement(consume);
          const removed = BF.consumeInventoryPoolOnce?.(
            `${receiptId}:consume:${index}`,
            inventoryKeys,
            quantity
          );
          if (removed !== quantity) return false;
        }
        memory.recordEffectReceipt?.(receiptId, { missionId: mission.id });
        memory.save?.();
        return true;
      }

      if (!BF.MicroScenes?.get?.(establish.microSceneId)) return false;
      const targetMapId = this.missionTargetMapId(mission) || String(BF.currentEngine?.currentMapId || "");
      if (!targetMapId || targetMapId !== BF.currentEngine?.currentMapId) return false;

      const activationSource =
        mission.activationSource ||
        this.state.constructionInstances?.[mission.id]?.source ||
        "system";
      const playerConstruction =
        activationSource === "player" &&
        Boolean(this.constructionPlacementEffect(mission));

      // Une construction répétable déclenchée par le joueur ne peut jamais
      // tomber sur resolveSitePlacement()/un preset implicite. Seul le callback
      // Installer de la popup peut fournir le jeton de confirmation courant.
      if (
        playerConstruction &&
        (
          options.source !== "player" ||
          options.confirmationToken !== this.activePlacement?.confirmationToken ||
          this.activePlacement?.missionId !== mission.id ||
          !options.placement?.anchor
        )
      ) {
        return false;
      }

      const placement = options.placement || this.resolveSitePlacement(establish);
      if (!placement?.anchor) return false;

      const replacedRefuge = establish.kind === "base"
        ? this.siteBucket(targetMapId).refuge
        : null;

      const site = {
        id: `${targetMapId}:${establish.kind}:primary`,
        stage: Math.max(1, Number(establish.stage) || 1),
        kind: establish.kind,
        mapId: targetMapId,
        missionId: mission.id,
        microSceneId: establish.microSceneId,
        anchor: clone(placement.anchor),
        rotation: Array.isArray(placement.rotation) ? placement.rotation.slice() : [0, 0, 0],
        placementSource: options.source || mission.activationSource || "system",
        interactionRadius: 8,
        establishedAt: Date.now()
      };

      // Le spawn est tenté avant la consommation : un échec graphique ne doit
      // jamais détruire des ressources ni valider la mission.
      if (!this.renderSite(site)) return false;

      for (const [index, consume] of consumes.entries()) {
        const quantity = Math.max(0, Number(consume.quantity) || 0);
        if (!quantity) continue;
        const inventoryKeys = this.inventoryKeysForRequirement(consume);
        const removed = BF.consumeInventoryPoolOnce?.(
          `${receiptId}:consume:${index}`,
          inventoryKeys,
          quantity
        );
        if (removed !== quantity) return false;
      }

      if (!this.storeSite(site, memory)) return false;
      if (replacedRefuge) {
        this.removeEstablishedSite(replacedRefuge, memory, BF.currentEngine);
      }
      memory.recordEffectReceipt?.(receiptId, { missionId: mission.id, siteId: site.id });
      memory.save?.();
      this.state.gatesSatisfied[mission.id] = Date.now();
      this.state.effectsApplied[mission.id] = Date.now();
      this.saveState();
      return true;
    }

    renderCurrentSite(engine = BF.currentEngine) {
      const mapId = engine?.currentMapId;
      if (!mapId) return false;
      const sites = this.siteBucket(mapId);
      let rendered = false;
      Object.values(sites).filter(Boolean).forEach((site) => {
        this.applyCanonicalSitePlacement(site, engine);
        rendered = this.renderSite(site, engine) || rendered;
      });
      return rendered;
    }

    scheduleCurrentSiteRestore(mapId = BF.currentEngine?.currentMapId) {
      const expectedMapId = mapId != null ? String(mapId) : "";
      const delays = [0, 80, 220, 500, 900, 1600, 2800];
      delays.forEach((delay) => {
        global.setTimeout?.(() => {
          const engine = BF.currentEngine;
          const currentMapId = String(engine?.currentMapId || "");
          if (!currentMapId) return;
          if (expectedMapId && currentMapId !== expectedMapId) return;
          if (!engine?.currentMap?.group || !BF.ObjectSpawner) return;
          if (!this.siteBucket(currentMapId).camp &&
              !this.siteBucket(currentMapId).refuge &&
              !this.siteBucket(currentMapId).base) return;
          this.renderCurrentSite(engine);
        }, delay);
      });
      return true;
    }

    constructionPlacementEffect(mission) {
      return asArray(mission?.effects).find((effect) => effect?.type === "site.establish") || null;
    }

    autonomousPlacement(mission) {
      const engine = BF.currentEngine;
      const effect = this.constructionPlacementEffect(mission);
      if (!engine?.character?.root || !effect) return null;
      const kind = lower(effect.kind);
      const targetMapId = this.missionTargetMapId(mission) || String(engine.currentMapId || "");

      const referenceKind = lower(effect.placement?.referenceKind);
      if (referenceKind) {
        const referenceSite = this.siteBucket(targetMapId)[referenceKind];
        if (!referenceSite?.anchor) return null;

        // Fallback générique uniquement pour une future construction sans
        // preset canonique : progression relative au site de référence.
        const referenceYaw = Number(referenceSite.rotation?.[1]) || 0;
        const dx = 6;
        const dz = 2;
        const baseDistance = Math.max(5, Math.hypot(dx, dz));
        const baseAngle = Math.atan2(dz, dx) + referenceYaw;
        for (const angleOffset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
          const angle = baseAngle + angleOffset;
          const placement = {
            anchor: {
              x: Number(referenceSite.anchor.x) + Math.cos(angle) * baseDistance,
              y: Number(referenceSite.anchor.y) || 0,
              z: Number(referenceSite.anchor.z) + Math.sin(angle) * baseDistance
            },
            rotation: [0, referenceYaw + angleOffset + Math.PI / 6, 0]
          };
          if (this.sitePlacementValid(mission, placement, engine)) return placement;
        }
        return null;
      }

      const p = engine.character.root.position;
      const baseAngle = ((String(mission.id).length * 47) % 360) * Math.PI / 180;
      for (const radius of [7, 10, 13]) {
        for (let index = 0; index < 8; index += 1) {
          const angle = baseAngle + index * Math.PI / 4;
          const placement = {
            anchor: {
              x: p.x + Math.cos(angle) * radius,
              y: 0,
              z: p.z + Math.sin(angle) * radius
            },
            rotation: [0, angle + Math.PI, 0]
          };
          if (this.sitePlacementValid(mission, placement, engine)) return placement;
        }
      }
      return null;
    }


    cleanupPlacement() {
      const placement = this.activePlacement;
      if (!placement) return false;
      const { canvas, previewRoot, handlers, clonedMaterials } = placement;
      Object.entries(handlers || {}).forEach(([type, handler]) => {
        const target = type === "keydown" ? global : canvas;
        target?.removeEventListener?.(type, handler, true);
      });
      previewRoot?.parent?.remove?.(previewRoot);
      (clonedMaterials || []).forEach((material) => material?.dispose?.());
      this.activePlacement = null;
      global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-ended"));
      return true;
    }

    sitePlacementValid(mission, placement, engine = BF.currentEngine) {
      const effect = this.constructionPlacementEffect(mission);
      const anchor = placement?.anchor;
      if (!engine?.currentMap || !effect || !anchor) return false;
      const scene = BF.MicroScenes?.get?.(effect.microSceneId);
      const radius = Math.max(2, Number(scene?.radius) || 4);
      const bounds = Number(engine.currentMap.bounds);
      if (
        Number.isFinite(bounds) &&
        (
          Math.abs(Number(anchor.x) || 0) > bounds - radius ||
          Math.abs(Number(anchor.z) || 0) > bounds - radius
        )
      ) {
        return false;
      }
      return !(engine.currentMap.colliders || []).some((collider) => {
        const q = collider?.position;
        if (!q) return false;
        return Math.hypot(
          (Number(anchor.x) || 0) - Number(q.x || 0),
          (Number(anchor.z) || 0) - Number(q.z || 0)
        ) < radius + Math.max(0, Number(collider.radius) || 0) + 0.6;
      });
    }

    beginSitePlacement(mission) {
      if (this.activePlacement?.missionId === mission?.id) return true;
      if (this.activePlacement) this.cleanupPlacement();
      const engine = BF.currentEngine;
      const effect = this.constructionPlacementEffect(mission);
      const canvas = engine?.renderer?.domElement;
      if (!engine?.THREE || !engine?.raycaster || !engine?.groundPlane || !canvas || !effect) return false;
      if (String(engine.currentMapId) !== String(this.missionTargetMapId(mission) || engine.currentMapId)) return false;

      const previewRoot = new engine.THREE.Group();
      previewRoot.name = `BlueFoxSitePreview:${mission.id}`;
      engine.currentMap?.group?.add(previewRoot);
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: previewRoot,
        palette: BF.maps?.[engine.currentMapId]?.palette
      });
      const records = spawner.spawnMicroScene(effect.microSceneId, {
        origin: { x: 0, y: 0, z: 0 },
        rotation: [0, 0, 0],
        scene: previewRoot,
        force: true,
        source: `preview:${mission.id}`
      });
      if (!records?.length) {
        previewRoot.parent?.remove(previewRoot);
        return false;
      }
      // Le preview conserve les matériaux réels de la MSC afin que le joueur
      // juge précisément son apparence et sa rotation avant installation.
      const clonedMaterials = [];
      const setPreviewOpacity = () => {};

      const confirmationToken = Symbol(`site-placement:${mission.id}`);
      let yaw = 0;
      let candidate = null;
      let finalizing = false;
      const movePreview = (event) => {
        if (finalizing) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        engine.pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        engine.raycaster.setFromCamera(engine.pointer, engine.camera);
        const point = new engine.THREE.Vector3();
        if (!engine.raycaster.ray.intersectPlane(engine.groundPlane, point)) return;
        candidate = { x: point.x, y: 0, z: point.z };
        previewRoot.position.set(candidate.x, 0, candidate.z);
        previewRoot.rotation.set(0, yaw, 0);
        previewRoot.userData.validPlacement = this.sitePlacementValid(
          mission,
          { anchor: candidate, rotation: [0, yaw, 0] },
          engine
        );
      };
      const pointerup = (event) => {
        // Le clic gauche reste intégralement au déplacement de BlueFox.
        // Le clic droit confirme uniquement la position de la MSC.
        if (event.button !== 2 || finalizing) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!candidate) return;
        const placement = { anchor: { ...candidate }, rotation: [0, yaw, 0] };
        if (!this.sitePlacementValid(mission, placement, engine)) {
          engine.callbacks?.onStatus?.(
            "Emplacement invalide : choisissez une zone libre à l'intérieur du plateau."
          );
          return;
        }
        finalizing = true;
        const label = effect.kind === "refuge" ? "refuge" : "camp";
        const cancel = () => {
          finalizing = false;
          engine.callbacks?.onStatus?.(
            `Placement du ${label} repris. Choisissez un autre emplacement ou Échap pour annuler.`
          );
        };
        const rotate = (nextYaw) => {
          yaw = Number(nextYaw) || 0;
          previewRoot.rotation.set(0, yaw, 0);
        };
        const install = () => {
          const finalPlacement = {
            anchor: { ...candidate },
            rotation: [0, yaw, 0]
          };
          if (!this.sitePlacementValid(mission, finalPlacement, engine)) {
            finalizing = false;
            engine.callbacks?.onStatus?.("Emplacement devenu invalide.");
            return false;
          }
          if (!this.applyEffects(mission, {
            placement: finalPlacement,
            source: "player",
            confirmationToken
          })) {
            finalizing = false;
            engine.callbacks?.onStatus?.(
              "Construction impossible à cet emplacement ou ressources insuffisantes."
            );
            return false;
          }
          this.cleanupPlacement();
          this.manager()?.syncLifecycleFromTrees?.();
          this.manager()?.publish?.();
          global.dispatchEvent?.(new CustomEvent("bluefox:site-established", {
            detail: { missionId: mission.id, mapId: engine.currentMapId, kind: effect.kind }
          }));
          return true;
        };
        global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-finalize-request", {
          detail: {
            missionId: mission.id,
            mapId: engine.currentMapId,
            kind: effect.kind,
            yaw,
            onRotate: rotate,
            onCancel: cancel,
            onInstall: install
          }
        }));
      };
      const contextmenu = (event) => {
        if (!this.activePlacement || finalizing) return;
        event.preventDefault();
      };
      const keydown = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-finalize-close", {
          detail: { missionId: mission.id }
        }));
        this.cleanupPlacement();
        engine.callbacks?.onStatus?.("Placement annulé. La mission reste active.");
      };
      const handlers = { pointermove: movePreview, pointerup, contextmenu, keydown };
      Object.entries(handlers).forEach(([type, handler]) => {
        const target = type === "keydown" ? global : canvas;
        target.addEventListener(type, handler, {
          capture: true,
          passive: type === "pointermove"
        });
      });
      this.activePlacement = {
        missionId: mission.id,
        canvas,
        previewRoot,
        handlers,
        clonedMaterials,
        confirmationToken
      };
      engine.callbacks?.onStatus?.(
        "Placement : déplacez la structure avec la souris. Clic gauche : déplacement de BlueFox. Clic droit : confirmer la position. Molette : caméra. Échap : annuler."
      );
      global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-started", {
        detail: { missionId: mission.id, mapId: engine.currentMapId, kind: effect.kind }
      }));
      return true;
    }

    handleConstructionReady(mission) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission?.id);
      const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission?.id];
      if (!mission?.completionGate || !this.constructionPlacementEffect(mission)) return false;
      if (lifecycle?.status !== "active" || !tree?.root?.isComplete) return false;
      const targetMapId = this.missionTargetMapId(mission);
      if (!targetMapId) return false;
      if (String(BF.currentEngine?.currentMapId || "") !== targetMapId) {
        const messageKey = `${mission.id}:waiting-target-map`;
        if (!this.state.progressNarrative[messageKey]) {
          const kind = this.constructionPlacementEffect(mission)?.kind;
          BF.currentEngine?.callbacks?.onStatus?.(
            kind === "refuge"
              ? `Rendez-vous sur ${targetMapId} pour installer le refuge.`
              : `Rendez-vous sur ${targetMapId} pour établir le camp.`
          );
          this.state.progressNarrative[messageKey] = Date.now();
          this.saveState();
        }
        return false;
      }
      if (this.canFinalizeMission(mission.id)) {
        manager.syncLifecycleFromTrees?.();
        return true;
      }
      const source = mission.activationSource || this.state.constructionInstances?.[mission.id]?.source || "player";
      const resourceStatus = this.constructionResourceStatus(mission);
      if (resourceStatus && !resourceStatus.ready) {
        this.pendingConstructionResourceMissions.add(mission.id);
        this.publishConstructionResourceStatus(mission, resourceStatus);
        return false;
      }
      this.pendingConstructionResourceMissions.delete(mission.id);
      this.publishConstructionResourceStatus(mission, resourceStatus);
      if (source === "autonomy") {
        const effect = this.constructionPlacementEffect(mission);
        const preset = this.sitePlacementPreset(effect?.microSceneId, BF.currentEngine);
        const placement = preset?.position
          ? {
              anchor: clone(preset.position),
              rotation: Array.isArray(preset.rotation)
                ? preset.rotation.map((value) => Number(value) || 0)
                : [0, Number(preset.rotation) || 0, 0]
            }
          : this.autonomousPlacement(mission);
        if (
          !placement ||
          !this.applyEffects(mission, { placement, source: "autonomy" })
        ) return false;
        manager.syncLifecycleFromTrees?.();
        manager.publish?.();
        return true;
      }

      // En mode joueur, la mission reste simplement "prête à positionner".
      // L'ouverture du preview est une action UI explicite afin d'éviter toute
      // reprise automatique après reload ou publication MissionManager.
      return true;
    }

    resumeConstructionPlacement(missionId) {
      const mission = this.byId.get(String(missionId || ""));
      if (!mission || mission.activationSource === "autonomy") return false;
      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission.id);
      const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission.id];
      const targetMapId = this.missionTargetMapId(mission);
      if (
        lifecycle?.status !== "active" ||
        !tree?.root?.isComplete ||
        !targetMapId ||
        String(BF.currentEngine?.currentMapId || "") !== targetMapId ||
        this.gateSatisfied(mission)
      ) {
        return false;
      }
      return this.beginSitePlacement(mission);
    }

    reviewConstructionReadiness() {
      return this.allMissions().some((mission) => this.handleConstructionReady(mission));
    }


    researchRewardDefinitions() {
      const entries = [];
      this.catalog.forEach((mission) => {
        const rewards = Array.isArray(mission.rewards)
          ? mission.rewards
          : mission.rewards == null
            ? []
            : [mission.rewards];
        rewards.forEach((reward, index) => {
          if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
          entries.push({
            ...clone(reward),
            missionId: mission.id,
            missionTitle: mission.title,
            rewardIndex: index
          });
        });
      });
      return entries;
    }

    researchRewardById(id) {
      const key = String(id || "");
      return this.researchRewardDefinitions()
        .find((entry) => entry.id === key) || null;
    }

    ensureResearchMemory() {
      const memory = this.manager()?.memory;
      if (!memory) return null;
      memory.state.researchUnlocks =
        memory.state.researchUnlocks || {};
      return memory;
    }

    isResearchRewardUnlocked(id) {
      const memory = this.ensureResearchMemory();
      return Boolean(
        memory?.state?.researchUnlocks?.[String(id || "")]
      );
    }

    unlockResearchRewards(mission) {
      const memory = this.ensureResearchMemory();
      if (!memory) return 0;
      const rewards = Array.isArray(mission?.rewards)
        ? mission.rewards
        : mission?.rewards == null
          ? []
          : [mission.rewards];
      let changed = 0;
      rewards.forEach((reward, index) => {
        if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
        if (memory.state.researchUnlocks[reward.id]) return;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: mission.id,
          rewardIndex: index,
          unlockedAt: Date.now()
        };
        changed += 1;
        global.dispatchEvent?.(
          new CustomEvent("bluefox:research-unlocked", {
            detail: {
              id: reward.id,
              type: reward.type,
              missionId: mission.id
            }
          })
        );
      });
      if (changed) memory.save?.();
      return changed;
    }

    migrateLegacyRationUnlock() {
      const reward = this.researchRewardById("ration-basic-v2");
      const memory = this.ensureResearchMemory();
      if (!reward || !memory || memory.state.researchUnlocks[reward.id]) {
        return false;
      }
      try {
        const raw = global.localStorage?.getItem?.(
          "bluefox_personal_consumables_v1"
        );
        if (!raw) return false;
        const legacy = JSON.parse(raw);
        if (legacy?.recipeUnlocked !== true) return false;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: "legacy-ration-migration",
          rewardIndex: 0,
          unlockedAt: Date.now(),
          migrated: true
        };
        memory.save?.();
        return true;
      } catch {
        return false;
      }
    }

    researchEntries(options = {}) {
      const unlockedOnly = options.unlockedOnly !== false;
      return this.researchRewardDefinitions()
        .map((entry) => ({
          ...entry,
          unlocked: this.isResearchRewardUnlocked(entry.id)
        }))
        .filter((entry) => !unlockedOnly || entry.unlocked);
    }

    canCraftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!reward || reward.type !== "research.recipe") {
        return false;
      }
      if (!options.ignoreUnlock && !this.isResearchRewardUnlocked(reward.id)) {
        return false;
      }
      if (
        reward.requiresShelter !== false &&
        options.ignoreShelter !== true &&
        BF.canAccessCampInventory?.() !== true
      ) {
        return false;
      }
      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      return requirements.every((requirement) => {
        const key = requirement.inventoryKey || requirement.resource;
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        return Boolean(
          key &&
          BF.progression?.availableInventory?.([key]) >= quantity
        );
      });
    }

    craftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!this.canCraftResearchReward(id, requested, options)) return 0;

      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      for (const requirement of requirements) {
        const key = requirement.inventoryKey || requirement.resource;
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        const removed = BF.consumeInventoryPool?.([key], quantity) || 0;
        if (removed !== quantity) return 0;
      }

      const output = reward.output || {};
      const objectId = output.objectId || output.inventoryKey || null;
      const outputQuantity =
        Math.max(1, Number(output.quantity) || 1) * requested;
      let created = 0;
      if (objectId === "ration" && BF.Rations?.add) {
        created = BF.Rations.add(
          outputQuantity,
          options.automatic ? "bac-craft" : "research-craft"
        );
      } else if (objectId && BF.progression?.addInventory) {
        BF.progression.addInventory(objectId, outputQuantity);
        BF.progression.save?.();
        BF.progression.publishChange?.("research-crafted", {
          inventoryKey: objectId,
          quantity: outputQuantity,
          researchRewardId: reward.id
        });
        created = outputQuantity;
      }

      if (!created) return 0;
      const detail = {
        rewardId: reward.id,
        category: reward.category || null,
        objectId,
        quantity: created,
        automatic: options.automatic === true,
        source: options.source || "research-menu",
        at: Date.now()
      };
      global.dispatchEvent?.(
        new CustomEvent("bluefox:research-crafted", { detail })
      );
      global.dispatchEvent?.(
        new CustomEvent("bluefox:mission-craft", {
          detail: {
            recipe: reward.id,
            objectId,
            quantity: created,
            automatic: options.automatic === true,
            at: detail.at
          }
        })
      );
      return created;
    }

    applyActivationInventoryCredits(mission) {
      const credits = asArray(mission?.activationInventoryCredits)
        .filter((credit) => credit?.slot && (credit?.inventoryKey || credit?.subject));
      if (!credits.length) return false;

      const key = `${mission.id}:v${mission.version || 1}`;
      if (this.state.activationInventoryCredits[key]) return false;

      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission.id);
      if (!manager || !tree) return false;

      let changed = false;
      credits.forEach((credit) => {
        const node = tree.find?.(`${mission.id}:${credit.slot}`);
        if (!node || node.isComplete) return;
        const inventoryKeys = this.inventoryKeysForRequirement(credit);
        if (!inventoryKeys.length) return;
        const available = Math.max(
          0,
          Number(BF.progression?.availableInventory?.(inventoryKeys)) || 0
        );
        const maximum = Math.max(0, Number(credit.maximum) || node.target || 0);
        const credited = Math.min(node.target, maximum || node.target, available);
        if (credited <= Number(node.progress || 0)) return;
        const delta = credited - Number(node.progress || 0);
        changed = node.increment?.(delta) === true || changed;
      });

      this.state.activationInventoryCredits[key] = Date.now();
      this.saveState();
      if (changed) {
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        manager.syncLifecycleFromTrees?.();
        manager.publish?.();
      }
      return changed;
    }

    onMissionState(state) {
      if (!this.observationCaptureQueued) {
        this.observationCaptureQueued = true;
        const schedule = global.queueMicrotask || ((callback) => Promise.resolve().then(callback));
        schedule(() => {
          this.observationCaptureQueued = false;
          this.captureObservationMap(BF.currentEngine);
        });
      }

      this.migrateLegacyRationUnlock();
      this.reconcileRuntimeCounters();
      this.reconcileHistoricalCollectionChains();
      this.reconcileEnvironmentAll(BF.currentEngine?.currentMapId);
      this.refreshProximityContextMonitor();
      this.reconcileLocalExploration(state);
      this.restoreLocalExplorationSession();
      this.restoreLocalMissionDefinitions(state);
      this.reconcileLocalSiteProgression();
      for (const mission of this.missionsForState(state)) {
        const entry = this.findMissionEntry(state, mission.id);
        if (entry) this.emitProgressNarrative(mission, entry);

        const manager = this.manager();
        const lifecycle =
          manager?.memory?.state?.missionLifecycle?.[mission.id];

        // MissionManager est l'unique propriétaire de l'état lifecycle.
        // BibleRuntime ne réactive jamais lui-même une mission terminée :
        // completionGateState() décrit le gate et MissionManager décide si
        // l'état reste actif jusqu'à sa validation réelle.

        if (lifecycle?.status === "active") {
          this.emitRevealedOnce(mission);
          this.applyActivationInventoryCredits(mission);
          this.handleConstructionReady(mission);
        }

        if (lifecycle?.status !== "completed") continue;

        let effectsReady = Boolean(this.state.effectsApplied[mission.id]);
        if (!effectsReady) {
          effectsReady = this.applyEffects(mission);
          if (effectsReady) {
            this.state.effectsApplied[mission.id] = Date.now();
            this.saveState();
          }
        }
        if (!effectsReady) continue;

        BF.completeMissionPsychology?.(mission);
        this.unlockResearchRewards(mission);
        this.emitCompletedOnce(mission);
      }
    }


    emitCompletedOnce(mission) {
      const key = `${mission.id}:completed`;
      if (this.state.progressNarrative[key]) return false;

      this.state.progressNarrative[key] = Date.now();
      this.saveState();
      return this.emitNarrative(mission, "completed");
    }

    connect() {
      if (!this.unsubscribeObjectEvents && BF.ObjectEvents?.subscribe) {
        this.unsubscribeObjectEvents =
          BF.ObjectEvents.subscribe((event) =>
            this.onObjectEvent(event)
          );
      }

      global.removeEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.addEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.removeEventListener?.(
        "bluefox:progression-changed",
        this.boundProgressionChanged
      );
      global.addEventListener?.(
        "bluefox:progression-changed",
        this.boundProgressionChanged
      );
      global.removeEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.addEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.removeEventListener?.(
        "bluefox:map-exploration-changed",
        this.boundExplorationChange
      );
      global.addEventListener?.(
        "bluefox:map-exploration-changed",
        this.boundExplorationChange
      );
      global.removeEventListener?.(
        "bluefox:ration-consumed",
        this.boundRationConsumed
      );
      global.addEventListener?.(
        "bluefox:ration-consumed",
        this.boundRationConsumed
      );
      global.removeEventListener?.(
        "bluefox:survival-changed",
        this.boundSurvivalChanged
      );
      global.addEventListener?.(
        "bluefox:survival-changed",
        this.boundSurvivalChanged
      );
      global.removeEventListener?.(
        "bluefox:rations-changed",
        this.boundRationsChanged
      );
      global.addEventListener?.(
        "bluefox:rations-changed",
        this.boundRationsChanged
      );
      return Boolean(this.unsubscribeObjectEvents);
    }

    activationDiagnostics(missionId) {
      const lifecycle = this.missionLifecycle(missionId);
      return {
        missionId,
        definitionExists: Boolean(
          Missions.getDefinition?.(missionId)
        ),
        managerAvailable: Boolean(this.manager()),
        lifecycle: clone(lifecycle.lifecycle),
        active: lifecycle.active,
        completed: lifecycle.completed,
        treeExists: Boolean(lifecycle.tree),
        triggerCount:
          this.state.triggerCounts[
            `${missionId}:${this.byId.get(missionId)?.trigger?.type || "none"}`
          ] || 0,
        lastActivationAttempt:
          this.lastActivationAttempt?.missionId === missionId
            ? clone(this.lastActivationAttempt)
            : null
      };
    }

    activateInitialMissions() {
      if (!this.manager()) return false;
      const initialMissions = this.catalog.filter(
        (mission) => mission?.initialState === "active"
      );
      if (!initialMissions.length) return true;

      let settled = true;
      initialMissions.forEach((mission) => {
        const state = this.missionLifecycle(mission.id);
        if (state.active || state.completed) return;
        settled = false;
        this.activateMission(mission, {
          type: "manual",
          mapId: BF.currentEngine?.currentMapId || null
        });
      });

      if (!settled) {
        settled = initialMissions.every((mission) => {
          const state = this.missionLifecycle(mission.id);
          return state.active || state.completed;
        });
      }
      return settled;
    }

    diagnostics() {
      return {
        version: VERSION,
        started: this.started,
        connected: Boolean(this.unsubscribeObjectEvents),
        missionLifecycleSource: "MissionManager/MissionMemory",
        strictContract: this.validate().ok,
        catalogCount: this.catalog.length,
        registeredDefinitions: this.allMissions().filter((mission) =>
          Missions.getDefinition?.(mission.id)
        ).length,
        constructionInstances: clone(this.state.constructionInstances),
        triggerCounts: clone(this.state.triggerCounts),
        lifecycle: Object.fromEntries(
          this.catalog.map((mission) => [
            mission.id,
            this.missionLifecycle(mission.id).status
          ])
        )
      };
    }

    start() {
      if (this.started) return this.diagnostics();

      const registration = this.registerDefinitions();
      if (!registration.ok) return registration;

      this.connect();
      this.reconcileHistoricalCollectionChains();
      this.migrateLegacyRationUnlock();
      // Le chargement initial de Crystal ne garantit pas l'émission d'une
      // transition après que WorldEngine et ObjectSpawner soient prêts.
      // On arme donc une restauration bornée, sans boucle permanente.
      this.scheduleCurrentSiteRestore();
      this.started = true;

      console.info(
        "[BlueFox] Bible Runtime V0.1 unifié actif.",
        {
          missions: this.catalog.length,
          connected: Boolean(this.unsubscribeObjectEvents)
        }
      );

      return {
        ...registration,
        started: true,
        connected: Boolean(this.unsubscribeObjectEvents)
      };
    }
  }

  BibleRuntimeV01.prototype.__sequenceActionsCompilerV1 = true;

  const runtime = new BibleRuntimeV01();

  // Une seule source de vérité Runtime.
  BF.BibleRuntimeV01 = BibleRuntimeV01;
  BF.bibleRuntime = runtime;

  // Compatibilité API avec les outils/tests précédents.
  BF.startBibleRuntime = () => runtime.start();
  BF.getBibleRuntimeDiagnostics = () => runtime.diagnostics();
  BF.getBibleRuntimeV01Diagnostics = () => runtime.diagnostics();
  BF.getBibleActivationDiagnostics = (id) =>
    runtime.activationDiagnostics(id);
  BF.getLastBibleActivationAttempt = () =>
    clone(runtime.lastActivationAttempt);
  BF.captureObservationMap = (engine) =>
    runtime.captureObservationMap(engine || BF.currentEngine);
  BF.getObservationCoverage = (mapId) =>
    runtime.observationCoverage(mapId);
  BF.getObservationCoverageTotals = () =>
    runtime.observationTotals();
  BF.getConstructionResourceStatus = (missionId) =>
    clone(runtime.constructionResourceStatus(missionId));
  BF.getConstructionCollectionCandidate = (engine, now) =>
    runtime.constructionCollectionCandidate(engine || BF.currentEngine, now);
  BF.isTutorialSurvivalCapabilityUnlocked = (capability) =>
    runtime.survivalCapabilityUnlocked(capability);


  BF.Research = Object.freeze({
    list: (options) => runtime.researchEntries(options),
    get: (id) => runtime.researchRewardById(id),
    isUnlocked: (id) => runtime.isResearchRewardUnlocked(id),
    canCraft: (id, count, options) =>
      runtime.canCraftResearchReward(id, count, options),
    craft: (id, count, options) =>
      runtime.craftResearchReward(id, count, options),
    constructionState: (kind, mapId) =>
      runtime.constructionAvailability(kind, mapId),
    startConstruction: (kind, options) =>
      runtime.startConstruction(kind, options),
    resumePlacement: (missionId) =>
      runtime.resumeConstructionPlacement(missionId),
    cancelPlacement: () => runtime.cleanupPlacement()
  });
  BF.getResearchEntries = (options) =>
    runtime.researchEntries(options);
  BF.getResearchReward = (id) =>
    runtime.researchRewardById(id);
  BF.craftResearchReward = (id, count, options) =>
    runtime.craftResearchReward(id, count, options);

  BF.startBibleMission = (id) => {
    const mission = runtime.byId.get(id);
    return mission
      ? runtime.activateMission(mission, {
          type: "manual",
          subject: null
        })
      : false;
  };

  runtime.start();
})(window);
