import * as THREE from 'three';
import { Grabbable } from '../objects/Grabbable';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';

export default class Player {
  camera: THREE.PerspectiveCamera;
  position: THREE.Vector3;
  velocity: THREE.Vector3;

  public yaw: number = 0;
  private pitch: number = 0;
  private keys: Record<string, boolean> = {};
  private isOnGround: boolean = true;
  private isLocked: boolean = false;
  private domElement: HTMLElement;
  public heldItem: Grabbable | null = null;

  readonly GRAVITY    = -20;
  readonly JUMP_FORCE = 8;
  readonly MOVE_SPEED = 6;
  readonly PLAYER_HEIGHT = 1.7;
  readonly CROUCH_HEIGHT = 0.85;

  private isCrouching: boolean = false;
  private currentHeight: number = this.PLAYER_HEIGHT;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement = document.body) {
    this.camera    = camera;
    this.domElement = domElement;
    this.position  = new THREE.Vector3(0, this.PLAYER_HEIGHT + 0.5, 0);
    this.velocity  = new THREE.Vector3();
    this.camera.position.copy(this.position);
    this._initPointerLock();
    this._initKeyboard();
  }

  private _initPointerLock(): void {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      
      const instructions = document.getElementById('instructions');
      if (instructions) {
        instructions.style.display = this.isLocked ? 'none' : 'flex';
      }
      
      const startBtn = document.getElementById('start-btn');
      if (startBtn && !this.isLocked) {
        startBtn.innerText = 'Resume Game';
      }
    });

    this.domElement.addEventListener('click', () => {
      // GameEngine handles initial click, but if we drop out we can click again
      if (!this.isLocked) this.domElement.requestPointerLock();
    });
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isLocked) return;
      const sens = 0.002;
      this.yaw  -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    });
  }

  private _initKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.isOnGround) {
        this.velocity.y = this.JUMP_FORCE;
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

  teleport(pos: THREE.Vector3, deltaYaw: number): void {
    this.position.copy(pos);
    this.yaw += deltaYaw;
    this.camera.position.copy(this.position);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
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
    const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const rightVec   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move       = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.add(forwardVec);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.add(forwardVec.clone().negate());
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.add(rightVec.clone().negate());
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(rightVec);

    if (move.lengthSq() > 0) move.normalize();
    move.multiplyScalar(this.isCrouching ? this.MOVE_SPEED * 0.5 : this.MOVE_SPEED);

    const throwVel = new THREE.Vector3(move.x, this.velocity.y, move.z);
    
    // Add camera-relative throw force
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    throwVel.add(lookDir.multiplyScalar(PHYSICS_CONFIG.throwForce)); // Use configured force

    item.onDrop(throwVel);
    
    // Detach from camera and place in world
    const worldPos = new THREE.Vector3();
    item.mesh.getWorldPosition(worldPos);
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

    const targetHeight = this.isCrouching ? this.CROUCH_HEIGHT : this.PLAYER_HEIGHT;
    this.currentHeight += (targetHeight - this.currentHeight) * 15 * dt;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move    = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.add(forward.clone().negate());
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.add(right.clone().negate());
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);

    if (move.lengthSq() > 0) move.normalize();
    move.multiplyScalar(this.isCrouching ? this.MOVE_SPEED * 0.5 : this.MOVE_SPEED);

    this.velocity.y += this.GRAVITY * dt;

    this.position.x += (move.x) * dt;
    this.position.y += (this.velocity.y) * dt;
    this.position.z += (move.z) * dt;

    // Ground clamp at platform top (y=0.5) + player current eye height
    const groundY = 0.5 + this.currentHeight;
    if (this.isOnGround && this.velocity.y <= 0) {
      this.position.y = groundY;
      this.velocity.y = 0;
    } else if (this.position.y < groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isOnGround = true;
    }

    this.camera.position.copy(this.position);
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
