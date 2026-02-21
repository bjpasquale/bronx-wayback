/* Controls — Year nav, timeline, eras, keyboard, swipe */

import { getState, setState, subscribe, getRoster, getEra, getEraQuote } from './state.js';
import { popYearPill } from './animations.js';
import {
  WS_WON_MESSAGES, WS_LOST_MESSAGES,
} from './constants.js';

let els = {};

export function initControls() {
  els = {
    prevYear: document.getElementById('prev-year'),
    nextYear: document.getElementById('next-year'),
    yearPill: document.getElementById('year-pill'),
    wsTrophy: document.getElementById('ws-trophy'),
    wsBanner: document.getElementById('ws-banner'),
    wsBannerText: document.querySelector('.ws-banner-text'),
    seasonRecord: document.getElementById('season-record'),
    otdBanner: document.getElementById('otd-banner'),
    otdText: document.getElementById('otd-text'),
    eraPills: document.querySelector('.era-pills'),
    eraQuote: document.getElementById('era-quote'),
    timeline: document.getElementById('timeline'),
    timelineMarkers: document.getElementById('timeline-markers'),
    timelineStart: document.getElementById('timeline-start'),
    timelineEnd: document.getElementById('timeline-end'),
    timelineEraLabel: document.getElementById('timeline-era-label'),
    diamond: document.getElementById('diamond'),
    leaderboards: document.getElementById('leaderboards'),
  };

  bindNavigation();
  bindTimeline();
  bindKeyboard();
  bindSwipe();

  subscribe('year', onYearChange);
  subscribe('loaded', onLoaded);
}

function onLoaded() {
  const state = getState();
  if (!state.loaded) return;
  buildEraPills();
  buildTimelineMarkers();
  buildLeaderboards();
  showOTDBanner();
  updateTimeline();
  onYearChange();
}

function onYearChange() {
  const state = getState();
  if (!state.year) return;

  const roster = getRoster();
  const era = getEra();

  // Year pill
  els.yearPill.textContent = String(state.year);
  els.yearPill.classList.toggle('ws-year', roster?.worldSeries === 'won');
  popYearPill(els.yearPill);

  // Trophy
  if (roster?.worldSeries === 'won') {
    els.wsTrophy.classList.remove('hidden');
    els.wsTrophy.style.animation = 'none';
    void els.wsTrophy.offsetWidth;
    els.wsTrophy.style.animation = '';
  } else {
    els.wsTrophy.classList.add('hidden');
  }

  // WS Banner
  updateWSBanner(roster);

  // Era pills - highlight active
  updateActiveEra(era);

  // Era quote
  if (era) {
    els.eraQuote.textContent = getEraQuote(era.id);
  } else {
    els.eraQuote.textContent = '';
  }

  // Timeline
  updateTimeline();

  // Timeline era label
  els.timelineEraLabel.textContent = era?.label ?? '';

  // Season record
  updateSeasonRecord(state);
}

// --- Navigation ---

function bindNavigation() {
  els.prevYear.addEventListener('click', () => shiftYear(-1));
  els.nextYear.addEventListener('click', () => shiftYear(1));
}

function shiftYear(dir) {
  const state = getState();
  if (!state.years.length) return;
  const idx = state.years.indexOf(state.year);
  const next = Math.max(0, Math.min(state.years.length - 1, idx + dir));
  if (state.years[next] !== state.year) {
    setState({ year: state.years[next] });
  }
}

function goToYear(year) {
  const state = getState();
  if (state.years.includes(year)) {
    setState({ year });
  }
}

// --- Keyboard ---

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't capture if focused in search
    if (e.target.matches('input, textarea')) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      shiftYear(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      shiftYear(1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const state = getState();
      if (state.years.length) setState({ year: state.years[0] });
    } else if (e.key === 'End') {
      e.preventDefault();
      const state = getState();
      if (state.years.length) setState({ year: state.years[state.years.length - 1] });
    }
  });
}

// --- Swipe ---

function bindSwipe() {
  let startX = 0;
  const zone = els.diamond;
  if (!zone) return;

  zone.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });

  zone.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 40) {
      shiftYear(delta < 0 ? 1 : -1);
    }
  }, { passive: true });
}

// --- Timeline ---

function bindTimeline() {
  els.timeline.addEventListener('input', () => {
    const state = getState();
    const idx = Number(els.timeline.value);
    if (state.years[idx] != null) {
      setState({ year: state.years[idx] });
    }
  });
}

function updateTimeline() {
  const state = getState();
  if (!state.years.length) return;

  const idx = state.years.indexOf(state.year);
  els.timeline.max = String(state.years.length - 1);
  els.timeline.value = String(idx >= 0 ? idx : 0);

  // Style thumb gold on WS years
  const roster = getRoster();
  els.timeline.classList.toggle('ws-year', roster?.worldSeries === 'won');

  // Update labels
  els.timelineStart.textContent = String(state.years[0]);
  els.timelineEnd.textContent = String(state.years[state.years.length - 1]);
}

