import * as THREE from 'three';
// @ts-ignore
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
// @ts-ignore
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ENV_CONFIG, resetEnvConfig, INITIAL_ENV_CONFIG } from '../config/EnvironmentConfig';
import { PHYSICS_CONFIG, resetPhysicsConfig } from '../config/PhysicsConfig';
import { PORTAL_CONFIG, resetPortalConfig } from '../config/PortalConfig';
import { PLAYER_CONFIG, resetPlayerConfig } from '../config/PlayerConfig';
import { IGameController } from '../interfaces/IGameController';
import { IUpdatable } from '../interfaces/IUpdatable';
 
export default class UIManager implements IUpdatable {
  private gui: GUI;
  private stats: Stats;
  private msLabel: HTMLDivElement;
  private objectiveLabel: HTMLDivElement;

  // Callbacks
  public onTimeChange?: (h: number) => void;
  public onPauseToggle?: (paused: boolean) => void;
  public onTimeSpeedChange?: (speed: number) => void;
  public onMoonPhaseChange?: (phase: string) => void;
  /** Called when star parameters change. */
  public onStarsChange?: () => void;
  /** Called whenever any ENV_CONFIG value changes. GameEngine re-applies automatically each frame. */
  public onConfigChange?: () => void;

  // Internal state for time controls (mirrored into ENV_CONFIG on change)
  public guiState = {
    timeOfDay: ENV_CONFIG.time.startHour,
    pauseTime: false,
    moonPhase: 'Cycle',
    spawnObjectType: 'torch',
    debug: {
      axes: false,
      grid: false,
      sunHelper: false,
      moonHelper: false,
      shadowHelper: false,
    },
    reset: () => {
      resetEnvConfig();
      resetPhysicsConfig();
      resetPortalConfig();
      resetPlayerConfig();
      // Restore mirrored state
      this.guiState.timeOfDay = INITIAL_ENV_CONFIG.time.startHour;
      this.guiState.pauseTime = false;
      this.guiState.moonPhase = 'Cycle';

      // Reset debug helpers
      Object.keys(this.guiState.debug).forEach(key => {
        (this.guiState.debug as any)[key] = false;
        this.gameController.toggleDebug(key, false);
      });

      this.refreshDisplay();

      // Trigger callbacks for mirrored state
      if (this.onTimeChange) this.onTimeChange(this.guiState.timeOfDay);
      if (this.onPauseToggle) this.onPauseToggle(this.guiState.pauseTime);
      if (this.onMoonPhaseChange) this.onMoonPhaseChange(this.guiState.moonPhase);
      if (this.onTimeSpeedChange) this.onTimeSpeedChange(ENV_CONFIG.time.speed);
      if (this.onStarsChange) this.onStarsChange();

      this._cfg();
    }
  };

  constructor(_renderer: THREE.WebGLRenderer, private gameController: IGameController) {
    this.gui = new GUI({ title: 'Settings' });
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    this.msLabel = document.createElement('div');
    Object.assign(this.msLabel.style, {
      position: 'absolute',
      top: '0px',
      left: '82px',
      padding: '4px 8px',
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#0ff',
      background: 'rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      zIndex: '10000',
    });
    this.msLabel.innerText = '0.00 ms';
    document.body.appendChild(this.msLabel);

    this.objectiveLabel = document.createElement('div');
    Object.assign(this.objectiveLabel.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 25px',
      fontFamily: "'Cinzel', serif",
      fontSize: '18px',
      color: '#fff',
      background: 'rgba(0, 5, 20, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(80, 140, 220, 0.3)',
      borderRadius: '4px',
      letterSpacing: '2px',
      textShadow: '0 0 10px rgba(0, 150, 255, 0.5)',
      pointerEvents: 'none',
      zIndex: '200',
      display: 'none',
      textAlign: 'center'
    });
    document.body.appendChild(this.objectiveLabel);

