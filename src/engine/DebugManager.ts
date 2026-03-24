import * as THREE from 'three';
import LightingSystem from '../world/LightingSystem';

export default class DebugManager {
  private scene: THREE.Scene;
  private lighting: LightingSystem;

  private axesHelper: THREE.AxesHelper | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private sunHelper: THREE.DirectionalLightHelper | null = null;
  private moonHelper: THREE.DirectionalLightHelper | null = null;
  private shadowHelper: THREE.CameraHelper | null = null;

  constructor(scene: THREE.Scene, lighting: LightingSystem) {
    this.scene = scene;
    this.lighting = lighting;
  }

  public setAxesVisible(visible: boolean): void {
    if (visible && !this.axesHelper) {
      this.axesHelper = new THREE.AxesHelper(100);
      this.scene.add(this.axesHelper);
    } else if (!visible && this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper.dispose();
      this.axesHelper = null;
    }
  }

  public setGridVisible(visible: boolean): void {
    if (visible && !this.gridHelper) {
      this.gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
      this.gridHelper.position.y = 0.01; // Slightly above ground
      this.scene.add(this.gridHelper);
    } else if (!visible && this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach((m) => m.dispose());
      } else {
        this.gridHelper.material.dispose();
      }
      this.gridHelper = null;
    }
  }

  public setSunHelperVisible(visible: boolean): void {
    if (visible && !this.sunHelper) {
      this.sunHelper = new THREE.DirectionalLightHelper(this.lighting.getSunLight(), 20);
      this.scene.add(this.sunHelper);
    } else if (!visible && this.sunHelper) {
      this.scene.remove(this.sunHelper);
      this.sunHelper.dispose();
      this.sunHelper = null;
    }
  }

  public setMoonHelperVisible(visible: boolean): void {
    if (visible && !this.moonHelper) {
      this.moonHelper = new THREE.DirectionalLightHelper(this.lighting.getMoonLight(), 20, 0x0000ff);
      this.scene.add(this.moonHelper);
    } else if (!visible && this.moonHelper) {
      this.scene.remove(this.moonHelper);
      this.moonHelper.dispose();
      this.moonHelper = null;
    }
  }

  public setShadowHelperVisible(visible: boolean): void {
    if (visible && !this.shadowHelper) {
      this.shadowHelper = new THREE.CameraHelper(this.lighting.getSunLight().shadow.camera);
      this.scene.add(this.shadowHelper);
    } else if (!visible && this.shadowHelper) {
      this.scene.remove(this.shadowHelper);
      this.shadowHelper.dispose();
      this.shadowHelper = null;
    }
  }

  public update(): void {
    if (this.sunHelper) this.sunHelper.update();
    if (this.moonHelper) this.moonHelper.update();
    if (this.shadowHelper) this.shadowHelper.update();
  }
}
