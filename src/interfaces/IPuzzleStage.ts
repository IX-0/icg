import * as THREE from 'three';
import { IUpdatable } from './IUpdatable';

/**
 * Represents a single phase of a multi-stage puzzle.
 */
export interface IPuzzleStage extends IUpdatable {
  /** Unique identifier for this stage. */
  id: string;
  
  /** Human-readable description for UI tooltips/prompts. */
  description: string;
  
  /** Whether this stage has been successfully completed. */
  isCompleted: boolean;

  /** Called when this stage becomes active. */
  onEnter(): void;
  
  /** Called when this stage is finished. */
  onComplete(): void;
}
