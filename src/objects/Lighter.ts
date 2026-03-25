import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import TikiTorch from './TikiTorch';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Lighter extends Grabbable {
  public mesh: THREE.Group;

  private isIgnited: boolean = false;
  private flame: THREE.Mesh | null = null;

  constructor() {
    super();
    this.mesh = new THREE.Group();
    
    // Custom hold positioning: closer, off to the side, slightly angled
    this.holdPosition.set(0.3, -0.2, -0.5);
    this.holdRotation.set(0, -Math.PI / 4, 0);
    this.placementYOffset = 0.25;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    // Lid (visual hint)
    const lidGeo = new THREE.BoxGeometry(0.2, 0.05, 0.1);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.22;
    this.mesh.add(lid);

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, 'box', [0.1, 0.225, 0.05]);
    this.rigidBody = body;
    this.collider = collider;
  }

  public onGrab(): void {
    super.onGrab();
  }
  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    this.setIgnited(false);
    if (this.rigidBody) {
      this.rigidBody.setAngvel({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8
      }, true);
    }
  }

  public onUse(): void {
    this.setIgnited(!this.isIgnited);
  }

  public setIgnited(ignited: boolean): void {
    this.isIgnited = ignited;
    if (this.isIgnited) {
      this._createFlame();
    } else {
      this._removeFlame();
    }
  }

  private _createFlame(): void {
    if (this.flame) return;
    const flameGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.y = 0.25;
    this.mesh.add(this.flame);
  }

  private _removeFlame(): void {
    if (this.flame) {
      this.mesh.remove(this.flame);
      this.flame = null;
    }
  }

  public update(dt: number): void {
    super.update(dt);
  }

  public tryIgnite(target: THREE.Object3D): void {
    if (!this.isIgnited) return;
    const instance = target.userData?.instance;
    if (instance instanceof TikiTorch) {
      instance.setLit(true);
    }
  }
}
