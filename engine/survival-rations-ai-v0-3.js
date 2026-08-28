(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "survival-rations-ai-v0.3";
  const RECIPE_ID = "ration-basic-v2";

  const POLICY = Object.freeze({
    criticalMax: 3,
    lowMax: 11,
    acceptableMax: 25,
    targetMin: 12,
    targetComfort: 25,
    offlineCollectionIntervalMs:
      20 * 60 * 1000,
    offlineMaxCollections: 12,
    offlinePreferredRestGainPerHour: 6
  });

  const rationCount = () =>
    Number(
      BF.Rations?.snapshot?.().rations
    ) || 0;

  const profile = () => {
    const count = rationCount();
    if (count <= POLICY.criticalMax) {
      return {
        level: "critical",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.lowMax) {
      return {
        level: "low",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.acceptableMax) {
      return {
        level: "acceptable",
        shouldCollect: false,
        shouldCraft: false,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    return {
      level: "comfortable",
      shouldCollect: false,
      shouldCraft: false,
      targetMin: POLICY.targetMin,
      targetComfort:
        POLICY.targetComfort
    };
  };

  const reward = () =>
    BF.Research?.get?.(RECIPE_ID) || null;

  const requirements = () =>
    Array.isArray(reward()?.requirements)
      ? reward().requirements
      : [];

  const ingredientKeys = () =>
    requirements()
      .map(
        (entry) =>
          entry.inventoryKey ||
          entry.resource
      )
      .filter(Boolean);

  const recipeUnlocked = () =>
    BF.Research?.isUnlocked?.(
      RECIPE_ID
    ) === true;

  const autoCraftEnabled = () =>
    reward()?.autoCraft === true ||
    BF.isTutorialSurvivalCapabilityUnlocked?.("ration-craft") === true;

  const campAccessible = () =>
    BF.canAccessCampInventory?.() === true;

  const missionRationCraftRemaining = (engine) => {
    const manager = engine?.missionManager;
    const missionId = String(manager?.primaryMissionId || "");
    const mission = manager?.definition?.(missionId);
    if (!missionId || mission?.allowsAutonomousRationCraft !== true) return 0;
    const counter = Array.isArray(mission?.runtimeCounters)
      ? mission.runtimeCounters.find((entry) =>
          entry?.source === "rations.craftedTotal" && entry?.slot
        )
      : null;
    if (!counter?.slot) return 0;
    const node = manager?.trees?.get?.(missionId)?.find?.(
      `${missionId}:${counter.slot}`
    );
    if (!node || node.isComplete) return 0;
    return Math.max(
      0,
      (Number(node.target) || 0) - (Number(node.progress) || 0)
    );
  };


  const availableFor = (key) =>
    BF.progression
      ?.availableInventory?.([key]) || 0;

  const craftableCount = (
    limit = Infinity,
    options = {}
  ) => {
    if (!recipeUnlocked()) return 0;
    if (
      !options.ignoreShelter &&
      !campAccessible()
    ) {
      return 0;
    }

    const reqs = requirements();
    if (!reqs.length) return 0;

    const capacity = reqs.reduce(
      (maxCount, entry) => {
        const key =
          entry.inventoryKey ||
          entry.resource;
        const quantity = Math.max(
          1,
          Number(entry.quantity) || 1
        );
        if (!key) return 0;
        return Math.min(
          maxCount,
          Math.floor(
            availableFor(key) / quantity
          )
        );
      },
      Number.isFinite(Number(limit))
        ? Math.max(
            0,
            Math.floor(Number(limit))
          )
        : Number.MAX_SAFE_INTEGER
    );

    return Math.max(0, capacity);
  };

  const autonomyCandidate = (engine, now = performance.now()) => {
    if (!engine || !recipeUnlocked() || !autoCraftEnabled() || !campAccessible()) {
      return null;
    }

    const currentProfile = profile();
    const manager = engine.missionManager;
    const primaryMission = manager?.definition?.(manager?.primaryMissionId);
    const missionAllowsRationCraft =
      primaryMission?.allowsAutonomousRationCraft === true &&
      BF.isTutorialSurvivalCapabilityUnlocked?.("ration-craft") === true;
    const missionCraftRemaining = missionAllowsRationCraft
      ? missionRationCraftRemaining(engine)
      : 0;

    if (
      manager?.hasPrimaryMissionAuthority?.() === true &&
      !missionAllowsRationCraft
    ) {
      return null;
    }

    const survivalMissing = Math.max(
      0,
      currentProfile.targetMin - rationCount()
    );
    const capacityRemaining = Math.max(
      0,
      (
        Number(BF.Rations?.maxRations) ||
        Number(BF.Rations?.snapshot?.().maxRations) ||
        0
      ) - rationCount()
    );
    const missing = Math.min(
      Math.max(survivalMissing, missionCraftRemaining),
      capacityRemaining
    );
    const possible = craftableCount(missing);

    if (
      possible <= 0 ||
      !(currentProfile.shouldCraft || missionCraftRemaining > 0)
    ) {
      return null;
    }

    return {
      id: "survival-ration-craft",
      axis: "survival",
      baseWeight:
        missionCraftRemaining > 0
          ? 48
          : currentProfile.level === "critical"
            ? 52
            : 34,
      available: true,
      allowDuringPrimaryMission: missionAllowsRationCraft,
      execute: () => {
        const crafted =
          BF.Research?.craft?.(
            RECIPE_ID,
            possible,
            {
              automatic: true,
              source: "bac-survival"
            }
          ) || 0;

        engine.__lastRationAutonomyDecision = {
          at: Date.now(),
          level: currentProfile.level || null,
          shouldCraft: true,
          requested: possible,
          crafted,
          directOverride: false,
          source: "bac-candidate"
        };

        if (crafted > 0) {
          engine.callbacks?.onStatus?.(
            `BlueFox profite du camp pour préparer ${crafted} ration${crafted > 1 ? "s" : ""}.`
          );
          return true;
        }
        return false;
      }
    };
  };

  BF.RationPolicy = Object.freeze({
    recipeId: RECIPE_ID,
    profile,
    ingredientKeys,
    recipeUnlocked,
    autoCraftEnabled,
    craftableCount,
    campAccessible,
    autonomyCandidate,
    policy: POLICY
  });

  const objectInventoryKey = (
    object
  ) => {
    const data = object?.userData || {};
    const definition =
      data.functional ||
      BF.ObjectLibrary?.get?.(
        data.libraryType
      ) ||
      BF.ObjectLibrary?.get?.(
        data.kind
      ) ||
      {};

    return (
      definition?.resource
        ?.inventoryKey ||
      data.inventoryKey ||
      null
    );
  };

  const isFoodFlora = (object) =>
    ingredientKeys().includes(
      objectInventoryKey(object)
    );

  const targetPosition = (object) =>
    object?.userData?.worldAnchor
      ?.position ||
    object?.position ||
    null;

  const nearest = (
    engine,
    objects
  ) => {
    if (!objects?.length) return null;

    if (
      typeof engine.chooseBACTarget ===
      "function"
    ) {
      return (
        engine.chooseBACTarget(
          objects,
          "survival"
        ) || null
      );
    }

    if (
      typeof engine
        .pickNearestInteractable ===
      "function"
    ) {
      return (
        engine.pickNearestInteractable(
          objects
        ) || null
      );
    }

    const origin =
      engine.character?.root?.position;
    if (!origin) return objects[0] || null;

    return [...objects].sort(
      (left, right) => {
        const lp =
          targetPosition(left);
        const rp =
          targetPosition(right);
        const ld = lp
          ? origin.distanceTo(lp)
          : Infinity;
        const rd = rp
          ? origin.distanceTo(rp)
          : Infinity;
        return ld - rd;
      }
    )[0] || null;
  };

  const install = () => {
    const engine = BF.currentEngine;
    if (!engine) return false;
    engine.__rationAiVersion = VERSION;
    engine.__autonomyBeforeRationAI = null;
    return true;
  };

  const emitOfflineResource = (
    inventoryKey,
    index,
    mapId
  ) => {
    const type =
      BF.ObjectEvents?.types
        ?.RESOURCE_COLLECTED ||
      "resource_collected";

    BF.progression?.consume?.({
      id:
        `offline-ration-${Date.now()}-${index}-${inventoryKey}`,
      type,
      quantity: 1,
      family: inventoryKey,
      inventoryKey,
      mapId: mapId || "crystal",
      objectId:
        `offline-flora-${inventoryKey}`,
      instanceId:
        `offline-${mapId || "crystal"}-${inventoryKey}-${Date.now()}-${index}`,
      detail: {
        offline: true,
        inventoryKey,
        kind: inventoryKey,
        source:
          "bac-survival-rations"
      },
      at: Date.now()
    });
  };

  const offlineIngredientCycle =
    () => {
      const cycle = [];
      requirements().forEach(
        (entry) => {
          const key =
            entry.inventoryKey ||
            entry.resource;
          const quantity = Math.max(
            1,
            Number(entry.quantity) || 1
          );
          for (
            let i = 0;
            i < quantity;
            i += 1
          ) {
            cycle.push(key);
          }
        }
      );
      return cycle.filter(Boolean);
    };

  const processOffline = (
    detail = {}
  ) => {
    const durationMs = Math.max(
      0,
      Number(detail.durationMs) || 0
    );
    if (!durationMs) return;

    const survival = BF.survival;
    if (survival?.state) {
      survival.state.rest = Math.max(
        0,
        Math.min(
          100,
          survival.state.rest +
            (
              durationMs / 3600000
            ) *
              POLICY
                .offlinePreferredRestGainPerHour
        )
      );
    }

    if (recipeUnlocked()) {
      const currentProfile = profile();
      const cycle =
        offlineIngredientCycle();

      if (
        currentProfile.shouldCollect &&
        cycle.length
      ) {
        const budget = Math.min(
          POLICY.offlineMaxCollections,
          Math.max(
            0,
            Math.floor(
              durationMs /
                POLICY
                  .offlineCollectionIntervalMs
            )
          )
        );

        for (
          let i = 0;
          i < budget;
          i += 1
        ) {
          emitOfflineResource(
            cycle[i % cycle.length],
            i,
            detail.mapId
          );
        }
      }

      if (
        currentProfile.shouldCraft &&
        autoCraftEnabled()
      ) {
        const missing = Math.max(
          0,
          currentProfile.targetMin -
            rationCount()
        );
        const possible =
          craftableCount(
            missing,
            { ignoreShelter: true }
          );

        if (possible > 0) {
          BF.Research?.craft?.(
            RECIPE_ID,
            possible,
            {
              automatic: true,
              source:
                "offline-survival",
              ignoreShelter: true
            }
          );
        }
      }
    }

    if (survival?.state) {
      // Consommation automatique suspendue jusqu’au futur jalon T12.
      survival.save?.();
    }
  };

  const connect = () => {
    if (install()) return;

    let attempts = 0;
    const timer =
      global.setInterval(() => {
        attempts += 1;
        if (
          install() ||
          attempts >= 120
        ) {
          global.clearInterval(timer);
        }
      }, 250);
  };

  BF.reconnectRationAI = install;

  global.addEventListener(
    "bluefox:scene-images",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:map-transition-completed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:rations-changed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:research-unlocked",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:offline-progress",
    (event) =>
      processOffline(
        event.detail || {}
      )
  );

  connect();
})(window);
