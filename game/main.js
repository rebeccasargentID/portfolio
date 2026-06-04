import * as THREE from "three";
import { buildWorld } from "./world.js";
import { createPlayer } from "./player.js";
import { ItemManager } from "./items.js";
import { UI } from "./ui.js";

/*
 * main.js
 * -------
 * Boots the renderer, builds the world, wires up the player and items, and
 * runs the game loop. Interaction (pick up / place / drop) lives here because
 * it ties the player position, the item manager, and the UI together.
 */

const ui = new UI();

// ----------------------------------------------------------- RENDERER
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ----------------------------------------------------------- SCENE / CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d12);
scene.fog = new THREE.Fog(0x0a0d12, 28, 55);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);

// ----------------------------------------------------------- LIGHTING
scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x40454c, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
scene.add(sun);

// Interior point lights so rooms aren't pitch black (exterior walls are black).
for (const [x, y, z] of [
  [-7, 2.6, -3], // 1F IT room
  [-6, 2.6, 3], // 1F reception
  [6, 2.6, 0], // 1F guest area
  [-6, 5.8, -2], // 2F office 1
  [6, 5.8, -2], // 2F office 2
  [0, 5.8, -4], // 2F closet
]) {
  const lamp = new THREE.PointLight(0xfff0dd, 0.6, 16, 1.6);
  lamp.position.set(x, y, z);
  scene.add(lamp);
}

// ----------------------------------------------------------- WORLD + ENTITIES
const world = buildWorld(scene);
const player = createPlayer(camera, renderer.domElement, world);
const items = new ItemManager(scene, world);
items.spawnAll();

// Total rack slots across both closets, for the HUD progress readout.
const totalSlots = world.racks.reduce((n, r) => n + r.slots.length, 0);
ui.setRacked(0, totalSlots);

// ----------------------------------------------------------- START / PAUSE
ui.startBtn.addEventListener("click", () => player.controls.lock());
player.controls.addEventListener("lock", () => ui.showGame(true));
player.controls.addEventListener("unlock", () => ui.showGame(false));

// ----------------------------------------------------------- INTERACTION (E / Q)
document.addEventListener("keydown", (e) => {
  if (!player.controls.isLocked) return;

  if (e.code === "KeyE") {
    const pos = camera.position;
    if (items.held) {
      // Holding something: try to rack it.
      const rack = items.findNearestRack(pos);
      if (rack) {
        items.placeInRack(rack, camera);
        ui.setHeld(null);
        ui.setRacked(items.rackedCount, totalSlots);
      }
    } else {
      // Empty-handed: try to pick something up.
      const item = items.findNearestPickup(pos);
      if (item) {
        items.pickUp(item, camera);
        ui.setHeld(item.userData.def.name);
      }
    }
  }

  if (e.code === "KeyQ" && items.held) {
    items.drop(camera);
    ui.setHeld(null);
  }
});

// ----------------------------------------------------------- RESIZE
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------- GAME LOOP
const clock = new THREE.Clock();
let lastFloor = 1;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); // clamp big frame gaps

  player.update(dt);

  if (player.controls.isLocked) {
    updatePrompt();
    const floor = player.currentFloor();
    if (floor !== lastFloor) {
      lastFloor = floor;
      ui.setLocation(floor === 2 ? "Second Floor" : "First Floor");
    }
  }

  renderer.render(scene, camera);
}

// Context-sensitive prompt at the bottom of the screen.
function updatePrompt() {
  const pos = camera.position;
  if (items.held) {
    const rack = items.findNearestRack(pos);
    if (rack) {
      const def = items.held.userData.def;
      const note = def.rackable ? "" : " (not rack gear, but ok)";
      ui.setPrompt(`<b>E</b> Place ${def.name} in rack${note}`);
    } else {
      ui.setPrompt(`<b>Q</b> Drop ${items.held.userData.def.name}`);
    }
  } else {
    const item = items.findNearestPickup(pos);
    ui.setPrompt(item ? `<b>E</b> Pick up ${item.userData.def.name}` : "");
  }
}

animate();
