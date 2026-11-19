import { LANDMARKS, VEHICLES } from './game/constants.js';
import { GameEngine } from './game/GameEngine.js';
import { formatRaceTime } from './game/modes.js';

const $ = (id) => document.getElementById(id);

const els = {
  canvas: $('game-canvas'),
  minimapCanvas: $('minimap-canvas'),
  compass: $('minimap-compass'),
  titleScreen: $('title-screen'),
  hud: $('hud'),
  modePill: $('hud-mode-pill'),
  modeText: $('hud-mode-text'),
  racePanel: $('race-panel'),
  raceName: $('race-name'),
  raceCp: $('race-cp'),
  raceTimer: $('race-timer'),
  raceBest: $('race-best'),
  eventBanner: $('event-banner'),
  eventTitle: $('event-title'),
  eventSub: $('event-sub'),
  radioToast: $('radio-toast'),
  radioName: $('radio-station-name'),
  wantedStars: $('wanted-stars'),
  cash: $('hud-cash'),
  landmarksCount: $('hud-landmarks'),
  timeLabel: $('hud-time-label'),
  comboPopup: $('combo-popup'),
  comboLabel: $('combo-label'),
  comboValue: $('combo-value'),
  flightHint: $('flight-hint'),
  barHealth: $('bar-health'),
  barNitro: $('bar-nitro'),
  street: $('hud-street'),
  district: $('hud-district'),
  vehicleName: $('hud-vehicle-name'),
  camName: $('hud-cam-name'),
  speed: $('hud-speed'),
  gear: $('hud-gear'),
  altRow: $('hud-alt-row'),
  altVal: $('hud-alt-val'),
  rpmFill: $('hud-rpm-fill'),
  pillDrift: $('pill-drift'),
  pillNitro: $('pill-nitro'),
  pillAir: $('pill-air'),
  pillSiren: $('pill-siren'),
  garageModal: $('garage-modal'),
  vehicleGrid: $('vehicle-grid'),
  helpModal: $('help-modal'),
  landmarkChecklist: $('landmark-checklist'),
  touchControls: $('touch-controls'),
};

let bannerTimeout = null;
let radioTimeout = null;
let comboTimeout = null;
let garageFilter = 'all';

function showBanner(title, sub) {
  els.eventTitle.textContent = title;
  els.eventSub.textContent = sub;
  els.eventBanner.classList.remove('hidden');
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    els.eventBanner.classList.add('hidden');
  }, 3800);
}

function showRadioToast(name) {
  els.radioName.textContent = name;
  els.radioToast.classList.remove('hidden');
  clearTimeout(radioTimeout);
  radioTimeout = setTimeout(() => {
    els.radioToast.classList.add('hidden');
  }, 2400);
}

function showCombo(label, value, persistent = false) {
  els.comboLabel.textContent = label;
  els.comboValue.textContent = value;
  els.comboPopup.classList.remove('hidden');
  clearTimeout(comboTimeout);
  if (!persistent) {
    comboTimeout = setTimeout(() => {
      els.comboPopup.classList.add('hidden');
    }, 1500);
  }
}

function hideCombo() {
  els.comboPopup.classList.add('hidden');
}

function refreshLandmarks(discoveredSet) {
  els.landmarkChecklist.innerHTML = LANDMARKS.map((lm) => {
    const found = discoveredSet.has(lm.id);
    return `<li class="${found ? 'found' : ''}">
      <span>${found ? '✅' : '⬜'} <strong>${lm.ko}</strong> <small style="color:#94a3b8">(${lm.name})</small></span>
      <span style="color:${found ? '#58d679' : '#64748b'};font-weight:700">${found ? '발견됨' : '미발견'}</span>
    </li>`;
  }).join('');
}

