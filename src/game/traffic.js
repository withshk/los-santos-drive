import * as THREE from 'three';
import { H_ROADS, V_ROADS } from './constants.js';
import { buildVehicleMesh } from './vehicle.js';

const TRAFFIC_PALETTES = [
  { color: 0xfacc15, accent: 0x111827, bodyStyle: 'muscle', width: 2.0, length: 4.5, height: 1.45 }, // Los Santos Taxi!
  { color: 0xe2e8f0, accent: 0x94a3b8, bodyStyle: 'coupe', width: 1.95, length: 4.3, height: 1.35 },
  { color: 0x2563eb, accent: 0x1e3a8a, bodyStyle: 'muscle', width: 2.0, length: 4.5, height: 1.4 },
  { color: 0x16a34a, accent: 0x14532d, bodyStyle: 'suv', width: 2.15, length: 4.7, height: 1.72 },
  { color: 0xf97316, accent: 0x7c2d12, bodyStyle: 'coupe', width: 1.95, length: 4.2, height: 1.32 },
  { color: 0x475569, accent: 0x1e293b, bodyStyle: 'suv', width: 2.2, length: 4.8, height: 1.78 },
  { color: 0x9333ea, accent: 0x581c87, bodyStyle: 'muscle', width: 2.0, length: 4.5, height: 1.38 },
  { color: 0xef4444, accent: 0x7f1d1d, bodyStyle: 'coupe', width: 1.96, length: 4.3, height: 1.34 },
];

const LSPD_SPEC = {
  color: 0x111622,
  accent: 0xffffff,
  bodyStyle: 'police',
  width: 2.12,
  length: 4.85,
  height: 1.48,
  isPolice: true,
};

export class TrafficAndPoliceManager {
  constructor(scene) {
    this.scene = scene;
    this.civilians = [];
    this.cops = [];

    this.wantedLevel = 0; // 0..5
    this.wantedCooldown = 0;
    this.evading = false;
    this.evadeTimer = 0;
    this.bustedTimer = 0;
    this.crimeHeat = 0;

    this.spawnInitialTraffic(26);
  }

