export interface IUpdatable {
  /**
   * Called every frame to run animations and logic.
   * @param dt Delta time in seconds since last frame.
   */
  update(dt: number): void;
}
