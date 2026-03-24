import * as THREE from 'three';
import Player from '../player/Player';
import { IGrabbable } from './IGrabbable';

export interface IInteractable {
  mesh: THREE.Object3D;
  
  /**
   * Triggered when the player left-clicks on an immovable object.
   * @param player Reference to the acting player.
   * @param heldItem The item currently held by the player (if any).
   */
  onInteract(player: Player, heldItem: IGrabbable | null): void;
}
