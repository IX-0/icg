import * as THREE from 'three';
import { IUpdatable } from './IUpdatable';

export interface IPortal extends IUpdatable {
  mesh: THREE.Group;
  destination: IPortal | null;
  width: number;
  height: number;
  onTraversed?: (isPlayer: boolean) => void;
  
  initPhysics(): void;
  updateRenderTarget(distance: number): void;
  setPosition(v: THREE.Vector3): void;
  setRotation(euler: THREE.Euler): void;
  updateWorldMatrix(): void;
}
