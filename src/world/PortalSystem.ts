import * as THREE from 'three';
import Portal from './Portal';
import Player from '../player/Player';

export default class PortalSystem {
  public portals: Portal[] = [];
  private scene: THREE.Scene;
  private prevPlayerPos: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    this.scene = scene;
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

    return [p1, p2];
  }

  public update(player: Player): void {
    const currPos = player.position.clone();

    for (const p of this.portals) {
      if (!p.destination) continue;

      // Local positions relative to portal frame
      const localPrev = p.mesh.worldToLocal(this.prevPlayerPos.clone());
      const localCurr = p.mesh.worldToLocal(currPos.clone());

      // If signs of local Z differ, they crossed the portal's plane
      if (Math.sign(localPrev.z) !== Math.sign(localCurr.z) && Math.abs(localPrev.z) < 1.5) {
        
        // Check bounds (width/height)
        if (Math.abs(localCurr.x) < p.width / 2 && Math.abs(localCurr.y) < p.height / 2 + 1) { 
          this._teleportPlayer(player, p, p.destination, localCurr);
          break; // Avoid double teleport
        }
      }
    }

    this.prevPlayerPos.copy(player.position);
  }

  private _teleportPlayer(player: Player, from: Portal, to: Portal, localCurr: THREE.Vector3): void {
    const exitLocalPos = localCurr.clone();
    exitLocalPos.z *= -1; 
    exitLocalPos.z += Math.sign(exitLocalPos.z) * 0.8; // Nudge out strongly to prevent re-triggering

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

    player.teleport(exitWorldPos, deltaYaw);
    
    // Sync prevPlayerPos
    this.prevPlayerPos.copy(player.position);
  }

  public clearPortals(): void {
    for (const p of this.portals) {
      this.scene.remove(p.mesh);
    }
    this.portals = [];
  }

  // Legacy method matching previous stub if needed
  createPortal(): void {}
  dismissPortal(): void {
    this.clearPortals();
  }
  hasPortal(): boolean { return this.portals.length > 0; }
  renderPortalTexture(): void {}
}
