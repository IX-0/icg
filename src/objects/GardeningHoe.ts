import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class GardeningHoe extends Grabbable {
  public mesh: THREE.Group;

  constructor() {
    super();
    this.mesh = new THREE.Group();
    
    // Position/rotation when held
    this.holdPosition.set(0.4, -0.4, -0.8);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.4;

    // Handle
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.5;
    this.mesh.add(handle);

    // Blade
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
    const bladeGeo = new THREE.BoxGeometry(0.1, 0.5, 0.3);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.set(-1.25, -0.1, 0);
    this.mesh.add(blade);

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, 'box', [0.75, 0.1, 0.1]);
    this.rigidBody = body;
    this.collider = collider;
  }

  public onUse(): void {
    // Action when player uses the hoe (e.g., digging logic in world)
    console.log("Digging with the gardening hoe!");
  }
}
