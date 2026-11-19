import * as THREE from 'three';
import { getDistrictInfo, TELEPORT_POINTS, VEHICLES } from './constants.js';
import { SoundManager } from './audio.js';
import { EffectsManager } from './effects.js';
import { MinimapRenderer } from './minimap.js';
import { formatRaceTime, GameModesManager } from './modes.js';
import { SkyManager } from './sky.js';
import { TrafficAndPoliceManager } from './traffic.js';
import { PlayerVehicle } from './vehicle.js';
import { LosSantosWorld } from './world.js';

const CAMERA_MODES = ['CHASE', 'FAR CHASE', 'HOOD', 'ORBIT'];

export class GameEngine {
  constructor(canvas, minimapCanvas, compassEl, uiHooks) {
    this.canvas = canvas;
    this.uiHooks = uiHooks;
    this.started = false;
    this.paused = false;

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false,
      lookBack: false,
      climb: false,
      descend: false,
    };

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // Scene & Camera (extended far clip for whole San Andreas island flight!)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 4400);
    this.camModeIndex = 0;
    this.camPosSmooth = new THREE.Vector3(0, 8, 160);
    this.camLookSmooth = new THREE.Vector3(0, 2, 140);
    this.camShake = 0;

    // Subsystems
    this.sky = new SkyManager(this.scene, this.renderer);
    this.world = new LosSantosWorld(this.scene);
    this.effects = new EffectsManager(this.scene);
    this.player = new PlayerVehicle(this.scene, 0);
    this.traffic = new TrafficAndPoliceManager(this.scene);
    this.audio = new SoundManager();
    this.minimap = new MinimapRenderer(minimapCanvas, compassEl);
    this.modes = new GameModesManager(this.scene);

    // Spawn on Pillbox Hill Ave looking North toward Maze Bank Tower, Vinewood, Desert & Chiliad!
    this.player.teleport(0, 148, Math.PI, this.world);

    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.hudTick = 0;
    this.rafId = null;

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.loop();
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startGame(mode = 'roam') {
    this.started = true;
    this.paused = false;
    this.audio.unlock();
    if (mode === 'race') {
      this.startRace();
    } else {
      this.modes.stopRace();
      this.uiHooks.showBanner?.(
        'WELCOME TO SAN ANDREAS',
        '로스 산토스 도심부터 사막·칠리아드 산까지 자동차·비행기·헬기로 자유롭게 탐험하세요!'
      );
    }
    this.snapCameraBehindPlayer();
  }

  snapCameraBehindPlayer() {
    const fwd = this.player.getForwardVector();
    const dist = this.player.vehicleType === 'plane' ? 22 : this.player.vehicleType === 'heli' ? 18 : 11;
    const h = this.player.isAircraft ? 7.2 : 4.5;
    this.camPosSmooth.copy(this.player.pos).addScaledVector(fwd, -dist).add(new THREE.Vector3(0, h, 0));
    this.camLookSmooth.copy(this.player.pos).addScaledVector(fwd, 10).add(new THREE.Vector3(0, 1.8, 0));
  }

  setPaused(val) {
    this.paused = val;
    if (!val) this.clock.getDelta();
  }

  isOnRunway(x, z) {
    // LSIA, Sandy Shores, or Fort Zancudo runways
    if (z > 515 && z < 580 && x > -245 && x < 170) return true;
    if (z < -975 && z > -1065 && x > 20 && x < 290) return true;
    if (z < -885 && z > -975 && x > -415 && x < -145) return true;
    return false;
  }

  selectVehicle(index) {
    const nextSpec = VEHICLES[index];
    if (!nextSpec) return;
    this.player.loadVehicle(index);

    if (nextSpec.type === 'plane') {
      // If on an airfield runway, stay grounded ready for takeoff; otherwise launch smoothly into cruise flight!
      if (this.isOnRunway(this.player.pos.x, this.player.pos.z) && this.player.pos.y < 30) {
        this.player.grounded = true;
        this.player.vel.set(0, 0, 0);
        this.player.throttle = 0;
        this.uiHooks.showBanner?.(
          nextSpec.name,
          '활주로 출고 완료! W 가속 후 Space / Q로 이륙하세요!'
        );
      } else {
        const surfY = this.world.getSurfaceInfo(this.player.pos.x, this.player.pos.z, this.player.pos.y).height;
        this.player.pos.y = Math.max(this.player.pos.y, surfY + 78, 95);
        this.player.grounded = false;
        this.player.throttle = 0.72;
        const fwd = this.player.getForwardVector();
        const spd = nextSpec.topSpeed * 0.58;
        this.player.vel.set(fwd.x * spd, 0, fwd.z * spd);
        this.uiHooks.showBanner?.(
          nextSpec.name,
          '공중 출격 완료! Space/Q 상승 • Z/Ctrl 하강 • A/D 선회 • Shift 애프터버너'
        );
      }
    } else if (nextSpec.type === 'heli') {
      const surfY = this.world.getSurfaceInfo(this.player.pos.x, this.player.pos.z, this.player.pos.y).height;
      if (this.player.pos.y > surfY + 4) {
        this.player.grounded = false;
        this.player.vel.set(0, 0, 0);
      } else {
        this.player.pos.y = surfY;
        this.player.grounded = true;
        this.player.vel.set(0, 0, 0);
      }
      this.uiHooks.showBanner?.(
        nextSpec.name,
        '헬기 출고 완료! Space/Q 수직 상승 • Z/Ctrl 하강 • WASD 비행'
      );
    } else {
      // Switching back to a car while mid-air lands safely on the terrain below!
      const surfY = this.world.getSurfaceInfo(this.player.pos.x, this.player.pos.z, this.player.pos.y).height;
      this.player.pos.y = Math.max(surfY, 0);
      this.player.grounded = true;
      this.player.vel.set(0, 0, 0);
      this.uiHooks.showBanner?.(nextSpec.name, `${nextSpec.koName} 출고 완료!`);
    }

    this.snapCameraBehindPlayer();
  }

