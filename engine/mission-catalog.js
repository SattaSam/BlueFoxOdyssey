(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  const VERSION = "npc-civilization-r2";
  const HONORED_ACCEPTED_THRESHOLD = 3;
  const CIVILIZATIONS = Object.freeze({
    translucent: Object.freeze({
      id: "translucent",
      cuoType: "npc_translucent",
      rewardInventoryKey: "stellar_iridium",
      rewardQuantity: 1,
      glyph: "⋔ ⌁ ∆ ⟟"
    }),
    rocky: Object.freeze({
      id: "rocky",
      cuoType: "npc_rocky",
      rewardInventoryKey: "resonant_basalt",
      rewardQuantity: 2,
      glyph: "⟁ ⌬ ⋰ ⟟"
    })
  });
  const SERVICE_KINDS = Object.freeze(["collect", "recon", "observe"]);
  const SERVICE_IDS = Object.freeze(Object.fromEntries(
    Object.keys(CIVILIZATIONS).map((civilizationId) => [
      civilizationId,
      Object.freeze(Object.fromEntries(SERVICE_KINDS.map((kind) => [
        kind,
        `NPC-SERVICE-${kind.toUpperCase()}@${civilizationId}`
      ])))
    ])
  ));

  const serviceDefinition = (civilization, kind) => {
    const id = SERVICE_IDS[civilization.id][kind];
    const common = {
      id,
      title: {
        collect: "Service de collecte",
        recon: "Reconnaissance locale",
        observe: "Observation demandée"
      }[kind],
      description: {
        collect: "Rassembler quelques fibres demandées par la civilisation rencontrée.",
        recon: "Reconnaître deux éléments de flore distincts pour confirmer l'état des environs.",
        observe: "Observer un élément minéral intéressant pour la civilisation rencontrée."
      }[kind],
      priority: 28,
      repeatable: true,
      passivePriorityAxis: "civilization",
      npcService: {
        civilizationId: civilization.id,
        kind,
        rewardInventoryKey: civilization.rewardInventoryKey,
        rewardQuantity: civilization.rewardQuantity
      }
    };
    const leaf = kind === "collect"
      ? {
          id: `${id}:collect`,
          title: "Rassembler 5 fibres",
          type: "collect",
          target: 5,
          params: { kind: "fiber" }
        }
      : kind === "recon"
        ? {
            id: `${id}:recon`,
            title: "Reconnaître deux éléments de flore distincts",
            type: "observe",
            target: 2,
            params: { subject: "flora", distinctBy: "instanceId" }
          }
        : {
            id: `${id}:observe`,
            title: "Observer un élément minéral",
            type: "observe",
            target: 1,
            params: { subject: "mineral" }
          };
    return Object.freeze({
      ...common,
      root: Object.freeze({
        id: `${id}:root`,
        title: common.title,
        type: "objective",
        target: 1,
        children: Object.freeze([Object.freeze(leaf)])
      })
    });
  };

  const SERVICE_DEFINITIONS = Object.freeze(
    Object.values(CIVILIZATIONS).flatMap((civilization) =>
      SERVICE_KINDS.map((kind) => serviceDefinition(civilization, kind))
    )
  );

  // mission-catalog.js est précisément le point d'enregistrement prévu pour
  // les définitions moteur hors Bible. L'enregistrement a lieu avant la
  // construction de MissionManager afin que reload/restauration restent sûrs.
  BF.registerMissionDefinitions?.(SERVICE_DEFINITIONS);

  const relationKey = (civilizationId) =>
    `civilization:relation:${String(civilizationId || "").trim().toLowerCase()}`;
  const serviceRewardReceipt = (missionId, completedAt) =>
    `npc-service-reward:${missionId}:${Number(completedAt) || 0}`;

  class MissionCatalogController {
    constructor(manager) {
      this.manager = manager;
      this.disposed = false;
      this.unsubscribeObjectEvents = BF.ObjectEvents?.subscribe?.((event) =>
        this.onObjectEvent(event)
      ) || null;
      this.onMissionState = () => this.reconcileServiceRewards();
      global.addEventListener?.("bluefox:mission-state", this.onMissionState);
      this.reconcileServiceRewards();
    }

    getRelation(civilizationId) {
      const id = String(civilizationId || "").trim().toLowerCase();
      const saved = this.manager?.memory?.getFact?.(relationKey(id), null);
      return Object.freeze({
        civilizationId: id,
        rank: String(saved?.rank || "neutral").toLowerCase(),
        acceptedMissions: Math.max(0, Number(saved?.acceptedMissions) || 0),
        completedMissions: Math.max(0, Number(saved?.completedMissions) || 0),
        score: Number.isFinite(Number(saved?.score)) ? Number(saved.score) : 0,
        acceptedMissionIds: Array.isArray(saved?.acceptedMissionIds)
          ? [...saved.acceptedMissionIds]
          : [],
        updatedAt: Number(saved?.updatedAt) || 0
      });
    }

    setRelation(civilizationId, rank, detail = {}) {
      const id = String(civilizationId || "").trim().toLowerCase();
      if (!CIVILIZATIONS[id]) return false;
      const allowed = new Set(["hostile", "wary", "neutral", "friendly", "honored"]);
      const nextRank = String(rank || "").toLowerCase();
      if (!allowed.has(nextRank)) return false;
      const previous = this.getRelation(id);
      const next = {
        ...previous,
        ...detail,
        civilizationId: id,
        rank: nextRank,
        acceptedMissions: Math.max(0, Number(detail.acceptedMissions ?? previous.acceptedMissions) || 0),
        completedMissions: Math.max(0, Number(detail.completedMissions ?? previous.completedMissions) || 0),
        score: Number.isFinite(Number(detail.score ?? previous.score))
          ? Number(detail.score ?? previous.score)
          : 0,
        acceptedMissionIds: Array.isArray(detail.acceptedMissionIds)
          ? [...detail.acceptedMissionIds]
          : [...previous.acceptedMissionIds],
        updatedAt: Date.now()
      };
      this.manager?.memory?.setFact?.(relationKey(id), next);
      this.manager?.memory?.save?.();
      if (previous.rank !== next.rank) {
        global.dispatchEvent?.(new CustomEvent("bluefox:civilization-rank-changed", {
          detail: { civilizationId: id, previous: previous.rank, rank: next.rank }
        }));
        if (next.rank === "honored") {
          global.dispatchEvent?.(new CustomEvent("bluefox:civilization-special-eligible", {
            detail: { civilizationId: id, rank: next.rank }
          }));
        }
      }
      return Object.freeze({ ...next });
    }

    noteAccepted(civilizationId, missionId) {
      const previous = this.getRelation(civilizationId);
      const acceptedMissions = previous.acceptedMissions + 1;
      const acceptedMissionIds = [...previous.acceptedMissionIds, String(missionId || "")].slice(-24);
      const nextRank = acceptedMissions >= HONORED_ACCEPTED_THRESHOLD &&
        ["friendly", "honored"].includes(previous.rank)
        ? "honored"
        : previous.rank;
      return this.setRelation(civilizationId, nextRank, {
        acceptedMissions,
        score: previous.score + 1,
        acceptedMissionIds
      });
    }

    npcRoot(event) {
      const type = String(event?.detail?.cuoType || "");
      const roots = BF.NpcRuntime?.list?.(type) || [];
      const instanceId = String(event?.instanceId || "");
      return roots.find((root) => String(root?.userData?.instanceId || "") === instanceId) ||
        roots[roots.length - 1] || null;
    }

    speakFor(event, text) {
      const root = this.npcRoot(event);
      if (!root) return false;
      return BF.NpcRuntime?.speak?.(root, text, { duration: 4.2 }) === true;
    }

    activeService(civilizationId) {
      const ids = Object.values(SERVICE_IDS[civilizationId] || {});
      return ids.find((id) =>
        this.manager?.memory?.state?.missionLifecycle?.[id]?.status === "active"
      ) || null;
    }

    chooseService(civilizationId) {
      const relation = this.getRelation(civilizationId);
      const order = SERVICE_KINDS.map((_, index) =>
        SERVICE_KINDS[(relation.acceptedMissions + index) % SERVICE_KINDS.length]
      );
      for (const kind of order) {
        const missionId = SERVICE_IDS[civilizationId]?.[kind];
        if (!missionId || !this.manager?.definition?.(missionId)) continue;
        const lifecycle = this.manager.memory?.state?.missionLifecycle?.[missionId];
        if (lifecycle?.status === "active") continue;
        if (lifecycle?.status === "completed") {
          this.manager.rearmRepeatableMission?.(missionId, {
            source: "npc-service",
            reason: "Nouveau service proposé par la civilisation."
          });
        }
        const refreshed = this.manager.memory?.state?.missionLifecycle?.[missionId];
        if (refreshed?.status === "failed" || refreshed?.status === "paused") continue;
        return { missionId, kind };
      }
      return null;
    }

    offerService(event, civilizationId) {
      const civilization = CIVILIZATIONS[civilizationId];
      const relation = this.getRelation(civilizationId);
      if (!civilization) return false;
      if (!["friendly", "honored"].includes(relation.rank)) {
        this.speakFor(event, `${civilization.glyph} … contact … ⧖`);
        return false;
      }
      const active = this.activeService(civilizationId);
      if (active) {
        this.speakFor(event, `${civilization.glyph} … mission … en cours …`);
        return false;
      }
      const offer = this.chooseService(civilizationId);
      if (!offer) {
        this.speakFor(event, `${civilization.glyph} … échange … bientôt …`);
        return false;
      }
      const started = this.manager.startMission?.(offer.missionId, {
        primary: false,
        autoPrimaryEligible: true,
        source: "npc-contact",
        reason: `Mission courte proposée par la civilisation ${civilizationId}.`
      }) === true;
      if (!started) return false;
      const updated = this.noteAccepted(civilizationId, offer.missionId);
      const hint = {
        collect: "mission … fibres … 5",
        recon: "mission … flore … 2",
        observe: "mission … minerai … observer"
      }[offer.kind];
      this.speakFor(event, `${civilization.glyph} … ${hint} … ⧖`);
      global.dispatchEvent?.(new CustomEvent("bluefox:npc-mission-offered", {
        detail: {
          civilizationId,
          missionId: offer.missionId,
          kind: offer.kind,
          acceptedMissions: updated?.acceptedMissions || 0,
          rank: updated?.rank || relation.rank
        }
      }));
      return true;
    }

    onObjectEvent(event) {
      if (this.disposed) return false;
      const expected = String(BF.ObjectEvents?.types?.NPC_CONTACTED || "NPC_CONTACTED");
      if (String(event?.type || "") !== expected) return false;
      if (String(event?.detail?.interactionSource || "manual") !== "manual") return false;
      const civilizationId = String(event?.detail?.civilizationId || "").toLowerCase();
      return this.offerService(event, civilizationId);
    }

    reconcileServiceRewards() {
      let changed = false;
      SERVICE_DEFINITIONS.forEach((definition) => {
        const lifecycle = this.manager?.memory?.state?.missionLifecycle?.[definition.id];
        if (lifecycle?.status !== "completed") return;
        const service = definition.npcService;
        const receipt = serviceRewardReceipt(definition.id, lifecycle.completedAt);
        if (this.manager.memory?.hasEffectReceipt?.(receipt)) return;
        const granted = BF.grantInventory?.(
          service.rewardInventoryKey,
          service.rewardQuantity,
          {
            source: "npc-service-reward",
            missionId: definition.id,
            civilizationId: service.civilizationId
          }
        );
        if (!granted) return;
        const relation = this.getRelation(service.civilizationId);
        this.setRelation(service.civilizationId, relation.rank, {
          completedMissions: relation.completedMissions + 1
        });
        this.manager.memory?.recordEffectReceipt?.(receipt, {
          missionId: definition.id,
          civilizationId: service.civilizationId,
          inventoryKey: service.rewardInventoryKey,
          quantity: service.rewardQuantity
        });
        changed = true;
      });
      if (changed) this.manager?.memory?.save?.();
      return changed;
    }

    schedule() {
      return this.reconcileServiceRewards();
    }

    evaluate() {
      return this.reconcileServiceRewards();
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.unsubscribeObjectEvents?.();
      this.unsubscribeObjectEvents = null;
      global.removeEventListener?.("bluefox:mission-state", this.onMissionState);
    }
  }

  Missions.MissionCatalogController = MissionCatalogController;
  BF.CivilizationRelationConfig = Object.freeze({
    version: VERSION,
    honoredAcceptedThreshold: HONORED_ACCEPTED_THRESHOLD,
    civilizations: Object.freeze(Object.keys(CIVILIZATIONS)),
    serviceMissionIds: SERVICE_IDS
  });
  BF.getCivilizationRelation = (civilizationId) =>
    BF.currentEngine?.missionManager?.catalogController?.getRelation?.(civilizationId) || null;
  BF.setCivilizationRelation = (civilizationId, rank, detail = {}) =>
    BF.currentEngine?.missionManager?.catalogController?.setRelation?.(
      civilizationId,
      rank,
      detail
    ) || false;
  BF.getMissionCatalogState = () => Object.freeze({
    version: VERSION,
    definitionCount: Object.keys(Missions.definitions || {}).length,
    definitions: Object.keys(Missions.definitions || {}),
    npcServiceDefinitions: SERVICE_DEFINITIONS.map((definition) => definition.id)
  });
})(window);
