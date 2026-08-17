(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const ACTIVE_SLOT_KEY = "bluefox_active_save_slot_v1";
  const RESTORED_AT_KEY = "bluefox_active_state_restored_at_v1";
  const LAST_SESSION_END_KEY = "bluefox_last_session_end_v1";
  const FILE_BOOTSTRAP_KEY = "bluefox_file_save_bootstrap_v1";
  const FILE_DIAGNOSTICS_KEY = "bluefox_file_save_diagnostics_v1";
  const AUTOSAVE_INTERVAL_MS = 90000;
  const INTRO_VIDEO_PATH = "assets/video/bluefox-intro.mp4";

  const SLOT_KEYS = Object.freeze({
    auto: "bluefox_autosave_slot_v1",
    backup: "bluefox_autosave_backup_v1",
    1: "bluefox_save_slot_1_v1",
    2: "bluefox_save_slot_2_v1"
  });

  const SAVE_UI_CONFIG = Object.freeze({
    version: "save-file-v3",
    targetSelector: ".settings-content",
    rootId: "bluefox-save-game-controls",
    actionClass: "save-game-actions",
    actions: Object.freeze([
      Object.freeze({ id: "save", label: "Sauvegarder" }),
      Object.freeze({ id: "load", label: "Charger" }),
      Object.freeze({ id: "new", label: "Nouvelle partie" })
    ])
  });

  const RESERVED_KEYS = new Set([
    ...Object.values(SLOT_KEYS),
    "bluefox_last_manual_save_v1",
    "bluefox_new_game_start_v1",
    "bluefox_last_start_map_v1",
    "bluefox_save_diagnostics_v1",
    FILE_DIAGNOSTICS_KEY,
    FILE_BOOTSTRAP_KEY,
    ACTIVE_SLOT_KEY,
    RESTORED_AT_KEY,
    LAST_SESSION_END_KEY
  ]);

  const diagnostics = {
    version: SAVE_UI_CONFIG.version,
    sourceOfTruth: "file",
    autosaveIntervalMs: AUTOSAVE_INTERVAL_MS,
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    lastSkippedAt: 0,
    lastSlot: null,
    lastBytes: 0,
    lastError: "",
    verified: false,
    fileApiAvailable: false,
    restoredFromFile: false,
    exactRestore: true,
    origin: global.location.origin
  };

  let lastFlushAt = 0;
  let startupReady = false;
  let startupPromise = null;
  let newGameResetInProgress = false;
  let introInProgress = false;
  let introOverlay = null;
  let lastAutoStateSignature = null;

  const keys = () =>
    Array.from({ length: global.localStorage.length }, (_, index) =>
      global.localStorage.key(index)
    ).filter(Boolean);

  const clearActive = () => {
    keys().forEach((key) => {
      if (key.startsWith("bluefox_") && !RESERVED_KEYS.has(key)) {
        global.localStorage.removeItem(key);
      }
    });
  };

  const persistRuntime = () => {
    const calls = [
      () => BF.currentEngine?.savePosition?.(),
      () => BF.currentEngine?.saveDiscovery?.(),
      () => BF.currentEngine?.saveZoneDiscovery?.(),
      () => BF.currentEngine?.missionManager?.memory?.save?.(),
      () => BF.multiProgression?.save?.(),
      () => BF.mapExploration?.save?.(),
      () => BF.survival?.save?.()
    ];
    const errors = [];
    calls.forEach((call) => {
      try { call(); } catch (error) { errors.push(error); }
    });
    return errors;
  };
