export const WORLD_BOUNDS = {
  minX: -660,
  maxX: 640,
  minZ: -2120,
  maxZ: 680,
  beachEdgeX: -245,
  oceanEdgeX: -315,
};

export const ROAD_WIDTH = 22;

// Los Santos urban road grid (centers)
export const V_ROADS = [-220, -110, 0, 110, 220, 330];
export const H_ROADS = [-220, -110, 0, 110, 220, 340, 460];

export const V_ROAD_NAMES = {
  [-220]: 'VESPUCCI COASTAL BLVD',
  [-110]: 'DEL PERRO AVE',
  [0]: 'PILLBOX HILL AVE',
  [110]: 'POWER ST',
  [220]: 'ELGIN AVE',
  [330]: 'OLYMPIC FWY EAST',
};

export const H_ROAD_NAMES = {
  [-220]: 'VINEWOOD BLVD',
  [-110]: 'HAWICK AVE',
  [0]: 'SAN ANDREAS AVE',
  [110]: 'VESPUCCI BLVD',
  [220]: 'STRAWBERRY AVE',
  [340]: 'DAVIS AVE',
  [460]: 'LSIA PERIMETER RD',
};

export const VEHICLES = [
  // ==================== CARS (5) ====================
  {
    id: 'buffalo',
    type: 'car',
    name: 'BRAVADO BUFFALO STX',
    koName: '브라바도 버팔로 STX',
    class: 'MUSCLE / SPORTS',
    desc: '로스 산토스의 상징적인 머슬 세단. 균형 잡힌 가속력과 안정적인 드리프트 성능.',
    color: 0xd92638,
    accent: 0xf8fafc,
    topSpeed: 74,
    accel: 34,
    brake: 48,
    handling: 2.65,
    driftGrip: 0.94,
    mass: 1.15,
    width: 2.15,
    length: 4.85,
    height: 1.42,
    bodyStyle: 'muscle',
    underglow: null,
    isPolice: false,
    stats: { speed: 84, accel: 82, handling: 80, drift: 82 },
  },
  {
    id: 'zentorno',
    type: 'car',
    name: 'PEGASSI ZENTORNO',
    koName: '페가시 젠토르노',
    class: 'HYPERCAR',
    desc: '압도적인 최고 속도와 날카로운 코너링을 자랑하는 하이퍼카. 네온 언더글로우 장착.',
    color: 0x1e2430,
    accent: 0xff6b2b,
    topSpeed: 88,
    accel: 43,
    brake: 58,
    handling: 3.05,
    driftGrip: 0.955,
    mass: 1.0,
    width: 2.24,
    length: 4.7,
    height: 1.18,
    bodyStyle: 'super',
    underglow: 0xff5a1f,
    isPolice: false,
    stats: { speed: 98, accel: 96, handling: 92, drift: 76 },
  },
  {
    id: 'futo',
    type: 'car',
    name: 'KARIN FUTO GTX',
    koName: '카린 푸토 GTX',
    class: 'DRIFT COUPE',
    desc: '바인우드 힐즈와 도심 코너를 미끄러지듯 정복하는 경량 드리프트 머신.',
    color: 0xf1f5f9,
    accent: 0x2563eb,
    topSpeed: 70,
    accel: 36,
    brake: 50,
    handling: 3.15,
    driftGrip: 0.915,
    mass: 0.9,
    width: 1.98,
    length: 4.35,
    height: 1.32,
    bodyStyle: 'coupe',
    underglow: 0x38bdf8,
    isPolice: false,
    stats: { speed: 78, accel: 84, handling: 94, drift: 99 },
  },
  {
    id: 'insurgent',
    type: 'car',
    name: 'HVY INSURGENT SUV',
    koName: '인서전트 오프로드 SUV',
    class: 'OFF-ROAD / HEAVY',
    desc: '그랜드 세뇨라 사막과 칠리아드 산악 지형도 거침없이 돌파하는 중장갑 오프로더.',
    color: 0x4b5842,
    accent: 0x1e221b,
    topSpeed: 64,
    accel: 29,
    brake: 42,
    handling: 2.35,
    driftGrip: 0.96,
    mass: 1.85,
    width: 2.45,
    length: 5.25,
    height: 1.92,
    bodyStyle: 'suv',
    underglow: null,
    isPolice: false,
    stats: { speed: 70, accel: 72, handling: 70, drift: 65 },
  },
  {
    id: 'lspd',
    type: 'car',
    name: 'LSPD INTERCEPTOR',
    koName: 'LSPD 경찰 인터셉터',
    class: 'EMERGENCY',
    desc: '로스 산토스 경찰국 고속 추격차. E 키로 경광등과 사이렌을 켜고 도시를 순찰하세요.',
    color: 0x121620,
    accent: 0xffffff,
    topSpeed: 80,
    accel: 38,
    brake: 54,
    handling: 2.85,
    driftGrip: 0.94,
    mass: 1.3,
    width: 2.15,
    length: 4.95,
    height: 1.48,
    bodyStyle: 'police',
    underglow: null,
    isPolice: true,
    stats: { speed: 90, accel: 88, handling: 86, drift: 80 },
  },

  // ==================== AIRPLANES (2) ====================
  {
    id: 'lazer',
    type: 'plane',
    name: 'P-996 LAZER JET',
    koName: 'P-996 레이저 전투기',
    class: 'FIGHTER JET',
    desc: '포트 잔쿠도 기지의 초음속 제트 전투기! 애프터버너로 산 안드레아스 전역을 수초 만에 횡단하세요.',
    color: 0x64748b,
    accent: 0xf97316,
    topSpeed: 138, // ~497 km/h
    takeoffSpeed: 30,
    minAirSpeed: 28,
    accel: 54,
    brake: 42,
    pitchRate: 1.35,
    rollRate: 2.1,
    yawRate: 1.35,
    mass: 2.0,
    width: 11.2,
    length: 13.5,
    height: 3.4,
    bodyStyle: 'jet',
    isPolice: false,
    stats: { speed: 100, accel: 98, handling: 92, drift: 95 },
  },
  {
    id: 'cuban800',
    type: 'plane',
    name: 'WESTERN CUBAN 800',
    koName: '큐반 800 사막 프로펠러기',
    class: 'PROP AIRPLANE',
    desc: '샌디 해안 비행장의 상징적인 쌍발 프로펠러기. 짧은 활주로에서도 쉽게 이착륙 가능합니다.',
    color: 0xf8fafc,
    accent: 0xdc2626,
    topSpeed: 92, // ~331 km/h
    takeoffSpeed: 22,
    minAirSpeed: 20,
    accel: 36,
    brake: 32,
    pitchRate: 1.15,
    rollRate: 1.65,
    yawRate: 1.15,
    mass: 1.6,
    width: 11.8,
    length: 9.8,
    height: 2.9,
    bodyStyle: 'prop',
    isPolice: false,
    stats: { speed: 82, accel: 78, handling: 88, drift: 85 },
  },

  // ==================== HELICOPTERS (2) ====================
  {
    id: 'buzzard',
    type: 'heli',
    name: 'NAGASAKI BUZZARD',
    koName: '버자드 공격 헬리콥터',
    class: 'ATTACK HELICOPTER',
    desc: '수직 이착륙과 제자리 호버링이 가능한 기동성 최강의 소형 전술 헬기. 메이즈 뱅크 옥상 착륙 가능!',
    color: 0x1e242b,
    accent: 0xf59e0b,
    topSpeed: 76,
    climbSpeed: 28,
    accel: 32,
    handling: 2.1,
    mass: 1.8,
    width: 3.4,
    length: 9.6,
    height: 3.3,
    bodyStyle: 'buzzard',
    isPolice: false,
    stats: { speed: 78, accel: 86, handling: 96, drift: 95 },
  },
  {
    id: 'maverick',
    type: 'heli',
    name: 'LSPD POLICE MAVERICK',
    koName: 'LSPD 경찰 매버릭 헬기',
    class: 'POLICE HELICOPTER',
    desc: '로스 산토스 경찰국 항공대 헬리콥터. 야간 탐조등과 경광등·사이렌(E)을 켜고 상공을 순찰하세요.',
    color: 0x111827,
    accent: 0xffffff,
    topSpeed: 72,
    climbSpeed: 25,
    accel: 28,
    handling: 1.9,
    mass: 2.0,
    width: 3.8,
    length: 10.8,
    height: 3.6,
    bodyStyle: 'maverick',
    isPolice: true,
    stats: { speed: 74, accel: 80, handling: 90, drift: 88 },
  },
];

