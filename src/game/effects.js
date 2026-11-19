import * as THREE from 'three';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 140;

    // Pre-allocate pooled puff/spark meshes
    const puffGeo = new THREE.DodecahedronGeometry(0.45, 0);
    for (let i = 0; i < this.maxParticles; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(puffGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        age: 0,
        life: 0,
        startScale: 1,
        endScale: 2,
        gravity: 0,
        active: false,
      });
    }
    this.cursor = 0;

    // Asphalt drift skid marks ring buffer
    this.skids = [];
    this.maxSkids = 160;
    this.skidCursor = 0;
    const skidGeo = new THREE.PlaneGeometry(0.42, 1.35);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x0b0d12,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let i = 0; i < this.maxSkids; i++) {
      const m = new THREE.Mesh(skidGeo, skidMat);
      m.visible = false;
      this.scene.add(m);
      this.skids.push(m);
    }
    this.skidCooldown = 0;
  }

  spawnParticle(pos, vel, colorHex, life, startScale, endScale, gravity = 0) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.maxParticles;

    p.active = true;
    p.age = 0;
    p.life = life;
    p.startScale = startScale;
    p.endScale = endScale;
    p.gravity = gravity;
    p.vel.copy(vel);
    p.mesh.position.copy(pos);
    p.mesh.material.color.setHex(colorHex);
    p.mesh.material.opacity = 0.72;
    p.mesh.scale.setScalar(startScale);
    p.mesh.visible = true;
  }

  spawnTireSmoke(pos, colorHex = 0xdbe2ec) {
    if (Math.random() > 0.55) return;
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 1.6,
      0.8 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.6
    );
    const p = pos.clone();
    p.y += 0.25;
    this.spawnParticle(p, v, colorHex, 0.55 + Math.random() * 0.25, 0.45, 2.1, -0.4);
  }

  spawnSparks(pos, normal, count = 12) {
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(
        normal.x * (4 + Math.random() * 8) + (Math.random() - 0.5) * 7,
        3 + Math.random() * 7,
        normal.z * (4 + Math.random() * 8) + (Math.random() - 0.5) * 7
      );
      const p = pos.clone();
      p.y += 0.8;
      this.spawnParticle(p, v, i % 2 === 0 ? 0xffd166 : 0xff6b35, 0.32 + Math.random() * 0.25, 0.25, 0.05, 18);
    }
  }

  spawnWaterSplash(pos) {
    for (let i = 0; i < 20; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        5 + Math.random() * 8,
        (Math.random() - 0.5) * 10
      );
      this.spawnParticle(pos.clone(), v, 0xe0f7ff, 0.65, 0.6, 2.2, 16);
    }
  }

  addSkidMark(pos, yaw) {
    if (this.skidCooldown > 0) return;
    const m = this.skids[this.skidCursor];
    this.skidCursor = (this.skidCursor + 1) % this.maxSkids;
    m.position.set(pos.x, pos.y + 0.06, pos.z);
    m.rotation.y = yaw;
    m.visible = true;
  }

  update(dt) {
    this.skidCooldown = Math.max(0, this.skidCooldown - dt);
    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const s = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = (1 - t) * 0.65;
    }
  }
}
