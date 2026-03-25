import * as THREE from 'three';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IUpdatable } from '../interfaces/IUpdatable';
import RAPIER from '@dimforge/rapier3d-compat';
import { physicsSystem } from '../engine/PhysicsSystem';

export abstract class Grabbable implements IGrabbable, IUpdatable {
  public abstract mesh: THREE.Object3D;
  public rigidBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  public isHeld: boolean = false;
  
  public holdPosition: THREE.Vector3 = new THREE.Vector3(0.5, -0.4, -0.8);
  public holdRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  public placementYOffset: number = 0.5;
 
  public abstract initPhysics(): void;

  public onGrab(): void {
    this.isHeld = true;
    
    if (this.rigidBody) {
      physicsSystem.removeBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
  }

  public onDrop(throwVelocity: THREE.Vector3 = new THREE.Vector3()): void {
    this.isHeld = false;
    
    // Recreate the physics body from scratch at the current mesh position
    this.initPhysics();

    if (this.rigidBody) {
      this.rigidBody.setLinvel(throwVelocity, true);
      this.rigidBody.setLinearDamping(0.5);
      this.rigidBody.setAngularDamping(1.5);
      this.rigidBody.wakeUp();
    }
  }

  public abstract onUse(): void;

  public update(_dt: number): void {
    if (this.isHeld || !this.rigidBody) return;

    // Sync three.js mesh to Rapier rigid body when in world
    const pos = this.rigidBody.translation();
    const rot = this.rigidBody.rotation();
    
    const targetPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const targetQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    
    this.mesh.position.lerp(targetPos, 0.4);
    this.mesh.quaternion.slerp(targetQuat, 0.4);
    this.mesh.updateMatrix();
  }
}
