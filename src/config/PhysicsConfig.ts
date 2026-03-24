export const PHYSICS_CONFIG = {
  gravity: 20.0,
  friction: 5.0,
  throwForce: 3.0,
};

export type PhysicsConfig = typeof PHYSICS_CONFIG;
export const INITIAL_PHYSICS_CONFIG: PhysicsConfig = JSON.parse(JSON.stringify(PHYSICS_CONFIG));

export function resetPhysicsConfig(): void {
  Object.assign(PHYSICS_CONFIG, JSON.parse(JSON.stringify(INITIAL_PHYSICS_CONFIG)));
}
