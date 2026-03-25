import * as THREE from 'three';
import World from '../world/World';
import Player from '../player/Player';
import UIManager from '../ui/UIManager';
import GameState from '../state/GameState';
import { ENV_CONFIG } from '../config/EnvironmentConfig';
import DebugManager from './DebugManager';
import TikiTorch from '../objects/TikiTorch';
import Lighter from '../objects/Lighter';
import WaterBucket from '../objects/WaterBucket';
import Chest from '../objects/Chest';
import Skeleton from '../objects/Skeleton';
import Crown from '../objects/Crown';
import GardeningHoe from '../objects/GardeningHoe';
import { Interactable } from '../objects/Interactable';
import { IGameController } from '../interfaces/IGameController';
import { PORTAL_CONFIG } from '../config/PortalConfig';
import { physicsSystem } from './PhysicsSystem';

export default class GameEngine implements IGameController {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  player: Player;
  ui: UIManager;
  gameState: GameState;
  debugManager: DebugManager;

  private lastTime: number = 0;
  private gameTimeHours: number = ENV_CONFIG.time.startHour;
  private timeSpeed: number = ENV_CONFIG.time.speed;
  private isTimePaused: boolean = false;
  private grabbables: any[] = [];
  private interactables: Interactable[] = [];

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.layers.enable(1);
    this.camera.layers.enable(2);
    this.scene.add(this.camera);

    this.gameState = new GameState();
    this.world = new World(this.scene, this.camera, this.gameState);
    this.player = new Player(this.scene, this.camera, this.renderer.domElement);
    this.ui = new UIManager(this.renderer, this);
    this.debugManager = new DebugManager(this.scene, this.world.lighting);

