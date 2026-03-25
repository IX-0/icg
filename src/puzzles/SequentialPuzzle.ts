import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import { IUpdatable } from '../interfaces/IUpdatable';

/**
 * Manages a sequence of stages that must be completed in order.
 */
export class SequentialPuzzle implements IUpdatable {
  public id: string;
  private stages: IPuzzleStage[] = [];
  private currentStageIndex: number = -1;
  private _isCompleted: boolean = false;

  /** Callback executed when the entire sequence is finished. */
  public onAllStagesComplete?: () => void;
  /** Callback executed when the current stage changes. */
  public onStageChanged?: (stage: IPuzzleStage) => void;

  constructor(id: string, stages: IPuzzleStage[]) {
    this.id = id;
    this.stages = stages;
  }

  public start(): void {
    if (this.stages.length > 0) {
      this.currentStageIndex = 0;
      this.stages[0].onEnter();
      if (this.onStageChanged) this.onStageChanged(this.stages[0]);
    } else {
      this._isCompleted = true;
    }
  }

  public update(dt: number): void {
    if (this._isCompleted || this.currentStageIndex === -1) return;

    const currentStage = this.stages[this.currentStageIndex];
    currentStage.update(dt);

    if (currentStage.isCompleted) {
      currentStage.onComplete();
      this.currentStageIndex++;

      if (this.currentStageIndex < this.stages.length) {
        const nextStage = this.stages[this.currentStageIndex];
        nextStage.onEnter();
        if (this.onStageChanged) this.onStageChanged(nextStage);
      } else {
        this._isCompleted = true;
        if (this.onAllStagesComplete) this.onAllStagesComplete();
      }
    }
  }

  public get currentStage(): IPuzzleStage | null {
    if (this.currentStageIndex >= 0 && this.currentStageIndex < this.stages.length) {
      return this.stages[this.currentStageIndex];
    }
    return null;
  }

  public get isCompleted(): boolean {
    return this._isCompleted;
  }
}