export const LANDMARKS = [
  // Los Santos (8)
  {
    id: 'maze_bank',
    name: 'MAZE BANK TOWER',
    ko: '메이즈 뱅크 타워',
    x: 55,
    z: -55,
    radius: 75,
    color: '#ef4444',
    short: 'MB',
  },
  {
    id: 'legion_square',
    name: 'LEGION SQUARE',
    ko: '리전 스퀘어',
    x: -55,
    z: 55,
    radius: 65,
    color: '#22c55e',
    short: 'LS',
  },
  {
    id: 'vinewood_sign',
    name: 'VINEWOOD SIGN',
    ko: '바인우드 사인',
    x: 55,
    z: -520,
    radius: 95,
    color: '#f8fafc',
    short: 'VW',
  },
  {
    id: 'observatory',
    name: 'GALILEO OBSERVATORY',
    ko: '갈릴레오 천문대',
    x: -145,
    z: -455,
    radius: 75,
    color: '#e2e8f0',
    short: 'GO',
  },
  {
    id: 'del_perro_pier',
    name: 'DEL PERRO PIER',
    ko: '델 페로 피어 & 대관람차',
    x: -360,
    z: 0,
    radius: 85,
    color: '#f472b6',
    short: 'DP',
  },
  {
    id: 'vespucci_beach',
    name: 'VESPUCCI BEACH',
    ko: '베스푸치 비치',
    x: -270,
    z: 165,
    radius: 75,
    color: '#fbbf24',
    short: 'VB',
  },
  {
    id: 'grove_street',
    name: 'GROVE STREET',
    ko: '그로브 스트리트',
    x: 275,
    z: 400,
    radius: 70,
    color: '#4ade80',
    short: 'GS',
  },
  {
    id: 'lsia',
    name: 'LOS SANTOS INTL AIRPORT',
    ko: 'LSIA 국제공항 활주로',
    x: -40,
    z: 545,
    radius: 110,
    color: '#38bdf8',
    short: '✈',
  },

  // Blaine County Desert & Northern San Andreas (6)
  {
    id: 'senora_desert',
    name: 'GRAND SENORA DESERT',
    ko: '그랜드 세뇨라 사막 & 68번 국도',
    x: 25,
    z: -860,
    radius: 120,
    color: '#f97316',
    short: 'SD',
  },
  {
    id: 'sandy_shores',
    name: 'SANDY SHORES AIRFIELD',
    ko: '샌디 해안 사막 비행장',
    x: 165,
    z: -1020,
    radius: 120,
    color: '#eab308',
    short: 'SS',
  },
  {
    id: 'fort_zancudo',
    name: 'FORT ZANCUDO AIRBASE',
    ko: '포트 잔쿠도 군사기지',
    x: -255,
    z: -930,
    radius: 130,
    color: '#a3e635',
    short: 'FZ',
  },
  {
    id: 'alamo_sea',
    name: 'ALAMO SEA',
    ko: '알라모 해 (사막 대호수)',
    x: 20,
    z: -1240,
    radius: 160,
    color: '#06b6d4',
    short: 'AS',
  },
  {
    id: 'mount_chiliad',
    name: 'MOUNT CHILIAD SUMMIT',
    ko: '칠리아드 산 정상 (245m)',
    x: -15,
    z: -1680,
    radius: 155,
    color: '#cbd5e1',
    short: 'MC',
  },
  {
    id: 'paleto_bay',
    name: 'PALETO BAY',
    ko: '팔레토 베이 (북부 해안마을)',
    x: -10,
    z: -1940,
    radius: 120,
    color: '#60a5fa',
    short: 'PB',
  },
];

