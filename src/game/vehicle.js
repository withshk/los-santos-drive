import * as THREE from 'three';
import { REPAIR_BAY, VEHICLES } from './constants.js';
import { createHeadlightBeamTexture, createSoftGlowTexture } from './textures.js';
import { ALAMO_WATER_LEVEL } from './world.js';

let cachedGlowTex = null;
let cachedBeamTex = null;

export function buildVehicleMesh(spec, isTraffic = false) {
  if (spec.type === 'plane') return buildPlaneMesh(spec);
  if (spec.type === 'heli') return buildHeliMesh(spec);
  return buildCarMesh(spec, isTraffic);
}

function buildPlaneMesh(spec) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isJet = spec.bodyStyle === 'jet';
  const mainMat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: isJet ? 0.32 : 0.28,
    metalness: isJet ? 0.65 : 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accent,
    roughness: 0.32,
    metalness: 0.4,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.92,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });

  const props = [];
  const nitroFlames = [];

  if (isJet) {
    // P-996 LAZER FIGHTER JET
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.88, 10.2, 12), mainMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, 1.55, 0);
    fuselage.castShadow = true;
    bodyGroup.add(fuselage);

    // Pointed supersonic nose cone (+Z is forward)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.6, 12), darkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.55, 6.9);
    bodyGroup.add(nose);

    // Bubble fighter canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), glassMat);
    canopy.scale.set(0.95, 0.85, 2.6);
    canopy.position.set(0, 2.22, 2.3);
    bodyGroup.add(canopy);

    // Swept Delta Main Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 2.2);
    wingShape.lineTo(5.6, -2.6);
    wingShape.lineTo(5.6, -3.9);
    wingShape.lineTo(0, -3.5);
    wingShape.lineTo(-5.6, -3.9);
    wingShape.lineTo(-5.6, -2.6);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.22, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);
    const wings = new THREE.Mesh(wingGeo, mainMat);
    wings.position.set(0, 1.55, 0);
    wings.castShadow = true;
    bodyGroup.add(wings);

    // Orange fighter wingtip stripes
    for (const sx of [-5.2, 5.2]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.26, 1.35), accentMat);
      tip.position.set(sx, 1.45, -3.2);
      bodyGroup.add(tip);
    }

    // Twin canted vertical tail stabilizers
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 2.6), mainMat);
      fin.position.set(s * 1.15, 2.6, -4.3);
      fin.rotation.z = -s * 0.24;
      bodyGroup.add(fin);

      // Rear horizontal tailplane
      const hTail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.4), accentMat);
      hTail.position.set(s * 1.85, 1.52, -4.7);
      bodyGroup.add(hTail);
    }

    // Jet engine exhaust nozzle + twin/main afterburner flame
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.52, 1.1, 12), darkMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 1.55, -5.5);
    bodyGroup.add(nozzle);

    const flameGeo = new THREE.ConeGeometry(0.55, 3.6, 10);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 1.55, -7.8);
    bodyGroup.add(flame);
    nitroFlames.push(flame);
  } else {
    // WESTERN CUBAN 800 TWIN-PROP AIRPLANE
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.45, 8.6), mainMat);
    fuselage.position.set(0, 1.65, 0.1);
    fuselage.castShadow = true;
    bodyGroup.add(fuselage);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.15, 1.8), accentMat);
    nose.position.set(0, 1.55, 5.1);
    bodyGroup.add(nose);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.85, 2.9), glassMat);
    cockpit.position.set(0, 2.45, 1.1);
    bodyGroup.add(cockpit);

    // Classic high-lift straight wings
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.26, 2.1), mainMat);
    wing.position.set(0, 1.65, 0.8);
    wing.castShadow = true;
    bodyGroup.add(wing);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.65, 0.29, 0.45), accentMat);
    stripe.position.set(0, 1.65, 1.55);
    bodyGroup.add(stripe);

    // Tail fin & horizontal stabilizer
    const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 1.9), accentMat);
    vFin.position.set(0, 2.9, -3.8);
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 1.25), mainMat);
    hStab.position.set(0, 1.9, -3.9);
    bodyGroup.add(vFin, hStab);

    // Twin engine nacelles + spinning propellers!
    const propBladeGeo = new THREE.BoxGeometry(2.1, 0.16, 0.08);
    for (const sx of [-2.7, 2.7]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 2.4, 10), accentMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(sx, 1.6, 1.6);
      bodyGroup.add(pod);

      const hub = new THREE.Group();
      hub.position.set(sx, 1.6, 2.9);
      const b1 = new THREE.Mesh(propBladeGeo, darkMat);
      const b2 = new THREE.Mesh(propBladeGeo, darkMat);
      b2.rotation.z = Math.PI / 2;
      hub.add(b1, b2);
      bodyGroup.add(hub);
      props.push(hub);
    }

    // Boost flame behind engine nacelles
    const flameGeo = new THREE.ConeGeometry(0.24, 1.6, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    for (const sx of [-2.7, 2.7]) {
      const f = new THREE.Mesh(flameGeo, flameMat);
      f.position.set(sx, 1.55, -0.2);
      f.visible = false;
      bodyGroup.add(f);
      nitroFlames.push(f);
    }
  }

  // Red (left/+X) & Green (right/-X) aviation wingtip navigation lights
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  navL.position.set(5.6, 1.6, isJet ? -3.1 : 0.9);
  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  navR.position.set(-5.6, 1.6, isJet ? -3.1 : 0.9);
  bodyGroup.add(navL, navR);

  // Tricycle landing gear struts + wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const gearPositions = [
    [0, 0.36, 3.6],
    [-1.7, 0.36, -0.8],
    [1.7, 0.36, -0.8],
  ];
  const wheelMeshes = [];
  for (const [gx, gy, gz] of gearPositions) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.15, 6), darkMat);
    strut.position.set(gx, 0.92, gz);
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(gx, gy, gz);
    bodyGroup.add(strut, w);
    wheelMeshes.push(w);
  }

  return {
    root,
    bodyGroup,
    wheelPivots: [],
    wheelMeshes,
    tailMat: null,
    headMat: null,
    headlightCones: null,
    underglowMesh: null,
    nitroFlames,
    props,
    mainRotor: null,
    tailRotor: null,
    lightbarRed: null,
    lightbarBlue: null,
  };
}

