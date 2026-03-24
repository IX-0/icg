import * as THREE from 'three';
import { Interactable } from './Interactable';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';

export default class Chest extends Interactable {
  public mesh: THREE.Group;
  private lid: THREE.Group;
  
  private isOpen: boolean = false;
  private lidAngle: number = 0;
  private targetAngle: number = 0;

  constructor() {
    super();
    this.mesh = new THREE.Group();

    // Box dimensions
    const width = 1.0;
    const height = 0.6;
    const depth = 0.8;
    const thick = 0.05;

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 }); // Brown wood
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 }); // Darker brown wood

    // Create hollow base using thin box meshes
    const base = new THREE.Group();
    
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), baseMat);
    bottom.position.y = thick / 2;
    base.add(bottom);

    const front = new THREE.Mesh(new THREE.BoxGeometry(width, height, thick), baseMat);
    front.position.set(0, height / 2, depth / 2 - thick / 2);
    base.add(front);

    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, thick), baseMat);
    back.position.set(0, height / 2, -depth / 2 + thick / 2);
    base.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth - thick * 2), baseMat);
    left.position.set(-width / 2 + thick / 2, height / 2, 0);
    base.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth - thick * 2), baseMat);
    right.position.set(width / 2 - thick / 2, height / 2, 0);
    base.add(right);

    this.mesh.add(base);

    // Lid hinge mechanism
    this.lid = new THREE.Group();
    this.lid.position.set(0, height, -depth / 2 + thick / 2); // Hinge at the back-top inside
    
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), lidMat);
    lidMesh.position.set(0, thick / 2, depth / 2 - thick / 2); 
    this.lid.add(lidMesh);

    // Lock mechanism
    const lockMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 }); // Metal
    const lockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), lockMat);
    lockMesh.position.set(0, -0.05, depth - thick); // On the front lip of the lid
    this.lid.add(lockMesh);

    this.mesh.add(this.lid);

    // Make all visual meshes interactable
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData = { interactable: true, instance: this };
      }
    });

  }

  public onInteract(player: Player, heldItem: IGrabbable | null): void {
    this.isOpen = !this.isOpen;
    this.targetAngle = this.isOpen ? Math.PI * -0.6 : 0; // Swing backwards past 90 degrees
  }

  public update(dt: number): void {
    if (Math.abs(this.lidAngle - this.targetAngle) > 0.001) {
      this.lidAngle += (this.targetAngle - this.lidAngle) * 5 * dt;
      this.lid.rotation.x = this.lidAngle;
      this.mesh.updateMatrixWorld();
    }
  }
}
