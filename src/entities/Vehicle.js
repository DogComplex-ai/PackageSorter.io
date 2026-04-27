// =====================================================
// Vehicle Entity
// Represents a loading vehicle/truck
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { getRandomShapeForStream, getRandomColor, formatCurrency } from '../utils/helpers.js';

/**
 * Vehicle class representing a loading truck/vehicle
 */
export class Vehicle {
  /**
   * @param {number} slotIndex - Index in the vehicle slots array
   * @param {Phaser.Scene} scene - Phaser scene reference
   */
  constructor(slotIndex, scene) {
    const slot = GameConfig.vehicleSlots[slotIndex];
    
    this.slotIndex = slotIndex;
    this.scene = scene;
    this.stream = slot.stream;
    
    // State
    this.active = slot.cost === 0;
    this.unlockCost = slot.cost;
    this.shape = null;
    this.color = null;
    this.capacity = GameConfig.vehicle.baseCapacity;
    this.upgrades = 0;
    this.loaded = [];
    
    // Visual elements
    this.body = null;
    this.label = null;
    this.buyButton = null;
    this.buyButtonLabel = null;
    this.upgradeButton = null;
    this.upgradeButtonLabel = null;
    
    // Position
    this.x = slot.x;
    this.y = slot.y;
  }

  /**
   * Create the visual elements for the vehicle
   */
  createSprites() {
    const size = GameConfig.vehicle.size;
    
    // Vehicle body
    this.body = this.scene.add.rectangle(
      this.x,
      this.y,
      size.width,
      size.height,
      this.active ? 0x222222 : 0x333333
    ).setInteractive();

    // Vehicle label (shows shape, color, and load status)
    this.label = this.scene.add.text(
      this.x,
      this.y,
      '',
      { fontSize: '10px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setVisible(this.active);

    // Click handler for loading packages
    this.body.on('pointerdown', () => {
      this.onClick();
    });

    // Buy button (only for inactive vehicles)
    if (!this.active) {
      this.createBuyButton();
    }

    // Upgrade button
    this.createUpgradeButton();
  }

  /**
   * Create the buy button for inactive vehicles
   */
  createBuyButton() {
    this.buyButton = this.scene.add.rectangle(
      this.x,
      this.y,
      80,
      20,
      0x008800
    ).setInteractive();

    this.buyButtonLabel = this.scene.add.text(
      this.x,
      this.y,
      formatCurrency(this.unlockCost),
      { fontSize: '12px', color: '#ffffff' }
    ).setOrigin(0.5);

    this.buyButton.on('pointerdown', () => {
      this.onBuyClick();
    });
  }

  /**
   * Create the upgrade button
   */
  createUpgradeButton() {
    const offset = GameConfig.ui.upgradeButtonOffset;
    const size = GameConfig.ui.upgradeButtonSize;
    
    this.upgradeButton = this.scene.add.rectangle(
      this.x,
      this.y + offset,
      size.width,
      size.height,
      0x3a4fa3
    ).setInteractive();

    this.upgradeButtonLabel = this.scene.add.text(
      this.x,
      this.y + offset,
      '+2',
      { fontSize: '12px', color: '#ffffff' }
    ).setOrigin(0.5);

    this.upgradeButton.on('pointerdown', () => {
      this.onUpgradeClick();
    });
  }

  /**
   * Handle vehicle body click
   */
  onClick() {
    if (!this.scene.gameState?.wave.active || !this.active) return;
    
    const selectedPackage = this.scene.gameState.selectedPackage;
    if (selectedPackage) {
      selectedPackage.assignedVehicle = this;

    // IMMEDIATELY clear selection after assignment
    this.scene.gameState.deselectPackage();

    }
  }

  /**
   * Handle buy button click
   */
  onBuyClick() {
    if (this.active) return;
    
    const gameState = this.scene.gameState;
    if (!gameState || !gameState.wave.betweenWaves) return;
    if (gameState.economy.money < this.unlockCost) return;

    // Deduct cost and activate vehicle
    gameState.addMoney(-this.unlockCost);
    this.active = true;
    
    // Update visual appearance
    this.body.setFillStyle(0x222222);
    this.label.setText(this.getLabelText());
    this.label.setVisible(true);

    // Remove buy button
    if (this.buyButton) {
      this.buyButton.destroy();
      this.buyButton = null;
    }
    if (this.buyButtonLabel) {
      this.buyButtonLabel.destroy();
      this.buyButtonLabel = null;
    }

    // Update HUD
    gameState.events.emit('economy:moneyChanged', { 
      newBalance: gameState.economy.money 
    });
  }

  /**
   * Handle upgrade button click
   */
  onUpgradeClick() {
    if (!this.active) return;
    
    const gameState = this.scene.gameState;
    if (!gameState || !gameState.wave.betweenWaves) return;

    const cost = this.getUpgradeCost();
    if (gameState.economy.money < cost) return;

    // Deduct cost and upgrade
    gameState.addMoney(-cost);
    this.upgrades++;
    this.capacity += GameConfig.economy.vehicleCapacityIncreasePerUpgrade;

    // Update label
    this.label.setText(this.getLabelText());

    // Update HUD
    gameState.events.emit('economy:moneyChanged', { 
      newBalance: gameState.economy.money 
    });
  }

  /**
   * Get the cost to upgrade this vehicle
   * @returns {number} Upgrade cost
   */
  getUpgradeCost() {
    return GameConfig.economy.vehicleUpgradeBaseCost + 
           (this.upgrades * GameConfig.economy.vehicleUpgradeCostIncrease);
  }

  /**
   * Get the label text for this vehicle
   * @returns {string} Label text
   */
  getLabelText() {
    const shapeSymbol = this.shape ? (GameConfig.shapes[this.shape]?.symbol || '') : '';
    return `${shapeSymbol}\n${this.color || ''}\n${this.loaded.length}/${this.capacity}`;
  }

  /**
   * Update the vehicle label
   */
  updateLabel() {
    if (this.label) {
      this.label.setText(this.getLabelText());
    }
  }

  /**
   * Assign a random shape and color to this vehicle (called at wave start)
   */
  assignShapeAndColor() {
    this.shape = getRandomShapeForStream(this.stream);
    this.color = getRandomColor().name;
    this.updateLabel();
  }

  /**
   * Set visibility of all visual elements
   * @param {boolean} visible - Visibility state
   */
  setVisible(visible) {
    if (this.body) this.body.setVisible(visible);
    if (this.label) this.label.setVisible(visible && this.active);
    if (this.upgradeButton) this.upgradeButton.setVisible(visible && this.active);
    if (this.upgradeButtonLabel) this.upgradeButtonLabel.setVisible(visible && this.active);
    if (this.buyButton) this.buyButton.setVisible(visible && !this.active);
    if (this.buyButtonLabel) this.buyButtonLabel.setVisible(visible && !this.active);
  }

  /**
   * Destroy all visual elements
   */
  destroy() {
    if (this.body) {
      this.body.destroy();
      this.body = null;
    }
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    if (this.buyButton) {
      this.buyButton.destroy();
      this.buyButton = null;
    }
    if (this.buyButtonLabel) {
      this.buyButtonLabel.destroy();
      this.buyButtonLabel = null;
    }
    if (this.upgradeButton) {
      this.upgradeButton.destroy();
      this.upgradeButton = null;
    }
    if (this.upgradeButtonLabel) {
      this.upgradeButtonLabel.destroy();
      this.upgradeButtonLabel = null;
    }
  }

  /**
   * Check if this vehicle can accept a package
   * @param {object} pkg - Package to check
   * @param {number} loaderTier - Loader tier (0 = no loader)
   * @returns {boolean} True if package can be loaded
   */
  canAcceptPackage(pkg, loaderTier) {
    if (!this.active || this.loaded.length >= this.capacity) {
      return false;
    }

    if (loaderTier === 1 && this.shape !== pkg.shape) {
      return false;
    }

    if (loaderTier === 2 && !(this.shape === pkg.shape || this.color === pkg.color)) {
      return false;
    }

    return true;
  }
}
