import * as THREE from 'three';

export default class InteractionManager {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  interactiveObjects: THREE.Object3D[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = 0.1;
    this.raycaster.far = 4; // interaction range in metres
  }

  registerInteractive(object: THREE.Object3D): void {
    if (!this.interactiveObjects.includes(object)) {
      this.interactiveObjects.push(object);
    }
  }

  unregisterInteractive(object: THREE.Object3D): void {
    this.interactiveObjects = this.interactiveObjects.filter(o => o !== object);
  }

  clearInteractives(): void {
    this.interactiveObjects = [];
  }

  /** Cast a ray from position in direction, return closest hit */
  raycast(position: THREE.Vector3, direction: THREE.Vector3): THREE.Intersection | null {
    this.raycaster.set(position, direction.clone().normalize());
    const hits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    return hits.length > 0 ? hits[0] : null;
  }

  /** Raycast from camera centre forward, against registered interactive objects */
  raycastFromCamera(): THREE.Intersection | null {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const pos = new THREE.Vector3();
    this.camera.getWorldPosition(pos);
    return this.raycast(pos, dir);
  }

  raycastSphere(_position: THREE.Vector3, _radius: number, objects: THREE.Object3D[]): THREE.Object3D | null {
    return objects.length > 0 ? objects[0] : null;
  }

  getObjectsWithinRange(position: THREE.Vector3, range: number, objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects.filter(obj => obj.position.distanceTo(position) <= range);
  }
}
