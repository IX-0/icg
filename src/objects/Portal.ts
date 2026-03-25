import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { physicsSystem } from '../engine/PhysicsSystem';
import { PORTAL_CONFIG } from '../config/PortalConfig';
import { IPortal } from '../interfaces/IPortal';

export interface PortalOptions {
  color: number;
  width: number;
  height: number;
}

export default class Portal implements IPortal {
  public mesh: THREE.Group;
  public destination: IPortal | null = null;
  public onTraversed?: (isPlayer: boolean) => void;
  public width: number;
  public height: number;
  public renderTarget: THREE.WebGLRenderTarget;
  public portalSurface: THREE.Mesh;
  public borderGroup: THREE.Group; // Visual glow border
  public casingGroup: THREE.Group; // Blocking tunnel walls/backplate

  // Corners in local space
  public bottomLeftCorner: THREE.Vector3;
  public bottomRightCorner: THREE.Vector3;
  public topLeftCorner: THREE.Vector3;

  private rigidBody: RAPIER.RigidBody | null = null;

  constructor(options: PortalOptions) {
    this.width = options.width;
    this.height = options.height;
    this.mesh = new THREE.Group();

    this.renderTarget = new THREE.WebGLRenderTarget(PORTAL_CONFIG.maxResolution, PORTAL_CONFIG.maxResolution, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });
    const portalGeo = new THREE.PlaneGeometry(this.width, this.height);
    const portalMat = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      fog: false // Prevent double-fogging (portal image already has its own fog)
    });
    this.portalSurface = new THREE.Mesh(portalGeo, portalMat);
    this.mesh.add(this.portalSurface);

    // Corners (relative to the mesh center)
    this.bottomLeftCorner = new THREE.Vector3(-this.width / 2, -this.height / 2, 0);
    this.bottomRightCorner = new THREE.Vector3(this.width / 2, -this.height / 2, 0);
    this.topLeftCorner = new THREE.Vector3(-this.width / 2, this.height / 2, 0);

    this.borderGroup = new THREE.Group();
    this.mesh.add(this.borderGroup);

    this.casingGroup = new THREE.Group();
    this.mesh.add(this.casingGroup);

    const frameGeo = new THREE.BoxGeometry(this.width + 0.3, 0.3, 0.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: options.color,
      emissive: options.color,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });

    // Top
    const top = new THREE.Mesh(frameGeo, frameMat);
    top.position.y = this.height / 2;
    this.borderGroup.add(top);

    // Bottom
    const bot = new THREE.Mesh(frameGeo, frameMat);
    bot.position.y = -this.height / 2;
    this.borderGroup.add(bot);

    // Sides
    const sideGeo = new THREE.BoxGeometry(0.3, this.height + 0.3, 0.3);
    const sideL = new THREE.Mesh(sideGeo, frameMat);
    sideL.position.x = -this.width / 2;
    this.borderGroup.add(sideL);

    const sideR = new THREE.Mesh(sideGeo, frameMat);
    sideR.position.x = this.width / 2;
    this.borderGroup.add(sideR);

    // Back plate (acting as the solid "back plane")
    const backGeo = new THREE.PlaneGeometry(this.width, this.height);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x010101,
      roughness: 0.1,
      metalness: 0.1
    });
    const backPlate = new THREE.Mesh(backGeo, backMat);
    backPlate.position.z = -0.10; 
    backPlate.rotation.y = Math.PI; 
    this.casingGroup.add(backPlate);
  }

  public update(_dt: number): void {
    // Optional: add logic for portal animations or effects
  }
 
  public initPhysics(): void {
    if (!physicsSystem.world || !this.mesh) return;
    if (this.rigidBody) return; // Avoid duplicate physics bodies

    this.updateWorldMatrix();
    const pos = new THREE.Vector3();
    this.mesh.getWorldPosition(pos);
    const quat = new THREE.Quaternion();
    this.mesh.getWorldQuaternion(quat);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(quat);

    this.rigidBody = physicsSystem.world.createRigidBody(bodyDesc);

    // Filter memberships: all categories (0xFFFF), all masks (0xFFFF)
    const activeCollisionGroups = 0x0001FFFF;

    const frameH = 0.1;
    const hW_full = (this.width + 0.2) / 2;
    const hH_full = (this.height + 0.2) / 2;
    const hW = this.width / 2;
    const hH = this.height / 2;

    // Top
    physicsSystem.world.createCollider(
      RAPIER.ColliderDesc.cuboid(hW_full, frameH, frameH)
        .setTranslation(0, hH, 0)
        .setCollisionGroups(activeCollisionGroups),
      this.rigidBody
    );
    // Bottom
    physicsSystem.world.createCollider(
      RAPIER.ColliderDesc.cuboid(hW_full, frameH, frameH)
        .setTranslation(0, -hH, 0)
        .setCollisionGroups(activeCollisionGroups),
      this.rigidBody
    );
    // Left
    physicsSystem.world.createCollider(
      RAPIER.ColliderDesc.cuboid(frameH, hH_full, frameH)
        .setTranslation(-hW, 0, 0)
        .setCollisionGroups(activeCollisionGroups),
      this.rigidBody
    );
    // Right
    physicsSystem.world.createCollider(
      RAPIER.ColliderDesc.cuboid(frameH, hH_full, frameH)
        .setTranslation(hW, 0, 0)
        .setCollisionGroups(activeCollisionGroups),
      this.rigidBody
    );

    // Safety wall
    physicsSystem.world.createCollider(
      RAPIER.ColliderDesc.cuboid(hW, hH, 0.1)
        .setTranslation(0, 0, -0.8)
        .setCollisionGroups(activeCollisionGroups),
      this.rigidBody
    );
  }

  public updateRenderTarget(distance: number): void {
    const { minResolution, maxResolution, renderMinDist, renderMaxDist } = PORTAL_CONFIG;

    let t = (distance - renderMinDist) / (renderMaxDist - renderMinDist);
    t = Math.max(0, Math.min(1, t));

    const factor = 1 - t;
    let targetSize = minResolution + (maxResolution - minResolution) * factor;
    
    // Power-of-two jump points
    if (targetSize > 3000) targetSize = 4096;
    else if (targetSize > 1500) targetSize = 2048;
    else if (targetSize > 750) targetSize = 1024;
    else targetSize = 512;

    if (this.renderTarget.width !== targetSize) {
      this.renderTarget.setSize(targetSize, targetSize);
    }
  }


  public setPosition(v: THREE.Vector3): void {
    this.mesh.position.copy(v);
  }

  public setRotation(euler: THREE.Euler): void {
    this.mesh.rotation.copy(euler);
  }

  public updateWorldMatrix(): void {
    this.mesh.updateMatrixWorld(true);
  }
}
