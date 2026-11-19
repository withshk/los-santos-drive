import * as THREE from 'three';
import {
  H_ROADS,
  MAZE_BANK_HELIPAD,
  REPAIR_BAY,
  ROAD_WIDTH,
  STUNT_RAMPS,
  V_ROADS,
  WORLD_BOUNDS,
} from './constants.js';
import {
  createBuildingFacadePair,
  createGroundNoiseTexture,
  createIntersectionTexture,
  createPierPlankTexture,
  createRoadTexture,
  createRunwayTexture,
  createSignTexture,
} from './textures.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const ALAMO_WATER_LEVEL = 7.4;

// Deterministic base terrain height across the ENTIRE GTA V San Andreas Island!
export function getBaseTerrainHeight(x, z) {
  // 1. Los Santos & Vespucci Beach (South of Z = -245)
  if (z >= -245) {
    let y = 0;
    // West coast beach slope into Pacific Ocean
    if (x < -242) {
      const t = smoothstep(-242, -328, x);
      y = -3.4 * t;
    }
    // East coast ocean dropoff
    if (x > 395) {
      const te = smoothstep(395, 510, x);
      y = Math.min(y, -3.5 * te);
    }
    // South coast past LSIA
    if (z > 625) {
      const ts = smoothstep(625, 700, z);
      y = Math.min(y, -3.5 * ts);
    }
    return y;
  }

  // 2. Northern half: Vinewood Hills -> Grand Senora Desert -> Alamo Sea -> Mount Chiliad -> Paleto Bay
  // Compute island outer coastline envelope so San Andreas is a real island surrounded by ocean!
  const westCoastX = z > -650 ? THREE.MathUtils.lerp(-242, -460, smoothstep(-245, -650, z)) : -460;
  const eastCoastX = z > -650 ? THREE.MathUtils.lerp(395, 505, smoothstep(-245, -650, z)) : 505;
  const westCoastFade = smoothstep(westCoastX - 85, westCoastX + 35, x);
  const eastCoastFade = smoothstep(eastCoastX + 85, eastCoastX - 35, x);
  const northCoastFade = smoothstep(-2060, -1955, z);
  const islandMask = westCoastFade * eastCoastFade * northCoastFade;

  if (islandMask <= 0.001) {
    return -3.6;
  }

  // Base elevation rises smoothly from Los Santos (0) into Blaine County Desert plateau (12m)
  const northStart = smoothstep(-245, -340, z);
  const desertPlateau = 12.0 * smoothstep(-540, -680, z);
  const northLowland = smoothstep(-1830, -1935, z); // Paleto Bay drops gently to coastal 3.5m
  let baseH = THREE.MathUtils.lerp(desertPlateau, 3.5, northLowland);

  // Vinewood Hills ridge band (Z around -245 to -620)
  const vinewoodBand = smoothstep(-245, -390, z) * smoothstep(-660, -520, z);
  const vwRidge1 = Math.exp(-((x - 55) ** 2) / 52000) * 44; // Mount Vinewood (Sign)
  const vwRidge2 = Math.exp(-((x + 145) ** 2) / 36000) * 35; // Galileo Observatory
  const vwRidge3 = Math.exp(-((x - 260) ** 2) / 48000) * 28; // East Vinewood
  const vwHills = vinewoodBand * (12 + vwRidge1 + vwRidge2 + vwRidge3);

  // Grand Senora Desert rolling undulations + RON Wind Farm eastern hills
  const desertBand = smoothstep(-580, -720, z) * smoothstep(-1180, -1040, z);
  const desertRipples =
    desertBand * (Math.sin(x * 0.014) * Math.cos(z * 0.015) * 4.5 + Math.sin((x + z) * 0.008) * 3.0);
  const windFarmHills =
    smoothstep(275, 370, x) * smoothstep(-540, -650, z) * smoothstep(-940, -820, z) * 28;

  // Dramatic iconic Desert Mesas / Red Rock Buttes (placed away from runways & highways!)
  const mesa1 = Math.exp(-((x + 40) ** 2 + (z + 760) ** 2) / 5500) * 32;
  const mesa2 = Math.exp(-((x - 190) ** 2 + (z + 780) ** 2) / 6200) * 28;
  const mesa3 = Math.exp(-((x + 120) ** 2 + (z + 1045) ** 2) / 4800) * 26;
  const mesas = Math.min(26, mesa1) + Math.min(24, mesa2) + Math.min(22, mesa3);

  // MOUNT CHILIAD (Massive 238m peak at X = -15, Z = -1680!)
  const chDx = (x + 15) / 260;
  const chDz = (z + 1680) / 215;
  const chDist = Math.hypot(chDx, chDz);
  let chiliad = 0;
  if (chDist < 1.35) {
    const t = Math.max(0, 1 - chDist / 1.35);
    const ridges = 1 + 0.14 * Math.sin(Math.atan2(chDz, chDx) * 5 + chDist * 4);
    chiliad = Math.pow(t, 1.55) * 242 * ridges;
    // Flat summit deck right at the peak so helicopters can land cleanly!
    if (chDist < 0.085) {
      chiliad = THREE.MathUtils.lerp(chiliad, 236, smoothstep(0.085, 0.045, chDist));
    }
  }
  // Mount Josiah / Western Chiliad sister peak
  const josDist = Math.hypot((x + 285) / 145, (z + 1480) / 135);
  const josiah = josDist < 1 ? Math.pow(1 - josDist, 1.6) * 95 : 0;
  // Mount Gordo on the Northeast
  const gorDist = Math.hypot((x - 320) / 150, (z + 1620) / 150);
  const gordo = gorDist < 1 ? Math.pow(1 - gorDist, 1.6) * 105 : 0;

  let h = baseH + vwHills + desertRipples + windFarmHills + mesas + chiliad + josiah + gordo;

  // Carve Alamo Sea inland salt lake basin (center X=15, Z=-1245)
  const alamoDist = Math.hypot((x - 15) / 205, (z + 1245) / 122);
  if (alamoDist < 1.25) {
    const basinT = smoothstep(1.25, 0.72, alamoDist);
    h = THREE.MathUtils.lerp(h, 2.2, basinT);
  }

  // Flatten Galileo Observatory plateau (-145, -455)
  const obsDist = Math.hypot(x + 145, z + 455);
  if (obsDist < 55) {
    h = THREE.MathUtils.lerp(h, 36.5, smoothstep(55, 28, obsDist));
  }

  // Flatten Sandy Shores Airfield plateau (X: 25..285, Z: -1065..-975)
  const ssX = smoothstep(5, 35, x) * smoothstep(305, 275, x);
  const ssZ = smoothstep(-1090, -1060, z) * smoothstep(-950, -980, z);
  const ssFlat = ssX * ssZ;
  if (ssFlat > 0) {
    h = THREE.MathUtils.lerp(h, 12.0, ssFlat);
  }

  // Flatten Fort Zancudo Military Airbase plateau (X: -415..-145, Z: -985..-875)
  const fzX = smoothstep(-445, -405, x) * smoothstep(-115, -155, x);
  const fzZ = smoothstep(-1015, -980, z) * smoothstep(-845, -880, z);
  const fzFlat = fzX * fzZ;
  if (fzFlat > 0) {
    h = THREE.MathUtils.lerp(h, 6.2, fzFlat);
  }

  // Flatten Paleto Bay coastal town strip (X: -220..+220, Z: -1965..-1880)
  const pbX = smoothstep(-260, -200, x) * smoothstep(260, 200, x);
  const pbZ = smoothstep(-1985, -1955, z) * smoothstep(-1850, -1885, z);
  if (pbX * pbZ > 0) {
    h = THREE.MathUtils.lerp(h, 4.0, pbX * pbZ);
  }

  // Blend smoothly into Los Santos city flat boundary at Z = -245
  if (z > -275) {
    h *= northStart;
  }

  // Apply island ocean coastline envelope
  return THREE.MathUtils.lerp(-3.6, h, islandMask);
}

// 3D block letter recipes for the iconic V I N E W O O D sign
const VINEWOOD_LETTERS = {
  V: [
    [0.12, 0.5, 0.16, 1.0, 0.22],
    [0.88, 0.5, 0.16, 1.0, -0.22],
  ],
  I: [[0.5, 0.5, 0.24, 1.0, 0]],
  N: [
    [0.16, 0.5, 0.2, 1.0, 0],
    [0.84, 0.5, 0.2, 1.0, 0],
    [0.5, 0.5, 0.2, 1.08, 0.56],
  ],
  E: [
    [0.18, 0.5, 0.22, 1.0, 0],
    [0.55, 0.9, 0.72, 0.18, 0],
    [0.5, 0.5, 0.62, 0.18, 0],
    [0.55, 0.1, 0.72, 0.18, 0],
  ],
  W: [
    [0.12, 0.5, 0.17, 1.0, -0.15],
    [0.37, 0.48, 0.16, 0.9, 0.18],
    [0.63, 0.48, 0.16, 0.9, -0.18],
    [0.88, 0.5, 0.17, 1.0, 0.15],
  ],
  O: [
    [0.18, 0.5, 0.2, 1.0, 0],
    [0.82, 0.5, 0.2, 1.0, 0],
    [0.5, 0.9, 0.68, 0.18, 0],
    [0.5, 0.1, 0.68, 0.18, 0],
  ],
  D: [
    [0.18, 0.5, 0.22, 1.0, 0],
    [0.8, 0.5, 0.2, 0.86, 0],
    [0.5, 0.9, 0.66, 0.18, 0],
    [0.5, 0.1, 0.66, 0.18, 0],
  ],
};

