/**
 * Tauri API stub for E2E testing in browser mode.
 * Sets up window.__TAURI_INTERNALS__ so @tauri-apps/api calls don't throw.
 * The app's db.js already falls back to createDevelopmentPreviewDb() when
 * __TAURI_INTERNALS__ is absent, but invoke/emit/listen will throw without this stub.
 */
if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args) => {
      console.debug('[tauri-stub] invoke:', cmd, args);
      if (cmd === 'get_system_time_info') {
        return { utc_offset_seconds: 19800, timezone_name: 'IST' };
      }
      if (cmd === 'plugin:sql|load') return {};
      if (cmd === 'plugin:sql|execute') return { rowsAffected: 0 };
      if (cmd === 'plugin:sql|select') return [];
      if (cmd === 'plugin:fs|write_file') return null;
      if (cmd === 'plugin:fs|read_dir') return [];
      return null;
    },
    convertFileSrc: (path) => path,
    metadata: { currentWindow: { label: 'main' } },
  };

  // Stub for @tauri-apps/api/event
  window.__TAURI_INTERNALS__.listeners = new Map();
}
