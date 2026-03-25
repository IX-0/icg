import * as THREE from 'three';
import { Grabbable } from '../objects/Grabbable';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';
import { PLAYER_CONFIG } from '../config/PlayerConfig';
import { physicsSystem } from '../physics/PhysicsSystem';
import RAPIER from '@dimforge/rapier3d-compat';

export default class Player {
  camera: THREE.PerspectiveCamera;
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

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement = document.body) {
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
    item.onGrab();

    // Ensure it's treated as a viewmodel item
    this.camera.add(item.mesh);

    // Fixed position relative to camera using item's preferred settings
    item.mesh.position.copy(item.holdPosition);
    item.mesh.rotation.copy(item.holdRotation);

    // Ensure it updates its matrix
    item.mesh.updateMatrix();
  }

  public drop(): void {
    if (!this.heldItem) return;
    const item = this.heldItem;
    this.heldItem = null;

    // Reconstruct current movement velocity since Player only stores Y velocity persistently
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

    const throwVel = new THREE.Vector3(move.x, this.velocity.y, move.z);

    // Add camera-relative throw force
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    throwVel.add(lookDir.multiplyScalar(PHYSICS_CONFIG.throwForce));

    // Drop raycast safeguard
    const maxDropDist = 2.0;
    let spawnDist = maxDropDist;
    if (physicsSystem.world) {
      const ray = new RAPIER.Ray(this.camera.position, lookDir);
      // Raycast against everything except dynamic bodies (like other held items/grabbables)
      // Actually, exclude sensors and kinematic (the player itself) to not hit ourselves
      const hit = physicsSystem.world.castRay(ray, maxDropDist, true, RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
      if (hit) {
        spawnDist = Math.max(0.2, hit.timeOfImpact - 0.2); // Provide a 0.2 buffer distance from wall
      }
    }

    item.onDrop(throwVel);

    // Detach from camera and place in world
    const worldPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(spawnDist));
    item.mesh.position.copy(worldPos);
    // Inherit absolute rotation from the viewmodel momentarily
    const worldQuat = new THREE.Quaternion();
    item.mesh.getWorldQuaternion(worldQuat);
    item.mesh.setRotationFromQuaternion(worldQuat);

    this.camera.remove(item.mesh);
  }

  update(deltaTime: number): void {
    if (!this.isLocked) return;
    const dt = Math.min(deltaTime, 0.1);

    // Look rotation with accumulation and interpolation (FPS Independent)
    this.targetYaw += this.mouseDeltaX;
    this.targetPitch += this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    this.targetPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.targetPitch));

    // Smooth lerp: handles input consistently even at 10-20 FPS
    const lookSmoothSpeed = 30.0; 
    this.currentYaw += (this.targetYaw - this.currentYaw) * Math.min(1.0, lookSmoothSpeed * dt);
    this.currentPitch += (this.targetPitch - this.currentPitch) * Math.min(1.0, lookSmoothSpeed * dt);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.currentPitch;
    this.camera.rotation.y = this.currentYaw;
 
    const targetHeight = this.isCrouching ? this.CROUCH_HEIGHT : this.PLAYER_HEIGHT;
    this.currentHeight += (targetHeight - this.currentHeight) * 15 * dt;

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

    this.velocity.y += (-PHYSICS_CONFIG.gravity) * dt;

    if (this.characterController && this.collider && this.playerBody) {
      const desiredTranslation = new THREE.Vector3(
        move.x * dt,
        this.velocity.y * dt,
        move.z * dt
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
      this.position.x += (move.x) * dt;
      this.position.y += (this.velocity.y) * dt;
      this.position.z += (move.z) * dt;

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

    // Since rigid body center is at translation, we need to offset camera slightly
    // If half height = 0.85, the center is y=0.85, eyes at top
    // For simplicity, just place camera exactly there for now, or offset by currentHeight / 2
    this.camera.position.copy(this.position);
    this.camera.position.y += (this.currentHeight / 2) - 0.2; // roughly eye level above center

    // Apply Warp Effect (FOV distortion and slight ripple)
    if (this.warpEffectTimer > 0) {
      this.warpEffectTimer -= dt;
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
      this.heldItem.update(dt);
    }
  }

  getDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  getIsLocked(): boolean { return this.isLocked; }
}
