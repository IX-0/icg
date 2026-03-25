# Project TODO: Napoleon's Fate

## Environment & Lighting
- [ ] **Dynamic Light Sources**: Add point lights (torches, lanterns) on the platforms that automatically turn on at night.
- [ ] **Atmospheric Refinement**: 
    - [ ] Implement deeper atmospheric fog for morning/dawn transitions.
    - [ ] Add subtle "God Rays" (Light Shafts) post-processing for the high-noon sun.
- [ ] **Horizon Clipping**: Add cliff-side or boundary geometry to platforms to prevent seeing the "under-water" gap at the edges.

## Gameplay & Interaction
- [ ] **Interaction Manager**: Wire up the `InteractionManager` raycaster to the 'E' key for world interactions.
- [ ] **Portal System**: Implement the logic to transition players between platforms upon reaching a portal.
- [ ] **Prop Population**: Add game-specific assets (foliage, crates, ruins) to the platforms to fill the scene.

## UI & HUD
- [ ] **Crosshair**: Improve crossair. Its kinda funky right now.
- [ ] **Interaction Prompts**: "Press [E] to interact" tooltips when hovering over interactable objects.
