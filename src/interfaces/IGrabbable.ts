import * as THREE from 'three';

export interface IGrabbable {
  mesh: THREE.Object3D;
  holdPosition: THREE.Vector3;
  holdRotation: THREE.Euler;

  /**
   * Triggered when the player successfully grabs the item.
   */
  onGrab(): void;

  /**
   * Triggered when the player lets go of the item.
   * @param initialVelocity The momentum inherited from the player.
   */
  onDrop(initialVelocity: THREE.Vector3): void;

  /**
   * Triggered when the player right-clicks while holding this item.
   */
  onUse(): void;
}