export class LosSantosWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.emissiveMaterials = [];
    this.beaconLights = [];
    this.windTurbineRotors = [];
    this.ferrisWheel = null;
    this.radarDish = null;
    this.zancudoRadar = null;
    this.oceanMesh = null;
    this.alamoMesh = null;
    this.repairRing = null;
    this.waterLevel = -2.1;

    this.roadMatShared = null;

    this.buildTerrainAndOcean();
    this.buildRoadNetwork();
    this.buildDelPerroPier();
    this.buildDowntownLandmarks();
    this.buildVinewoodLandmarks();
    this.buildLSIA();
    this.buildGroveStreet();
    this.buildCityBlocks();
    this.buildBlaineCountyDesert();
    this.buildMountChiliadAndPaleto();
    this.buildStuntRamps();
    this.buildPalmTreesAndProps();
  }

  addCollider(cx, cz, w, d, maxY = 100, kind = 'building') {
    this.colliders.push({
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
      maxY,
      kind,
    });
  }

  getSurfaceInfo(x, z, currentY = 0) {
    let height = getBaseTerrainHeight(x, z);
    let surfaceType = 'asphalt';
    let rampInfo = null;

    // Alamo Sea water surface check
    const alamoDist = Math.hypot((x - 15) / 200, (z + 1245) / 118);
    if (alamoDist < 0.94 && height < ALAMO_WATER_LEVEL) {
      surfaceType = 'alamo_water';
    } else if (height < this.waterLevel) {
      surfaceType = 'water';
    } else if (x < -242 && z > -245) {
      surfaceType = 'sand';
    } else if (z < -620 && z > -1380) {
      surfaceType = x > 235 && z < -1110 ? 'grass' : 'desert';
    } else if (z < -245) {
      surfaceType = 'grass';
    }

    // Check Landable Maze Bank Tower Rooftop Helipad!
    const mbDist = Math.hypot(x - MAZE_BANK_HELIPAD.x, z - MAZE_BANK_HELIPAD.z);
    if (mbDist < MAZE_BANK_HELIPAD.radius && currentY >= MAZE_BANK_HELIPAD.y - 12) {
      return {
        height: MAZE_BANK_HELIPAD.y,
        normal: new THREE.Vector3(0, 1, 0),
        surfaceType: 'helipad',
        rampInfo: null,
      };
    }

    // Check Del Perro Pier deck
    if (x <= -222 && x >= -458 && Math.abs(z) <= 13.5) {
      let pierY = 3.0;
      if (x > -248) {
        pierY = 3.0 * smoothstep(-222, -248, x);
      }
      if (pierY >= height) {
        height = pierY;
        surfaceType = 'wood';
      }
    }

    // Check Stunt Ramps
    for (const r of STUNT_RAMPS) {
      const dx = x - r.x;
      const dz = z - r.z;
      const cos = Math.cos(-r.yaw);
      const sin = Math.sin(-r.yaw);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      const halfW = r.width * 0.5 + 0.4;
      const halfL = r.length * 0.5;
      if (Math.abs(localX) <= halfW && Math.abs(localZ) <= halfL) {
        const progress = (localZ + halfL) / r.length;
        const baseY = r.id === 'ramp_pier' ? 3.0 : getBaseTerrainHeight(r.x, r.z);
        const rampY = baseY + progress * r.height;
        if (rampY >= height) {
          height = rampY;
          surfaceType = 'ramp';
          rampInfo = { ramp: r, progress };
        }
      }
    }

    // Estimate terrain surface normal
    const eps = 1.4;
    let hx = getBaseTerrainHeight(x + eps, z);
    let hz = getBaseTerrainHeight(x, z + eps);
    if (surfaceType === 'wood') {
      hx = x + eps > -248 ? 3.0 * smoothstep(-222, -248, x + eps) : 3.0;
      hz = height;
    } else if (rampInfo) {
      const r = rampInfo.ramp;
      const slope = r.height / r.length;
      const dirX = Math.sin(r.yaw);
      const dirZ = Math.cos(r.yaw);
      const normal = new THREE.Vector3(-dirX * slope, 1, -dirZ * slope).normalize();
      return { height, normal, surfaceType, rampInfo };
    }

    const normal = new THREE.Vector3(height - hx, eps, height - hz).normalize();
    return { height, normal, surfaceType, rampInfo };
  }

  buildTerrainAndOcean() {
    // Full San Andreas Island terrain mesh: X in [-750, 750], Z in [-2250, 750]
    const segX = 140;
    const segZ = 220;
    const width = 1500;
    const depth = 3000;
    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -750); // Centers Z from -2250 to +750

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cCity = new THREE.Color(0x525760);
    const cGrass = new THREE.Color(0x5a7240);
    const cHill = new THREE.Color(0x6c7c48);
    const cSand = new THREE.Color(0xe6c88c);
    const cDesert = new THREE.Color(0xd29c64);
    const cRedRock = new THREE.Color(0xb86d47);
    const cFarm = new THREE.Color(0x648844);
    const cMountain = new THREE.Color(0x7c766c);
    const cPeak = new THREE.Color(0xb6b2aa);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getBaseTerrainHeight(x, z);
      pos.setY(i, y - 0.15);

      if (z >= -245) {
        if (x < -238) {
          tmp.copy(cCity).lerp(cSand, smoothstep(-238, -255, x));
        } else if (z > 475 && x < 210) {
          tmp.setHex(0x3a3f4a);
        } else if (x > 220 && z > 330) {
          tmp.copy(cGrass).lerp(cCity, 0.35);
        } else {
          tmp.copy(cCity);
        }
      } else if (z >= -610) {
        // Vinewood Hills transition
        const hillT = smoothstep(-245, -320, z);
        const desBlend = smoothstep(-500, -610, z);
        tmp.copy(cCity).lerp(cHill, hillT).lerp(cDesert, desBlend);
      } else if (z >= -1385) {
        // Blaine County: Grand Senora Desert, Sandy Shores, Fort Zancudo, Alamo Sea, Grapeseed
        if (x > 225 && z < -1105) {
          tmp.copy(cFarm);
        } else if (x < -140 && x > -420 && z < -860 && z > -1000) {
          tmp.setHex(0x545952); // Fort Zancudo military apron
        } else if (y > 22) {
          tmp.copy(cDesert).lerp(cRedRock, smoothstep(20, 38, y));
        } else if (y < 8.5) {
          tmp.copy(cSand); // Alamo Sea shoreline sand
        } else {
          tmp.copy(cDesert);
        }
      } else {
        // Mount Chiliad Wilderness & Paleto Bay
        if (z < -1890 && y < 7.5) {
          tmp.copy(y < 1.5 ? cSand : cGrass);
        } else if (y > 165) {
          tmp.copy(cMountain).lerp(cPeak, smoothstep(165, 225, y));
        } else if (y > 55) {
          tmp.copy(cHill).lerp(cMountain, smoothstep(55, 130, y));
        } else {
          tmp.copy(cGrass);
        }
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const groundTex = createGroundNoiseTexture('#ffffff', '#d8d8d8', 4500);
    groundTex.repeat.set(42, 72);
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: groundTex,
      roughness: 0.92,
      metalness: 0.04,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Surrounding Pacific Ocean (covers entire horizon around San Andreas island!)
    const oceanGeo = new THREE.PlaneGeometry(7800, 8200, 36, 36);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0f6a8a,
      emissive: 0x041d2e,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.55,
      transparent: true,
      opacity: 0.94,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(0, this.waterLevel, -750);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);

    // Alamo Sea turquoise inland desert lake!
    const alamoGeo = new THREE.CircleGeometry(1, 48);
    alamoGeo.rotateX(-Math.PI / 2);
    alamoGeo.scale(192, 1, 114);
    const alamoMat = new THREE.MeshStandardMaterial({
      color: 0x18899c,
      emissive: 0x062f3a,
      emissiveIntensity: 0.3,
      roughness: 0.18,
      metalness: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    this.alamoMesh = new THREE.Mesh(alamoGeo, alamoMat);
    this.alamoMesh.position.set(15, ALAMO_WATER_LEVEL, -1245);
    this.alamoMesh.receiveShadow = true;
    this.scene.add(this.alamoMesh);

    // Shoreline foam strip along Vespucci Beach
    const foamGeo = new THREE.PlaneGeometry(18, 1000);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xe6f7ff,
      transparent: true,
      opacity: 0.4,
    });
    const foam = new THREE.Mesh(foamGeo, foamMat);
    foam.position.set(-306, this.waterLevel + 0.08, 120);
    this.scene.add(foam);
  }

  buildRoadNetwork() {
    const roadTex = createRoadTexture();
    const interTex = createIntersectionTexture();

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
      metalness: 0.06,
    });
    this.roadMatShared = roadMat;

    const interMat = new THREE.MeshStandardMaterial({
      map: interTex,
      roughness: 0.86,
      metalness: 0.05,
    });

    const minZ = H_ROADS[0];
    const maxZ = H_ROADS[H_ROADS.length - 1];

    // Vertical Los Santos roads
    for (const vx of V_ROADS) {
      for (let i = 0; i < H_ROADS.length - 1; i++) {
        const z0 = H_ROADS[i] + ROAD_WIDTH * 0.5;
        const z1 = H_ROADS[i + 1] - ROAD_WIDTH * 0.5;
        const len = z1 - z0;
        const segTex = roadTex.clone();
        segTex.needsUpdate = true;
        segTex.repeat.set(1, Math.max(1, Math.round(len / 24)));
        const mat = new THREE.MeshStandardMaterial({ map: segTex, roughness: 0.86, metalness: 0.05 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, len), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(vx, 0.03, (z0 + z1) * 0.5);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }

    // Horizontal Los Santos roads
    for (const hz of H_ROADS) {
      for (let i = 0; i < V_ROADS.length - 1; i++) {
        const x0 = V_ROADS[i] + ROAD_WIDTH * 0.5;
        const x1 = V_ROADS[i + 1] - ROAD_WIDTH * 0.5;
        const len = x1 - x0;
        const segTex = roadTex.clone();
        segTex.needsUpdate = true;
        segTex.repeat.set(1, Math.max(1, Math.round(len / 24)));
        const mat = new THREE.MeshStandardMaterial({ map: segTex, roughness: 0.86, metalness: 0.05 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, len), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set((x0 + x1) * 0.5, 0.03, hz);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }

    // Intersections
    const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_WIDTH);
    for (const vx of V_ROADS) {
      for (const hz of H_ROADS) {
        const mesh = new THREE.Mesh(interGeo, interMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(vx, 0.04, hz);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }

    // Scenic Vinewood Hills loop
    this.buildTerrainRibbonRoad(
      [
        [0, -220],
        [-15, -280],
        [-55, -340],
        [-115, -395],
        [-145, -455],
        [-85, -490],
        [5, -495],
        [95, -485],
        [175, -430],
        [215, -340],
        [220, -220],
      ],
      15,
      roadMat
    );

    // FULL SAN ANDREAS HIGHWAY LOOP (Connecting Los Santos -> Desert -> Fort Zancudo -> Paleto Bay -> Grapeseed -> Los Santos!)
    // 1. Great Ocean Highway (West Coast Northbound from Vespucci Blvd -> Fort Zancudo -> Paleto Bay)
    this.buildTerrainRibbonRoad(
      [
        [-220, -220],
        [-240, -380],
        [-310, -560],
        [-385, -760],
        [-415, -940],
        [-405, -1180],
        [-390, -1450],
        [-345, -1720],
        [-210, -1905],
        [-10, -1935],
      ],
      18,
      roadMat
    );

    // 2. Senora Freeway & East Coast Highway (Eastbound from Power/Elgin -> Wind Farm -> Sandy Shores -> Grapeseed -> Paleto Bay)
    this.buildTerrainRibbonRoad(
      [
        [330, -220],
        [345, -420],
        [335, -660],
        [325, -900],
        [335, -1120],
        [355, -1350],
        [375, -1620],
        [255, -1870],
        [-10, -1935],
      ],
      18,
      roadMat
    );

    // 3. Route 68 Desert Cross-Island Highway (Fort Zancudo -> Grand Senora Desert -> Sandy Shores -> Senora Fwy!)
    this.buildTerrainRibbonRoad(
      [
        [-410, -900],
        [-240, -895],
        [-90, -885],
        [25, -895],
        [165, -915],
        [325, -900],
      ],
      16,
      roadMat
    );

    // 4. Joshua Road / Desert Connector straight north from Vinewood to Grand Senora & Sandy Shores
    this.buildTerrainRibbonRoad(
      [
        [110, -220],
        [120, -410],
        [85, -620],
        [25, -895],
        [55, -1015],
      ],
      14,
      roadMat
    );

    // Vespucci Beach concrete boardwalk
    const bwMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(8, maxZ - minZ), bwMat);
    bw.rotation.x = -Math.PI / 2;
    bw.position.set(-239, 0.02, (minZ + maxZ) * 0.5);
    bw.receiveShadow = true;
    this.scene.add(bw);
  }

  buildTerrainRibbonRoad(controlPts, width, material) {
    const curve = new THREE.CatmullRomCurve3(
      controlPts.map(([x, z]) => new THREE.Vector3(x, getBaseTerrainHeight(x, z) + 0.16, z))
    );
    const divisions = Math.max(60, controlPts.length * 16);
    const pts = curve.getPoints(divisions);
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const next = pts[Math.min(i + 1, pts.length - 1)];
      const prev = pts[Math.max(i - 1, 0)];
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftX = p.x - side.x * width * 0.5;
      const leftZ = p.z - side.z * width * 0.5;
      const rightX = p.x + side.x * width * 0.5;
      const rightZ = p.z + side.z * width * 0.5;

      positions.push(
        leftX,
        getBaseTerrainHeight(leftX, leftZ) + 0.22,
        leftZ,
        rightX,
        getBaseTerrainHeight(rightX, rightZ) + 0.22,
        rightZ
      );

      const v = i * 0.55;
      uvs.push(0, v, 1, v);

      if (i < pts.length - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  buildDelPerroPier() {
    const plankTex = createPierPlankTexture();
    const deckMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.88 });
    const pilingMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.95 });

    const ramp = new THREE.Mesh(new THREE.BoxGeometry(27, 0.7, 26), deckMat);
    ramp.position.set(-235, 1.25, 0);
    ramp.rotation.z = -Math.atan2(3.0, 26);
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(210, 0.9, 26), deckMat);
    deck.position.set(-353, 2.55, 0);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.scene.add(deck);

    const sideDeck = new THREE.Mesh(new THREE.BoxGeometry(44, 0.9, 24), deckMat);
    sideDeck.position.set(-385, 2.55, -24);
    sideDeck.receiveShadow = true;
    this.scene.add(sideDeck);

    const pilingGeo = new THREE.CylinderGeometry(0.45, 0.5, 9, 8);
    for (let x = -255; x >= -455; x -= 18) {
      for (const z of [-11.5, 0, 11.5]) {
        const p = new THREE.Mesh(pilingGeo, pilingMat);
        p.position.set(x, -1.8, z);
        this.scene.add(p);
      }
    }

    const archMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.55,
    });
    this.emissiveMaterials.push({ mat: archMat, base: 0.25, night: 1.2 });

    const pillarGeo = new THREE.BoxGeometry(1.4, 12, 1.4);
    const pL = new THREE.Mesh(pillarGeo, archMat);
    pL.position.set(-262, 9, -12.5);
    const pR = new THREE.Mesh(pillarGeo, archMat);
    pR.position.set(-262, 9, 12.5);
    this.scene.add(pL, pR);

    const signTex = createSignTexture('DEL PERRO PIER', '#14182a', '#ffda66', '#f43f5e');
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 4.2, 26.5),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0xffffff,
        emissiveMap: signTex,
        emissiveIntensity: 0.65,
      })
    );
    signBoard.position.set(-262, 14.5, 0);
    this.scene.add(signBoard);

    // Rotating Leviathan Ferris Wheel
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(-385, 26, -26);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.4, roughness: 0.4 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 26, 8), legMat);
      leg.position.set(-385 + s * 6, 14, -26);
      leg.rotation.z = s * 0.24;
      this.scene.add(leg);
    }

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xff4d8d,
      emissive: 0xff3b8d,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    this.emissiveMaterials.push({ mat: rimMat, base: 0.35, night: 1.5 });
    wheelGroup.add(
      new THREE.Mesh(new THREE.TorusGeometry(19, 0.55, 10, 36), rimMat),
      new THREE.Mesh(new THREE.TorusGeometry(12, 0.35, 8, 28), rimMat)
    );

    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
    });
    this.emissiveMaterials.push({ mat: spokeMat, base: 0.25, night: 1.2 });

    const gondolaColors = [0xf59e0b, 0xec4899, 0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 38, 6), spokeMat);
      spoke.rotation.z = ang;
      wheelGroup.add(spoke);

      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.2, 2.4),
        new THREE.MeshStandardMaterial({
          color: gondolaColors[i % gondolaColors.length],
          emissive: gondolaColors[i % gondolaColors.length],
          emissiveIntensity: 0.45,
        })
      );
      pod.position.set(Math.cos(ang) * 19, Math.sin(ang) * 19, 0);
      wheelGroup.add(pod);
    }

    this.ferrisWheel = wheelGroup;
    this.scene.add(wheelGroup);

    const coasterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.55,
    });
    this.emissiveMaterials.push({ mat: coasterMat, base: 0.2, night: 1.2 });
    const coasterArch = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.7, 10, 24, Math.PI), coasterMat);
    coasterArch.position.set(-335, 3.0, 0);
    coasterArch.rotation.y = Math.PI / 2;
    this.scene.add(coasterArch);

    // Lifeguard towers & beach umbrellas
    const lgMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
    const lgRoof = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    for (const z of [-130, 85, 225, 345]) {
      const x = -275;
      const y = getBaseTerrainHeight(x, z);
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      const stilts = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), pilingMat);
      stilts.position.y = 1.6;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 4.4), lgMat);
      cabin.position.y = 4.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.5, 4), lgRoof);
      roof.position.y = 6.9;
      roof.rotation.y = Math.PI / 4;
      grp.add(stilts, cabin, roof);
      this.scene.add(grp);
      this.addCollider(x, z, 4.5, 4.5, 8, 'prop');
    }

    const umbColors = [0xf43f5e, 0xf59e0b, 0x06b6d4, 0x8b5cf6, 0x10b981];
    for (let i = 0; i < 22; i++) {
      const x = -255 - (i % 4) * 11;
      const z = -165 + i * 24;
      if (Math.abs(z) < 28) continue;
      const y = getBaseTerrainHeight(x, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), lgRoof);
      pole.position.set(x, y + 1.7, z);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: umbColors[i % umbColors.length], roughness: 0.7 })
      );
      top.position.set(x, y + 3.4, z);
      this.scene.add(pole, top);
    }
  }

  buildDowntownLandmarks() {
    // 1. MAZE BANK TOWER — Block (55, -55) with Landable Rooftop Helipad!
    const mbX = 55;
    const mbZ = -55;
    const mbPair = createBuildingFacadePair({
      wall: '#d8dee9',
      trim: '#eef2f7',
      glass: '#2c415c',
      cols: 12,
      rows: 26,
      seed: 101,
      litChance: 0.48,
    });
    const mbMat = new THREE.MeshStandardMaterial({
      map: mbPair.map,
      emissive: 0xffffff,
      emissiveMap: mbPair.emissiveMap,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.35,
    });
    this.emissiveMaterials.push({ mat: mbMat, base: 0.12, night: 0.95 });

    const mbGroup = new THREE.Group();
    mbGroup.position.set(mbX, 0, mbZ);

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(36, 38, 2.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 })
    );
    plaza.position.y = 1.25;
    plaza.receiveShadow = true;
    mbGroup.add(plaza);

    const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(22, 26, 26, 16), mbMat);
    baseTier.position.y = 15;
    baseTier.castShadow = true;
    mbGroup.add(baseTier);

    const midTier = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 20.5, 86, 16), mbMat);
    midTier.position.y = 70;
    midTier.castShadow = true;
    mbGroup.add(midTier);

    const upperTier = new THREE.Mesh(new THREE.CylinderGeometry(15, 17, 52, 16), mbMat);
    upperTier.position.y = 138;
    upperTier.castShadow = true;
    mbGroup.add(upperTier);

    const crownRing = new THREE.Mesh(
      new THREE.CylinderGeometry(15.6, 15.2, 12, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 })
    );
    crownRing.position.y = 170;
    mbGroup.add(crownRing);

    const redBandMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
    });
    this.emissiveMaterials.push({ mat: redBandMat, base: 0.4, night: 1.6 });

    const redCrown = new THREE.Mesh(new THREE.TorusGeometry(15.8, 0.75, 10, 32), redBandMat);
    redCrown.rotation.x = Math.PI / 2;
    redCrown.position.y = 174;
    mbGroup.add(redCrown);

    // Rooftop Helipad with glowing yellow H circle!
    const helipad = new THREE.Mesh(
      new THREE.CylinderGeometry(14.5, 14.5, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    helipad.position.y = 176.6;
    helipad.receiveShadow = true;
    mbGroup.add(helipad);

    const heliMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const hRing = new THREE.Mesh(new THREE.RingGeometry(10.2, 11.4, 32), heliMarkMat);
    hRing.rotation.x = -Math.PI / 2;
    hRing.position.y = 177.26;
    mbGroup.add(hRing);

    const hLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9), heliMarkMat);
    hLeft.rotation.x = -Math.PI / 2;
    hLeft.position.set(-3.2, 177.27, 0);
    const hRight = hLeft.clone();
    hRight.position.x = 3.2;
    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.6), heliMarkMat);
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, 177.27, 0);
    mbGroup.add(hLeft, hRight, hCross);

    const mazeSignTex = createSignTexture('MAZE BANK', '#991b1b', '#ffffff', '#ef4444');
    const mazeSignMat = new THREE.MeshStandardMaterial({
      map: mazeSignTex,
      emissive: 0xffffff,
      emissiveMap: mazeSignTex,
      emissiveIntensity: 0.75,
    });
    this.emissiveMaterials.push({ mat: mazeSignMat, base: 0.35, night: 1.3 });
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), mazeSignMat);
      s.position.set(Math.sin(ang) * 16.2, 169, Math.cos(ang) * 16.2);
      s.rotation.y = ang;
      mbGroup.add(s);
    }

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    beacon.position.set(14.5, 178.5, 0);
    mbGroup.add(beacon);
    this.beaconLights.push(beacon);

    this.scene.add(mbGroup);
    // Stop collider at Y=168 so helicopters can descend cleanly onto the 177m rooftop helipad!
    this.addCollider(mbX, mbZ, 44, 44, 168, 'building');

    // 2. FIB & IAA TWIN TOWERS — Block (165, -55)
    const fibPair = createBuildingFacadePair({
      wall: '#1b263b',
      trim: '#2d3f5e',
      glass: '#0f1b2e',
      cols: 10,
      rows: 22,
      seed: 202,
      litChance: 0.52,
    });
    const fibMat = new THREE.MeshStandardMaterial({
      map: fibPair.map,
      emissive: 0xffffff,
      emissiveMap: fibPair.emissiveMap,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.55,
    });
    this.emissiveMaterials.push({ mat: fibMat, base: 0.15, night: 1.0 });

    const fib = new THREE.Mesh(new THREE.BoxGeometry(28, 134, 28), fibMat);
    fib.position.set(148, 67, -62);
    fib.castShadow = true;
    this.scene.add(fib);
    this.addCollider(148, -62, 28, 28, 135, 'building');

    const iaa = new THREE.Mesh(new THREE.BoxGeometry(26, 118, 26), fibMat);
    iaa.position.set(184, 59, -46);
    iaa.castShadow = true;
    this.scene.add(iaa);
    this.addCollider(184, -46, 26, 26, 120, 'building');

    const fibSignTex = createSignTexture('F I B', '#0f172a', '#38bdf8', '#38bdf8');
    const fibSign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4.5),
      new THREE.MeshStandardMaterial({
        map: fibSignTex,
        emissive: 0xffffff,
        emissiveMap: fibSignTex,
        emissiveIntensity: 0.8,
      })
    );
    fibSign.position.set(148, 128, -47.8);
    this.scene.add(fibSign);

    // 3. MILE HIGH CLUB — Block (-55, -55)
    const mhCore = new THREE.Mesh(
      new THREE.BoxGeometry(28, 86, 28),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
    );
    mhCore.position.set(-55, 43, -55);
    mhCore.castShadow = true;
    this.scene.add(mhCore);
    this.addCollider(-55, -55, 32, 32, 90, 'building');

    const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.3 });
    const craneMast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 115, 3.2), craneMat);
    craneMast.position.set(-34, 57.5, -36);
    const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(58, 2.8, 3.2), craneMat);
    craneBoom.position.set(-48, 114, -36);
    craneBoom.rotation.y = 0.45;
    this.scene.add(craneMast, craneBoom);

    // 4. LEGION SQUARE — Block (-55, 55)
    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(74, 0.5, 74),
      new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.95 })
    );
    lawn.position.set(-55, 0.2, 55);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    const plazaFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 0.65, 24),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 })
    );
    plazaFloor.position.set(-55, 0.25, 55);
    this.scene.add(plazaFloor);

    const archSculpMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0x9a3412,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    });
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(9 + i * 3.5, 0.8, 8, 24, Math.PI), archSculpMat);
      a.position.set(-55, 0.5, 55);
      a.rotation.y = (i * Math.PI) / 3;
      this.scene.add(a);
    }

    // 5. LOS SANTOS CUSTOMS — Block (-55, -165)
    const lscX = REPAIR_BAY.x;
    const lscZ = REPAIR_BAY.z;
    const lscMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const lscCanopy = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 16), lscMat);
    lscCanopy.position.set(lscX, 7.8, lscZ);
    this.scene.add(lscCanopy);

    for (const sx of [-12, 12]) {
      for (const sz of [-6.5, 6.5]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 1.4), lscMat);
        col.position.set(lscX + sx, 3.75, lscZ + sz);
        this.scene.add(col);
      }
    }

    const lscSignTex = createSignTexture('LS CUSTOMS • REPAIR', '#0c1322', '#38bdf8', '#f5b942');
    const lscSign = new THREE.Mesh(
      new THREE.BoxGeometry(24, 3.6, 0.8),
      new THREE.MeshStandardMaterial({
        map: lscSignTex,
        emissive: 0xffffff,
        emissiveMap: lscSignTex,
        emissiveIntensity: 0.85,
      })
    );
    lscSign.position.set(lscX, 10.6, lscZ + 7.5);
    this.scene.add(lscSign);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    this.repairRing = new THREE.Mesh(new THREE.RingGeometry(5.5, 7.2, 32), ringMat);
    this.repairRing.rotation.x = -Math.PI / 2;
    this.repairRing.position.set(lscX, 0.14, lscZ);
    this.scene.add(this.repairRing);
  }

  buildVinewoodLandmarks() {
    // 1. VINEWOOD SIGN
    const signCenterX = 55;
    const signZ = -542;
    const word = 'VINEWOOD';
    const letterW = 14.5;
    const letterH = 21;
    const spacing = 18.5;
    const startX = signCenterX - ((word.length - 1) * spacing) * 0.5;

    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf8fafc,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    });
    this.emissiveMaterials.push({ mat: letterMat, base: 0.22, night: 1.35 });
    const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const lx = startX + i * spacing;
      const ly = getBaseTerrainHeight(lx, signZ) + 4;
      const grp = new THREE.Group();
      grp.position.set(lx, ly, signZ);

      for (const [cx, cy, sw, sh, rot] of VINEWOOD_LETTERS[ch]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sw * letterW, sh * letterH, 2.2), letterMat);
        bar.position.set((cx - 0.5) * letterW, cy * letterH, 0);
        bar.rotation.z = rot;
        grp.add(bar);
      }
      for (const sx of [-4, 4]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 14, 6), scaffoldMat);
        pole.position.set(sx, -2, -1.6);
        grp.add(pole);
      }
      this.scene.add(grp);
    }

    // 2. GALILEO OBSERVATORY
    const ox = -145;
    const oz = -455;
    const oy = getBaseTerrainHeight(ox, oz);
    const obsGroup = new THREE.Group();
    obsGroup.position.set(ox, oy, oz);

    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xeae6df, roughness: 0.55 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0x5c7f76, roughness: 0.4, metalness: 0.45 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 22), marbleMat);
    base.position.y = 5;
    obsGroup.add(base);

    const centerDome = new THREE.Mesh(new THREE.SphereGeometry(10.5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), copperMat);
    centerDome.position.set(0, 10, 0);
    obsGroup.add(centerDome);

    for (const sx of [-16, 16]) {
      const wing = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7, 11, 14), marbleMat);
      wing.position.set(sx, 5.5, 3);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(6.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), copperMat);
      dome.position.set(sx, 11, 3);
      obsGroup.add(wing, dome);
    }

    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 14, 4), marbleMat);
    obelisk.position.set(0, 7, 22);
    obsGroup.add(obelisk);
    this.scene.add(obsGroup);
    this.addCollider(ox, oz, 44, 24, oy + 25, 'building');

    // Vinewood stilt mansions
    const villaWall = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.65 });
    const villaGlass = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0xffd28a,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.5,
    });
    this.emissiveMaterials.push({ mat: villaGlass, base: 0.08, night: 0.9 });

    for (const [mx, mz] of [[-65, -340], [25, -355], [130, -345], [-210, -335], [195, -425], [-40, -430]]) {
      const my = getBaseTerrainHeight(mx, mz);
      const m = new THREE.Group();
      m.position.set(mx, my, mz);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 12), villaWall);
      lower.position.y = 3;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 14), villaWall);
      upper.position.set(2, 8.5, 0);
      const win = new THREE.Mesh(new THREE.BoxGeometry(19, 3.6, 14.3), villaGlass);
      win.position.set(2, 8.5, 0);
      m.add(lower, upper, win);
      this.scene.add(m);
      this.addCollider(mx, mz, 22, 14, my + 12, 'building');
    }
  }

  buildLSIA() {
    const runwayTex = createRunwayTexture();
    const runwayMat = new THREE.MeshStandardMaterial({ map: runwayTex, roughness: 0.85 });
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(46, 400), runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.rotation.z = Math.PI / 2;
    runway.position.set(-35, 0.06, 545);
    runway.receiveShadow = true;
    this.scene.add(runway);

    const edgeLightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const edgeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    for (let x = -225; x <= 155; x += 25) {
      for (const z of [520, 570]) {
        const l = new THREE.Mesh(edgeGeo, edgeLightMat);
        l.position.set(x, 0.45, z);
        this.scene.add(l);
      }
    }

    const themeX = -35;
    const themeZ = 492;
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.15 });
    for (const rot of [0, Math.PI / 2]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(19, 1.3, 10, 28, Math.PI), whiteMat);
      arch.position.set(themeX, 0, themeZ);
      arch.rotation.y = rot;
      this.scene.add(arch);
    }
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(10, 8, 4.5, 20), whiteMat);
    saucer.position.set(themeX, 11, themeZ);
    this.scene.add(saucer);
    this.addCollider(themeX, themeZ, 18, 18, 22, 'building');

    const towerX = 95;
    const towerZ = 492;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.8, 36, 12), whiteMat);
    shaft.position.set(towerX, 18, towerZ);
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 6, 7, 12),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.6 })
    );
    cab.position.set(towerX, 38, towerZ);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 8.8, 1.5, 12), whiteMat);
    roof.position.set(towerX, 42, towerZ);
    this.radarDish = new THREE.Mesh(
      new THREE.BoxGeometry(7, 2.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    this.radarDish.position.set(towerX, 44.5, towerZ);
    this.scene.add(shaft, cab, roof, this.radarDish);
    this.addCollider(towerX, towerZ, 12, 12, 44, 'building');

    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.3 });
    const hangar = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 42, 16, 1, false, 0, Math.PI), hangarMat);
    hangar.rotation.z = Math.PI / 2;
    hangar.position.set(-145, 0, 602);
    this.scene.add(hangar);
    this.addCollider(-145, 602, 42, 34, 20, 'building');

    this.buildParkedJet(-35, 600, 0.2);
    this.buildParkedJet(85, 602, -0.35);
  }

  buildParkedJet(x, z, yaw, yOffset = 0, bodyHex = 0xf8fafc, stripeHex = 0x0284c7) {
    const g = new THREE.Group();
    g.position.set(x, yOffset + 4.2, z);
    g.rotation.y = yaw;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.35, metalness: 0.25 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.4 });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 34, 14), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6.5, 14), bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 20;
    const wings = new THREE.Mesh(new THREE.BoxGeometry(34, 0.65, 6.2), bodyMat);
    wings.position.set(0, -0.4, 1);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.5, 6.5), stripeMat);
    tailFin.position.set(0, 4.5, -14.5);
    const tailWings = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 3.2), bodyMat);
    tailWings.position.set(0, 0.8, -15);
    g.add(fuselage, nose, wings, tailFin, tailWings);
    this.scene.add(g);
    this.addCollider(x, z, 28, 30, yOffset + 14, 'building');
  }

  buildGroveStreet() {
    const gx = 275;
    const gz = 400;
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.9 });
    const circle = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 0.14, 28), roadMat);
    circle.position.set(gx, 0.04, gz);
    this.scene.add(circle);

    const entry = new THREE.Mesh(new THREE.PlaneGeometry(45, 15), roadMat);
    entry.rotation.x = -Math.PI / 2;
    entry.position.set(gx - 32, 0.05, gz);
    this.scene.add(entry);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 6.8, 0.35, 18),
      new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.95 })
    );
    island.position.set(gx, 0.15, gz);
    this.scene.add(island);

    const houseColors = [0xd6ccb8, 0xc8d8c0, 0xe2d5be, 0xbec9b6, 0xd8cdb8];
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b4938, roughness: 0.9 });
    const greenTrim = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });

    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * 0.72 + i * 0.62;
      const hx = gx + Math.cos(ang) * 32;
      const hz = gz + Math.sin(ang) * 32;
      const h = new THREE.Group();
      h.position.set(hx, 0, hz);
      h.rotation.y = -ang + Math.PI / 2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(13, 5.2, 10),
        new THREE.MeshStandardMaterial({ color: houseColors[i % houseColors.length], roughness: 0.85 })
      );
      body.position.y = 2.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9.6, 3.4, 4), roofMat);
      roof.position.y = 6.9;
      roof.rotation.y = Math.PI / 4;
      const porch = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.6, 10.4), greenTrim);
      porch.position.y = 5.2;
      h.add(body, roof, porch);
      this.scene.add(h);
      this.addCollider(hx, hz, 12, 12, 9, 'building');
    }

    const gsTex = createSignTexture('GROVE STREET', '#14532d', '#4ade80', '#4ade80');
    const gsSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.2, 8.5),
      new THREE.MeshStandardMaterial({ map: gsTex, emissive: 0x22c55e, emissiveIntensity: 0.35 })
    );
    gsSign.position.set(240, 6.2, 390);
    this.scene.add(gsSign);
  }

  buildCityBlocks() {
    const palettes = [
      { wall: '#334155', trim: '#475569', glass: '#1e293b', cols: 8, rows: 18, seed: 11, litChance: 0.45 },
      { wall: '#c7b8a1', trim: '#ddd2bf', glass: '#2e3c4f', cols: 6, rows: 14, seed: 22, litChance: 0.38 },
      { wall: '#28384d', trim: '#3f5675', glass: '#162436', cols: 10, rows: 20, seed: 33, litChance: 0.52 },
      { wall: '#a89f91', trim: '#c9c1b5', glass: '#263445', cols: 7, rows: 12, seed: 44, litChance: 0.35 },
      { wall: '#4a5568', trim: '#718096', glass: '#1a202c', cols: 8, rows: 16, seed: 55, litChance: 0.46 },
      { wall: '#c9886b', trim: '#e0a98f', glass: '#2a3542', cols: 6, rows: 10, seed: 66, litChance: 0.4 },
    ];

    const mats = palettes.map((pal) => {
      const pair = createBuildingFacadePair(pal);
      const m = new THREE.MeshStandardMaterial({
        map: pair.map,
        emissive: 0xffffff,
        emissiveMap: pair.emissiveMap,
        emissiveIntensity: 0.55,
        roughness: 0.5,
        metalness: 0.25,
      });
      this.emissiveMaterials.push({ mat: m, base: 0.1, night: 0.95 });
      return m;
    });

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3f4654, roughness: 0.9 });
    const reserved = new Set(['2,1', '3,1', '1,1', '1,2', '1,0', '4,5']);
    const neonSigns = [
      { text: 'AMMU-NATION', bg: '#7f1d1d', fg: '#fde047', border: '#ef4444' },
      { text: 'CLUCKIN BELL', bg: '#1e3a8a', fg: '#facc15', border: '#38bdf8' },
      { text: 'WEAZEL NEWS', bg: '#111827', fg: '#f97316', border: '#f97316' },
      { text: 'BAHAMA MAMAS', bg: '#581c87', fg: '#f472b6', border: '#38bdf8' },
      { text: '24/7 SUPERMARKET', bg: '#14532d', fg: '#ffffff', border: '#ef4444' },
      { text: 'PISSWASSER', bg: '#78350f', fg: '#fde047', border: '#f59e0b' },
    ];
    let signIdx = 0;

    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let xi = 0; xi < V_ROADS.length - 1; xi++) {
      for (let zi = 0; zi < H_ROADS.length - 1; zi++) {
        if (reserved.has(`${xi},${zi}`)) continue;
        const cx = (V_ROADS[xi] + V_ROADS[xi + 1]) * 0.5;
        const cz = (H_ROADS[zi] + H_ROADS[zi + 1]) * 0.5;
        const distDowntown = Math.hypot(cx - 55, cz + 40);
        const isDowntown = distDowntown < 210;
        const isMidtown = distDowntown < 340;

        for (const [ox, oz] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) {
          const bx = cx + ox + (rand() - 0.5) * 3;
          const bz = cz + oz + (rand() - 0.5) * 3;
          const bw = 24 + rand() * 10;
          const bd = 24 + rand() * 10;
          let bh = 12 + rand() * 16;
          if (isDowntown) bh = 36 + rand() * 72;
          else if (isMidtown) bh = 18 + rand() * 34;

          const mat = mats[Math.floor(rand() * mats.length)];
          const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
          bMesh.position.set(bx, bh * 0.5, bz);
          bMesh.castShadow = bh > 28;
          bMesh.receiveShadow = true;
          this.scene.add(bMesh);
          this.addCollider(bx, bz, bw, bd, bh, 'building');

          if (bh > 42 && rand() > 0.35) {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.55, 5, bd * 0.55), roofMat);
            cap.position.set(bx, bh + 2.5, bz);
            this.scene.add(cap);
          }

          if (isDowntown && rand() > 0.78) {
            const spec = neonSigns[signIdx++ % neonSigns.length];
            const sTex = createSignTexture(spec.text, spec.bg, spec.fg, spec.border);
            const sMat = new THREE.MeshStandardMaterial({
              map: sTex,
              emissive: 0xffffff,
              emissiveMap: sTex,
              emissiveIntensity: 0.75,
            });
            this.emissiveMaterials.push({ mat: sMat, base: 0.25, night: 1.3 });
            const board = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.6), sMat);
            board.position.set(bx, Math.min(18, bh * 0.5), bz + bd * 0.5 + 0.35);
            this.scene.add(board);
          }
        }
      }
    }
  }

  // ==================== FULL GTA V DESERT: BLAINE COUNTY ====================
  buildBlaineCountyDesert() {
    // 1. SANDY SHORES AIRFIELD & TREVOR'S TOWN (X: 25..285, Z: -1065..-975, Y = 12.0)
    const ssY = 12.0;
    const dirtRunwayMat = new THREE.MeshStandardMaterial({ color: 0x8f6b47, roughness: 0.96 });
    const ssRunway = new THREE.Mesh(new THREE.PlaneGeometry(250, 32), dirtRunwayMat);
    ssRunway.rotation.x = -Math.PI / 2;
    ssRunway.position.set(155, ssY + 0.08, -1020);
    ssRunway.receiveShadow = true;
    this.scene.add(ssRunway);

    // Runway white chalk edge markers
    const chalkMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    for (let x = 45; x <= 265; x += 28) {
      for (const z of [-1034, -1006]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.8), chalkMat);
        mark.position.set(x, ssY + 0.3, z);
        this.scene.add(mark);
      }
    }

    // Iconic Trevor Philips Desert Hangar!
    const hangarWall = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 });
    const hangarRoof = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.75, metalness: 0.3 });
    const ssHangar = new THREE.Mesh(new THREE.BoxGeometry(32, 11, 22), hangarWall);
    ssHangar.position.set(150, ssY + 5.5, -1060);
    ssHangar.castShadow = true;
    const ssRoof = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 32, 12, 1, false, 0, Math.PI), hangarRoof);
    ssRoof.rotation.z = Math.PI / 2;
    ssRoof.position.set(150, ssY + 11, -1060);
    this.scene.add(ssHangar, ssRoof);
    this.addCollider(150, -1060, 32, 22, ssY + 18, 'building');

    const ssSignTex = createSignTexture('SANDY SHORES AIRFIELD', '#451a03', '#fde047', '#f97316');
    const ssSign = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 4.5),
      new THREE.MeshStandardMaterial({
        map: ssSignTex,
        emissive: 0xffffff,
        emissiveMap: ssSignTex,
        emissiveIntensity: 0.65,
      })
    );
    ssSign.position.set(150, ssY + 9, -1048.6);
    this.scene.add(ssSign);

    // Sandy Shores Desert Trailers, Motel & Iconic Water Tower
    const trailerColors = [0xd6d3d1, 0xca8a04, 0x991b1b, 0x65a30d, 0x94a3b8];
    const trailerSpots = [
      [115, -1095], [142, -1102], [172, -1098], [205, -1092], [235, -1085],
      [92, -962], [128, -958], [198, -962], [245, -966],
    ];
    trailerSpots.forEach(([tx, tz], i) => {
      const ty = getBaseTerrainHeight(tx, tz);
      const t = new THREE.Mesh(
        new THREE.BoxGeometry(11, 3.6, 4.8),
        new THREE.MeshStandardMaterial({ color: trailerColors[i % trailerColors.length], roughness: 0.85 })
      );
      t.position.set(tx, ty + 1.8, tz);
      t.rotation.y = (i % 3) * 0.25;
      this.scene.add(t);
      this.addCollider(tx, tz, 10, 6, ty + 5, 'building');
    });

    // Sandy Shores Water Tower
    const wtX = 248;
    const wtZ = -1052;
    const wtY = getBaseTerrainHeight(wtX, wtZ);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.4 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 8.5, 14), steelMat);
    tank.position.set(wtX, wtY + 20, wtZ);
    const tankCap = new THREE.Mesh(new THREE.ConeGeometry(5.8, 3.2, 14), steelMat);
    tankCap.position.set(wtX, wtY + 25.8, wtZ);
    for (const [lx, lz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 17, 6), steelMat);
      leg.position.set(wtX + lx, wtY + 8.5, wtZ + lz);
      this.scene.add(leg);
    }
    this.scene.add(tank, tankCap);
    this.addCollider(wtX, wtZ, 10, 10, wtY + 28, 'building');

    // Route 68 Iconic Yellow Jack / Desert Diner Sign!
    const r68Tex = createSignTexture('ROUTE 68 • GRAND SENORA', '#7c2d12', '#fef08a', '#f59e0b');
    const r68Y = getBaseTerrainHeight(25, -860);
    const r68Board = new THREE.Mesh(
      new THREE.BoxGeometry(22, 5.5, 1),
      new THREE.MeshStandardMaterial({
        map: r68Tex,
        emissive: 0xffffff,
        emissiveMap: r68Tex,
        emissiveIntensity: 0.65,
      })
    );
    r68Board.position.set(25, r68Y + 9, -860);
    const r68Post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 6), steelMat);
    r68Post1.position.set(16, r68Y + 4.5, -860);
    const r68Post2 = r68Post1.clone();
    r68Post2.position.x = 34;
    this.scene.add(r68Board, r68Post1, r68Post2);

    // 2. FORT ZANCUDO MILITARY AIRBASE (West Coast: X -405..-155, Z -980..-880, Y = 6.2)
    const fzY = 6.2;
    const fzRunwayTex = createRunwayTexture();
    const fzRunway = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 250),
      new THREE.MeshStandardMaterial({ map: fzRunwayTex, roughness: 0.85 })
    );
    fzRunway.rotation.x = -Math.PI / 2;
    fzRunway.rotation.z = Math.PI / 2;
    fzRunway.position.set(-280, fzY + 0.08, -930);
    fzRunway.receiveShadow = true;
    this.scene.add(fzRunway);

    // Military concrete hangars & ATC Tower + Geodesic Radar Dome
    const milMat = new THREE.MeshStandardMaterial({ color: 0x5c6652, roughness: 0.85 });
    for (const hx of [-335, -265, -195]) {
      const mh = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 28, 12, 1, false, 0, Math.PI), milMat);
      mh.rotation.z = Math.PI / 2;
      mh.position.set(hx, fzY, -972);
      this.scene.add(mh);
      this.addCollider(hx, -972, 28, 26, fzY + 15, 'building');
    }

    // Military ATC Control Tower
    const fzTower = new THREE.Mesh(new THREE.BoxGeometry(10, 32, 10), milMat);
    fzTower.position.set(-225, fzY + 16, -892);
    const fzCab = new THREE.Mesh(
      new THREE.BoxGeometry(13, 6, 13),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.6 })
    );
    fzCab.position.set(-225, fzY + 34, -892);
    this.zancudoRadar = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 0.8), steelMat);
    this.zancudoRadar.position.set(-225, fzY + 39, -892);
    this.scene.add(fzTower, fzCab, this.zancudoRadar);
    this.addCollider(-225, -892, 13, 13, fzY + 40, 'building');

    // Giant white military geodesic radar dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(11, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    dome.position.set(-340, fzY + 9, -892);
    this.scene.add(dome);
    this.addCollider(-340, -892, 20, 20, fzY + 20, 'building');

    const fzSignTex = createSignTexture('FORT ZANCUDO AIRBASE', '#1c2618', '#a3e635', '#ef4444');
    const fzSign = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 4.5),
      new THREE.MeshStandardMaterial({
        map: fzSignTex,
        emissive: 0xffffff,
        emissiveMap: fzSignTex,
        emissiveIntensity: 0.6,
      })
    );
    fzSign.position.set(-280, fzY + 12, -875);
    this.scene.add(fzSign);

    // 3. RON ALTERNATES WIND FARM (16 Giant Spinning Wind Turbines on East Desert Hills!)
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.2 });
    const bladeGeo = new THREE.BoxGeometry(1.1, 18, 0.35);
    for (let i = 0; i < 16; i++) {
      const wx = 365 + (i % 4) * 34;
      const wz = -600 - Math.floor(i / 4) * 76;
      const wy = getBaseTerrainHeight(wx, wz);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.4, 38, 10), whiteMat);
      tower.position.set(wx, wy + 19, wz);
      this.scene.add(tower);

      const hub = new THREE.Group();
      hub.position.set(wx, wy + 38, wz + 1.2);
      for (let b = 0; b < 3; b++) {
        const pivot = new THREE.Group();
        pivot.rotation.z = (b * Math.PI * 2) / 3;
        const blade = new THREE.Mesh(bladeGeo, whiteMat);
        blade.position.y = 9;
        pivot.add(blade);
        hub.add(pivot);
      }
      this.scene.add(hub);
      this.windTurbineRotors.push({ hub, speed: 1.1 + (i % 4) * 0.22, phase: i * 0.7 });
    }

    // 4. GRAPESEED FARMS (Red Barn & Silos east of Alamo Sea)
    const barnX = 305;
    const barnZ = -1240;
    const barnY = getBaseTerrainHeight(barnX, barnZ);
    const barn = new THREE.Mesh(
      new THREE.BoxGeometry(24, 10, 16),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
    );
    barn.position.set(barnX, barnY + 5, barnZ);
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 18, 12), steelMat);
    silo.position.set(barnX + 16, barnY + 9, barnZ - 4);
    this.scene.add(barn, silo);
    this.addCollider(barnX, barnZ, 26, 18, barnY + 14, 'building');

    // 5. INSTANCED DESERT JOSHUA TREES / CACTI & RED ROCK BOULDERS across Grand Senora Desert!
    const desertCoords = [];
    let dSeed = 888;
    const dRand = () => {
      dSeed = (dSeed * 1664525 + 1013904223) % 4294967296;
      return dSeed / 4294967296;
    };
    for (let i = 0; i < 160; i++) {
      const dx = -340 + dRand() * 680;
      const dz = -630 - dRand() * 520;
      // Avoid Sandy Shores & Fort Zancudo runways and Route 68!
      if (dx > 20 && dx < 290 && dz < -960 && dz > -1075) continue;
      if (dx > -425 && dx < -135 && dz < -865 && dz > -995) continue;
      if (Math.abs(dz + 895) < 28) continue;
      const dy = getBaseTerrainHeight(dx, dz);
      if (dy < 8.5) continue;
      desertCoords.push([dx, dy, dz, 0.7 + dRand() * 0.9]);
    }

    const cactusGeo = new THREE.CylinderGeometry(0.42, 0.55, 5.2, 7);
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.9 });
    const rockGeo = new THREE.DodecahedronGeometry(3.2, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xa66341, roughness: 0.95 });

    const cactusInst = new THREE.InstancedMesh(cactusGeo, cactusMat, desertCoords.length);
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, Math.floor(desertCoords.length / 2));
    const dummy = new THREE.Object3D();

    desertCoords.forEach(([dx, dy, dz, sc], idx) => {
      dummy.position.set(dx, dy + 2.5 * sc, dz);
      dummy.rotation.set(0, idx * 1.1, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      cactusInst.setMatrixAt(idx, dummy.matrix);

      if (idx % 2 === 0) {
        dummy.position.set(dx + 4.5, dy + 1.1 * sc, dz + 3.2);
        dummy.rotation.set(idx * 0.4, idx * 0.7, idx * 0.3);
        dummy.scale.set(sc * 1.4, sc * 0.85, sc * 1.2);
        dummy.updateMatrix();
        rockInst.setMatrixAt(idx >> 1, dummy.matrix);
      }
    });
    this.scene.add(cactusInst, rockInst);
  }

  // ==================== MOUNT CHILIAD & PALETO BAY ====================
  buildMountChiliadAndPaleto() {
    // 1. MOUNT CHILIAD SUMMIT CABLE CAR STATION & BROADCAST TOWER (X=-15, Z=-1680, Y≈238m)
    const cx = -15;
    const cz = -1680;
    const cy = getBaseTerrainHeight(cx, cz);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(28, 1.4, 24), woodMat);
    deck.position.set(cx, cy + 0.5, cz + 14);
    deck.receiveShadow = true;
    this.scene.add(deck);

    // Cable Car Station Building
    const station = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 12), woodMat);
    station.position.set(cx - 8, cy + 4.5, cz - 8);
    const stRoof = new THREE.Mesh(new THREE.ConeGeometry(12.5, 4.5, 4), roofMat);
    stRoof.position.set(cx - 8, cy + 11.2, cz - 8);
    stRoof.rotation.y = Math.PI / 4;
    this.scene.add(station, stRoof);
    this.addCollider(cx - 8, cz - 8, 16, 12, cy + 14, 'building');

    // Towering Red/White Broadcast Spire atop Mount Chiliad
    const spireRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
    const spireWht = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2 - s * 0.18, 1.4 - s * 0.18, 8, 8),
        s % 2 === 0 ? spireRed : spireWht
      );
      seg.position.set(cx + 12, cy + 4 + s * 8, cz - 6);
      this.scene.add(seg);
    }
    const chBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    chBeacon.position.set(cx + 12, cy + 42, cz - 6);
    this.scene.add(chBeacon);
    this.beaconLights.push(chBeacon);

    const chSignTex = createSignTexture('MOUNT CHILIAD • 245M', '#1e293b', '#f8fafc', '#f59e0b');
    const chSign = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4.2),
      new THREE.MeshStandardMaterial({
        map: chSignTex,
        emissive: 0xffffff,
        emissiveMap: chSignTex,
        emissiveIntensity: 0.7,
      })
    );
    chSign.position.set(cx - 8, cy + 7.5, cz - 1.8);
    this.scene.add(chSign);

    // 2. PALETO BAY NORTHERN COASTAL TOWN (Z ≈ -1935)
    const pbColors = [0xd6c7b2, 0xb5c9d6, 0xd4b2a7, 0xc4d6b5, 0xe2e8f0];
    for (let i = 0; i < 12; i++) {
      const bx = -135 + i * 26;
      const bz = i % 2 === 0 ? -1910 : -1960;
      const by = getBaseTerrainHeight(bx, bz);
      const bh = 6.5 + (i % 3) * 3.5;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(15, bh, 12),
        new THREE.MeshStandardMaterial({ color: pbColors[i % pbColors.length], roughness: 0.82 })
      );
      b.position.set(bx, by + bh * 0.5, bz);
      this.scene.add(b);
      this.addCollider(bx, bz, 15, 12, by + bh + 1, 'building');
    }

    const pbSignTex = createSignTexture('WELCOME TO PALETO BAY', '#0c4a6e', '#fde047', '#38bdf8');
    const pbSignY = getBaseTerrainHeight(-10, -1905);
    const pbSign = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 4.8),
      new THREE.MeshStandardMaterial({
        map: pbSignTex,
        emissive: 0xffffff,
        emissiveMap: pbSignTex,
        emissiveIntensity: 0.65,
      })
    );
    pbSign.position.set(-10, pbSignY + 11, -1905);
    this.scene.add(pbSign);

    // 3. INSTANCED PINE FOREST around Mount Chiliad & Paleto Forest!
    const pineCoords = [];
    let pSeed = 404;
    const pRand = () => {
      pSeed = (pSeed * 1664525 + 1013904223) % 4294967296;
      return pSeed / 4294967296;
    };
    for (let i = 0; i < 200; i++) {
      const px = -360 + pRand() * 720;
      const pz = -1410 - pRand() * 540;
      const py = getBaseTerrainHeight(px, pz);
      if (py < 3 || py > 125) continue; // Below tree line & above water
      if (Math.abs(pz + 1935) < 28) continue; // Keep Paleto Blvd clear
      pineCoords.push([px, py, pz, 0.8 + pRand() * 0.7]);
    }

    const pTrunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 6, 6);
    const pTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
    const pConeGeo = new THREE.ConeGeometry(3.8, 12, 7);
    const pConeMat = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.9 });

    const pTrunks = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, pineCoords.length);
    const pCones = new THREE.InstancedMesh(pConeGeo, pConeMat, pineCoords.length);
    const dummy = new THREE.Object3D();

    pineCoords.forEach(([px, py, pz, sc], idx) => {
      dummy.position.set(px, py + 3 * sc, pz);
      dummy.rotation.set(0, idx, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      pTrunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px, py + 9.5 * sc, pz);
      dummy.updateMatrix();
      pCones.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(pTrunks, pCones);
  }

  buildStuntRamps() {
    const rampBodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.25 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.5,
    });
    this.emissiveMaterials.push({ mat: stripeMat, base: 0.25, night: 1.2 });

    for (const r of STUNT_RAMPS) {
      const baseY = r.id === 'ramp_pier' ? 3.0 : getBaseTerrainHeight(r.x, r.z);
      const halfW = r.width * 0.5;
      const halfL = r.length * 0.5;
      const h = r.height;

      const shape = new THREE.Shape();
      shape.moveTo(-halfL, 0);
      shape.lineTo(halfL, 0);
      shape.lineTo(halfL, h);
      shape.closePath();

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: r.width, bevelEnabled: false });
      extrudeGeo.translate(0, 0, -halfW);
      extrudeGeo.rotateY(-Math.PI / 2);

      const mesh = new THREE.Mesh(extrudeGeo, rampBodyMat);
      mesh.position.set(r.x, baseY, r.z);
      mesh.rotation.y = r.yaw;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const lip = new THREE.Mesh(new THREE.BoxGeometry(r.width + 0.4, 0.55, 0.8), stripeMat);
      lip.position.set(
        r.x + Math.sin(r.yaw) * halfL,
        baseY + h + 0.1,
        r.z + Math.cos(r.yaw) * halfL
      );
      lip.rotation.y = r.yaw;
      this.scene.add(lip);
    }
  }

  buildPalmTreesAndProps() {
    const palmPositions = [];
    for (let z = -200; z <= 420; z += 28) {
      if (Math.abs(z) < 22) continue;
      palmPositions.push([-234, z], [-252, z + 10]);
    }
    for (let x = -195; x <= 310; x += 26) {
      if (V_ROADS.some((vr) => Math.abs(x - vr) < 16)) continue;
      palmPositions.push([x, -234], [x, -206]);
    }
    for (let z = -190; z <= 200; z += 34) {
      if (H_ROADS.some((hr) => Math.abs(z - hr) < 16)) continue;
      palmPositions.push([14, z], [-14, z]);
    }
    palmPositions.push([275, 400], [250, 382], [298, 385], [295, 420], [252, 422]);
    for (let x = -200; x <= 260; x += 50) {
      for (let z = -290; z >= -470; z -= 64) {
        if (Math.hypot(x + 145, z + 455) < 42) continue;
        palmPositions.push([x + ((z * 13) % 17), z]);
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.55, 13, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5c43, roughness: 0.95 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);

    const crownGeo = new THREE.ConeGeometry(4.4, 2.6, 7);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.85 });
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, palmPositions.length);

    const crownTopGeo = new THREE.ConeGeometry(3.2, 2.2, 7);
    const crownTopInst = new THREE.InstancedMesh(crownTopGeo, crownMat, palmPositions.length);

    const dummy = new THREE.Object3D();
    palmPositions.forEach(([px, pz], idx) => {
      const py = getBaseTerrainHeight(px, pz);
      const scale = 0.85 + ((idx * 37) % 10) * 0.04;
      const tiltX = (((idx * 19) % 11) - 5) * 0.018;
      const tiltZ = (((idx * 23) % 11) - 5) * 0.018;

      dummy.position.set(px, py + 6.5 * scale, pz);
      dummy.rotation.set(tiltX, idx * 0.8, tiltZ);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px + tiltZ * 6, py + 12.6 * scale, pz - tiltX * 6);
      dummy.rotation.set(0, idx * 0.9, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      crownInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px + tiltZ * 6, py + 13.7 * scale, pz - tiltX * 6);
      dummy.rotation.set(0, idx * 0.9 + 0.5, 0);
      dummy.updateMatrix();
      crownTopInst.setMatrixAt(idx, dummy.matrix);
    });

    trunkInst.castShadow = true;
    this.scene.add(trunkInst, crownInst, crownTopInst);

    // Streetlights along main avenues
    const lampCoords = [];
    for (const vx of [-220, -110, 0, 110, 220]) {
      for (let z = -195; z <= 435; z += 55) {
        if (H_ROADS.some((hr) => Math.abs(z - hr) < 16)) continue;
        lampCoords.push([vx + 12.2, z]);
      }
    }

    const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 9.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.5 });
    const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCoords.length);

    const bulbGeo = new THREE.SphereGeometry(0.55, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: 0xffc66d,
      emissiveIntensity: 1.0,
    });
    this.emissiveMaterials.push({ mat: bulbMat, base: 0.15, night: 2.2 });
    const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCoords.length);

    lampCoords.forEach(([lx, lz], idx) => {
      dummy.position.set(lx, 4.75, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(lx - 1.2, 9.5, lz);
      dummy.updateMatrix();
      bulbInst.setMatrixAt(idx, dummy.matrix);
    });

    this.scene.add(poleInst, bulbInst);
  }

  resolveBuildingCollision(pos, radius) {
    let hit = false;
    const normal = new THREE.Vector3();

    for (const box of this.colliders) {
      if (pos.y > box.maxY) continue;
      if (
        pos.x + radius > box.minX &&
        pos.x - radius < box.maxX &&
        pos.z + radius > box.minZ &&
        pos.z - radius < box.maxZ
      ) {
        const penLeft = pos.x + radius - box.minX;
        const penRight = box.maxX - (pos.x - radius);
        const penTop = pos.z + radius - box.minZ;
        const penBottom = box.maxZ - (pos.z - radius);
        const minPen = Math.min(penLeft, penRight, penTop, penBottom);

        if (minPen === penLeft) {
          pos.x = box.minX - radius;
          normal.set(-1, 0, 0);
        } else if (minPen === penRight) {
          pos.x = box.maxX + radius;
          normal.set(1, 0, 0);
        } else if (minPen === penTop) {
          pos.z = box.minZ - radius;
          normal.set(0, 0, -1);
        } else {
          pos.z = box.maxZ + radius;
          normal.set(0, 0, 1);
        }
        hit = true;
      }
    }

    // Clamp playable San Andreas island airspace bounds
    if (pos.x < WORLD_BOUNDS.minX) {
      pos.x = WORLD_BOUNDS.minX;
      normal.set(1, 0, 0);
      hit = true;
    } else if (pos.x > WORLD_BOUNDS.maxX) {
      pos.x = WORLD_BOUNDS.maxX;
      normal.set(-1, 0, 0);
      hit = true;
    }
    if (pos.z < WORLD_BOUNDS.minZ) {
      pos.z = WORLD_BOUNDS.minZ;
      normal.set(0, 0, 1);
      hit = true;
    } else if (pos.z > WORLD_BOUNDS.maxZ) {
      pos.z = WORLD_BOUNDS.maxZ;
      normal.set(0, 0, -1);
      hit = true;
    }

    return hit ? normal : null;
  }

  update(dt, time, nightFactor) {
    if (this.ferrisWheel) {
      this.ferrisWheel.rotation.z = time * 0.22;
    }
    if (this.radarDish) {
      this.radarDish.rotation.y = time * 1.4;
    }
    if (this.zancudoRadar) {
      this.zancudoRadar.rotation.y = -time * 1.8;
    }
    for (const wt of this.windTurbineRotors) {
      wt.hub.rotation.z = time * wt.speed + wt.phase;
    }
    if (this.repairRing) {
      const s = 1 + Math.sin(time * 3.5) * 0.08;
      this.repairRing.scale.set(s, s, 1);
    }
    if (this.oceanMesh) {
      this.oceanMesh.position.y = this.waterLevel + Math.sin(time * 1.2) * 0.14;
    }
    if (this.alamoMesh) {
      this.alamoMesh.position.y = ALAMO_WATER_LEVEL + Math.sin(time * 1.5 + 1) * 0.08;
    }
    for (const b of this.beaconLights) {
      b.visible = Math.sin(time * 4.5) > -0.2;
    }
    for (const item of this.emissiveMaterials) {
      item.mat.emissiveIntensity = THREE.MathUtils.lerp(item.base, item.night, nightFactor);
    }
  }
}
