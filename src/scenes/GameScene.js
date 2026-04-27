// =====================================================
// GameScene
// Main Phaser scene that orchestrates all game systems
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { GameState } from '../state/GameState.js';
import { Vehicle } from '../entities/Vehicle.js';
import { Unloader } from '../entities/Employee.js';
import { Loader } from '../entities/Employee.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { UIManager } from '../ui/UIManager.js';

/**
 * Main game scene that initializes and manages all game systems
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    
    // Game systems
    this.gameState = null;
    this.waveSystem = null;
    this.uiManager = null;
    
    // Visual elements
    this.belt = null;
  }

  /**
   * Preload assets (none needed for this game - all procedural)
   */
  preload() {
    // No assets to preload - all graphics are procedural
  }

  /**
   * Create the game world and initialize all systems
   */
  create() {
    // Initialize game state
    this.gameState = new GameState();
    
    // Make gameState available to all entities
    this.gameState.scene = this;

    // Create the conveyor belt
    this.createBelt();

    // Initialize vehicles
    this.initializeVehicles();

    // Initialize employees
    this.initializeEmployees();

    // Initialize systems
    this.waveSystem = new WaveSystem(this.gameState, this);
    this.uiManager = new UIManager(this, this.gameState);

    // Setup event handlers
    this.setupEventHandlers();

  }

  /**
   * Create the conveyor belt visual
   */
  createBelt() {
    this.belt = this.add.rectangle(
      GameConfig.base.width / 2,
      GameConfig.base.beltY,
      GameConfig.base.width - 40,
      40,
      0x444444
    );
  }

  /**
   * Initialize all vehicles
   */
  initializeVehicles() {
    for (let i = 0; i < GameConfig.vehicleSlots.length; i++) {
      const vehicle = new Vehicle(i, this);
      vehicle.createSprites();
      this.gameState.vehicles.push(vehicle);
    }
  }

  /**
   * Initialize all employees
   */
  initializeEmployees() {
    // Create unloader
    const unloader = new Unloader(this);
    unloader.createSprites();
    this.gameState.employees.unloader = unloader;

    // Create loaders
    this.gameState.employees.loaders = GameConfig.loader.definitions.map(def => {
      const loader = new Loader(def, this);
      loader.createSprites();
      return loader;
    });
  }

  /**
   * Setup global event handlers
   */
  setupEventHandlers() {
    // Handle game state events
    this.gameState.events.on('wave:started', () => {
      console.log('Wave started:', this.gameState.wave.current);
    });

    this.gameState.events.on('wave:ended', (results) => {
      console.log('Wave ended:', results);
    });

    this.gameState.events.on('economy:insufficientFunds', (data) => {
      console.warn('Insufficient funds:', data);
    });
  }

  /**
   * Update game state each frame
   * @param {number} time - Current time
   * @param {number} delta - Time since last frame in milliseconds
   */
  update(time, delta) {
    // Update wave system
    if (this.waveSystem) {
      this.waveSystem.update(delta);
    }
  }

  /**
   * Shutdown the scene and cleanup
   */
  shutdown() {
    // Cleanup UI
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }

    // Cleanup vehicles
    if (this.gameState) {
      this.gameState.vehicles.forEach(vehicle => {
        vehicle.destroy();
      });
      this.gameState.vehicles = [];

      // Cleanup employees
      if (this.gameState.employees.unloader) {
        this.gameState.employees.unloader.destroy();
      }
      this.gameState.employees.loaders.forEach(loader => {
        loader.destroy();
      });
      this.gameState.employees.loaders = [];

      // Cleanup packages
      this.gameState.packages.forEach(pkg => {
        pkg.destroy();
      });
      this.gameState.packages = [];
    }
  }

  /**
   * Restart the game
   */
  restartGame() {
    // Reset game state
    this.gameState.initialize();
    this.gameState.scene = this;

    // Recreate vehicles
    this.gameState.vehicles.forEach(vehicle => {
      vehicle.destroy();
    });
    this.gameState.vehicles = [];
    this.initializeVehicles();

    // Recreate employees
    this.initializeEmployees();

    // Recreate UI
    this.uiManager.destroy();
    this.uiManager = new UIManager(this, this.gameState);

    // Recreate wave system
    this.waveSystem = new WaveSystem(this.gameState, this);
  }
}
