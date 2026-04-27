# Package Sorting Game - v1.0.0 (Refactored)

A modular package sorting simulation game built with Phaser 3. This refactored version transforms the original monolithic codebase into a clean, maintainable, and extensible architecture.

## 🎮 Game Overview

Manage a package sorting facility where you:
- Load packages onto vehicles based on shape and color
- Upgrade employees (unloader and loaders) to improve efficiency
- Purchase and upgrade vehicles to increase capacity
- Balance operating costs against revenue

## 📁 Project Structure

```
package-sorting-game/
├── index.html              # Main HTML entry point
├── package.json            # Node.js package configuration
├── README.md               # This file
├── src/
│   ├── main.js             # Game entry point
│   ├── config/
│   │   └── gameConfig.js   # Centralized game configuration
│   ├── utils/
│   │   └── helpers.js      # Utility functions
│   ├── state/
│   │   └── GameState.js    # Centralized state management & events
│   ├── entities/
│   │   ├── Package.js      # Package entity
│   │   ├── Vehicle.js      # Vehicle entity
│   │   └── Employee.js     # Unloader & Loader entities
│   ├── systems/
│   │   └── WaveSystem.js   # Wave management & package spawning
│   ├── ui/
│   │   └── UIManager.js    # UI rendering & updates
│   └── scenes/
│       └── GameScene.js    # Main Phaser scene
└── main_0.6.30_full.js     # Original monolithic version (for reference)
```

## 🚀 Quick Start

### Option 1: Direct HTML (No Build)
Simply open `index.html` in a modern browser. The game uses ES modules and loads Phaser from CDN.

### Option 2: Development Server (Recommended)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use a simple static server
npm start
```

Then open your browser to `http://localhost:5173` (Vite) or `http://localhost:3000` (serve).

## 🏗️ Architecture Overview

### Design Patterns Used
- **Module Pattern**: Each file is a self-contained ES module
- **Observer Pattern**: Event-driven communication via `EventManager`
- **State Pattern**: Centralized `GameState` manages all game state
- **Entity-Component**: Entities (Package, Vehicle, Employee) encapsulate behavior
- **System Pattern**: `WaveSystem` handles wave logic separately from rendering

### Key Components

#### 1. **GameConfig** (`config/gameConfig.js`)
All game constants and configuration in one place. Easy to balance and tweak.

#### 2. **GameState** (`state/GameState.js`)
Central state manager with:
- Wave state (current, active, packages spawned)
- Economy state (money, operating costs)
- Employee state (unloader, loaders)
- Event system for decoupled communication

#### 3. **Entities** (`entities/`)
- **Package**: Represents a package on the belt with shape, color, and stream
- **Vehicle**: Loading truck with capacity, shape/color requirements, upgrades
- **Employee**: Base class for Unloader and Loader with tier system

#### 4. **Systems** (`systems/`)
- **WaveSystem**: Handles wave lifecycle, package spawning, movement, and completion

#### 5. **UIManager** (`ui/UIManager.js`)
All UI rendering and updates, subscribed to game state events

#### 6. **GameScene** (`scenes/GameScene.js`)
Main Phaser scene that orchestrates all systems

## 🔧 Configuration

All game balance values are in `src/config/gameConfig.js`:

```javascript
export const GameConfig = {
  base: { width: 800, height: 450, beltY: 290, ... },
  economy: { startMoney: 1000, packageRevenue: 10, ... },
  waves: { initialPackageLimit: 20, packageIncreasePerWave: 5, ... },
  // ... more configuration
};
```

## 🎯 How to Play

1. **Start a Wave**: Click "START NEXT WAVE" button
2. **Select Packages**: Click on packages on the conveyor belt
3. **Assign to Vehicles**: Click on a vehicle to assign the selected package
4. **Upgrade Employees**: Click "+" on employee circles to upgrade (between waves)
5. **Buy Vehicles**: Click the green buy button on inactive vehicles
6. **Upgrade Vehicles**: Click "+2" buttons to increase vehicle capacity

### Employee Tiers
- **Tier 0**: No automatic loading
- **Tier 1**: Loads packages matching vehicle shape
- **Tier 2**: Loads packages matching vehicle shape OR color

## 🛠️ Development

### Adding New Features

#### 1. New Configuration
Add to `src/config/gameConfig.js`

#### 2. New Entity
Create `src/entities/NewEntity.js` following the pattern of existing entities

#### 3. New System
Create `src/systems/NewSystem.js` with an `update(delta)` method

#### 4. New UI Element
Add to `UIManager` class, subscribe to relevant events

### Event System

Subscribe to events:
```javascript
gameState.events.on('wave:started', (data) => {
  console.log('Wave started:', data.waveNumber);
});
```

Emit events:
```javascript
gameState.events.emit('custom:event', { data: 'value' });
```

### Common Events
- `wave:started` - Wave begins
- `wave:ended` - Wave completes with results
- `economy:moneyChanged` - Money updated
- `employee:upgraded` - Employee upgraded
- `employee:downgraded` - Employee downgraded

## 📊 Debugging

In development mode, access debug tools via browser console:

```javascript
// Get game state
debugGame.getGameState()

// Get wave system
debugGame.getWaveSystem()

// Get UI manager
debugGame.getUIManager()

// Restart game
debugGame.restart()
```

## 🔮 Future Enhancements

Potential features to add:
- [ ] Save/Load system using localStorage
- [ ] Sound effects and background music
- [ ] Particle effects for loading/unloading
- [ ] Tutorial system for new players
- [ ] Achievements and statistics tracking
- [ ] Multiple game modes (endless, timed, challenge)
- [ ] Leaderboard integration
- [ ] Mobile touch controls optimization

## 📝 Migration from v0.6.30

The original monolithic `main_0.6.30_full.js` has been refactored into modular components:

| Original Code | New Location |
|--------------|--------------|
| Global variables | `GameState` class |
| `spawnPackage()` | `WaveSystem.spawnPackage()` |
| `tryLoadPackage()` | `Package.tryLoad()` |
| `calculateOperatingCost()` | `GameState.calculateOperatingCost()` |
| `downgradeHighestCostUnit()` | `GameState.downgradeHighestCostUnit()` |
| UI creation in `create()` | `UIManager.create()` |
| `update()` function | `WaveSystem.update()` |

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with Phaser 3** | **ES6 Modules** | **Event-Driven Architecture**