  teleportTo(key) {
    const pt = TELEPORT_POINTS[key];
    if (!pt) return;
    const explicitY = pt.y !== undefined ? pt.y : null;
    this.player.teleport(pt.x, pt.z, pt.yaw, this.world, explicitY);
    this.snapCameraBehindPlayer();
    const info = getDistrictInfo(pt.x, pt.z, this.player.pos.y);
    this.uiHooks.showBanner?.(info.district, `${pt.label || '빠른 이동'} 도착!`);
  }

  cycleCamera() {
    this.camModeIndex = (this.camModeIndex + 1) % CAMERA_MODES.length;
    return CAMERA_MODES[this.camModeIndex];
  }

  cycleTime() {
    const label = this.sky.cyclePreset();
    this.uiHooks.showBanner?.('TIME OF DAY', label);
    return label;
  }

  cycleRadio() {
    const station = this.audio.cycleRadio();
    this.uiHooks.showRadioToast?.(station);
    return station;
  }

  toggleSiren() {
    if (!this.player.spec.isPolice) return false;
    this.player.sirenOn = !this.player.sirenOn;
    return this.player.sirenOn;
  }

  startRace() {
    if (this.player.isAircraft) {
      this.player.loadVehicle(0);
    }
    this.traffic.clearWanted();
    this.modes.startRace(this.player, this.world);
    this.snapCameraBehindPlayer();
    this.uiHooks.showBanner?.('LOS SANTOS GRAND PRIX', '노란색 체크포인트를 통과해 최고 기록에 도전하세요!');
  }

  toggleRace() {
    if (this.modes.race.active) {
      this.modes.stopRace();
      this.uiHooks.showBanner?.('FREE ROAM', '레이스를 종료하고 자유 주행으로 돌아왔습니다.');
      return false;
    }
    this.startRace();
    return true;
  }

  repairAndRecover() {
    this.player.repair();
    const surf = this.world.getSurfaceInfo(this.player.pos.x, this.player.pos.z, this.player.pos.y);
    if (!this.player.isAircraft || this.player.grounded) {
      this.player.pos.y = Math.max(surf.height + 0.1, this.world.waterLevel + 2);
      this.player.vel.set(0, 0, 0);
    }
    this.audio.playChime(520, 0.2);
    this.uiHooks.showBanner?.('REPAIRED & REFUELED', '기체 내구도 및 부스터 100% 복구 완료!');
  }

  triggerPoliceChase() {
    this.traffic.setWanted(Math.max(2, Math.min(5, this.traffic.wantedLevel + 1)));
    this.uiHooks.showBanner?.(
      `WANTED LEVEL ${'★'.repeat(this.traffic.wantedLevel)}`,
      'LSPD 경찰 추격대가 출동했습니다! 도주하거나 하늘로 탈출하세요!'
    );
  }

  clearPolice() {
    if (this.traffic.wantedLevel > 0) {
      this.traffic.clearWanted();
      this.uiHooks.showBanner?.('WANTED CLEARED', '지명수배가 해제되었습니다.');
    }
  }

  updateCamera(dt) {
    if (!this.started) {
      const angle = this.elapsedTime * 0.14;
      const radius = 195;
      this.camera.position.set(
        55 + Math.cos(angle) * radius,
        78 + Math.sin(this.elapsedTime * 0.35) * 14,
        -55 + Math.sin(angle) * radius
      );
      this.camera.lookAt(55, 58, -55);
      return;
    }

    const mode = CAMERA_MODES[this.camModeIndex];
    const p = this.player;
    const fwd = p.getForwardVector();
    const lookDir = this.input.lookBack ? fwd.clone().negate() : fwd;

    const targetFov = 60 + Math.min(20, (p.kmh / 320) * 16) + (p.isNitro ? 9 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 6));
    this.camera.updateProjectionMatrix();

