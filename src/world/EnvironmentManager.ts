import * as THREE from 'three';
// @ts-ignore
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import LightingSystem from './LightingSystem';
import { ENV_CONFIG } from '../config/EnvironmentConfig';

export default class EnvironmentManager {
  scene: THREE.Scene;
  sky: any;
  lighting: LightingSystem | null = null;

  private moonMesh: THREE.Mesh;
  private moonGlowSprite: THREE.Sprite;

  // Three tiers of stars for varied, uneven sizes
  private starTiers: THREE.Points[] = [];
  private currentMoonPhase: string = 'Cycle';

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;

    const cfg = ENV_CONFIG;

    // ── Moon ──────────────────────────────────────────────────────────────
    const moonTex = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/planets/moon_1024.jpg'
    );
    const moonGeo = new THREE.SphereGeometry(cfg.moon.meshRadius, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0x222222,
      transparent: true,
      opacity: 0.9,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.layers.set(2); // EXCLUSIVE Phase Light Layer
    this.moonMesh.visible = false;
    scene.add(this.moonMesh);

    const glowMat = new THREE.SpriteMaterial({
      map: _makeGlowTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.moonGlowSprite = new THREE.Sprite(glowMat);
    this.moonGlowSprite.layers.enable(1);
    this.moonGlowSprite.layers.enable(2);
    this.moonGlowSprite.visible = false;
    scene.add(this.moonGlowSprite);

    // ── Stars ───────────────────────────────────
    const s = cfg.stars;
    this.starTiers.push(_makeStarTier(s.smallCount,  s.smallSize,  s.smallBrightness,  scene));
    this.starTiers.push(_makeStarTier(s.mediumCount, s.mediumSize, s.mediumBrightness, scene));
    this.starTiers.push(_makeStarTier(s.largeCount,  s.largeSize,  s.largeBrightness,  scene));
  }

  setup(lighting: LightingSystem): void {
    this.lighting = lighting;
    this.scene.fog = new THREE.FogExp2(ENV_CONFIG.fog.dayColor, ENV_CONFIG.fog.dayDensity);
    this.scene.background = null;

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    this._applySkyParams(0);
    this._applySunToSky();
  }

  public setMoonPhase(phase: string): void {
    this.currentMoonPhase = phase;
  }

  private _applySkyParams(nightFactor: number): void {
    if (!this.sky) return;
    const u = this.sky.material.uniforms;
    const a = ENV_CONFIG.atmosphere;
    u['turbidity'].value      = THREE.MathUtils.lerp(a.turbidityDay,   a.turbidityNight,  nightFactor);
    u['rayleigh'].value        = THREE.MathUtils.lerp(a.rayleighDay,    a.rayleighNight,   nightFactor);
    u['mieCoefficient'].value  = THREE.MathUtils.lerp(a.mieCoeffDay,    a.mieCoeffNight,   nightFactor);
    u['mieDirectionalG'].value = THREE.MathUtils.lerp(a.mieGDay,        a.mieGNight,       nightFactor);
  }

  private _applySunToSky(): void {
    if (!this.sky || !this.lighting) return;
    this.sky.material.uniforms['sunPosition'].value.copy(this.lighting.getSunDirection());
  }

  updateSky(): void {
    this._applySunToSky();
  }

  updateMoon(moonDir: THREE.Vector3, cameraPos: THREE.Vector3, nightFactor: number): void {
    this._applySkyParams(nightFactor);

    const cfg = ENV_CONFIG;

    if (this.scene.fog) {
      const fog = this.scene.fog as THREE.FogExp2;
      fog.color.lerpColors(
        new THREE.Color(cfg.fog.dayColor),
        new THREE.Color(cfg.fog.nightColor),
        nightFactor
      );
      fog.density = THREE.MathUtils.lerp(cfg.fog.dayDensity, cfg.fog.nightDensity, nightFactor);
    }

    // Moon at 800 units in the moon direction
    const moonNorm = moonDir.clone().normalize();
    const moonPos  = cameraPos.clone().addScaledVector(moonNorm, 800);
    this.moonMesh.position.copy(moonPos);
    this.moonGlowSprite.position.copy(moonPos);

    // --- PHASE LOGIC ---
    const l = this.lighting as any;
    if (l && l.moonPhaseLight) {
      const moonPhaseLight = l.moonPhaseLight as THREE.DirectionalLight;

      let phaseAngle = 0;
      if (this.currentMoonPhase === 'Cycle') {
        // Advance phase once per in-game day (lunarCycleDays-day cycle → equal step per day).
        const dayNumber = (l.dayNumber as number) ?? 0;
        phaseAngle = (dayNumber % cfg.time.lunarCycleDays) * (Math.PI * 2 / cfg.time.lunarCycleDays);
      } else {
        switch (this.currentMoonPhase) {
          case 'New':      phaseAngle = Math.PI;        break;
          case 'Crescent': phaseAngle = Math.PI * 0.75; break;
          case 'Quarter':  phaseAngle = Math.PI * 0.5;  break;
          case 'Full':     phaseAngle = 0;               break;
        }
      }

      // Rotate phase light relative to moon position
      const offsetPos = new THREE.Vector3(
        Math.cos(phaseAngle),
        0.3,
        Math.sin(phaseAngle)
      ).normalize().multiplyScalar(150);

      moonPhaseLight.position.copy(moonPos).add(offsetPos);
      moonPhaseLight.target.position.copy(moonPos);
    }

    const mat = this.moonMesh.material as THREE.MeshStandardMaterial;
    mat.emissiveMap = mat.map;
    mat.emissive.setHex(0x000000);
    mat.fog = false;

    this.moonMesh.visible = true;
    this.moonGlowSprite.visible = nightFactor > 0.05;

    if (nightFactor > 0.1) {
      this.moonGlowSprite.material.opacity = nightFactor * 0.75;
      const s = cfg.moon.glowBaseSize + nightFactor * cfg.moon.glowGrowth;
      this.moonGlowSprite.scale.set(s, s, 1);
      mat.transparent = true;
      mat.opacity = cfg.moon.meshOpacityNight;
    } else {
      mat.transparent = true;
      mat.opacity = cfg.moon.meshOpacityDay;
      this.moonGlowSprite.visible = false;
    }

    // ── Update Stars ──────────────────────────────────────────────────────
    const starFade = THREE.MathUtils.clamp((-this.getLightingState().sunElevation + 0.015) * 8, 0, 1);
    const starsVisible = starFade > 0;

    for (const tier of this.starTiers) {
      tier.position.copy(cameraPos);
      tier.rotation.y += 0.00003;
      tier.visible = starsVisible;
      (tier.material as THREE.PointsMaterial).opacity = starFade;
    }
  }

  public rebuildStars(): void {
    this.starTiers.forEach((tier) => {
      this.scene.remove(tier);
      tier.geometry.dispose();
      if (Array.isArray(tier.material)) tier.material.forEach((m) => m.dispose());
      else tier.material.dispose();
    });
    this.starTiers = [];

    const s = ENV_CONFIG.stars;
    this.starTiers.push(_makeStarTier(s.smallCount,  s.smallSize,  s.smallBrightness,  this.scene));
    this.starTiers.push(_makeStarTier(s.mediumCount, s.mediumSize, s.mediumBrightness, this.scene));
    this.starTiers.push(_makeStarTier(s.largeCount,  s.largeSize,  s.largeBrightness,  this.scene));
  }

  triggerWings(_p: THREE.Vector3): void { /* TODO */ }
  update(_dt: number): void { }

  getLightingState(): any { return this.lighting?.getLightingState() ?? {}; }
  getEnvironmentMaterial(): any {
    return { fogColor: (this.scene.fog as THREE.FogExp2)?.color ?? new THREE.Color(ENV_CONFIG.fog.dayColor) };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _makeGlowTexture(): THREE.CanvasTexture {
  const size = 256, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    'rgba(210, 230, 255, 1.0)');
  grad.addColorStop(0.15, 'rgba(170, 205, 255, 0.85)');
  grad.addColorStop(0.40, 'rgba(110, 160, 255, 0.40)');
  grad.addColorStop(0.70, 'rgba( 60, 100, 220, 0.12)');
  grad.addColorStop(1,    'rgba(  0,  20,  80, 0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function _makeStarTier(count: number, size: number, brightness: number, scene: THREE.Scene): THREE.Points {
  const cfg = ENV_CONFIG;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const SR = cfg.stars.sphereRadius;

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const cosEl = Math.random();
    const sinEl = Math.sqrt(1 - cosEl * cosEl);
    pos[i * 3]     = SR * sinEl * Math.cos(theta);
    pos[i * 3 + 1] = SR * cosEl;
    pos[i * 3 + 2] = SR * sinEl * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const dc = document.createElement('canvas');
  dc.width = dc.height = 32;
  const dCtx = dc.getContext('2d')!;
  const dGrad = dCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  dGrad.addColorStop(0,    `rgba(255,255,255,${brightness})`);
  dGrad.addColorStop(0.25, `rgba(230,240,255,${brightness * 0.8})`);
  dGrad.addColorStop(0.6,  `rgba(150,200,255,${brightness * 0.3})`);
  dGrad.addColorStop(1,    'rgba(0,0,0,0)');
  dCtx.fillStyle = dGrad;
  dCtx.fillRect(0, 0, 32, 32);

  const mat = new THREE.PointsMaterial({
    size: size,
    sizeAttenuation: false,
    map: new THREE.CanvasTexture(dc),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    transparent: true,
    opacity: 0,
    color: 0xffffff,
  });

  const points = new THREE.Points(geo, mat);
  points.layers.set(1);
  points.frustumCulled = false;
  scene.add(points);
  return points;
}