function updateHud(state) {
  els.speed.textContent = state.kmh;
  els.gear.textContent = state.gear;
  els.rpmFill.style.width = `${Math.round(state.rpm * 100)}%`;

  els.barHealth.style.width = `${Math.round(state.health)}%`;
  els.barHealth.classList.toggle('low', state.health < 35);
  els.barNitro.style.width = `${Math.round(state.nitro)}%`;

  els.vehicleName.textContent = state.vehicleName;
  els.camName.textContent = state.camName;
  els.street.textContent = state.street;
  els.district.textContent = state.district;
  els.cash.textContent = `$${state.cash.toLocaleString()}`;
  els.landmarksCount.textContent = `랜드마크 ${state.landmarksFound}/${LANDMARKS.length}`;
  els.timeLabel.textContent = state.timeLabel;

  // Altitude & Flight control guide when piloting Plane or Helicopter
  if (state.isAircraft) {
    els.altRow.classList.remove('hidden');
    els.altVal.textContent = `${state.altitude} M`;
    els.flightHint.classList.remove('hidden');
    if (state.vehicleType === 'plane') {
      els.flightHint.textContent = '✈️ W/S: 추력 • A/D: 뱅크 선회 • Space/Q: 상승(이륙) • Z/Ctrl: 하강 • Shift: 애프터버너';
    } else {
      els.flightHint.textContent = '🚁 Space/Q: 수직 상승 • Z/Ctrl: 하강(착륙) • W/S: 전진/후진 • A/D: 회전 • Shift: 고속 비행';
    }
    els.pillDrift.textContent = state.vehicleType === 'plane' ? 'FLIGHT' : 'HOVER';
    els.pillNitro.textContent = state.vehicleType === 'plane' ? 'AFTERBURN' : 'BOOST';
  } else {
    els.altRow.classList.add('hidden');
    els.flightHint.classList.add('hidden');
    els.pillDrift.textContent = 'DRIFT';
    els.pillNitro.textContent = 'NITRO';
  }

  els.pillDrift.classList.toggle('on-drift', state.isAircraft ? state.isAir : state.isDrifting);
  els.pillNitro.classList.toggle('on-nitro', state.isNitro);
  els.pillAir.classList.toggle('on-air', state.isAir);
  els.pillSiren.classList.toggle('hidden', !state.isPolice);
  els.pillSiren.classList.toggle('on-siren', state.isPolice && state.sirenOn);

  const stars = els.wantedStars.querySelectorAll('.star');
  stars.forEach((s, idx) => {
    s.classList.toggle('active', idx < state.wantedLevel);
  });
  els.wantedStars.classList.toggle('chasing', state.wantedLevel > 0 && !state.evading);
  els.wantedStars.classList.toggle('evading', state.wantedLevel > 0 && state.evading);

  if (state.race.active) {
    els.modePill.classList.add('race-active');
    els.modeText.textContent = '스트리트 레이스 • GRAND PRIX';
    els.racePanel.classList.remove('hidden');
    els.raceName.textContent = state.race.route.name;
    els.raceCp.textContent = `CP ${state.race.currentIndex + 1} / ${state.race.checkpoints.length}`;
    els.raceTimer.textContent = formatRaceTime(state.race.elapsed);
    els.raceBest.textContent = state.race.bestTime
      ? `최고 기록: ${formatRaceTime(state.race.bestTime)}`
      : '최고 기록: --:--.--';
  } else {
    els.modePill.classList.remove('race-active');
    els.modeText.textContent = state.isAircraft
      ? state.vehicleType === 'plane'
        ? '자유 비행 • AIRPLANE'
        : '자유 비행 • HELICOPTER'
      : '자유 주행 • FREE ROAM';
    els.racePanel.classList.add('hidden');
  }
}

const engine = new GameEngine(els.canvas, els.minimapCanvas, els.compass, {
  showBanner,
  showRadioToast,
  showCombo,
  hideCombo,
  refreshLandmarks,
  updateHud,
});

window.__LS_GAME__ = engine;

function renderGarage() {
  const typeIcons = { car: '🚗', plane: '✈️', heli: '🚁' };
  const items = VEHICLES.map((v, idx) => ({ v, idx })).filter(
    ({ v }) => garageFilter === 'all' || v.type === garageFilter
  );

  els.vehicleGrid.innerHTML = items
    .map(({ v, idx }) => {
      const selected = idx === engine.player.specIndex;
      const hexColor = `#${v.color.toString(16).padStart(6, '0')}`;
      const stat4Label = v.type === 'car' ? '드리프트' : '기동성';
      return `
      <button class="veh-card ${selected ? 'selected' : ''}" data-veh-idx="${idx}">
        <div class="veh-head">
          <div class="veh-name">${typeIcons[v.type] || '🚗'} ${v.koName} <kbd>${idx + 1}</kbd></div>
          <div class="veh-swatch" style="background:${hexColor}"></div>
        </div>
        <div class="veh-class">${v.name} • ${v.class}</div>
        <div class="veh-desc">${v.desc}</div>
        <div class="stat-row"><span>최고속</span><div class="stat-track"><div class="stat-bar" style="width:${v.stats.speed}%"></div></div></div>
        <div class="stat-row"><span>가속력</span><div class="stat-track"><div class="stat-bar" style="width:${v.stats.accel}%"></div></div></div>
        <div class="stat-row"><span>조종성</span><div class="stat-track"><div class="stat-bar" style="width:${v.stats.handling}%"></div></div></div>
        <div class="stat-row"><span>${stat4Label}</span><div class="stat-track"><div class="stat-bar" style="width:${v.stats.drift}%"></div></div></div>
      </button>
    `;
    })
    .join('');

  els.vehicleGrid.querySelectorAll('.veh-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      engine.selectVehicle(Number(btn.dataset.vehIdx));
      closeModals();
    });
  });
}

function openGarage() {
  if (!engine.started) return;
  closeModals(false);
  renderGarage();
  els.garageModal.classList.remove('hidden');
  engine.setPaused(true);
}

function openHelp() {
  if (!engine.started) return;
  closeModals(false);
  refreshLandmarks(engine.modes.discoveredLandmarks);
  els.helpModal.classList.remove('hidden');
  engine.setPaused(true);
}

function closeModals(resume = true) {
  els.garageModal.classList.add('hidden');
  els.helpModal.classList.add('hidden');
  if (resume && engine.started) {
    engine.setPaused(false);
  }
}

