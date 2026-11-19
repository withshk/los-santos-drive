import { H_ROADS, LANDMARKS, REPAIR_BAY, V_ROADS } from './constants.js';

export class MinimapRenderer {
  constructor(canvas, compassEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.compassEl = compassEl;
  }

  getCompassLabel(yaw) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    let deg = (Math.atan2(fx, -fz) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  render(player, traffic, raceState, time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.56;

    // Speed & Altitude adaptive radar zoom (zooms out gracefully in aircraft so you see the whole island!)
    const speedZoom = Math.min(0.24, (player.kmh / 320) * 0.24);
    const altZoom = player.isAircraft ? Math.min(0.14, (player.altitude / 220) * 0.14) : 0;
    const scale = Math.max(0.11, (player.isAircraft ? 0.30 : 0.40) - speedZoom - altZoom);

    ctx.save();
    ctx.fillStyle = '#0d223b'; // Pacific Ocean surrounding San Andreas
    ctx.fillRect(0, 0, w, h);

    ctx.translate(cx, cy);
    ctx.rotate(player.yaw - Math.PI);
    ctx.scale(scale, scale);
    ctx.translate(-player.pos.x, -player.pos.z);

    // 1. Full San Andreas Island Landmass & Biomes
    // Southern Los Santos urban landmass
    ctx.fillStyle = '#252c3a';
    ctx.fillRect(-245, -255, 650, 900);

    // Vespucci Beach golden coast
    ctx.fillStyle = '#8f7d57';
    ctx.fillRect(-315, -245, 72, 740);

    // Vinewood Hills transition
    ctx.fillStyle = '#2f4431';
    ctx.fillRect(-350, -630, 810, 385);

    // Blaine County — GRAND SENORA DESERT!
    ctx.fillStyle = '#7e5c3e';
    ctx.fillRect(-465, -1385, 975, 765);

    // Grapeseed fertile farmlands (Northeast of Alamo Sea)
    ctx.fillStyle = '#3b5933';
    ctx.fillRect(225, -1385, 255, 270);

    // Fort Zancudo military apron
    ctx.fillStyle = '#363d34';
    ctx.fillRect(-420, -990, 275, 120);

    // Mount Chiliad Wilderness & Paleto Bay (Far North)
    ctx.fillStyle = '#344736';
    ctx.fillRect(-465, -2005, 970, 625);

    // Mount Chiliad snow/rocky peak contour
    ctx.fillStyle = '#63686e';
    ctx.beginPath();
    ctx.ellipse(-15, -1680, 195, 160, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(-15, -1680, 72, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Paleto Bay northern sandy beach
    ctx.fillStyle = '#9b8b65';
    ctx.fillRect(-320, -2020, 640, 38);

    // ALAMO SEA inland turquoise desert salt lake!
    ctx.fillStyle = '#157085';
    ctx.beginPath();
    ctx.ellipse(15, -1245, 192, 114, 0, 0, Math.PI * 2);
    ctx.fill();

    // LSIA Airport tarmac
    ctx.fillStyle = '#1b202b';
    ctx.fillRect(-240, 480, 430, 145);

    // Del Perro Pier
    ctx.fillStyle = '#6e5742';
    ctx.fillRect(-458, -13, 236, 26);

    // 2. Road Grid & Full Island Highways
    ctx.strokeStyle = '#5d687d';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const minZ = H_ROADS[0];
    const maxZ = H_ROADS[H_ROADS.length - 1];
    const minX = V_ROADS[0];
    const maxX = V_ROADS[V_ROADS.length - 1];

    ctx.beginPath();
    for (const vx of V_ROADS) {
      ctx.moveTo(vx, minZ);
      ctx.lineTo(vx, maxZ);
    }
    for (const hz of H_ROADS) {
      ctx.moveTo(minX, hz);
      ctx.lineTo(maxX, hz);
    }
    ctx.stroke();

    // Island Highway Loop (Great Ocean Hwy + Senora Fwy + Route 68 + Paleto Blvd)
    ctx.strokeStyle = '#738096';
    ctx.lineWidth = 16;
    ctx.beginPath();
    // West Coast Great Ocean Hwy -> Paleto Bay
    ctx.moveTo(-220, -220);
    ctx.lineTo(-310, -560);
    ctx.lineTo(-415, -940);
    ctx.lineTo(-390, -1450);
    ctx.lineTo(-345, -1720);
    ctx.lineTo(-210, -1905);
    ctx.lineTo(-10, -1935);
    // East Coast Senora Fwy -> Paleto Bay
    ctx.lineTo(255, -1870);
    ctx.lineTo(375, -1620);
    ctx.lineTo(335, -1120);
    ctx.lineTo(325, -900);
    ctx.lineTo(345, -420);
    ctx.lineTo(330, -220);
    // Route 68 across Grand Senora Desert
    ctx.moveTo(-410, -900);
    ctx.lineTo(25, -895);
    ctx.lineTo(325, -900);
    // Joshua Rd from Vinewood to Desert
    ctx.moveTo(110, -220);
    ctx.lineTo(85, -620);
    ctx.lineTo(25, -895);
    ctx.lineTo(55, -1015);
    ctx.stroke();

    // 3 Runways: LSIA, Fort Zancudo, Sandy Shores!
    ctx.fillStyle = '#8b96ab';
    ctx.fillRect(-235, 526, 400, 38);        // LSIA
    ctx.fillRect(-405, -948, 250, 36);       // Fort Zancudo
    ctx.fillStyle = '#a8845c';
    ctx.fillRect(30, -1036, 250, 32);        // Sandy Shores Dirt Airstrip

    // Grove Street cul-de-sac
    ctx.fillStyle = '#5d687d';
    ctx.beginPath();
    ctx.arc(275, 400, 22, 0, Math.PI * 2);
    ctx.fill();

    // 3. Active Street Race GPS Route Line & Target Beacon
    if (raceState && raceState.active) {
      const cps = raceState.checkpoints;
      const idx = raceState.currentIndex;
      if (idx < cps.length) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(player.pos.x, player.pos.z);
        ctx.lineTo(cps[idx].x, cps[idx].z);
        if (idx + 1 < cps.length) ctx.lineTo(cps[idx + 1].x, cps[idx + 1].z);
        ctx.stroke();

        const pulse = 18 + Math.sin(time * 8) * 5;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(cps[idx].x, cps[idx].z, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cps[idx].x, cps[idx].z, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Los Santos Customs Repair Icon
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(REPAIR_BAY.x, REPAIR_BAY.z, 10, 0, Math.PI * 2);
    ctx.fill();

    // 5. All 14 San Andreas Landmarks
    const lmSize = player.isAircraft ? 14 : 9.5;
    for (const lm of LANDMARKS) {
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(lm.x, lm.z, lmSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0b0e16';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // 6. Civilian Traffic Dots
    ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
    for (const npc of traffic.civilians) {
      ctx.beginPath();
      ctx.arc(npc.pos.x, npc.pos.z, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Flashing LSPD Police Blips
    const policeFlash = Math.floor(time * 9) % 2 === 0;
    for (const cop of traffic.cops) {
      ctx.fillStyle = policeFlash ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(cop.pos.x, cop.pos.z, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();

    // 8. Center Player Icon (Plane silhouette, Heli rotor icon, or Car chevron!)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;

    if (player.vehicleType === 'plane') {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(3, -3);
      ctx.lineTo(11, 2);
      ctx.lineTo(11, 5);
      ctx.lineTo(3, 3);
      ctx.lineTo(2, 9);
      ctx.lineTo(5, 11);
      ctx.lineTo(-5, 11);
      ctx.lineTo(-2, 9);
      ctx.lineTo(-3, 3);
      ctx.lineTo(-11, 5);
      ctx.lineTo(-11, 2);
      ctx.lineTo(-3, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (player.vehicleType === 'heli') {
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -9);
      ctx.lineTo(9, 9);
      ctx.moveTo(9, -9);
      ctx.lineTo(-9, 9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    if (traffic.wantedLevel > 0 && !traffic.evading) {
      ctx.save();
      ctx.strokeStyle = policeFlash ? 'rgba(239,68,68,0.65)' : 'rgba(59,130,246,0.65)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.restore();
    }

    if (this.compassEl) {
      this.compassEl.textContent = player.isAircraft
        ? `${this.getCompassLabel(player.yaw)} • ${player.altitude}m`
        : this.getCompassLabel(player.yaw);
    }
  }
}
