import * as THREE from 'three';
import { Grabbable } from './Grabbable';

export default class TikiTorch extends Grabbable {
  public mesh: THREE.Group;

  private isLit: boolean = false;
  private flame: THREE.Mesh | null = null;
  private light: THREE.PointLight | null = null;

  constructor() {
    super();
    this.mesh = new THREE.Group();
    
    // Custom hold positioning: Further out to the right and lower, tilted forward
    this.holdPosition.set(0.6, -0.8, -1.5);
    this.holdRotation.set(0.3, -0.1, 0); 

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4d2600 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1;
    this.mesh.add(pole);

    // Head (container for flame)
    const headGeo = new THREE.CylinderGeometry(0.2, 0.1, 0.4, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1;
    this.mesh.add(head);

    // Initial state: not lit
    this.mesh.userData = { grabbable: true, instance: this };
  }

  public onGrab(): void {
    super.onGrab();
  }

  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    // Give it a random tumble when dropped
    this.angularVelocity.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
  }

  public onUse(): void {
    // Toggle lit state for testing, though normally lit by lighter
    this.toggleLit();
  }

  public toggleLit(): void {
    this.isLit = !this.isLit;
    if (this.isLit) {
      this._createFlame();
    } else {
      this._removeFlame();
    }
  }

  public setLit(lit: boolean): void {
    if (this.isLit === lit) return;
    this.isLit = lit;
    if (this.isLit) this._createFlame();
    else this._removeFlame();
  }

  private _createFlame(): void {
    if (this.flame) return;
    
    // Flame mesh
    const flameGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.y = 2.4;
    this.mesh.add(this.flame);

    // Flame light
    this.light = new THREE.PointLight(0xffaa00, 1.5, 10);
    this.light.position.y = 2.4;
    this.mesh.add(this.light);
  }

  private _removeFlame(): void {
    if (this.flame) {
      this.mesh.remove(this.flame);
      this.flame = null;
    }
    if (this.light) {
      this.mesh.remove(this.light);
      this.light = null;
    }
  }

  public update(dt: number): void {
    super.update(dt);
    if (this.isLit && this.flame) {
      // Small flicker
      const s = 1.0 + Math.sin(Date.now() * 0.01) * 0.1;
      this.flame.scale.set(s, s, s);
      if (this.light) this.light.intensity = 1.5 + Math.sin(Date.now() * 0.02) * 0.3;
    }
  }
}
