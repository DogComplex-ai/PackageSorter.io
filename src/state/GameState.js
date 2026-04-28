// =====================================================
// GameState - Centralized State Management
// Manages all game state with validation and events
// =====================================================

import { GameConfig } from '../config/gameConfig.js';
import { deepClone } from '../utils/helpers.js';

/**
 * Event Manager for decoupled communication between systems
 */
export class EventManager {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = {}) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback to remove
   */
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

/**
 * Main Game State Manager
 */
export class GameState {
  constructor() {
    this.events = new EventManager();
    this.initialize();
  }

  /**
   * Initialize or reset game state to default values
   */
  initialize() {
    // Wave state
    this.wave = {
      current: 1,
      active: false,
      betweenWaves: true,
      packagesSpawned: 0,
      packageLimit: GameConfig.waves.initialPackageLimit,
      spawnTimer: 0,
    };

    // Economy state
    this.economy = {
      money: GameConfig.economy.startMoney,
      operatingCost: 0,
    };

    // Collections
    this.packages = [];
    this.vehicles = [];
    this.selectedPackage = null;

    // Employees
    this.employees = {
      unloader: this.createUnloader(),
      loaders: this.createLoaders(),
    };

    this.updateOperatingCost();
  }

  /**
   * Create unloader employee object
   * @returns {object} Unloader configuration
   */
  createUnloader() {
    return {
      tier: 0,
      maxTier: GameConfig.unloader.maxTier,
      upgradeCosts: [...GameConfig.unloader.upgradeCosts],
      operatingCosts: [...GameConfig.unloader.operatingCosts],
      spawnIntervalMultipliers: [...GameConfig.unloader.spawnIntervalMultipliers],
    };
  }

  /**
   * Create loader employees
   * @returns {Array} Array of loader configurations
   */
  createLoaders() {
    return GameConfig.loader.definitions.map(def => ({
      id: def.id,
      covers: [...def.covers],
      stream: def.stream,
      tier: 0,
      maxTier: GameConfig.loader.maxTier,
      upgradeCosts: [...GameConfig.loader.upgradeCosts],
      operatingCosts: [...GameConfig.loader.operatingCosts],
    }));
  }

  // ==========================================
  // Economy Methods
  // ==========================================

  /**
   * Add money to player
   * @param {number} amount - Amount to add (can be negative)
   * @returns {boolean} True if transaction successful
   */
  addMoney(amount) {
    if (amount === 0) return true;
    
    const newBalance = this.economy.money + amount;
    if (newBalance < 0) {
      this.events.emit('economy:insufficientFunds', { 
        current: this.economy.money, 
        required: Math.abs(amount) 
      });
      return false;
    }

    this.economy.money = newBalance;
    this.events.emit('economy:moneyChanged', { 
      amount, 
      newBalance: this.economy.money 
    });
    return true;
  }

  /**
   * Calculate total operating cost
   * @returns {number} Total operating cost per wave
   */
  calculateOperatingCost() {
    let total = this.employees.unloader.operatingCosts[this.employees.unloader.tier];
    this.employees.loaders.forEach(loader => {
      total += loader.operatingCosts[loader.tier];
    });
    return total;
  }

  /**
   * Update stored operating cost
   */
  updateOperatingCost() {
    this.economy.operatingCost = this.calculateOperatingCost();
    this.events.emit('economy:operatingCostChanged', { 
      operatingCost: this.economy.operatingCost 
    });
  }

