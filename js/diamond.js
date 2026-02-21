/* Diamond — Rendering player nodes on the field */

import { getState, getRoster, subscribe } from './state.js';
import { POS_ORDER, LAYOUT, LAYOUT_MOBILE, getNodeStats, AWARD_ICONS } from './constants.js';
import { animateTransition, animateEntrance } from './animations.js';
import { openPlayerCard } from './cards.js';

let container = null;
let diamondEl = null;

export function initDiamond() {
  container = document.getElementById('diamond-nodes');
  diamondEl = document.getElementById('diamond');

  subscribe('year', () => renderDiamond());
  subscribe('loaded', () => renderDiamond());
}

function getLayout() {
  return window.matchMedia('(max-width: 768px)').matches ? LAYOUT_MOBILE : LAYOUT;
}

function renderDiamond() {
  const state = getState();
  if (!state.loaded || !state.year) return;

  const roster = getRoster();

  // Update diamond border for WS
  diamondEl.classList.remove('ws-won', 'ws-lost');
  if (roster?.worldSeries === 'won') diamondEl.classList.add('ws-won');
  else if (roster?.worldSeries === 'lost') diamondEl.classList.add('ws-lost');

  animateTransition(container, () => {
    container.innerHTML = '';
    if (!roster) return;

    const layout = getLayout();
    const isWS = roster.worldSeries === 'won';

    // Position players
    for (const pos of POS_ORDER) {
      const player = roster.position_players?.[pos] ?? null;
      const coord = layout.hitters[pos];
      const node = createNode(coord, player, pos, 'hitter', isWS);
      container.appendChild(node);
    }

    // Starters
    const starters = roster.pitchers?.starters ?? [];
    for (let i = 0; i < layout.starters.length; i++) {
      const sp = starters[i] ?? null;
      const coord = layout.starters[i];
      const node = createNode(coord, sp, `SP${i + 1}`, 'starter', isWS);
      container.appendChild(node);
    }

    // Closer
    const closer = roster.pitchers?.closer ?? null;
    const closerNode = createNode(layout.closer, closer, 'CL', 'closer', isWS);
    container.appendChild(closerNode);

    animateEntrance(container);
  });
}

function createNode(coord, player, posLabel, role, isWS) {
  const btn = document.createElement('button');
  btn.className = 'player-node';
  if (isWS) btn.classList.add('ws-glow');
  btn.style.left = `${coord.x}%`;
  btn.style.top = `${coord.y}%`;

  const fullName = player?.name ?? '—';
  const lastName = player?.name ? player.name.split(' ').slice(-1)[0] : '—';
  const statLines = getNodeStats(player, role);

  // Build badge HTML
  let badgeHtml = '';
  if (player) {
    const parts = [];
    if (player.retiredNum != null) {
      parts.push(`<span class="node-retired-num">#${player.retiredNum}</span>`);
    }
    if (player.hof) {
      parts.push(`<span class="node-hof">HOF</span>`);
    }
    if (player.awards?.length) {
      const icons = player.awards
        .map(a => AWARD_ICONS[a]?.icon)
        .filter(Boolean)
        .join('');
      if (icons) parts.push(`<span class="node-awards">${icons}</span>`);
    }
    if (parts.length) {
      badgeHtml = `<div class="node-badges">${parts.join('')}</div>`;
    }
  }

  btn.innerHTML = `
    <div class="node-bubble">
      <div class="node-name node-name-full">${escapeHtml(fullName)}</div>
      <div class="node-name node-name-short">${escapeHtml(lastName)}</div>
      ${statLines.map(s => `<div class="node-stat">${escapeHtml(s)}</div>`).join('')}
      ${badgeHtml}
    </div>
  `;

  btn.addEventListener('click', () => {
    openPlayerCard(player, posLabel, role);
  });

  btn.setAttribute('aria-label', `${posLabel}: ${fullName}`);

  return btn;
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
