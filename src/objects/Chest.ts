import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IGrabbable } from '../interfaces/IGrabbable';
import { physicsSystem } from '../engine/PhysicsSystem';
import Player from '../player/Player';

/**
 * A container that can be opened to reveal an item.
 */
export default class Chest extends Interactable {
  public mesh: THREE.Group;
  private lid: THREE.Group;
  private isOpen: boolean = false;
  private isOpening: boolean = false;
  private openProgress: number = 0;
  
  private contents: any | null = null;
  private spawnedItem: boolean = false;

  /** Callback when the chest is opened. */
  public onOpen?: (item: any) => void;

  constructor(contents: any = null) {
    super();
    this.contents = contents;
    this.mesh = new THREE.Group();
    
    // Base
    const baseGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    this.mesh.add(base);

    // Lid
    this.lid = new THREE.Group();
    const lidGeo = new THREE.BoxGeometry(1.25, 0.2, 0.85);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.z = -0.425; // pivot at back
    lidMesh.position.y = 0.1;
    this.lid.add(lidMesh);
    
    this.lid.position.y = 0.6;
    this.lid.position.z = 0.425;
    this.mesh.add(this.lid);

    this.mesh.userData = { interactable: true, instance: this };
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Fixed collider for the chest base
    physicsSystem.addFixedPrimitive(this.mesh, 'box', [0.6, 0.3, 0.4]);
  }

  public onInteract(_player: Player, _heldItem: IGrabbable | null): void {
    if (this.isOpen || this.isOpening) return;
    this.isOpening = true;
  }

  public update(dt: number): void {
    if (this.isOpening) {
      this.openProgress += dt * 2; // Open in 0.5s
      if (this.openProgress >= 1) {
        this.openProgress = 1;
        this.isOpening = false;
        this.isOpen = true;
        this._onFullyOpen();
      }
      this.lid.rotation.x = -this.openProgress * Math.PI * 0.6;
    }
  }

  public setOpen(open: boolean, immediate: boolean = false): void {
    this.isOpen = open;
    if (immediate) {
      this.openProgress = open ? 1 : 0;
      this.isOpening = false;
      this.lid.rotation.x = -this.openProgress * Math.PI * 0.6;
      if (open) this.spawnedItem = true;
    } else if (open && !this.isOpening) {
      this.isOpening = true;
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  private _onFullyOpen(): void {
    if (this.spawnedItem || !this.contents) return;
    this.isOpen = true; // Ensure it's marked as open
    this.spawnedItem = true;
    if (this.onOpen) this.onOpen(this.contents);
  }
}
