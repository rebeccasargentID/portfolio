import * as THREE from "three";
import { makeTextSprite } from "./world.js";

/*
 * items.js
 * --------
 * Defines the network gear, spawns it in the world, and handles picking it up,
 * holding it in front of the camera, dropping it, and snapping it into rack
 * slots in the wiring closets.
 */

// Each item type: a friendly name, colour, rough size (m), and whether it is
// meant to live in a rack. "rackable: false" items (PCs, phones, APs) can still
// be carried, but the game nudges you that they aren't rack equipment.
export const ITEM_TYPES = {
  router: { name: "Router", color: 0x2f6fed, size: [0.7, 0.15, 0.5], rackable: true },
  switch: { name: "Switch", color: 0x2fae57, size: [0.7, 0.12, 0.5], rackable: true },
  patch_panel: { name: "Patch Panel", color: 0x444b55, size: [0.7, 0.1, 0.45], rackable: true },
  cable_mgmt: { name: "Cable Manager", color: 0x9aa0a7, size: [0.7, 0.1, 0.3], rackable: true },
  pdu: { name: "PDU / Power Strip", color: 0x1c1c1c, size: [0.7, 0.1, 0.3], rackable: true },
  patch_cable: { name: "Patch Cables", color: 0xf2c521, size: [0.3, 0.25, 0.3], rackable: true },
  desktop_pc: { name: "Desktop PC", color: 0xd8d2c4, size: [0.25, 0.5, 0.5], rackable: false },
  ip_phone: { name: "IP Phone", color: 0x2a2d33, size: [0.3, 0.12, 0.28], rackable: false },
  wifi_ap: { name: "Wireless AP", color: 0xf4f6f8, size: [0.45, 0.1, 0.45], rackable: false },
};

export class ItemManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.items = []; // all loose (pickup-able) items in the world
    this.held = null; // the item currently in the player's hands
    this.rackedCount = 0;
  }

  spawnAll() {
    for (const spawn of this.world.itemSpawns) {
      this.spawnItem(spawn.type, spawn.x, spawn.y, spawn.z);
    }
  }

  spawnItem(type, x, y, z) {
    const def = ITEM_TYPES[type];
    if (!def) return;
    const [w, h, d] = def.size;

    const obj = new THREE.Group();

    let body;
    if (type === "wifi_ap") {
      body = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, w / 2, h, 18),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.5 })
      );
    } else if (type === "patch_cable") {
      body = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.05, 10, 20),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 })
      );
      body.rotation.x = Math.PI / 2;
    } else {
      body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.5, metalness: 0.1 })
      );
    }
    body.castShadow = true;
    obj.add(body);

    // Floating name tag above the item
    obj.add(makeTextSprite(def.name, 0xffffff, Math.max(h, 0.25) + 0.35));

    obj.position.set(x, y + h / 2 + 0.02, z);
    obj.userData = { type, def, racked: false };
    this.scene.add(obj);
    this.items.push(obj);
    return obj;
  }

  // Nearest loose item within `range` metres of the player on roughly the same
  // floor (so you don't grab something on the storey below through the floor).
  findNearestPickup(playerPos, range = 1.8) {
    let best = null;
    let bestD = range * range;
    for (const item of this.items) {
      if (item === this.held) continue;
      if (Math.abs(item.position.y - playerPos.y) > 1.6) continue; // different floor
      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  // Nearest rack with a free slot, within range.
  findNearestRack(playerPos, range = 2.2) {
    let best = null;
    let bestD = range * range;
    for (const rack of this.world.racks) {
      if (!rack.nextFreeSlot()) continue;
      if (Math.abs(rack.position.y - playerPos.y) > 1.6) continue;
      const dx = rack.position.x - playerPos.x;
      const dz = rack.position.z - playerPos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = rack;
      }
    }
    return best;
  }

  pickUp(item, camera) {
    if (this.held) return;
    this.held = item;
    item.userData.racked = false;
    // Re-parent to the camera so it follows the view, held low and to the right.
    camera.add(item);
    item.position.set(0.45, -0.35, -0.9);
    item.rotation.set(0, 0, 0);
  }

  drop(camera) {
    if (!this.held) return;
    const item = this.held;
    const worldPos = new THREE.Vector3();
    item.getWorldPosition(worldPos);
    camera.remove(item);
    this.scene.add(item);
    // Drop it on the ground just in front of the player.
    const ground = this.world.groundHeightAt(worldPos.x, worldPos.z, camera.position.y) ?? 0;
    const h = item.userData.def.size[1];
    item.position.set(worldPos.x, ground + h / 2 + 0.02, worldPos.z);
    item.rotation.set(0, 0, 0);
    this.held = null;
  }

  // Place the held item into a rack's next free slot. Returns true on success.
  placeInRack(rack, camera) {
    if (!this.held) return false;
    const slot = rack.nextFreeSlot();
    if (!slot) return false;

    const item = this.held;
    camera.remove(item);
    this.scene.add(item);
    item.position.copy(slot.position);
    item.rotation.set(0, 0, 0);
    slot.filled = true;
    item.userData.racked = true;
    this.held = null;
    this.rackedCount++;
    return true;
  }
}
