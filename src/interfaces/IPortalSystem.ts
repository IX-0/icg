import * as THREE from 'three';
import { IPortal } from './IPortal';
import { IUpdatable } from './IUpdatable';
import Player from '../player/Player';
import { Grabbable } from '../objects/Grabbable';

export interface IPortalSystem extends IUpdatable {
  addPortalPair(
    posA: THREE.Vector3, rotA: THREE.Euler, colorA: number,
    posB: THREE.Vector3, rotB: THREE.Euler, colorB: number,
    width?: number, height?: number,
    onTraversed?: (isPlayer: boolean) => void
  ): IPortal[];
  
  // Renamed to clarify its purpose since standard update(dt) is added via IUpdatable
  updateSystem(player: Player, grabbables?: Grabbable[]): void;
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, environment?: any): void;
  clearPortals(): void;
}
