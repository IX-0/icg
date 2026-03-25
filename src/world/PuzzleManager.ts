import { SequentialPuzzle } from '../puzzles/SequentialPuzzle';
import { IUpdatable } from '../interfaces/IUpdatable';

/**
 * Global manager for the current active puzzle in the world.
 */
export default class PuzzleManager implements IUpdatable {
  private activePuzzle: SequentialPuzzle | null = null;
  
  /** HUD/UI callback for displaying the current objective. */
  public onObjectiveUpdate?: (text: string) => void;

  public setActivePuzzle(puzzle: SequentialPuzzle | null): void {
    this.activePuzzle = puzzle;
    if (puzzle) {
      puzzle.onStageChanged = (stage) => {
        if (this.onObjectiveUpdate) this.onObjectiveUpdate(stage.description);
      };
      puzzle.start();
      if (this.onObjectiveUpdate && puzzle.currentStage) {
        this.onObjectiveUpdate(puzzle.currentStage.description);
      }
    } else {
      if (this.onObjectiveUpdate) this.onObjectiveUpdate('');
    }
  }

  public update(dt: number): void {
    if (this.activePuzzle) {
      this.activePuzzle.update(dt);
    }
  }

  public getActivePuzzle(): SequentialPuzzle | null {
    return this.activePuzzle;
  }
}
