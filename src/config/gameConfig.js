// =====================================================
// Game Configuration
// Centralized configuration for all game constants
// =====================================================

export const GameConfig = {
  // Base / Belt Configuration
  base: {
    width: 800,
    height: 450,
    beltY: 290,
    beltSpeed: 100,
    beltEndX: 780, // BASE_WIDTH - 20
    packageLaneY: 290, // Same as beltY
  },

  // Economy Configuration
  economy: {
    startMoney: 1000,
    packageRevenue: 10,
    missedPenaltyPerPackage: 5,
    vehicleUpgradeBaseCost: 40,
    vehicleUpgradeCostIncrease: 20,
    vehicleCapacityIncreasePerUpgrade: 2,
  },

  // Wave Configuration
  waves: {
    initialPackageLimit: 20,
    packageIncreasePerWave: 5,
    baseSpawnInterval: 800, // milliseconds
  },

  // Vehicle Slot Configuration
  vehicleSlots: [
    { index: 0, x: 310, y: 335, stream: 'A', cost: 0 },
    { index: 1, x: 410, y: 335, stream: 'A', cost: 0 },
    { index: 2, x: 510, y: 335, stream: 'A', cost: 200 },
    { index: 3, x: 610, y: 335, stream: 'A', cost: 300 },
    { index: 4, x: 310, y: 245, stream: 'B', cost: 300 },
    { index: 5, x: 410, y: 245, stream: 'B', cost: 400 },
    { index: 6, x: 510, y: 245, stream: 'B', cost: 500 },
    { index: 7, x: 610, y: 245, stream: 'B', cost: 600 },
  ],

  // Shape and Stream Definitions
  shapes: {
    triangle: { stream: 'A', symbol: '▲' },
    square: { stream: 'A', symbol: '■' },
    circle: { stream: 'A', symbol: '●' },
    star: { stream: 'B', symbol: '★' },
    diamond: { stream: 'B', symbol: '◆' },
    hexagon: { stream: 'B', symbol: '⬢' },
  },

  streamShapes: {
    A: ['triangle', 'square', 'circle'],
    B: ['star', 'diamond', 'hexagon'],
  },

  // Color Definitions
  colors: [
    { name: 'red', value: 0xff5555 },
    { name: 'blue', value: 0x5599ff },
    { name: 'green', value: 0x55ff55 },
  ],

  // Employee Colors (by tier)
  employeeColors: [0x777777, 0xffcc00, 0x33cc66],

  // Unloader Configuration
  unloader: {
    maxTier: 2,
    upgradeCosts: [0, 50, 100],
    operatingCosts: [0, 10, 50],
    spawnIntervalMultipliers: [1.0, 0.75, 0.55],
  },

  // Loader Configuration
  loader: {
    maxTier: 2,
    upgradeCosts: [0, 50, 100],
    operatingCosts: [0, 10, 25],
    definitions: [
      { id: 0, covers: [0, 1], stream: 'A', y: 310 },
      { id: 1, covers: [2, 3], stream: 'A', y: 310 },
      { id: 2, covers: [4, 5], stream: 'B', y: 270 },
      { id: 3, covers: [6, 7], stream: 'B', y: 270 },
    ],
  },

  // UI Configuration
  ui: {
    hud: { x: 120, y: 56, width: 240, height: 74 },
    waveComplete: { y: 48, width: 260, height: 52 },
    startButton: { y: 92, width: 200, height: 26 },
    vehicleSize: { width: 90, height: 34 },
    upgradeButtonOffset: 36,
    upgradeButtonSize: { width: 40, height: 22 },
  },

  // Package Configuration
  package: {
    size: 18,
    outlineSize: 22,
    spawnX: 80,
    proximityThreshold: 12,
  },

  // Vehicle Configuration
  vehicle: {
    baseCapacity: 6,
    size: { width: 90, height: 34 },
  },
};

// Freeze configuration to prevent modifications
Object.freeze(GameConfig);