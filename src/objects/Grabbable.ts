import * as THREE from 'three';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IUpdatable } from '../interfaces/IUpdatable';

export abstract class Grabbable implements IGrabbable, IUpdatable {
  public abstract mesh: THREE.Object3D;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public angularVelocity: THREE.Vector3 = new THREE.Vector3();
  public isHeld: boolean = false;
  
  public holdPosition: THREE.Vector3 = new THREE.Vector3(0.5, -0.4, -0.8);
  public holdRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  public onGrab(): void {
    this.isHeld = true;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
  }

  public onDrop(throwVelocity: THREE.Vector3 = new THREE.Vector3()): void {
    this.isHeld = false;
    this.velocity.copy(throwVelocity);
  }

  public abstract onUse(): void;

  public update(dt: number): void {
    if (!this.isHeld) {
      // Gravity
      this.velocity.y -= PHYSICS_CONFIG.gravity * dt; 
      
      this.mesh.position.addScaledVector(this.velocity, dt);

      // Ground collision (Platform at y=0.5)
      const groundY = 0.5;
      if (this.mesh.position.y <= groundY) {
        this.mesh.position.y = groundY;
        this.velocity.y = 0;
        
        // Friction
        const fric = PHYSICS_CONFIG.friction;
        this.velocity.x *= 1.0 - (fric * dt);
        this.velocity.z *= 1.0 - (fric * dt);
        
        const planarSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (planarSpeed > 0.5) {
          // If moving somewhat fast, roll based on movement
          this.angularVelocity.x = this.velocity.z * 1.5;
          this.angularVelocity.z = -this.velocity.x * 1.5;
          this.mesh.rotation.x += this.angularVelocity.x * dt;
          this.mesh.rotation.y += this.angularVelocity.y * dt;
          this.mesh.rotation.z += this.angularVelocity.z * dt;
        } else {
          // Stop moving completely
          this.velocity.set(0, 0, 0);
          this.angularVelocity.multiplyScalar(Math.max(0, 1.0 - fric * 2 * dt)); // Damping based on friction
          // Settle rotation to avoid goofy angles (snap to 90deg grids on X/Z)
          const targetX = Math.round(this.mesh.rotation.x / (Math.PI/2)) * (Math.PI/2);
          const targetZ = Math.round(this.mesh.rotation.z / (Math.PI/2)) * (Math.PI/2);
          this.mesh.rotation.x += (targetX - this.mesh.rotation.x) * dt * fric;
          this.mesh.rotation.z += (targetZ - this.mesh.rotation.z) * dt * fric;
        }

      } else {
        // Tumbling in air
        this.mesh.rotation.x += this.angularVelocity.x * dt;
        this.mesh.rotation.y += this.angularVelocity.y * dt;
        this.mesh.rotation.z += this.angularVelocity.z * dt;
      }
      this.mesh.updateMatrix();
    }
  }
}
