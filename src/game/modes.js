import * as THREE from 'three';
import { LANDMARKS, RACE_ROUTES } from './constants.js';

export function formatRaceTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec - Math.floor(sec)) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export class GameModesManager {
  constructor(scene) {
    this.scene = scene;
    this.cash = 1000;
    this.discoveredLandmarks = new Set();

    // Drift combo state
    this.driftScore = 0;
    this.driftComboTimer = 0;

    // Street Race state
    this.race = {
      active: false,
      route: RACE_ROUTES[0],
      checkpoints: RACE_ROUTES[0].checkpoints,
      currentIndex: 0,
      elapsed: 0,
      bestTime: this.loadBestTime('ls_gp'),
    };

    // 3D Glowing Checkpoint Beacon Cylinder + Ring (GTA V style!)
    this.beaconGroup = new THREE.Group();
    const cylGeo = new THREE.CylinderGeometry(8.5, 8.5, 42, 24, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pillar = new THREE.Mesh(cylGeo, cylMat);
    pillar.position.y = 21;

    const ringGeo = new THREE.RingGeometry(7.2, 9.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const baseRing = new THREE.Mesh(ringGeo, ringMat);
    baseRing.position.y = 0.25;

    const floatRing = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.45, 10, 28), ringMat);
    floatRing.position.y = 7.5;
    this.beaconFloatRing = floatRing;

    this.beaconGroup.add(pillar, baseRing, floatRing);
    this.beaconGroup.visible = false;
    this.scene.add(this.beaconGroup);

    // 3D Floating GPS Arrow above player during race
    this.guideArrow = new THREE.Group();
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 1.15, 4),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    arrowCone.rotation.x = Math.PI / 2;
    this.guideArrow.add(arrowCone);
    this.guideArrow.visible = false;
    this.scene.add(this.guideArrow);
  }

  loadBestTime(id) {
    try {
      const v = localStorage.getItem(`ls_drive_best_${id}`);
      return v ? parseFloat(v) : null;
    } catch {
      return null;
    }
  }

  saveBestTime(id, sec) {
    try {
      localStorage.setItem(`ls_drive_best_${id}`, String(sec));
    } catch {
      // ignore storage errors
    }
  }

  addCash(amount) {
    this.cash = Math.max(0, Math.round(this.cash + amount));
  }

  startRace(player, world) {
    const route = RACE_ROUTES[0];
    this.race.active = true;
    this.race.route = route;
    this.race.checkpoints = route.checkpoints;
    this.race.currentIndex = 0;
    this.race.elapsed = 0;

    player.teleport(route.startPos.x, route.startPos.z, route.startPos.yaw, world);
    player.repair();
    this.positionBeacon(world);
    this.beaconGroup.visible = true;
    this.guideArrow.visible = true;
  }

  stopRace() {
    this.race.active = false;
    this.beaconGroup.visible = false;
    this.guideArrow.visible = false;
  }

  positionBeacon(world) {
    const cp = this.race.checkpoints[this.race.currentIndex];
    if (!cp) return;
    const y = world.getSurfaceInfo(cp.x, cp.z).height;
    this.beaconGroup.position.set(cp.x, y, cp.z);
  }

  update(dt, time, player, world, audio, callbacks) {
    // 1. Landmark Discovery Check
    for (const lm of LANDMARKS) {
      if (this.discoveredLandmarks.has(lm.id)) continue;
      const dist = Math.hypot(player.pos.x - lm.x, player.pos.z - lm.z);
      if (dist < lm.radius) {
        this.discoveredLandmarks.add(lm.id);
        this.addCash(500);
        audio?.playChime(740, 0.25);
        callbacks?.onLandmarkDiscovered?.(lm, this.discoveredLandmarks.size, LANDMARKS.length);
      }
    }

    // 2. Drift Combo Scoring
    if (player.isDrifting && player.grounded) {
      const gain = (120 + player.kmh * 2.2) * dt;
      this.driftScore += gain;
      this.driftComboTimer = 1.4;
      callbacks?.onDriftUpdate?.(Math.round(this.driftScore), true);
    } else if (this.driftComboTimer > 0) {
      this.driftComboTimer -= dt;
      if (this.driftComboTimer <= 0) {
        const banked = Math.round(this.driftScore);
        if (banked >= 150) {
          const reward = Math.round(banked * 0.25);
          this.addCash(reward);
          callbacks?.onDriftBanked?.(banked, reward);
        }
        this.driftScore = 0;
        callbacks?.onDriftUpdate?.(0, false);
      }
    }

    // 3. Active Street Race Logic
    if (this.race.active) {
      this.race.elapsed += dt;
      const cp = this.race.checkpoints[this.race.currentIndex];
      if (cp) {
        // Animate beacon ring
        this.beaconFloatRing.rotation.y = time * 2.4;
        this.beaconFloatRing.position.y = 7.2 + Math.sin(time * 4) * 1.1;

        // Point floating 3D guide arrow above car toward next checkpoint
        this.guideArrow.position.set(player.pos.x, player.pos.y + 2.7, player.pos.z);
        const angleToCp = Math.atan2(cp.x - player.pos.x, cp.z - player.pos.z);
        this.guideArrow.rotation.y = angleToCp;

        // Check checkpoint trigger
        const dist = Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z);
        if (dist < 13.5) {
          this.race.currentIndex++;
          audio?.playChime(880, 0.16);
          if (this.race.currentIndex >= this.race.checkpoints.length) {
            const finalTime = this.race.elapsed;
            const isRecord = !this.race.bestTime || finalTime < this.race.bestTime;
            if (isRecord) {
              this.race.bestTime = finalTime;
              this.saveBestTime(this.race.route.id, finalTime);
            }
            const prize = isRecord ? 3500 : 2000;
            this.addCash(prize);
            this.stopRace();
            callbacks?.onRaceFinished?.(finalTime, isRecord, prize);
          } else {
            this.positionBeacon(world);
          }
        }
      }
    }
  }
}