function buildHeliMesh(spec) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isPolice = spec.isPolice;
  const mainMat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: isPolice ? 0.25 : 0.45,
    metalness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accent,
    roughness: 0.35,
    metalness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x13243b,
    roughness: 0.08,
    metalness: 0.88,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.8 });

  // Main Helicopter Fuselage / Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.85, 4.3), mainMat);
  cabin.position.set(0, 1.85, 0.4);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  // Rounded nose cockpit bubble
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.12, 12, 10), glassMat);
  nose.scale.set(0.95, 0.88, 1.35);
  nose.position.set(0, 1.82, 2.4);
  bodyGroup.add(nose);

  // Side windows
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.85, 2.4), glassMat);
  sideWin.position.set(0, 2.05, 0.75);
  bodyGroup.add(sideWin);

  if (isPolice) {
    // Classic LSPD White belly stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.55, 4.1), accentMat);
    stripe.position.set(0, 1.35, 0.4);
    bodyGroup.add(stripe);
  } else {
    // Buzzard tactical stub wings & rocket pods
    const stub = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.85), darkMat);
    stub.position.set(0, 1.45, 0.35);
    bodyGroup.add(stub);
    for (const sx of [-1.95, 1.95]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.45, 10), accentMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(sx, 1.35, 0.55);
      bodyGroup.add(pod);
    }
  }

  // Tapered Tail Boom
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.52, 5.4, 8), mainMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 2.15, -4.1);
  boom.castShadow = true;
  bodyGroup.add(boom);

  // Vertical Tail Fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.85, 1.1), isPolice ? accentMat : mainMat);
  fin.position.set(0, 2.65, -6.5);
  bodyGroup.add(fin);

  // Landing Skids
  for (const sx of [-1.15, 1.15]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.4, 8), darkMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, 0.14, 0.55);
    bodyGroup.add(skid);
    for (const sz of [-0.6, 1.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6), darkMat);
      leg.position.set(sx * 0.85, 0.62, sz);
      leg.rotation.z = sx > 0 ? 0.25 : -0.25;
      bodyGroup.add(leg);
    }
  }

  // Main Rotor Mast + Spinning 4-Blade Main Rotor + Translucent Motion Blur Disc!
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.85, 8), darkMat);
  mast.position.set(0, 3.1, 0.35);
  bodyGroup.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 3.55, 0.35);
  const bladeGeo = new THREE.BoxGeometry(10.2, 0.07, 0.34);
  const b1 = new THREE.Mesh(bladeGeo, darkMat);
  const b2 = new THREE.Mesh(bladeGeo, darkMat);
  b2.rotation.y = Math.PI / 2;
  const rotorDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 5.1, 28),
    new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  rotorDisc.rotation.x = -Math.PI / 2;
  mainRotor.add(b1, b2, rotorDisc);
  bodyGroup.add(mainRotor);

  // Spinning Tail Rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.28, 2.55, -6.5);
  const tBladeGeo = new THREE.BoxGeometry(0.08, 1.7, 0.18);
  const tb1 = new THREE.Mesh(tBladeGeo, darkMat);
  const tb2 = new THREE.Mesh(tBladeGeo, darkMat);
  tb2.rotation.x = Math.PI / 2;
  tailRotor.add(tb1, tb2);
  bodyGroup.add(tailRotor);

  // LSPD Police Maverick Red/Blue Strobe Lights + Night Searchlight Cone
  let lightbarRed = null;
  let lightbarBlue = null;
  let headlightCones = null;
  if (isPolice) {
    lightbarRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff1122, emissive: 0xff1122, emissiveIntensity: 2.5 })
    );
    lightbarRed.position.set(-1.1, 1.4, 2.2);
    lightbarBlue = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x3b82f6, emissiveIntensity: 2.5 })
    );
    lightbarBlue.position.set(1.1, 1.4, 2.2);
    bodyGroup.add(lightbarRed, lightbarBlue);

    // Searchlight cone pointing downward-forward at night!
    headlightCones = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 24, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff8dc,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    cone.position.set(0, -10.5, 7.5);
    cone.rotation.x = -0.42;
    headlightCones.add(cone);
    bodyGroup.add(headlightCones);
  }

  return {
    root,
    bodyGroup,
    wheelPivots: [],
    wheelMeshes: [],
    tailMat: null,
    headMat: null,
    headlightCones,
    underglowMesh: null,
    nitroFlames: [],
    props: [],
    mainRotor,
    tailRotor,
    lightbarRed,
    lightbarBlue,
  };
}

