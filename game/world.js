import * as THREE from "three";

/*
 * world.js
 * --------
 * Builds the two-storey office from the blueprint and returns everything the
 * rest of the game needs: collision boxes, walkable floor surfaces, the two
 * equipment racks, item spawn points, and a helper that tells the player how
 * high the ground is at any (x, z).
 *
 * Coordinate system (metres), matching the 20m x 12m blueprint:
 *   x: -10 (west / left)  ->  +10 (east / right)
 *   z:  -6 (north / top)  ->  +6  (south / bottom)
 *   y:   0 (first floor)  ->  3.2 (second floor)
 */

export const FLOOR2_Y = 3.2; // height of the second floor slab
const WALL_H = 3.0; // height of one storey's walls
const T = 0.2; // wall thickness
const HALF_W = 10;
const HALF_D = 6;

// Stair ramp: you walk NORTH (toward -z) while climbing from floor 1 to floor 2.
const RAMP = {
  minX: -1.6,
  maxX: 1.6,
  zBottom: 2.5, // start of climb (y = 0)
  zTop: -2.0, // top of climb (y = FLOOR2_Y)
};

// Materials reused across the building
const MAT = {
  exterior: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 }),
  interior: new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.95 }),
  railing: new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.8 }),
  floor1: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, roughness: 1 }),
  floor2: new THREE.MeshStandardMaterial({ color: 0xb3b8d6, roughness: 1 }),
  stair: new THREE.MeshStandardMaterial({ color: 0x6b7077, roughness: 0.95 }),
  furniture: new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8 }),
  desk: new THREE.MeshStandardMaterial({ color: 0x9aa0a7, roughness: 0.85 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.9 }),
  plantPot: new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.9 }),
  plantLeaf: new THREE.MeshStandardMaterial({ color: 0x2e8b3d, roughness: 0.8 }),
  rack: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.3 }),
};

