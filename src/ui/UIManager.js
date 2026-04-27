// =====================================================
// UIManager
// Manages all UI elements and HUD updates
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { formatCurrency } from '../utils/helpers.js';

/**
 * UIManager handles all UI rendering and updates
 */
export class UIManager {
  /**
   * @param {Phaser.Scene} scene - Phaser scene reference
   * @param {object} gameState - Reference to game state
   */
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;

    // UI element references
    this.hudPanel = null;
    this.waveText = null;
    this.moneyText = null;
    this.operatingCostText = null;

    this.waveCompletePanel = null;
    this.waveCompleteText = null;

    this.startWaveBtn = null;
    this.startWaveLbl = null;

    this.inboundTruckBody = null;
    this.inboundTruckText = null;

    // Event subscriptions
    this.eventSubscriptions = [];

    //Construct hud update
    this.create();
  }

  /**
   * Initialize all UI elements
   */
  create() {
    this.createHUD();
    this.createWaveCompletePanel();
    this.createStartButton();
    this.createInboundTruck();

    // Subscribe to events
    this.subscribeToEvents();

    // Initial update
    this.updateHUD();
    this.showBetweenWaveUI(true);
  }

  /**
   * Create the HUD panel (left side)
   */
  createHUD() {
    const hud = GameConfig.ui.hud;

    // Background panel
    this.hudPanel = this.scene.add.rectangle(
      hud.x,
      hud.y,
      hud.width,
      hud.height,
      0x1e1e1e
    ).setStrokeStyle(1, 0x555555);

    // Wave text
    this.waveText = this.scene.add.text(
      20,
      28,
      '',
      { fontSize: '14px', color: '#ffffff' }
    );

    // Money text
    this.moneyText = this.scene.add.text(
      20,
      46,
      '',
      { fontSize: '13px', color: '#ffffff' }
    );

    // Operating cost text
    this.operatingCostText = this.scene.add.text(
      20,
      62,
      '',
      { fontSize: '12px', color: '#cccccc' }
    );
  }

  /**
   * Create the wave complete panel (center top)
   */
  createWaveCompletePanel() {
    const wc = GameConfig.ui.waveComplete;
    const centerX = GameConfig.base.width / 2;

    this.waveCompletePanel = this.scene.add.rectangle(
      centerX,
      wc.y,
      wc.width,
      wc.height,
      0x1e1e1e
    ).setStrokeStyle(1, 0x555555);

    this.waveCompleteText = this.scene.add.text(
      centerX,
      wc.y,
      '',
      {
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: wc.width - 20 }
      }
    ).setOrigin(0.5);
  }

  /**
   * Create the start wave button
   */
  createStartButton() {
    const btn = GameConfig.ui.startButton;
    const centerX = GameConfig.base.width / 2;
    const startY = btn.y;

    this.startWaveBtn = this.scene.add.rectangle(
      centerX,
      startY,
      btn.width,
      btn.height,
      0x0066cc
    ).setInteractive();

    this.startWaveLbl = this.scene.add.text(
      centerX,
      startY,
      'START NEXT WAVE',
      { fontSize: '13px', color: '#ffffff' }
    ).setOrigin(0.5);

    // Click handler
    this.startWaveBtn.on('pointerdown', () => {
      this.onStartWaveClick();
    });
  }

  /**
   * Create the inbound truck display
   */
  createInboundTruck() {
    const INBOUND_TRUCK_Y = GameConfig.base.beltY - 60;

    this.inboundTruckBody = this.scene.add.rectangle(
      60,
      INBOUND_TRUCK_Y,
      70,
      38,
      0x555555
    ).setStrokeStyle(2, 0x999999).disableInteractive();

    this.inboundTruckText = this.scene.add.text(
      60,
      INBOUND_TRUCK_Y,
      '',
      { fontSize: '12px', color: '#ffffff' }
    ).setOrigin(0.5);
  }

  /**
   * Subscribe to game state events
   */
  subscribeToEvents() {
    const { events } = this.gameState;

    // Economy updates
    this.eventSubscriptions.push(
      events.on('economy:moneyChanged', () => this.updateHUD())
    );
    this.eventSubscriptions.push(
      events.on('economy:operatingCostChanged', () => this.updateHUD())
    );

    // Wave updates
    this.eventSubscriptions.push(
      events.on('wave:started', () => this.onWaveStarted())
    );
    this.eventSubscriptions.push(
      events.on('wave:ended', (results) => this.onWaveEnded(results))
    );
    this.eventSubscriptions.push(
      events.on('wave:inboundTruckUpdate', (data) => this.updateInboundTruck(data.remaining))
    );

    // Employee updates
    this.eventSubscriptions.push(
      events.on('employee:upgraded', () => this.updateHUD())
    );
    this.eventSubscriptions.push(
      events.on('employee:downgraded', () => this.updateHUD())
    );
  }

  /**
   * Handle start wave button click
   */
  onStartWaveClick() {
    if (this.gameState.wave.betweenWaves) {
      this.gameState.startWave();
    }
  }

  /**
   * Handle wave started event
   */
  onWaveStarted() {
    this.showBetweenWaveUI(false);
    this.updateInboundTruck(
      this.gameState.wave.packageLimit - this.gameState.wave.packagesSpawned
    );
  }

  /**
   * Handle wave ended event
   * @param {object} results - Wave results
   */
  onWaveEnded(results) {
    const text = `WAVE ${results.waveNumber} COMPLETE\n` +
                 `Revenue: ${formatCurrency(results.revenue)}\n` +
                 `Missed: ${results.missed} (-${formatCurrency(results.penalty)})`;
    
    this.waveCompleteText.setText(text);
    this.showBetweenWaveUI(true);
    this.updateInboundTruck(0);
  }

  /**
   * Update the HUD display
   */
  updateHUD() {
    this.waveText.setText(`Wave: ${this.gameState.wave.current}`);
    this.moneyText.setText(`Money: ${formatCurrency(this.gameState.economy.money)}`);
    this.operatingCostText.setText(`Operating Cost: ${formatCurrency(this.gameState.economy.operatingCost)}`);
  }

  /**
   * Update the inbound truck display
   * @param {number} remaining - Remaining packages
   */
  updateInboundTruck(remaining) {
    if (!this.gameState.wave.active) {
      this.inboundTruckText.setText('');
    } else {
      this.inboundTruckText.setText(`${Math.max(0, remaining)}`);
    }
  }

  /**
   * Show or hide between-wave UI elements
   * @param {boolean} show - Whether to show or hide
   */
  showBetweenWaveUI(show) {
    // HUD is always visible
    this.hudPanel.setVisible(true);
    this.waveText.setVisible(true);
    this.moneyText.setVisible(true);
    this.operatingCostText.setVisible(true);

    // Wave complete panel and start button
    this.waveCompletePanel.setVisible(show);
    this.waveCompleteText.setVisible(show);
    this.startWaveBtn.setVisible(show);
    this.startWaveLbl.setVisible(show);

    // Vehicle upgrade buttons
    this.gameState.vehicles.forEach(vehicle => {
      vehicle.setVisible(true); // Always show vehicle bodies
      
      // Show/hide upgrade and buy buttons
      if (vehicle.upgradeButton) {
        vehicle.upgradeButton.setVisible(show && vehicle.active);
      }
      if (vehicle.upgradeButtonLabel) {
        vehicle.upgradeButtonLabel.setVisible(show && vehicle.active);
      }
      if (vehicle.buyButton) {
        vehicle.buyButton.setVisible(show && !vehicle.active);
      }
      if (vehicle.buyButtonLabel) {
        vehicle.buyButtonLabel.setVisible(show && !vehicle.active);
      }
    });

    // Employee upgrade buttons
    this.gameState.employees.unloader.setVisible(show);
    this.gameState.employees.loaders.forEach(loader => {
      loader.setVisible(show);
    });
  }

  /**
   * Destroy all UI elements and cleanup
   */
  destroy() {
    // Unsubscribe from events
    this.eventSubscriptions.forEach(sub => sub?.remove?.());
    this.eventSubscriptions = [];

    // Destroy HUD elements
    if (this.hudPanel) { this.hudPanel.destroy(); this.hudPanel = null; }
    if (this.waveText) { this.waveText.destroy(); this.waveText = null; }
    if (this.moneyText) { this.moneyText.destroy(); this.moneyText = null; }
    if (this.operatingCostText) { this.operatingCostText.destroy(); this.operatingCostText = null; }

    // Destroy wave complete elements
    if (this.waveCompletePanel) { this.waveCompletePanel.destroy(); this.waveCompletePanel = null; }
    if (this.waveCompleteText) { this.waveCompleteText.destroy(); this.waveCompleteText = null; }

    // Destroy start button elements
    if (this.startWaveBtn) { this.startWaveBtn.destroy(); this.startWaveBtn = null; }
    if (this.startWaveLbl) { this.startWaveLbl.destroy(); this.startWaveLbl = null; }

    // Destroy inbound truck elements
    if (this.inboundTruckBody) { this.inboundTruckBody.destroy(); this.inboundTruckBody = null; }
    if (this.inboundTruckText) { this.inboundTruckText.destroy(); this.inboundTruckText = null; }
  }
}