function buildCarMesh(spec, isTraffic = false) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const w = spec.width || 2.1;
  const l = spec.length || 4.7;
  const h = spec.height || 1.4;
  const style = spec.bodyStyle || 'muscle';

  const paintMat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: style === 'suv' ? 0.65 : 0.22,
    metalness: style === 'suv' ? 0.2 : 0.68,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accent ?? 0xffffff,
    roughness: 0.3,
    metalness: 0.5,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
    metalness: 0.25,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.9,
  });

  const lowerH = style === 'suv' ? h * 0.48 : h * 0.42;
  const lowerY = 0.48 + lowerH * 0.5;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, l), paintMat);
  chassis.position.y = lowerY;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyGroup.add(chassis);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, lowerH * 0.52, 0.38), darkTrimMat);
  bumper.position.set(0, 0.52, l * 0.5 + 0.05);
  bodyGroup.add(bumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, lowerH * 0.5, 0.32), darkTrimMat);
  rearBumper.position.set(0, 0.54, -l * 0.5 - 0.04);
  bodyGroup.add(rearBumper);

  const cabinW = w * (style === 'suv' ? 0.92 : 0.84);
  const cabinH = style === 'super' ? h * 0.38 : style === 'suv' ? h * 0.44 : h * 0.42;
  const cabinL = style === 'suv' ? l * 0.62 : style === 'super' ? l * 0.46 : l * 0.48;
  const cabinZ = style === 'suv' ? -0.25 : style === 'super' ? -0.15 : -0.22;
  const cabinY = lowerY + lowerH * 0.5 + cabinH * 0.44;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), style === 'police' ? accentMat : paintMat);
  cabin.position.set(0, cabinY, cabinZ);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  const glassWrap = new THREE.Mesh(
    new THREE.BoxGeometry(cabinW + 0.05, cabinH * 0.72, cabinL + 0.06),
    glassMat
  );
  glassWrap.position.set(0, cabinY - 0.02, cabinZ);
  bodyGroup.add(glassWrap);

  if (style === 'police') {
    const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, lowerH * 0.85, l * 0.42), accentMat);
    doorStripe.position.set(0, lowerY, -0.05);
    bodyGroup.add(doorStripe);
  } else if (!isTraffic && (style === 'muscle' || style === 'coupe' || style === 'super')) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, 0.04, l * 0.96), accentMat);
    stripe.position.set(0, lowerY + lowerH * 0.5 + 0.01, 0);
    bodyGroup.add(stripe);
  }

  if (!isTraffic && (style === 'super' || style === 'coupe' || style === 'muscle')) {
    const wingY = lowerY + lowerH * 0.5 + (style === 'super' ? 0.42 : 0.32);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.09, 0.42), style === 'super' ? accentMat : darkTrimMat);
    wing.position.set(0, wingY, -l * 0.45);
    wing.castShadow = true;
    bodyGroup.add(wing);
    for (const sx of [-w * 0.32, w * 0.32]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.22), darkTrimMat);
      strut.position.set(sx, wingY - 0.18, -l * 0.45);
      bodyGroup.add(strut);
    }
  }

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff6d6,
    emissiveIntensity: 1.4,
  });
  const headGeo = new THREE.BoxGeometry(0.42, 0.18, 0.12);
  for (const sx of [-w * 0.34, w * 0.34]) {
    const hl = new THREE.Mesh(headGeo, headMat);
    hl.position.set(sx, lowerY + 0.06, l * 0.5 + 0.02);
    bodyGroup.add(hl);
  }

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xcc1122,
    emissive: 0xff1e33,
    emissiveIntensity: 0.7,
  });
  const tailGeo = new THREE.BoxGeometry(0.52, 0.18, 0.12);
  for (const sx of [-w * 0.33, w * 0.33]) {
    const tl = new THREE.Mesh(tailGeo, tailMat);
    tl.position.set(sx, lowerY + 0.08, -l * 0.5 - 0.02);
    bodyGroup.add(tl);
  }

  let lightbarRed = null;
  let lightbarBlue = null;
  if (spec.isPolice) {
    const barY = cabinY + cabinH * 0.5 + 0.12;
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.78, 0.09, 0.34), darkTrimMat);
    barBase.position.set(0, barY - 0.04, cabinZ + 0.1);
    bodyGroup.add(barBase);

    lightbarRed = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW * 0.34, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xff1122, emissive: 0xff1122, emissiveIntensity: 2.2 })
    );
    lightbarRed.position.set(-cabinW * 0.2, barY + 0.06, cabinZ + 0.1);

    lightbarBlue = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW * 0.34, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x3b82f6, emissiveIntensity: 2.2 })
    );
    lightbarBlue.position.set(cabinW * 0.2, barY + 0.06, cabinZ + 0.1);

    bodyGroup.add(lightbarRed, lightbarBlue);
  }

  let underglowMesh = null;
  if (spec.underglow && !isTraffic) {
    if (!cachedGlowTex) cachedGlowTex = createSoftGlowTexture();
    const ugMat = new THREE.MeshBasicMaterial({
      color: spec.underglow,
      map: cachedGlowTex,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.9, l * 1.45), ugMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.08;
    root.add(underglowMesh);
  }

  let headlightCones = null;
  if (!isTraffic) {
    if (!cachedBeamTex) cachedBeamTex = createHeadlightBeamTexture();
    headlightCones = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff5d6,
      map: cachedBeamTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(w * 3.8, 22), beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.rotation.z = Math.PI;
    beam.position.set(0, 0.12, l * 0.5 + 11);
    headlightCones.add(beam);
    root.add(headlightCones);
  }

  const nitroFlames = [];
  if (!isTraffic) {
    const flameGeo = new THREE.ConeGeometry(0.18, 1.35, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    for (const sx of [-w * 0.24, w * 0.24]) {
      const f = new THREE.Mesh(flameGeo, flameMat);
      f.position.set(sx, 0.48, -l * 0.5 - 0.72);
      f.visible = false;
      bodyGroup.add(f);
      nitroFlames.push(f);
    }
  }

  const wheelRadius = style === 'suv' ? 0.52 : 0.42;
  const wheelWidth = style === 'suv' ? 0.36 : 0.3;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });

  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.03, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ec, metalness: 0.85, roughness: 0.2 });

  const wheelPositions = [
    [-w * 0.5 - 0.04, wheelRadius, l * 0.33, true],
    [w * 0.5 + 0.04, wheelRadius, l * 0.33, true],
    [-w * 0.5 - 0.04, wheelRadius, -l * 0.33, false],
    [w * 0.5 + 0.04, wheelRadius, -l * 0.33, false],
  ];

  const wheelPivots = [];
  const wheelMeshes = [];

  for (const [wx, wy, wz, isFront] of wheelPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(tireGeo, tireMat), new THREE.Mesh(rimGeo, rimMat));
    pivot.add(wheel);
    root.add(pivot);
    if (isFront) wheelPivots.push(pivot);
    wheelMeshes.push(wheel);
  }

  return {
    root,
    bodyGroup,
    wheelPivots,
    wheelMeshes,
    tailMat,
    headMat,
    headlightCones,
    underglowMesh,
    nitroFlames,
    props: [],
    mainRotor: null,
    tailRotor: null,
    lightbarRed,
    lightbarBlue,
  };
}

