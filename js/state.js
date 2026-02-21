/* State — Pub/Sub store */

const listeners = new Map();

const state = {
  data: null,       // Full yankees.json
  years: [],        // Sorted year numbers
  year: null,       // Current year (number)
  loaded: false,    // Data loaded flag
};

export function getState() {
  return state;
}

export function setState(updates) {
  const changed = [];
  for (const [key, value] of Object.entries(updates)) {
    if (state[key] !== value) {
      state[key] = value;
      changed.push(key);
    }
  }

  // Notify listeners for changed keys
  for (const key of changed) {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      for (const fn of keyListeners) {
        fn(state[key], state);
      }
    }
  }

  // Also notify wildcard listeners
  if (changed.length > 0) {
    const wildcardListeners = listeners.get('*');
    if (wildcardListeners) {
      for (const fn of wildcardListeners) {
        fn(state);
      }
    }
  }
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(fn);

  // Return unsubscribe function
  return () => listeners.get(key)?.delete(fn);
}

// Get the roster for a given year
export function getRoster(year) {
  const y = year ?? state.year;
  return state.data?.years?.[String(y)] ?? null;
}

// Get era info for a year
export function getEra(year) {
  const y = year ?? state.year;
  const eras = state.data?.eras ?? [];
  return eras.find(e => y >= e.start && y <= e.end) ?? null;
}

// Get era quote
export function getEraQuote(eraId) {
  return state.data?.eraQuotes?.[eraId] ?? '';
}