// Stunt ramps (x, z, yaw in radians where ramp climbs along local +Z)
export const STUNT_RAMPS = [
  { id: 'ramp_downtown', name: 'PILLBOX SKY JUMP', x: 0, z: 58, width: 10, length: 20, height: 5.8, yaw: Math.PI },
  { id: 'ramp_beach', name: 'VESPUCCI WAVE JUMP', x: -272, z: 95, width: 10, length: 18, height: 5.2, yaw: Math.PI },
  { id: 'ramp_pier', name: 'PIER EDGE LAUNCH', x: -420, z: 0, width: 9, length: 16, height: 4.5, yaw: -Math.PI / 2 },
  { id: 'ramp_lsia_1', name: 'LSIA RUNWAY BOOSTER', x: -90, z: 545, width: 14, length: 24, height: 7.2, yaw: Math.PI / 2 },
  { id: 'ramp_lsia_2', name: 'LSIA JET LEAP', x: 55, z: 545, width: 14, length: 24, height: 7.2, yaw: -Math.PI / 2 },
  { id: 'ramp_vinewood', name: 'VINEWOOD RIDGE JUMP', x: 110, z: -165, width: 10, length: 18, height: 5.5, yaw: Math.PI },
  { id: 'ramp_desert', name: 'SENORA CANYON LEAP', x: 15, z: -870, width: 13, length: 22, height: 6.8, yaw: Math.PI },
  { id: 'ramp_sandy', name: 'SANDY SHORES JUMP', x: 175, z: -1020, width: 13, length: 22, height: 6.5, yaw: -Math.PI / 2 },
];