function buildTimelineMarkers() {
  const state = getState();
  if (!state.data || !state.years.length) return;

  els.timelineMarkers.innerHTML = '';
  const total = state.years.length - 1;

  for (let i = 0; i < state.years.length; i++) {
    const year = state.years[i];
    const roster = state.data.years[String(year)];
    if (!roster?.worldSeries) continue;

    const pct = (i / total) * 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    if (roster.worldSeries === 'lost') marker.classList.add('ws-lost-marker');
    marker.style.left = `${pct}%`;
    marker.title = `${year} — ${roster.worldSeries === 'won' ? 'WS Champions' : 'WS Loss'}`;
    els.timelineMarkers.appendChild(marker);
  }
}

// --- Era pills ---

function buildEraPills() {
  const state = getState();
  if (!state.data?.eras) return;

  els.eraPills.innerHTML = '';
  for (const era of state.data.eras) {
    const btn = document.createElement('button');
    btn.className = 'era-pill';
    btn.dataset.eraId = era.id;
    btn.innerHTML = `${era.label}<span class="era-years">${era.start}\u2013${era.end}</span>`;
    btn.title = era.tagline;
    btn.addEventListener('click', () => {
      goToYear(era.start);
    });
    els.eraPills.appendChild(btn);
  }
}

function updateActiveEra(era) {
  const pills = els.eraPills.querySelectorAll('.era-pill');
  pills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.eraId === era?.id);
  });
}

// --- WS Banner ---

function updateWSBanner(roster) {
  if (!roster?.worldSeries) {
    els.wsBanner.classList.add('hidden');
    els.wsBanner.classList.remove('ws-won', 'ws-lost');
    return;
  }

  els.wsBanner.classList.remove('hidden', 'ws-won', 'ws-lost');

  if (roster.worldSeries === 'won') {
    els.wsBanner.classList.add('ws-won');
    const msg = WS_WON_MESSAGES[Math.floor(Math.random() * WS_WON_MESSAGES.length)];
    els.wsBannerText.textContent = `${getState().year} — ${msg}`;
  } else {
    els.wsBanner.classList.add('ws-lost');
    const msg = WS_LOST_MESSAGES[Math.floor(Math.random() * WS_LOST_MESSAGES.length)];
    els.wsBannerText.textContent = `${getState().year} — ${msg}`;
  }

  // Re-trigger animation
  els.wsBanner.style.animation = 'none';
  void els.wsBanner.offsetWidth;
  els.wsBanner.style.animation = '';
}

// --- Season Record ---

function updateSeasonRecord(state) {
  const rec = state.data?.seasonRecords?.[String(state.year)];
  if (rec) {
    els.seasonRecord.textContent = `${rec.W}\u2013${rec.L}`;
  } else {
    els.seasonRecord.textContent = '';
  }
}

// --- On This Date Banner ---

function showOTDBanner() {
  const state = getState();
  const moments = state.data?.onThisDate;
  if (!moments?.length) return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const match = moments.find(m => m.month === month && m.day === day);
  if (match) {
    els.otdText.textContent = `On this date in ${match.year}: ${match.text}`;
    els.otdBanner.classList.remove('hidden');
    els.otdBanner.addEventListener('click', () => {
      goToYear(match.year);
    }, { once: true });
  }
}

// --- Leaderboards ---

function buildLeaderboards() {
  const state = getState();
  const lb = state.data?.leaderboards;
  if (!lb || !els.leaderboards) return;

  const categories = [
    { key: 'mvp', title: 'Most MVPs', icon: '\u{1F3C5}' },
    { key: 'cyYoung', title: 'Most Cy Youngs', icon: '\u{1F3C6}' },
    { key: 'allStar', title: 'Most All-Stars', icon: '\u2B50' },
    { key: 'wsWins', title: 'Most WS Wins', icon: '\u{1F48D}' },
  ];

  els.leaderboards.innerHTML = categories.map(cat => {
    const entries = lb[cat.key] || [];
    const listHtml = entries.map((e, i) => `
      <li class="leaderboard-entry">
        <span class="leaderboard-rank">${i + 1}.</span>
        <span class="leaderboard-name">${e.name}</span>
        <span class="leaderboard-count">${e.count}</span>
      </li>
    `).join('');

    return `
      <div class="leaderboard-card">
        <span class="leaderboard-icon">${cat.icon}</span>
        <div class="leaderboard-title">${cat.title}</div>
        <ol class="leaderboard-list">${listHtml}</ol>
      </div>
    `;
  }).join('');
}

// Export goToYear for use by search and cards
export { goToYear };
