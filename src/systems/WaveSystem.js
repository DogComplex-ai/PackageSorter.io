// =====================================================
// WaveSystem
// Manages wave lifecycle, package spawning, and wave progression
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { Package } from '../entities/Package.js';
import { getRandomShapeForStream, getRandomColor } from '../utils/helpers.js';

/**
 * WaveSystem handles all wave-related logic
 */
export class WaveSystem {
  /**
   * @param {object} gameState - Reference to game state
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(gameState, scene) {
    this.gameState = gameState;
    this.scene = scene;
  }

  /**
   * Update wave system (called each frame)
   * @param {number} delta - Time delta in milliseconds
   */
  update(delta) {
    if (!this.gameState.wave.active) return;

    // Update spawn timer
    this.gameState.wave.spawnTimer += delta;

    // Spawn packages if needed
    if (
      this.gameState.wave.spawnTimer >= this.gameState.getEffectiveSpawnInterval() &&
      this.gameState.wave.packagesSpawned < this.gameState.wave.packageLimit
    ) {
      this.spawnPackage();
      this.gameState.wave.spawnTimer = 0;
      this.gameState.wave.packagesSpawned++;
      
      // Update inbound truck display
      this.updateInboundTruck();
    }

    // Update packages
    this.updatePackages(delta);

    // Check if wave is complete
    this.checkWaveComplete();
  }

  /**
   * Spawn a new package
   */
  spawnPackage() {
    // Determine which streams have active vehicles
    const activeStreams = [];
    if (this.gameState.hasActiveVehiclesForStream('A')) activeStreams.push('A');
    if (this.gameState.hasActiveVehiclesForStream('B')) activeStreams.push('B');

    if (activeStreams.length === 0) return;

    // Pick random stream, shape, and color
    const stream = activeStreams[Math.floor(Math.random() * activeStreams.length)];
    const shape = getRandomShapeForStream(stream);
    const color = getRandomColor();

    // Create package
    const pkg = new Package(shape, color.name, color.value, stream, this.scene);
    this.gameState.packages.push(pkg);
  }

  /**
   * Update all packages
   * @param {number} delta - Time delta in milliseconds
   */
  updatePackages(delta) {
    const vehicles = this.gameState.vehicles;
    const loaders = this.gameState.employees.loaders;

    this.gameState.packages.forEach(pkg => {
      // Move package along belt
      pkg.update(delta);

      // Try to load package
      if (!pkg.loaded && !pkg.missed) {
        pkg.tryLoad(vehicles, loaders);
      }
    });
  }

  /**
   * Check if the current wave is complete
   */
  checkWaveComplete() {
    const { wave, packages } = this.gameState;

    if (
      wave.packagesSpawned >= wave.packageLimit &&
      packages.every(p => p.loaded || p.missed)
    ) {
      this.endWave();
    }
  }

  /**
   * End the current wave
   */
  endWave() {
    const results = this.gameState.endWave();
    
    // Emit event for UI updates
    this.gameState.events.emit('wave:results', results);
  }

  /**
   * Update the inbound truck display
   */
  updateInboundTruck() {
    const remaining = Math.max(0, 
      this.gameState.wave.packageLimit - this.gameState.wave.packagesSpawned
    );
    this.gameState.events.emit('wave:inboundTruckUpdate', { remaining });
  }

  /**
   * Get remaining packages to spawn
   * @returns {number} Remaining packages
   */
  getRemainingPackages() {
    return Math.max(0, 
      this.gameState.wave.packageLimit - this.gameState.wave.packagesSpawned
    );
  }

  /**
   * Get wave progress as a percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgressPercentage() {
    const totalPackages = this.gameState.wave.packageLimit;
    const loadedPackages = this.gameState.packages.filter(p => p.loaded).length;
    return totalPackages > 0 ? (loadedPackages / totalPackages) * 100 : 0;
  }

  /**
   * Get current wave info
   * @returns {object} Wave information
   */
  getWaveInfo() {
    return {
      current: this.gameState.wave.current,
      active: this.gameState.wave.active,
      betweenWaves: this.gameState.wave.betweenWaves,
      packagesSpawned: this.gameState.wave.packagesSpawned,
      packageLimit: this.gameState.wave.packageLimit,
      remaining: this.getRemainingPackages(),
      progress: this.getProgressPercentage(),
    };
  }
}