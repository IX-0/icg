import * as THREE from 'three';
import Player from '../player/Player';
import { physicsSystem } from '../engine/PhysicsSystem';
import { IInteractable } from '../interfaces/IInteractable';
import { IUpdatable } from '../interfaces/IUpdatable';
import { IGrabbable } from '../interfaces/IGrabbable';

export abstract class Interactable implements IInteractable, IUpdatable {
  public abstract mesh: THREE.Object3D;
  
  /**
   * Initialize physical properties for the object (rigid body & collider).
   */
  public abstract initPhysics(): void;

  /**
   * Called when the player clicks on this object
   * @param player The player instance
   * @param heldItem The item currently held by the player (if any)
   */
  public abstract onInteract(player: Player, heldItem: IGrabbable | null): void;

  
  /**
   * Called every frame to run animations/logic
   * @param dt Delta time in seconds
   */
  public abstract update(dt: number): void;
}
