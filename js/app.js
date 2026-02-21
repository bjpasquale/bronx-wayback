/* App — Entry Point */

import { loadData } from './data.js';
import { initDiamond } from './diamond.js';
import { initControls } from './controls.js';
import { initCards } from './cards.js';
import { initSearch } from './search.js';
import { transitionFromLoading } from './animations.js';

async function init() {
  try {
    // Initialize all modules (they set up subscribers)
    initControls();
    initDiamond();
    initCards();
    initSearch();

    // Load data — this triggers state updates which modules react to
    await loadData();

    // Transition from loading screen to app
    await transitionFromLoading();
  } catch (err) {
    console.error('Failed to initialize:', err);
    const loading = document.getElementById('loading-screen');
    if (loading) {
      const text = loading.querySelector('.loading-text');
      if (text) text.textContent = 'Failed to load. Please refresh.';
    }
  }
}

init();
