import * as THREE from 'three';
import PlatformFactory, { PlatformConfig } from '../platforms/PlatformFactory';
import GameState from '../state/GameState';
import { physicsSystem } from '../engine/PhysicsSystem';
import type RAPIER from '@dimforge/rapier3d-compat';

export default class PlatformManager {
  scene: THREE.Scene;
  gameState: GameState;
  factory: PlatformFactory;
  activePlatforms: THREE.Object3D[] = [];
  activeColliders: RAPIER.Collider[] = [];

  constructor(scene: THREE.Scene, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.factory = new PlatformFactory();
  }

  createPlatform(platformIndex: number) {
    if (platformIndex < 0 || platformIndex >= 9) {
      console.error(`Invalid platform index: ${platformIndex}`);
      return null;
    }

    const typeIndex = platformIndex % 3;
    const variationIndex = Math.floor(platformIndex / 3);

    const platformConfig: PlatformConfig = {
      index: platformIndex,
      type: (['gravel', 'sand', 'volcanic'] as const)[typeIndex],
      variation: variationIndex,
      size: 22,
      height: 8.0,
    };

    // runtime stub: create a simple box as platform and a button object
    const platformMesh = this.factory.createPlatformMesh(platformConfig);
    platformMesh.position.y = -platformConfig.height / 2;
    this.scene.add(platformMesh);
    this.activePlatforms.push(platformMesh);

    // If physics is already running, initialize the meshes right away
    if (physicsSystem.world) {
      this.initPhysics();
    }

    return { mesh: platformMesh, config: platformConfig };
  }

  initPhysics() {
    // Only add colliders if they haven't been added yet for the current set
    if (this.activeColliders.length > 0) return;

    this.activePlatforms.forEach(obj => {
      // Create static trimeshes for the platforms and props
      // Button is small, but let's make it static too for now
      if (obj instanceof THREE.Mesh) {
        const collider = physicsSystem.addStaticTrimesh(obj);
        this.activeColliders.push(collider);
      }
    });
  }

  clearPlatforms() {
    this.activePlatforms.forEach((obj) => {
      this.scene.remove(obj);
      // dispose geometry/material if present
      const anyObj: any = obj;
      if (anyObj.geometry) anyObj.geometry.dispose();
      if (anyObj.material) {
        if (Array.isArray(anyObj.material)) anyObj.material.forEach((m: any) => m.dispose());
        else anyObj.material.dispose();
      }
    });
    this.activePlatforms = [];

    this.activeColliders.forEach(c => physicsSystem.removeCollider(c));
    this.activeColliders = [];
  }

  getActivePlatform(): THREE.Object3D | null {
    return this.activePlatforms.length > 0 ? this.activePlatforms[0] : null;
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return this.activePlatforms.filter((obj) => (obj as any).userData?.interactive === true);
  }
}
