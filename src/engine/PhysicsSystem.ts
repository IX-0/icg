import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { IUpdatable } from '../interfaces/IUpdatable';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';

export class PhysicsSystem implements IUpdatable {
  public world!: RAPIER.World;
  private isInitialized: boolean = false;

  public async init(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0.0, y: -PHYSICS_CONFIG.gravity, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    this.isInitialized = true;
  }

  public update(dt: number): void {
    if (!this.isInitialized) return;
    this.world.timestep = dt;
    this.world.step();
  }

  /**
   * Creates a static trimesh collider from a Three.js mesh.
   */
  public addStaticTrimesh(mesh: THREE.Mesh): RAPIER.Collider {
    const geometry = mesh.geometry;
    let position = mesh.position;
    let rotation = mesh.quaternion;

    mesh.updateMatrixWorld(true);

    const positions = geometry.attributes.position.array as Float32Array;
    const indices = geometry.index ? (geometry.index.array as Uint32Array) : undefined;

    let trimeshIndices: Uint32Array;
    if (indices) {
      trimeshIndices = new Uint32Array(indices);
    } else {
      const vertexCount = positions.length / 3;
      trimeshIndices = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        trimeshIndices[i] = i;
      }
    }

    const scale = mesh.scale;
    let scaledPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      scaledPositions[i] = positions[i] * scale.x;
      scaledPositions[i+1] = positions[i+1] * scale.y;
      scaledPositions[i+2] = positions[i+2] * scale.z;
    }

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(rotation);
    
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.trimesh(scaledPositions, trimeshIndices);
    return this.world.createCollider(colliderDesc, rigidBody);
  }

  public addFixedPrimitive(
      mesh: THREE.Object3D, 
      type: 'box' | 'cylinder' | 'sphere', 
      size: number[]
  ): { body: RAPIER.RigidBody, collider: RAPIER.Collider } {
    let position = mesh.getWorldPosition(new THREE.Vector3());
    let rotation = mesh.getWorldQuaternion(new THREE.Quaternion());

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(rotation);

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    let colliderDesc: RAPIER.ColliderDesc;
    
    switch(type) {
      case 'box':
        colliderDesc = RAPIER.ColliderDesc.cuboid(size[0], size[1], size[2]);
        break;
      case 'cylinder':
        colliderDesc = RAPIER.ColliderDesc.cylinder(size[0], size[1]);
        break;
      case 'sphere':
        colliderDesc = RAPIER.ColliderDesc.ball(size[0]);
        break;
      default:
        colliderDesc = RAPIER.ColliderDesc.ball(0.5);
    }
    colliderDesc.setFriction(PHYSICS_CONFIG.friction);

    const collider = this.world.createCollider(colliderDesc, rigidBody);
    return { body: rigidBody, collider };
  }

  /**
   * Creates a dynamic rigid body with a basic primitive collider (box/sphere/capsule).
   */
  public addDynamicPrimitive(
      mesh: THREE.Object3D, 
      type: 'box' | 'cylinder' | 'sphere', 
      size: number[]
  ): { body: RAPIER.RigidBody, collider: RAPIER.Collider } {
    
    let position = mesh.getWorldPosition(new THREE.Vector3());
    let rotation = mesh.getWorldQuaternion(new THREE.Quaternion());

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(rotation);

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    let colliderDesc: RAPIER.ColliderDesc;
    
    switch(type) {
      case 'box':
        // size: [hx, hy, hz] = half-extents
        colliderDesc = RAPIER.ColliderDesc.cuboid(size[0], size[1], size[2]);
        break;
      case 'cylinder':
        // size: [halfHeight, radius]
        colliderDesc = RAPIER.ColliderDesc.cylinder(size[0], size[1]);
        break;
      case 'sphere':
        // size: [radius]
        colliderDesc = RAPIER.ColliderDesc.ball(size[0]);
        break;
      default:
        colliderDesc = RAPIER.ColliderDesc.ball(0.5);
    }

    colliderDesc.setFriction(PHYSICS_CONFIG.friction);
    colliderDesc.setRestitution(0.1);

    const collider = this.world.createCollider(colliderDesc, rigidBody);
    
    // Add damping to stabilize objects and prevent infinite rolling
    rigidBody.setLinearDamping(0.5);
    rigidBody.setAngularDamping(1.0);

    return { body: rigidBody, collider };
  }

  public removeBody(body: RAPIER.RigidBody): void {
    if (this.world) this.world.removeRigidBody(body);
  }

  public removeCollider(collider: RAPIER.Collider): void {
    if (this.world) this.world.removeCollider(collider, false);
  }
}

export const physicsSystem = new PhysicsSystem();
