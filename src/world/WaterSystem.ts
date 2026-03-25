import * as THREE from 'three';
// @ts-ignore
import { Water } from 'three/examples/jsm/objects/Water.js';
import { physicsSystem } from '../engine/PhysicsSystem';
import { IUpdatable } from '../interfaces/IUpdatable';

export default class WaterSystem implements IUpdatable {
  scene: THREE.Scene;
  water: any;
  seabed: THREE.Mesh | null = null;

  private readonly TIME_SCALE = 0.18;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public create(sunPosition: THREE.Vector3 = new THREE.Vector3(100, 80, 100)): void {
    const seabedGeo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    const seabedMat = new THREE.MeshStandardMaterial({
      map: _makeSandTexture(),
      roughness: 0.95,
      metalness: 0.0,
    });
    this.seabed = new THREE.Mesh(seabedGeo, seabedMat);
    this.seabed.rotation.x = -Math.PI / 2;
    this.seabed.position.y = -7;
    this.seabed.receiveShadow = true;
    this.scene.add(this.seabed);

    if (physicsSystem.world) {
      physicsSystem.addStaticTrimesh(this.seabed);
    }

    const waterNormals = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    );

    this.water = new Water(new THREE.PlaneGeometry(2000, 2000, 128, 128), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: sunPosition.clone().normalize(),
      sunColor: 0x444444,
      waterColor: 0x004466,
      distortionScale: 0.3,
      fog: true,
      alpha: 0.70,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.5;
    this.water.material.transparent = true;
    this.water.material.opacity = 0.80;

    this.scene.add(this.water);
  }

  public update(dt: number): void {
    if (this.water) {
      this.water.material.uniforms['time'].value += dt * this.TIME_SCALE;
    }
  }

  public updateForLighting(sunPosition: THREE.Vector3): void {
    if (this.water) {
      this.water.material.uniforms['sunDirection'].value
        .copy(sunPosition.clone().normalize());
    }
  }
}

function _makeSandTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8a060';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(180,140,70,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * size;
    const amp = Math.random() * 12 + 4;
    const freq = Math.random() * 0.012 + 0.006;
    ctx.beginPath();
    for (let x = 0; x < size; x += 3) {
      const py = y + Math.sin(x * freq) * amp;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 180; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 6 + 2;
    const lightness = 35 + Math.random() * 25;
    ctx.fillStyle = `hsla(35,40%,${lightness}%,0.5)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = Math.random() * 50 + 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(100,80,40,0.15)');
    g.addColorStop(1, 'rgba(100,80,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8); 
  return tex;
}
