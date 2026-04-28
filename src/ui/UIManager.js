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
  constructor(scene, gameState, saveManager = null) {
    this.scene = scene;
    this.gameState = gameState;

    // Save/load manager (optional)
    this.saveManager = saveManager;

    // UI element references
    this.hudPanel = null;
    this.waveText = null;
    this.moneyText = null;
    this.operatingCostText = null;

    this.waveCompletePanel = null;
    this.waveCompleteText = null;

    this.startWaveBtn = null;
    this.startWaveLbl = null;

    this.saveBtn = null;
    this.saveLbl = null;
    this.loadBtn = null;
    this.loadLbl = null;
    this.saveLoadStatusText = null;

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
    this.createSaveLoadButtons();
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

    // Save/Load feedback events
    this.gameState.events.on('state:saved', () => {
      this.showSaveLoadMessage('Saved', '#c8ffc8');
      this.updateSaveLoadButtons();
    });
    this.gameState.events.on('state:loaded', () => {
      this.showSaveLoadMessage('Loaded', '#c8c8ff');
      this.updateHUD();
      this.updateSaveLoadButtons();
    });
    this.gameState.events.on('state:saveFailed', (d) => {
      const r = d?.reason || 'save_failed';
      this.showSaveLoadMessage('Save failed: ' + r, '#ffaaaa', 2200);
      this.updateSaveLoadButtons();
    });
    this.gameState.events.on('state:loadFailed', (d) => {
      const r = d?.reason || 'load_failed';
      this.showSaveLoadMessage('Load failed: ' + r, '#ffaaaa', 2200);
      this.updateSaveLoadButtons();
    });
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

    this.updateSaveLoadButtons();
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

    // Employee upgrade buttons ONLY (circles always visible)

    // Unloader upgrade button
    const unloader = this.gameState.employees.unloader;
    if (unloader && unloader.plus) {
      unloader.plus.setVisible(show);
    }

    // Loader upgrade buttons
    this.gameState.employees.loaders.forEach(loader => {
      if (loader.plus) {
        loader.plus.setVisible(show);
      }
    }); 
  }

/**
 * Create Save / Load buttons (between waves only)
 */
createSaveLoadButtons() {
  if (!this.saveManager) return;

  const btn = GameConfig.ui.startButton;
  const centerX = GameConfig.base.width / 2;
  const y = btn.y + 38;
  const w = 92;
  const h = 26;
  const gap = 14;

  this.saveBtn = this.scene.add.rectangle(
    centerX - (w / 2 + gap / 2),
    y,
    w,
    h,
    0x2a3b2a
  ).setStrokeStyle(1, 0x55aa55)
   .setInteractive({ useHandCursor: true });

  this.saveLbl = this.scene.add.text(
    centerX - (w / 2 + gap / 2),
    y,
    'SAVE',
    { fontSize: '12px', color: '#c8ffc8' }
  ).setOrigin(0.5);

  this.loadBtn = this.scene.add.rectangle(
    centerX + (w / 2 + gap / 2),
    y,
    w,
    h,
    0x2a2a3b
  ).setStrokeStyle(1, 0x5555aa)
   .setInteractive({ useHandCursor: true });

  this.loadLbl = this.scene.add.text(
    centerX + (w / 2 + gap / 2),
    y,
    'LOAD',
    { fontSize: '12px', color: '#c8c8ff' }
  ).setOrigin(0.5);

  this.saveBtn.on('pointerdown', () => {
    if (!this.gameState.isBetweenWaves()) return;
    this.saveManager.save();
  });

  this.loadBtn.on('pointerdown', () => {
    if (!this.gameState.isBetweenWaves()) return;
    this.saveManager.load();
  });
}

updateSaveLoadButtons() {
  // If you are not using save/load in this build, do nothing.
  if (!this.saveManager || !this.saveBtn || !this.loadBtn) return;

  // Between-waves gating (your policy: no mid-wave load/save)
  const between = (typeof this.gameState.isBetweenWaves === 'function')
    ? this.gameState.isBetweenWaves()
    : (this.gameState.wave?.betweenWaves && !this.gameState.wave?.active);

  const has = (typeof this.saveManager.hasSave === 'function')
    ? this.saveManager.hasSave()
    : false;

  // Visual gating
  const saveAlpha = between ? 1 : 0.35;
  const loadAlpha = (between && has) ? 1 : 0.35;

  this.saveBtn.setAlpha(saveAlpha);
  this.saveLbl?.setAlpha(saveAlpha);

  this.loadBtn.setAlpha(loadAlpha);
  this.loadLbl?.setAlpha(loadAlpha);

  // Interaction gating
  if (this.saveBtn.input) this.saveBtn.input.enabled = !!between;
  if (this.loadBtn.input) this.loadBtn.input.enabled = !!(between && has);
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
