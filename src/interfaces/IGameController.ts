export interface IGameController {
  /**
   * Request to spawn a specific type of object in front of the player.
   * @param type The type alias of the object ('torch', 'lighter', 'bucket', 'chest')
   */
  spawnObject(type: string): void;

  /**
   * Request to spawn the linked portal pair in the environment.
   */
  spawnPortalPair(): void;

  /**
   * Toggle various visual debug helpers.
   * @param item Type of helper ('axes', 'grid', 'sunHelper', etc)
   * @param visible Whether it should be shown
   */
  toggleDebug(item: string, visible: boolean): void;
}