    if (mode === 'HOOD') {
      const noseOffset = p.vehicleType === 'plane' ? 2.6 : p.vehicleType === 'heli' ? 1.8 : p.spec.length * 0.14;
      const eyeY = p.vehicleType === 'plane' ? 2.55 : p.vehicleType === 'heli' ? 2.15 : p.spec.height + 0.32;
      const hoodPos = p.pos.clone().addScaledVector(fwd, noseOffset).add(new THREE.Vector3(0, eyeY, 0));
      const pitchLookY = p.vehicleType === 'plane' ? Math.sin(p.pitch) * 30 : 0;
      const lookTarget = hoodPos.clone().addScaledVector(lookDir, 30).add(new THREE.Vector3(0, pitchLookY, 0));
      this.camera.position.copy(hoodPos);
      this.camera.lookAt(lookTarget);
      return;
    }

    let desiredPos;
    let desiredLook;
    const isPlane = p.vehicleType === 'plane';
    const isHeli = p.vehicleType === 'heli';

    if (mode === 'ORBIT') {
      const orbAng = this.elapsedTime * 0.55;
      const r = isPlane ? 22 : isHeli ? 19 : 13.5;
      desiredPos = p.pos.clone().add(new THREE.Vector3(Math.cos(orbAng) * r, isPlane || isHeli ? 8 : 5.2, Math.sin(orbAng) * r));
      desiredLook = p.pos.clone().add(new THREE.Vector3(0, 2.0, 0));
    } else {
      const baseDist = isPlane ? 22 : isHeli ? 17.5 : 9.8;
      const baseHeight = isPlane ? 6.6 : isHeli ? 6.4 : 3.9;
      const dist = mode === 'FAR CHASE' ? baseDist * 1.45 : baseDist;
      const height = mode === 'FAR CHASE' ? baseHeight * 1.38 : baseHeight;
      const pitchCamOffset = isPlane && !p.grounded ? -Math.sin(p.pitch) * 8.5 : 0;

      desiredPos = p.pos
        .clone()
        .addScaledVector(lookDir, -dist)
        .add(new THREE.Vector3(0, height + pitchCamOffset + (!p.isAircraft && !p.grounded ? 1.2 : 0), 0));
      desiredLook = p.pos
        .clone()
        .addScaledVector(lookDir, isPlane ? 16 : 10)
        .add(new THREE.Vector3(0, isPlane ? 2.2 + Math.sin(p.pitch) * 10 : 1.8, 0));
    }

    // Keep camera above ground terrain
    const camGround = this.world.getSurfaceInfo(desiredPos.x, desiredPos.z, desiredPos.y).height;
    if (desiredPos.y < camGround + 1.6) {
      desiredPos.y = camGround + 1.6;
    }

    const followRate = this.input.lookBack ? 18 : p.isAircraft ? 6.2 : 7.8;
    this.camPosSmooth.lerp(desiredPos, Math.min(1, dt * followRate));
    this.camLookSmooth.lerp(desiredLook, Math.min(1, dt * 11));

