import * as THREE from 'three';
import Portal from './Portal';
import Player from '../player/Player';
import { Grabbable } from '../objects/Grabbable';
import { PORTAL_CONFIG } from '../config/PortalConfig';
import * as CameraUtils from 'three/examples/jsm/utils/CameraUtils.js';

export default class PortalSystem {
  public portals: Portal[] = [];
  public portalCamera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private prevPlayerPos: THREE.Vector3 = new THREE.Vector3();

  // Reuse vectors for reflection
  private reflectedPosition = new THREE.Vector3();
  private portalForward = new THREE.Vector3();
  private cameraToPortal = new THREE.Vector3();
  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private BL = new THREE.Vector3();
  private BR = new THREE.Vector3();
  private TL = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    let fov = 45;
    let aspect = 1;
    if (camera && (camera as THREE.PerspectiveCamera).fov) {
      fov = (camera as THREE.PerspectiveCamera).fov;
      aspect = (camera as THREE.PerspectiveCamera).aspect;
    }
    this.portalCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 15000.0);
    this.portalCamera.layers.enable(1); // Stars, Moon glow
    this.portalCamera.layers.enable(2); // Moon body
    this.scene.add(this.portalCamera);
  }

  public addPortalPair(
    posA: THREE.Vector3, rotA: THREE.Euler, colorA: number,
    posB: THREE.Vector3, rotB: THREE.Euler, colorB: number,
    width: number = 2.5, height: number = 3.5
  ): Portal[] {
    const p1 = new Portal({ color: colorA, width, height });
    p1.setPosition(posA);
    p1.setRotation(rotA);
    p1.updateWorldMatrix();

    const p2 = new Portal({ color: colorB, width, height });
    p2.setPosition(posB);
    p2.setRotation(rotB);
    p2.updateWorldMatrix();

    p1.destination = p2;
    p2.destination = p1;

    this.portals.push(p1, p2);
    this.scene.add(p1.mesh);
    this.scene.add(p2.mesh);

    // Dynamic quality is handled in render(), physics here.
    p1.initPhysics();
    p2.initPhysics();

    return [p1, p2];
  }

  public update(player: Player, grabbables: Grabbable[] = []): void {
    const currPos = player.position.clone();

    for (const p of this.portals) {
      if (!p.destination) continue;

      // Local positions relative to portal frame
      const localPrev = p.mesh.worldToLocal(this.prevPlayerPos.clone());
      const localCurr = p.mesh.worldToLocal(currPos.clone());

      // Trigger teleport early based on config to prevent near-plane clipping
      if (localPrev.z > PORTAL_CONFIG.teleportThreshold && localCurr.z <= PORTAL_CONFIG.teleportThreshold && Math.abs(localPrev.z) < 1.5) {
        if (Math.abs(localCurr.x) < p.width / 2 && Math.abs(localCurr.y) < p.height / 2 + 1) {
          this._teleportPlayer(player, p, p.destination, localCurr);
          break;
        }
      }
    }

    this.prevPlayerPos.copy(player.position);

    // Update Grabbables
    for (const g of grabbables) {
      if (!g.mesh.userData.prevPos) g.mesh.userData.prevPos = g.mesh.position.clone();

      const gCurrPos = g.mesh.position.clone();
      for (const p of this.portals) {
        if (!p.destination) continue;

        const localPrev = p.mesh.worldToLocal(g.mesh.userData.prevPos.clone());
        const localCurr = p.mesh.worldToLocal(gCurrPos.clone());

        // Only teleport when crossing the threshold from front to back
        if (localPrev.z > PORTAL_CONFIG.teleportThreshold && localCurr.z <= PORTAL_CONFIG.teleportThreshold && Math.abs(localPrev.z) < 1.5) {
          if (Math.abs(localCurr.x) < p.width / 2 && Math.abs(localCurr.y) < p.height / 2 + 1) {
            this._teleportGrabbable(g, p, p.destination, localCurr);
            break;
          }
        }
      }
      g.mesh.userData.prevPos.copy(g.mesh.position);
    }
  }

  private _teleportPlayer(player: Player, from: Portal, to: Portal, localCurr: THREE.Vector3): void {
    const exitLocalPos = localCurr.clone();
    exitLocalPos.x *= -1; 
    exitLocalPos.z *= -1; 
    exitLocalPos.z += PORTAL_CONFIG.exitNudge;

    const exitWorldPos = to.mesh.localToWorld(exitLocalPos);

    // Yaw offset logic:
    const forward = new THREE.Vector3(0, 0, 1);
    const dirA = forward.clone().applyEuler(from.mesh.rotation);
    const dirB = forward.clone().applyEuler(to.mesh.rotation);
    const angleA = Math.atan2(dirA.x, dirA.z);
    const angleB = Math.atan2(dirB.x, dirB.z);

    // On portal entry -> exit, we usually want to exit mirroring the entry direction.
    // If portals face each other (180 deg), the offset is zero.
    // If portals face the same way, the offset is 180.
    const deltaYaw = (angleB - angleA) + Math.PI;

    // Preserve horizontal momentum by rotating the internal velocity vector
    const euler = new THREE.Euler(0, deltaYaw, 0, 'YXZ');
    player.velocity.applyEuler(euler);

    player.teleport(exitWorldPos, deltaYaw);

    // Sync prevPlayerPos
    this.prevPlayerPos.copy(player.position);
  }

  private _teleportGrabbable(g: Grabbable, from: Portal, to: Portal, localCurr: THREE.Vector3): void {
    // 1. Position: Mirrors the entry point relative to the portal center
    // but ensures we are pushed out in front (Local Z > 0)
    const exitLocalPos = localCurr.clone();
    exitLocalPos.x *= -1; 
    exitLocalPos.z *= -1; // Reflects back-crossing (-Z) into front (+Z)
    exitLocalPos.z += 1.6; // Increased nudge to ensure large objects clear the frame
    
    const exitWorldPos = to.mesh.localToWorld(exitLocalPos);
 
    // 2. Yaw Logic: Calculate rotation needed to face out of the new portal correctly
    const forward = new THREE.Vector3(0, 0, 1);
    const dirA = forward.clone().applyEuler(from.mesh.rotation);
    const dirB = forward.clone().applyEuler(to.mesh.rotation);
    const angleA = Math.atan2(dirA.x, dirA.z);
    const angleB = Math.atan2(dirB.x, dirB.z);
    const deltaYaw = (angleB - angleA) + Math.PI;
 
    // 3. Update Visuals
    g.mesh.position.copy(exitWorldPos);
    g.mesh.rotation.y += deltaYaw;
    g.mesh.updateMatrixWorld(true);
 
    // 4. Update Physics Body
    if (g.rigidBody) {
      g.rigidBody.setTranslation(exitWorldPos, true);
      
      const worldQuat = new THREE.Quaternion();
      g.mesh.getWorldQuaternion(worldQuat);
      g.rigidBody.setRotation(worldQuat, true);
 
      // Preserve absolute speed but rotate momentum vector
      const vel = g.rigidBody.linvel();
      const threeVel = new THREE.Vector3(vel.x, vel.y, vel.z);
      const euler = new THREE.Euler(0, deltaYaw, 0, 'YXZ');
      threeVel.applyEuler(euler);
      g.rigidBody.setLinvel(threeVel, true);
 
      // Rotate spin vector too
      const angVel = g.rigidBody.angvel();
      const threeAngVel = new THREE.Vector3(angVel.x, angVel.y, angVel.z);
      threeAngVel.applyEuler(euler);
      g.rigidBody.setAngvel(threeAngVel, true);
 
      g.rigidBody.wakeUp();
    }
    
    // Ensure the prevPos is updated immediately too
    if (g.mesh.userData.prevPos) {
      g.mesh.userData.prevPos.copy(exitWorldPos);
    }
  }

  public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, mainCamera: THREE.PerspectiveCamera, environment?: any): void {
    if (this.portals.length < 2) return;

    const currentRenderTarget = renderer.getRenderTarget();
    const currentXrEnabled = renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const currentToneMapping = renderer.toneMapping;
    
    renderer.xr.enabled = false; 
    renderer.shadowMap.autoUpdate = false; 
    renderer.toneMapping = THREE.NoToneMapping; // Prevent double tone-mapping

    // Update frustum for FOV culling
    this.projScreenMatrix.multiplyMatrices(mainCamera.projectionMatrix, mainCamera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    for (const p of this.portals) {
      if (!p.destination) continue;

      // 1. Distance Culling
      const dx = mainCamera.position.x - p.mesh.position.x;
      const dz = mainCamera.position.z - p.mesh.position.z;
      const flatDistSq = dx * dx + dz * dz;
      if (flatDistSq > PORTAL_CONFIG.cullingDistance * PORTAL_CONFIG.cullingDistance) continue; 

      // 2. Frustum Culling (Is it in FOV?)
      if (!this.frustum.intersectsObject(p.portalSurface)) continue;

      // 3. Backface Culling (Is we looking at its back?)
      // Get portal facing direction (Z+)
      p.mesh.getWorldDirection(this.portalForward);
      this.cameraToPortal.subVectors(mainCamera.position, p.mesh.position);
      if (this.cameraToPortal.dot(this.portalForward) <= 0) continue;

      // 4. Dynamic quality based on flat distance
      p.updateRenderTarget(Math.sqrt(flatDistSq));

      // Render pass
      this._renderPortal(p, p.destination, renderer, scene, mainCamera, environment);
    }

    renderer.xr.enabled = currentXrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.toneMapping = currentToneMapping;
    renderer.setRenderTarget(currentRenderTarget);
  }

  /**
   * Performs the primary render pass for a portal's internal view.
   * Handles virtual camera positioning (mirroring), vertex-to-portal frame mapping,
   * celestial environment synchronization, and recursive visibility management.
   */
  private _renderPortal(
    thisPortal: Portal,
    otherPortal: Portal,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    mainCamera: THREE.PerspectiveCamera,
    environment?: any
  ): void {
    thisPortal.mesh.worldToLocal(this.reflectedPosition.copy(mainCamera.position));
    this.reflectedPosition.x *= -1.0;
    this.reflectedPosition.z *= -1.0;
    otherPortal.mesh.localToWorld(this.reflectedPosition);
    this.portalCamera.position.copy(this.reflectedPosition);

    otherPortal.mesh.localToWorld(this.BL.copy(otherPortal.bottomRightCorner));
    otherPortal.mesh.localToWorld(this.BR.copy(otherPortal.bottomLeftCorner));
    this.TL.copy(otherPortal.bottomRightCorner);
    this.TL.y = otherPortal.topLeftCorner.y;
    otherPortal.mesh.localToWorld(this.TL);

    CameraUtils.frameCorners(this.portalCamera, this.BL, this.BR, this.TL, false);

    thisPortal.renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    renderer.setRenderTarget(thisPortal.renderTarget);

    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();

    thisPortal.mesh.visible = false;
    otherPortal.portalSurface.visible = false;
    otherPortal.casingGroup.visible = false;

    if (environment && environment.updateMoon) {
      const nightFactor = environment.lighting?.getNightFactor() || 0;
      const moonDir = environment.lighting?.getMoonDirection() || new THREE.Vector3(0, 1, 0);
      environment.updateMoon(moonDir, this.portalCamera.position, nightFactor);
    }

    renderer.render(scene, this.portalCamera);

    if (environment && environment.updateMoon) {
      const nightFactor = environment.lighting?.getNightFactor() || 0;
      const moonDir = environment.lighting?.getMoonDirection() || new THREE.Vector3(0, 1, 0);
      environment.updateMoon(moonDir, mainCamera.position, nightFactor);
    }

    thisPortal.mesh.visible = true;
    otherPortal.portalSurface.visible = true;
    otherPortal.casingGroup.visible = true;
  }

  public initPhysics(): void {
    for (const p of this.portals) {
      p.initPhysics();
    }
  }

  public clearPortals(): void {
    for (const p of this.portals) {
      this.scene.remove(p.mesh);
    }
    this.portals = [];
  }

  // Legacy method matching previous stub if needed
  createPortal(): void { }
  dismissPortal(): void {
    this.clearPortals();
  }
  hasPortal(): boolean { return this.portals.length > 0; }
  renderPortalTexture(): void { }
}