function launch(mode) {
  els.titleScreen.classList.add('hidden');
  els.hud.classList.remove('hidden');
  if (mode === 'flight') {
    engine.startGame('roam');
    engine.selectVehicle(5); // Immediate P-996 LAZER Fighter Jet launch!
  } else {
    engine.startGame(mode);
  }
  refreshLandmarks(engine.modes.discoveredLandmarks);
  if (window.matchMedia('(pointer: coarse)').matches) {
    els.touchControls.classList.remove('hidden');
  }
}

// Title buttons
$('btn-play-roam').addEventListener('click', () => launch('roam'));
$('btn-play-flight').addEventListener('click', () => launch('flight'));
$('btn-play-race').addEventListener('click', () => launch('race'));

// Quick HUD buttons
$('btn-garage').addEventListener('click', openGarage);
$('btn-garage-close').addEventListener('click', () => closeModals(true));
$('btn-quick-jet').addEventListener('click', () => engine.selectVehicle(5));
$('btn-quick-heli').addEventListener('click', () => engine.selectVehicle(7));
$('btn-help').addEventListener('click', openHelp);
$('btn-help-close').addEventListener('click', () => closeModals(true));
$('btn-mode-toggle').addEventListener('click', () => engine.toggleRace());
$('btn-time').addEventListener('click', () => engine.cycleTime());
$('btn-camera').addEventListener('click', () => engine.cycleCamera());
$('btn-radio').addEventListener('click', () => engine.cycleRadio());
$('btn-wanted-test').addEventListener('click', () => engine.triggerPoliceChase());
$('btn-wanted-clear').addEventListener('click', () => engine.clearPolice());
$('btn-repair').addEventListener('click', () => engine.repairAndRecover());

// Garage filter tabs
document.querySelectorAll('.g-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.g-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    garageFilter = tab.dataset.filter;
    renderGarage();
  });
});

// All San Andreas fast-travel buttons
document.querySelectorAll('[data-tp]').forEach((btn) => {
  btn.addEventListener('click', () => {
    engine.teleportTo(btn.dataset.tp);
    closeModals(true);
  });
});

// Keyboard Controls
function setKeyInput(code, pressed) {
  switch (code) {
    case 'KeyW':
    case 'ArrowUp':
      engine.input.up = pressed;
      break;
    case 'KeyS':
    case 'ArrowDown':
      engine.input.down = pressed;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      engine.input.left = pressed;
      break;
    case 'KeyD':
    case 'ArrowRight':
      engine.input.right = pressed;
      break;
    case 'Space':
      engine.input.handbrake = pressed;
      break;
    case 'KeyQ':
      engine.input.climb = pressed;
      break;
    case 'KeyZ':
    case 'ControlLeft':
    case 'ControlRight':
      engine.input.descend = pressed;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      engine.input.nitro = pressed;
      break;
    case 'KeyB':
      engine.input.lookBack = pressed;
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (!engine.started) {
    if (e.code === 'Enter') launch('roam');
    return;
  }

  engine.audio.unlock();
  setKeyInput(e.code, true);

  if (e.repeat) return;

  if (e.code === 'Escape') {
    closeModals(true);
    return;
  }
  if (e.code === 'KeyG') {
    if (els.garageModal.classList.contains('hidden')) openGarage();
    else closeModals(true);
    return;
  }
  if (e.code === 'KeyH') {
    if (els.helpModal.classList.contains('hidden')) openHelp();
    else closeModals(true);
    return;
  }

  if (engine.paused) return;

  // Quick 1..9 vehicle/plane/heli hotkeys!
  if (e.code.startsWith('Digit')) {
    const idx = Number(e.code.replace('Digit', '')) - 1;
    if (idx >= 0 && idx < VEHICLES.length) {
      engine.selectVehicle(idx);
      return;
    }
  }

  switch (e.code) {
    case 'KeyC':
      engine.cycleCamera();
      break;
    case 'KeyT':
      engine.cycleTime();
      break;
    case 'KeyR':
      engine.cycleRadio();
      break;
    case 'KeyM':
      engine.toggleRace();
      break;
    case 'KeyF':
      engine.repairAndRecover();
      break;
    case 'KeyE':
      engine.toggleSiren();
      break;
    case 'KeyU':
      engine.triggerPoliceChase();
      break;
    case 'KeyP':
      engine.clearPolice();
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', (e) => {
  setKeyInput(e.code, false);
});

window.addEventListener('blur', () => {
  Object.keys(engine.input).forEach((k) => {
    engine.input[k] = false;
  });
});

// Touch Controls
els.touchControls.querySelectorAll('.t-btn').forEach((btn) => {
  const key = btn.dataset.key;
  const onDown = (e) => {
    e.preventDefault();
    engine.audio.unlock();
    engine.input[key] = true;
  };
  const onUp = (e) => {
    e.preventDefault();
    engine.input[key] = false;
  };
  btn.addEventListener('pointerdown', onDown);
  btn.addEventListener('pointerup', onUp);
  btn.addEventListener('pointercancel', onUp);
  btn.addEventListener('pointerleave', onUp);
});
