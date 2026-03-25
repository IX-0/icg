import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Crown extends Grabbable {
  public mesh: THREE.Group;

  constructor() {
    super();
    this.mesh = new THREE.Group();
    
    this.holdPosition.set(0, -0.2, -0.6);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.2;

    // Crown Base (Ring)
    const baseGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 24);
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xffd700, 
      metalness: 0.9, 
      roughness: 0.1,
      emissive: 0x443300,
      emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.rotation.x = Math.PI / 2;
    this.mesh.add(base);

    // Points
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const pointGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
        const point = new THREE.Mesh(pointGeo, goldMat);
        point.position.x = Math.cos(angle) * 0.2;
        point.position.z = Math.sin(angle) * 0.2;
        point.position.y = 0.08;
        this.mesh.add(point);
    }

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, 'cylinder', [0.1, 0.2]);
    this.rigidBody = body;
    this.collider = collider;
  }

  public onUse(): void {
    // Maybe some sparkle effect?
    console.log("Using the crown...");
  }
}
