// =====================================================
// main.js — v1.0.0 (Refactored)
// =====================================================
// Entry point for the refactored package sorting game
// This file initializes the Phaser game with the modular architecture
// =====================================================

import { GameConfig } from './config/gameConfig.js';
import { GameScene } from './scenes/GameScene.js';

// =====================================================
// Phaser Game Configuration
// =====================================================
const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GameConfig.base.width,
  height: GameConfig.base.height,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
};

// =====================================================
// Initialize the game
// =====================================================
const game = new Phaser.Game(gameConfig);

// =====================================================
// Global error handling
// =====================================================
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// =====================================================
// Expose game instance for debugging (development only)
// =====================================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugGame = {
    getGameState: () => game.scene.scenes[0]?.gameState || null,
    getWaveSystem: () => game.scene.scenes[0]?.waveSystem || null,
    getUIManager: () => game.scene.scenes[0]?.uiManager || null,
    restart: () => game.scene.scenes[0]?.restartGame(),
  };
}

// =====================================================
// Export for module usage
// =====================================================
export { game, gameConfig };
