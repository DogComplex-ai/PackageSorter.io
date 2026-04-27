// =====================================================
// Employee Entities
// Represents the unloader and loader employees
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { formatCurrency } from '../utils/helpers.js';

/**
 * Base Employee class for unloader and loaders
 */
class Employee {
  /**
   * @param {string} type - Employee type ('unloader' or 'loader')
   * @param {object} config - Employee configuration
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(type, config, scene) {
    this.type = type;
    this.scene = scene;
    this.tier = 0;
    this.maxTier = config.maxTier || 2;
    this.upgradeCosts = [...(config.upgradeCosts || [0, 50, 100])];
    this.operatingCosts = [...(config.operatingCosts || [0, 10, 25])];
    
    // Visual elements
    this.circle = null;
    this.plus = null;
  }

  /**
   * Get the current operating cost
   * @returns {number} Operating cost
   */
  getCurrentOperatingCost() {
    return this.operatingCosts[this.tier];
  }

  /**
   * Get the next upgrade cost
   * @returns {number} Upgrade cost
   */
  getNextUpgradeCost() {
    if (this.tier >= this.maxTier) return Infinity;
    return this.upgradeCosts[this.tier + 1];
  }

  /**
   * Check if can be upgraded
   * @returns {boolean} True if can upgrade
   */
  canUpgrade() {
    return this.tier < this.maxTier;
  }

  /**
   * Upgrade the employee
   * @returns {boolean} True if upgrade successful
   */
  upgrade() {
    if (!this.canUpgrade()) return false;
    
    const gameState = this.scene.gameState;
    if (!gameState || !gameState.wave.betweenWaves) return false;
    
    const cost = this.getNextUpgradeCost();
    if (gameState.economy.money < cost) return false;

    gameState.addMoney(-cost);
    this.tier++;
    
    this.updateVisuals();
    
    gameState.events.emit('employee:upgraded', {
      type: this.type,
      tier: this.tier,
      cost,
    });
    
    return true;
  }

  /**
   * Update visual appearance based on tier
   */
  updateVisuals() {
    if (this.circle) {
      const color = GameConfig.employeeColors[this.tier];
      this.circle.setFillStyle(color);
    }
  }

  /**
   * Create visual elements (to be implemented by subclasses)
   */
  createSprites() {
    // To be implemented by subclasses
  }

  /**
   * Set visibility
   * @param {boolean} visible - Visibility state
   */
  setVisible(visible) {
    if (this.circle) this.circle.setVisible(visible);
    if (this.plus) this.plus.setVisible(visible);
  }

  /**
   * Destroy visual elements
   */
  destroy() {
    if (this.circle) {
      this.circle.destroy();
      this.circle = null;
    }
    if (this.plus) {
      this.plus.destroy();
      this.plus = null;
    }
  }
}

/**
 * Unloader employee - unloads packages from inbound truck to belt
 */
export class Unloader extends Employee {
  /**
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(scene) {
    const config = {
      type: 'unloader',
      maxTier: GameConfig.unloader.maxTier,
      upgradeCosts: [...GameConfig.unloader.upgradeCosts],
      operatingCosts: [...GameConfig.unloader.operatingCosts],
    };
    super('unloader', config, scene);
    
    // Position
    this.x = 60;
    this.y = GameConfig.base.beltY - 26;
    
    // Spawn interval multipliers
    this.spawnIntervalMultipliers = [...GameConfig.unloader.spawnIntervalMultipliers];
  }

  /**
   * Create visual elements
   */
  createSprites() {
    // Employee circle
    this.circle = this.scene.add.circle(
      this.x,
      this.y,
      9,
      GameConfig.employeeColors[0]
    ).setStrokeStyle(1, 0xaaaaaa).setDepth(10);

    // Plus button
    this.plus = this.scene.add.text(
      this.x,
      this.y,
      '+',
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0.5).setInteractive().setDepth(11);

    // Click handler
    this.plus.on('pointerdown', () => {
      this.onUpgradeClick();
    });
  }

  /**
   * Handle upgrade button click
   */
  onUpgradeClick() {
    if (!this.scene.gameState?.wave.betweenWaves || !this.canUpgrade()) return;
    
    const cost = this.getNextUpgradeCost();
    if (this.scene.gameState.economy.money < cost) return;

    this.upgrade();
  }

  /**
   * Get effective spawn interval
   * @returns {number} Spawn interval in milliseconds
   */
  getEffectiveSpawnInterval() {
    const multiplier = this.spawnIntervalMultipliers[this.tier];
    return GameConfig.waves.baseSpawnInterval * multiplier;
  }
}

/**
 * Loader employee - loads packages from belt into vehicles
 */
export class Loader extends Employee {
  /**
   * @param {object} config - Loader configuration
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(config, scene) {
    super('loader', {
      maxTier: GameConfig.loader.maxTier,
      upgradeCosts: [...GameConfig.loader.upgradeCosts],
      operatingCosts: [...GameConfig.loader.operatingCosts],
    }, scene);
    
    this.id = config.id;
    this.covers = [...config.covers];
    this.stream = config.stream;
    
    // Position (calculated based on covered vehicle slots)
    const slotA = GameConfig.vehicleSlots[this.covers[0]];
    const slotB = GameConfig.vehicleSlots[this.covers[1]];
    this.x = (slotA.x + slotB.x) / 2;
    this.y = config.y;
  }

  /**
   * Create visual elements
   */
  createSprites() {
    // Employee circle
    this.circle = this.scene.add.circle(
      this.x,
      this.y,
      9,
      GameConfig.employeeColors[0]
    ).setStrokeStyle(1, 0xaaaaaa).setDepth(10);

    // Plus button
    this.plus = this.scene.add.text(
      this.x,
      this.y,
      '+',
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0.5).setInteractive().setDepth(11);

    // Click handler
    this.plus.on('pointerdown', () => {
      this.onUpgradeClick();
    });
  }

  /**
   * Handle upgrade button click
   */
  onUpgradeClick() {
    if (!this.scene.gameState?.wave.betweenWaves || !this.canUpgrade()) return;
    
    const cost = this.getNextUpgradeCost();
    if (this.scene.gameState.economy.money < cost) return;

    this.upgrade();
  }

  /**
   * Check if this loader can process a package
   * @param {object} pkg - Package to check
   * @returns {boolean} True if loader can process
   */
  canProcessPackage(pkg) {
    if (this.tier === 0) return false;
    if (this.stream !== pkg.stream) return false;
    return true;
  }

  /**
   * Check if a vehicle matches package requirements for this loader's tier
   * @param {object} vehicle - Vehicle to check
   * @param {object} pkg - Package to match
   * @returns {boolean} True if vehicle matches
   */
  vehicleMatchesPackage(vehicle, pkg) {
    if (this.tier === 0) return false;
    if (this.tier === 1) {
      return vehicle.shape === pkg.shape;
    }
    if (this.tier === 2) {
      return vehicle.shape === pkg.shape || vehicle.color === pkg.color;
    }
    return false;
  }
}