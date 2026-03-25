import * as THREE from 'three';
import { Grabbable } from '../objects/Grabbable';
import TikiTorch from '../objects/TikiTorch';
import WaterBucket from '../objects/WaterBucket';
import Lighter from '../objects/Lighter';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';
import { PLAYER_CONFIG } from '../config/PlayerConfig';
import { physicsSystem } from '../engine/PhysicsSystem';
import RAPIER from '@dimforge/rapier3d-compat';
import { IUpdatable } from '../interfaces/IUpdatable';

export default class Player implements IUpdatable {
  camera: THREE.PerspectiveCamera;
  public scene: THREE.Scene;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  private keys: { [key: string]: boolean } = {};
  private isOnGround: boolean = true;
  private isLocked: boolean = false;
  private domElement: HTMLElement;

  // Custom Smooth Look
  private targetPitch: number = 0;
  private targetYaw: number = 0;
  private currentPitch: number = 0;
  private currentYaw: number = 0;
  private mouseDeltaX: number = 0;
  private mouseDeltaY: number = 0;

  public heldItem: Grabbable | null = null;
  public playerBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  public characterController: RAPIER.KinematicCharacterController | null = null;

  // Warp effect state
  private warpEffectTimer: number = 0;
  private baseFov: number = 75;

  get GRAVITY() { return -PHYSICS_CONFIG.gravity; }
  readonly JUMP_FORCE = PLAYER_CONFIG.jumpForce;
  readonly MOVE_SPEED = PLAYER_CONFIG.moveSpeed;
  readonly PLAYER_HEIGHT = PLAYER_CONFIG.height;
  readonly CROUCH_HEIGHT = PLAYER_CONFIG.crouchHeight;