// Los Santos Customs repair bay location
export const REPAIR_BAY = {
  x: -55,
  z: -165,
  radius: 14,
};

// Maze Bank Tower rooftop helipad (landable by helicopters!)
export const MAZE_BANK_HELIPAD = {
  x: 55,
  z: -55,
  y: 177.2,
  radius: 15.5,
};

// Checkpoint Street Race: "LOS SANTOS GRAND PRIX" (15 checkpoints touring the city)
export const RACE_ROUTES = [
  {
    id: 'ls_gp',
    name: 'LOS SANTOS GRAND PRIX',
    startPos: { x: 0, z: 185, yaw: Math.PI },
    checkpoints: [
      { x: 0, z: 110 },
      { x: 0, z: 0 },
      { x: 0, z: -110 },
      { x: 0, z: -220 },
      { x: -110, z: -220 },
      { x: -220, z: -220 },
      { x: -220, z: -60 },
      { x: -220, z: 110 },
      { x: -220, z: 340 },
      { x: -110, z: 460 },
      { x: 110, z: 460 },
      { x: 220, z: 340 },
      { x: 220, z: 110 },
      { x: 110, z: 110 },
      { x: 0, z: 185 },
    ],
  },
];

// Teleport quick-travel points across the ENTIRE GTA V San Andreas Map!
export const TELEPORT_POINTS = {
  downtown: { x: 0, z: 148, yaw: Math.PI, label: '메이즈 뱅크 다운타운' },
  mazepad: { x: 55, z: -55, y: 177.3, yaw: Math.PI, label: '메이즈 뱅크 옥상 헬리패드' },
  vinewood: { x: 55, z: -395, yaw: Math.PI, label: '바인우드 힐즈' },
  beach: { x: -252, z: 0, yaw: -Math.PI / 2, label: '델 페로 피어' },
  lsia: { x: -195, z: 545, yaw: Math.PI / 2, label: 'LSIA 공항 활주로' },
  grove: { x: 235, z: 400, yaw: Math.PI / 2, label: '그로브 스트리트' },
  desert: { x: 20, z: -835, yaw: Math.PI, label: '그랜드 세뇨라 사막' },
  sandy: { x: 55, z: -1020, yaw: Math.PI / 2, label: '샌디 해안 비행장' },
  zancudo: { x: -375, z: -930, yaw: Math.PI / 2, label: '포트 잔쿠도 군사기지' },
  chiliad: { x: -15, z: -1660, yaw: 0, label: '칠리아드 산 정상' },
  paleto: { x: -10, z: -1935, yaw: Math.PI / 2, label: '팔레토 베이' },
};

