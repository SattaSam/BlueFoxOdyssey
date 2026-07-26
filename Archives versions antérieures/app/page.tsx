"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Three.js must stay browser-only. Importing it at module scope makes the
// Cloudflare worker instantiate LoadingManager before a request handler exists.
let THREE: typeof import("three");

type Panel = "none" | "inventory" | "research" | "settings" | "planet" | "journal";
type Resources = { crystal: number; fiber: number; parts: number };
type ActionEvent = { text: string; at: string };
type MapId = "crystal" | "jungle";
type Direction = "north" | "west" | "east" | "south";
type MissionId = "shelter" | "energy" | "flora" | "contact";
type MissionState = { id: MissionId; startedAt: number; reason: string };
type PrioritySettings = {
  Exploration: number; Collecte: number; Construction: number;
  Repos: number; Recherche: number; Relations: number;
};
type MapMemory = {
  id: MapId;
  discoveredAt: number;
  order: number;
  seed: number;
  visitedZones: string[];
};

const mapDefinitions: Record<MapId, { name: string; zones: string[] }> = {
  crystal: { name: "Plaine des Cristaux", zones: ["Abri et épave"] },
  jungle: { name: "Ruines d’Émeraude", zones: ["Clairière des stèles", "Ruines noyées"] },
};

const createMapMemory = (id: MapId, order: number, discoveredAt = Date.now()): MapMemory => ({
  id,
  order,
  discoveredAt,
  seed: id === "crystal" ? 9173 : 24023,
  visitedZones: [mapDefinitions[id].zones[0]],
});

const defaultPriorities: PrioritySettings = {
  Exploration: 72, Collecte: 54, Construction: 38,
  Repos: 28, Recherche: 61, Relations: 46,
};

const missionDefinitions: Record<MissionId, { title: string; description: string }> = {
  shelter: {
    title: "Établir un premier refuge",
    description: "Rassembler ce qui protège l’épave sans épuiser les ressources du site.",
  },
  energy: {
    title: "Concevoir une énergie douce",
    description: "Comprendre les cristaux et les ruines avant de construire une source durable.",
  },
  flora: {
    title: "Étudier la flore photoréactive",
    description: "Observer plusieurs spécimens sans perturber leur cycle lumineux.",
  },
  contact: {
    title: "Créer un premier lien",
    description: "Approcher les créatures avec patience et mémoriser leurs réactions.",
  },
};

const chooseNextMission = (
  priorities: PrioritySettings,
  resources: Resources,
  knowledge: number,
  relations: number,
  excluded?: MissionId,
): MissionState => {
  if (resources.fiber < 5 || resources.parts < 1) {
    return { id: "shelter", startedAt: Date.now(), reason: "La sécurité du camp reste prioritaire." };
  }
  const candidates: { id: MissionId; score: number; reason: string }[] = [
    { id: "energy", score: priorities.Construction + priorities.Recherche + (resources.crystal < 8 ? 22 : 0), reason: "Une énergie locale rendrait le refuge autonome." },
    { id: "flora", score: priorities.Recherche + priorities.Exploration + (knowledge < 6 ? 20 : 0), reason: "La flore pourrait révéler le fonctionnement du biome." },
    { id: "contact", score: priorities.Relations * 2 + (relations < 4 ? 18 : 0), reason: "Comprendre les habitants évitera des conflits inutiles." },
  ];
  const selected = candidates.filter((candidate) => candidate.id !== excluded).sort((a, b) => b.score - a.score)[0];
  return { id: selected.id, startedAt: Date.now(), reason: selected.reason };
};

const tools: { id: Panel; icon: string; label: string }[] = [
  { id: "inventory", icon: "◫", label: "Inventaire" },
  { id: "research", icon: "⌬", label: "Recherche" },
  { id: "settings", icon: "⚙", label: "Réglages" },
  { id: "planet", icon: "◎", label: "Planète" },
  { id: "journal", icon: "▤", label: "Journal" },
];

const panelCopy: Record<Exclude<Panel, "none">, { title: string; text: string }> = {
  inventory: {
    title: "Inventaire d’expédition",
    text: "Les ressources collectées par BlueFox sont stockées ici. Elles serviront à réparer l’abri et à fabriquer de nouveaux outils.",
  },
  research: {
    title: "Laboratoire de BlueFox",
    text: "Mes observations, mes hypothèses et les projets que j’aimerais développer.",
  },
  settings: {
    title: "Comportement et personnalité",
    text: "Ces réglages influencent mes décisions sans me donner des ordres stricts.",
  },
  planet: {
    title: "Planète",
    text: "La planète se cartographie au fil des premières explorations. Chaque map rassemble de 1 à 6 zones reliées par des chemins identifiables et partage une même ambiance de fond.",
  },
  journal: {
    title: "Journal de BlueFox",
    text: "Jour 1. J’ai établi un camp près de l’épave. Cette vallée est immense… et quelque chose m’observe depuis les cristaux.",
  },
};

function makeCrystal() {
  const group = new THREE.Group();
  const colors = [0x72e7ff, 0x3f8dff, 0xa87cff];
  [
    [-0.28, 0.48, 0, 0.17, 0.95],
    [0, 0.72, 0, 0.22, 1.45],
    [0.3, 0.42, 0.06, 0.15, 0.82],
  ].forEach(([x, y, z, radius, height], i) => {
    const gem = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 6),
      new THREE.MeshPhysicalMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.48,
        transmission: 0.12,
        roughness: 0.18,
        metalness: 0.1,
      }),
    );
    gem.position.set(x, y, z);
    gem.castShadow = true;
    group.add(gem);
  });
  const glow = new THREE.PointLight(0x63dbff, 2.5, 7);
  glow.position.y = 0.7;
  group.add(glow);
  return group;
}

function makePlant() {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.11, 1.25, 9),
    new THREE.MeshStandardMaterial({ color: 0x176d5e, roughness: 0.72 }),
  );
  stem.position.y = 0.62;
  stem.castShadow = true;
  group.add(stem);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 10),
      new THREE.MeshPhysicalMaterial({
        color: i % 2 ? 0x50e8b0 : 0x36b9df,
        emissive: i % 2 ? 0x16734e : 0x145b7b,
        emissiveIntensity: 0.52,
        roughness: 0.44,
      }),
    );
    const angle = (i / 7) * Math.PI * 2;
    leaf.scale.set(1.1, 0.18, 0.45);
    leaf.rotation.y = angle;
    leaf.rotation.z = Math.PI * 0.18;
    leaf.position.set(Math.cos(angle) * 0.35, 0.35 + i * 0.13, Math.sin(angle) * 0.35);
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function makeRuin() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x43637a, roughness: 0.82, metalness: 0.18 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0x71e8ff,
    emissive: 0x2dc8ff,
    emissiveIntensity: 1.5,
  });
  [-0.65, 0.65].forEach((x, i) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.75 - i * 0.28, 0.42), stone);
    pillar.position.set(x, (1.75 - i * 0.28) / 2, 0);
    pillar.rotation.z = i ? -0.07 : 0.04;
    pillar.castShadow = true;
    group.add(pillar);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.44), glow);
    rune.position.set(x, 0.88, 0.02);
    group.add(rune);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.46), stone);
  lintel.position.y = 1.66;
  lintel.rotation.z = -0.07;
  lintel.castShadow = true;
  group.add(lintel);
  return group;
}

function makeCreature() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x8a72ff,
    emissive: 0x352c8e,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), bodyMat);
  body.scale.set(1, 0.72, 1.18);
  body.position.y = 0.48;
  body.castShadow = true;
  group.add(body);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 5), bodyMat);
    ear.position.set(side * 0.28, 0.92, 0);
    ear.rotation.z = side * -0.24;
    group.add(ear);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xc9ffff, emissive: 0x7ef6ff, emissiveIntensity: 2 }),
    );
    eye.position.set(side * 0.15, 0.58, 0.39);
    group.add(eye);
  });
  return group;
}

