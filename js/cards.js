/* Cards — Player detail modal (baseball card style) */

import { getState, getRoster } from './state.js';
import { POS_LABELS, AWARD_ICONS } from './constants.js';
import { goToYear } from './controls.js';

let dialog = null;
let cardName = null;
let cardNickname = null;
let cardMeta = null;
let cardBadges = null;
let cardStats = null;
let cardCareer = null;

export function initCards() {
  dialog = document.getElementById('player-card');
  cardName = document.getElementById('card-name');
  cardNickname = document.getElementById('card-nickname');
  cardMeta = document.getElementById('card-meta');
  cardBadges = document.getElementById('card-badges');
  cardStats = document.getElementById('card-stats');
  cardCareer = document.getElementById('card-career');

  document.getElementById('close-card').addEventListener('click', () => {
    dialog.close();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

// Stat definitions for each role — hero stats shown large, rest in a table
const HITTER_HERO = [
  { key: 'AVG', label: 'AVG' },
  { key: 'HR', label: 'HR' },
  { key: 'RBI', label: 'RBI' },
];
const HITTER_TABLE = [
  { key: 'G', label: 'G' },
  { key: 'AB', label: 'AB' },
  { key: 'R', label: 'R' },
  { key: 'H', label: 'H' },
  { key: '2B', label: '2B' },
  { key: '3B', label: '3B' },
  { key: 'HR', label: 'HR' },
  { key: 'RBI', label: 'RBI' },
  { key: 'BB', label: 'BB' },
  { key: 'SB', label: 'SB' },
  { key: 'AVG', label: 'AVG' },
];

const STARTER_HERO = [
  { key: 'W', label: 'W', format: (p) => `${p.W}-${p.L}`, needs: ['W', 'L'] },
  { key: 'ERA', label: 'ERA' },
  { key: 'SO', label: 'K' },
];
const STARTER_TABLE = [
  { key: 'G', label: 'G' },
  { key: 'GS', label: 'GS' },
  { key: 'W', label: 'W' },
  { key: 'L', label: 'L' },
  { key: 'ERA', label: 'ERA' },
  { key: 'IP', label: 'IP' },
  { key: 'SO', label: 'K' },
  { key: 'BB', label: 'BB' },
];

const CLOSER_HERO = [
  { key: 'SV', label: 'SV' },
  { key: 'ERA', label: 'ERA' },
  { key: 'SO', label: 'K' },
];
const CLOSER_TABLE = [
  { key: 'G', label: 'G' },
  { key: 'SV', label: 'SV' },
  { key: 'W', label: 'W' },
  { key: 'L', label: 'L' },
  { key: 'ERA', label: 'ERA' },
  { key: 'IP', label: 'IP' },
  { key: 'SO', label: 'K' },
  { key: 'BB', label: 'BB' },
];

export function openPlayerCard(player, posLabel, role) {
  const state = getState();
  const roster = getRoster();
  const isWS = roster?.worldSeries === 'won';

  dialog.classList.toggle('ws-card', isWS);

  if (!player) {
    cardName.textContent = 'No Player Data';
    cardNickname.textContent = '';
    cardMeta.textContent = `Yankees ${state.year} · ${posLabel}`;
    cardBadges.innerHTML = '';
    cardStats.innerHTML = '<p class="card-empty">No stats available for this position.</p>';
    cardCareer.innerHTML = '';
    dialog.showModal();
    return;
  }

  // Name, nickname & meta
  cardName.textContent = player.name;
  cardNickname.textContent = player.nickname ? `"${player.nickname}"` : '';
  const posName = POS_LABELS[posLabel] || posLabel;
  const wsTag = isWS ? ' \u{1F3C6} World Champions' : '';
  cardMeta.textContent = `Yankees ${state.year} \u00B7 ${posName}${wsTag ? ' \u00B7' + wsTag : ''}`;

  // Build badges
  buildCardBadges(player, state);

  // Pick stat config based on role
  const heroDefs = role === 'closer' ? CLOSER_HERO
    : role === 'starter' ? STARTER_HERO
    : HITTER_HERO;
  const tableDefs = role === 'closer' ? CLOSER_TABLE
    : role === 'starter' ? STARTER_TABLE
    : HITTER_TABLE;

  // Build hero stats (big numbers)
  const heroStats = heroDefs.filter(s => {
    if (s.needs) return s.needs.every(k => player[k] != null);
    return player[s.key] != null;
  });

  // Build stat table (all available detail stats)
  const tableStats = tableDefs.filter(s => player[s.key] != null);

  let html = '';

  // Hero section
  if (heroStats.length) {
    html += '<div class="card-hero-stats">';
    for (const s of heroStats) {
      const val = s.format ? s.format(player) : player[s.key];
      html += `<div class="hero-stat">
        <div class="hero-value">${val}</div>
        <div class="hero-label">${s.label}</div>
      </div>`;
    }
    html += '</div>';
  }

  // Divider
  if (heroStats.length && tableStats.length) {
    html += '<div class="card-divider"></div>';
  }

  // Stat table
  if (tableStats.length) {
    html += '<table class="card-stat-table"><thead><tr>';
    html += tableStats.map(s => `<th>${s.label}</th>`).join('');
    html += '</tr></thead><tbody><tr>';
    html += tableStats.map(s => `<td>${player[s.key]}</td>`).join('');
    html += '</tr></tbody></table>';
  }

  // Fallback if no enriched stats
  if (!heroStats.length && !tableStats.length) {
    html = `<div class="card-hero-stats">
      <div class="hero-stat">
        <div class="hero-value">${player.G ?? '—'}</div>
        <div class="hero-label">Games</div>
      </div>
    </div>`;
  }

  cardStats.innerHTML = html;

  // Career years
  buildCareerChips(player, state);
  dialog.showModal();
}

function buildCareerChips(player, state) {
  if (!player?.playerID || !state.data?._playerIndex) {
    cardCareer.innerHTML = '';
    return;
  }

  const entry = state.data._playerIndex.get(player.playerID);
  if (!entry || entry.appearances.length <= 1) {
    cardCareer.innerHTML = '';
    return;
  }

  const years = entry.appearances.map(a => a.year).sort((a, b) => a - b);
  const wsWon = new Set(state.data.wsWon || []);

  cardCareer.innerHTML = `
    <div class="career-heading">Yankees Career (${years.length} seasons)</div>
    <div class="career-years">
      ${years.map(y => {
        const isCurrent = y === state.year;
        const isChamp = wsWon.has(y);
        const classes = ['career-chip'];
        if (isCurrent) classes.push('current');
        if (isChamp) classes.push('ws-chip');
        return `<button class="${classes.join(' ')}" data-year="${y}">${y}${isChamp ? '<span class="chip-trophy">🏆</span>' : ''}</button>`;
      }).join('')}
    </div>
  `;

  cardCareer.querySelectorAll('.career-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const year = Number(chip.dataset.year);
      dialog.close();
      goToYear(year);
    });
  });
}

