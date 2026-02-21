/* Constants — Positions, Layouts, Whimsy */

export const POS_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export const LAYOUT = {
  hitters: {
    C:    { x: 48, y: 84 },
    '1B': { x: 66, y: 64 },
    '2B': { x: 57, y: 55 },
    '3B': { x: 34, y: 64 },
    SS:   { x: 43, y: 56 },
    LF:   { x: 26, y: 48 },
    CF:   { x: 50, y: 44 },
    RF:   { x: 74, y: 48 },
  },
  starters: [
    { x: 18, y: 11 },
    { x: 34, y: 11 },
    { x: 50, y: 11 },
    { x: 66, y: 11 },
    { x: 82, y: 11 },
  ],
  closer: { x: 50, y: 21 },
};

// Mobile adjustments — nodes a little more spread on portrait
export const LAYOUT_MOBILE = {
  hitters: {
    C:    { x: 48, y: 82 },
    '1B': { x: 68, y: 66 },
    '2B': { x: 58, y: 56 },
    '3B': { x: 32, y: 66 },
    SS:   { x: 42, y: 58 },
    LF:   { x: 22, y: 48 },
    CF:   { x: 50, y: 43 },
    RF:   { x: 78, y: 48 },
  },
  starters: [
    { x: 14, y: 10 },
    { x: 32, y: 10 },
    { x: 50, y: 10 },
    { x: 68, y: 10 },
    { x: 86, y: 10 },
  ],
  closer: { x: 50, y: 21 },
};

// Position labels for display (in player cards)
export const POS_LABELS = {
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
};

// WS banner messages — a bit of fun
export const WS_WON_MESSAGES = [
  "World Champions! 🏆",
  "Champions of the World! 🏆",
  "World Series Champions! 🏆",
];

export const WS_LOST_MESSAGES = [
  "American League Champions — fell in the Fall Classic",
  "AL Pennant Winners — so close, yet so far",
  "Won the pennant, lost the Series",
];

// Award display config
export const AWARD_ICONS = {
  MVP:  { icon: '\u{1F3C5}', label: 'MVP' },
  CY:   { icon: '\u{1F3C6}', label: 'Cy Young' },
  AS:   { icon: '\u2B50',    label: 'All-Star' },
  GG:   { icon: '\u{1F9E4}', label: 'Gold Glove' },
  SS:   { icon: '\u{1F948}', label: 'Silver Slugger' },
  ROY:  { icon: '\u{1F31F}', label: 'Rookie of the Year' },
};

// Node stat lines — returns array of strings for the node bubble
export function getNodeStats(player, role) {
  if (!player) return [];
  if (role === 'closer') {
    const lines = [];
    if (player.SV != null) lines.push(`${player.SV} SV`);
    if (player.ERA != null) lines.push(`${player.ERA} ERA`);
    if (!lines.length) lines.push(`${player.G} G`);
    return lines;
  }
  if (role === 'starter') {
    const lines = [];
    if (player.GS != null) lines.push(`${player.GS} GS`);
    if (player.W != null && player.L != null) lines.push(`${player.W}-${player.L}`);
    if (player.ERA != null) lines.push(`${player.ERA} ERA`);
    if (!lines.length) lines.push(`${player.G} G`);
    return lines;
  }
  // Hitters
  const lines = [];
  if (player.AVG) lines.push(player.AVG);
  if (player.HR != null && player.RBI != null) {
    lines.push(`${player.HR} HR  ${player.RBI} RBI`);
  } else if (player.HR != null) {
    lines.push(`${player.HR} HR`);
  }
  if (!lines.length) lines.push(`${player.G} G`);
  return lines;
}
