export const ENV_CONFIG = {
  // ── Time ────────────────────────────────────────────────────────────────────
  time: {
    startHour: 8.0,    // in-game hour on load [0-24]
    speed: 1 / 60, // hours per real second (1/60 = 1 real-min per game-hour)
    lunarCycleDays: 1,      // how many in-game days for a full moon phase cycle
  },

  // ── Sun ──────────────────────────────────────────────────────────────────────
  sun: {
    orbitRadius: 200,    // radius of the sun/moon orbit sphere
    orbitTilt: 0.45,     // Z-axis tilt
    color: 0xfff0e0,
    maxIntensity: 4,    // peak midday multiplier
    shadowMapSize: 2048,
    shadowCameraExtent: 80,    // half-extent of shadow frustum (square)
    shadowBias: -0.001,
  },

  // ── Moon ────────────────────────────────────────────────────────────────────
  moon: {
    fixedAngleDeg: 135,
    orbitTilt: -0.2,     // different Z-axis tilt than sun
    lightColor: 0xccccff,
    lightIntensity: 1,   // max moon light when above horizon
    phaseLightIntensity: 1.2,  // dedicated phase-shading layer light
    meshRadius: 40,
    glowBaseSize: 220,   // sprite glow base scale
    glowGrowth: 120,   // extra scale added at full nightFactor
    meshOpacityNight: 1.0,
    meshOpacityDay: 0.5,
  },

  // ── Ambient Light ───────────────────────────────────────────────────────────
  ambient: {
    intensity: 2,
    // Colors as [r, g, b] in linear 0-1 space
    dayColor: [0.85, 0.97, 1.0],   // bright daytime cyan-white
    nightColor: [0.28, 0.32, 0.55],  // visible dark blue
    sunsetColor: [1.0, 0.60, 0.30],  // warm sunset/sunrise orange
  },

  // ── Hemisphere Light ────────────────────────────────────────────────────────
  hemisphere: {
    intensity: 2,
    daySkyColor: [0.55, 0.82, 1.0],
    dayGroundColor: [0.40, 0.32, 0.18],
    nightSkyColor: [0.18, 0.20, 0.40],
    nightGroundColor: [0.10, 0.10, 0.18],
  },

  // ── Atmosphere (Sky shader) ──────────────────────────────────────────────────
  atmosphere: {
    turbidityDay: 5,
    turbidityNight: 0.4,
    rayleighDay: 0.7,
    rayleighNight: 0.04,
    mieCoeffDay: 0.003,
    mieCoeffNight: 0.001,
    mieGDay: 0.995,
    mieGNight: 0.998,
  },

  // ── Fog ─────────────────────────────────────────────────────────────────────
  fog: {
    dayColor: 0x87ceeb,
    nightColor: 0x020510,
    dayDensity: 0.0018,
    nightDensity: 0.003,
  },

  // ── Stars ───────────────────────────────────────────────────────────────────
  stars: {
    smallCount: 3500, smallSize: 3, smallBrightness: 0.7,
    mediumCount: 1200, mediumSize: 5, mediumBrightness: 0.9,
    largeCount: 120, largeSize: 10, largeBrightness: 1.0,
    sphereRadius: 1500,
  },

  // ── Tone Mapping ────────────────────────────────────────────────────────────
  toneMapping: {
    dayExposure: 0.30,
    nightExposure: 0.40,
  },
};

export type EnvConfig = typeof ENV_CONFIG;
export const INITIAL_ENV_CONFIG: EnvConfig = JSON.parse(JSON.stringify(ENV_CONFIG));

export function resetEnvConfig(): void {
  Object.assign(ENV_CONFIG.time, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.time)));
  Object.assign(ENV_CONFIG.sun, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.sun)));
  Object.assign(ENV_CONFIG.moon, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.moon)));
  Object.assign(ENV_CONFIG.ambient, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.ambient)));
  Object.assign(ENV_CONFIG.hemisphere, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.hemisphere)));
  Object.assign(ENV_CONFIG.atmosphere, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.atmosphere)));
  Object.assign(ENV_CONFIG.fog, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.fog)));
  Object.assign(ENV_CONFIG.stars, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.stars)));
  Object.assign(ENV_CONFIG.toneMapping, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.toneMapping)));
}
