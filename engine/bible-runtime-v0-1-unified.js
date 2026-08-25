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
      this.localExplorationReconciling = false;
      this.localExplorationSessionRestored = false;
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

    missionsForState(state) {
      const missions = [...this.allMissions()];
      (state?.missions || []).forEach((entry) => {
        const mission = this.localExplorationMission(
          entry.missionId || entry.id
        );
        if (mission) missions.push(mission);
      });
      return missions;
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

    restoreLocalExplorationSession() {
      if (this.localExplorationSessionRestored) return false;
      const manager = this.manager();
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return false;
      }
      this.localExplorationSessionRestored = true;
      const mapId = String(BF.currentEngine?.currentMapId || "");
      if (!mapId) return false;
      const paused = this.pauseOffMapLocalExploration(mapId);
      const exploration = BF.getMapExplorationState?.(mapId);
      return this.reconcileLocalExplorationMap(
        mapId,
        exploration?.surfacePercent
      ) || paused;
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

      const base = BF.BibleContractV01.validateCatalog(
        this.catalog,
        this.patterns,
        { compatibility: "strict" }
      );

      const sequenceMissions = this.catalog.filter(
        (mission) => mission?.pattern === "SEQUENCE_ACTIONS"
      );
      if (!sequenceMissions.length) return base;

      const sequenceIds = new Set(
        sequenceMissions.map((mission) => mission.id)
      );
      const errors = (base.errors || []).filter((message) =>
        ![...sequenceIds].some((id) =>
          message.startsWith(`${id} · slots`)
        )
      );

      sequenceMissions.forEach((mission) => {
        const steps = asArray(mission.sequence)
          .filter((step) => step && typeof step === "object");
        if (steps.length < 2) {
          errors.push(
            `${mission.id || "<sans-id>"} · sequence : minimum 2 étapes.`
          );
          return;
        }

        const slots = new Set();
        steps.forEach((step, index) => {
          const slot = step.slot || `step${index + 1}`;
          if (slots.has(slot)) {
            errors.push(
              `${mission.id} · sequence[${index}].slot : identifiant dupliqué.`
            );
          }
          slots.add(slot);

          const action =
            Missions.normalizeActionType?.(step.action) ||
            String(step.action || "").trim().toLowerCase();
          if (
            !Object.values(Missions.ActionType || {}).includes(action)
          ) {
            errors.push(
              `${mission.id} · sequence[${index}].action : action non supportée.`
            );
          }
          if (
            step.target != null &&
            (
              !Number.isFinite(Number(step.target)) ||
              Number(step.target) < 1
            )
          ) {
            errors.push(
              `${mission.id} · sequence[${index}].target : doit être >= 1.`
            );
          }
        });

        steps.forEach((step, index) => {
          asArray(step.requires).forEach((required) => {
            if (!slots.has(required)) {
              errors.push(
                `${mission.id} · sequence[${index}].requires : slot inconnu ${required}.`
              );
            }
          });
        });
      });

      return Object.freeze({
        ...base,
        ok: errors.length === 0,
        errors: Object.freeze(errors)
      });
    }

    compileMission(mission) {
      const pattern = this.patterns[mission?.pattern];
      if (!mission || !pattern) return null;

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
          targetMapId: mission.targetMapId || null,
          priority: Number(mission.priority) || 0,
          passivePriorityAxis:
            mission.passivePriorityAxis ||
            pattern.autonomyAxis ||
            null,
          journalIntro: mission.narrative?.revealed?.[0] || "",
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
                bibleRequirementIndex: index
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
        targetMapId: mission.targetMapId || null,
        priority: Number(mission.priority) || 0,
        passivePriorityAxis:
          mission.passivePriorityAxis ||
          pattern.autonomyAxis ||
          null,
        journalIntro: mission.narrative?.revealed?.[0] || "",
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

    buildObservationResolver(engine = BF.currentEngine) {
      const map = engine?.currentMap;
      const mapId = engine?.currentMapId;
      if (!map || !mapId) return null;

      const cached = this.observationResolvers.get(map);
      if (cached?.mapId === mapId) return cached;

      const byInstance = new Map();
      const observable = new Set();
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
        observable: [...observable]
      };
      this.observationResolvers.set(map, resolver);
      return resolver;
    }

    captureObservationMap(engine = BF.currentEngine) {
      const manager = this.manager();
      const mapId = engine?.currentMapId;
      if (!manager?.memory || !mapId) return false;

      const coverage = this.observationMemory();
      if (coverage.maps?.[mapId]?.frozen === true) {
        this.buildObservationResolver(engine);
        return false;
      }

      const resolver = this.buildObservationResolver(engine);
      if (!resolver) return false;
      const next = clone(coverage);
      next.maps = next.maps || {};
      next.mapsReached50 = asArray(next.mapsReached50);
      next.mapsReached100 = asArray(next.mapsReached100);
      next.maps[mapId] = {
        mapId,
        observableEntityIds: [...resolver.observable],
        observedEntityIds: [],
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
      if (!entityId) return false;

      const coverage = this.observationMemory();
      const mapCoverage = coverage.maps?.[mapId];
      if (!mapCoverage?.frozen) return false;
      if (!mapCoverage.observableEntityIds?.includes(entityId)) return false;
      if (mapCoverage.observedEntityIds?.includes(entityId)) return false;

      const next = clone(coverage);
      const entry = next.maps[mapId];
      entry.observedEntityIds = asArray(entry.observedEntityIds);
      entry.observedEntityIds.push(entityId);

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
          status === "completed" ||
          publicEntry?.tree?.root?.status === "completed"
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
      return asArray(mission?.prerequisites).every((missionId) =>
        this.missionLifecycle(missionId).completed
      );
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

        manager.memory?.setFact?.(`bibleTarget:${mission.id}`, {
          binding: mission.targetBinding || "definition",
          instanceId: event.instanceId || null,
          objectId: event.objectId || null,
          cuoType: event.cuoType || null
        });

        // triggerOnly signifie : l’événement révèle la mission mais ne lie pas
        // la suite à l’objet qui a servi de déclencheur. Cette règle était
        // auparavant portée par bible-runtime-trigger-fix-v19.js.
        if (mission.triggerOnly === true) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
          manager.memory?.save?.();
        }

        // La rencontre déclenche uniquement la révélation. L'autonomie ne doit
        // pas consommer le premier objectif dans la même séquence d'interaction.
        // Une action manuelle reste immédiatement possible et sera forcée par
        // la directive de mission ; l'autonomie reprendra à la séquence suivante.
        manager.retryAfter = Math.max(
          Number(manager.retryAfter || 0),
          performance.now() + 3500
        );

        this.emitRevealedOnce(mission, event);
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

      for (const mission of this.catalog) {
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;

        const lifecycleState = this.missionLifecycle(mission.id);

        if (lifecycleState.completed) continue;

        if (lifecycleState.active) continue;

        // Un événement géographique ne prépare pas silencieusement une mission
        // dont l'arc précédent n'est pas terminé.
        if (!this.prerequisitesSatisfied(mission)) continue;

        const count = this.incrementTrigger(mission, event);
        const required = Math.max(1, Number(mission.trigger?.count) || 1);

        if (count >= required) {
          candidates.push(mission);
        }
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

      return {
        matched: candidates.length,
        activatedMissionId
      };
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
      let allowActivation = !result.activatedMissionId;

      // 2) Evénement narratif générique : toute interaction réelle avec
      // l'objet. Il est volontairement indépendant de l'état "connu" CUO.
      // Cela permet à une mission ajoutée plus tard de se révéler même si
      // BlueFox a déjà observé/analysé/collecté ce type d'objet auparavant.
      result = this.consumeTriggerEvent({
        ...normalized,
        type: "interaction.any",
        amount: 1
      }, { allowActivation });
      allowActivation = allowActivation && !result.activatedMissionId;

      // 3) Première interaction d'étude : conservée comme vocabulaire
      // distinct pour les missions qui exigent explicitement une découverte.
      if ([
        "interaction.observe",
        "interaction.inspect",
        "interaction.analyze"
      ].includes(normalized.type)) {
        this.consumeTriggerEvent({
          ...normalized,
          type: "interaction.discovery",
          amount: 1
        }, { allowActivation });
      }

      const activatedNow = this.catalog.some((mission) =>
        !activeBefore.has(mission.id) && this.missionLifecycle(mission.id).active
      );
      if (activatedNow && rawEvent.id) {
        this.activationEventIds.add(rawEvent.id);
        global.setTimeout?.(() => this.activationEventIds.delete(rawEvent.id), 0);
      }

      this.bridgeMissionProgress(rawEvent);
    }

    onExplorationChanged(detail) {
      const manager = this.manager();
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return false;
      }
      return this.reconcileLocalExplorationMap(
        detail.mapId,
        detail.surfacePercent
      );
    }

    onMapTransition(detail) {
      // La transition est émise après chargement de la map courante.
      this.captureObservationMap(BF.currentEngine);

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
        const exploration = BF.getMapExplorationState?.(event.mapId);
        this.reconcileLocalExplorationMap(
          event.mapId,
          exploration?.surfacePercent
        );
      }
    }

    isActivationEvent(eventId) {
      return Boolean(eventId && this.activationEventIds.has(eventId));
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

    gateSatisfied(mission) {
      const gate = mission?.completionGate;
      if (!gate) return true;
      if (this.state.gatesSatisfied[mission.id]) return true;

      const engine = BF.currentEngine;
      const requiredMapId = gate.mapId != null ? String(gate.mapId) : null;
      if (gate.type !== "proximity.shelter") return false;

      const p = engine?.character?.root?.position;
      if (!p) return false;
      const allowed = new Set(gate.shelterKinds || ["camp", "refuge", "base"]);
      const radius = Math.max(0.5, Number(gate.radius) || 8);
      const requiredSiteId = gate.siteId != null ? String(gate.siteId) : null;
      if (requiredMapId != null && String(engine.currentMapId || "") !== requiredMapId) return false;

      const satisfied = this.shelterObjects().some((record) => {
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
      if (satisfied) {
        this.state.gatesSatisfied[mission.id] = Date.now();
        this.saveState();
      }
      return satisfied;
    }

    canFinalizeMission(missionId) {
      const mission = this.byId.get(missionId);
      if (!mission?.completionGate) return true;

      const establish = this.constructionPlacementEffect(mission);
      if (establish) {
        const kind = lower(establish.kind);
        const mapId = String(
          mission.targetMapId ||
          mission.completionGate?.mapId ||
          ""
        );
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

      return this.gateSatisfied(mission);
    }

    updateCompletionGates(now = performance.now()) {
      if (now - this.lastGateReviewAt < 500) return false;
      this.lastGateReviewAt = now;
      const manager = this.manager();
      if (!manager) return false;
      const waiting = this.allMissions().some((mission) => {
        if (!mission.completionGate) return false;
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

    installCompletionGate() {
      const Manager = Missions.MissionManager;
      if (
        !Manager?.prototype ||
        Manager.prototype.__bibleUnifiedGateV01
      ) {
        return;
      }

      Manager.prototype.syncLifecycleFromTrees =
        function syncLifecycleFromTreesBibleUnified() {
          let changed = false;

          this.trees.forEach((tree, missionId) => {
            if (!tree.root.isComplete) return;

            const runtime = BF.bibleRuntime;
            if (
              runtime?.byId?.has?.(missionId) &&
              !runtime.canFinalizeMission(missionId)
            ) {
              const lifecycle = this.ensureLifecycle(missionId);
              lifecycle.status = "active";
              lifecycle.completedAt = 0;
              lifecycle.waitingForBibleGate = true;
              const mission = runtime.byId.get(missionId);
              const kind = runtime.constructionPlacementEffect(mission)?.kind;
              const targetMapId = String(
                mission?.targetMapId || mission?.completionGate?.mapId || ""
              );
              lifecycle.waitingForBibleGateMessage =
                kind === "refuge"
                  ? `Rendez-vous sur ${targetMapId} pour installer le refuge.`
                  : `Rendez-vous sur ${targetMapId} pour établir le camp.`;

              if (!this.activeMissionIds.includes(missionId)) {
                this.activeMissionIds.push(missionId);
              }
              return;
            }

            const lifecycle = this.ensureLifecycle(missionId);
            const wasWaitingForBibleGate = lifecycle.waitingForBibleGate === true;
            if (lifecycle.status !== "completed") changed = true;
            lifecycle.status = "completed";
            lifecycle.completedAt = wasWaitingForBibleGate
              ? Date.now()
              : (tree.root.completedAt || Date.now());

            delete lifecycle.waitingForBibleGate;
            delete lifecycle.waitingForBibleGateMessage;

            this.activeMissionIds =
              this.activeMissionIds.filter((id) => id !== missionId);
          });

          this.syncMissionSelection();

          if (changed) this.memory.save();
        };

      Manager.prototype.__bibleUnifiedGateV01 = true;
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
      if (!establish || !BF.MicroScenes?.get?.(establish.microSceneId)) return false;
      const targetMapId = String(mission.targetMapId || mission.completionGate?.mapId || BF.currentEngine?.currentMapId || "");
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

      for (const consume of consumes) {
        const quantity = Math.max(0, Number(consume.quantity) || 0);
        if ((BF.progression?.availableInventory?.([consume.inventoryKey]) || 0) < quantity) return false;
      }

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
        const removed = BF.consumeInventoryPoolOnce?.(
          `${receiptId}:consume:${index}`,
          [consume.inventoryKey],
          quantity
        );
        if (removed !== quantity) return false;
      }

      this.storeSite(site, memory);
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

      if (kind === "refuge") {
        const camp = this.siteBucket(mission.targetMapId).camp;
        if (!camp?.anchor) return null;
        const campPreset = this.sitePlacementPreset("MSC-CUSTOM-CAMP", engine);
        const refugePreset = this.sitePlacementPreset(effect.microSceneId, engine);
        const campYaw = Number(camp.rotation?.[1]) || 0;
        let dx = 6;
        let dz = 2;
        if (campPreset?.position && refugePreset?.position) {
          dx = Number(refugePreset.position.x) - Number(campPreset.position.x);
          dz = Number(refugePreset.position.z) - Number(campPreset.position.z);
        }
        const baseDistance = Math.max(5, Math.hypot(dx, dz));
        const baseAngle = Math.atan2(dz, dx) + campYaw;
        for (const angleOffset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
          const angle = baseAngle + angleOffset;
          const placement = {
            anchor: {
              x: Number(camp.anchor.x) + Math.cos(angle) * baseDistance,
              y: Number(camp.anchor.y) || 0,
              z: Number(camp.anchor.z) + Math.sin(angle) * baseDistance
            },
            rotation: [0, campYaw + angleOffset + Math.PI / 6, 0]
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
      if (String(engine.currentMapId) !== String(mission.targetMapId || mission.completionGate?.mapId || engine.currentMapId)) return false;

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
      const targetMapId = String(mission.targetMapId || mission.completionGate.mapId || "");
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
      if (this.gateSatisfied(mission)) {
        manager.syncLifecycleFromTrees?.();
        return true;
      }
      const source = mission.activationSource || this.state.constructionInstances?.[mission.id]?.source || "player";
      if (source === "autonomy") {
        const placement = this.autonomousPlacement(mission);
        if (
          !placement ||
          !this.sitePlacementValid(mission, placement, BF.currentEngine) ||
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
      const targetMapId = String(
        mission.targetMapId || mission.completionGate?.mapId || ""
      );
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
        .filter((credit) => credit?.slot && credit?.inventoryKey);
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
        const available = Math.max(
          0,
          Number(BF.progression?.availableInventory?.([credit.inventoryKey])) || 0
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
      this.reconcileLocalExploration(state);
      this.restoreLocalExplorationSession();
      for (const mission of this.missionsForState(state)) {
        const entry = this.findMissionEntry(state, mission.id);
        if (entry) this.emitProgressNarrative(mission, entry);

        const manager = this.manager();
        const lifecycle =
          manager?.memory?.state?.missionLifecycle?.[mission.id];

        if (
          lifecycle?.status === "completed" &&
          Boolean(this.constructionPlacementEffect(mission)) &&
          !this.gateSatisfied(mission)
        ) {
          lifecycle.status = "active";
          lifecycle.completedAt = 0;
          lifecycle.waitingForBibleGate = true;
          if (!manager.activeMissionIds.includes(mission.id)) {
            manager.activeMissionIds.push(mission.id);
          }
          manager.memory?.save?.();
          this.handleConstructionReady(mission);
          continue;
        }

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
      const initialMissions = this.catalog.filter(
        (mission) => mission?.initialState === "active"
      );
      if (!initialMissions.length) return true;
      if (!this.manager()) return false;

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

      this.installCompletionGate();
      this.connect();
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
