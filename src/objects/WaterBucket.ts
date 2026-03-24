import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import TikiTorch from './TikiTorch';

export default class WaterBucket extends Grabbable {
  public mesh: THREE.Group;

  constructor() {
    super();
    this.mesh = new THREE.Group();
    
    // Custom hold positioning
    this.holdPosition.set(0.4, -0.6, -1.0);
    this.holdRotation.set(-0.2, 0, 0); // Tilted slightly upwards/forward

    // Bucket body
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 16);
    // Open top, double sided or simple
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      roughness: 0.6,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    // Water surface
    const waterGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x00AACC,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.02; // Slightly below brim
    this.mesh.add(water);

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public onGrab(): void {
    super.onGrab();
  }

  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    this.angularVelocity.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
  }

  public onUse(): void {
    // WaterBucket doesn't have an innate action unless it hits something.
    // The GameEngine handles rays directly or we could trigger particle effects here later.
  }

  public tryExtinguish(target: THREE.Object3D): void {
    const instance = target.userData?.instance;
    if (instance instanceof TikiTorch) {
      instance.setLit(false);
    }
  }
}
