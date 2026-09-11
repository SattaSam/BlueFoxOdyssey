(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.2] ObjectLibrary doit être chargé avant le runtime PNJ.");
    return;
  }

  const VERSION = "P2.2.2-r2-npc-r1";
  const NPC_TYPES = new Set(["npc_translucent", "npc_rocky"]);
  const ALLOWED_STATES = new Set(["rest", "observation", "curiosity", "vigilance", "movement", "interaction", "dialogue", "flee", "calm"]);
  const registry = new Set();
  const states = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root ||
    null;

  const distanceToPlayer = (root) => {
    const player = playerRoot();
    if (!player) return Infinity;
    return Math.hypot(
      Number(player.position?.x || 0) - Number(root.position?.x || 0),
      Number(player.position?.z || 0) - Number(root.position?.z || 0)
    );
  };

  const collectNamed = (root, name) => {
    const values = [];
    root.traverse?.((child) => {
      if (child.name === name) values.push(child);
    });
    return values;
  };

  const materialSnapshot = (materials) => materials.map((material) => ({
    material,
    emissiveIntensity: Number(material?.emissiveIntensity || 0),
    opacity: Number(material?.opacity ?? 1)
  }));

  const objectSnapshot = (object) => ({
    object,
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });

  const rootEvent = (root, eventName, detail) => {
    try {
      root.dispatchEvent?.({ type: eventName, detail });
      global.dispatchEvent?.(new CustomEvent(eventName, { detail: { root, ...detail } }));
    } catch {
      // Une animation ne doit jamais interrompre la boucle du jeu.
    }
  };

  const capture = (root, type) => {
    const named = {
      eyes: collectNamed(root, "NpcEye"),
      core: collectNamed(root, "NpcCore"),
      translucentHead: collectNamed(root, "TranslucentHeadFine"),
      translucentTorso: collectNamed(root, "TranslucentTorsoFine"),
      membranes: collectNamed(root, "TranslucentMembrane"),
      filaments: collectNamed(root, "TranslucentFilament"),
      shoulders: collectNamed(root, "TranslucentShoulder"),
      upperArms: collectNamed(root, "TranslucentUpperArm"),
      forearms: collectNamed(root, "TranslucentForearm"),
      translucentHands: collectNamed(root, "TranslucentHand"),
      translucentThighs: collectNamed(root, "TranslucentThigh"),
      translucentShins: collectNamed(root, "TranslucentShin"),
      translucentFeet: collectNamed(root, "TranslucentFoot"),
      rockyHead: collectNamed(root, "RockyHead"),
      rockyTorso: collectNamed(root, "RockyTorso"),
      rockyUpperArms: collectNamed(root, "RockyUpperArm"),
      rockyForearms: collectNamed(root, "RockyForearm"),
      rockyThighs: collectNamed(root, "RockyThigh"),
      rockyShins: collectNamed(root, "RockyShin"),
      rockyFeet: collectNamed(root, "RockyFoot"),
      rockyPlates: [...collectNamed(root, "RockyPlate"), ...collectNamed(root, "RockyLimbPlate")],
      rockyFragments: collectNamed(root, "RockyFragment")
    };

    const animatedObjects = new Set(Object.values(named).flat());
    const materials = new Set();
    animatedObjects.forEach((object) => {
      if (Array.isArray(object.material)) object.material.forEach((item) => materials.add(item));
      else if (object.material) materials.add(object.material);
    });

    return {
      root,
      type,
      phase: Math.random() * Math.PI * 2,
      anchor: {
        position: root.position.clone(),
        rotation: root.rotation.clone(),
        scale: root.scale.clone()
      },
      named,
      objects: [...animatedObjects].map(objectSnapshot),
      materials: materialSnapshot([...materials]),
      state: "rest",
      previousState: "rest",
      stateSince: nowSeconds(),
      nextIdleChangeAt: nowSeconds() + 3 + Math.random() * 4,
      lookBlend: 0,
      controlled: false,
      motion: null,
      enabled: true
    };
  };

  const restoreObject = (snapshot) => {
    snapshot.object.position.copy(snapshot.position);
    snapshot.object.rotation.copy(snapshot.rotation);
    snapshot.object.scale.copy(snapshot.scale);
  };

  const restorePose = (state) => {
    state.objects.forEach(restoreObject);
    state.materials.forEach(({ material, emissiveIntensity, opacity }) => {
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
      if ("opacity" in material) material.opacity = opacity;
    });
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.anchor.position);
    root.rotation.copy(state.anchor.rotation);
    root.scale.copy(state.anchor.scale);
    restorePose(state);
    state.motion = null;
    return true;
  };

  const register = (root, type) => {
    if (!root || !NPC_TYPES.has(type) || states.has(root)) return false;
    root.userData.libraryType ||= type;
    root.userData.npcRuntime = VERSION;
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    const state = capture(root, type);
    states.set(root, state);
    registry.add(root);
    return true;
  };

  const unregister = (root) => {
    if (!states.has(root)) return false;
    restore(root);
    registry.delete(root);
    states.delete(root);
    return true;
  };

  const changeState = (state, nextState, elapsed, controlled = state.controlled) => {
    if (!ALLOWED_STATES.has(nextState)) return false;
    const previous = state.state;
    state.controlled = Boolean(controlled);
    if (previous === nextState) return true;
    state.previousState = previous;
    state.state = nextState;
    state.stateSince = elapsed;
    rootEvent(state.root, "bluefox:npc-state", {
      type: state.type,
      previous,
      state: state.state,
      controlled: state.controlled
    });
    return true;
  };

  const chooseState = (state, elapsed, distance) => {
    if (state.controlled) return;
    let next = state.state;
    if (distance < 2.1) next = "vigilance";
    else if (distance < 5.5) next = "curiosity";
    else if (elapsed >= state.nextIdleChangeAt) {
      const choices = state.type === "npc_rocky"
        ? ["rest", "observation", "rest", "vigilance"]
        : ["rest", "observation", "curiosity", "rest"];
      next = choices[Math.floor(Math.random() * choices.length)];
      state.nextIdleChangeAt = elapsed + 4 + Math.random() * 7;
    }
    if (next !== state.state) changeState(state, next, elapsed, false);
  };

  const baseOf = (state, object) => state.objects.find((item) => item.object === object);

  const facePlayer = (state, distance, strength, maxAngle) => {
    const player = playerRoot();
    if (!player || !Number.isFinite(distance)) return;
    const dx = Number(player.position.x || 0) - Number(state.root.position.x || 0);
    const dz = Number(player.position.z || 0) - Number(state.root.position.z || 0);
    const targetYaw = Math.atan2(dx, dz);
    let delta = targetYaw - state.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const desired = clamp(delta, -maxAngle, maxAngle);
    state.lookBlend += (strength - state.lookBlend) * 0.06;
    const heads = state.type === "npc_rocky" ? state.named.rockyHead : state.named.translucentHead;
    heads.forEach((head) => {
      const base = baseOf(state, head);
      if (!base) return;
      head.rotation.y = base.rotation.y + desired * state.lookBlend;
    });
  };

  const updateEyes = (state, elapsed, intensity, tracking) => {
    state.named.eyes.forEach((eye, index) => {
      const base = baseOf(state, eye);
      if (!base) return;
      eye.scale.set(
        base.scale.x * (1 + Math.sin(elapsed * 1.7 + index + state.phase) * 0.025),
        base.scale.y * (1 + Math.sin(elapsed * 1.2 + index) * 0.04),
        base.scale.z
      );
      if (eye.material && "emissiveIntensity" in eye.material) {
        const materialBase = state.materials.find((item) => item.material === eye.material);
        eye.material.emissiveIntensity = Math.max(
          0,
          Number(materialBase?.emissiveIntensity || 0) * intensity
        );
      }
      eye.rotation.y = base.rotation.y + tracking * (eye.userData.side || 0) * 0.06;
    });
  };

  const gaitPhase = (elapsed, speed, phase) => Math.sin(elapsed * speed + phase);

  const animateTranslucentGait = (state, elapsed, intensity = 1) => {
    const step = gaitPhase(elapsed, 5.0, state.phase);
    const sway = Math.sin(elapsed * 2.5 + state.phase) * intensity;
    state.named.translucentThighs.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.22 * intensity;
    });
    state.named.translucentShins.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.16 * intensity;
    });
    state.named.translucentFeet.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.08 * intensity;
    });
    state.named.upperArms.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.11 * intensity;
    });
    state.named.translucentTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (base) torso.rotation.x = base.rotation.x + sway * 0.045;
    });
    state.root.rotation.z = state.anchor.rotation.z + sway * 0.035;
  };

  const rockyStepEnvelope = (elapsed, phase) => {
    const cycle = ((elapsed * 1.35 + phase / (Math.PI * 2)) % 1 + 1) % 1;
    // Lent au départ, impulsion courte au milieu, lent à la fin.
    const shaped = cycle < 0.34
      ? (cycle / 0.34) * 0.34
      : cycle < 0.58
        ? 0.34 + ((cycle - 0.34) / 0.24) * 0.46
        : 0.8 + ((cycle - 0.58) / 0.42) * 0.2;
    return Math.sin(shaped * Math.PI * 2);
  };

  const animateRockyGait = (state, elapsed, intensity = 1) => {
    const step = rockyStepEnvelope(elapsed, state.phase) * intensity;
    const headNod = Math.sin(elapsed * 2.7 + state.phase) * intensity;
    state.named.rockyThighs.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.14;
    });
    state.named.rockyShins.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.1;
    });
    state.named.rockyUpperArms.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.055;
    });
    state.named.rockyHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + headNod * 0.045;
    });
  };

  const animateTranslucentInteraction = (state, elapsed, dialogue) => {
    const age = elapsed - state.stateSince;
    const gesture = Math.sin(age * (dialogue ? 2.2 : 1.45));
    const nod = Math.sin(age * 1.25) * 0.035;
    state.named.translucentHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + nod;
    });
    state.named.upperArms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      arm.rotation.z = base.rotation.z + side * (0.08 + gesture * (dialogue ? 0.11 : 0.07));
      arm.rotation.x = base.rotation.x + side * 0.045;
    });
    state.named.forearms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      arm.rotation.z = base.rotation.z - side * (0.1 + gesture * (dialogue ? 0.14 : 0.08));
    });
  };

  const animateRockyInteraction = (state, elapsed, dialogue) => {
    const age = elapsed - state.stateSince;
    const beat = Math.max(0, Math.sin(age * (dialogue ? 1.7 : 1.1)));
    state.named.rockyHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + beat * 0.055;
    });
    state.named.rockyUpperArms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      const active = side > 0 ? 1 : 0.35;
      arm.rotation.z = base.rotation.z + side * beat * (dialogue ? 0.12 : 0.08) * active;
    });
    state.named.rockyForearms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      const active = side > 0 ? 1 : 0.35;
      arm.rotation.z = base.rotation.z - side * beat * (dialogue ? 0.16 : 0.1) * active;
    });
  };

  const updateMotion = (state, elapsed) => {
    const motion = state.motion;
    if (!motion) return;
    const raw = clamp((elapsed - motion.startedAt) / Math.max(0.15, motion.duration), 0, 1);
    const t = state.type === "npc_rocky"
      ? (raw < 0.35
          ? 0.18 * (raw / 0.35) * (raw / 0.35)
          : raw < 0.60
            ? 0.18 + 0.55 * ((raw - 0.35) / 0.25)
            : 0.73 + 0.27 * (1 - Math.pow(1 - (raw - 0.60) / 0.40, 2)))
      : 0.5 - Math.cos(raw * Math.PI) * 0.5;
    state.root.position.x = motion.from.x + (motion.to.x - motion.from.x) * t;
    state.root.position.z = motion.from.z + (motion.to.z - motion.from.z) * t;
    const dx = motion.to.x - motion.from.x;
    const dz = motion.to.z - motion.from.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) state.root.rotation.y = Math.atan2(dx, dz);
    if (raw >= 1) {
      state.motion = null;
      if (motion.autoRelease) {
        changeState(state, "calm", elapsed, false);
        state.nextIdleChangeAt = elapsed + 2.5;
      }
      rootEvent(state.root, "bluefox:npc-motion-complete", { type: state.type, state: state.state });
    }
  };

  const updateTranslucent = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6, 0, 1);
    const curious = state.state === "curiosity" || state.state === "observation";
    const vigilant = state.state === "vigilance";
    const moving = state.state === "movement" || state.state === "flee";
    const interacting = state.state === "interaction" || state.state === "dialogue";
    const calm = state.state === "calm";
    const breathe = Math.sin(elapsed * (vigilant ? 1.25 : calm ? 0.58 : 0.72) + state.phase);
    const hover = Math.sin(elapsed * 0.82 + state.phase * 0.7);
    const drift = Math.sin(elapsed * 0.31 + state.phase);

    state.root.position.y = state.anchor.position.y + hover * (moving ? 0.025 : 0.045);
    if (!moving) state.root.rotation.z = state.anchor.rotation.z + drift * 0.008;
    state.root.rotation.x = state.anchor.rotation.x + (curious ? -0.025 : 0);

    state.named.translucentTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breathe * 0.012),
        base.scale.y * (1 + breathe * 0.025),
        base.scale.z * (1 + breathe * 0.018)
      );
    });

    state.named.core.forEach((core, index) => {
      const base = baseOf(state, core);
      if (!base) return;
      const pulse = 1 + Math.sin(elapsed * 1.85 + index + state.phase) * (0.08 + proximity * 0.04);
      core.scale.set(base.scale.x * pulse, base.scale.y * pulse, base.scale.z * pulse);
      core.rotation.y = base.rotation.y + elapsed * 0.62;
      if (core.material && "emissiveIntensity" in core.material) {
        const materialBase = state.materials.find((item) => item.material === core.material);
        core.material.emissiveIntensity =
          Number(materialBase?.emissiveIntensity || 0) * (1 + proximity * 0.3 + Math.max(0, breathe) * 0.12);
      }
    });

    state.named.membranes.forEach((membrane, index) => {
      const base = baseOf(state, membrane);
      if (!base) return;
      membrane.rotation.x = base.rotation.x + Math.sin(elapsed * 1.1 + index * 1.7 + state.phase) * 0.045;
      membrane.rotation.z = base.rotation.z + Math.sin(elapsed * 0.83 + index + state.phase) * 0.025;
      membrane.scale.y = base.scale.y * (1 + Math.sin(elapsed * 1.35 + index) * 0.035);
    });

    state.named.filaments.forEach((filament, index) => {
      const base = baseOf(state, filament);
      if (!base) return;
      filament.rotation.z = base.rotation.z + Math.sin(elapsed * 1.05 + index * 0.58 + state.phase) * (0.035 + proximity * 0.025);
      filament.rotation.x = base.rotation.x + Math.cos(elapsed * 0.8 + index * 0.44) * 0.018;
    });

    state.named.shoulders.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base) part.rotation.x = base.rotation.x + breathe * 0.018 * (index ? -1 : 1);
    });
    state.named.upperArms.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base && !moving && !interacting) part.rotation.z = base.rotation.z + breathe * 0.012 + (curious ? (index ? -0.025 : 0.025) : 0);
    });
    state.named.forearms.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base && !moving && !interacting) part.rotation.z = base.rotation.z - breathe * 0.01 + (vigilant ? (index ? 0.035 : -0.035) : 0);
    });

    if (moving) animateTranslucentGait(state, elapsed, state.state === "flee" ? 1.35 : 1);
    if (interacting) animateTranslucentInteraction(state, elapsed, state.state === "dialogue");
    facePlayer(state, distance, interacting ? 1 : proximity, interacting ? 0.52 : vigilant ? 0.62 : 0.42);
    updateEyes(state, elapsed, 0.9 + proximity * 0.35, proximity);
  };

  const updateRocky = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6.5, 0, 1);
    const vigilant = state.state === "vigilance";
    const observation = state.state === "observation" || state.state === "curiosity";
    const moving = state.state === "movement" || state.state === "flee";
    const interacting = state.state === "interaction" || state.state === "dialogue";
    const calm = state.state === "calm";
    const breath = Math.sin(elapsed * (vigilant ? 0.78 : calm ? 0.38 : 0.46) + state.phase);
    const weight = Math.sin(elapsed * 0.24 + state.phase * 0.6);

    if (!moving) state.root.rotation.z = state.anchor.rotation.z + weight * 0.009;
    state.root.rotation.x = state.anchor.rotation.x + (observation ? -0.015 : 0);

    state.named.rockyTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breath * 0.006),
        base.scale.y * (1 + breath * 0.012),
        base.scale.z * (1 + breath * 0.01)
      );
      torso.position.y = base.position.y + breath * 0.009;
    });

    state.named.rockyPlates.forEach((plate, index) => {
      const base = baseOf(state, plate);
      if (!base) return;
      const local = Math.sin(elapsed * 0.35 + index * 0.9 + state.phase);
      plate.position.y = base.position.y + local * 0.006;
      plate.rotation.z = base.rotation.z + local * 0.004 + (vigilant ? Math.sin(elapsed * 3 + index) * 0.002 : 0);
    });

    state.named.rockyFragments.forEach((fragment, index) => {
      const base = baseOf(state, fragment);
      if (!base) return;
      const loosen = Math.max(0, Math.sin(elapsed * 0.52 + index * 1.31 + state.phase));
      fragment.position.y = base.position.y - loosen * (index % 4 === 0 ? 0.018 : 0.004);
      fragment.rotation.y = base.rotation.y + elapsed * (0.012 + index * 0.001);
    });

    if (moving) animateRockyGait(state, elapsed, state.state === "flee" ? 1.25 : 1);
    if (interacting) animateRockyInteraction(state, elapsed, state.state === "dialogue");
    facePlayer(state, distance, interacting ? 0.9 : proximity, interacting ? 0.42 : vigilant ? 0.35 : 0.24);
    updateEyes(state, elapsed, 0.82 + proximity * 0.5 + Math.max(0, breath) * 0.08, proximity * 0.65);
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    const distance = distanceToPlayer(state.root);
    chooseState(state, elapsed, distance);
    updateMotion(state, elapsed);
    if (state.type === "npc_translucent") updateTranslucent(state, elapsed, distance);
    else updateRocky(state, elapsed, distance);
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const type = context.type || instance?.definition?.type || root?.userData?.libraryType;
    if (!root || !NPC_TYPES.has(type)) return;
    const attach = () => register(root, type);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  let running = true;
  const startedAt = nowSeconds();
  let lastCleanupAt = 0;

  const frame = () => {
    if (!running) return;
    const elapsed = nowSeconds() - startedAt;
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "npc", elapsed))) update(state, elapsed);
    });
    if (elapsed - lastCleanupAt > 8) {
      lastCleanupAt = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.NpcRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    list(type = null) {
      return Object.freeze([...registry].filter((root) => !type || states.get(root)?.type === type));
    },
    getState(root) {
      const state = states.get(root);
      return state ? Object.freeze({
        type: state.type,
        state: state.state,
        previousState: state.previousState,
        stateSince: state.stateSince,
        controlled: state.controlled,
        moving: Boolean(state.motion),
        enabled: state.enabled
      }) : null;
    },
    setState(root, nextState) {
      const state = states.get(root);
      if (!state || !ALLOWED_STATES.has(nextState)) return false;
      state.motion = null;
      return changeState(state, nextState, nowSeconds() - startedAt, true);
    },
    releaseState(root) {
      const state = states.get(root);
      if (!state) return false;
      state.controlled = false;
      state.motion = null;
      state.nextIdleChangeAt = nowSeconds() - startedAt;
      return true;
    },
    moveLocal(root, dx = 0, dz = 0, options = {}) {
      const state = states.get(root);
      if (!state) return false;
      const distance = Math.hypot(Number(dx) || 0, Number(dz) || 0);
      const maxDistance = Math.max(0.25, Math.min(4.5, Number(options.maxDistance) || 4.5));
      const scale = distance > maxDistance ? maxDistance / distance : 1;
      const x = (Number(dx) || 0) * scale;
      const z = (Number(dz) || 0) * scale;
      const nextState = options.state === "flee" ? "flee" : "movement";
      changeState(state, nextState, nowSeconds() - startedAt, true);
      const startedAtMotion = nowSeconds() - startedAt;
      state.motion = {
        from: { x: state.root.position.x, z: state.root.position.z },
        to: { x: state.anchor.position.x + x, z: state.anchor.position.z + z },
        startedAt: startedAtMotion,
        duration: Math.max(0.45, Number(options.duration) || (state.type === "npc_rocky" ? Math.max(1.5, distance / 0.75) : Math.max(1.0, distance / 1.1))),
        autoRelease: options.autoRelease !== false
      };
      return true;
    },
    fleeFromPlayer(root, distance = 2.8) {
      const state = states.get(root);
      const player = playerRoot();
      if (!state || !player) return false;
      let dx = Number(state.root.position.x || 0) - Number(player.position?.x || 0);
      let dz = Number(state.root.position.z || 0) - Number(player.position?.z || 0);
      const length = Math.hypot(dx, dz) || 1;
      dx = dx / length * distance;
      dz = dz / length * distance;
      return this.moveLocal(root, dx, dz, { state: "flee", autoRelease: true });
    },
    speak(root, text = "⋔ ⌁ ∆ ⟟") {
      const state = states.get(root);
      if (!state) return false;
      changeState(state, "dialogue", nowSeconds() - startedAt, true);
      rootEvent(root, "bluefox:npc-speech", { type: state.type, text: String(text || "") });
      return true;
    },
    setEnabled(root, enabled) {
      const state = states.get(root);
      if (!state) return false;
      state.enabled = Boolean(enabled);
      if (!state.enabled) restore(root);
      return true;
    },
    snapshot() {
      return Object.freeze({
        version: VERSION,
        registered: registry.size,
        running
      });
    },
    stop() {
      running = false;
      registry.forEach((root) => restore(root));
    }
  });

  global.requestAnimationFrame?.(frame);
  console.info("[BlueFox P2.2.2] Runtime PNJ actif.");
})(window);