export class PlayerVehicle {
  constructor(scene, specIndex = 0) {
    this.scene = scene;
    this.specIndex = specIndex;
    this.spec = VEHICLES[specIndex];
    this.parts = null;

    // Shared motion state
    this.pos = new THREE.Vector3(0, 0, 145);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.PI;
    this.yawRate = 0;
    this.pitch = 0; // Aircraft pitch (positive = nose UP)
    this.roll = 0;  // Aircraft roll (positive = bank left)
    this.throttle = 0;
    this.steerAngle = 0;
    this.speed = 0;
    this.kmh = 0;
    this.altitude = 0;
    this.rpm = 0.15;
    this.gear = 1;

    this.grounded = true;
    this.airTime = 0;
    this.airStartPos = new THREE.Vector3();
    this.wasOnRamp = false;
    this.lastRampName = '';

    this.isDrifting = false;
    this.driftAngle = 0;
    this.driftDuration = 0;
    this.isNitro = false;
    this.nitro = 100;
    this.health = 100;
    this.sirenOn = false;

    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.surfaceNormal = new THREE.Vector3(0, 1, 0);
    this.repairCooldown = 0;

    this.loadVehicle(specIndex);
  }

  get vehicleType() {
    return this.spec.type || 'car';
  }

  get isAircraft() {
    return this.vehicleType === 'plane' || this.vehicleType === 'heli';
  }

  loadVehicle(index) {
    if (this.parts) {
      this.scene.remove(this.parts.root);
    }
    this.specIndex = index;
    this.spec = VEHICLES[index];
    this.parts = buildVehicleMesh(this.spec, false);
    this.parts.root.position.copy(this.pos);
    this.parts.root.rotation.set(0, this.yaw, 0);
    this.scene.add(this.parts.root);

    this.sirenOn = this.spec.isPolice;
    this.health = 100;
    this.pitch = 0;
    this.roll = 0;
    this.throttle = this.vehicleType === 'plane' && !this.grounded ? 0.65 : 0;
    this.isDrifting = false;
  }

  teleport(x, z, yaw = Math.PI, world = null, explicitY = null) {
    const y = explicitY !== null ? explicitY : world ? world.getSurfaceInfo(x, z, 250).height : 0;
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.yawRate = 0;
    this.pitch = 0;
    this.roll = 0;
    this.throttle = 0;
    this.speed = 0;
    this.grounded = true;
    this.airTime = 0;
    this.syncMesh();
  }

  repair() {
    this.health = 100;
    this.nitro = 100;
    if (!this.isAircraft) this.vel.y = 0;
  }

