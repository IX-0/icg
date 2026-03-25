import * as THREE from 'three';
import PlatformManager from './PlatformManager';
import PortalSystem from './PortalSystem';
import EnvironmentManager from './EnvironmentManager';
import InteractionManager from './InteractionManager';
import LightingSystem from './LightingSystem';
import WaterSystem from './WaterSystem';
import GameState from '../state/GameState';
import Player from '../player/Player';
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

    this.lighting = new LightingSystem(scene);
    this.lighting.setSunTime(14); 

    this.water = new WaterSystem(scene);
    this.water.create(this.lighting.getSunPosition());

    this.environment = new EnvironmentManager(scene, camera);
    this.environment.setup(this.lighting);

    this.platformManager = new PlatformManager(scene, gameState);
    this.portalSystem = new PortalSystem(scene, camera);

    this.interaction = new InteractionManager(camera);

    this.loadPlatform(0);

    this.portalSystem.addPortalPair(
      new THREE.Vector3(10, 3.5, 0), new THREE.Euler(0, -Math.PI / 2, 0), PORTAL_CONFIG.colorA,
      new THREE.Vector3(-10, 3.5, 0), new THREE.Euler(0, Math.PI / 2, 0), PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height
    );
  }

  public loadPlatform(platformIndex: number) {
    this.platformManager.clearPlatforms();
    const platform = this.platformManager.createPlatform(platformIndex);
    this.currentPlatform = platform;
    return platform;
  }

  public transitionPlatform(nextPlatformIndex: number): void {
    this.loadPlatform(nextPlatformIndex);
  }

  public initPhysics(): void {
    this.platformManager.initPhysics();
    this.portalSystem.initPhysics();
  }

  public update(deltaTime: number, player: Player, grabbables: any[] = []): void {
    this.water.update(deltaTime);
    if (player) {
      this.portalSystem.update(player, grabbables);
    }
  }

  public getCurrentPlatform() { return this.currentPlatform; }
  public getEnvironment() { return this.environment; }
}