  /**
   * Downgrade the highest cost unit to reduce operating costs
   * @returns {object|null} Downgrade info or null if no downgrade possible
   */
  downgradeHighestCostUnit() {
    const candidates = [];

    // Check unloader
    if (this.employees.unloader.tier > 0) {
      candidates.push({
        type: 'unloader',
        cost: this.employees.unloader.operatingCosts[this.employees.unloader.tier],
        currentTier: this.employees.unloader.tier,
      });
    }

    // Check loaders
    this.employees.loaders.forEach((loader, index) => {
      if (loader.tier > 0) {
        candidates.push({
          type: 'loader',
          index,
          cost: loader.operatingCosts[loader.tier],
          currentTier: loader.tier,
        });
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    // Sort by cost descending and pick highest
    candidates.sort((a, b) => b.cost - a.cost);
    const target = candidates[0];

    if (target.type === 'unloader') {
      this.employees.unloader.tier--;
    } else {
      this.employees.loaders[target.index].tier--;
    }

    this.updateOperatingCost();
    
    this.events.emit('employee:downgraded', target);
    return target;
  }

  // ==========================================
  // Wave Methods
  // ==========================================

  /**
   * Start a new wave
   * @returns {boolean} True if wave started successfully
   */
  startWave() {
    if (!this.wave.betweenWaves) {
      return false;
    }

    const operatingCost = this.calculateOperatingCost();
    
    // Try to afford operating cost, downgrading if necessary
    while (this.economy.money < operatingCost) {
      if (!this.downgradeHighestCostUnit()) {
        this.events.emit('wave:startFailed', { reason: 'insufficient_funds' });
        return false;
      }
    }

    // Deduct operating cost
    this.addMoney(-operatingCost);

    // Update wave state
    this.wave.active = true;
    this.wave.betweenWaves = false;
    this.wave.packagesSpawned = 0;
    this.wave.spawnTimer = 0;

    // Assign shapes and colors to active vehicles
    this.vehicles.forEach(vehicle => {
      if (vehicle.active) {
        vehicle.assignShapeAndColor();
      }
    });

    this.events.emit('wave:started', { 
      waveNumber: this.wave.current,
      packageLimit: this.wave.packageLimit,
    });

    return true;
  }

  /**
   * End the current wave
   * @returns {object} Wave results
   */
  endWave() {
    this.wave.active = false;
    this.wave.betweenWaves = true;

    // Calculate results
    let revenue = 0;
    let missed = 0;

    this.packages.forEach(pkg => {
      if (!pkg.loaded) missed++;
    });

    this.vehicles.forEach(vehicle => {
      revenue += vehicle.loaded.length * GameConfig.economy.packageRevenue;
    });

    const penalty = missed * GameConfig.economy.missedPenaltyPerPackage;
    const netChange = revenue - penalty;

    // Apply money changes
    this.addMoney(netChange);

    // Clear packages
    this.packages.forEach(pkg => pkg.destroy());
    this.packages = [];
    this.selectedPackage = null;

    // Prepare next wave
    this.wave.current++;
    this.wave.packageLimit += GameConfig.waves.packageIncreasePerWave;

    // Clear vehicle loads
    this.vehicles.forEach(vehicle => {
      vehicle.loaded = [];
      vehicle.shape = null;
      vehicle.color = null;
    });

    const results = {
      waveNumber: this.wave.current - 1,
      revenue,
      missed,
      penalty,
      netChange,
      newMoney: this.economy.money,
    };

    this.events.emit('wave:ended', results);
    return results;
  }

  /**
   * Select a package
   * @param {object} pkg - Package to select
   */
  selectPackage(pkg) {
    if (this.selectedPackage) {
      this.selectedPackage.deselect();
    }
    this.selectedPackage = pkg;
    if (pkg) {
      pkg.select();
    }
    this.events.emit('package:selected', { package: pkg });
  }

  /**
   * Deselect current package
   */
  deselectPackage() {
    if (this.selectedPackage) {
      this.selectedPackage.deselect();
      this.selectedPackage = null;
      this.events.emit('package:deselected');
    }
  }

  /**
   * Get all active vehicles for a stream
   * @param {string} stream - Stream identifier
   * @returns {Array} Active vehicles for the stream
   */
  getActiveVehiclesForStream(stream) {
    return this.vehicles.filter(v => v.active && v.stream === stream);
  }

  /**
   * Check if any vehicles are active for a stream
   * @param {string} stream - Stream identifier
   * @returns {boolean} True if vehicles are active
   */
  hasActiveVehiclesForStream(stream) {
    return this.vehicles.some(v => v.active && v.stream === stream);
  }

  /**
   * Check if any vehicles are active at all
   * @returns {boolean} True if any vehicles are active
   */
  hasAnyActiveVehicles() {
    return this.vehicles.some(v => v.active);
  }

  /**
   * Get effective spawn interval based on unloader tier
   * @returns {number} Spawn interval in milliseconds
   */
  getEffectiveSpawnInterval() {
    const multiplier = this.employees.unloader.spawnIntervalMultipliers[this.employees.unloader.tier];
    return GameConfig.waves.baseSpawnInterval * multiplier;
  }

  /**
   * Create a serializable state snapshot
   * @returns {object} State snapshot
   */
  /**
  /**
   * Create a serializable PROGRESSION snapshot.
   * Not a full simulation snapshot (no packages, no timers, no selection).
   * @returns {object} Progression snapshot
   */
  toJSON() {
    return {
      wave: {
        current: this.wave.current,
        packageLimit: this.wave.packageLimit,
      },
      economy: {
        money: this.economy.money,
      },
      employees: {
        unloaderTier: this.employees.unloader?.tier ?? 0,
        loaders: (this.employees.loaders || []).map((l, index) => ({
          key: l?.id ?? l?.stream ?? index,
          tier: l?.tier ?? 0,
        })),
      },
      vehicles: this.vehicles.map(v => ({
        slotIndex: v.slotIndex,
        active: !!v.active,
        upgrades: deepClone(v.upgrades),
        capacity: v.capacity,
      })),
    };
  }

  /**
   * Load progression from a snapshot. Allowed only between waves by policy.
   * Forces a safe between-waves posture and clears transient runtime state.
   * @param {object} snapshot - Progression snapshot
   */
  fromJSON(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.events.emit('state:loadFailed', { reason: 'invalid_snapshot' });
      return;
    }

    // Enforce between-waves posture
    this.wave.active = false;
    this.wave.betweenWaves = true;
    this.wave.packagesSpawned = 0;
    this.wave.spawnTimer = 0;

    // Clear transient runtime state (scene/system owns sprites)
    if (Array.isArray(this.packages)) this.packages.length = 0;
    else this.packages = [];
    this.selectedPackage = null;

    // Wave progression
    if (snapshot.wave) {
      if (Number.isFinite(snapshot.wave.current)) this.wave.current = snapshot.wave.current;
      if (Number.isFinite(snapshot.wave.packageLimit)) this.wave.packageLimit = snapshot.wave.packageLimit;
    }

    // Economy
    if (snapshot.economy && Number.isFinite(snapshot.economy.money)) {
      this.economy.money = snapshot.economy.money;
      this.events.emit('economy:moneyChanged', { amount: 0, newBalance: this.economy.money });
    }

    // Employees: restore tiers only
    if (snapshot.employees) {
      const ut = snapshot.employees.unloaderTier;
      if (this.employees.unloader && Number.isFinite(ut)) {
        const max = this.employees.unloader.maxTier ?? ut;
        this.employees.unloader.tier = Math.max(0, Math.min(max, ut));
      }
      if (Array.isArray(snapshot.employees.loaders) && Array.isArray(this.employees.loaders)) {
        snapshot.employees.loaders.forEach(saved => {
          const key = saved.key;
          const tier = saved.tier;
          // match by id/stream, fallback by numeric index
          let target = this.employees.loaders.find(l => (l.id ?? l.stream) === key);
          if (!target && Number.isFinite(key)) target = this.employees.loaders[key];
          if (target && Number.isFinite(tier)) {
            const max = target.maxTier ?? tier;
            target.tier = Math.max(0, Math.min(max, tier));
          }
        });
      }
    }

    // Vehicles: restore by slotIndex (not array index)
    if (Array.isArray(snapshot.vehicles)) {
      snapshot.vehicles.forEach(vData => {
        const vehicle = this.vehicles.find(v => v.slotIndex === vData.slotIndex);
        if (!vehicle) return;
        vehicle.active = !!vData.active;
        if (vData.upgrades && typeof vData.upgrades === 'object') vehicle.upgrades = deepClone(vData.upgrades);
        if (Number.isFinite(vData.capacity)) vehicle.capacity = vData.capacity;
        // Do not restore per-wave assignments
        if ('shape' in vehicle) vehicle.shape = null;
        if ('color' in vehicle) vehicle.color = null;
        if (typeof vehicle.recalculateCapacity === 'function') vehicle.recalculateCapacity();
      });
    }

    // Derived
    if (typeof this.updateOperatingCost === 'function') this.updateOperatingCost();

    this.events.emit('state:loaded', snapshot);
  }
}
