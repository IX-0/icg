import GameEngine from './engine/GameEngine';

// Initialize game on page load
window.addEventListener('load', () => {
  const game = new GameEngine();
  game.start();
  // expose for debugging
  (window as any).game = game;
});
