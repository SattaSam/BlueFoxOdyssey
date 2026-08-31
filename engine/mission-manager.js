(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  class MissionManager {
    constructor(options) {
      this.engine = options.engine;
      this.memory = options.memory || new Missions.MissionMemory();
      this.planner = options.planner || new Missions.MissionPlanner(this.memory);
      this.bridge = options.bridge || new Missions.ActionBridge(this.engine);
      this.primaryMissionId = this.resolveInitialMission(options.missionId || "");
      this.activeMissionId = this.primaryMissionId || "";
      const rememberedIds = Array.isArray(this.memory.state.activeMissionIds)
        ? this.memory.state.activeMissionIds
        : [];
      this.activeMissionIds = [...new Set(
        [this.primaryMissionId, ...rememberedIds]
          .filter(Boolean)
          .filter((id) => this.definition(id))
          .filter((id) =>
            this.memory.state.missionLifecycle?.[id]?.status !== "completed"
          )
          .filter((id) => !this.isLegacyUnscopedSiteMission(id))
      )];
      Object.keys(this.memory.state.missionLifecycle || {}).forEach((id) => {
        if (!this.isLegacyUnscopedSiteMission(id)) return;
        this.memory.state.missionLifecycle[id].status = "available";
      });
      const completedIds = Object.keys(
        this.memory.state.missionLifecycle || {}
      ).filter((id) =>
        this.memory.state.missionLifecycle[id]?.status === "completed" &&
        this.definition(id) &&
        this.memory.state.missions?.[id] &&
        !this.isLegacyUnscopedSiteMission(id)
      );
      const restorableIds = [...new Set([
        ...this.activeMissionIds,
        ...completedIds
      ])];
      this.trees = new Map(restorableIds.map((id) => [
        id,
        this.planner.restoreOrCreate(id)
      ]));
      this.tree = this.primaryMissionId
        ? this.trees.get(this.primaryMissionId) || null
        : null;
      this.activeMissionIds.forEach((id) => this.ensureLifecycle(id, "active"));
      this.selectionReason = this.primaryMissionId
        ? this.memory.state.missionLifecycle[this.primaryMissionId]?.selectionReason ||
          "Mission reprise depuis la sauvegarde."
        : "Aucune mission active.";
      this.pendingPrimaryMissionId = null;
      this.pendingPrimaryMissionReason = null;
      this.pendingPauseMissionId = null;
      this.lastPriorityReviewAt = 0;
      this.syncMissionSelection();
      this.currentAction = null;
      this.lastPlanAt = 0;
      this.retryAfter = 0;
      this.enabled = true;
      this.onMissionTrigger = (event) => this.notifyMissionEvent(
        event.detail?.type || "event",
        event.detail || {}
      );
      global.addEventListener("bluefox:mission-trigger", this.onMissionTrigger);
      if (this.tree) this.memory.saveTree(this.tree);
      this.catalogController = Missions.MissionCatalogController
        ? new Missions.MissionCatalogController(this)
        : null;
      this.publish();
    }

    syncMissionSelection() {
      this.memory.state.primaryMissionId = this.primaryMissionId;
      this.memory.state.activeMissionId = this.primaryMissionId;
      this.memory.state.activeMissionIds = [...this.activeMissionIds];
      if (!this.primaryMissionId) return;
      const lifecycle = this.ensureLifecycle(this.primaryMissionId, "active");
      lifecycle.selectionReason = this.selectionReason || lifecycle.selectionReason || "";
      lifecycle.updatedAt = Date.now();
    }

    definition(missionId) {
      if (!missionId) return null;
      return Missions.getDefinition?.(missionId) || Missions.definitions?.[missionId] || null;
    }

    isLegacyUnscopedSiteMission(missionId) {
      return !String(missionId || "").includes("@") &&
        this.definition(missionId)?.instanceScope === "map";
    }

    ensureLifecycle(missionId, status = "available") {
      const collection = this.memory.state.missionLifecycle =
        this.memory.state.missionLifecycle || {};
      collection[missionId] = {
        status,
        urgency: 0,
        narrativePriority: 0,
        autoPrimaryEligible: true,
        activatedAt: 0,
        pausedAt: 0,
        completedAt: 0,
        selectionReason: "",
        discoveryReason: "",
        source: "system",
        ...(collection[missionId] || {})
      };
      return collection[missionId];
    }

    resolveInitialMission(fallback) {
      const candidates = [
        fallback,
        this.memory.state.primaryMissionId,
        this.memory.state.activeMissionId
      ]
        .filter(Boolean)
        .filter((id, index, values) => values.indexOf(id) === index)
        .filter((id) => !this.isLegacyUnscopedSiteMission(id));
      return candidates.find((id) => this.definition(id)) || "";
    }

    activateMission(missionId, options = {}) {
      if (!this.definition(missionId)) return false;
      if (!this.trees.has(missionId)) {
        this.trees.set(missionId, this.planner.restoreOrCreate(missionId));
      }
      if (!this.activeMissionIds.includes(missionId)) {
        this.activeMissionIds.push(missionId);
      }
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = this.trees.get(missionId).root.isComplete
        ? "completed"
        : "active";
      lifecycle.urgency = Math.max(0, Number(options.urgency) || lifecycle.urgency || 0);
      lifecycle.narrativePriority = Math.max(
        0,
        Number(options.narrativePriority) || lifecycle.narrativePriority || 0
      );
      lifecycle.source = options.source || lifecycle.source || "system";
      lifecycle.discoveryReason = options.reason || lifecycle.discoveryReason ||
        `Mission découverte par ${lifecycle.source}.`;
      if (typeof options.autoPrimaryEligible === "boolean") {
        lifecycle.autoPrimaryEligible = options.autoPrimaryEligible;
      }
      if (!lifecycle.activatedAt) lifecycle.activatedAt = Date.now();
      lifecycle.updatedAt = Date.now();
      delete this.memory.state.pendingActivations?.[missionId];
      const makePrimary = options.primary !== false;
      if (makePrimary) {
        this.setPrimaryMission(
          missionId,
          false,
          options.reason || `Mission activée par ${lifecycle.source}.`
        );
      }
      this.syncMissionSelection();
      if (makePrimary && this.primaryMissionId === missionId) {
        this.retryAfter = performance.now() + 1200;
      }
      this.memory.saveTree(this.trees.get(missionId));
      this.publish();
      return true;
    }

    startMission(missionId, options = {}) {
      if (!this.definition(missionId)) return false;
      const prerequisites = Array.isArray(options.prerequisites)
        ? options.prerequisites.filter(Boolean)
        : [];
      const missing = prerequisites.filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status !== "completed"
      );
      if (missing.length) {
        this.memory.state.pendingActivations = this.memory.state.pendingActivations || {};
        this.memory.state.pendingActivations[missionId] = {
          missionId,
          prerequisites,
          options: { ...options, prerequisites: undefined },
          requestedAt: Date.now()
        };
        const lifecycle = this.ensureLifecycle(missionId, "hidden");
        lifecycle.status = "hidden";
        lifecycle.waitingFor = missing;
        this.memory.save();
        this.publish();
        return true;
      }
      return this.activateMission(missionId, {
        ...options,
        primary: options.primary === true
      });
    }

    setPrimaryMission(missionId, publish = true, reason = "Priorité choisie explicitement.") {
      if (!this.definition(missionId)) return false;
      if (!this.trees.has(missionId)) {
        this.trees.set(missionId, this.planner.restoreOrCreate(missionId));
      }
      if (!this.activeMissionIds.includes(missionId)) {
        this.activeMissionIds.push(missionId);
      }
      if (this.currentAction || this.bridge.isEngineBusy()) {
        this.pendingPrimaryMissionId = missionId;
        this.pendingPrimaryMissionReason = reason;
        this.selectionReason = `Changement vers « ${this.trees.get(missionId).title} » après l’action en cours.`;
        if (publish) this.publish();
        return true;
      }
      this.primaryMissionId = missionId;
      this.activeMissionId = missionId;
      this.tree = this.trees.get(missionId);
      this.selectionReason = reason;
      this.pendingPrimaryMissionId = null;
      this.pendingPrimaryMissionReason = null;
      this.ensureLifecycle(missionId, "active").status = "active";
      this.syncMissionSelection();
      if (publish) {
        this.memory.saveTree(this.tree);
        this.publish();
      }
      return true;
    }

    pauseMission(missionId, reason = "Mission mise en pause.") {
      if (!this.activeMissionIds.includes(missionId)) return false;
      if (missionId === this.primaryMissionId && this.currentAction) {
        this.pendingPauseMissionId = missionId;
        this.selectionReason = `${reason} La pause prendra effet après l’action en cours.`;
        this.publish();
        return true;
      }
      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = "paused";
      lifecycle.pausedAt = Date.now();
      lifecycle.pauseReason = reason;
      if (missionId === this.primaryMissionId) this.selectBestPrimary(performance.now(), true);
      this.syncMissionSelection();
      this.memory.save();
      this.publish();
      return true;
    }

    resumeMission(missionId, options = {}) {
      return this.activateMission(missionId, {
        ...options,
        primary: options.primary === true,
        source: options.source || "reprise"
      });
    }

    suggestPrimaryMission(missionId) {
      const lifecycle = this.ensureLifecycle(missionId);
      if (lifecycle.status !== "active" || !this.trees.has(missionId)) return false;
      lifecycle.narrativePriority = Math.max(
        Number(lifecycle.narrativePriority) || 0,
        25
      );
      lifecycle.autoPrimaryEligible = true;
      lifecycle.discoveryReason = lifecycle.discoveryReason ||
        "Le joueur m’a suggéré d’en faire une priorité.";
      const changed = this.setPrimaryMission(
        missionId,
        false,
        "Priorité suggérée par le joueur."
      );
      this.memory.save();
      this.publish();
      return changed || true;
    }

    failMission(missionId, reason = "Mission échouée.") {
      const tree = this.trees.get(missionId);
      if (!tree) return false;
      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      tree.root.status = Missions.MissionStatus.FAILED;
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = "failed";
      lifecycle.failedAt = Date.now();
      lifecycle.failureReason = reason;
      this.memory.saveTree(tree);
      if (missionId === this.primaryMissionId) this.selectBestPrimary(performance.now(), true);
      this.publish();
      return true;
    }

    treeProgress(tree) {
      let total = 0;
      let completed = 0;
      tree.root.walk((node) => {
        if (!node.isLeaf) return;
        total += node.target;
        completed += Math.min(node.progress, node.target);
      });
      return total ? completed / total : 0;
    }

    playerPriority(axis) {
      if (!axis) return 50;
      try {
        const save = JSON.parse(global.localStorage.getItem("bluefox_odyssey_save_v1") || "null");
        const value = Number(save?.priorities?.[axis]);
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
      } catch {
        return 50;
      }
    }

    primaryEventDrivenTravel() {
      if (!this.primaryMissionId) return null;
      const tree = this.trees.get(this.primaryMissionId);
      const lifecycle = this.memory.state.missionLifecycle?.[this.primaryMissionId];
      if (!tree || lifecycle?.status !== "active") return null;
      const node = tree.availableLeaves().find((candidate) =>
        !candidate.isComplete &&
        candidate.params?.eventDriven === true &&
        Missions.normalizeActionType(candidate.type) === Missions.ActionType.TRAVEL
      );
      if (!node) return null;
      return { missionId: this.primaryMissionId, mission: this.definition(this.primaryMissionId), node };
    }


    missionReturnIntentKey(missionId) {
      return `missionReturnIntent:${missionId}`;
    }

    travelMissionDefinition(travel) {
      const missionId = String(travel?.missionId || "");
      return missionId ? this.definition(missionId) : null;
    }

    isAutonomousUnknownTravel(travel) {
      const mission = this.travelMissionDefinition(travel);
      return Boolean(
        travel &&
        mission?.navigation?.autonomousUnknownTravel === true &&
        !travel.node?.params?.toMapId
      );
    }

    missionUnknownTravelPlan(travel) {
      const directions = ["north", "east", "south", "west"];
      const preferred = String(travel?.node?.params?.direction || "")
        .trim()
        .toLowerCase();
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return null;

      const freeDirection = (mapId) => {
        const exits = BF.maps?.[mapId]?.exits || {};
        if (directions.includes(preferred) && !exits[preferred]) return preferred;
        return directions.find((direction) => !exits[direction]) || null;
      };

      const localDirection = freeDirection(currentMapId);
      if (localDirection) {
        return {
          frontierMapId: currentMapId,
          direction: localDirection,
          route: [currentMapId]
        };
      }

      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : new Set([currentMapId]);
      const queue = [[currentMapId]];
      const visited = new Set([currentMapId]);

      while (queue.length) {
        const route = queue.shift();
        const mapId = route[route.length - 1];
        if (mapId !== currentMapId) {
          const direction = freeDirection(mapId);
          if (direction) {
            return { frontierMapId: mapId, direction, route };
          }
        }
        const exits = Object.values(BF.maps?.[mapId]?.exits || {});
        for (const exit of exits) {
          const nextMapId = String(exit?.targetMap || "");
          if (!nextMapId || visited.has(nextMapId) || !discovered.has(nextMapId)) continue;
          visited.add(nextMapId);
          queue.push([...route, nextMapId]);
        }
      }
      return null;
    }

    transitionLocalCandidates(missionId, context = this.bridge.context()) {
      return this.activeMissionIds
        .filter((id) => id !== missionId)
        .filter((id) => this.ensureLifecycle(id).status === "active")
        .filter((id) => this.isMissionExclusiveToCurrentMap(id))
        .filter((id) => {
          const tree = this.trees.get(id);
          return Boolean(
            tree &&
            !tree.root.isComplete &&
            this.planner.nextAction(tree, context)
          );
        });
    }

    chooseTransitionDeferralMission(
      transitionMissionId,
      eligibleMissionIds,
      context = this.bridge.context()
    ) {
      const ids = Array.isArray(eligibleMissionIds)
        ? eligibleMissionIds.filter(Boolean)
        : [];
      if (!ids.length) return null;

      const assessments = ids
        .map((id) => this.assessMission(id, context))
        .filter((candidate) => candidate?.action);

      if (!assessments.length) return null;

      const BAC = BF.BAC;
      if (!BAC?.weightedPick) return null;

      const transitionDefinition = this.definition(transitionMissionId) || {};
      const transitionOption = {
        id: `mission-transition:${transitionMissionId}`,
        axis: this.missionActionAxis(
          transitionMissionId,
          { type: Missions.ActionType.TRAVEL }
        ),
        baseWeight: Math.max(1, Number(transitionDefinition.priority) || 1),
        transition: true
      };

      const options = [transitionOption];
      assessments.forEach((candidate) => {
        options.push({
          id: `mission-local:${candidate.missionId}`,
          axis: this.missionActionAxis(candidate.missionId, candidate.action),
          baseWeight: Math.max(1, Number(candidate.score) || 1),
          missionId: candidate.missionId
        });
      });

      const selected = BAC.weightedPick(options);
      return selected?.missionId || null;
    }

    ensureMissionTransitionIntent(context = null) {
      const travel = this.primaryEventDrivenTravel();
      if (!travel) return null;

      const unknownTravel = this.isAutonomousUnknownTravel(travel);
      const targetMapId = String(travel.node?.params?.toMapId || "");
      if (!unknownTravel && !targetMapId) return null;

      const key = this.missionReturnIntentKey(travel.missionId);
      const previous = this.memory.getFact?.(key, null);
      const currentMapId = String(this.engine?.currentMapId || "");
      const mission = this.travelMissionDefinition(travel);
      const kind = unknownTravel
        ? "unknown-travel"
        : mission?.navigation?.autonomousKnownReturn === true
          ? "return-base"
          : "map-travel";
      const previousSameContext = Boolean(
        previous?.active === true &&
        String(previous.nodeId || "") === String(travel.node?.id || "") &&
        String(previous.evaluatedMapId || "") === currentMapId &&
        previous.kind === kind
      );

      // Tant que mission, noeud, map et nature du trajet sont inchangés,
      // l'intention persistée reste le résultat canonique. Aucun nouveau
      // contexte ni parcours de topologie n'est nécessaire.
      if (
        previousSameContext &&
        (
          unknownTravel
            ? Boolean(previous.direction && previous.frontierMapId)
            : String(previous.mapId || previous.targetMapId || "") === targetMapId
        )
      ) {
        return previous;
      }

      const travelPlan = unknownTravel
        ? this.missionUnknownTravelPlan(travel)
        : null;
      const direction = unknownTravel
        ? String(travelPlan?.direction || "")
        : null;
      const frontierMapId = unknownTravel
        ? String(travelPlan?.frontierMapId || "")
        : "";
      if (unknownTravel && (!direction || !frontierMapId)) return null;

      const intent = {
        ...(previous && typeof previous === "object" ? previous : {}),
        active: true,
        missionId: travel.missionId,
        nodeId: travel.node?.id || null,
        kind,
        mapId: targetMapId || null,
        targetMapId: targetMapId || null,
        frontierMapId: frontierMapId || null,
        direction,
        evaluatedMapId: currentMapId,
        eligibleLocalMissionIds: [],
        deferMissionId: null,
        decisionResolved: false,
        createdAt: Number(previous?.createdAt) || Date.now(),
        updatedAt: Date.now()
      };

      this.memory.setFact?.(key, intent);
      this.memory.save?.();

      const decisionContext = context || this.bridge.context();
      const eligibleLocalMissionIds =
        this.transitionLocalCandidates(travel.missionId, decisionContext);
      const pendingDecision = {
        ...intent,
        eligibleLocalMissionIds
      };
      this.memory.setFact?.(key, pendingDecision);

      const deferMissionId = this.chooseTransitionDeferralMission(
        travel.missionId,
        eligibleLocalMissionIds,
        decisionContext
      );

      const resolved = {
        ...pendingDecision,
        deferMissionId,
        decisionResolved: true,
        updatedAt: Date.now()
      };
      this.memory.setFact?.(key, resolved);
      this.memory.save?.();
      return resolved;
    }

    ensureMissionReturnIntent(context = this.bridge.context()) {
      const travel = this.primaryEventDrivenTravel();
      if (!this.travelMissionDefinition(travel)?.navigation?.autonomousKnownReturn) return null;
      return this.ensureMissionTransitionIntent(context);
    }

    hasPendingMissionReturn(missionId = this.primaryMissionId) {
      if (!missionId) return false;
      return this.memory.getFact?.(
        this.missionReturnIntentKey(missionId),
        null
      )?.active === true;
    }

    shouldDeferMissionTransition(
      missionId,
      context = this.bridge.context()
    ) {
      const intent = this.memory.getFact?.(
        this.missionReturnIntentKey(missionId),
        null
      );
      const deferMissionId = String(intent?.deferMissionId || "");
      if (!intent?.active || !deferMissionId) return false;
      if (!this.isMissionExclusiveToCurrentMap(deferMissionId)) return false;
      if (this.ensureLifecycle(deferMissionId).status !== "active") return false;

      const tree = this.trees.get(deferMissionId);
      if (
        !tree ||
        tree.root.isComplete ||
        !this.planner.nextAction(tree, context)
      ) {
        const cleared = {
          ...intent,
          deferMissionId: null,
          updatedAt: Date.now()
        };
        this.memory.setFact?.(
          this.missionReturnIntentKey(missionId),
          cleared
        );
        this.memory.save?.();
        return false;
      }
      return true;
    }

    resumeMissionTransitionIntent(context = this.bridge.context()) {
      const travel = this.primaryEventDrivenTravel();
      if (!travel) return false;

      const intent = this.ensureMissionTransitionIntent(context);
      if (!intent?.active) return false;
      if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") {
        return false;
      }
      if (
        this.engine?.transitioning ||
        this.engine?.pendingGate ||
        this.engine?.pendingInteraction ||
        this.engine?.currentRoutine ||
        this.currentAction ||
        this.bridge.isEngineBusy()
      ) return false;
      if (this.shouldDeferMissionTransition(travel.missionId, context)) {
        return false;
      }

      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;

      if (intent.kind === "unknown-travel") {
        const direction = String(intent.direction || "");
        const frontierMapId = String(intent.frontierMapId || currentMapId);
        if (
          !direction ||
          !frontierMapId ||
          typeof this.engine?.handleNavigationSuggestion !== "function"
        ) return false;

        if (frontierMapId !== currentMapId) {
          const route = this.engine?.findKnownRoute?.(currentMapId, frontierMapId);
          if (!Array.isArray(route) || route.length < 2) return false;
          const nextMapId = String(route[1] || "");
          if (!nextMapId) return false;
          this.engine.handleNavigationSuggestion({
            mapId: nextMapId,
            source: "mission",
            missionId: travel.missionId
          });
          return true;
        }

        this.engine.handleNavigationSuggestion({
          discoverUnknown: true,
          direction,
          source: "mission",
          missionId: travel.missionId
        });
        return true;
      }

      const targetMapId = String(intent.targetMapId || intent.mapId || "");
      if (!targetMapId) return false;

      if (currentMapId === targetMapId) {
        if (
          intent.kind === "return-base" &&
          typeof this.engine?.returnToBase === "function"
        ) {
          this.engine.returnToBase();
          return true;
        }
        return false;
      }

      const route = this.engine?.findKnownRoute?.(currentMapId, targetMapId);
      if (!Array.isArray(route) || route.length < 2) return false;

      if (
        intent.kind === "return-base" &&
        route.length === 2 &&
        typeof this.engine?.returnToBase === "function"
      ) {
        this.engine.returnToBase();
        return true;
      }

      const nextMapId = String(route[1] || "");
      if (!nextMapId || typeof this.engine?.handleNavigationSuggestion !== "function") {
        return false;
      }
      this.engine.handleNavigationSuggestion({
        mapId: nextMapId,
        source: "mission"
      });
      return true;
    }

    resumeMissionReturnIntent(context = this.bridge.context()) {
      const travel = this.primaryEventDrivenTravel();
      if (!this.travelMissionDefinition(travel)?.navigation?.autonomousKnownReturn) return false;
      return this.resumeMissionTransitionIntent(context);
    }

    isMissionExclusiveToCurrentMap(missionId) {
      const definition = this.definition(missionId) || {};
      if (definition.instanceScope !== "map") return false;
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;
      const separator = String(missionId || "").indexOf("@");
      const scopedMapId = separator >= 0
        ? String(missionId).slice(separator + 1)
        : String(definition.scopeId || definition.targetMapId || "");
      return scopedMapId === currentMapId;
    }

    shouldDeferMissionReturn(
      missionId,
      context = this.bridge.context()
    ) {
      const definition = this.definition(missionId) || {};
      const policy = definition.returnPolicy || {};
      if (
        policy.mode !== "bac-discretion" ||
        policy.deferForCurrentMapExclusiveMissions !== true
      ) return false;
      return this.shouldDeferMissionTransition(missionId, context);
    }

    travelAllowsSecondaryMission(missionId, context) {
      const travel = this.primaryEventDrivenTravel();
      if (!travel || missionId === travel.missionId) return true;

      const intent = this.memory.getFact?.(
        this.missionReturnIntentKey(travel.missionId),
        null
      );
      if (!intent?.active) {
        const policy = this.travelMissionDefinition(travel)?.returnPolicy || {};
        if (policy.mode !== "bac-discretion") return true;
        return this.isMissionExclusiveToCurrentMap(missionId);
      }

      const eligible = Array.isArray(intent.eligibleLocalMissionIds)
        ? intent.eligibleLocalMissionIds
        : [];
      if (
        intent.decisionResolved !== true &&
        eligible.includes(missionId)
      ) {
        return this.isMissionExclusiveToCurrentMap(missionId);
      }
      return (
        intent.deferMissionId === missionId &&
        eligible.includes(missionId) &&
        this.isMissionExclusiveToCurrentMap(missionId)
      );
    }

    assessMission(missionId, context) {
      const tree = this.trees.get(missionId);
      const definition = this.definition(missionId);
      const lifecycle = this.ensureLifecycle(missionId, "active");
      let action = tree?.root.isComplete ? null : this.planner.nextAction(tree, context);
      if (action && missionId !== this.primaryMissionId && !this.travelAllowsSecondaryMission(missionId, context)) {
        action = null;
      }
      const progress = tree ? this.treeProgress(tree) : 0;
      let score = Number(definition?.priority) || 0;
      const reasons = [];
      if (definition?.passivePriorityAxis) {
        const playerPriority = this.playerPriority(definition.passivePriorityAxis);
        const influence = Math.max(0, playerPriority - 50) * 1.6;
        score += influence;
        if (influence > 0) reasons.push(`curseur ${definition.passivePriorityAxis} à ${Math.round(playerPriority)} %`);
      }
      if (lifecycle.narrativePriority > 0) {
        score += lifecycle.narrativePriority * 2;
        reasons.push("priorité narrative");
      }
      if (lifecycle.urgency > 0) {
        score += lifecycle.urgency * 2;
        reasons.push("urgence");
      }
      if (progress > 0) {
        score += progress * 35;
        reasons.push("progression engagée");
      }
      if (action) {
        score += 45;
        reasons.push("action réalisable");
        if (
          (context.needs?.rest && action.type === Missions.ActionType.REST) ||
          (context.needs?.food && action.type === Missions.ActionType.EAT)
        ) {
          score += 120;
          reasons.push("besoin vital prioritaire");
        }
        const energy = Number(context.energy);
        const costlyTypes = new Set([
          Missions.ActionType.COLLECT,
          Missions.ActionType.EXTRACT,
          Missions.ActionType.BUILD,
          Missions.ActionType.TRAVEL
        ]);
        if (Number.isFinite(energy) && energy < 35 && costlyTypes.has(action.type)) {
          score -= energy < 25 ? 95 : 35;
          reasons.push("coût énergétique défavorable");
        }
      } else {
        score -= 120;
        reasons.push("aucune action réalisable");
      }
      if (missionId === this.primaryMissionId) score += 12;
      return { missionId, score, action, progress, reasons };
    }

    isPlayerSelectedPrimary() {
      if (!this.primaryMissionId || !this.tree || this.tree.root?.isComplete) return false;
      const lifecycle = this.memory.state.missionLifecycle?.[this.primaryMissionId];
      if (lifecycle?.status !== "active") return false;
      const reason = String(lifecycle.selectionReason || this.selectionReason || "");
      return reason === "Priorité suggérée par le joueur.";
    }

    selectBestPrimary(now = performance.now(), force = false) {
      if (this.currentAction || this.bridge.isEngineBusy()) return false;
      if (this.isPlayerSelectedPrimary()) {
        this.selectionReason = "Priorité suggérée par le joueur.";
        return false;
      }
      if (this.hasPendingMissionReturn(this.primaryMissionId)) {
        this.selectionReason =
          "Intention de transition missionnelle persistante ; l’arbitrage local reste borné à la map courante.";
        return false;
      }
      const context = this.bridge.context();
      const candidates = this.activeMissionIds
        .filter((id) => {
          const lifecycle = this.ensureLifecycle(id);
          return lifecycle.status === "active" &&
            lifecycle.autoPrimaryEligible !== false;
        })
        .map((id) => this.assessMission(id, context))
        .sort((left, right) => right.score - left.score);
      const best = candidates[0];
      if (!best) return false;
      const current = candidates.find((candidate) =>
        candidate.missionId === this.primaryMissionId
      );
      if (!force && current && best.score < current.score + 20) return false;
      if (best.missionId === this.primaryMissionId) {
        this.selectionReason = best.reasons.join(", ") || "mission principale conservée";
        return false;
      }
      this.lastPriorityReviewAt = now;
      return this.setPrimaryMission(
        best.missionId,
        false,
        `Priorité automatique : ${best.reasons.join(", ")}.`
      );
    }


    hasActivePrimaryMission() {
      if (!this.primaryMissionId || !this.tree) return false;
      const lifecycle = this.memory.state.missionLifecycle?.[this.primaryMissionId];
      return lifecycle?.status === "active" && !this.tree.root.isComplete;
    }

    hasPrimaryMissionAuthority() {
      return this.hasActivePrimaryMission();
    }

    primaryActionAssessment() {
      if (!this.hasActivePrimaryMission()) return null;
      return this.assessMission(this.primaryMissionId, this.bridge.context());
    }

    hasRunnablePrimaryMission() {
      return Boolean(this.primaryActionAssessment()?.action);
    }

    applyPendingTransitions() {
      if (this.currentAction || this.bridge.isEngineBusy()) return false;
      let changed = false;
      if (this.pendingPauseMissionId) {
        const missionId = this.pendingPauseMissionId;
        this.pendingPauseMissionId = null;
        changed = this.pauseMission(missionId, "Interruption demandée") || changed;
      }
      if (this.pendingPrimaryMissionId) {
        const missionId = this.pendingPrimaryMissionId;
        const reason = this.pendingPrimaryMissionReason || "Priorité choisie explicitement.";
        this.pendingPrimaryMissionId = null;
        this.pendingPrimaryMissionReason = null;
        changed = this.setPrimaryMission(missionId, false, reason) || changed;
      }
      return changed;
    }

    reevaluatePendingActivations() {
      const ready = Object.values(this.memory.state.pendingActivations || {})
        .filter((request) =>
          request.prerequisites.every((id) =>
            this.ensureLifecycle(id).status === "completed"
          )
        )
        .sort((left, right) => {
          const leftOptions = left.options || {};
          const rightOptions = right.options || {};
          const leftDefinition = this.definition(left.missionId) || {};
          const rightDefinition = this.definition(right.missionId) || {};
          const score = (request, options, definition) =>
            (Number(options.narrativePriority) || 0) * 10000 +
            (Number(options.urgency) || 0) * 1000 +
            (Number(definition.priority) || 0) * 10 -
            (Number(request.requestedAt) || 0) / 1e13;
          return score(right, rightOptions, rightDefinition) -
            score(left, leftOptions, leftDefinition);
        });
      const request = ready[0];
      if (!request) return false;
      return this.activateMission(request.missionId, request.options || {});
    }

    notifyMissionEvent(type, detail = {}) {
      const missionId = detail.missionId;
      if (!missionId || !this.definition(missionId)) return false;
      return this.startMission(missionId, {
        primary: detail.primary === true,
        prerequisites: detail.prerequisites || [],
        urgency: detail.urgency,
        narrativePriority: detail.narrativePriority,
        source: detail.source || type || "event",
        reason: detail.reason
      });
    }

    matchesPassiveAction(node, type, detail) {
      if (node.params?.catalogManaged) return false;
      const nodeType = Missions.normalizeActionType(node.type);
      const acquisition = [Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT];
      if (nodeType !== type && !(acquisition.includes(nodeType) && acquisition.includes(type))) {
        return false;
      }
      if (node.params.kind && detail.kind !== node.params.kind) return false;
      if (node.params.subject && detail.subject && detail.subject !== node.params.subject) {
        return false;
      }
      return true;
    }

    progressPassiveMissions(type, detail = {}, excluded = {}) {
      let changed = 0;
      this.trees.forEach((tree, missionId) => {
        if (this.ensureLifecycle(missionId).status !== "active") return;
        let treeChanged = false;
        tree.availableLeaves().forEach((node) => {
          if (missionId === excluded.missionId && node.id === excluded.nodeId) return;
          if (!this.matchesPassiveAction(node, type, detail)) return;
          if (node.increment(Math.max(1, Number(detail.amount) || 1))) {
            changed += 1;
            treeChanged = true;
          }
        });
        tree.refresh();
        if (treeChanged) this.memory.saveTree(tree);
      });
      return changed;
    }

    missionActionAxis(missionId, action) {
      const definition = this.definition(missionId) || {};
      if (definition.passivePriorityAxis) return definition.passivePriorityAxis;
      if (definition.priorityAxis) return definition.priorityAxis;
      const type = action?.type;
      if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) return "collection";
      if ([
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE,
        Missions.ActionType.OBSERVE,
        Missions.ActionType.RESEARCH,
        Missions.ActionType.CRAFT,
        Missions.ActionType.BUILD
      ].includes(type)) return "research";
      if ([Missions.ActionType.EXPLORE_ZONE, Missions.ActionType.TRAVEL].includes(type)) return "exploration";
      if ([Missions.ActionType.REST, Missions.ActionType.EAT].includes(type)) return "survival";
      return "exploration";
    }

    chooseRunnableMissionAction(context) {
      const assessments = this.activeMissionIds
        .filter((id) => this.ensureLifecycle(id).status === "active" && this.trees.has(id))
        .map((id) => this.assessMission(id, context))
        .filter((candidate) => candidate?.action);

      const primary = assessments.find(
        (candidate) => candidate.missionId === this.primaryMissionId
      ) || null;

      const secondaries = assessments
        .filter((candidate) => candidate.missionId !== this.primaryMissionId)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      if (!primary && !secondaries.length) return null;

      const primaryVital = primary && (
        (primary.action.type === Missions.ActionType.REST && context.needs?.rest) ||
        (primary.action.type === Missions.ActionType.EAT && context.needs?.food)
      );
      if (primaryVital) {
        return {
          missionId: primary.missionId,
          action: primary.action,
          primary: true
        };
      }

      const BAC = BF.BAC;
      if (!BAC?.weightedPick) {
        const fallback = primary || secondaries[0];
        return fallback
          ? {
              missionId: fallback.missionId,
              action: fallback.action,
              primary: fallback.missionId === this.primaryMissionId
            }
          : null;
      }

      const options = [];
      if (primary) {
        options.push({
          id: `mission-primary:${primary.missionId}`,
          axis: this.missionActionAxis(primary.missionId, primary.action),
          baseWeight: 100,
          candidate: primary
        });
      }

      if (secondaries.length) {
        const secondaryBudget = primary ? 20 : 100;
        const totalScore = secondaries.reduce(
          (sum, candidate) => sum + Math.max(1, Number(candidate.score) || 1),
          0
        );
        secondaries.forEach((candidate) => {
          options.push({
            id: `mission-secondary:${candidate.missionId}`,
            axis: this.missionActionAxis(candidate.missionId, candidate.action),
            baseWeight:
              secondaryBudget *
              (Math.max(1, Number(candidate.score) || 1) / totalScore),
            candidate
          });
        });
      }

      const selected = BAC.weightedPick(options);
      const candidate = selected?.candidate || primary || secondaries[0];
      return candidate
        ? {
            missionId: candidate.missionId,
            action: candidate.action,
            primary: candidate.missionId === this.primaryMissionId
          }
        : null;
    }

    update(now) {
      if (!this.enabled) return false;
      this.applyPendingTransitions();
      this.ensureMissionTransitionIntent();
      if (now - this.lastPriorityReviewAt > 5000) {
        this.lastPriorityReviewAt = now;
        this.selectBestPrimary(now);
      }

      // mission-action-watchdog-v1
      if (this.currentAction) {
        const actionAge =
          Date.now() - Number(this.currentAction.issuedAt || Date.now());
        const engineIdle =
          !this.bridge.isEngineBusy() &&
          !this.engine.pendingInteraction &&
          !this.engine.currentRoutine &&
          !this.engine.pendingGate &&
          !this.engine.pendingZoneExploration &&
          this.engine.character.root.position.distanceTo(
            this.engine.character.target
          ) < 0.25;

        if (engineIdle && actionAge > 5000) {
          const orphan = this.currentAction;
          this.memory.remember("action-orphaned", {
            ...orphan,
            reason: "engine-idle-with-current-action",
            ageMs: actionAge
          });
          this.currentAction = null;
          this.retryAfter = now + 650;
          this.engine.callbacks?.onAction?.(
            `Mission : action interrompue, nouvelle tentative pour « ${orphan.title} ».`
          );
          this.publish();
        } else {
          return true;
        }
      }

      if (now < this.retryAfter || now - this.lastPlanAt < 1200) return false;
      if (this.bridge.isEngineBusy()) return false;

      this.lastPlanAt = now;
      if (this.resumeMissionTransitionIntent()) {
        this.retryAfter = now + 1200;
        return true;
      }

      const selected = this.chooseRunnableMissionAction(this.bridge.context());
      if (!selected?.action) {
        this.retryAfter = now + 5000;
        return false;
      }

      const action = {
        ...selected.action,
        missionId: selected.missionId,
        isSecondary: !selected.primary
      };
      const tree = this.trees.get(selected.missionId);
      if (!tree || !this.bridge.execute(action, now)) {
        this.retryAfter = now + 4000;
        return false;
      }

      this.currentAction = action;
      const node = tree.find(action.nodeId);
      if (node && node.status === Missions.MissionStatus.AVAILABLE) {
        node.status = Missions.MissionStatus.ACTIVE;
        if (!node.startedAt) node.startedAt = Date.now();
      }

      this.engine.callbacks.onAction(
        selected.primary
          ? `Mission : ${action.title}.`
          : `Mission secondaire : ${action.title}.`
      );
      this.memory.remember("action-started", action);
      this.memory.saveTree(tree);
      this.publish();
      return true;
    }

    notifyActionCompleted(type, detail = {}, options = {}) {
      const passive = options.passive !== false;
      if (!this.currentAction || this.currentAction.type !== type) {
        const changed = passive ? this.progressPassiveMissions(type, detail) : 0;
        if (changed) {
          this.syncLifecycleFromTrees();
          this.reevaluatePendingActivations();
          this.ensureMissionTransitionIntent();
          this.catalogController?.schedule();
          this.publish();
        }
        return changed > 0;
      }
      const completedAction = this.currentAction;
      const missionId = completedAction.missionId || this.primaryMissionId;
      const actionTree = this.trees.get(missionId) || this.tree;
      if (!actionTree) return false;
      if (!this.planner.applyCompletion(actionTree, completedAction, detail)) {
        return false;
      }
      this.memory.remember(type, detail);
      this.memory.remember("action-completed", completedAction);
      this.currentAction = null;
      this.retryAfter = performance.now() + 650;
      this.memory.saveTree(actionTree);
      if (passive) {
        this.progressPassiveMissions(type, detail, {
          missionId,
          nodeId: completedAction.nodeId
        });
      }
      this.syncLifecycleFromTrees();
      this.ensureMissionTransitionIntent();
      this.catalogController?.schedule();
      this.publish();
      if (actionTree.root.isComplete) {
        this.reevaluatePendingActivations();
        this.engine.callbacks.onAction(
          `Mission accomplie : ${actionTree.title}.`
        );
        this.engine.callbacks.onStatus(
          `« ${actionTree.title} » terminée. BlueFox réévalue uniquement les projets déjà actifs.`
        );
      }
      return true;
    }

    syncLifecycleFromTrees() {
      let changed = false;
      this.trees.forEach((tree, missionId) => {
        if (!tree.root.isComplete) return;
        const lifecycle = this.ensureLifecycle(missionId);
        const gate = BF.bibleRuntime?.completionGateState?.(missionId) || null;

        if (gate?.managed === true && gate.canFinalize !== true) {
          if (
            lifecycle.status !== "active" ||
            lifecycle.waitingForBibleGate !== true ||
            lifecycle.waitingForBibleGateMessage !== gate.message
          ) {
            changed = true;
          }
          lifecycle.status = "active";
          lifecycle.completedAt = 0;
          lifecycle.waitingForBibleGate = true;
          lifecycle.waitingForBibleGateMessage = gate.message ||
            "Une validation dans le monde est encore requise.";
          if (!this.activeMissionIds.includes(missionId)) {
            this.activeMissionIds.push(missionId);
          }
          return;
        }

        const wasWaitingForBibleGate = lifecycle.waitingForBibleGate === true;
        if (lifecycle.status !== "completed") changed = true;
        lifecycle.status = "completed";
        lifecycle.completedAt = wasWaitingForBibleGate
          ? Date.now()
          : (tree.root.completedAt || Date.now());
        delete lifecycle.waitingForBibleGate;
        delete lifecycle.waitingForBibleGateMessage;
        this.activeMissionIds = this.activeMissionIds.filter(
          (id) => id !== missionId
        );
      });
      const primaryLifecycle = this.primaryMissionId
        ? this.memory.state.missionLifecycle?.[this.primaryMissionId]
        : null;
      if (
        !this.primaryMissionId ||
        primaryLifecycle?.status === "completed" ||
        !this.activeMissionIds.includes(this.primaryMissionId)
      ) {
        this.primaryMissionId = "";
        this.activeMissionId = "";
        this.tree = null;
        this.selectionReason = "Mission principale terminée ; réévaluation des missions actives.";
        this.syncMissionSelection();
        this.selectBestPrimary(performance.now(), true);
      } else {
        this.syncMissionSelection();
      }
      if (changed) this.memory.save();
      return changed;
    }

    cancelCurrentAction(reason = "cancelled") {
      if (!this.currentAction) return;
      const cancelledAction = this.currentAction;
      this.engine?.cancelMissionInteraction?.(
        cancelledAction,
        reason
      );
      this.memory.remember("action-cancelled", {
        ...cancelledAction,
        reason
      });
      this.currentAction = null;
      this.retryAfter = performance.now() + 1800;
      this.publish();
    }

    publish() {
      const detail = this.getState();
      BF.missionState = detail;
      global.dispatchEvent(new CustomEvent("bluefox:mission-state", { detail }));
    }

    displayTreeSnapshot(tree) {
      if (!tree) return null;
      const snapshot = tree.toJSON();
      const normalizeProgress = (node) => {
        if (node?.params?.metric === "surfacePercent") {
          node.progress = Math.floor(Math.max(0, Number(node.progress) || 0));
        }
        (node?.children || []).forEach(normalizeProgress);
      };
      normalizeProgress(snapshot.root);
      return snapshot;
    }

    getState() {
      const missionIds = [...(this.activeMissionIds || [])]
        .filter((id) => this.trees?.has(id));
      const missionStateIds = [...this.trees.keys()]
        .filter((id) => ["active", "completed"].includes(this.ensureLifecycle(id).status))
        .filter((id) => {
          const definition = this.definition(id);
          if (definition?.localVisibility !== "current-map") return true;
          return String(definition.scopeId || "") ===
            String(this.engine?.currentMapId || "");
        });
      const missionStates = missionStateIds
        .sort((left, right) =>
          Number(right === this.primaryMissionId) -
          Number(left === this.primaryMissionId)
        )
        .map((id) => {
          const tree = this.trees.get(id);
          return {
            missionId: id,
            title: tree.title,
            description: tree.description,
            status: tree.root.status,
            lifecycleStatus: this.ensureLifecycle(id).status,
            completedAt: this.ensureLifecycle(id).completedAt || 0,
            progress: this.treeProgress(tree),
            journalIntro: this.definition(id)?.journalIntro ||
              `J’ai ouvert cette mission parce que ${this.ensureLifecycle(id).discoveryReason || "mes observations indiquent qu’elle est désormais réalisable"}.`,
            discoveryReason: this.ensureLifecycle(id).discoveryReason,
            isPrimary: id === this.primaryMissionId,
            tree: this.displayTreeSnapshot(tree)
          };
        });

      if (!this.tree && !missionStates.length) {
        return {
          version: "M2",
          primaryMissionId: "",
          activeMissionIds: [],
          selectionReason: "Aucune mission active.",
          pendingPrimaryMissionId: null,
          pendingPrimaryMissionTitle: "",
          missionId: "",
          title: "",
          description: "",
          status: "idle",
          currentAction: null,
          available: [],
          tree: null,
          missions: [],
          catalog: [],
          inventory: { ...(BF.getProgressionState?.().inventory || {}) }
        };
      }

      const displayTree = this.tree || this.trees.get(missionIds[0]) || null;
      return {
        version: "M2",
        primaryMissionId: this.primaryMissionId,
        activeMissionIds: [...this.activeMissionIds],
        selectionReason: this.selectionReason,
        pendingPrimaryMissionId: this.pendingPrimaryMissionId,
        pendingPrimaryMissionTitle: this.pendingPrimaryMissionId
          ? this.trees.get(this.pendingPrimaryMissionId)?.title || ""
          : "",
        missionId: displayTree?.id || "",
        title: displayTree?.title || "",
        description: displayTree?.description || "",
        status: displayTree?.root?.status || "idle",
        currentAction: this.currentAction
          ? { ...this.currentAction, params: { ...this.currentAction.params } }
          : null,
        available: displayTree
          ? displayTree.availableLeaves().map((node) => ({
              id: node.id,
              title: node.title,
              type: node.type,
              progress: node.progress,
              target: node.target
            }))
          : [],
        tree: this.displayTreeSnapshot(displayTree),
        missions: missionStates,
        catalog: Object.keys(Missions.definitions)
          .filter((id) => id !== "foundation")
          .filter((id) => Missions.definitions[id].instanceScope !== "map")
          .filter((id) => Object.prototype.hasOwnProperty.call(
            this.memory.state.missionLifecycle || {},
            id
          ))
          .filter((id) => ["available", "active", "paused", "completed"].includes(
            this.memory.state.missionLifecycle[id]?.status
          ))
          .map((id) => ({
            missionId: id,
            title: Missions.definitions[id].title,
            status: this.memory.state.missionLifecycle[id].status,
            scope: Missions.definitions[id].scope ||
              Missions.definitions[id].instanceScope || "global",
            progress: this.trees.has(id)
              ? this.treeProgress(this.trees.get(id))
              : this.memory.state.missionLifecycle[id].status === "completed"
                ? 1
                : 0,
            journalIntro: Missions.definitions[id].journalIntro ||
              `Cette mission est apparue lorsque ma progression a atteint un nouveau seuil. Je veux maintenant vérifier méthodiquement ce que ces découvertes rendent possible.`,
            discoveryReason: this.memory.state.missionLifecycle[id].discoveryReason,
            waitingFor: [...(this.memory.state.missionLifecycle[id].waitingFor || [])]
          })),
        inventory: {
          ...(BF.getProgressionState?.().inventory || {})
        }
      };
    }

    dispose() {
      this.enabled = false;
      global.removeEventListener("bluefox:mission-trigger", this.onMissionTrigger);
      this.catalogController?.dispose();
      this.trees.forEach((tree) => this.memory.saveTree(tree));
    }

    static create(options) {
      return new MissionManager(options);
    }
  }

  Missions.MissionManager = MissionManager;
})(window);