  private isCrouching: boolean = false;
  private currentHeight: number = PLAYER_CONFIG.height;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, domElement: HTMLElement = document.body) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.domElement = domElement;
    this.position = new THREE.Vector3(0, PLAYER_CONFIG.height + 0.5, 0);
    this.velocity = new THREE.Vector3();
    this.camera.position.copy(this.position);

    this.camera.position.copy(this.position);

    this._initPointerLock();
    this._initKeyboard();
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;

    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(this.position.x, this.position.y, this.position.z);
    this.playerBody = physicsSystem.world.createRigidBody(rbDesc);

    const radius = PLAYER_CONFIG.radius;
    const halfHeight = (PLAYER_CONFIG.height / 2) - radius;
    const colDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setCollisionGroups(0x0001FFFF);
    this.collider = physicsSystem.world.createCollider(colDesc, this.playerBody);

    this.characterController = physicsSystem.world.createCharacterController(0.01);
    this.characterController.setUp({ x: 0, y: 1, z: 0 });
    this.characterController.setApplyImpulsesToDynamicBodies(true);
  }

  private _initPointerLock(): void {
    const onPointerLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;

      const instructions = document.getElementById('instructions');
      if (instructions) instructions.style.display = this.isLocked ? 'none' : 'flex';

      const startBtn = document.getElementById('start-btn');
      if (startBtn && !this.isLocked) startBtn.innerText = 'Resume Game';

      // Sync Euler targets to current rotation when locking
      if (this.isLocked) {
        this.currentYaw = this.targetYaw = this.camera.rotation.y;
        this.currentPitch = this.targetPitch = this.camera.rotation.x;
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);

    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) this.domElement.requestPointerLock();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isLocked) return;
      const sensitivity = 0.002;
      this.mouseDeltaX -= e.movementX * sensitivity;
      this.mouseDeltaY -= e.movementY * sensitivity;
    });
  }

  private _initKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.isOnGround) {
        this.velocity.y = PLAYER_CONFIG.jumpForce;
        this.isOnGround = false;
      }
      if (e.code === 'KeyC' || e.code === 'ControlLeft') {
        this.isCrouching = true;
      }
    });
    document.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyC' || e.code === 'ControlLeft') {
        this.isCrouching = false;
      }
    });
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.camera.position.copy(this.position);
  }

  public teleport(pos: THREE.Vector3, deltaYaw: number): void {
    this.position.copy(pos);

    this.targetYaw += deltaYaw;
    this.currentYaw += deltaYaw;
    this.camera.rotation.y = this.currentYaw;

    this.camera.position.copy(this.position);
    if (this.playerBody) {
      this.playerBody.setTranslation(pos, true);
    }
    this.triggerWarpEffect();
  }

  public triggerWarpEffect(): void {
    this.warpEffectTimer = PLAYER_CONFIG.warpDuration;
  }

  public grab(item: Grabbable): void {
    if (this.heldItem) this.drop();
    this.heldItem = item;
    // 1. Parent to camera and set visual hand position first
    this.camera.add(item.mesh);
    item.mesh.position.copy(item.holdPosition);
    item.mesh.rotation.copy(item.holdRotation);
    item.mesh.updateMatrixWorld(true);

    // 2. Now call onGrab, which will teleport the physics body to the current world position (the hand)
    item.onGrab();

    // Ensure it updates its matrix
    item.mesh.updateMatrix();
  }

  public drop(): void {
    if (!this.heldItem) return;
 
    const item = this.heldItem;
    this.heldItem = null;
 
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    forwardVec.y = 0;
    rightVec.y = 0;
    forwardVec.normalize();
    rightVec.normalize();
 
    const move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(forwardVec);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.add(forwardVec.clone().negate());
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.add(rightVec.clone().negate());
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(rightVec);
 
    if (move.lengthSq() > 0) move.normalize();
    move.multiplyScalar(this.isCrouching ? PLAYER_CONFIG.moveSpeed * 0.5 : PLAYER_CONFIG.moveSpeed);
 
    const playerVelInheritance = new THREE.Vector3(move.x, this.velocity.y, move.z);
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    
    // 1. MUST detach from parent before setting world-space coordinates
    this.camera.remove(item.mesh);
    this.scene.add(item.mesh);
 
    const MAX_PLACEMENT_REACH = 4.0;
    const ray = new RAPIER.Ray(this.camera.position, lookDir);
    let hitPlacement = null;
    
    if (physicsSystem.world) {
      hitPlacement = physicsSystem.world.castRay(ray, MAX_PLACEMENT_REACH, true, 
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    }
 
    if (hitPlacement && hitPlacement.timeOfImpact < MAX_PLACEMENT_REACH) {
      const hitPoint = this.camera.position.clone().add(lookDir.clone().multiplyScalar(hitPlacement.timeOfImpact));
      item.mesh.position.set(hitPoint.x, hitPoint.y + item.placementYOffset, hitPoint.z);
      item.mesh.rotation.set(0, this.currentYaw + Math.PI, 0);
      item.onDrop(new THREE.Vector3(0, 0, 0));
    } else {
      const throwVel = playerVelInheritance.clone().add(lookDir.clone().multiplyScalar(PHYSICS_CONFIG.throwForce));
 
      let spawnDist = 0.8;
      if (physicsSystem.world) {
        const hit = physicsSystem.world.castRay(ray, 2.0, true, 
          RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
        if (hit) spawnDist = Math.max(0.4, hit.timeOfImpact - 0.1); 
      }
 
      const worldPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(spawnDist));
      item.mesh.position.copy(worldPos);
      
      const worldQuat = new THREE.Quaternion();
      item.mesh.getWorldQuaternion(worldQuat);
      item.mesh.quaternion.copy(worldQuat);
 
      item.onDrop(throwVel);
    }
 
    item.mesh.updateMatrix();
    item.mesh.updateMatrixWorld(true);
  }

  update(dt: number): void {
    if (!this.isLocked) return;
    const finalDt = Math.min(dt, 0.1);

    // Look rotation with accumulation and interpolation (FPS Independent)
    this.targetYaw += this.mouseDeltaX;
    this.targetPitch += this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    this.targetPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.targetPitch));

    // Smooth lerp: handles input consistently even at 10-20 FPS
    const lookSmoothSpeed = 30.0;
    this.currentYaw += (this.targetYaw - this.currentYaw) * Math.min(1.0, lookSmoothSpeed * finalDt);
    this.currentPitch += (this.targetPitch - this.currentPitch) * Math.min(1.0, lookSmoothSpeed * finalDt);
 
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.currentPitch;
    this.camera.rotation.y = this.currentYaw;
 
    const targetHeight = this.isCrouching ? this.CROUCH_HEIGHT : this.PLAYER_HEIGHT;
    this.currentHeight += (targetHeight - this.currentHeight) * 15 * finalDt;
 
    const move = new THREE.Vector3();
 
    // Get direction relative to camera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
 
    // Project to XZ plane
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();
 
    if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.add(forward.clone().negate());
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.add(right.clone().negate());
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
 
    if (move.lengthSq() > 0) move.normalize();
    move.multiplyScalar(this.isCrouching ? PLAYER_CONFIG.moveSpeed * 0.5 : PLAYER_CONFIG.moveSpeed);
 
    this.velocity.y += (-PHYSICS_CONFIG.gravity) * finalDt;
 
    if (this.characterController && this.collider && this.playerBody) {
      const desiredTranslation = new THREE.Vector3(
        move.x * finalDt,
        this.velocity.y * finalDt,
        move.z * finalDt
      );
 
      this.characterController.computeColliderMovement(this.collider, desiredTranslation);
      const computedMove = this.characterController.computedMovement();
 
      const newPos = this.playerBody.translation();
      newPos.x += computedMove.x;
      newPos.y += computedMove.y;
      newPos.z += computedMove.z;
 
      this.playerBody.setNextKinematicTranslation(newPos);
 
      this.position.set(newPos.x, newPos.y, newPos.z);
 
      this.isOnGround = this.characterController.computedGrounded();
      if (this.isOnGround && this.velocity.y < 0) {
        this.velocity.y = 0;
      }
    } else {
      // Fallback
      this.position.x += (move.x) * finalDt;
      this.position.y += (this.velocity.y) * finalDt;
      this.position.z += (move.z) * finalDt;
 
      const groundY = 0.5 + this.currentHeight;
      if (this.isOnGround && this.velocity.y <= 0) {
        this.position.y = groundY;
        this.velocity.y = 0;
      } else if (this.position.y < groundY) {
        this.position.y = groundY;
        this.velocity.y = 0;
        this.isOnGround = true;
      }
    }
 
    // Safety Reset: If fallen through world or launched to space
    if (this.position.y < -50 || this.position.y > 500) {
      console.error('Player out of bounds! Resetting position.', this.position.clone());
      this.setPosition(0, 10, 0);
      this.velocity.set(0, 0, 0);
      if (this.playerBody) this.playerBody.setTranslation({ x: 0, y: 10, z: 0 }, true);
    }
 
    // Since rigid body center is at translation, we need to offset camera slightly
    // If half height = 0.85, the center is y=0.85, eyes at top
    // For simplicity, just place camera exactly there for now, or offset by currentHeight / 2
    this.camera.position.copy(this.position);
    this.camera.position.y += (this.currentHeight / 2) - 0.2; // roughly eye level above center
 
    // Apply Warp Effect (FOV distortion and slight ripple)
    if (this.warpEffectTimer > 0) {
      this.warpEffectTimer -= finalDt;
      const t = this.warpEffectTimer / 0.4; // 1 to 0
      const intensity = Math.sin(t * Math.PI); // Ease in and out
 
      // FOV Pulse
      this.camera.fov = this.baseFov + intensity * 12;
      this.camera.updateProjectionMatrix();
 
      // Position ripple (Z-axis wobble to hide the jump)
      const ripple = Math.sin(t * 30) * 0.1 * intensity;
      this.camera.position.z += ripple;
      this.camera.position.x += Math.cos(t * 25) * 0.05 * intensity;
    } else if (this.camera.fov !== this.baseFov) {
      // Reset FOV once timer is done
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
 
    if (this.heldItem) {
      this.heldItem.update(finalDt);
    }
  }

  getDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  getIsLocked(): boolean { return this.isLocked; }
}
