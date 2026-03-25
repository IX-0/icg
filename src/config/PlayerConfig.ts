export const PLAYER_CONFIG = {
  fov: 75,
  warpDuration: 0.4,
  moveSpeed: 6,
  jumpForce: 8,
  height: 1.7,
  crouchHeight: 0.85,
  radius: 0.4,
};

export type PlayerConfig = typeof PLAYER_CONFIG;
export const INITIAL_PLAYER_CONFIG: PlayerConfig = JSON.parse(JSON.stringify(PLAYER_CONFIG));

export function resetPlayerConfig(): void {
  Object.assign(PLAYER_CONFIG, JSON.parse(JSON.stringify(INITIAL_PLAYER_CONFIG)));
}
