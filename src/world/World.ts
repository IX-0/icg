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
import { physicsSystem } from '../engine/PhysicsSystem';
import PuzzleManager from './PuzzleManager';
import { SequentialPuzzle } from '../puzzles/SequentialPuzzle';
import { TorchExplorationStage, TorchPositioningStage, TorchRiteStage } from '../puzzles/TorchRitualPuzzle';
import Lighter from '../objects/Lighter';
import TikiTorch from '../objects/TikiTorch';
import TriggerZone from './TriggerZone';

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
  puzzleManager: PuzzleManager;
  private activeZones: TriggerZone[] = [];
  private puzzleObjects: any[] = [];

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
    this.puzzleManager = new PuzzleManager();
 
    this.interaction = new InteractionManager(camera);

    this.loadPlatform(0);
  }

  public loadPlatform(platformIndex: number) {
    this.platformManager.clearPlatforms();
    
    // Clear previous puzzle objects
    this.puzzleObjects.forEach(obj => {
      this.scene.remove(obj.mesh);
      this.interaction.unregisterInteractive(obj.mesh);
    });
    this.activeZones.forEach(z => this.scene.remove(z.mesh));

    const platform = this.platformManager.createPlatform(platformIndex);
    this.currentPlatform = platform;
    this.activeZones = [];
    this.puzzleObjects = [];
    
    if (platformIndex === 0) {
      this._setupTorchRitual();
    }
    
    return platform;
  }
 
  private _setupTorchRitual(): void {
    const platform = this.currentPlatform;
    if (!platform) return;

    // 1. Create 3 Sockets (TriggerZones)
    const zones: TriggerZone[] = [
      this.platformManager.factory.createTriggerZone(new THREE.Vector3(-8, 1.0, -8), 2.5, 0x00ffaa),
      this.platformManager.factory.createTriggerZone(new THREE.Vector3(8, 1.0, -8), 2.5, 0x00ffaa),
      this.platformManager.factory.createTriggerZone(new THREE.Vector3(0, 1.0, -12), 2.5, 0x00ffaa)
    ];
    zones.forEach(z => {
      this.scene.add(z.mesh);
      this.activeZones.push(z);
    });
 
    // 2. Spawn 3 initial Torches on the ground to be moved
    for (let i = 0; i < 3; i++) {
      const torch = new TikiTorch();
      torch.mesh.position.set(-5 + i * 5, 1.1, 0);
      this.scene.add(torch.mesh);
      this.platformManager.activePlatforms.push(torch.mesh);
      this.puzzleObjects.push(torch);
      this.interaction.registerInteractive(torch.mesh);
      // We'll need to call initPhysics later if not running, but World handles it
    }

    // 3. Create the Puzzle Stages
    const stage1 = new TorchExplorationStage(() => {}); 
    const stage2 = new TorchPositioningStage(zones);
    const stage3 = new TorchRiteStage(zones);

    // 4. Create the Chest with the Lighter inside
    const chest = this.platformManager.factory.createChest(new THREE.Vector3(0, 0, 8), 'lighter');
    chest.onOpen = () => {
      const lighter = new Lighter();
      lighter.mesh.position.set(0, 1.0, 8); // spawn above chest
      this.scene.add(lighter.mesh);
      this.puzzleObjects.push(lighter);
      this.interaction.registerInteractive(lighter.mesh);
      lighter.initPhysics();
      stage1.setFinished(); // completes exploration
    };
    this.scene.add(chest.mesh);
    this.puzzleObjects.push(chest);
    this.interaction.registerInteractive(chest.mesh);
    // REMOVED: chest.initPhysics(); 
    // This is now handled globally in this.initPhysics() after Rapier is ready.

    const puzzle = new SequentialPuzzle('torch-ritual', [stage1, stage2, stage3]);
    puzzle.onAllStagesComplete = () => {
      console.log('Torch Ritual Complete! Spawning Portal...');
      this.portalSystem.addPortalPair(
        new THREE.Vector3(0, 3.0, -15), new THREE.Euler(0, 0, 0), PORTAL_CONFIG.colorA,
        new THREE.Vector3(80, 3.0, 0), new THREE.Euler(0, Math.PI/2, 0), PORTAL_CONFIG.colorB,
        PORTAL_CONFIG.width, PORTAL_CONFIG.height,
        (isPlayer) => {
          if (isPlayer) {
            console.log('Player traversed the ritual portal!');
            // Optional: this.portalSystem.clearPortals(); or transition
          }
        }
      );
    };

    this.puzzleManager.setActivePuzzle(puzzle);
  }

  public transitionPlatform(nextPlatformIndex: number): void {
    this.loadPlatform(nextPlatformIndex);
  }

  public initPhysics(): void {
    this.platformManager.initPhysics();
    this.portalSystem.initPhysics();
    // Re-init for puzzle objects
    this.puzzleObjects.forEach(obj => {
       if (obj.initPhysics) obj.initPhysics();
    });
  }

  public update(deltaTime: number, player: Player, grabbables: any[] = []): void {
    this.water.update(deltaTime);
    if (player) {
      const allGrabbables = [...grabbables, ...this.puzzleObjects.filter(o => o.isHeld !== undefined)];
      this.portalSystem.updateSystem(player, allGrabbables);
      this.puzzleManager.update(deltaTime);
      
      this.puzzleObjects.forEach(obj => obj.update(deltaTime));
      this.activeZones.forEach(z => {
        z.setTrackedObjects(allGrabbables.map(g => g.mesh));
        z.update(deltaTime);
      });
    }
  }

  public getCurrentPlatform() { return this.currentPlatform; }
  public getEnvironment() { return this.environment; }
}