    // ---- UI Callbacks (Time & Moon) ----
    this.ui.onTimeChange = (h: number) => {
      this.gameTimeHours = h;
      this._updateLighting();
    };
    this.ui.onPauseToggle = (paused: boolean) => {
      this.isTimePaused = paused;
    };
    this.ui.onMoonPhaseChange = (phase: string) => {
      this.world.environment.setMoonPhase(phase);
    };
    this.ui.onTimeSpeedChange = (speed: number) => {
      this.timeSpeed = speed;
    };
    this.ui.onStarsChange = () => {
      this.world.environment.rebuildStars();
    };

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => this._handleStart());
    this.renderer.domElement.addEventListener('click', () => this._handleStart());

    // ---- Resize ----
    window.addEventListener('resize', () => this.onWindowResize());

    this._initInteractions();

    (window as any).gameEngine = this;
  }

  public async init(): Promise<void> {
    await physicsSystem.init();
    // After physics is initialized, let the world init any physics bodies it needs
    this.world.initPhysics();
    this.player.initPhysics();
  }

  public spawnPortalPair(): void {
    // One portal at a time - clear previous
    this.world.portalSystem.clearPortals();

    const p = this.player;
    // Get forward direction on the horizontal plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const posA = p.position.clone().add(forward.clone().multiplyScalar(4));
    const posB = p.position.clone().add(forward.clone().multiplyScalar(12));

    // Face each other on the player's axis
    const rotA = new THREE.Euler(0, p.camera.rotation.y + Math.PI, 0);
    const rotB = new THREE.Euler(0, p.camera.rotation.y, 0);

    // Sit on platform (assumed at Y=0.5)
    const portalY = PORTAL_CONFIG.height / 2 + 0.5;
    posA.y = portalY;
    posB.y = portalY;

    this.world.portalSystem.addPortalPair(
      posA, rotA, PORTAL_CONFIG.colorA,
      posB, rotB, PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height
    );
  }

  public toggleDebug(item: string, visible: boolean): void {
    switch (item) {
      case 'axes': this.debugManager.setAxesVisible(visible); break;
      case 'grid': this.debugManager.setGridVisible(visible); break;
      case 'sunHelper': this.debugManager.setSunHelperVisible(visible); break;
      case 'moonHelper': this.debugManager.setMoonHelperVisible(visible); break;
      case 'shadowHelper': this.debugManager.setShadowHelperVisible(visible); break;
    }
  }

  private _initInteractions(): void {
    // Keep keyboard fallbacks just in case
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyE') this._handleGrabDrop();
      if (e.code === 'KeyF') this._handleUse();
    });

    this.renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.player.getIsLocked()) return;

      if (e.button === 0) { // Left click
        this._handleGrabDrop();
      } else if (e.button === 2) { // Right click
        this._handleUse();
      }
    });

    // Prevent default context menu on right click
    this.renderer.domElement.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }

  private _handleGrabDrop(): void {
    const player = this.player;
    if (player.heldItem) {
      const item = player.heldItem;
      player.drop(); // Player.ts detaches and sets initial world position/velocity

      this.scene.add(item.mesh);
      this.world.interaction.registerInteractive(item.mesh);
    } else {
      const hit = this.world.interaction.raycastFromCamera();
      if (hit) {
        // Traverse up to find grabbable or interactable parent
        let obj: THREE.Object3D | null = hit.object;
        let targetObj: THREE.Object3D | null = null;
        let isGrabbable = false;
        let isInteractable = false;

        while (obj) {
          if (obj.userData?.grabbable) {
            targetObj = obj;
            isGrabbable = true;
            break;
          }
          if (obj.userData?.interactable) {
            targetObj = obj;
            isInteractable = true;
            break;
          }
          obj = obj.parent;
        }

        if (targetObj) {
          const instance = targetObj.userData.instance;
          if (isGrabbable && instance) {
            player.grab(instance);
            this.world.interaction.unregisterInteractive(targetObj);
          } else if (isInteractable && instance) {
            instance.onInteract(player, player.heldItem);
          }
        }
      }
    }
  }

  private _handleUse(): void {
    if (this.player.heldItem) {
      this.player.heldItem.onUse();

      // If holding a lighter or water bucket, check for nearby objects
      if (this.player.heldItem instanceof Lighter || this.player.heldItem instanceof WaterBucket) {
        const hit = this.world.interaction.raycastFromCamera();
        if (hit) {
          // Traverse up for target
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData?.instance instanceof TikiTorch) {
              if (this.player.heldItem instanceof Lighter) {
                this.player.heldItem.tryIgnite(obj);
              } else if (this.player.heldItem instanceof WaterBucket) {
                this.player.heldItem.tryExtinguish(obj);
              }
              break;
            }
            obj = obj.parent;
          }
        }
      }
    }
  }

  public spawnObject(type: string): void {
    if (type === 'chest') {
      const chest = new Chest();
      // position 2 units away, looking flat on the ground
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      else forward.set(0, 0, -1);

      const spawnPos = this.player.position.clone().add(forward.multiplyScalar(2));
      spawnPos.y = 0.5; // ground
      chest.mesh.position.copy(spawnPos);

      // Face player (since normal chest front is Z facing, lookAt point makes its front face that point)
      chest.mesh.lookAt(this.player.position.x, 0.5, this.player.position.z);

      this.scene.add(chest.mesh);
      this.world.interaction.registerInteractive(chest.mesh);
      this.interactables.push(chest);
      chest.initPhysics();
      return;
    }

    else if (type === 'skeleton') {
      const skeleton = new Skeleton();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
      forward.y = 0; forward.normalize();
      const spawnPos = this.player.position.clone().add(forward.multiplyScalar(3));
      spawnPos.y = 0.1;
      skeleton.mesh.position.copy(spawnPos);
      skeleton.mesh.lookAt(this.player.position.x, 0.1, this.player.position.z);
      this.scene.add(skeleton.mesh);
      this.world.interaction.registerInteractive(skeleton.mesh);
      this.interactables.push(skeleton);
      skeleton.initPhysics();
      return;
    }

    let obj: any = null;
    if (type === 'torch') obj = new TikiTorch();
    else if (type === 'lighter') obj = new Lighter();
    else if (type === 'bucket') obj = new WaterBucket();
    else if (type === 'crown') obj = new Crown();
    else if (type === 'hoe') obj = new GardeningHoe();
    if (!obj) return;

    // Spawn 2 units in front of player at height of player
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
    const spawnPos = this.player.camera.position.clone().add(forward.multiplyScalar(2));
    if (type === 'torch') spawnPos.y = 1.1; // Place at ground height
    obj.mesh.position.copy(spawnPos);

    this.scene.add(obj.mesh);
    this.world.interaction.registerInteractive(obj.mesh);
    this.grabbables.push(obj);
    obj.initPhysics();
  }

  private _handleStart(): void {
    // HUD Stats
    const statsHud = document.getElementById('hud-stats');
    if (statsHud) statsHud.style.display = 'block';

    this.renderer.domElement.requestPointerLock();
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  animate(): void {
    requestAnimationFrame((t) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this._update(dt);
      
      if (this.world.portalSystem) {
        this.world.portalSystem.render(this.renderer, this.scene, this.camera, this.world.environment);
      }
      
      this.renderer.render(this.scene, this.camera);

      // Performance Stats & UI update
      this.ui.update(dt);
      this.animate();
    });
  }

  private _update(dt: number): void {
    if (!this.player.getIsLocked()) return; // Pause time and physics

    this.player.update(dt);

    if (!this.isTimePaused) {
      this.gameTimeHours = (this.gameTimeHours + dt * this.timeSpeed) % 24;
    }
    this._updateLighting();

    this.grabbables.forEach(g => g.update(dt));
    this.interactables.forEach(i => i.update(dt));

    this.world.update(dt, this.player, this.grabbables);
    this.debugManager.update(dt);
    this.ui.updateHUD(this.gameTimeHours);
    physicsSystem.update(dt);
  }

  private _updateLighting(): void {
    const l = this.world.lighting;
    const e = this.world.environment;

    l.setSunTime(this.gameTimeHours);
    const nightFactor = l.getNightFactor();

    e.updateSky();
    const moonDir = l.getMoonDirection();
    e.updateMoon(moonDir, this.camera.position, nightFactor);

    this.world.water.updateForLighting(l.getSunPosition());
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      ENV_CONFIG.toneMapping.dayExposure,
      ENV_CONFIG.toneMapping.nightExposure,
      nightFactor
    );
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  transitionToNextPlatform(): void {
    this.gameState.moveToNextPlatform();
    this.world.transitionPlatform(this.gameState.currentPlatformIndex);
  }
}

const PerspectiveCamera = THREE.PerspectiveCamera;