  spawnInitialTraffic(count) {
    for (let i = 0; i < count; i++) {
      const spec = TRAFFIC_PALETTES[i % TRAFFIC_PALETTES.length];
      const parts = buildVehicleMesh(spec, true);
      const axis = i % 2 === 0 ? 'V' : 'H';
      const dir = Math.random() > 0.5 ? 1 : -1;
      const laneOffset = 4.6;

      let x = 0;
      let z = 0;
      let yaw = 0;

      if (axis === 'V') {
        const roadX = V_ROADS[i % V_ROADS.length];
        x = roadX + (dir === 1 ? -laneOffset : laneOffset);
        z = H_ROADS[0] + Math.random() * (H_ROADS[H_ROADS.length - 1] - H_ROADS[0]);
        yaw = dir === 1 ? 0 : Math.PI;
      } else {
        const roadZ = H_ROADS[i % H_ROADS.length];
        z = roadZ + (dir === 1 ? laneOffset : -laneOffset);
        x = V_ROADS[0] + Math.random() * (V_ROADS[V_ROADS.length - 1] - V_ROADS[0]);
        yaw = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      parts.root.position.set(x, 0, z);
      parts.root.rotation.y = yaw;
      this.scene.add(parts.root);

      this.civilians.push({
        parts,
        spec,
        pos: new THREE.Vector3(x, 0, z),
        vel: new THREE.Vector3(),
        axis,
        dir,
        yaw,
        baseSpeed: 12 + Math.random() * 8,
        speed: 14,
        stunTimer: 0,
        nearMissCooldown: 0,
      });
    }
  }

  addWanted(amount = 1) {
    this.wantedLevel = Math.min(5, Math.max(this.wantedLevel, this.wantedLevel + amount));
    this.evadeTimer = 0;
    this.evading = false;
    this.syncCopCount();
  }

  setWanted(stars) {
    this.wantedLevel = Math.max(0, Math.min(5, stars));
    this.evadeTimer = 0;
    this.evading = false;
    this.bustedTimer = 0;
    this.syncCopCount();
  }

  clearWanted() {
    this.wantedLevel = 0;
    this.evading = false;
    this.evadeTimer = 0;
    this.bustedTimer = 0;
    this.crimeHeat = 0;
    for (const c of this.cops) {
      this.scene.remove(c.parts.root);
    }
    this.cops.length = 0;
  }

  syncCopCount() {
    const desired = this.wantedLevel === 0 ? 0 : Math.min(4, this.wantedLevel);
    while (this.cops.length > desired) {
      const removed = this.cops.pop();
      this.scene.remove(removed.parts.root);
    }
  }

  spawnCopNear(playerPos) {
    const parts = buildVehicleMesh(LSPD_SPEC, true);
    // Pick a nearby grid road ~80-115m away
    const angle = Math.random() * Math.PI * 2;
    let sx = THREE.MathUtils.clamp(playerPos.x + Math.cos(angle) * 95, -220, 330);
    let sz = THREE.MathUtils.clamp(playerPos.z + Math.sin(angle) * 95, -220, 460);
    // Snap to nearest vertical or horizontal road for clean spawn
    let nearestV = V_ROADS[0];
    let minDV = Infinity;
    for (const vr of V_ROADS) {
      if (Math.abs(sx - vr) < minDV) {
        minDV = Math.abs(sx - vr);
        nearestV = vr;
      }
    }
    sx = nearestV;

    parts.root.position.set(sx, 0, sz);
    this.scene.add(parts.root);
    this.cops.push({
      parts,
      pos: new THREE.Vector3(sx, 0, sz),
      vel: new THREE.Vector3(),
      yaw: Math.atan2(playerPos.x - sx, playerPos.z - sz),
      speed: 24,
      stunTimer: 0,
    });
  }

  update(dt, player, world, effects, audio, callbacks) {
    const minX = V_ROADS[0] - 10;
    const maxX = V_ROADS[V_ROADS.length - 1] + 10;
    const minZ = H_ROADS[0] - 10;
    const maxZ = H_ROADS[H_ROADS.length - 1] + 10;

    // 1. Update Civilian Traffic
    for (const npc of this.civilians) {
      npc.nearMissCooldown = Math.max(0, npc.nearMissCooldown - dt);

      if (npc.stunTimer > 0) {
        npc.stunTimer -= dt;
        npc.vel.multiplyScalar(Math.exp(-3.5 * dt));
        npc.pos.addScaledVector(npc.vel, dt);
      } else {
        const fwdX = Math.sin(npc.yaw);
        const fwdZ = Math.cos(npc.yaw);

        // Brake gently if player is right ahead
        const toPlayerX = player.pos.x - npc.pos.x;
        const toPlayerZ = player.pos.z - npc.pos.z;
        const distP = Math.hypot(toPlayerX, toPlayerZ);
        const aheadDot = distP > 0.1 ? (toPlayerX * fwdX + toPlayerZ * fwdZ) / distP : 0;

        let targetSpd = npc.baseSpeed;
        if (distP < 18 && aheadDot > 0.78) {
          targetSpd = 0;
        }
        npc.speed = THREE.MathUtils.lerp(npc.speed, targetSpd, Math.min(1, dt * 4));
        npc.pos.x += fwdX * npc.speed * dt;
        npc.pos.z += fwdZ * npc.speed * dt;

        // Loop seamlessly along grid boundaries
        if (npc.axis === 'V') {
          if (npc.pos.z > maxZ) npc.pos.z = minZ;
          if (npc.pos.z < minZ) npc.pos.z = maxZ;
        } else {
          if (npc.pos.x > maxX) npc.pos.x = minX;
          if (npc.pos.x < minX) npc.pos.x = maxX;
        }
      }

      npc.pos.y = world.getSurfaceInfo(npc.pos.x, npc.pos.z).height;
      npc.parts.root.position.copy(npc.pos);
      npc.parts.root.rotation.y = npc.yaw;
      for (const w of npc.parts.wheelMeshes) w.rotation.x += npc.speed * dt * 2.0;

      // Player <-> NPC Collision & Near-Miss detection
      const dx = player.pos.x - npc.pos.x;
      const dz = player.pos.z - npc.pos.z;
      const dist = Math.hypot(dx, dz);
      const hitRadius = 3.25;

      if (dist < hitRadius && Math.abs(player.pos.y - npc.pos.y) < 2.2) {
        const nx = dist > 0.01 ? dx / dist : 1;
        const nz = dist > 0.01 ? dz / dist : 0;
        const overlap = hitRadius - dist;
        player.pos.x += nx * overlap * 0.65;
        player.pos.z += nz * overlap * 0.65;
        npc.pos.x -= nx * overlap * 0.55;
        npc.pos.z -= nz * overlap * 0.55;

        const relSpeed = Math.hypot(player.vel.x, player.vel.z);
        // Knock NPC away
        npc.vel.set(-nx * Math.max(8, relSpeed * 0.6), 0, -nz * Math.max(8, relSpeed * 0.6));
        npc.stunTimer = 1.6;
        // Slow player slightly
        player.vel.multiplyScalar(0.76);
        player.vel.x += nx * 5;
        player.vel.z += nz * 5;

        if (relSpeed > 9) {
          const normal = new THREE.Vector3(nx, 0, nz);
          effects?.spawnSparks(player.pos, normal, 14);
          audio?.playCollision(Math.min(1, relSpeed / 30));
          player.health = Math.max(15, player.health - Math.min(14, relSpeed * 0.25 / player.spec.mass));
          // Reckless collision raises Wanted Level!
          this.crimeHeat += relSpeed > 22 ? 1.0 : 0.55;
          if (this.crimeHeat >= 1.0) {
            this.crimeHeat = 0;
            this.addWanted(1);
            callbacks?.onWantedIncrease?.(this.wantedLevel);
          }
        }
      } else if (
        dist < 5.4 &&
        dist >= hitRadius &&
        npc.nearMissCooldown <= 0 &&
        player.kmh > 85 &&
        player.grounded
      ) {
        npc.nearMissCooldown = 3.0;
        player.nitro = Math.min(100, player.nitro + 12);
        callbacks?.onNearMiss?.();
      }
    }

    // 2. Update LSPD Police Chase System
    if (this.wantedLevel > 0) {
      const desiredCops = Math.min(4, this.wantedLevel);
      if (this.cops.length < desiredCops && Math.random() < dt * 0.85) {
        this.spawnCopNear(player.pos);
      }

      let nearestCopDist = Infinity;
      const flash = Math.floor(performance.now() * 0.014) % 2 === 0;

      for (const cop of this.cops) {
        // Flashing LSPD lightbar!
        if (cop.parts.lightbarRed && cop.parts.lightbarBlue) {
          cop.parts.lightbarRed.material.emissiveIntensity = flash ? 3.8 : 0.2;
          cop.parts.lightbarBlue.material.emissiveIntensity = flash ? 0.2 : 3.8;
        }

        const dx = player.pos.x - cop.pos.x;
        const dz = player.pos.z - cop.pos.z;
        const dist = Math.hypot(dx, dz);
        const dist3d = Math.hypot(dx, player.pos.y - cop.pos.y, dz);
        nearestCopDist = Math.min(nearestCopDist, dist3d);

        // Respawn stuck or far-behind cops closer only when not evading
        if (dist > 260) {
          cop.pos.set(
            THREE.MathUtils.clamp(player.pos.x + (Math.random() - 0.5) * 140, -220, 330),
            0,
            THREE.MathUtils.clamp(player.pos.z + (Math.random() - 0.5) * 140, -220, 460)
          );
        }

        if (cop.stunTimer > 0) {
          cop.stunTimer -= dt;
          cop.vel.multiplyScalar(Math.exp(-3 * dt));
          cop.pos.addScaledVector(cop.vel, dt);
        } else {
          // Predictive intercept point slightly ahead of player
          const leadX = player.pos.x + player.vel.x * 0.45;
          const leadZ = player.pos.z + player.vel.z * 0.45;
          const targetYaw = Math.atan2(leadX - cop.pos.x, leadZ - cop.pos.z);

          // Shortest angular difference
          let diff = targetYaw - cop.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          cop.yaw += THREE.MathUtils.clamp(diff, -2.8 * dt, 2.8 * dt);

          const maxCopSpd = 32 + this.wantedLevel * 4.2;
          cop.speed = THREE.MathUtils.lerp(cop.speed, maxCopSpd, Math.min(1, dt * 2.5));
          cop.pos.x += Math.sin(cop.yaw) * cop.speed * dt;
          cop.pos.z += Math.cos(cop.yaw) * cop.speed * dt;
        }

        // Keep cops out of buildings
        const bHit = world.resolveBuildingCollision(cop.pos, 2.3);
        if (bHit) {
          cop.yaw += 0.9 * dt * 4;
          cop.speed *= 0.65;
        }

        cop.pos.y = world.getSurfaceInfo(cop.pos.x, cop.pos.z).height;
        cop.parts.root.position.copy(cop.pos);
        cop.parts.root.rotation.y = cop.yaw;
        for (const w of cop.parts.wheelMeshes) w.rotation.x += cop.speed * dt * 2.0;

        // Cop <-> Player collision
        if (dist < 3.4 && Math.abs(player.pos.y - cop.pos.y) < 2.2) {
          const nx = dist > 0.01 ? dx / dist : 1;
          const nz = dist > 0.01 ? dz / dist : 0;
          const overlap = 3.4 - dist;
          player.pos.x += nx * overlap * 0.55;
          player.pos.z += nz * overlap * 0.55;
          cop.pos.x -= nx * overlap * 0.55;
          cop.pos.z -= nz * overlap * 0.55;

          const relSpd = Math.hypot(player.vel.x, player.vel.z);
          cop.vel.set(-nx * 14, 0, -nz * 14);
          cop.stunTimer = 0.7;
          player.vel.x += nx * 7;
          player.vel.z += nz * 7;
          player.vel.multiplyScalar(0.82);

          effects?.spawnSparks(player.pos, new THREE.Vector3(nx, 0, nz), 12);
          audio?.playCollision(0.7);
          player.health = Math.max(15, player.health - 7 / player.spec.mass);

          if (relSpd > 18 && this.wantedLevel < 5 && Math.random() < 0.35) {
            this.addWanted(1);
            callbacks?.onWantedIncrease?.(this.wantedLevel);
          }
        }
      }

      // Evade / Cooldown check
      if (nearestCopDist > 92) {
        this.evading = true;
        this.evadeTimer += dt;
        if (this.evadeTimer >= 9.5) {
          const escapedStars = this.wantedLevel;
          this.clearWanted();
          callbacks?.onEscapedPolice?.(escapedStars);
        }
      } else {
        this.evading = false;
        this.evadeTimer = Math.max(0, this.evadeTimer - dt * 1.5);
      }

      // Busted check (pinned by LSPD at very low speed)
      if (nearestCopDist < 7.5 && player.kmh < 10) {
        this.bustedTimer += dt;
        if (this.bustedTimer >= 3.2) {
          this.clearWanted();
          callbacks?.onBusted?.();
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
      }

      return nearestCopDist;
    }

    return Infinity;
  }
}
