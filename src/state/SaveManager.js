// =====================================================
// SaveManager - localStorage Save/Load (single slot)
// Progression-only snapshot, load allowed between waves
// =====================================================

const SAVE_KEY = 'packagesorter.save.v1';
const SAVE_VERSION = 1;

export class SaveManager {
  /**
   * @param {import('./GameState.js').GameState} gameState
   */
  constructor(gameState) {
    this.gameState = gameState;
  }

  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (_) {
      return false;
    }
  }

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
      this.gameState.events.emit('state:cleared');
      return true;
    } catch (e) {
      this.gameState.events.emit('state:saveFailed', {
        reason: 'storage_unavailable',
        error: String(e),
      });
      return false;
    }
  }

  /**
   * Save progression snapshot. Allowed only between waves.
   */
  save() {
    if (!this.gameState.isBetweenWaves()) {
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
        reason: 'quota_or_storage_error',
        error: String(e),
      });
      return false;
    }
  }

  /**
   * Load progression snapshot. Allowed only between waves.
   */
  load() {
    if (!this.gameState.isBetweenWaves()) {
      this.gameState.events.emit('state:loadFailed', { reason: 'active_wave' });
      return false;
    }

    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      this.gameState.events.emit('state:loadFailed', {
        reason: 'storage_unavailable',
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

      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
      }

      if (payload.version !== SAVE_VERSION) {
        this.gameState.events.emit('state:loadFailed', {
          reason: 'version_mismatch',
          found: payload.version,
          expected: SAVE_VERSION,
        });
        return false;
      }

      if (!payload.data || typeof payload.data !== 'object') {
        throw new Error('Missing snapshot data');
      }

      this.gameState.fromJSON(payload.data);
      return true;
    } catch (e) {
      // Corrupt save: remove to prevent recurring failures
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (_) {}

      this.gameState.events.emit('state:loadFailed', {
        reason: 'corrupt_save',
        error: String(e),
      });
      return false;
    }
  }
}

export const SaveMeta = {
  SAVE_KEY,
  SAVE_VERSION,
};