function makeMushroom() {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 0.7, 10),
    new THREE.MeshStandardMaterial({ color: 0x5b7ea8, roughness: 0.55 }),
  );
  stem.position.y = 0.35;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x55eaff, emissive: 0x198cc4, emissiveIntensity: 1.2, roughness: 0.3 }),
  );
  cap.position.y = 0.72;
  cap.scale.y = 0.45;
  group.add(stem, cap, new THREE.PointLight(0x42dfff, 1.3, 3));
  return group;
}

function makeCrystalArch() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x223a69, emissive: 0x12295f, emissiveIntensity: 0.65, roughness: 0.72 });
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * (i / 8);
    const segment = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.15, 0.65), material);
    segment.position.set(Math.cos(angle) * 2.1, Math.sin(angle) * 2.1, 0);
    segment.rotation.z = angle - Math.PI / 2;
    segment.castShadow = true;
    group.add(segment);
  }
  group.scale.setScalar(0.72);
  return group;
}

function makeGlowPool() {
  const group = new THREE.Group();
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x24ddeb, emissive: 0x128fae, emissiveIntensity: 1.4, transparent: true, opacity: 0.78, roughness: 0.18 }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.12, 10, 36),
    new THREE.MeshStandardMaterial({ color: 0x203f66, roughness: 0.85 }),
  );
  rim.rotation.x = Math.PI / 2;
  group.add(pool, rim, new THREE.PointLight(0x29e8ff, 2, 5));
  return group;
}

function makeRockFormation(height = 2.4) {
  const group = new THREE.Group();
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x574451,
    roughness: 0.94,
    metalness: 0.04,
  });
  const veinMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f58a5,
    emissive: 0x35256c,
    emissiveIntensity: 0.55,
    roughness: 0.7,
  });
  for (let i = 0; i < 5; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + i * 0.08, 0),
      i === 2 ? veinMaterial : rockMaterial,
    );
    const angle = i * 1.37;
    rock.position.set(Math.cos(angle) * 0.55, (height * (0.35 + i * 0.08)) / 2, Math.sin(angle) * 0.45);
    rock.scale.set(0.72 + i * 0.09, height * (0.35 + i * 0.08), 0.68 + (i % 2) * 0.22);
    rock.rotation.set(i * 0.18, angle, i * 0.09);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
  return group;
}

function makeCanopyTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 3.1, 9),
    new THREE.MeshStandardMaterial({ color: 0x5a3840, roughness: 0.92 }),
  );
  trunk.position.y = 1.55;
  trunk.castShadow = true;
  group.add(trunk);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 14, 10),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x316f79 : 0x684c8d,
        emissive: i % 2 ? 0x143e47 : 0x2d1c52,
        emissiveIntensity: 0.42,
        roughness: 0.65,
      }),
    );
    canopy.position.set(Math.cos(angle) * 0.72, 3.05 + (i % 3) * 0.18, Math.sin(angle) * 0.72);
    canopy.scale.set(1.15, 0.42, 0.82);
    canopy.rotation.y = angle;
    canopy.castShadow = true;
    group.add(canopy);
  }
  return group;
}

