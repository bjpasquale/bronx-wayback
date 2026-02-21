/* Data — Loading & Indexing */

import { setState } from './state.js';

const DATA_URL = 'data/yankees.json';

export async function loadData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
  const data = await res.json();

  const years = Object.keys(data.years)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  // Build player index for search: { name -> [{ year, pos, role, player }] }
  data._playerIndex = buildPlayerIndex(data);

  setState({
    data,
    years,
    year: years[years.length - 1],  // Start at most recent
    loaded: true,
  });

  return data;
}

function buildPlayerIndex(data) {
  const index = new Map();

  for (const [yearStr, roster] of Object.entries(data.years)) {
    const year = Number(yearStr);

    // Position players
    for (const [pos, player] of Object.entries(roster.position_players || {})) {
      addToIndex(index, player, year, pos, 'hitter');
    }

    // Starters
    for (let i = 0; i < (roster.pitchers?.starters || []).length; i++) {
      const sp = roster.pitchers.starters[i];
      addToIndex(index, sp, year, `SP${i + 1}`, 'starter');
    }

    // Closer
    if (roster.pitchers?.closer) {
      addToIndex(index, roster.pitchers.closer, year, 'CL', 'closer');
    }
  }

  return index;
}

function addToIndex(index, player, year, pos, role) {
  if (!player?.name) return;
  const key = player.playerID || player.name.toLowerCase();
  if (!index.has(key)) {
    index.set(key, { name: player.name, appearances: [] });
  }
  index.get(key).appearances.push({ year, pos, role, player });
}

// Search players by name across all years
export function searchPlayersInData(data, query) {
  const q = query.trim().toLowerCase();
  if (!q || !data?._playerIndex) return [];

  const results = [];
  for (const [, entry] of data._playerIndex) {
    if (entry.name.toLowerCase().includes(q)) {
      results.push(entry);
    }
  }

  // Sort by number of appearances (most appearances first)
  results.sort((a, b) => b.appearances.length - a.appearances.length);
  return results.slice(0, 50);
}