export function buildWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const colliders = []; // axis-aligned boxes the player cannot pass through
  const flatSlabs = []; // walkable horizontal surfaces {minX,maxX,minZ,maxZ,y}

  // --- helper: add a solid box that is both visible and a collider ---
  function addWall(x1, z1, x2, z2, yBase, height, material, { solid = true } = {}) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const w = Math.max(maxX - minX, T);
    const d = Math.max(maxZ - minZ, T);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), material);
    mesh.position.set((minX + maxX) / 2, yBase + height / 2, (minZ + maxZ) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) {
      colliders.push({ minX, maxX, minZ, maxZ, minY: yBase, maxY: yBase + height });
    }
    return mesh;
  }

  // --- helper: add a flat floor/ceiling slab ---
  function addSlab(minX, minZ, maxX, maxZ, y, material, { walkable = true } = {}) {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, T, d), material);
    mesh.position.set((minX + maxX) / 2, y - T / 2, (minZ + maxZ) / 2);
    mesh.receiveShadow = true;
    group.add(mesh);
    if (walkable) flatSlabs.push({ minX, maxX, minZ, maxZ, y });
  }

  // ============================================================== FLOORS
  // First-floor slab covers the whole footprint.
  addSlab(-HALF_W, -HALF_D, HALF_W, HALF_D, 0, MAT.floor1);

  // Second-floor slabs: the two offices + the central wiring-closet block.
  // The southern-central area is left OPEN as the stairwell shaft.
  addSlab(-HALF_W, -HALF_D, -3, HALF_D, FLOOR2_Y, MAT.floor2); // Office 1 (west)
  addSlab(3, -HALF_D, HALF_W, HALF_D, FLOOR2_Y, MAT.floor2); // Office 2 (east)
  addSlab(-3, -HALF_D, 3, RAMP.zTop, FLOOR2_Y, MAT.floor2); // center closet/landing

  // ====================================================== EXTERIOR WALLS
  // Black exterior, full building height (both storeys).
  const EXT_H = FLOOR2_Y + WALL_H;
  addWall(-HALF_W, -HALF_D, HALF_W, -HALF_D, 0, EXT_H, MAT.exterior); // north
  addWall(-HALF_W, HALF_D, HALF_W, HALF_D, 0, EXT_H, MAT.exterior); // south
  addWall(-HALF_W, -HALF_D, -HALF_W, HALF_D, 0, EXT_H, MAT.exterior); // west
  addWall(HALF_W, -HALF_D, HALF_W, HALF_D, 0, EXT_H, MAT.exterior); // east

  // ================================================ FIRST-FLOOR PARTITIONS
  // Vertical wall at x = -3 (west rooms | center), with a doorway near z = 0.
  addWall(-3, -HALF_D, -3, -0.8, 0, WALL_H, MAT.interior);
  addWall(-3, 0.8, -3, HALF_D, 0, WALL_H, MAT.interior);
  // Vertical wall at x = 3 (center | guest area), with a doorway near z = 0.
  addWall(3, -HALF_D, 3, -0.8, 0, WALL_H, MAT.interior);
  addWall(3, 0.8, 3, HALF_D, 0, WALL_H, MAT.interior);
  // Horizontal wall at z = 0 splitting Wiring Closet (north) and Reception
  // (south), with a doorway near x = -8.5.
  addWall(-HALF_W, 0, -9, 0, 0, WALL_H, MAT.interior);
  addWall(-7.5, 0, -3, 0, 0, WALL_H, MAT.interior);

  // =============================================== SECOND-FLOOR PARTITIONS
  // Office 1 | center: wall at x = -3 with a doorway at the landing (z -3..-2).
  addWall(-3, -HALF_D, -3, -3, FLOOR2_Y, WALL_H, MAT.interior);
  addWall(-3, -2, -3, HALF_D, FLOOR2_Y, WALL_H, MAT.interior);
  // center | Office 2: wall at x = 3 with a matching doorway.
  addWall(3, -HALF_D, 3, -3, FLOOR2_Y, WALL_H, MAT.interior);
  addWall(3, -2, 3, HALF_D, FLOOR2_Y, WALL_H, MAT.interior);

  // Railings around the open stairwell so you don't walk off the second floor.
  // North edge of the shaft (z = RAMP.zTop) either side of the stair opening.
  addWall(-3, RAMP.zTop, RAMP.minX, RAMP.zTop, FLOOR2_Y, 1.1, MAT.railing);
  addWall(RAMP.maxX, RAMP.zTop, 3, RAMP.zTop, FLOOR2_Y, 1.1, MAT.railing);

  // ===================================================== STAIRS (visual)
  // A flight of steps sitting under the invisible climb ramp, for looks.
  const steps = 12;
  const run = (RAMP.zBottom - RAMP.zTop) / steps;
  for (let i = 0; i < steps; i++) {
    const z = RAMP.zBottom - run * (i + 0.5);
    const h = FLOOR2_Y * ((i + 1) / steps);
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(RAMP.maxX - RAMP.minX, h, run + 0.02),
      MAT.stair
    );
    step.position.set(0, h / 2, z);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }

  // ============================================================ FURNITURE
  addFurniture(group);

  // ================================================================ RACKS
  // Two racks: one in each wiring closet. Each faces south (+z) so you walk up
  // to the front of it. Slots are stacked vertically (rack units).
  const racks = [
    makeRack(group, { x: -8.2, z: -4.6, baseY: 0, label: "MDF Rack" }), // 1F IT room
    makeRack(group, { x: 0, z: -4.8, baseY: FLOOR2_Y, label: "IDF Rack" }), // 2F closet
  ];
  // Racks themselves are colliders.
  for (const r of racks) colliders.push(r.collider);

  // ====================================================== ITEM SPAWN POINTS
  // Gear scattered across both floors for the player to collect.
  const itemSpawns = [
    { type: "router", x: -6.5, z: -3.5, y: 0 }, // IT room
    { type: "switch", x: -5.0, z: -2.0, y: 0 }, // IT room
    { type: "patch_panel", x: -7.5, z: 4.5, y: 0 }, // reception
    { type: "desktop_pc", x: -4.5, z: 4.2, y: 0 }, // reception
    { type: "ip_phone", x: -3.6, z: 2.0, y: 0 }, // reception
    { type: "patch_cable", x: 6.5, z: -3.5, y: 0 }, // guest area
    { type: "wifi_ap", x: 7.5, z: 3.5, y: 0 }, // guest area
    { type: "cable_mgmt", x: -7.0, z: 2.5, y: FLOOR2_Y }, // office 1
    { type: "pdu", x: -5.0, z: -3.0, y: FLOOR2_Y }, // office 1
    { type: "patch_cable", x: 6.5, z: 2.5, y: FLOOR2_Y }, // office 2
    { type: "ip_phone", x: 7.5, z: -3.0, y: FLOOR2_Y }, // office 2
    { type: "wifi_ap", x: 0.0, z: -4.0, y: FLOOR2_Y }, // 2F closet
  ];

  // ============================================ GROUND-HEIGHT QUERY
  // Returns the height of the surface the player is standing on at (x, z),
  // given how high they currently are. Lets them climb the stair ramp without
  // teleporting up onto the floor above.
  const STEP_UP = 0.6;

  function rampHeightAt(z) {
    const t = (RAMP.zBottom - z) / (RAMP.zBottom - RAMP.zTop);
    return THREE.MathUtils.clamp(t, 0, 1) * FLOOR2_Y;
  }

  function groundHeightAt(x, z, currentY) {
    let best = -Infinity;
    for (const s of flatSlabs) {
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) {
        if (s.y <= currentY + STEP_UP) best = Math.max(best, s.y);
      }
    }
    if (x >= RAMP.minX && x <= RAMP.maxX && z >= RAMP.zTop && z <= RAMP.zBottom) {
      const h = rampHeightAt(z);
      if (h <= currentY + STEP_UP) best = Math.max(best, h);
    }
    return best === -Infinity ? null : best;
  }

  return {
    group,
    colliders,
    racks,
    itemSpawns,
    groundHeightAt,
    floor2Y: FLOOR2_Y,
    spawnPoint: new THREE.Vector3(-6, 0, 4.5), // start in reception
  };
}