    this._setupGUI();
  }

  private _cfg(): void {
    if (this.onConfigChange) this.onConfigChange();
  }

  public updateObjective(text: string): void {
    if (text) {
      this.objectiveLabel.innerText = text;
      this.objectiveLabel.style.display = 'block';
    } else {
      this.objectiveLabel.style.display = 'none';
    }
  }

  private _setupGUI(): void {
    const gui = this.gui;

    gui.add(this.guiState, 'reset').name('Reset to Defaults');

    // ── Environment Folder ─────────────────────────────────────────────
    const env = gui.addFolder('Environment');

    // Time
    const timeFolder = env.addFolder('Time');
    timeFolder.add(this.guiState, 'timeOfDay', 0, 24, 0.01).name('Hour').listen().onChange((v: number) => { if (this.onTimeChange) this.onTimeChange(v); });
    timeFolder.add(this.guiState, 'pauseTime').name('Pause').onChange((v: boolean) => { if (this.onPauseToggle) this.onPauseToggle(v); });
    timeFolder.add(ENV_CONFIG.time, 'speed', 0, 5, 0.001).name('Speed (h/s)').onChange((v: number) => { if (this.onTimeSpeedChange) this.onTimeSpeedChange(v); });
    timeFolder.add(ENV_CONFIG.time, 'lunarCycleDays', 1, 30, 1).name('Lunar Cycle (days)').onChange(() => this._cfg());
    timeFolder.add(this.guiState, 'moonPhase', ['Cycle', 'New', 'Crescent', 'Quarter', 'Full']).name('Moon Phase Override').onChange((v: string) => { if (this.onMoonPhaseChange) this.onMoonPhaseChange(v); });
    timeFolder.close();

    // Sun
    const sunFolder = env.addFolder('Sun');
    sunFolder.add(ENV_CONFIG.sun, 'maxIntensity', 0, 5, 0.01).name('Max Intensity').onChange(() => this._cfg());
    sunFolder.add(ENV_CONFIG.sun, 'orbitRadius', 50, 500, 1).name('Orbit Radius').onChange(() => this._cfg());
    sunFolder.add(ENV_CONFIG.sun, 'orbitTilt', -1, 1, 0.01).name('Orbit Tilt (Z)').onChange(() => this._cfg());
    sunFolder.close();

    // Moon
    const moonFolder = env.addFolder('Moon');
    moonFolder.add(ENV_CONFIG.moon, 'fixedAngleDeg', 0, 360, 1).name('Fixed Angle (°)').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'orbitTilt', -1, 1, 0.01).name('Orbit Tilt (Z)').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'lightIntensity', 0, 3, 0.01).name('Light Intensity').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'phaseLightIntensity', 0, 3, 0.01).name('Phase Light').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'glowBaseSize', 50, 600, 1).name('Glow Base Size').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'glowGrowth', 0, 400, 1).name('Glow Growth').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'meshOpacityNight', 0, 1, 0.01).name('Opacity (Night)').onChange(() => this._cfg());
    moonFolder.add(ENV_CONFIG.moon, 'meshOpacityDay', 0, 1, 0.01).name('Opacity (Day)').onChange(() => this._cfg());
    moonFolder.close();

    // Helpers for Colors
    const addRGB = (folder: GUI, arr: number[], label: string) => {
      const obj = { r: arr[0], g: arr[1], b: arr[2] };
      folder.add(obj, 'r', 0, 1, 0.01).name(`${label} R`).onChange((v: number) => { arr[0] = v; this._cfg(); });
      folder.add(obj, 'g', 0, 1, 0.01).name(`${label} G`).onChange((v: number) => { arr[1] = v; this._cfg(); });
      folder.add(obj, 'b', 0, 1, 0.01).name(`${label} B`).onChange((v: number) => { arr[2] = v; this._cfg(); });
    };

    // Ambient
    const ambFolder = env.addFolder('Ambient');
    ambFolder.add(ENV_CONFIG.ambient, 'intensity', 0, 3, 0.01).name('Intensity').onChange(() => this._cfg());
    addRGB(ambFolder, ENV_CONFIG.ambient.dayColor, 'Day');
    addRGB(ambFolder, ENV_CONFIG.ambient.nightColor, 'Night');
    addRGB(ambFolder, ENV_CONFIG.ambient.sunsetColor, 'Sunset');
    ambFolder.close();

    // Hemisphere
    const hemiFolder = env.addFolder('Hemisphere');
    hemiFolder.add(ENV_CONFIG.hemisphere, 'intensity', 0, 3, 0.01).name('Intensity').onChange(() => this._cfg());
    addRGB(hemiFolder, ENV_CONFIG.hemisphere.daySkyColor, 'Day Sky');
    addRGB(hemiFolder, ENV_CONFIG.hemisphere.dayGroundColor, 'Day Ground');
    addRGB(hemiFolder, ENV_CONFIG.hemisphere.nightSkyColor, 'Night Sky');
    addRGB(hemiFolder, ENV_CONFIG.hemisphere.nightGroundColor, 'Night Ground');
    hemiFolder.close();

    // Atmosphere
    const atmFolder = env.addFolder('Atmosphere');
    const a = ENV_CONFIG.atmosphere;
    atmFolder.add(a, 'turbidityDay', 0, 10, 0.01).name('Turbidity Day').onChange(() => this._cfg());
    atmFolder.add(a, 'turbidityNight', 0, 10, 0.01).name('Turbidity Night').onChange(() => this._cfg());
    atmFolder.add(a, 'rayleighDay', 0, 4, 0.01).name('Rayleigh Day').onChange(() => this._cfg());
    atmFolder.add(a, 'rayleighNight', 0, 4, 0.01).name('Rayleigh Night').onChange(() => this._cfg());
    atmFolder.add(a, 'mieCoeffDay', 0, 0.1, 0.0001).name('Mie Coeff Day').onChange(() => this._cfg());
    atmFolder.add(a, 'mieCoeffNight', 0, 0.1, 0.0001).name('Mie Coeff Night').onChange(() => this._cfg());
    atmFolder.add(a, 'mieGDay', 0.9, 1.0, 0.001).name('Mie G Day').onChange(() => this._cfg());
    atmFolder.add(a, 'mieGNight', 0.9, 1.0, 0.001).name('Mie G Night').onChange(() => this._cfg());
    atmFolder.close();

    // Fog
    const fogFolder = env.addFolder('Fog');
    fogFolder.add(ENV_CONFIG.fog, 'dayDensity', 0, 0.01, 0.00001).name('Day Density').onChange(() => this._cfg());
    fogFolder.add(ENV_CONFIG.fog, 'nightDensity', 0, 0.01, 0.00001).name('Night Density').onChange(() => this._cfg());
    fogFolder.close();

    // Stars
    const starsFolder = env.addFolder('Stars');
    const _s = () => { if (this.onStarsChange) this.onStarsChange(); this._cfg(); };
    const small = starsFolder.addFolder('Small');
    small.add(ENV_CONFIG.stars, 'smallCount', 0, 5000, 10).name('Count').onChange(_s);
    small.add(ENV_CONFIG.stars, 'smallSize', 0.1, 5, 0.1).name('Size').onChange(_s);
    small.add(ENV_CONFIG.stars, 'smallBrightness', 0, 1, 0.01).name('Brightness').onChange(_s);
    const med = starsFolder.addFolder('Medium');
    med.add(ENV_CONFIG.stars, 'mediumCount', 0, 2000, 5).name('Count').onChange(_s);
    med.add(ENV_CONFIG.stars, 'mediumSize', 0.5, 10, 0.1).name('Size').onChange(_s);
    med.add(ENV_CONFIG.stars, 'mediumBrightness', 0, 1, 0.01).name('Brightness').onChange(_s);
    const large = starsFolder.addFolder('Large');
    large.add(ENV_CONFIG.stars, 'largeCount', 0, 500, 1).name('Count').onChange(_s);
    large.add(ENV_CONFIG.stars, 'largeSize', 1, 25, 0.1).name('Size').onChange(_s);
    large.add(ENV_CONFIG.stars, 'largeBrightness', 0, 1, 0.01).name('Brightness').onChange(_s);
    starsFolder.add(ENV_CONFIG.stars, 'sphereRadius', 500, 4000, 10).name('Sphere Radius').onChange(_s);
    starsFolder.close();

    // Tone Mapping
    const tmFolder = env.addFolder('Tone Mapping');
    tmFolder.add(ENV_CONFIG.toneMapping, 'nightExposure', 0, 3, 0.01).name('Night Exposure').onChange(() => this._cfg());
    tmFolder.close();

    env.close();


    const physicsFolder = gui.addFolder('Physics');
    physicsFolder.add(PHYSICS_CONFIG, 'gravity', 0, 50, 1).name('Gravity');
    physicsFolder.add(PHYSICS_CONFIG, 'friction', 0, 10, 0.1).name('Friction');
    physicsFolder.add(PHYSICS_CONFIG, 'throwForce', 0, 10, 0.5).name('Throw Force');
    physicsFolder.close();

    // ── Player Folder ─────────────────────────────────────────────
    const playerFolder = gui.addFolder('Player');
    playerFolder.add(PLAYER_CONFIG, 'fov', 30, 120, 1).name('FOV').onChange((v: number) => {
      this.gameController.player.camera.fov = v;
      this.gameController.player.camera.updateProjectionMatrix();
    });
    playerFolder.add(PLAYER_CONFIG, 'moveSpeed', 1, 20, 0.5).name('Move Speed');
    playerFolder.add(PLAYER_CONFIG, 'jumpForce', 1, 20, 0.5).name('Jump Force');
    playerFolder.add(PLAYER_CONFIG, 'warpDuration', 0, 2, 0.05).name('Warp Duration');
    playerFolder.close();

    // ── Objects Folder ────────────────────────────────────────────────
    const objects = gui.addFolder("Objects");

    // Portals
    objects.add(PORTAL_CONFIG, 'width', 1, 10, 0.1).name('Portal Width');
    objects.add(PORTAL_CONFIG, 'height', 1, 15, 0.1).name('Portal Height');
    
    const portalTuning = objects.addFolder('Portal Tuning');
    portalTuning.add(PORTAL_CONFIG, 'teleportThreshold', 0, 1, 0.01).name('TP Threshold');
    portalTuning.add(PORTAL_CONFIG, 'exitNudge', 0, 2, 0.01).name('Exit Nudge');
    portalTuning.add(PORTAL_CONFIG, 'cullingDistance', 10, 500, 1).name('Culling Dist');
    
    const rendering = portalTuning.addFolder('Rendering');
    rendering.add(PORTAL_CONFIG, 'renderMinDist', 0.1, 5, 0.1).name('Min Res Dist');
    rendering.add(PORTAL_CONFIG, 'renderMaxDist', 5, 50, 1).name('Max Res Dist');
    rendering.add(PORTAL_CONFIG, 'minResolution', 128, 2048, 128).name('Min Res');
    rendering.add(PORTAL_CONFIG, 'maxResolution', 512, 4096, 512).name('Max Res');
    portalTuning.close();

    objects.add({ spawn: () => { this.gameController.spawnPortalPair(); } }, 'spawn').name('Spawn Portal Pair');

    // Props
    objects.add(this.guiState, 'spawnObjectType', {
      'Tiki Torch': 'torch',
      'Lighter': 'lighter',
      'Water Bucket': 'bucket',
      'Chest': 'chest'
    }).name('Item to Spawn');

    objects.add({
      spawnObj: () => {
        this.gameController.spawnObject(this.guiState.spawnObjectType);
      }
    }, 'spawnObj').name('Spawn Item');

    objects.close();


    // ── Debugging Folder ───────────────────────────────────────────────
    const debug = gui.addFolder('Debugging');
    const _d = (item: string) => (val: boolean) => { this.gameController.toggleDebug(item, val); };

    debug.add(this.guiState.debug, 'axes').name('Axes Helper').onChange(_d('axes'));
    debug.add(this.guiState.debug, 'grid').name('Grid Helper').onChange(_d('grid'));
    debug.add(this.guiState.debug, 'sunHelper').name('Sun Helper').onChange(_d('sunHelper'));
    debug.add(this.guiState.debug, 'moonHelper').name('Moon Helper').onChange(_d('moonHelper'));
    debug.add(this.guiState.debug, 'shadowHelper').name('Shadow Helper').onChange(_d('shadowHelper'));

    debug.close();
  }

  public refreshDisplay(): void {
    const refresh = (g: any) => {
      g.controllers.forEach((c: any) => c.updateDisplay());
      g.folders.forEach((f: any) => refresh(f));
    };
    refresh(this.gui);
  }

  public update(dt: number): void {
    this.stats.update();
    this.msLabel.innerText = `${(dt * 1000).toFixed(2)} ms`;
  }
 
  updateStats(): void { this.stats.update(); }
 
  updateFrameTime(dt: number): void {
    this.msLabel.innerText = `${(dt * 1000).toFixed(2)} ms`;
  }

  setVisible(visible: boolean): void {
    this.gui.domElement.style.display = visible ? 'block' : 'none';
    this.stats.dom.style.display = visible ? 'block' : 'none';
    this.msLabel.style.display = visible ? 'block' : 'none';
  }

  updateHUD(h: number): void {
    this.guiState.timeOfDay = h;
  }
}