  getForwardVector(target = new THREE.Vector3()) {
    return target.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  getRightVector(target = new THREE.Vector3()) {
    return target.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  update(dt, input, world, effects, audio, nightFactor, callbacks) {
    this.repairCooldown = Math.max(0, this.repairCooldown - dt);
    if (this.vehicleType === 'plane') {
      this.updatePlane(dt, input, world, effects, audio, nightFactor, callbacks);
    } else if (this.vehicleType === 'heli') {
      this.updateHeli(dt, input, world, effects, audio, nightFactor, callbacks);
    } else {
      this.updateCar(dt, input, world, effects, audio, nightFactor, callbacks);
    }
    this.altitude = Math.max(0, Math.round(this.pos.y));
  }

  // ==================== AIRPLANE FLIGHT PHYSICS ====================
  updatePlane(dt, input, world, effects, audio, nightFactor, callbacks) {
    const spec = this.spec;
    const throttleUp = !!input.up;
    const throttleDown = !!input.down;
    const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const pitchUpInput = !!input.handbrake || !!input.climb;
    const pitchDownInput = !!input.descend;
    const wantsBoost = !!input.nitro && this.nitro > 3;

    this.isNitro = wantsBoost && (throttleUp || !this.grounded);
    if (this.isNitro) {
      this.nitro = Math.max(0, this.nitro - dt * 20);
    } else {
      this.nitro = Math.min(100, this.nitro + dt * 11);
    }

    // Throttle control
    if (throttleUp) {
      this.throttle = Math.min(1, this.throttle + dt * 0.72);
    } else if (throttleDown) {
      this.throttle = Math.max(0, this.throttle - dt * 0.95);
    } else if (!this.grounded) {
      // Keep minimum cruise throttle in flight so keyboard flying is relaxing and smooth!
      this.throttle = Math.max(0.42, this.throttle);
    }

    const maxSpd = spec.topSpeed * (this.isNitro ? 1.32 : 1.0);
    const targetSpd = this.grounded
      ? this.throttle * maxSpd
      : Math.max(spec.minAirSpeed, this.throttle * maxSpd);

    let curSpd = this.vel.length();
    const accelRate = throttleUp || this.isNitro ? spec.accel * (this.isNitro ? 1.55 : 1.0) : spec.brake;
    if (curSpd < targetSpd) {
      curSpd = Math.min(targetSpd, curSpd + accelRate * dt);
    } else {
      curSpd = Math.max(targetSpd, curSpd - (throttleDown ? spec.brake : 12) * dt);
    }

    if (this.grounded) {
      // Runway taxiing & takeoff
      const steerRate = curSpd > 2 ? 1.35 * Math.min(1, curSpd / 12) : 0;
      this.yaw += turnInput * steerRate * dt;
      this.roll = THREE.MathUtils.lerp(this.roll, 0, Math.min(1, dt * 8));

      // Takeoff smoothly when fast enough & pulling up (or full boost past 1.35x takeoff speed!)
      const wantsLift = pitchUpInput || (this.isNitro && curSpd > spec.takeoffSpeed * 1.25);
      if (curSpd >= spec.takeoffSpeed && wantsLift) {
        this.grounded = false;
        this.pitch = 0.22;
      } else {
        this.pitch = THREE.MathUtils.lerp(this.pitch, 0, Math.min(1, dt * 8));
      }

      const fwd = this.getForwardVector();
      this.vel.set(fwd.x * curSpd, 0, fwd.z * curSpd);
    } else {
      // Smooth GTA V Arcade Flight Dynamics
      const pitchCmd = (pitchUpInput ? 1 : 0) - (pitchDownInput ? 1 : 0);
      if (pitchCmd !== 0) {
        this.pitch = THREE.MathUtils.clamp(this.pitch + pitchCmd * spec.pitchRate * dt, -0.78, 0.82);
      } else {
        // Gentle auto-level pitch assist
        this.pitch = THREE.MathUtils.lerp(this.pitch, 0, Math.min(1, dt * 1.4));
      }

      // Bank roll + coordinated yaw turn!
      const targetRoll = turnInput * 0.95;
      this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, Math.min(1, dt * (turnInput !== 0 ? 4.8 : 3.2)));
      this.yaw += (turnInput * 0.65 + this.roll * 0.95) * spec.yawRate * dt;

      // Prevent stalling too low when nose pitches steeply up
      const pitchSpeedEffect = -Math.sin(this.pitch) * 16 * dt;
      curSpd = THREE.MathUtils.clamp(curSpd + pitchSpeedEffect, spec.minAirSpeed, maxSpd);

      // 3D velocity vector aligned with plane nose!
      const cosP = Math.cos(this.pitch);
      this.vel.set(
        Math.sin(this.yaw) * cosP * curSpd,
        Math.sin(this.pitch) * curSpd,
        Math.cos(this.yaw) * cosP * curSpd
      );
    }

    // Integrate 3D flight position + altitude ceiling (480m)
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y > 480) {
      this.pos.y = 480;
      this.pitch = Math.min(0, this.pitch);
    }

    // Surface / Runway / Water checks
    const surf = world.getSurfaceInfo(this.pos.x, this.pos.z, this.pos.y);
    const waterTop = surf.surfaceType === 'alamo_water' ? ALAMO_WATER_LEVEL : world.waterLevel;
    const minY = Math.max(surf.height, waterTop);

    if (this.pos.y <= minY) {
      if (surf.surfaceType === 'water' || surf.surfaceType === 'alamo_water') {
        // Safe skim recovery over ocean / Alamo Sea
        effects?.spawnWaterSplash(this.pos);
        this.pos.y = waterTop + 8;
        this.pitch = 0.25;
        this.grounded = false;
      } else {
        this.pos.y = surf.height;
        if (!this.grounded && this.vel.y < -14) {
          audio?.playCollision(0.65);
          effects?.spawnSparks(this.pos, new THREE.Vector3(0, 1, 0), 10);
        }
        this.grounded = true;
        this.pitch = 0;
        this.roll = 0;
        this.vel.y = 0;
      }
    }

    // Soft building collision bounce (only when below building top!)
    const hitNormal = world.resolveBuildingCollision(this.pos, 3.8);
    if (hitNormal) {
      this.vel.x += hitNormal.x * 22;
      this.vel.z += hitNormal.z * 22;
      this.vel.y = Math.max(this.vel.y, 6);
      this.health = Math.max(20, this.health - 8);
      effects?.spawnSparks(this.pos, hitNormal, 14);
      audio?.playCollision(0.8);
      callbacks?.onCrash?.(20);
    }

    this.speed = curSpd;
    this.kmh = Math.round(curSpd * 3.6);
    this.rpm = THREE.MathUtils.clamp(0.22 + this.throttle * 0.72 + (this.isNitro ? 0.15 : 0), 0.2, 1.0);
    this.gear = this.grounded ? 'GND' : 'AIR';
    this.isDrifting = false;

    // Spin propellers & animate afterburner flames
    for (const p of this.parts.props) {
      p.rotation.z += dt * (18 + this.rpm * 42);
    }
    for (const w of this.parts.wheelMeshes) {
      if (this.grounded) w.rotation.x += curSpd * dt * 2.4;
    }
    for (const f of this.parts.nitroFlames) {
      const show = this.spec.bodyStyle === 'jet' ? this.throttle > 0.2 || this.isNitro : this.isNitro;
      f.visible = show;
      if (show) {
        const sc = (this.isNitro ? 1.55 : 0.75 + this.throttle * 0.45) * (0.85 + Math.random() * 0.3);
        f.scale.set(1, 1, sc);
      }
    }

    // Sync aircraft 3D orientation (YXZ Euler: yaw -> nose pitch (-pitch in Three.js X) -> bank roll (-roll in Three.js Z))
    this.parts.root.position.copy(this.pos);
    this.parts.root.rotation.order = 'YXZ';
    this.parts.root.rotation.set(-this.pitch, this.yaw, -this.roll);
    this.parts.bodyGroup.rotation.set(0, 0, 0);
  }

