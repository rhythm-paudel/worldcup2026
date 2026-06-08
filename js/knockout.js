import { isRealTeam } from './utils.js';

/** Winner of match N → feeds into match M at home/away */
export const WINNER_FEEDS = {
  73: { match: 90, slot: 'home' },
  74: { match: 89, slot: 'home' },
  75: { match: 90, slot: 'away' },
  76: { match: 91, slot: 'home' },
  77: { match: 89, slot: 'away' },
  78: { match: 91, slot: 'away' },
  79: { match: 92, slot: 'home' },
  80: { match: 92, slot: 'away' },
  81: { match: 94, slot: 'home' },
  82: { match: 94, slot: 'away' },
  83: { match: 93, slot: 'home' },
  84: { match: 93, slot: 'away' },
  85: { match: 96, slot: 'home' },
  86: { match: 95, slot: 'home' },
  87: { match: 96, slot: 'away' },
  88: { match: 95, slot: 'away' },
  89: { match: 97, slot: 'home' },
  90: { match: 97, slot: 'away' },
  91: { match: 99, slot: 'home' },
  92: { match: 99, slot: 'away' },
  93: { match: 98, slot: 'home' },
  94: { match: 98, slot: 'away' },
  95: { match: 100, slot: 'home' },
  96: { match: 100, slot: 'away' },
  97: { match: 101, slot: 'home' },
  98: { match: 101, slot: 'away' },
  99: { match: 102, slot: 'home' },
  100: { match: 102, slot: 'away' },
  101: { match: 104, slot: 'home' },
  102: { match: 104, slot: 'away' },
};

/** Semi-final losers → third-place match */
export const LOSER_FEEDS = {
  101: { match: 103, slot: 'home' },
  102: { match: 103, slot: 'away' },
};

/** Left → center → right bracket layout (match numbers) */
export const BRACKET_LAYOUT = {
  left: [
    { key: 'round-of-32', label: 'Round of 32', nums: [73, 75, 74, 77, 76, 78, 79, 80] },
    { key: 'round-of-16', label: 'Round of 16', nums: [90, 89, 91, 92] },
    { key: 'quarter-final', label: 'Quarter-final', nums: [97, 99] },
    { key: 'semi-final', label: 'Semi-final', nums: [101] },
  ],
  right: [
    { key: 'semi-final', label: 'Semi-final', nums: [102] },
    { key: 'quarter-final', label: 'Quarter-final', nums: [98, 100] },
    { key: 'round-of-16', label: 'Round of 16', nums: [94, 93, 96, 95] },
    { key: 'round-of-32', label: 'Round of 32', nums: [81, 83, 84, 82, 85, 86, 87, 88] },
  ],
  center: { final: 104, third: 103 },
};

export function matchByNum(db, num) {
  return db.matches.find((m) => m.num === num);
}

export function isPlaceholderTeam(teamId, teamsById) {
  const t = teamsById.get(teamId);
  if (!t) return true;
  return !isRealTeam(teamId, teamsById);
}

export function assignTeamToSlot(match, slot, team, db) {
  if (slot === 'home') {
    match.homeTeam = team.id;
    match.homeTeamName = team.name;
  } else {
    match.awayTeam = team.id;
    match.awayTeamName = team.name;
  }

  if (!db.teams.find((t) => t.id === team.id)) {
    db.teams.push({
      id: team.id,
      name: team.name,
      flag: team.flag || '🏳️',
      group: team.group || null,
    });
  }
}

export function getMatchWinner(match) {
  if (match.status !== 'finished') return null;
  const { home, away } = match.score;
  if (home === null || away === null || home === away) return null;
  if (home > away) {
    return { id: match.homeTeam, name: match.homeTeamName };
  }
  return { id: match.awayTeam, name: match.awayTeamName };
}

export function getMatchLoser(match) {
  if (match.status !== 'finished') return null;
  const { home, away } = match.score;
  if (home === null || away === null || home === away) return null;
  if (home > away) {
    return { id: match.awayTeam, name: match.awayTeamName };
  }
  return { id: match.homeTeam, name: match.homeTeamName };
}

export function advanceFromMatch(db, matchNum) {
  const source = matchByNum(db, matchNum);
  if (!source) return [];

  const updated = [];
  const winner = getMatchWinner(source);
  const loser = getMatchLoser(source);

  if (winner && WINNER_FEEDS[matchNum]) {
    const feed = WINNER_FEEDS[matchNum];
    const target = matchByNum(db, feed.match);
    if (target) {
      const team = db.teams.find((t) => t.id === winner.id) || {
        id: winner.id,
        name: winner.name,
        flag: '🏳️',
      };
      assignTeamToSlot(target, feed.slot, team, db);
      updated.push(target);
    }
  }

  if (loser && LOSER_FEEDS[matchNum]) {
    const feed = LOSER_FEEDS[matchNum];
    const target = matchByNum(db, feed.match);
    if (target) {
      const team = db.teams.find((t) => t.id === loser.id) || {
        id: loser.id,
        name: loser.name,
        flag: '🏳️',
      };
      assignTeamToSlot(target, feed.slot, team, db);
      updated.push(target);
    }
  }

  return updated;
}

export function processKnockoutResult(db, match) {
  if (match.stage === 'group') return [];
  if (match.status !== 'finished') return [];
  return advanceFromMatch(db, match.num);
}

export function getOpenSlots(db, teamsById, stage = null) {
  const knockout = db.matches.filter((m) => m.stage !== 'group');
  const pool = stage ? knockout.filter((m) => m.stage === stage) : knockout;

  const slots = [];
  pool.forEach((m) => {
    if (isPlaceholderTeam(m.homeTeam, teamsById)) {
      slots.push({ match: m, slot: 'home', label: m.homeTeamName });
    }
    if (isPlaceholderTeam(m.awayTeam, teamsById)) {
      slots.push({ match: m, slot: 'away', label: m.awayTeamName });
    }
  });
  return slots;
}