// Time-of-Day atmosphere presets
export const TIME_PRESETS = [
  {
    id: 'sunset',
    label: '골든 아워',
    skyTop: 0x1b2852,
    skyMid: 0xc25468,
    skyHorizon: 0xff9b54,
    fogColor: 0xd98062,
    fogNear: 260,
    fogFar: 1350,
    sunColor: 0xffb36b,
    sunIntensity: 2.35,
    sunPos: [-520, 175, -240],
    hemiSky: 0xffb585,
    hemiGround: 0x3b2c44,
    hemiIntensity: 0.95,
    ambientColor: 0x5c3c4c,
    ambientIntensity: 0.45,
    nightFactor: 0.42,
    exposure: 1.08,
  },
  {
    id: 'night',
    label: '네온 야경',
    skyTop: 0x050816,
    skyMid: 0x0d1530,
    skyHorizon: 0x1c2548,
    fogColor: 0x0f162d,
    fogNear: 190,
    fogFar: 1120,
    sunColor: 0x8bb6ff,
    sunIntensity: 0.72,
    sunPos: [380, 320, -340],
    hemiSky: 0x344c80,
    hemiGround: 0x101420,
    hemiIntensity: 0.65,
    ambientColor: 0x1b2440,
    ambientIntensity: 0.52,
    nightFactor: 1.0,
    exposure: 1.05,
  },
  {
    id: 'morning',
    label: '캘리포니아 아침',
    skyTop: 0x2c7be5,
    skyMid: 0x7bc2f5,
    skyHorizon: 0xffe4be,
    fogColor: 0xcfe0ec,
    fogNear: 320,
    fogFar: 1550,
    sunColor: 0xfff0d4,
    sunIntensity: 2.3,
    sunPos: [480, 260, 180],
    hemiSky: 0xbadfff,
    hemiGround: 0x59554c,
    hemiIntensity: 1.05,
    ambientColor: 0x8ca6bf,
    ambientIntensity: 0.4,
    nightFactor: 0.0,
    exposure: 1.06,
  },
  {
    id: 'noon',
    label: '한낮의 산 안드레아스',
    skyTop: 0x1668d4,
    skyMid: 0x55a8f0,
    skyHorizon: 0xc2e6ff,
    fogColor: 0xaad4f5,
    fogNear: 360,
    fogFar: 1680,
    sunColor: 0xfffaf0,
    sunIntensity: 2.55,
    sunPos: [180, 560, 140],
    hemiSky: 0xbce0ff,
    hemiGround: 0x625a4e,
    hemiIntensity: 1.12,
    ambientColor: 0x8aa8c4,
    ambientIntensity: 0.42,
    nightFactor: 0.0,
    exposure: 1.05,
  },
];

