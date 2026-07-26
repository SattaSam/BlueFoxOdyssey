import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function createScene(container = document.body, options = {}) {
  const onStatus =
    typeof options.onStatus === "function" ? options.onStatus : () => {};

  if (window.location.protocol === "file:") {
    throw new Error(
      "Le projet doit être lancé depuis un serveur HTTP local, pas avec file://."
    );
  }

  onStatus("Création du moteur 3D…");

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec9f2);
  scene.fog = new THREE.Fog(0x8ec9f2, 35, 100);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  camera.position.set(5, 3.2, 7);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);
  controls.minDistance = 2.5;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.49;

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x294a38, 2.5);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(8, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(45, 96),
    new THREE.MeshStandardMaterial({
      color: 0x4f8d54,
      roughness: 0.92,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(40, 40, 0x315d41, 0x477754);
  grid.position.y = 0.01;
  scene.add(grid);

  onStatus("Chargement de BlueFoxMODEL.glb…");

  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      "./models/BlueFoxMODEL.glb",
      resolve,
      (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          onStatus(`Chargement du modèle : ${percent} %`);
        }
      },
      reject
    );
  });

  const fox = gltf.scene;
  fox.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const originalBox = new THREE.Box3().setFromObject(fox);
  const originalSize = originalBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z);

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("Dimensions invalides pour BlueFoxMODEL.glb.");
  }

  const desiredHeight = 2.2;
  fox.scale.setScalar(desiredHeight / originalSize.y);

  const scaledBox = new THREE.Box3().setFromObject(fox);
  const center = scaledBox.getCenter(new THREE.Vector3());
  fox.position.x -= center.x;
  fox.position.z -= center.z;
  fox.position.y -= scaledBox.min.y;

  scene.add(fox);

  const finalBox = new THREE.Box3().setFromObject(fox);
  const finalCenter = finalBox.getCenter(new THREE.Vector3());
  controls.target.copy(finalCenter);

  if (Array.isArray(gltf.animations) && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(fox);
    mixer.clipAction(gltf.animations[0]).play();
    fox.userData.mixer = mixer;
    onStatus(
      `BlueFox chargé — ${gltf.animations.length} animation(s) détectée(s).`
    );
  } else {
    onStatus("BlueFox chargé — aucune animation intégrée détectée.");
  }

  const clock = new THREE.Clock();

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    if (fox.userData.mixer) {
      fox.userData.mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  return {
    renderer,
    scene,
    camera,
    controls,
    fox,
    animations: gltf.animations
  };
}
