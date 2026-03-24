import * as THREE from 'three';
import PlatformManager from './PlatformManager';
import PortalSystem from './PortalSystem';
import EnvironmentManager from './EnvironmentManager';
import InteractionManager from './InteractionManager';
import LightingSystem from './LightingSystem';
import WaterSystem from './WaterSystem';
import GameState from '../state/GameState';
import { ENV_CONFIG } from '../config/EnvironmentConfig';
import { PORTAL_CONFIG } from '../config/PortalConfig';

export default class World {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gameState: GameState;
  platformManager: PlatformManager;
  portalSystem: PortalSystem;
  environment: EnvironmentManager;
  interaction: InteractionManager;
  lighting: LightingSystem;
  water: WaterSystem;
  currentPlatform: any | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gameState: GameState) {
    this.scene = scene;
    this.camera = camera;
    this.gameState = gameState;

    // ---- Lighting (must come first so sky/water can reference sun) ----
    this.lighting = new LightingSystem(scene);
    this.lighting.setSunTime(14); // Early afternoon by default

    // ---- Water ----
    this.water = new WaterSystem(scene);
    this.water.create(this.lighting.getSunPosition());

    // ---- Sky + Fog ----
    this.environment = new EnvironmentManager(scene, camera);
    this.environment.setup(this.lighting);

    // ---- Platform & portal systems ----
    this.platformManager = new PlatformManager(scene, gameState);
    this.portalSystem = new PortalSystem(scene, camera);

    // ---- Interaction raycasting ----
    this.interaction = new InteractionManager(camera);

    // Load the first platform
    this.loadPlatform(0);

    // ---- Create a starting pair of portals ----
    this.portalSystem.addPortalPair(
      new THREE.Vector3(10, 3.5, 0),    new THREE.Euler(0, -Math.PI/2, 0), PORTAL_CONFIG.colorA,
      new THREE.Vector3(-10, 3.5, 0),   new THREE.Euler(0, Math.PI/2, 0),  PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height
    );
  }

  loadPlatform(platformIndex: number) {
    this.platformManager.clearPlatforms();
    const platform = this.platformManager.createPlatform(platformIndex);
    this.currentPlatform = platform;
    return platform;
  }

  transitionPlatform(nextPlatformIndex: number) {
    this.loadPlatform(nextPlatformIndex);
  }

  update(deltaTime: number, playerPosition: THREE.Vector3, _camera: THREE.Camera, player?: any) {
    this.water.update(deltaTime);
    if (player) {
      this.portalSystem.update(player);
    }
    // Sky / lighting updates are driven by GameEngine directly each frame
  }

  handlePlayerInteraction(_playerPosition: THREE.Vector3, _playerDirection: THREE.Vector3) {
    return null;
  }

  onButtonClick(_buttonObject: THREE.Object3D) { return null; }
  onPortalEnter() { return null; }

  triggerEndgame(_player: any) { /* TODO: wings */ }

  getCurrentPlatform() { return this.currentPlatform; }
  getEnvironment() { return this.environment; }
}