// ----------------------------------------------------------------- RACKS
function makeRack(group, { x, z, baseY, label }) {
  const rack = new THREE.Group();
  rack.position.set(x, baseY, z);
  group.add(rack);

  const W = 1.0; // width
  const D = 0.9; // depth
  const H = 2.0; // height

  // Back + sides + top + bottom panels
  const panel = (w, h, d, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.rack);
    m.position.set(px, py, pz);
    m.castShadow = true;
    rack.add(m);
  };
  panel(W, H, 0.05, 0, H / 2, -D / 2); // back
  panel(0.05, H, D, -W / 2, H / 2, 0); // left
  panel(0.05, H, D, W / 2, H / 2, 0); // right
  panel(W, 0.05, D, 0, H, 0); // top
  panel(W, 0.05, D, 0, 0.02, 0); // bottom

  rack.add(makeTextSprite(label, 0x7fd1ff, 2.4));

  // Slot positions (front-facing). Items snap here. Front of rack is +z.
  const slotCount = 6;
  const slots = [];
  for (let i = 0; i < slotCount; i++) {
    const sy = 0.35 + (i / (slotCount - 1)) * (H - 0.7);
    slots.push({
      filled: false,
      position: new THREE.Vector3(x, baseY + sy, z + D / 2 - 0.18),
    });
  }

  return {
    group: rack,
    position: new THREE.Vector3(x, baseY, z),
    slots,
    collider: {
      minX: x - W / 2,
      maxX: x + W / 2,
      minZ: z - D / 2,
      maxZ: z + D / 2,
      minY: baseY,
      maxY: baseY + H,
    },
    nextFreeSlot() {
      return this.slots.find((s) => !s.filled) || null;
    },
  };
}

// ------------------------------------------------------------- FURNITURE
function addFurniture(group) {
  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  const desk = (x, z, y = 0) => {
    box(1.6, 0.75, 0.8, x, y, z, MAT.desk); // desktop
    box(0.4, 0.45, 0.05, x, y + 0.75, z - 0.3, MAT.furniture); // monitor
  };

  const plant = (x, z, y = 0) => {
    box(0.3, 0.3, 0.3, x, y, z, MAT.plantPot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), MAT.plantLeaf);
    leaf.position.set(x, y + 0.6, z);
    leaf.castShadow = true;
    group.add(leaf);
  };

  // --- FIRST FLOOR ---
  desk(-7.5, -3.5); // IT room desk
  plant(-9.2, -5.2); // IT room plant

  // Reception: an L-shaped desk
  box(2.6, 0.75, 0.7, -6.5, 0, 3.0, MAT.desk);
  box(0.7, 0.75, 2.0, -8.0, 0, 4.0, MAT.desk);

  // Guest area: sofas + coffee table + meeting table with chairs
  box(2.4, 0.6, 0.9, 6.5, 0, -4.8, MAT.sofa); // long sofa (north)
  box(0.9, 0.6, 1.0, 4.6, 0, -3.6, MAT.sofa); // armchair
  box(0.9, 0.6, 1.0, 8.4, 0, -3.6, MAT.sofa); // armchair
  box(1.4, 0.35, 0.7, 6.5, 0, -3.4, MAT.furniture); // coffee table
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.75, 20), MAT.desk);
  table.position.set(7.0, 0.375, 3.5);
  table.castShadow = true;
  group.add(table);
  for (let a = 0; a < 4; a++) {
    const ang = (a / 4) * Math.PI * 2;
    box(0.45, 0.9, 0.45, 7.0 + Math.cos(ang) * 1.4, 0, 3.5 + Math.sin(ang) * 1.4, MAT.furniture);
  }
  plant(9.2, -5.2);

  // --- SECOND FLOOR ---
  desk(-7.0, -3.5, FLOOR2_Y); // Office 1 desk
  box(0.7, 1.6, 1.6, -9.4, FLOOR2_Y, 3.5, MAT.furniture); // Office 1 cabinet
  plant(-9.2, -5.2, FLOOR2_Y);

  desk(7.0, -3.5, FLOOR2_Y); // Office 2 desk
  box(0.7, 1.6, 1.6, 9.4, FLOOR2_Y, 3.5, MAT.furniture); // Office 2 cabinet
  plant(9.2, -5.2, FLOOR2_Y);
}

// --------------------------------------------------- TEXT LABEL SPRITES
// Builds a floating text label as a sprite (used for racks and items).
export function makeTextSprite(text, color = 0xffffff, yOffset = 0.9) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = 48;
  ctx.font = `bold ${font}px Segoe UI, sans-serif`;
  const w = ctx.measureText(text).width + 40;
  canvas.width = w;
  canvas.height = font + 28;

  ctx.font = `bold ${font}px Segoe UI, sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 14);
  ctx.fill();

  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true })
  );
  const scale = 0.0045;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.position.set(0, yOffset, 0);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