    this.camShake = Math.max(0, this.camShake - dt * 2.8);
    const shakeAmt = this.camShake * 0.45;
    this.camera.position.set(
      this.camPosSmooth.x + (Math.random() - 0.5) * shakeAmt,
      this.camPosSmooth.y + (Math.random() - 0.5) * shakeAmt,
      this.camPosSmooth.z + (Math.random() - 0.5) * shakeAmt
    );
    this.camera.lookAt(this.camLookSmooth);
  }

  loop() {
    this.rafId = requestAnimationFrame(this.loop);
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (!this.paused) {
      this.elapsedTime += dt;

      if (this.started) {
        // 1. Player Vehicle / Aircraft Physics
        this.player.update(dt, this.input, this.world, this.effects, this.audio, this.sky.nightFactor, {
          onStuntJump: (dist, airTime, rampName) => {
            const reward = Math.round(dist * 12);
            this.modes.addCash(reward);
            this.audio.playChime(920, 0.28);
            this.uiHooks.showBanner?.(
              `STUNT JUMP! ${rampName}`,
              `비거리 ${Math.round(dist)}m • 체공 ${airTime.toFixed(1)}초 • +$${reward}`
            );
          },
          onHelipadLanding: () => {
            this.modes.addCash(1000);
            this.audio.playChime(880, 0.3);
            this.uiHooks.showBanner?.('MAZE BANK HELIPAD LANDING!', '메이즈 뱅크 타워 옥상 착륙 성공! +$1,000');
          },
          onCrash: (impact) => {
            this.camShake = Math.min(1.0, impact / 26);
          },
          onWaterRecover: () => {
            this.uiHooks.showBanner?.('WATER RECOVERY', '물에서 가장 가까운 도로로 구조되었습니다!');
          },
          onRepairBay: () => {
            this.audio.playChime(680, 0.25);
            this.uiHooks.showBanner?.('LOS SANTOS CUSTOMS', '차량 무료 수리 & 니트로 풀충전 완료!');
          },
        });

        // 2. NPC Traffic & LSPD Pursuit
        const nearestCopDist = this.traffic.update(dt, this.player, this.world, this.effects, this.audio, {
          onNearMiss: () => {
            this.modes.addCash(150);
            this.uiHooks.showCombo?.('NEAR MISS!', '+$150');
          },
          onWantedIncrease: (stars) => {
            this.uiHooks.showBanner?.(`WANTED LEVEL ${'★'.repeat(stars)}`, 'LSPD 경찰차가 추격을 시작했습니다!');
          },
          onEscapedPolice: (stars) => {
            const reward = stars * 350;
            this.modes.addCash(reward);
            this.audio.playChime(780, 0.3);
            this.uiHooks.showBanner?.('ESCAPED LSPD!', `경찰 따돌리기 성공! 보너스 +$${reward}`);
          },
          onBusted: () => {
            this.modes.addCash(-200);
            this.player.teleport(0, 148, Math.PI, this.world);
            this.snapCameraBehindPlayer();
            this.uiHooks.showBanner?.('BUSTED!', 'LSPD에 체포되어 벌금 $200가 부과되었습니다.');
          },
        });

        // 3. Modes (14 Landmarks, Drift Combo, Street Race)
        this.modes.update(dt, this.elapsedTime, this.player, this.world, this.audio, {
          onLandmarkDiscovered: (lm, count, total) => {
            this.uiHooks.showBanner?.(
              `랜드마크 발견: ${lm.name}`,
              `${lm.ko} (${count}/${total}) • 보너스 +$500`
            );
            this.uiHooks.refreshLandmarks?.(this.modes.discoveredLandmarks);
          },
          onDriftUpdate: (score, active) => {
            if (active && score > 30) {
              this.uiHooks.showCombo?.('DRIFT COMBO', `+${score.toLocaleString()}`, true);
            } else if (!active) {
              this.uiHooks.hideCombo?.();
            }
          },
          onDriftBanked: (score, reward) => {
            this.uiHooks.showCombo?.(`DRIFT BANKED +$${reward}`, `${score.toLocaleString()} PTS`, false);
          },
          onRaceFinished: (finalTime, isRecord, prize) => {
            this.uiHooks.showBanner?.(
              isRecord ? '🏆 NEW TRACK RECORD!' : '🏁 RACE COMPLETED!',
              `완주 시간 ${formatRaceTime(finalTime)} • 상금 +$${prize.toLocaleString()}`
            );
          },
        });

        // 4. Audio Engine
        const sirenStrength =
          this.traffic.wantedLevel > 0 ? THREE.MathUtils.clamp(1 - nearestCopDist / 130, 0.08, 1) : 0;
        this.audio.update(dt, this.elapsedTime, this.player, sirenStrength);
      }

      // 5. World animations, particles & sky
      this.sky.update(dt, this.player.pos);
      this.world.update(dt, this.elapsedTime, this.sky.nightFactor);
      this.effects.update(dt);
      this.updateCamera(dt);

      // 6. Minimap & HUD sync
      if (this.started) {
        this.minimap.render(this.player, this.traffic, this.modes.race, this.elapsedTime);
        this.hudTick += dt;
        if (this.hudTick >= 0.05) {
          this.hudTick = 0;
          const loc = getDistrictInfo(this.player.pos.x, this.player.pos.z, this.player.pos.y);
          this.uiHooks.updateHud?.({
            kmh: this.player.kmh,
            gear: this.player.gear,
            rpm: this.player.rpm,
            altitude: this.player.altitude,
            vehicleType: this.player.vehicleType,
            isAircraft: this.player.isAircraft,
            health: this.player.health,
            nitro: this.player.nitro,
            isDrifting: this.player.isDrifting,
            isNitro: this.player.isNitro,
            isAir: !this.player.grounded,
            isPolice: this.player.spec.isPolice,
            sirenOn: this.player.sirenOn,
            vehicleName: this.player.spec.name,
            camName: CAMERA_MODES[this.camModeIndex],
            district: loc.district,
            street: loc.street,
            cash: this.modes.cash,
            wantedLevel: this.traffic.wantedLevel,
            evading: this.traffic.evading,
            landmarksFound: this.modes.discoveredLandmarks.size,
            timeLabel: this.sky.currentLabel,
            race: this.modes.race,
          });
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