function World3D({
  onStatus,
  onCollect,
  onAction,
  onSpeak,
  onMapChange,
  onMapDiscovered,
  onZoneChange,
  onRest,
}: {
  onStatus: (message: string) => void;
  onCollect: (kind: keyof Resources) => void;
  onAction: (text: string) => void;
  onSpeak: (text: string) => void;
  onMapChange: (map: MapId) => void;
  onMapDiscovered: (map: MapId) => void;
  onZoneChange: (map: MapId, zone: string) => void;
  onRest: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let disposed = false;
    let disposeScene: (() => void) | undefined;

    void (async () => {
      const [threeModule, loaderModule, controlsModule] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/controls/OrbitControls.js"),
      ]);
      if (disposed) return;
      THREE = threeModule;
      const { GLTFLoader } = loaderModule;
      const { OrbitControls } = controlsModule;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        onStatus("Aperçu illustré actif — WebGL est indisponible dans ce navigateur.");
        return;
      }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();
    const panorama = textureLoader.load("/assets/biomes/crystal-valley-panorama.png");
    panorama.colorSpace = THREE.SRGBColorSpace;
    panorama.wrapS = THREE.RepeatWrapping;
    panorama.wrapT = THREE.ClampToEdgeWrapping;
    scene.background = new THREE.Color(0x111b34);
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(105, 48, 28),
      new THREE.MeshBasicMaterial({
        map: panorama,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    skyDome.scale.set(1.22, 0.88, 1.22);
    scene.add(skyDome);
    scene.fog = new THREE.FogExp2(0x122c58, 0.014);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
    camera.position.set(8, 5.5, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.1, 0);
    controls.minDistance = 4;
    controls.maxDistance = 27;
    controls.maxPolarAngle = Math.PI * 0.475;

    scene.add(new THREE.HemisphereLight(0x9de8ff, 0x112d35, 2.45));
    const sun = new THREE.DirectionalLight(0xcaf4ff, 4.2);
    sun.position.set(-9, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);
    const violet = new THREE.PointLight(0x765dff, 12, 26);
    violet.position.set(8, 5, -5);
    scene.add(violet);

    const makeTerrain = (url: string, x: number) => {
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(64, 64, 1, 1),
        new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 0.84, metalness: 0.03 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.x = x;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    makeTerrain("/assets/biomes/crystal-ruins-24.png", 0);
    makeTerrain("/assets/biomes/jungle-ruins-23.png", 64);
    const junction = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 22),
      new THREE.MeshStandardMaterial({ color: 0x59604c, roughness: 0.93, metalness: 0.02 }),
    );
    junction.rotation.x = -Math.PI / 2;
    junction.position.set(32, 0.035, 0);
    junction.receiveShadow = true;
    scene.add(junction);
    for (let i = 0; i < 13; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(0.75 + (i % 3) * 0.22, 0.09, 1.35 + (i % 2) * 0.35),
        new THREE.MeshStandardMaterial({ color: i < 7 ? 0x4b4d62 : 0x52614c, roughness: 0.9 }),
      );
      step.position.set(26.4 + i * 0.92, 0.08, Math.sin(i * 1.7) * 0.72);
      step.rotation.y = Math.sin(i) * 0.12;
      step.receiveShadow = true;
      scene.add(step);
    }

    const horizonBlend = new THREE.Mesh(
      new THREE.RingGeometry(52, 88, 128),
      new THREE.MeshBasicMaterial({
        color: 0x1c263f,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    );
    horizonBlend.rotation.x = -Math.PI / 2;
    horizonBlend.position.x = 32;
    horizonBlend.position.y = 0.018;
    scene.add(horizonBlend);

    const decorative: import("three").Object3D[] = [];
    const interactives: import("three").Object3D[] = [];
    const obstacles: { position: import("three").Vector3; radius: number }[] = [];
    const placements: [import("three").Object3D, number, number, string][] = [
      [makeCrystal(), -5.5, -3, "crystal"],
      [makeCrystal(), 6.2, 3.6, "crystal"],
      [makeCrystal(), -12.5, 6.5, "crystal"],
      [makeCrystal(), 13.2, -8.2, "crystal"],
      [makePlant(), -7.3, 4.1, "fiber"],
      [makePlant(), 3.8, -5.1, "fiber"],
      [makePlant(), 11.4, 5.8, "fiber"],
      [makePlant(), -14.1, -5.6, "fiber"],
      [makeMushroom(), -2.2, -7.4, "fiber"],
      [makeMushroom(), 7.4, 8.6, "fiber"],
      [makeMushroom(), -10.6, 10.8, "fiber"],
      [makeRuin(), 8.5, -2.2, "parts"],
      [makeCrystalArch(), -10.2, 0.5, "structure"],
      [makeCrystalArch(), 14.4, 8.5, "structure"],
      [makeGlowPool(), 1.5, 9.6, "discovery"],
      [makeGlowPool(), -9.4, -10.5, "discovery"],
      [makeCreature(), -1.2, 5.8, "creature"],
      [makeCreature(), 12.8, 1.5, "creature"],
      [makeRuin(), 21.5, -14.5, "parts"],
      [makeCrystalArch(), -22.5, 13.8, "structure"],
      [makeGlowPool(), 19.5, 18.2, "discovery"],
      [makeCrystal(), -21.2, -18.4, "crystal"],
      [makeCanopyTree(), 17.2, -19.5, "structure"],
      [makeCrystalArch(), 31.8, 0.2, "structure"],
      [makeRuin(), 51.5, -12.5, "parts"],
      [makeGlowPool(), 72.5, 14.8, "discovery"],
      [makeCanopyTree(), 83.5, -18.2, "structure"],
      [makeCanopyTree(), 78.4, 18.7, "structure"],
      [makeCreature(), 61.8, 7.2, "creature"],
      [makePlant(), 87.5, 20.5, "fiber"],
      [makeMushroom(), 43.8, -20.5, "fiber"],
    ];
    let biomeSeed = 9173;
    const seededRandom = () => {
      biomeSeed = (biomeSeed * 1664525 + 1013904223) >>> 0;
      return biomeSeed / 4294967296;
    };
    for (let i = 0; i < 58; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const radius = 8 + seededRandom() * 19;
      const zoneCenterX = i < 30 ? 0 : 64;
      const kindIndex = i % 5;
      const object = kindIndex === 0
        ? makeCrystal()
        : kindIndex === 1
          ? makePlant()
          : kindIndex === 2
            ? makeMushroom()
            : kindIndex === 3
              ? makeCanopyTree()
              : makeCreature();
      const kind = kindIndex === 0 ? "crystal" : kindIndex < 3 ? "fiber" : kindIndex === 3 ? "structure" : "creature";
      placements.push([object, zoneCenterX + Math.cos(angle) * radius, Math.sin(angle) * radius, kind]);
    }
    placements.forEach(([object, x, z, kind], i) => {
      object.position.set(x, 0, z);
      object.rotation.y = i * 0.75;
      object.userData.kind = kind;
      object.userData.mapId = x < 32 ? "crystal" : "jungle";
      object.userData.obstacleRadius = kind === "parts" ? 1.25 : kind === "crystal" ? 0.58 : kind === "structure" && object.children.length === 8 ? 0.42 : 0;
      if (object.userData.obstacleRadius) {
        obstacles.push({ position: object.position, radius: object.userData.obstacleRadius });
      }
      object.traverse((child) => {
        child.userData.root = object;
        if ((child as import("three").Mesh).isMesh) interactives.push(child);
      });
      scene.add(object);
      decorative.push(object);
    });

    for (let i = 0; i < 38; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12 + seededRandom() * 0.34, 0),
        new THREE.MeshStandardMaterial({
          color: i % 3 === 0 ? 0x6b4d5c : 0x4f4552,
          roughness: 0.88,
        }),
      );
      const angle = seededRandom() * Math.PI * 2;
      const radius = 8 + seededRandom() * 19;
      rock.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
      rock.scale.y = 0.5 + seededRandom();
      rock.rotation.set(seededRandom(), seededRandom(), seededRandom());
      rock.castShadow = true;
      scene.add(rock);
    }
    for (let i = 0; i < 26; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const radius = 8 + seededRandom() * 20;
      const zoneCenterX = i < 13 ? 0 : 64;
      const formation = makeRockFormation(1.7 + seededRandom() * 2.8);
      formation.position.set(zoneCenterX + Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      formation.rotation.y = seededRandom() * Math.PI * 2;
      formation.scale.setScalar(0.72 + seededRandom() * 0.8);
      formation.userData.staticTerrain = true;
      scene.add(formation);
      decorative.push(formation);
      obstacles.push({ position: formation.position, radius: 0.85 * formation.scale.x });
    }

    const foxPivot = new THREE.Group();
    const foxFacing = new THREE.Group();
    foxPivot.add(foxFacing);
    scene.add(foxPivot);
    try {
      const savedPosition = JSON.parse(localStorage.getItem("bluefox_world_position_v1") || "null") as { x?: number; z?: number } | null;
      if (
        typeof savedPosition?.x === "number"
        && typeof savedPosition?.z === "number"
        && savedPosition.x >= -29
        && savedPosition.x <= 93
        && Math.abs(savedPosition.z) <= 29
      ) {
        foxPivot.position.set(savedPosition.x, 0, savedPosition.z);
      }
    } catch {
      localStorage.removeItem("bluefox_world_position_v1");
    }
    let foxReady = false;
    let foxBaseY = 0;
    let target = foxPivot.position.clone();
    let currentObject: import("three").Object3D | null = null;
    let actionStartedAt = 0;
    let lastAutonomousChoice = performance.now();
    const animatedBones: Record<string, { bone: import("three").Object3D; base: { x: number; y: number; z: number } }> = {};
    let lastSpokenKind = "";
    let lastSpeechAt = 0;
    let lastWorldSave = performance.now();
    let mapMemories: MapMemory[] = [createMapMemory("crystal", 1)];
    try {
      const savedMaps = JSON.parse(localStorage.getItem("bluefox_discovered_maps_v1") || "null") as MapMemory[] | null;
      if (savedMaps?.some((entry) => entry.id === "crystal")) {
        mapMemories = savedMaps.map((entry, index) => ({
          ...createMapMemory(entry.id, entry.order || index + 1, entry.discoveredAt || Date.now()),
          ...entry,
          seed: entry.seed || (entry.id === "crystal" ? 9173 : 24023),
          visitedZones: entry.visitedZones?.length ? entry.visitedZones : [mapDefinitions[entry.id].zones[0]],
        }));
      }
    } catch {
      localStorage.removeItem("bluefox_discovered_maps_v1");
    }
    const discoveredMaps = new Set<MapId>(mapMemories.map((entry) => entry.id));
    let activeMap: MapId = foxPivot.position.x < 32 ? "crystal" : "jungle";
    if (!discoveredMaps.has(activeMap)) {
      foxPivot.position.x = 30.8;
      target.copy(foxPivot.position);
      activeMap = "crystal";
    }
    let pendingFirstExploration: MapId | null = null;
    onMapChange(activeMap);
    let activeZone = activeMap === "crystal"
      ? mapDefinitions.crystal.zones[0]
      : foxPivot.position.z >= 0 ? mapDefinitions.jungle.zones[0] : mapDefinitions.jungle.zones[1];
    onZoneChange(activeMap, activeZone);
    const rememberMap = (mapId: MapId) => {
      if (discoveredMaps.has(mapId)) return;
      discoveredMaps.add(mapId);
      mapMemories = [...mapMemories, createMapMemory(mapId, mapMemories.length + 1)];
      localStorage.setItem("bluefox_discovered_maps_v1", JSON.stringify(mapMemories));
      onMapDiscovered(mapId);
    };

    new GLTFLoader().load(
      "/models/BlueFoxMODE_9-2.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (["mixamorig:LeftArm", "mixamorig:RightArm", "mixamorig:LeftUpLeg", "mixamorig:RightUpLeg"].includes(child.name)) {
            animatedBones[child.name] = { bone: child, base: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z } };
          }
          if ((child as import("three").Mesh).isMesh) {
            const mesh = child as import("three").Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        const correction = new THREE.Group();
        correction.rotation.x = THREE.MathUtils.degToRad(-66.5);
        correction.add(model);
        foxFacing.add(correction);
        const box = new THREE.Box3().setFromObject(foxFacing);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.25 / size.y;
        foxFacing.scale.setScalar(scale);
        const grounded = new THREE.Box3().setFromObject(foxFacing);
        foxFacing.position.y = -grounded.min.y - 0.24;
        foxBaseY = foxFacing.position.y;
        const centered = grounded.getCenter(new THREE.Vector3());
        foxFacing.position.x -= centered.x;
        foxFacing.position.z -= centered.z;
        foxFacing.rotation.y = 0;
        foxReady = true;
        onStatus("Je vais commencer par observer les alentours.");
        onSpeak("Je vais d’abord observer cette vallée cristalline.");
        onAction("BlueFox observe le biome et choisit sa première action.");
      },
      undefined,
      () => onStatus("Le modèle de BlueFox n’a pas pu être chargé."),
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const guidanceMarkers: { mesh: import("three").Mesh; bornAt: number }[] = [];
    const showGuidanceMarker = (position: import("three").Vector3) => {
      const material = new THREE.MeshBasicMaterial({
        color: 0x8defff,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.43, 40), material);
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(position);
      marker.position.y = 0.07;
      marker.scale.setScalar(2.2);
      scene.add(marker);
      guidanceMarkers.push({ mesh: marker, bornAt: performance.now() });
    };
    let downX = 0;
    let downY = 0;
    renderer.domElement.addEventListener("pointerdown", (event) => {
      downX = event.clientX;
      downY = event.clientY;
    });
    const click = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 8) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactives, false)[0];
      if (hit) {
        const root = hit.object.userData.root as import("three").Object3D;
        const destinationMap = root.userData.mapId as MapId;
        if (!discoveredMaps.has(destinationMap)) {
          if (!navigator.onLine) {
            onStatus("Cette première exploration est verrouillée hors ligne. Nous ouvrirons ce passage ensemble à la prochaine connexion.");
            return;
          }
          pendingFirstExploration = destinationMap;
        }
        const kind = root.userData.kind as string;
        const approachDistance = (root.userData.obstacleRadius || 0.3) + 0.75;
        target.copy(root.position).add(new THREE.Vector3(approachDistance, 0, approachDistance * 0.35));
        showGuidanceMarker(root.position);
        currentObject = root;
        actionStartedAt = 0;
        onStatus(
          kind === "crystal"
            ? "Je vais analyser ce cristal."
            : kind === "fiber"
              ? "Ces fibres peuvent renforcer notre abri."
              : kind === "parts"
                ? "Cette ruine émet encore un faible signal."
                : kind === "structure"
                  ? "Je vais examiner ce passage et vérifier si je peux passer dessous."
                  : kind === "discovery"
                    ? "Ce bassin pourrait révéler quelque chose sur le sous-sol."
                    : "Cette petite créature semble curieuse.",
        );
        return;
      }
      const destination = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, destination)) {
        destination.clamp(new THREE.Vector3(-29, 0, -29), new THREE.Vector3(93, 0, 29));
        const destinationMap: MapId = destination.x < 32 ? "crystal" : "jungle";
        if (!discoveredMaps.has(destinationMap) && !navigator.onLine) {
          showGuidanceMarker(new THREE.Vector3(activeMap === "crystal" ? 30.7 : 33.3, 0, destination.z));
          onStatus("Je ne peux pas inaugurer une nouvelle map hors ligne. Je reste dans la géographie déjà connue.");
          return;
        }
        showGuidanceMarker(destination);
        if (Math.random() < 0.78) {
          if (!discoveredMaps.has(destinationMap)) pendingFirstExploration = destinationMap;
          target.copy(destination);
          currentObject = null;
          onStatus("Ta suggestion me paraît intéressante. Je vais voir.");
          onAction("BlueFox accepte une suggestion d’exploration.");
        } else {
          onStatus("J’ai noté ta suggestion, mais je termine d’abord mon idée.");
        }
      }
    };
    renderer.domElement.addEventListener("pointerup", click);
    const navigateByCompass = (event: Event) => {
      const detail = (event as CustomEvent<{
        x: number; z: number; mapId: MapId; label: string; direction: Direction;
      }>).detail;
      if (!detail) return;
      if (!discoveredMaps.has(detail.mapId) && !navigator.onLine) {
        onStatus("Cette route conduit vers une map inconnue : la première exploration est impossible hors ligne.");
        return;
      }
      if (Math.random() > 0.84) {
        onStatus(`J’ai noté la suggestion vers ${detail.label}, mais je termine d’abord mon action.`);
        onAction(`BlueFox diffère la suggestion ${detail.direction.toUpperCase()} vers ${detail.label}.`);
        return;
      }
      if (!discoveredMaps.has(detail.mapId)) pendingFirstExploration = detail.mapId;
      target.set(detail.x, 0, detail.z);
      currentObject = null;
      actionStartedAt = 0;
      showGuidanceMarker(target);
      onStatus(`Je vais suivre le chemin ${detail.direction.toUpperCase()} vers ${detail.label}.`);
      onAction(`BlueFox accepte la suggestion ${detail.direction.toUpperCase()} vers ${detail.label}.`);
    };
    window.addEventListener("bluefox:navigate", navigateByCompass);

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const direction = target.clone().sub(foxPivot.position);
      direction.y = 0;
      const moving = foxReady && direction.length() > 0.12;
      if (moving) {
        const distance = direction.length();
        direction.normalize();
        const lookAhead = foxPivot.position.clone().addScaledVector(direction, 2.8);
        obstacles.forEach((obstacle) => {
          const towardObstacle = obstacle.position.clone().sub(foxPivot.position);
          towardObstacle.y = 0;
          const forwardDistance = towardObstacle.dot(direction);
          if (forwardDistance <= 0 || forwardDistance > 4.2) return;
          const closest = foxPivot.position.clone().addScaledVector(direction, forwardDistance);
          const clearance = closest.distanceTo(obstacle.position);
          const safeRadius = obstacle.radius + 0.72;
          if (clearance >= safeRadius && lookAhead.distanceTo(obstacle.position) >= safeRadius) return;
          const side = new THREE.Vector3(-direction.z, 0, direction.x);
          const cross = direction.x * towardObstacle.z - direction.z * towardObstacle.x;
          side.multiplyScalar(cross > 0 ? -1 : 1);
          direction.addScaledVector(side, 1.55 * (1 - Math.min(clearance / safeRadius, 0.92))).normalize();
        });
        foxPivot.position.addScaledVector(direction, Math.min(2.6 * dt, distance));
        foxPivot.rotation.y = Math.atan2(direction.x, direction.z);
        foxFacing.position.y = foxBaseY + Math.abs(Math.sin(performance.now() * 0.009)) * 0.025;
        const stride = Math.sin(performance.now() * 0.011) * 0.48;
        const leftArm = animatedBones["mixamorig:LeftArm"], rightArm = animatedBones["mixamorig:RightArm"];
        const leftLeg = animatedBones["mixamorig:LeftUpLeg"], rightLeg = animatedBones["mixamorig:RightUpLeg"];
        if (leftArm) { leftArm.bone.rotation.x = leftArm.base.x + stride; leftArm.bone.rotation.z = leftArm.base.z + stride * 0.22; }
        if (rightArm) { rightArm.bone.rotation.x = rightArm.base.x - stride; rightArm.bone.rotation.z = rightArm.base.z - stride * 0.22; }
        if (leftLeg) { leftLeg.bone.rotation.x = leftLeg.base.x - stride * 0.9; leftLeg.bone.rotation.z = leftLeg.base.z - stride * 0.16; }
        if (rightLeg) { rightLeg.bone.rotation.x = rightLeg.base.x + stride * 0.9; rightLeg.bone.rotation.z = rightLeg.base.z + stride * 0.16; }
      } else if (foxReady) {
        Object.values(animatedBones).forEach(({ bone, base }) => {
          bone.rotation.x += (base.x - bone.rotation.x) * 0.12;
          bone.rotation.z += (base.z - bone.rotation.z) * 0.12;
        });
        if (currentObject) {
          if (!actionStartedAt) {
            actionStartedAt = performance.now();
            const kind = currentObject.userData.kind as string;
            const message = kind === "crystal" ? "Je prélève l’énergie sans endommager le gisement." : kind === "fiber" ? "Je sélectionne seulement les fibres arrivées à maturité." : kind === "parts" ? "J’analyse les inscriptions de cette structure." : kind === "structure" ? "Le passage sous cette formation est praticable." : kind === "discovery" ? "Je mesure les particules lumineuses de ce bassin." : "Je tente un contact pacifique.";
            onStatus(message);
            onAction(message);
            if ((kind !== lastSpokenKind || performance.now() - lastSpeechAt > 22000) && Math.random() < 0.58) {
              onSpeak(message);
              lastSpokenKind = kind;
              lastSpeechAt = performance.now();
            }
          } else if (performance.now() - actionStartedAt > 2600) {
            const kind = currentObject.userData.kind as string;
            if (kind === "crystal" || kind === "fiber") {
              onCollect(kind);
              currentObject.scale.setScalar(0.05);
              const collected = currentObject;
              window.setTimeout(() => collected.scale.setScalar(1), 18000);
            } else if (kind === "parts") {
              onCollect("parts");
            }
            onStatus(kind === "creature" ? "Le petit être semble moins méfiant." : "Action terminée. Je réfléchis à la suite.");
            currentObject = null;
            actionStartedAt = 0;
            lastAutonomousChoice = performance.now();
          }
        } else if (performance.now() - lastAutonomousChoice > 4800) {
          let priorities = defaultPriorities;
          let currentEnergy = 80;
          try {
            const save = JSON.parse(localStorage.getItem("bluefox_odyssey_save_v1") || "null") as {
              priorities?: PrioritySettings;
              energy?: number;
            } | null;
            if (save?.priorities) priorities = save.priorities;
            if (typeof save?.energy === "number") currentEnergy = save.energy;
          } catch {
            // A damaged preference save must never stop BlueFox's local AI.
          }
          const restScore = priorities.Repos + Math.max(0, 55 - currentEnergy) * 2.2;
          const highestActiveDrive = Math.max(
            priorities.Exploration,
            priorities.Collecte,
            priorities.Construction,
            priorities.Recherche,
            priorities.Relations,
          );
          if (currentEnergy < 24 || restScore > highestActiveDrive + Math.random() * 35) {
            target.copy(foxPivot.position);
            currentObject = null;
            lastAutonomousChoice = performance.now();
            onRest();
            onStatus("Je fais une pause courte et sûre avant de reprendre ma mission.");
            onAction("BlueFox se repose près d’un passage connu pour récupérer sans interrompre sa mission.");
            if (performance.now() - lastSpeechAt > 24000) {
              onSpeak("Je reprends quelques forces, puis je continue.");
              lastSpeechAt = performance.now();
            }
            return;
          }
          const candidates = placements.filter(([object]) => (
            object.scale.x > 0.2
            && discoveredMaps.has(object.userData.mapId as MapId)
          ));
          const scoreFor = (object: import("three").Object3D) => {
            const kind = object.userData.kind as string;
            const drive = kind === "crystal" || kind === "fiber"
              ? priorities.Collecte
              : kind === "parts" || kind === "structure"
                ? (priorities.Construction + priorities.Recherche) / 2
                : kind === "discovery"
                  ? (priorities.Exploration + priorities.Recherche) / 2
                  : priorities.Relations;
            const distancePenalty = Math.min(28, foxPivot.position.distanceTo(object.position) * 0.55);
            const novelty = object.userData.lastVisitedAt ? 0 : 18;
            return Math.max(2, drive + novelty - distancePenalty + Math.random() * 22);
          };
          const ranked = candidates
            .map(([object]) => ({ object, score: scoreFor(object) }))
            .sort((a, b) => b.score - a.score);
          const choice = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))].object;
          choice.userData.lastVisitedAt = Date.now();
          const approachDistance = (choice.userData.obstacleRadius || 0.3) + 0.75;
          target.copy(choice.position).add(new THREE.Vector3(approachDistance, 0, approachDistance * 0.35));
          currentObject = choice;
          actionStartedAt = 0;
          lastAutonomousChoice = performance.now();
          const kind = choice.userData.kind as string;
          const thought = kind === "crystal" ? "Ce cristal mérite une analyse plus précise…" : kind === "fiber" ? "Je vais vérifier l’état des plantes lumineuses." : kind === "parts" ? "Je veux comprendre à quoi servait cette ruine." : kind === "structure" ? "Cette arche pourrait ouvrir un passage vers l’autre versant." : kind === "discovery" ? "Je vais étudier ce bassin éloigné." : "Je vais essayer de mieux connaître cette créature.";
          onStatus(thought);
          onAction(thought);
        }
      }
      decorative.forEach((object, i) => {
        if (!object.userData.staticTerrain) {
          object.position.y = Math.sin(performance.now() * 0.0015 + i) * 0.035;
        }
      });
      for (let i = guidanceMarkers.length - 1; i >= 0; i--) {
        const marker = guidanceMarkers[i];
        const progress = Math.min(1, (performance.now() - marker.bornAt) / 1150);
        const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.08;
        marker.mesh.scale.setScalar(THREE.MathUtils.lerp(2.2, 0.28, progress) * pulse);
        (marker.mesh.material as import("three").MeshBasicMaterial).opacity = 0.92 * (1 - progress);
        if (progress >= 1) {
          scene.remove(marker.mesh);
          marker.mesh.geometry.dispose();
          (marker.mesh.material as import("three").Material).dispose();
          guidanceMarkers.splice(i, 1);
        }
      }
      controls.target.lerp(new THREE.Vector3(foxPivot.position.x, 1.1, foxPivot.position.z), 0.035);
      skyDome.position.set(foxPivot.position.x, 0, foxPivot.position.z);
      skyDome.rotation.y = -controls.getAzimuthalAngle() * 0.16;
      const nextMap: MapId = foxPivot.position.x < 32 ? "crystal" : "jungle";
      if (nextMap !== activeMap) {
        if (!discoveredMaps.has(nextMap) && pendingFirstExploration === nextMap && navigator.onLine) {
          rememberMap(nextMap);
          pendingFirstExploration = null;
          onAction(`Première exploration de la map « ${mapDefinitions[nextMap].name} » — ajoutée à la mémoire planétaire.`);
        }
        if (!discoveredMaps.has(nextMap)) {
          foxPivot.position.x = activeMap === "crystal" ? 31.45 : 32.55;
          target.copy(foxPivot.position);
          currentObject = null;
          onStatus("Je reste sur la map connue : ce passage doit d’abord être ouvert avec toi.");
        } else {
          activeMap = nextMap;
          onMapChange(activeMap);
          onAction(activeMap === "jungle" ? "BlueFox change de map vers les Ruines d’Émeraude." : "BlueFox revient sur la map de la Plaine des Cristaux.");
          onSpeak(activeMap === "jungle" ? "Nouvelle map mémorisée. Je distingue deux zones reliées dans les ruines." : "Je reviens vers l’abri et l’épave.");
        }
      }
      const nextZone = activeMap === "crystal"
        ? mapDefinitions.crystal.zones[0]
        : foxPivot.position.z >= 0 ? mapDefinitions.jungle.zones[0] : mapDefinitions.jungle.zones[1];
      if (nextZone !== activeZone) {
        activeZone = nextZone;
        onZoneChange(activeMap, activeZone);
        onAction(`BlueFox rejoint la zone « ${activeZone} » par un chemin mémorisé.`);
      }
      if (performance.now() - lastWorldSave > 3000) {
        localStorage.setItem("bluefox_world_position_v1", JSON.stringify({
          x: foxPivot.position.x,
          z: foxPivot.position.z,
          map: activeMap,
          savedAt: Date.now(),
        }));
        lastWorldSave = performance.now();
      }
      const speechNode = document.getElementById("bluefox-speech");
      if (speechNode && foxReady) {
        const head = new THREE.Vector3(foxPivot.position.x, foxPivot.position.y + 2.65, foxPivot.position.z).project(camera);
        speechNode.style.left = `${(head.x * 0.5 + 0.5) * renderer.domElement.clientWidth}px`;
        speechNode.style.top = `${(-head.y * 0.5 + 0.5) * renderer.domElement.clientHeight}px`;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    disposeScene = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      localStorage.setItem("bluefox_world_position_v1", JSON.stringify({
        x: foxPivot.position.x,
        z: foxPivot.position.z,
        map: activeMap,
        savedAt: Date.now(),
      }));
      guidanceMarkers.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as import("three").Material).dispose();
      });
      renderer.domElement.removeEventListener("pointerup", click);
      window.removeEventListener("bluefox:navigate", navigateByCompass);
      renderer.dispose();
      container.replaceChildren();
    };
    })().catch(() => {
      if (!disposed) {
        onStatus("Aperçu illustré actif — le moteur 3D n’a pas pu démarrer.");
      }
    });

    return () => {
      disposed = true;
      disposeScene?.();
    };
  }, [onAction, onCollect, onMapChange, onMapDiscovered, onRest, onSpeak, onStatus, onZoneChange]);

  return <div className="world-3d" ref={host} aria-label="Biome extraterrestre explorable en 3D" />;
}