  // ==================== HELICOPTER FLIGHT PHYSICS ====================
  updateHeli(dt, input, world, effects, audio, nightFactor, callbacks) {
    const spec = this.spec;
    const fwdInput = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const climbInput = (input.handbrake || input.climb ? 1 : 0) - (input.descend ? 1 : 0);
    const wantsBoost = !!input.nitro && this.nitro > 3;

    this.isNitro = wantsBoost && (fwdInput !== 0 || climbInput !== 0);
    if (this.isNitro) {
      this.nitro = Math.max(0, this.nitro - dt * 20);
    } else {
      this.nitro = Math.min(100, this.nitro + dt * 12);
    }

    const boostMul = this.isNitro ? 1.42 : 1.0;

    // Auto-hover lift if player presses W while sitting on the ground!
    if (this.grounded && (climbInput > 0 || fwdInput > 0)) {
      this.grounded = false;
      this.vel.y = Math.max(this.vel.y, 10);
    }

    if (!this.grounded) {
      // Yaw rotation
      this.yaw += turnInput * spec.handling * dt;

      // Vertical collective (smooth hover damping when released!)
      const targetVy = climbInput * spec.climbSpeed * boostMul;
      this.vel.y = THREE.MathUtils.lerp(this.vel.y, targetVy, Math.min(1, dt * (climbInput !== 0 ? 4.5 : 3.2)));

      // Horizontal flight velocity along heading
      const fwd = this.getForwardVector();
      const targetFwdSpd = fwdInput * spec.topSpeed * boostMul;
      const targetVx = fwd.x * targetFwdSpd;
      const targetVz = fwd.z * targetFwdSpd;

      const horizBlend = fwdInput !== 0 ? 2.4 : 1.65;
      this.vel.x = THREE.MathUtils.lerp(this.vel.x, targetVx, Math.min(1, dt * horizBlend));
      this.vel.z = THREE.MathUtils.lerp(this.vel.z, targetVz, Math.min(1, dt * horizBlend));

      // Expressive helicopter pitch forward & banking roll visuals!
      const targetPitch = -fwdInput * (this.isNitro ? 0.28 : 0.2);
      const targetRoll = turnInput * 0.34;
      this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, Math.min(1, dt * 5));
      this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, Math.min(1, dt * 5));
    } else {
      this.vel.multiplyScalar(Math.exp(-6 * dt));
      this.pitch = THREE.MathUtils.lerp(this.pitch, 0, Math.min(1, dt * 8));
      this.roll = THREE.MathUtils.lerp(this.roll, 0, Math.min(1, dt * 8));
    }

    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y > 460) {
      this.pos.y = 460;
      this.vel.y = Math.min(0, this.vel.y);
    }

    // Surface landing (including Maze Bank Tower Helipad & Mount Chiliad Summit!)
    const surf = world.getSurfaceInfo(this.pos.x, this.pos.z, this.pos.y);
    const waterTop = surf.surfaceType === 'alamo_water' ? ALAMO_WATER_LEVEL : world.waterLevel;

    if (this.pos.y <= Math.max(surf.height, waterTop)) {
      if (surf.surfaceType === 'water' || surf.surfaceType === 'alamo_water') {
        effects?.spawnWaterSplash(this.pos);
        this.pos.y = waterTop + 4.5;
        this.vel.y = 6;
        this.grounded = false;
      } else {
        this.pos.y = surf.height;
        if (!this.grounded && climbInput <= 0) {
          this.grounded = true;
          this.vel.set(0, 0, 0);
          if (surf.surfaceType === 'helipad') {
            callbacks?.onHelipadLanding?.();
          }
        } else {
          this.vel.y = Math.max(0, this.vel.y);
        }
      }
    }

    const hitNormal = world.resolveBuildingCollision(this.pos, 3.0);
    if (hitNormal) {
      this.vel.x += hitNormal.x * 14;
      this.vel.z += hitNormal.z * 14;
      effects?.spawnSparks(this.pos, hitNormal, 10);
      audio?.playCollision(0.5);
    }

    const totalSpd = this.vel.length();
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.kmh = Math.round(totalSpd * 3.6);
    this.rpm = this.grounded ? 0.35 : THREE.MathUtils.clamp(0.58 + (totalSpd / spec.topSpeed) * 0.35 + (climbInput > 0 ? 0.14 : 0), 0.55, 1.0);
    this.gear = this.grounded ? 'PAD' : 'HVR';
    this.isDrifting = false;

    // Spin Main Rotor & Tail Rotor!
    if (this.parts.mainRotor) {
      this.parts.mainRotor.rotation.y += dt * (12 + this.rpm * 26);
    }
    if (this.parts.tailRotor) {
      this.parts.tailRotor.rotation.x += dt * (20 + this.rpm * 34);
    }

    // LSPD Maverick strobe lights & night searchlight!
    if (this.parts.lightbarRed && this.parts.lightbarBlue) {
      if (this.sirenOn) {
        const flash = Math.floor(performance.now() * 0.014) % 2 === 0;
        this.parts.lightbarRed.material.emissiveIntensity = flash ? 3.8 : 0.2;
        this.parts.lightbarBlue.material.emissiveIntensity = flash ? 0.2 : 3.8;
      } else {
        this.parts.lightbarRed.material.emissiveIntensity = 0.25;
        this.parts.lightbarBlue.material.emissiveIntensity = 0.25;
      }
    }
    if (this.parts.headlightCones) {
      this.parts.headlightCones.visible = nightFactor > 0.25;
    }

    this.parts.root.position.copy(this.pos);
    this.parts.root.rotation.order = 'YXZ';
    this.parts.root.rotation.set(-this.pitch, this.yaw, -this.roll);
    this.parts.bodyGroup.rotation.set(0, 0, 0);
  }

  // ==================== GROUND CAR DRIVING PHYSICS ====================
  updateCar(dt, input, world, effects, audio, nightFactor, callbacks) {
    const spec = this.spec;
    const throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const handbrake = !!input.handbrake;
    const wantsNitro = !!input.nitro && this.nitro > 4 && (input.up || this.speed > 5);

    this.isNitro = wantsNitro;
    if (this.isNitro) {
      this.nitro = Math.max(0, this.nitro - dt * 28);
    } else {
      const regen = this.isDrifting ? 18 : 7.5;
      this.nitro = Math.min(100, this.nitro + dt * regen);
    }

    const fwd = this.getForwardVector();
    const right = this.getRightVector();

    let vFwd = this.vel.x * fwd.x + this.vel.z * fwd.z;
    let vLat = this.vel.x * right.x + this.vel.z * right.z;

    const targetSteer = steerInput * 0.52;
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, Math.min(1, dt * 11));

    const surface = world.getSurfaceInfo(this.pos.x, this.pos.z, this.pos.y);

    if (this.grounded) {
      let surfaceGrip = 1.0;
      let surfaceDrag = 0.0;
      if (surface.surfaceType === 'sand' || surface.surfaceType === 'grass' || surface.surfaceType === 'desert') {
        surfaceGrip = spec.bodyStyle === 'suv' ? 0.96 : 0.85;
        surfaceDrag = spec.bodyStyle === 'suv' ? 0.04 : 0.16;
      }

      const maxSpd = spec.topSpeed * (this.isNitro ? 1.24 : 1.0);
      const accelPower = spec.accel * (this.isNitro ? 1.65 : 1.0);

      if (throttle > 0) {
        if (vFwd < -1.5) {
          vFwd += spec.brake * dt;
        } else {
          const ratio = Math.max(0, 1 - (vFwd / maxSpd) ** 2.2);
          vFwd += accelPower * (0.28 + 0.72 * ratio) * dt;
        }
      } else if (throttle < 0) {
        if (vFwd > 1.5) {
          vFwd -= spec.brake * dt;
        } else {
          vFwd = Math.max(-22, vFwd - spec.accel * 0.55 * dt);
        }
      } else {
        vFwd *= Math.exp(-(0.55 + surfaceDrag) * dt);
        if (Math.abs(vFwd) < 0.25) vFwd = 0;
      }

      if (handbrake) {
        vFwd *= Math.exp(-1.15 * dt);
      }
      if (vFwd > maxSpd) {
        vFwd = THREE.MathUtils.lerp(vFwd, maxSpd, dt * 3);
      }

      const speedFactor = Math.min(1, Math.abs(vFwd) / 7.5);
      const highSpeedDamp = 1 - Math.min(0.45, (Math.abs(vFwd) / 95) * 0.45);
      const driftTurnBoost = handbrake ? 1.38 : 1.0;
      const reverseSign = vFwd >= -0.2 ? 1 : -1;

      const targetYawRate =
        steerInput * spec.handling * speedFactor * highSpeedDamp * driftTurnBoost * reverseSign;
      this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYawRate, Math.min(1, dt * (handbrake ? 6.5 : 10.5)));
      this.yaw += this.yawRate * dt;

      const newFwd = this.getForwardVector();
      const newRight = this.getRightVector();

      const lateralGrip = handbrake ? (1 - spec.driftGrip) * 28 : 8.5 * surfaceGrip;
      if (handbrake && Math.abs(vFwd) > 12) {
        vLat += -steerInput * Math.abs(vFwd) * 0.22 * dt;
      }
      vLat *= Math.exp(-lateralGrip * dt);

      this.vel.x = newFwd.x * vFwd + newRight.x * vLat;
      this.vel.z = newFwd.z * vFwd + newRight.z * vLat;

      const horizSpeed = Math.hypot(this.vel.x, this.vel.z);
      const slipRatio = horizSpeed > 9 ? Math.abs(vLat) / horizSpeed : 0;
      this.driftAngle = slipRatio;
      this.isDrifting = horizSpeed > 11 && (slipRatio > 0.16 || (handbrake && Math.abs(steerInput) > 0.1));
      this.driftDuration = this.isDrifting ? this.driftDuration + dt : 0;

      if (surface.rampInfo) {
        this.wasOnRamp = true;
        this.lastRampName = surface.rampInfo.ramp.name;
      }
    } else {
      this.vel.y -= 26.5 * dt;
      this.airTime += dt;
      this.isDrifting = false;
      this.yaw += steerInput * 0.55 * dt;
    }

    const prevY = this.pos.y;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    const nextSurface = world.getSurfaceInfo(this.pos.x, this.pos.z, this.pos.y);

    if (this.grounded) {
      const slopeDelta = nextSurface.height - prevY;
      const horizSpd = Math.hypot(this.vel.x, this.vel.z);
      if (this.wasOnRamp && !nextSurface.rampInfo && horizSpd > 18) {
        this.grounded = false;
        this.vel.y = Math.max(8.5, horizSpd * 0.36);
        this.airTime = 0;
        this.airStartPos.copy(this.pos);
      } else if (slopeDelta < -1.1 && horizSpd > 24) {
        this.grounded = false;
        this.vel.y = Math.max(0, slopeDelta / Math.max(dt, 0.016));
        this.airTime = 0;
        this.airStartPos.copy(this.pos);
      } else {
        this.pos.y = nextSurface.height;
        this.vel.y = 0;
        if (!nextSurface.rampInfo) this.wasOnRamp = false;
      }
    } else {
      if (this.pos.y <= nextSurface.height) {
        this.pos.y = nextSurface.height;
        const impactVy = Math.abs(this.vel.y);
        this.vel.y = 0;
        this.grounded = true;

        if (this.airTime > 0.65) {
          const jumpDist = Math.hypot(
            this.pos.x - this.airStartPos.x,
            this.pos.z - this.airStartPos.z
          );
          if (jumpDist > 18 && callbacks?.onStuntJump) {
            callbacks.onStuntJump(jumpDist, this.airTime, this.wasOnRamp ? this.lastRampName : 'SAN ANDREAS AIRTIME');
          }
        }
        if (impactVy > 10 && audio) {
          audio.playCollision(Math.min(1, impactVy / 22));
        }
        this.airTime = 0;
        this.wasOnRamp = false;
      }
    }

    // Ocean / Alamo Sea deep water recovery
    const inAlamo = nextSurface.surfaceType === 'alamo_water' && this.pos.y < ALAMO_WATER_LEVEL - 0.85;
    if (this.pos.y < world.waterLevel - 0.65 || inAlamo) {
      effects?.spawnWaterSplash(this.pos);
      if (inAlamo) {
        this.teleport(155, -1020, Math.PI / 2, world);
      } else if (this.pos.z < -1700) {
        this.teleport(-10, -1935, Math.PI / 2, world);
      } else if (this.pos.z < -550) {
        this.teleport(25, -895, Math.PI, world);
      } else {
        this.teleport(-220, THREE.MathUtils.clamp(this.pos.z, -200, 420), 0, world);
      }
      callbacks?.onWaterRecover?.();
      return;
    }

    const hitNormal = world.resolveBuildingCollision(this.pos, Math.max(spec.width, spec.length) * 0.42);
    if (hitNormal) {
      const impactSpeed = -(this.vel.x * hitNormal.x + this.vel.z * hitNormal.z);
      if (impactSpeed > 4.5) {
        this.vel.x += hitNormal.x * impactSpeed * 1.28;
        this.vel.z += hitNormal.z * impactSpeed * 1.28;
        this.vel.multiplyScalar(0.72);
        const dmg = Math.min(24, (impactSpeed * 0.48) / spec.mass);
        this.health = Math.max(15, this.health - dmg);
        effects?.spawnSparks(this.pos, hitNormal, Math.min(18, Math.floor(impactSpeed)));
        audio?.playCollision(Math.min(1, impactSpeed / 32));
        callbacks?.onCrash?.(impactSpeed);
      } else {
        this.vel.x += hitNormal.x * Math.max(0, impactSpeed);
        this.vel.z += hitNormal.z * Math.max(0, impactSpeed);
      }
    }

    if (
      this.repairCooldown <= 0 &&
      Math.hypot(this.pos.x - REPAIR_BAY.x, this.pos.z - REPAIR_BAY.z) < REPAIR_BAY.radius &&
      (this.health < 99 || this.nitro < 95)
    ) {
      this.repair();
      this.repairCooldown = 5;
      callbacks?.onRepairBay?.();
    }

    const fwdNow = this.getForwardVector();
    this.speed = this.vel.x * fwdNow.x + this.vel.z * fwdNow.z;
    this.kmh = Math.round(Math.hypot(this.vel.x, this.vel.z) * 3.6);

    const absKmh = this.kmh;
    if (this.speed < -1) {
      this.gear = 'R';
      this.rpm = THREE.MathUtils.clamp(0.22 + absKmh / 90, 0.2, 0.95);
    } else {
      const thresholds = [0, 42, 86, 134, 186, 240, 340];
      let g = 1;
      for (let i = 1; i < thresholds.length; i++) {
        if (absKmh >= thresholds[i]) g = Math.min(6, i + 1);
      }
      this.gear = g;
      const gMin = thresholds[g - 1];
      const gMax = thresholds[g];
      const frac = THREE.MathUtils.clamp((absKmh - gMin) / Math.max(1, gMax - gMin), 0, 1);
      this.rpm = THREE.MathUtils.clamp(0.16 + frac * 0.78 + (input.up ? 0.08 : 0), 0.14, 1.0);
    }

    const targetPitch = this.grounded
      ? (throttle > 0 ? -0.032 : throttle < 0 ? 0.042 : 0) + (this.isNitro ? -0.025 : 0)
      : THREE.MathUtils.clamp(-this.vel.y * 0.015, -0.35, 0.35);
    const targetRoll = this.grounded
      ? THREE.MathUtils.clamp(this.yawRate * Math.min(1, Math.abs(this.speed) / 28) * 0.065, -0.14, 0.14)
      : 0;

    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, Math.min(1, dt * 10));
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, Math.min(1, dt * 10));
    this.surfaceNormal.lerp(this.grounded ? nextSurface.normal : new THREE.Vector3(0, 1, 0), Math.min(1, dt * 9)).normalize();

    if (this.grounded && effects) {
      const rearL = this.pos.clone().addScaledVector(fwdNow, -spec.length * 0.34).addScaledVector(right, -spec.width * 0.45);
      const rearR = this.pos.clone().addScaledVector(fwdNow, -spec.length * 0.34).addScaledVector(right, spec.width * 0.45);
      if (this.isDrifting) {
        const dustHex = surface.surfaceType === 'desert' ? 0xd9a876 : 0xdbe2ec;
        effects.spawnTireSmoke(rearL, dustHex);
        effects.spawnTireSmoke(rearR, dustHex);
        effects.addSkidMark(rearL, this.yaw);
        effects.addSkidMark(rearR, this.yaw);
      } else if ((surface.surfaceType === 'sand' || surface.surfaceType === 'desert') && absKmh > 35 && Math.random() < 0.45) {
        effects.spawnTireSmoke(rearL, surface.surfaceType === 'desert' ? 0xd9a876 : 0xe8cfa0);
        effects.spawnTireSmoke(rearR, surface.surfaceType === 'desert' ? 0xd9a876 : 0xe8cfa0);
      }
    }

    this.updateCarVisuals(dt, input, nightFactor);
    this.syncMesh();
  }

  updateCarVisuals(dt, input, nightFactor) {
    const p = this.parts;
    const wheelSpin = this.speed * dt * 2.2;
    for (const w of p.wheelMeshes) w.rotation.x += wheelSpin;
    for (const pv of p.wheelPivots) pv.rotation.y = this.steerAngle;

    if (p.tailMat) {
      p.tailMat.emissiveIntensity = input.down || input.handbrake ? 2.6 : 0.75 + nightFactor * 0.6;
    }
    if (p.headlightCones) {
      p.headlightCones.visible = nightFactor > 0.2;
      p.headlightCones.children.forEach((c) => {
        c.material.opacity = THREE.MathUtils.lerp(0.08, 0.52, nightFactor);
      });
    }
    if (p.underglowMesh) {
      p.underglowMesh.material.opacity = 0.22 + nightFactor * 0.45;
    }
    for (const flame of p.nitroFlames) {
      flame.visible = this.isNitro;
      if (this.isNitro) flame.scale.set(1, 1, 0.8 + Math.random() * 0.65);
    }
    if (p.lightbarRed && p.lightbarBlue) {
      if (this.sirenOn) {
        const flash = Math.floor(performance.now() * 0.012) % 2 === 0;
        p.lightbarRed.material.emissiveIntensity = flash ? 3.5 : 0.3;
        p.lightbarBlue.material.emissiveIntensity = flash ? 0.3 : 3.5;
      } else {
        p.lightbarRed.material.emissiveIntensity = 0.3;
        p.lightbarBlue.material.emissiveIntensity = 0.3;
      }
    }
  }

  syncMesh() {
    const root = this.parts.root;
    root.position.copy(this.pos);

    if (this.isAircraft) {
      root.rotation.order = 'YXZ';
      root.rotation.set(-this.pitch, this.yaw, -this.roll);
      this.parts.bodyGroup.rotation.set(0, 0, 0);
      return;
    }

    const fwd = this.getForwardVector();
    const projectedFwd = fwd.clone().addScaledVector(this.surfaceNormal, -fwd.dot(this.surfaceNormal)).normalize();
    const right = new THREE.Vector3().crossVectors(this.surfaceNormal, projectedFwd).normalize();
    const rotMat = new THREE.Matrix4().makeBasis(right, this.surfaceNormal, projectedFwd);
    root.quaternion.setFromRotationMatrix(rotMat);
    this.parts.bodyGroup.rotation.x = this.bodyPitch;
    this.parts.bodyGroup.rotation.z = this.bodyRoll;
  }
}
