import * as THREE from 'three';
import Chest from '../objects/Chest';
import TriggerZone from '../world/TriggerZone';

export type PlatformConfig = {
  index: number;
  type: 'gravel' | 'sand' | 'volcanic';
  variation: number;
  size: number;
  height: number;
};

export default class PlatformFactory {
  platformConfig: any;

  constructor() {
    this.platformConfig = {
      gravel: { textureColor: 0x8b7c6e, propTypes: ['statue', 'crate', 'anchor'] },
      sand: { textureColor: 0xd4a574, propTypes: ['boat', 'rock', 'barrel'] },
      volcanic: { textureColor: 0x3d3530, propTypes: ['crystal', 'vent', 'rock'] },
    };
  }

  createPlatformMesh(config: PlatformConfig) {
    const geometry = new THREE.CylinderGeometry(config.size, config.size, config.height, 32);
    const texture = this.createTexture(config.type);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: this.platformConfig[config.type].textureColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (mesh as any).userData = { type: 'platform', platformConfig: config };
    return mesh;
  }

  createTexture(type: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'gravel':
        this.drawGravelTexture(ctx, canvas.width, canvas.height);
        break;
      case 'sand':
        this.drawSandTexture(ctx, canvas.width, canvas.height);
        break;
      case 'volcanic':
        this.drawVolcanicTexture(ctx, canvas.width, canvas.height);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  drawGravelTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#8b7c6e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 20 + 5;
      const color = `hsla(30,20%,${Math.random() * 20 + 40}%,1)`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSandTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const y = Math.random() * h;
      const amplitude = Math.random() * 20 + 5;
      const frequency = Math.random() * 0.01 + 0.005;
      ctx.beginPath();
      for (let x = 0; x < w; x += 5) {
        const offsetY = Math.sin(x * frequency) * amplitude;
        if (x === 0) ctx.moveTo(x, y + offsetY);
        else ctx.lineTo(x, y + offsetY);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const opacity = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawVolcanicTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#3d3530';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 20; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        x = Math.max(0, Math.min(w, x));
        y = Math.max(0, Math.min(h, y));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = Math.random() * 30 + 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,100,0,0.3)');
      gradient.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  createProps(config: PlatformConfig) {
    const propTypes = this.platformConfig[config.type].propTypes;
    const positions = this.getPropPositions(config.size);
    const props: THREE.Mesh[] = [];
    propTypes.forEach((type: string, index: number) => {
      if (positions[index]) props.push(this.createProp(type, positions[index]));
    });
    return props;
  }

  getPropPositions(platformSize: number) {
    return [
      new THREE.Vector3(-platformSize * 0.4, 0.5, -platformSize * 0.3),
      new THREE.Vector3(platformSize * 0.3, 0.5, platformSize * 0.35),
      new THREE.Vector3(0, 0.5, platformSize * 0.45),
    ];
  }

  createProp(type: string, position: THREE.Vector3) {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    switch (type) {
      case 'statue':
      case 'crystal':
        geometry = new THREE.ConeGeometry(1, 3, 8);
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        break;
      case 'crate':
      case 'barrel':
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        break;
      case 'anchor':
      case 'vent':
        geometry = new THREE.SphereGeometry(0.8, 16, 16);
        material = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        break;
      case 'boat':
        geometry = new THREE.BoxGeometry(2, 0.8, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        break;
      case 'rock':
        geometry = new THREE.IcosahedronGeometry(0.8, 2);
        material = new THREE.MeshStandardMaterial({ color: 0x666666 });
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    (mesh as any).userData = { type: 'prop', propType: type };
    return mesh;
  }

  createButton(config: PlatformConfig) {
    const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.3 });
    const button = new THREE.Mesh(geometry, material);
    button.castShadow = true;
    button.receiveShadow = true;
    button.position.set(0, 1, 0);
    (button as any).userData = { type: 'button', interactive: true };
    return button;
  }
 
  createChest(position: THREE.Vector3, contents: any = null) {
    const chest = new Chest(contents);
    chest.mesh.position.copy(position);
    return chest;
  }
 
  createTriggerZone(position: THREE.Vector3, radius: number = 2.0, color: number = 0x00ff00) {
    return new TriggerZone(position, radius, color);
  }
}
