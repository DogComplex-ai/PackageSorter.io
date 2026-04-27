// =====================================================
// Package Entity
// Represents a package on the conveyor belt
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { isWithinProximity } from '../utils/helpers.js';

/**
 * Package class representing a single package on the belt
 */
export class Package {
  /**
   * @param {string} shape - Package shape name
   * @param {string} colorName - Color name
   * @param {number} colorValue - Color hex value
   * @param {string} stream - Stream identifier (A or B)
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(shape, colorName, colorValue, stream, scene) {
    this.shape = shape;
    this.color = colorName;
    this.colorValue = colorValue;
    this.stream = stream;
    this.scene = scene;
    
    // State
    this.loaded = false;
    this.missed = false;
    this.selected = false;
    this.assignedVehicle = null;
    
    // Symbol from shape definition
    this.symbol = GameConfig.shapes[shape]?.symbol || '?';
    
    // Create visual elements
    this.createSprites();
  }

  /**
   * Create the visual sprites for the package
   */
  createSprites() {
    const config = GameConfig.package;
    
    // Main body rectangle
    this.body = this.scene.add.rectangle(
      config.spawnX,
      GameConfig.base.packageLaneY,
      config.size,
      config.size,
      this.colorValue
    ).setInteractive();

    // Shape symbol overlay
    this.overlay = this.scene.add.text(
      config.spawnX,
      GameConfig.base.packageLaneY,
      this.symbol,
      { fontSize: '14px', color: '#000000' }
    ).setOrigin(0.5);

    // Selection outline
    this.outline = this.scene.add.rectangle(
      config.spawnX,
      GameConfig.base.packageLaneY,
      config.outlineSize,
      config.outlineSize
    ).setStrokeStyle(2, 0xffffff).setVisible(false);

    // Setup click handler
    this.body.on('pointerdown', () => {
      this.onClick();
    });
  }

  /**
   * Handle package click
   */
  onClick() {
    if (!this.scene.gameState?.wave.active) return;
    this.scene.gameState.selectPackage(this);
  }

  /**
   * Select this package (show outline)
   */
  select() {
    this.selected = true;
    this.outline.setVisible(true);
  }

  /**
   * Deselect this package (hide outline)
   */
  deselect() {
    this.selected = false;
    this.outline.setVisible(false);
  }

  /**
   * Update package position (move along belt)
   * @param {number} delta - Time delta in milliseconds
   */
  update(delta) {
    if (this.loaded || this.missed) return;

    const speed = GameConfig.base.beltSpeed;
    const movement = (speed * delta) / 1000;
    
    this.body.x += movement;
    this.overlay.x = this.body.x;
    this.outline.x = this.body.x;

    // Check if package reached end of belt
    if (this.body.x >= GameConfig.base.beltEndX) {
      this.missed = true;
      this.body.x = GameConfig.base.beltEndX;
      this.overlay.x = GameConfig.base.beltEndX;
      this.outline.setVisible(false);
      
      // Deselect if this was the selected package
      if (this.scene.gameState?.selectedPackage === this) {
        this.scene.gameState.deselectPackage();
      }
    }
  }

  /**
   * Try to load this package into a vehicle
   * Handles both assigned vehicle and automatic loading via loaders
   * @param {Array} vehicles - All vehicles
   * @param {Array} loaders - All loaders
   */

tryLoad(vehicles, loaders) {
  // Absolute safety: loading must never block movement
  try {
    if (this.loaded || this.missed) return;

    // ================================
    // MANUAL ASSIGNMENT (authoritative)
    // ================================
    if (this.assignedVehicle) {
      const vehicle = this.assignedVehicle;

      // INVALID forever → clear and allow fallback
      if (!vehicle.active || vehicle.loaded.length >= vehicle.capacity) {
        this.assignedVehicle = null;
      } else {
        // VALID assignment → try to load
        if (this.tryLoadIntoVehicle(vehicle)) {
          return; // success
        }

        // VALID but pending → block auto-sort, keep belt moving
        return;
      }
    }

    // ================================
    // AUTO SORTING (only if no manual)
    // ================================
    this.tryAutoLoad(vehicles, loaders);

  } catch (err) {
    console.error('Package load error — continuing belt', err);

    // Fail-safe reset: never freeze the game
    this.assignedVehicle = null;
    return;
  }
}

    // Try automatic loading via loaders
    this.tryAutoLoad(vehicles, loaders);
  }

  /**
   * Try to load into a specific vehicle
   * @param {object} vehicle - Target vehicle
   * @returns {boolean} True if loaded successfully
   */
  tryLoadIntoVehicle(vehicle) {
    if (!vehicle.active || vehicle.loaded.length >= vehicle.capacity) {
      return false;
    }

    const slot = GameConfig.vehicleSlots[vehicle.slotIndex];
    if (!isWithinProximity(this.body.x, slot.x)) {
      return false;
    }

    // Load the package
    this.completeLoad(vehicle);
    return true;
  }

  /**
   * Try automatic loading via loaders
   * @param {Array} vehicles - All vehicles
   * @param {Array} loaders - All loaders
   */
  tryAutoLoad(vehicles, loaders) {
    for (const loader of loaders) {
      if (this.loaded) break;
      if (loader.tier === 0 || loader.stream !== this.stream) continue;

      for (const slotIndex of loader.covers) {
        if (this.loaded) break;
        
        const vehicle = vehicles[slotIndex];
        if (!vehicle.active || vehicle.loaded.length >= vehicle.capacity) continue;

        const slot = GameConfig.vehicleSlots[vehicle.slotIndex];
        if (!isWithinProximity(this.body.x, slot.x)) continue;

        // Check loader tier restrictions
        if (loader.tier === 1 && vehicle.shape !== this.shape) continue;
        if (loader.tier === 2 && !(vehicle.shape === this.shape || vehicle.color === this.color)) continue;

        // Load the package
        this.completeLoad(vehicle);
        break;
      }
    }
  }

  /**
   * Complete the loading process
   * @param {object} vehicle - Vehicle to load into
   */
  completeLoad(vehicle) {
    this.loaded = true;
    vehicle.loaded.push(this);
    
    // Update vehicle label
    if (vehicle.updateLabel) {
      vehicle.updateLabel();
    }

    // Destroy visual elements
    this.destroy();

    // Deselect if this was selected
    if (this.scene.gameState?.selectedPackage === this) {
      this.scene.gameState.deselectPackage();
    }
  }

  /**
   * Destroy visual elements
   */
  destroy() {
    if (this.body) {
      this.body.destroy();
      this.body = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.outline) {
      this.outline.destroy();
      this.outline = null;
    }
  }

  /**
   * Get the X position of the package
   * @returns {number} X position
   */
  get x() {
    return this.body?.x || 0;
  }

  /**
   * Get the Y position of the package
   * @returns {number} Y position
   */
  get y() {
    return this.body?.y || 0;
  }
}
