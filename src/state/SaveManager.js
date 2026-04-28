// =====================================================
// SaveManager - localStorage Save/Load (single slot)
// Progression-only snapshot, load allowed between waves
// =====================================================

const SAVE_KEY = 'packagesorter.save.v1';
const SAVE_VERSION = 1;

export class SaveManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  save() {
    if (typeof this.gameState.isBetweenWaves === 'function' && !this.gameState.isBetweenWaves()) {
      this.gameState.events.emit('state:saveFailed', { reason: 'active_wave' });
      return false;
    }

    const payload = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      data: this.gameState.toJSON(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.gameState.events.emit('state:saved', payload);
      return true;
    } catch (e) {
      this.gameState.events.emit('state:saveFailed', {
        reason: 'storage_error',
        error: String(e),
      });
      return false;
    }
  }

  load() {
    if (typeof this.gameState.isBetweenWaves === 'function' && !this.gameState.isBetweenWaves()) {
      this.gameState.events.emit('state:loadFailed', { reason: 'active_wave' });
      return false;
    }

    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      this.gameState.events.emit('state:loadFailed', {
        reason: 'storage_error',
        error: String(e),
      });
      return false;
    }

    if (!raw) {
      this.gameState.events.emit('state:loadFailed', { reason: 'no_save' });
      return false;
    }

    try {
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
      if (payload.version !== SAVE_VERSION) {
        this.gameState.events.emit('state:loadFailed', {
          reason: 'version_mismatch',
          found: payload.version,
          expected: SAVE_VERSION,
        });
        return false;
      }
      if (!payload.data || typeof payload.data !== 'object') throw new Error('Missing snapshot data');

      this.gameState.fromJSON(payload.data);
      return true;
    } catch (e) {
      // If corrupt, remove to prevent repeated failures
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      this.gameState.events.emit('state:loadFailed', {
        reason: 'corrupt_save',
        error: String(e),
      });
      return false;
    }
  }
}

export const SaveMeta = { SAVE_KEY, SAVE_VERSION };