function buildCardBadges(player, state) {
  const badges = [];

  if (player.hof) {
    badges.push('<span class="card-badge card-badge-hof">HOF</span>');
  }
  if (player.retiredNum != null) {
    badges.push(`<span class="card-badge card-badge-retired">#${player.retiredNum} Retired</span>`);
  }
  if (player.awards?.length) {
    for (const code of player.awards) {
      const info = AWARD_ICONS[code];
      if (info) {
        badges.push(`<span class="card-badge card-badge-${code.toLowerCase()}">${info.icon} ${info.label}</span>`);
      }
    }
  }

  // Aggregate career awards from player index
  if (player.playerID && state.data?._playerIndex) {
    const entry = state.data._playerIndex.get(player.playerID);
    if (entry) {
      const careerAwards = {};
      for (const app of entry.appearances) {
        const p = app.player;
        if (p.awards) {
          for (const code of p.awards) {
            careerAwards[code] = (careerAwards[code] || 0) + 1;
          }
        }
      }
      const careerParts = [];
      for (const [code, count] of Object.entries(careerAwards)) {
        if (count > 1) {
          const info = AWARD_ICONS[code];
          if (info) careerParts.push(`${count}x ${info.label}`);
        }
      }
      if (careerParts.length) {
        badges.push(`<span class="card-badge card-badge-as" style="font-size:0.6rem">${careerParts.join(' \u00B7 ')}</span>`);
      }
    }
  }

  cardBadges.innerHTML = badges.join('');
}
