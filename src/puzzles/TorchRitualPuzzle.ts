import * as THREE from 'three';
import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import TriggerZone from '../world/TriggerZone';
import TikiTorch from '../objects/TikiTorch';

/**
 * Stage 1: Exploration
 * Complete when the player retrieves the lighter from the chest.
 */
export class TorchExplorationStage implements IPuzzleStage {
  id = 'torch-exploration';
  description = 'Find a way to create fire.';
  isCompleted = false;

  constructor(private onStageComplete: () => void) {}

  onEnter() {}
  update(_dt: number) {}
  onComplete() {
    this.onStageComplete();
  }
  
  // Handled by Chest.onOpen callback in World/Puzzle setup
  setFinished() {
    this.isCompleted = true;
  }
}

/**
 * Stage 2: Positioning
 * Complete when 3 torches are placed in the socket zones.
 */
export class TorchPositioningStage implements IPuzzleStage {
  id = 'torch-positioning';
  description = 'Set the ritual ground.';
  isCompleted = false;

  constructor(private zones: TriggerZone[]) {}

  onEnter() {}
  
  update(_dt: number) {
    // Check if every zone has at least one TikiTorch
    const allFilled = this.zones.every(zone => 
      zone.detectedObjects.some(obj => (obj.userData?.instance instanceof TikiTorch))
    );

    if (allFilled) {
      this.isCompleted = true;
    }
  }

  onComplete() {}
}

/**
 * Stage 3: The Rite
 * Complete when 3 torches in the sockets are lit.
 */
export class TorchRiteStage implements IPuzzleStage {
  id = 'torch-the-rite';
  description = 'Ignite the path.';
  isCompleted = false;

  constructor(private zones: TriggerZone[]) {}

  onEnter() {}

  update(_dt: number) {
    const allLit = this.zones.every(zone => {
      const torch = zone.detectedObjects.find(obj => (obj.userData?.instance instanceof TikiTorch));
      return torch && (torch.userData.instance as TikiTorch).getIsLit();
    });

    if (allLit) {
      this.isCompleted = true;
    }
  }

  onComplete() {}
}
