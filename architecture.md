# Project Architecture Overview

This project is a physics-based 3D puzzle game built with **Three.js** and **Rapier Physics**. It follows a strictly decoupled, interface-driven OOP architecture.

## Directory Structure

- `src/engine/`: Core infrastructure (Game Loop, Physics System, Debug Helpers).
- `src/world//`: High-level scene management (Environment, Portals, Water, Lighting).
- `src/objects//`: Physical entities (Grabbables, Interactables, Tiles, Portals).
- `src/interfaces//`: System contracts (IUpdatable, IPortal, IInteractable).
- `src/puzzles//`: Logic for stage-based puzzle sequences (SequentialPuzzle, Stages).
- `src/player//`: Character controller and input handling.

## Core Systems & Lifecycle

### 1. The Update Loop (IUpdatable)
Almost all systems and entities implement `IUpdatable`. The `GameEngine` or `World` iterates over these each frame:
```typescript
interface IUpdatable {
  update(dt: number): void;
}
```

### 2. Physics Engine
Managed by `PhysicsSystem` (src/engine/). It wraps Rapier3D. 
- Static geometry: Use `addStaticTrimesh(mesh)`.
- Dynamic bodies: Handled by individual object classes (e.g., `Chest.initPhysics()`).

### 3. Portal System
Handled by `IPortalSystem` (src/world/PortalSystem.ts).
- Manages recursive rendering for screen-in-screen effects.
- Handles teleportation of the `Player` and `Grabbable` objects.
- Supports `onTraversed` callbacks for puzzle triggers.

### 4. Interactions
- **Grabbables**: Objects that can be picked up and thrown.
- **Interactables**: Objects with specific `onInteract` logic (e.g., opening a chest).
- **Triggers**: `TriggerZone` detects spatial entry/exit and integrates with the Puzzle System.

## Puzzle Flow
Puzzles are defined as a `SequentialPuzzle` consisting of multiple `IPuzzleStage` instances. Stages manage their own entry/exit conditions and local update logic (e.g., "Find the lighter", "Light 3 torches").

## Coding Standards for Agents
1. **Interfaces First**: Always check `src/interfaces/` before extending systems.
2. **Delta Time**: Always use `dt` (seconds) passed from the main loop.
3. **Paths**: Use absolute imports or standardized relative paths (`../objects/`, `../engine/`).
4. **Physics Safety**: Always check `if (physicsSystem.world)` before creating rigid bodies.
