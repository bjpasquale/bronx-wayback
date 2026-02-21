/* Search — Player search across all years */

import { getState } from './state.js';
import { searchPlayersInData } from './data.js';
import { goToYear } from './controls.js';

let searchInput = null;
let searchResults = null;

export function initSearch() {
  searchInput = document.getElementById('search-input');
  searchResults = document.getElementById('search-results');

  searchInput.addEventListener('input', debounce(onSearch, 150));

  // Clear on Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.innerHTML = '';
      searchInput.blur();
    }
  });
}

function onSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    searchResults.innerHTML = '';
    return;
  }

  const state = getState();
  const results = searchPlayersInData(state.data, q);

  if (!results.length) {
    searchResults.innerHTML = '<div class="search-no-results">No players found. Try a different name.</div>';
    return;
  }

  const wsWon = new Set(state.data?.wsWon || []);

  searchResults.innerHTML = results.map(entry => {
    // Group appearances into year ranges for display
    const years = entry.appearances.map(a => a.year).sort((a, b) => a - b);
    const yearRange = years.length === 1
      ? String(years[0])
      : `${years[0]}–${years[years.length - 1]}`;
    const positions = [...new Set(entry.appearances.map(a => a.pos))].join(', ');
    const wsCount = years.filter(y => wsWon.has(y)).length;

    return `
      <button class="search-result" data-year="${years[years.length - 1]}">
        <span class="search-result-year">${yearRange}</span>
        <span class="search-result-players">
          <strong>${escapeHtml(entry.name)}</strong> · ${positions} · ${years.length} season${years.length !== 1 ? 's' : ''}${wsCount > 0 ? ` <span class="result-trophy">${'🏆'.repeat(Math.min(wsCount, 5))}${wsCount > 5 ? `+${wsCount - 5}` : ''}</span>` : ''}
        </span>
      </button>
    `;
  }).join('');

  // Bind clicks
  searchResults.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      const year = Number(el.dataset.year);
      goToYear(year);
      searchInput.value = '';
      searchResults.innerHTML = '';
    });
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
