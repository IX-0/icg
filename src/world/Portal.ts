import * as THREE from 'three';

export interface PortalOptions {
  color: number;
  width: number;
  height: number;
}

export default class Portal {
  public mesh: THREE.Group;
  public destination: Portal | null = null;
  public width: number;
  public height: number;

  constructor(options: PortalOptions) {
    this.width = options.width;
    this.height = options.height;
    this.mesh = new THREE.Group();

    // The "Internal" plane (glowing surface)
    const portalGeo = new THREE.PlaneGeometry(this.width, this.height);
    const portalMat = new THREE.MeshBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const portalMesh = new THREE.Mesh(portalGeo, portalMat);
    this.mesh.add(portalMesh);

    // Give it a frame
    const frameGeo = new THREE.BoxGeometry(this.width + 0.2, 0.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Top
    const top = new THREE.Mesh(frameGeo, frameMat);
    top.position.y = this.height / 2;
    this.mesh.add(top);

    // Bottom
    const bot = new THREE.Mesh(frameGeo, frameMat);
    bot.position.y = -this.height / 2;
    this.mesh.add(bot);

    // Sides
    const sideGeo = new THREE.BoxGeometry(0.2, this.height + 0.2, 0.2);
    const sideL = new THREE.Mesh(sideGeo, frameMat);
    sideL.position.x = -this.width / 2;
    this.mesh.add(sideL);

    const sideR = new THREE.Mesh(sideGeo, frameMat);
    sideR.position.x = this.width / 2;
    this.mesh.add(sideR);
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
