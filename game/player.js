import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

/*
 * player.js
 * ---------
 * First-person controller: WASD movement, mouse look (via PointerLockControls),
 * circle-vs-box wall collision, and ground following so the player walks on the
 * floor and climbs the stair ramp between storeys.
 */

const EYE_HEIGHT = 1.6;
const RADIUS = 0.35; // player's body radius for collision
const WALK_SPEED = 4.0; // m/s
const SPRINT_SPEED = 7.0;
const GRAVITY = 14.0; // how fast you fall toward the ground below you

export function createPlayer(camera, domElement, world) {
  const controls = new PointerLockControls(camera, domElement);

  const start = world.spawnPoint;
  camera.position.set(start.x, start.y + EYE_HEIGHT, start.z);

  const keys = Object.create(null);
  const onKeyDown = (e) => (keys[e.code] = true);
  const onKeyUp = (e) => (keys[e.code] = false);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // scratch vectors (reused each frame to avoid allocations)
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  let velocityY = 0;

  function update(dt) {
    if (!controls.isLocked) return;

    // --- desired horizontal movement, relative to where we're looking ---
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    move.set(0, 0, 0);
    if (keys["KeyW"] || keys["ArrowUp"]) move.add(forward);
    if (keys["KeyS"] || keys["ArrowDown"]) move.sub(forward);
    if (keys["KeyD"] || keys["ArrowRight"]) move.add(right);
    if (keys["KeyA"] || keys["ArrowLeft"]) move.sub(right);

    const speed = keys["ShiftLeft"] || keys["ShiftRight"] ? SPRINT_SPEED : WALK_SPEED;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
    }

    const pos = camera.position;

    // --- move on X, resolve collisions, then move on Z, resolve again ---
    pos.x += move.x;
    resolveCollisions(pos, world.colliders, "x");
    pos.z += move.z;
    resolveCollisions(pos, world.colliders, "z");

    // --- follow the ground (and climb stairs) ---
    const feetY = pos.y - EYE_HEIGHT;
    const ground = world.groundHeightAt(pos.x, pos.z, feetY);

    if (ground === null) {
      // No surface under us (over the stairwell shaft): fall.
      velocityY -= GRAVITY * dt;
      pos.y += velocityY * dt;
    } else if (feetY <= ground + 0.001) {
      // On or stepping up onto the ground.
      pos.y = ground + EYE_HEIGHT;
      velocityY = 0;
    } else {
      // Above the ground: fall toward it but don't overshoot.
      velocityY -= GRAVITY * dt;
      const nextFeet = Math.max(ground, feetY + velocityY * dt);
      pos.y = nextFeet + EYE_HEIGHT;
      if (nextFeet === ground) velocityY = 0;
    }

    // Safety net: if we somehow fall out of the world, respawn.
    if (pos.y < -20) respawn();
  }

  // Push the player (a circle of RADIUS) out of any wall box it overlaps.
  function resolveCollisions(pos, colliders, axis) {
    const feetY = pos.y - EYE_HEIGHT;
    const headY = pos.y + 0.1;
    for (const c of colliders) {
      // Skip walls we're fully above or below (different storey).
      if (headY < c.minY || feetY > c.maxY) continue;

      const nearestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
      const nearestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - nearestX;
      const dz = pos.z - nearestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > RADIUS * RADIUS) continue; // not touching

      if (distSq > 1e-8) {
        // Outside the box: push straight out along the contact normal.
        const dist = Math.sqrt(distSq);
        const push = RADIUS - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      } else {
        // Center is inside the box: push out the shortest way on this axis.
        if (axis === "x") {
          const toLeft = pos.x - c.minX;
          const toRight = c.maxX - pos.x;
          pos.x += toLeft < toRight ? -(toLeft + RADIUS) : toRight + RADIUS;
        } else {
          const toNorth = pos.z - c.minZ;
          const toSouth = c.maxZ - pos.z;
          pos.z += toNorth < toSouth ? -(toNorth + RADIUS) : toSouth + RADIUS;
        }
      }
    }
  }

  function respawn() {
    velocityY = 0;
    camera.position.set(start.x, start.y + EYE_HEIGHT, start.z);
  }

  function dispose() {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  }

  // Which floor are we on? (for the HUD)
  function currentFloor() {
    return camera.position.y - EYE_HEIGHT > world.floor2Y - 1 ? 2 : 1;
  }

  return { controls, update, respawn, dispose, currentFloor };
}