export default function Home() {
  const [panel, setPanel] = useState<Panel>("none");
  const [activeMap, setActiveMap] = useState<MapId>("crystal");
  const [activeZone, setActiveZone] = useState(mapDefinitions.crystal.zones[0]);
  const [mapMemories, setMapMemories] = useState<MapMemory[]>([
    createMapMemory("crystal", 1, 0),
  ]);
  const [status, setStatus] = useState("Initialisation de l’expédition…");
  const [speech, setSpeech] = useState("");
  const speechTimer = useRef<number | null>(null);
  const [saveReady, setSaveReady] = useState(false);
  const [resources, setResources] = useState<Resources>({ crystal: 3, fiber: 2, parts: 0 });
  const [energy, setEnergy] = useState(82);
  const [zoomHint, setZoomHint] = useState(true);
  const [actions, setActions] = useState<ActionEvent[]>([
    { text: "Préparation de l’exploration autonome.", at: "08:42" },
  ]);
  const [priorities, setPriorities] = useState<PrioritySettings>(defaultPriorities);
  const [knowledge, setKnowledge] = useState(0);
  const [relations, setRelations] = useState(0);
  const [mission, setMission] = useState<MissionState>({
    id: "shelter",
    startedAt: Date.now(),
    reason: "BlueFox veut d’abord sécuriser l’épave.",
  });
  const [traits, setTraits] = useState({
    "Curieux — Prudent": 72,
    "Courageux — Craintif": 58,
    "Empathique — Indifférent": 71,
    "Respectueux — Destructeur": 88,
  });

  const collect = useCallback((kind: keyof Resources) => {
    setResources((current) => ({ ...current, [kind]: current[kind] + 1 }));
    setEnergy((current) => Math.max(10, current - 4));
    setStatus(kind === "crystal" ? "Cristal énergétique collecté." : kind === "fiber" ? "Fibres stellaires récupérées." : "Composant ancien sécurisé.");
  }, []);
  const rest = useCallback(() => {
    setEnergy((current) => Math.min(100, current + 9));
  }, []);

  const recordAction = useCallback((text: string) => {
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setActions((current) => [{ text, at }, ...current].slice(0, 50));
    const normalized = text.toLowerCase();
    if (/(analyse|observe|étud|mesure|découverte|ruine|flore|bassin)/.test(normalized)) {
      setKnowledge((current) => Math.min(99, current + 1));
    }
    if (/(créature|contact|lumo|relation|pacifique)/.test(normalized)) {
      setRelations((current) => Math.min(99, current + 1));
    }
  }, []);

  const speak = useCallback((text: string) => {
    setSpeech(text);
    if (speechTimer.current) window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(""), 4200);
  }, []);
  const handleMapChange = useCallback((nextMap: MapId) => setActiveMap(nextMap), []);
  const handleMapDiscovered = useCallback((mapId: MapId) => {
    setMapMemories((current) => current.some((entry) => entry.id === mapId)
      ? current
      : [...current, createMapMemory(mapId, current.length + 1)]);
  }, []);
  const handleZoneChange = useCallback((mapId: MapId, zoneName: string) => {
    setActiveZone(zoneName);
    setMapMemories((current) => current.map((entry) => entry.id !== mapId
      ? entry
      : {
        ...entry,
        visitedZones: entry.visitedZones.includes(zoneName)
          ? entry.visitedZones
          : [...entry.visitedZones, zoneName],
      }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setZoomHint(false), 8500);
    try {
      const saved = JSON.parse(localStorage.getItem("bluefox_odyssey_save_v1") || "null") as {
        resources?: Resources;
        energy?: number;
        actions?: ActionEvent[];
        priorities?: typeof priorities;
        traits?: typeof traits;
        knowledge?: number;
        relations?: number;
        mission?: MissionState;
      } | null;
      if (saved?.resources) setResources(saved.resources);
      if (typeof saved?.energy === "number") setEnergy(saved.energy);
      if (saved?.actions?.length) setActions(saved.actions.slice(0, 50));
      if (saved?.priorities) setPriorities(saved.priorities);
      if (saved?.traits) setTraits(saved.traits);
      if (typeof saved?.knowledge === "number") setKnowledge(saved.knowledge);
      if (typeof saved?.relations === "number") setRelations(saved.relations);
      if (saved?.mission?.id && missionDefinitions[saved.mission.id]) setMission(saved.mission);
      const savedMaps = JSON.parse(localStorage.getItem("bluefox_discovered_maps_v1") || "null") as MapMemory[] | null;
      if (savedMaps?.some((entry) => entry.id === "crystal")) {
        setMapMemories(savedMaps.map((entry, index) => ({
          ...createMapMemory(entry.id, entry.order || index + 1, entry.discoveredAt || Date.now()),
          ...entry,
          visitedZones: entry.visitedZones?.length ? entry.visitedZones : [mapDefinitions[entry.id].zones[0]],
        })));
      }
    } catch {
      localStorage.removeItem("bluefox_odyssey_save_v1");
    }
    const lastSeen = Number(localStorage.getItem("bluefox_last_seen") || Date.now());
    const awayMinutes = Math.floor((Date.now() - lastSeen) / 60000);
    if (awayMinutes >= 2) {
      const safeCycles = Math.min(8, Math.max(1, Math.floor(awayMinutes / 6)));
      const foundFiber = Math.ceil(safeCycles / 2);
      const foundCrystal = Math.floor(safeCycles / 3);
      setResources((current) => ({
        ...current,
        fiber: current.fiber + foundFiber,
        crystal: current.crystal + foundCrystal,
      }));
      setEnergy((current) => Math.max(36, current - safeCycles * 2));
      setActions((current) => [
        { text: `Pendant ton absence (${awayMinutes} min), BlueFox a patrouillé uniquement dans les maps connues, rapporté ${foundFiber} fibre(s)${foundCrystal ? ` et ${foundCrystal} cristal(aux)` : ""}, puis sécurisé le camp. Aucune première exploration ni décision majeure n’a été déclenchée.`, at: "REPRISE" },
        ...current,
      ].slice(0, 50));
    }
    setSaveReady(true);
    const save = window.setInterval(() => localStorage.setItem("bluefox_last_seen", String(Date.now())), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(save);
      if (speechTimer.current) window.clearTimeout(speechTimer.current);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    localStorage.setItem("bluefox_odyssey_save_v1", JSON.stringify({
      resources,
      energy,
      actions: actions.slice(0, 50),
      priorities,
      traits,
      knowledge,
      relations,
      mission,
      saveVersion: 3,
      mapMemories,
      lastSafeSimulationAt: Date.now(),
    }));
    localStorage.setItem("bluefox_discovered_maps_v1", JSON.stringify(mapMemories));
  }, [actions, energy, knowledge, mapMemories, mission, priorities, relations, resources, saveReady, traits]);

  const shelterProgress = Math.min(100, Math.round(
    (Math.min(resources.fiber, 5) / 5) * 55
    + Math.min(resources.parts, 1) * 25
    + (Math.min(resources.crystal, 3) / 3) * 20,
  ));
  const missionComplete = mission.id === "shelter"
    ? resources.fiber >= 5 && resources.parts >= 1
    : mission.id === "energy"
      ? resources.crystal >= 8 && resources.parts >= 2 && knowledge >= 4
      : mission.id === "flora"
        ? knowledge >= 8
        : relations >= 5;

  useEffect(() => {
    if (!saveReady || !missionComplete) return;
    const next = chooseNextMission(priorities, resources, knowledge, relations, mission.id);
    const completedTitle = missionDefinitions[mission.id].title;
    const nextTitle = missionDefinitions[next.id].title;
    setMission(next);
    recordAction(`Mission accomplie : « ${completedTitle} ». BlueFox choisit maintenant « ${nextTitle} » — ${next.reason}`);
    setStatus(`Nouvelle mission choisie par BlueFox : ${nextTitle}.`);
  }, [knowledge, mission.id, missionComplete, priorities, recordAction, relations, resources, saveReady]);

  const missionSteps = mission.id === "shelter"
    ? [
      { label: "Stabiliser une source d’énergie", detail: `${Math.min(resources.crystal, 3)}/3 cristaux`, done: resources.crystal >= 3 },
      { label: "Collecter des fibres", detail: `${Math.min(resources.fiber, 5)}/5 récupérées`, done: resources.fiber >= 5 },
      { label: "Analyser une structure", detail: resources.parts ? "Signal identifié" : "En attente", done: resources.parts >= 1 },
    ]
    : mission.id === "energy"
      ? [
        { label: "Comparer les cristaux", detail: `${Math.min(resources.crystal, 8)}/8 échantillons`, done: resources.crystal >= 8 },
        { label: "Étudier les composants", detail: `${Math.min(resources.parts, 2)}/2 composants`, done: resources.parts >= 2 },
        { label: "Valider une hypothèse", detail: `${Math.min(knowledge, 4)}/4 observations`, done: knowledge >= 4 },
      ]
      : mission.id === "flora"
        ? [
          { label: "Observer sans prélever", detail: `${Math.min(knowledge, 4)}/4 observations`, done: knowledge >= 4 },
          { label: "Comparer deux milieux", detail: mapMemories.length > 1 ? "Deux maps connues" : "Une seule map connue", done: mapMemories.length > 1 },
          { label: "Établir un cycle", detail: `${Math.min(knowledge, 8)}/8 données`, done: knowledge >= 8 },
        ]
        : [
          { label: "Approcher calmement", detail: `${Math.min(relations, 2)}/2 contacts`, done: relations >= 2 },
          { label: "Observer les réponses", detail: `${Math.min(relations, 4)}/4 signaux`, done: relations >= 4 },
          { label: "Mémoriser un lien", detail: `${Math.min(relations, 5)}/5 interactions`, done: relations >= 5 },
        ];
  const missionProgress = Math.round((missionSteps.filter((step) => step.done).length / missionSteps.length) * 100);
  const navigation: Record<Direction, { label: string; x: number; z: number; mapId: MapId }> = activeMap === "crystal"
    ? {
      north: { label: "veines septentrionales", x: 0, z: -20, mapId: "crystal" },
      west: { label: "crête occidentale", x: -20, z: 0, mapId: "crystal" },
      east: { label: "passage des Ruines", x: 46, z: 4, mapId: "jungle" },
      south: { label: "abri et épave", x: 0, z: 13, mapId: "crystal" },
    }
    : {
      north: { label: "clairière des stèles", x: 64, z: 16, mapId: "jungle" },
      west: { label: "retour vers la Plaine", x: 20, z: 2, mapId: "crystal" },
      east: { label: "lisière profonde", x: 84, z: 2, mapId: "jungle" },
      south: { label: "ruines noyées", x: 64, z: -16, mapId: "jungle" },
    };
  const suggestDirection = (direction: Direction) => {
    const destination = navigation[direction];
    window.dispatchEvent(new CustomEvent("bluefox:navigate", {
      detail: { ...destination, direction },
    }));
    setPanel("none");
  };

  const fullPage = panel === "planet" || panel === "journal";
  const intentSummary = energy < 35
    ? "Je vais bientôt me reposer pour économiser mes forces. Un long voyage nous attend, mais je termine d’abord mes observations sans risque."
    : mission.id === "shelter"
      ? "En ce moment, je réunis les fibres, cristaux et composants nécessaires au refuge. Je limite mes détours tant que le camp n’est pas suffisamment sûr."
      : mission.id === "energy"
        ? "Je compare les cristaux et les composants anciens pour concevoir une énergie douce. Je refuse de construire avant d’avoir validé mes mesures."
        : mission.id === "flora"
          ? "J’observe la flore dans plusieurs endroits pour comprendre son cycle. Je privilégie les mesures sans prélèvement."
          : "Je cherche à établir un contact pacifique. J’avance lentement et je compare les réactions avant de me rapprocher.";

  return (
    <main className="game-shell">
      <World3D
        onStatus={setStatus}
        onCollect={collect}
        onAction={recordAction}
        onSpeak={speak}
        onMapChange={handleMapChange}
        onMapDiscovered={handleMapDiscovered}
        onZoneChange={handleZoneChange}
        onRest={rest}
      />
      <div className="cinematic-vignette" />

      <header className="top-hud">
        <section className="brand-block">
          <div className="brand-mark">BF</div>
          <div>
            <p>BLUEFOX ODYSSEY</p>
            <strong>{mapDefinitions[activeMap].name} · {activeZone}</strong>
          </div>
        </section>
        <section className="day-block">
          <span>JOUR 01</span>
          <strong>08:42</strong>
          <small>Cycle calme · 17 °C</small>
        </section>
        <section className="meters">
          <label>
            <span>ÉNERGIE</span><b>{energy}%</b>
            <i><em style={{ width: `${energy}%` }} /></i>
          </label>
          <label>
            <span>ABRI</span><b>{shelterProgress}%</b>
            <i><em className="violet" style={{ width: `${shelterProgress}%` }} /></i>
          </label>
        </section>
      </header>

      <nav className="tool-rail" aria-label="Outils de l’expédition">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={panel === tool.id ? "active" : ""}
            onClick={() => setPanel((current) => (current === tool.id ? "none" : tool.id))}
            aria-label={tool.label}
          >
            <span>{tool.icon}</span>
            <small>{tool.label}</small>
          </button>
        ))}
      </nav>

      <nav className="compass-pad" aria-label="Suggestions de direction">
        <button className="north" onClick={() => suggestDirection("north")} aria-label={`Suggérer le nord : ${navigation.north.label}`}>N</button>
        <button className="west" onClick={() => suggestDirection("west")} aria-label={`Suggérer l’ouest : ${navigation.west.label}`}>O</button>
        <span title={activeZone}>BF</span>
        <button className="east" onClick={() => suggestDirection("east")} aria-label={`Suggérer l’est : ${navigation.east.label}`}>E</button>
        <button className="south" onClick={() => suggestDirection("south")} aria-label={`Suggérer le sud : ${navigation.south.label}`}>S</button>
      </nav>

      <aside className="mission-card">
        <div className="eyebrow">MISSION EN COURS</div>
        <h2>{missionDefinitions[mission.id].title}</h2>
        <p>{missionDefinitions[mission.id].description}</p>
        {missionSteps.map((step, index) => (
          <div className="mission-step" key={step.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><b>{step.label}</b><small>{step.detail}</small></div>
            <i className={step.done ? "done" : ""}>{step.done ? "✓" : "—"}</i>
          </div>
        ))}
        <div className="action-feed"><span>EN CE MOMENT</span><p>{actions[0]?.text}</p></div>
      </aside>

      <section className="intent-bar">
        <div><small>INTENTION ACTUELLE</small><strong>{intentSummary}</strong></div>
        <button onClick={() => { setStatus("Tu me suggères de revenir au camp. Je vais en tenir compte."); recordAction("Suggestion reçue : revenir près du camp."); }}>Suggérer le retour</button>
      </section>
      <div id="bluefox-speech" className={`speech-bubble ${speech ? "visible" : ""}`}>{speech}</div>

      {zoomHint && <div className="zoom-hint"><span>↕</span> Molette pour passer de la vue rapprochée à la vue stratégique</div>}

      {panel !== "none" && (
        <section className={fullPage ? "full-screen-panel" : "drawer"} role="dialog" aria-label={panelCopy[panel].title}>
          <button className="drawer-close" onClick={() => setPanel("none")}>×</button>
          <div className="eyebrow">TERMINAL D’EXPÉDITION</div>
          <h2>{panelCopy[panel].title}</h2>
          {panel === "planet" ? (
            <div className="planet-layout">
              <div className="planet-sphere">
                <div className="planet-clouds" />
                <span className="planet-marker marker-crystal">Map 01 · Crash</span>
                {mapMemories.some((entry) => entry.id === "jungle") && <span className="planet-marker marker-jungle">Map 02 · Ruines</span>}
              </div>
              <div>
                <p>{panelCopy.planet.text}</p>
                <div className="biome-zones">
                  <article className={activeMap === "crystal" ? "current" : ""}>
                    <div className="zone-image crystal-zone" />
                    <div><span>MAP 01 · 1 ZONE</span><b>Plaine des Cristaux</b><small>{activeMap === "crystal" ? "Position actuelle · Abri et épave" : "Mémorisée · Abri et épave"}</small></div>
                  </article>
                  <i><span>{mapMemories.some((entry) => entry.id === "jungle") ? "CHEMIN MÉMORISÉ" : "LIAISON NON CARTOGRAPHIÉE"}</span></i>
                  <article className={`${activeMap === "jungle" ? "current " : ""}${mapMemories.some((entry) => entry.id === "jungle") ? "" : "locked"}`}>
                    <div className="zone-image jungle-zone" />
                    <div><span>MAP 02 · 2 ZONES</span><b>{mapMemories.some((entry) => entry.id === "jungle") ? "Ruines d’Émeraude" : "Territoire inconnu"}</b><small>{activeMap === "jungle" ? "Position actuelle · Clairière et ruines" : mapMemories.some((entry) => entry.id === "jungle") ? "Mémorisée · Retour autonome autorisé" : "Première exploration uniquement en jeu"}</small></div>
                  </article>
                </div>
                <div className="map-grid">
                  <button className="north" onClick={() => suggestDirection("north")}>N<br /><small>{navigation.north.label}</small></button>
                  <button className="west" onClick={() => suggestDirection("west")}>O<br /><small>{navigation.west.label}</small></button>
                  <div className="map-core"><span>{activeZone}</span></div>
                  <button className="east" onClick={() => suggestDirection("east")}>E<br /><small>{navigation.east.label}</small></button>
                  <button className="south" onClick={() => suggestDirection("south")}>S<br /><small>{navigation.south.label}</small></button>
                </div>
              </div>
            </div>
          ) : panel === "journal" ? (
            <div className="journal-layout">
              <div className="journal-portrait" />
              <div className="journal-report">
                <div className="journal-heading">
                  <div><span className="eyebrow">SYNTHÈSE DU JOUR 01</span><h3>Une vallée qui s’éveille</h3></div>
                  <span className="emotion">ÉMOTION · Curiosité calme</span>
                </div>
                <p>Je poursuis l’installation du refuge sans brusquer l’écosystème. En ton absence, je limite mes décisions aux observations, au repos et aux collectes sans danger.</p>
                <div className="project-cards">
                  <article><span>MISSION EN COURS</span>{missionDefinitions[mission.id].title}<b>{missionProgress} %</b><small>{mission.reason}</small></article>
                  <article><span>PROJET À VENIR</span>{mission.id === "energy" ? "Collecteur autonome" : "Énergie douce"}<b>Hypothèse</b><small>Projet réévalué selon les ressources et les priorités</small></article>
                  <article><span>DÉCOUVERTE</span>Flore photoréactive<b>{Math.min(100, knowledge * 12)} %</b><small>{knowledge} observation{knowledge > 1 ? "s" : ""} structurée{knowledge > 1 ? "s" : ""}</small></article>
                </div>
                <div className="living-notes">
                  <article><span>RENCONTRE MÉMORABLE</span><b>Lumo, près de l’arche violette</b><p>La petite créature a répondu à mes signaux lumineux. Elle reste prudente, mais ne semble pas hostile.</p></article>
                  <article><span>EXPLORATION RÉCENTE</span><b>Le bassin des veines bleues</b><p>J’y ai observé des champignons translucides et une eau chargée de particules énergétiques.</p></article>
                </div>
                <h3>Les 50 dernières actions</h3>
                <div className="journal-list">{actions.map((action, i) => <p key={`${action.at}-${i}`}><time>{action.at}</time>{action.text}</p>)}</div>
              </div>
            </div>
          ) : (
            <>
              <p>{panelCopy[panel].text}</p>
              {panel === "inventory" && (
                <div className="inventory-grid">
                  <article><span>◆</span><b>{resources.crystal}</b><small>Cristaux</small></article>
                  <article><span>❧</span><b>{resources.fiber}</b><small>Fibres</small></article>
                  <article><span>⚙</span><b>{resources.parts}</b><small>Composants</small></article>
                </div>
              )}
              {panel === "research" && (
                <div className="research-list">
                  <article><span>ANALYSE EN COURS · {knowledge} DONNÉES</span><b>{mission.id === "flora" ? "Cycle de la flore photoréactive" : "Écosystème de la vallée"}</b><p>Je compare les observations mémorisées sans inventer de découverte pendant les absences.</p></article>
                  <article><span>AMBITION</span><b>{mission.id === "energy" ? "Convertisseur d’énergie douce" : "Collecteur autonome de fibres"}</b><p>{mission.reason}</p></article>
                  <article><span>CONCEPT · {relations} SIGNAUX RELATIONNELS</span><b>Protocole de contact prudent</b><p>J’adapte la distance d’approche selon les réactions déjà observées.</p></article>
                  <article><span>PROJET FUTUR</span><b>{mapMemories.length > 1 ? "Transport entre maps mémorisées" : "Préparer une future exploration"}</b><p>La première découverte d’une map restera impossible hors ligne et nécessitera ta présence.</p></article>
                </div>
              )}
              {panel === "settings" && (
                <div className="settings-content">
                  <h3>PRIORITÉS</h3>
                  {Object.entries(priorities).map(([name, value]) => <label className="slider-row" key={name}><span>{name}</span><input type="range" min="0" max="100" value={value} onChange={(e) => setPriorities((current) => ({ ...current, [name]: +e.target.value }))} /><b>{value}%</b></label>)}
                  <h3>PERSONNALITÉ</h3>
                  {Object.entries(traits).map(([name, value]) => <label className="slider-row trait-row" key={name}><span>{name}</span><input type="range" min="0" max="100" value={value} onChange={(e) => setTraits((current) => ({ ...current, [name]: +e.target.value }))} /><b>{value}%</b></label>)}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
