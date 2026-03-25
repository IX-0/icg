import * as THREE from 'three';
import { IUpdatable } from '../interfaces/IUpdatable';

/**
 * A spatial zone that detects if objects are within its radius and optionally
 * checks for specific component states (e.g., if a TikiTorch is lit).
 */
export default class TriggerZone implements IUpdatable {
  public mesh: THREE.Mesh;
  public radius: number;
  
  private _isActive: boolean = false;
  private _detectedObjects: THREE.Object3D[] = [];
  private _trackedObjects: THREE.Object3D[] = [];

  constructor(position: THREE.Vector3, radius: number = 2.0, color: number = 0x00ff00) {
    this.radius = radius;
    
    // Debug helper visualization (usually invisible in final game)
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.1,
      wireframe: true 
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
  }

  /**
   * Checks if ANY object of a certain type is currently in the zone.
   */
  public hasObject(predicate: (obj: THREE.Object3D) => boolean): boolean {
    return this._detectedObjects.some(predicate);
  }

  /**
   * Checks if a specific object instance is in the zone.
   */
  public isInside(obj: THREE.Object3D): boolean {
    const dist = this.mesh.position.distanceTo(obj.position);
    return dist <= this.radius;
  }

  public setTrackedObjects(objs: THREE.Object3D[]): void {
    this._trackedObjects = objs;
  }

  /**
   * Updates the list of detected objects from the provided source.
   */
  public update(_dt: number): void {
    this._detectedObjects = this._trackedObjects.filter(obj => {
      // Use world position for accurate detection
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      return worldPos.distanceTo(this.mesh.position) <= this.radius;
    });
  }

  public get detectedObjects(): THREE.Object3D[] {
    return this._detectedObjects;
  }
}
