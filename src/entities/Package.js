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
    this.manualIntent = false;
    
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
    this.manualIntent = true;
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

  // ---- belt movement ----
  const speed = GameConfig.base.beltSpeed;
  const movement = (speed * delta) / 1000;
    
  this.body.x += movement;
  this.overlay.x = this.body.x;
  this.outline.x = this.body.x;

  // ---- miss logic ----
  if (this.body.x >= GameConfig.base.beltEndX) {
    this.missed = true;
    this.body.x = GameConfig.base.beltEndX;
    this.overlay.x = GameConfig.base.beltEndX;
    this.outline.setVisible(false);

    if (this.scene.gameState?.selectedPackage === this) {
      this.scene.gameState.deselectPackage();
    }
    return;
  }

  // =================================================
  // LOAD WINDOW GATE (THIS RESTORES 0.6.30)
  // =================================================
  const vehicles = this.scene.gameState.vehicles;
  let nearLoadWindow = false;

  for (const v of vehicles) {
    const slot = GameConfig.vehicleSlots[v.slotIndex];
    if (isWithinProximity(this.body.x, slot.x)) {
      nearLoadWindow = true;
      break;
    }
  }

  if (!nearLoadWindow) {
    // Cannot load yet; selection exists but no execution
    return;
  }

  // =================================================
  // CONSUME SELECTION AT LOAD WINDOW EDGE
  // =================================================
  if (this.selected) {
    this.scene.gameState.deselectPackage();
  }

  // =================================================
  // NOW attempt loading ONCE
  // =================================================
  this.tryLoad(
    this.scene.gameState.vehicles,
    this.scene.gameState.employees.loaders
  );
}
  /**
   * Try to load this package into a vehicle
   * Handles both assigned vehicle and automatic loading via loaders
   * @param {Array} vehicles - All vehicles
   * @param {Array} loaders - All loaders
   */
 
tryLoad(vehicles, loaders) {
  if (this.loaded || this.missed) return;

  // Resolve manual intent ONCE
  if (this.manualIntent && this.assignedVehicle) {
    this.manualIntent = false;
    
    if (this.selected) {
      this.selected = false;
      this.outline.setVisible(false);
    }

    if (this.tryLoadIntoVehicle(this.assignedVehicle)) {
      return;
    }
  }

  // Otherwise auto-sort
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