export function getDistrictInfo(x, z, y = 0) {
  let district = 'DOWNTOWN LOS SANTOS';
  let bestStreet = 'SAN ANDREAS AIRSPACE';

  if (z < -1820) {
    district = 'PALETO BAY • BLAINE COUNTY';
    bestStreet = 'PALETO BLVD';
  } else if (z < -1440) {
    district = 'MOUNT CHILIAD WILDERNESS';
    bestStreet = 'CHILIAD MOUNTAIN STATE';
  } else if (z < -1110) {
    if (x > 220) {
      district = 'GRAPESEED • BLAINE COUNTY';
      bestStreet = 'GRAPESEED MAIN ST';
    } else if (x < -190) {
      district = 'NORTH CHUMASH COAST';
      bestStreet = 'GREAT OCEAN HWY';
    } else {
      district = 'ALAMO SEA • BLAINE COUNTY';
      bestStreet = 'ALAMO SEA SHORELINE';
    }
  } else if (z < -620) {
    if (x < -140 && z < -820 && z > -1060) {
      district = 'FORT ZANCUDO MILITARY BASE';
      bestStreet = 'ZANCUDO RUNWAY 09';
    } else if (x > 30 && z < -940 && z > -1100) {
      district = 'SANDY SHORES • BLAINE COUNTY';
      bestStreet = 'SANDY SHORES AIRFIELD';
    } else if (x > 290) {
      district = 'RON ALTERNATES WIND FARM';
      bestStreet = 'SENORA FREEWAY';
    } else {
      district = 'GRAND SENORA DESERT';
      bestStreet = Math.abs(z + 890) < 40 ? 'ROUTE 68 DESERT HWY' : 'SENORA DESERT TRAIL';
    }
  } else if (x < -310) {
    district = Math.abs(z) < 60 ? 'DEL PERRO PIER' : 'PACIFIC OCEAN';
    bestStreet = Math.abs(z) < 42 ? 'DEL PERRO PIER BOARDWALK' : 'PACIFIC COASTAL WATERS';
  } else if (x < -230 && z > -200 && z < 440) {
    district = 'VESPUCCI BEACH';
    bestStreet = 'VESPUCCI BEACH BOARDWALK';
  } else if (z < -250) {
    district = x < -80 ? 'GALILEO OBSERVATORY' : 'VINEWOOD HILLS';
    bestStreet = 'VINEWOOD HILLS SCENIC DR';
  } else if (z > 470 && x < 200) {
    district = 'LOS SANTOS INTL AIRPORT';
    bestStreet = 'LSIA RUNWAY 24L';
  } else if (x > 210 && z > 310) {
    district = 'GROVE STREET • DAVIS';
    bestStreet = 'GROVE STREET CUL-DE-SAC';
  } else if (x > 260) {
    district = 'EAST LOS SANTOS';
    bestStreet = 'OLYMPIC FWY EAST';
  } else if (z < -120) {
    district = 'DOWNTOWN VINEWOOD';
    bestStreet = 'VINEWOOD BLVD';
  } else if (x > -110 && x < 110 && z > -110 && z < 110) {
    district = 'PILLBOX HILL • DOWNTOWN';
    bestStreet = 'PILLBOX HILL AVE';
  } else if (z > 230) {
    district = 'STRAWBERRY • SOUTH LS';
    bestStreet = 'STRAWBERRY AVE';
  }

  // Refine street name inside Los Santos grid
  if (z >= -245 && z <= 485 && x >= -245 && x <= 355 && bestStreet === 'SAN ANDREAS AIRSPACE') {
    let minDist = Infinity;
    for (const vx of V_ROADS) {
      const d = Math.abs(x - vx);
      if (d < minDist) {
        minDist = d;
        bestStreet = V_ROAD_NAMES[vx];
      }
    }
    for (const hz of H_ROADS) {
      const d = Math.abs(z - hz);
      if (d < minDist) {
        minDist = d;
        bestStreet = H_ROAD_NAMES[hz];
      }
    }
  }

  if (y > 65) {
    bestStreet = `AIRSPACE • ALT ${Math.round(y)}M`;
  }

  return { district, street: bestStreet };
}
