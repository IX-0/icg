import * as THREE from 'three';
import { ENV_CONFIG } from '../config/EnvironmentConfig';

export default class LightingSystem {
  scene: THREE.Scene;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  pointLight: THREE.PointLight;
  hemisphereLight: THREE.HemisphereLight;
  moonLight: THREE.DirectionalLight;
  moonPhaseLight: THREE.DirectionalLight;

  private _sinElevation: number = 0;
  public lastSunTime: number = ENV_CONFIG.time.startHour;
  /** Increments every time the clock crosses midnight — used by EnvironmentManager for phase cycling */
  public dayNumber: number = 0;
  private _prevHour: number = ENV_CONFIG.time.startHour;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const cfg = ENV_CONFIG;

    this.sunLight = new THREE.DirectionalLight(cfg.sun.color, 1.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(cfg.sun.shadowMapSize, cfg.sun.shadowMapSize);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    const ext = cfg.sun.shadowCameraExtent;
    this.sunLight.shadow.camera.left = -ext;
    this.sunLight.shadow.camera.right = ext;
    this.sunLight.shadow.camera.top = ext;
    this.sunLight.shadow.camera.bottom = -ext;
    this.sunLight.shadow.bias = cfg.sun.shadowBias;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.moonLight = new THREE.DirectionalLight(cfg.moon.lightColor, cfg.moon.lightIntensity);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    // Dedicated light for explicit moon phases on Layer 2
    this.moonPhaseLight = new THREE.DirectionalLight(0xffffff, cfg.moon.phaseLightIntensity);
    this.moonPhaseLight.layers.disableAll();
    this.moonPhaseLight.layers.enable(2);
    this.scene.add(this.moonPhaseLight);
    this.scene.add(this.moonPhaseLight.target);

    this.ambientLight = new THREE.AmbientLight(0xffffff, cfg.ambient.intensity);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d2b1f, cfg.hemisphere.intensity);
    this.scene.add(this.hemisphereLight);
  }

  /** h in [0, 24] */
  setSunTime(h: number): void {
    const cfg = ENV_CONFIG;
    const R = cfg.sun.orbitRadius;

    // --- SUN ORBIT ---
    const sunAngle = ((h - 6) / 24) * Math.PI * 2;
    const sunX = R * Math.cos(sunAngle);
    const sunY = R * Math.sin(sunAngle);
    const sunZ = R * cfg.sun.orbitTilt;
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    // --- STATIC MOON (fixed sky position) ---
    this.lastSunTime = h;

    // Detect midnight crossing → advance day counter
    if (this._prevHour > 23.0 && h < 1.0) {
      this.dayNumber++;
    }
    this._prevHour = h;

    // Moon is pinned to a fixed angle on the orbit circle from config.
    const moonAngle = (cfg.moon.fixedAngleDeg / 360) * Math.PI * 2;
    const moonX = R * Math.cos(moonAngle);
    const moonY = R * Math.sin(moonAngle);
    const moonZ = R * cfg.moon.orbitTilt;

    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.target.position.set(0, 0, 0);

    // Position phase-light near the moon
    this.moonPhaseLight.position.copy(this.moonLight.position);
    this.moonPhaseLight.target.position.set(0, 0, 0);

    this._sinElevation = sunY / R;

    // ── Gating (Strict) ─────────────────────────────────────────────────────
    const isDay = h > 6 && h < 18;
    const sunFactor = isDay ? THREE.MathUtils.mapLinear(this._sinElevation, 0, 1, 0, 1) : 0;

    this.sunLight.intensity = sunFactor * cfg.sun.maxIntensity;
    this.sunLight.visible = isDay;

    const moonSinElev = moonY / R;
    const moonFactor = THREE.MathUtils.clamp(moonSinElev * 3, 0, 1);
    this.moonLight.intensity = moonFactor * cfg.moon.lightIntensity;

    // ── AMBIENT LIGHT ────────────────────────────────────────────────────────
    this.ambientLight.intensity = cfg.ambient.intensity;

    // ── AMBIENT LIGHT ────────────────────────────────────────────────────────
    this.ambientLight.intensity = cfg.ambient.intensity;

    const dayColor = new THREE.Color().fromArray(cfg.ambient.dayColor);
    const nightColor = new THREE.Color().fromArray(cfg.ambient.nightColor);
    const sunsetColor = new THREE.Color().fromArray(cfg.ambient.sunsetColor);

    if (this._sinElevation > 0.1) {
      this.ambientLight.color.copy(dayColor);
    } else if (this._sinElevation > 0.0) {
      // Day to Sunset transition (sinElevation 0.1 down to 0.0)
      const t = 1.0 - (this._sinElevation / 0.1);
      this.ambientLight.color.copy(dayColor).lerp(sunsetColor, t);
    } else if (this._sinElevation > -0.1) {
      // Sunset to Night transition (sinElevation 0.0 down to -0.1)
      const t = (this._sinElevation / -0.1);
      this.ambientLight.color.copy(sunsetColor).lerp(nightColor, t);
    } else {
      this.ambientLight.color.copy(nightColor);
    }

    this.hemisphereLight.intensity = cfg.hemisphere.intensity;
    const nf = this.getNightFactor();

    // Lerp Sky Color
    const daySky = new THREE.Color().fromArray(cfg.hemisphere.daySkyColor);
    const nightSky = new THREE.Color().fromArray(cfg.hemisphere.nightSkyColor);
    this.hemisphereLight.color.lerpColors(daySky, nightSky, nf);

    // Lerp Ground Color
    const dayGround = new THREE.Color().fromArray(cfg.hemisphere.dayGroundColor);
    const nightGround = new THREE.Color().fromArray(cfg.hemisphere.nightGroundColor);
    this.hemisphereLight.groundColor.lerpColors(dayGround, nightGround, nf);
  }

  getNightFactor(): number {
    return THREE.MathUtils.clamp(-this._sinElevation * 3, 0, 1);
  }

  getSunDirection(): THREE.Vector3 { return this.sunLight.position.clone().normalize(); }
  getMoonDirection(): THREE.Vector3 { return this.moonLight.position.clone().normalize(); }
  getSunElevationSin(): number { return this._sinElevation; }

  getSunPosition(): THREE.Vector3 { return this.sunLight.position.clone(); }
  getSunLight(): THREE.DirectionalLight { return this.sunLight; }
  getMoonLight(): THREE.DirectionalLight { return this.moonLight; }
  getMoonPhaseLight(): THREE.DirectionalLight { return this.moonPhaseLight; }
  getAmbientIntensity(): number { return this.ambientLight.intensity; }
  getFogColor(): THREE.Color { return new THREE.Color(ENV_CONFIG.fog.dayColor); }
  getLightingState(): any { return { sunElevation: this._sinElevation }; }

  update(_dt: number): void { }
}
