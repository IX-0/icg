export const PHYSICS_CONFIG = {
  gravity: 20.0,
  friction: 6.0,   // Increased slightly
  throwForce: 7.0, // Reduced from 10.0 for better control
};

export type PhysicsConfig = typeof PHYSICS_CONFIG;
export const INITIAL_PHYSICS_CONFIG: PhysicsConfig = JSON.parse(JSON.stringify(PHYSICS_CONFIG));

export function resetPhysicsConfig(): void {
  Object.assign(PHYSICS_CONFIG, JSON.parse(JSON.stringify(INITIAL_PHYSICS_CONFIG)));
}
