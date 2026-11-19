import * as THREE from 'three';
import { TIME_PRESETS } from './constants.js';

export class SkyManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.presetIndex = 0; // Iconic San Andreas Golden Hour Sunset!
    this.autoCycle = false;
    this.autoTimer = 0;
    this.nightFactor = TIME_PRESETS[0].nightFactor;
    this.baseFogNear = TIME_PRESETS[0].fogNear;
    this.baseFogFar = TIME_PRESETS[0].fogFar;

    this.fog = new THREE.Fog(0xd98062, 260, 1350);
    this.scene.fog = this.fog;

    // Directional Sun / Moon light with shadow map
    this.sunLight = new THREE.DirectionalLight(0xffb36b, 2.35);
    this.sunLight.position.set(-520, 175, -240);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 1100;
    const d = 195;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0xffb585, 0x3b2c44, 0.95);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x5c3c4c, 0.45);
    this.scene.add(this.ambientLight);

    // Custom atmospheric Sky Dome shader (large enough for entire San Andreas island + high-altitude flight!)
    const skyGeo = new THREE.SphereGeometry(3800, 32, 24);
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(TIME_PRESETS[0].skyTop) },
      uMidColor: { value: new THREE.Color(TIME_PRESETS[0].skyMid) },
      uHorizonColor: { value: new THREE.Color(TIME_PRESETS[0].skyHorizon) },
      uSunDir: { value: new THREE.Vector3(-0.9, 0.3, -0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xffcfa0) },
      uNightFactor: { value: TIME_PRESETS[0].nightFactor },
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uNightFactor;
        varying vec3 vWorldPos;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);

          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
          col = mix(col, uTopColor, smoothstep(0.22, 0.78, h));

          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float halo = pow(sunDot, 12.0) * (0.45 - 0.25 * uNightFactor);
          float disc = smoothstep(0.9965, 0.9992, sunDot);
          col += uSunColor * halo + mix(vec3(1.0, 0.96, 0.85), vec3(0.85, 0.92, 1.0), uNightFactor) * disc * 1.3;

          if (uNightFactor > 0.25 && h > 0.1) {
            vec3 cell = floor(dir * 260.0);
            float star = step(0.9945, hash(cell));
            col += vec3(0.85, 0.92, 1.0) * star * smoothstep(0.25, 0.95, uNightFactor) * smoothstep(0.1, 0.35, h);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this.applyPreset(0);
  }

  get currentLabel() {
    if (this.autoCycle) return `자동 순환 (${TIME_PRESETS[this.presetIndex].label})`;
    return TIME_PRESETS[this.presetIndex].label;
  }

  cyclePreset() {
    if (!this.autoCycle && this.presetIndex === TIME_PRESETS.length - 1) {
      this.autoCycle = true;
      this.autoTimer = 0;
    } else if (this.autoCycle) {
      this.autoCycle = false;
      this.presetIndex = 0;
      this.applyPreset(0);
    } else {
      this.presetIndex = (this.presetIndex + 1) % TIME_PRESETS.length;
      this.applyPreset(this.presetIndex);
    }
    return this.currentLabel;
  }

  setPresetById(id) {
    const idx = TIME_PRESETS.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.autoCycle = false;
      this.presetIndex = idx;
      this.applyPreset(idx);
    }
  }

  applyPreset(idx) {
    const p = TIME_PRESETS[idx];
    this.nightFactor = p.nightFactor;
    this.baseFogNear = p.fogNear;
    this.baseFogFar = p.fogFar;

    this.skyUniforms.uTopColor.value.setHex(p.skyTop);
    this.skyUniforms.uMidColor.value.setHex(p.skyMid);
    this.skyUniforms.uHorizonColor.value.setHex(p.skyHorizon);
    this.skyUniforms.uSunColor.value.setHex(p.sunColor);
    this.skyUniforms.uNightFactor.value = p.nightFactor;
    this.skyUniforms.uSunDir.value.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]).normalize();

    this.fog.color.setHex(p.fogColor);
    this.fog.near = p.fogNear;
    this.fog.far = p.fogFar;

    this.sunLight.color.setHex(p.sunColor);
    this.sunLight.intensity = p.sunIntensity;
    this.sunOffset = new THREE.Vector3(p.sunPos[0], p.sunPos[1], p.sunPos[2]);

    this.hemiLight.color.setHex(p.hemiSky);
    this.hemiLight.groundColor.setHex(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;

    this.ambientLight.color.setHex(p.ambientColor);
    this.ambientLight.intensity = p.ambientIntensity;

    this.renderer.toneMappingExposure = p.exposure;
  }

  update(dt, playerPos) {
    this.skyDome.position.set(playerPos.x, playerPos.y * 0.4, playerPos.z);

    // Expand visibility cleanly at high altitude so flying gives breathtaking whole-island vistas!
    const altBoost = Math.max(0, playerPos.y - 25) * 4.5;
    this.fog.near = this.baseFogNear + altBoost * 0.35;
    this.fog.far = Math.min(3100, this.baseFogFar + altBoost);

    if (this.autoCycle) {
      this.autoTimer += dt;
      if (this.autoTimer > 35) {
        this.autoTimer = 0;
        this.presetIndex = (this.presetIndex + 1) % TIME_PRESETS.length;
        this.applyPreset(this.presetIndex);
      }
    }

    if (this.sunOffset) {
      this.sunLight.position.set(
        playerPos.x + this.sunOffset.x * 0.45,
        Math.max(playerPos.y + 80, this.sunOffset.y * 0.8),
        playerPos.z + this.sunOffset.z * 0.45
      );
      this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
    }
  }
}
