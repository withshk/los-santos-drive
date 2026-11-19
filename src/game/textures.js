import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createRoadTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  // Asphalt base
  ctx.fillStyle = '#252830';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 30 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Sidewalk curbs at edges
  ctx.fillStyle = '#5c6270';
  ctx.fillRect(0, 0, 26, 512);
  ctx.fillRect(486, 0, 26, 512);
  ctx.fillStyle = '#3b404c';
  ctx.fillRect(26, 0, 6, 512);
  ctx.fillRect(480, 0, 6, 512);

  // Solid white outer edge lines
  ctx.fillStyle = 'rgba(235, 240, 248, 0.85)';
  ctx.fillRect(38, 0, 6, 512);
  ctx.fillRect(468, 0, 6, 512);

  // Double yellow centerline (iconic LA/Los Santos)
  ctx.fillStyle = '#eab308';
  ctx.fillRect(247, 0, 6, 512);
  ctx.fillRect(259, 0, 6, 512);

  // Dashed white lane dividers
  ctx.fillStyle = 'rgba(240, 244, 248, 0.85)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(142, y, 5, 34);
    ctx.fillRect(365, y, 5, 34);
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createIntersectionTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#252830';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 30 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Zebra crosswalk stripes on all 4 sides
  ctx.fillStyle = 'rgba(235, 240, 246, 0.85)';
  for (let p = 52; p < 460; p += 32) {
    ctx.fillRect(p, 16, 16, 48);      // top
    ctx.fillRect(p, 448, 16, 48);     // bottom
    ctx.fillRect(16, p, 48, 16);      // left
    ctx.fillRect(448, p, 48, 16);     // right
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createRunwayTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#20242c';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5000; i++) {
    const v = 28 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Outer white runway boundary lines
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(18, 0, 10, 512);
  ctx.fillRect(484, 0, 10, 512);

  // Center dashed runway stripe
  for (let y = 24; y < 512; y += 128) {
    ctx.fillRect(248, y, 16, 72);
  }

  // Subtle tire rubber touchdown marks
  ctx.fillStyle = 'rgba(10, 12, 16, 0.35)';
  ctx.fillRect(165, 0, 42, 512);
  ctx.fillRect(305, 0, 42, 512);

  return finalizeTexture(canvas, 1, 6);
}

export function createPierPlankTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#785a3d';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    const shade = 100 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.76)}, ${Math.floor(shade * 0.54)})`;
    ctx.fillRect(0, y, 256, 14);
    ctx.fillStyle = '#473321';
    ctx.fillRect(0, y + 14, 256, 2);
  }
  return finalizeTexture(canvas, 3, 18);
}

export function createBuildingFacadePair(palette) {
  // Returns { map, emissiveMap } so buildings glow crisply at sunset/night!
  const { canvas, ctx } = makeCanvas(256, 512);
  const em = makeCanvas(256, 512);

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, 256, 512);

  em.ctx.fillStyle = '#000000';
  em.ctx.fillRect(0, 0, 256, 512);

  const cols = palette.cols || 8;
  const rows = palette.rows || 18;
  const padX = 6;
  const padY = 6;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  // Horizontal structural bands
  ctx.fillStyle = palette.trim;
  for (let r = 0; r < rows; r++) {
    ctx.fillRect(0, r * cellH, 256, 4);
  }

  // Deterministic pseudo-random seeded by palette.seed
  let seed = palette.seed || 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + padX * 0.5;
      const wy = r * cellH + padY;
      const ww = cellW - padX;
      const wh = cellH - padY - 3;

      // Glass window base
      ctx.fillStyle = palette.glass;
      ctx.fillRect(wx, wy, ww, wh);

      // Subtle sky reflection gradient inside glass
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(wx, wy, ww, wh * 0.35);

      // Random lit rooms at night
      const litRoll = rand();
      if (litRoll < (palette.litChance ?? 0.42)) {
        const warm = rand();
        const litColor =
          warm < 0.65
            ? '#ffd79a'
            : warm < 0.88
              ? '#b9e3ff'
              : '#ff9b70';
        em.ctx.fillStyle = litColor;
        em.ctx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
      }
    }
  }

  return {
    map: finalizeTexture(canvas, 1, 1, true),
    emissiveMap: finalizeTexture(em.canvas, 1, 1, true),
  };
}

export function createSignTexture(text, bg, fg, border = '#ffffff') {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = fg;
  ctx.font = '900 50px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68, 464);

  return finalizeTexture(canvas, 1, 1, true);
}

export function createGroundNoiseTexture(baseHex, accentHex, speckles = 5000) {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = accentHex;
  for (let i = 0; i < speckles; i++) {
    const s = 2 + Math.random() * 5;
    ctx.globalAlpha = 0.08 + Math.random() * 0.16;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  ctx.globalAlpha = 1;
  return finalizeTexture(canvas, 24, 24, true);
}

export function createSoftGlowTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHeadlightBeamTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(128, 256, 128, 0);
  grad.addColorStop(0, 'rgba(255,246,214,0.62)');
  grad.addColorStop(0.55, 'rgba(255,246,214,0.22)');
  grad.addColorStop(1, 'rgba(255,246,214,0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(92, 256);
  ctx.lineTo(164, 256);
  ctx.lineTo(246, 0);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
