import { CONFIG } from './config.js';

export async function loadDatabase() {
  const stored = localStorage.getItem(CONFIG.storageKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(CONFIG.storageKey);
    }
  }

  const res = await fetch(CONFIG.dataUrl);
  if (!res.ok) throw new Error('Failed to load match data');
  return res.json();
}

export function saveDatabase(db) {
  db.meta.updated = new Date().toISOString().split('T')[0];
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(db));
}

export function clearLocalDatabase() {
  localStorage.removeItem(CONFIG.storageKey);
}

export function exportDatabase(db) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'database.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function buildIndexes(db) {
  const teamsById = new Map(db.teams.map((t) => [t.id, t]));
  const venuesById = new Map(db.venues.map((v) => [v.id, v]));
  const playersById = new Map(db.players.map((p) => [p.id, p]));
  const playersByTeam = new Map();

  db.players.forEach((p) => {
    if (!playersByTeam.has(p.teamId)) playersByTeam.set(p.teamId, []);
    playersByTeam.get(p.teamId).push(p);
  });

  const matchesByTeam = new Map();
  const matchesByVenue = new Map();
  const matchesByHost = new Map();

  db.matches.forEach((m) => {
    [m.homeTeam, m.awayTeam].forEach((tid) => {
      if (!matchesByTeam.has(tid)) matchesByTeam.set(tid, []);
      matchesByTeam.get(tid).push(m);
    });
    if (!matchesByVenue.has(m.venueId)) matchesByVenue.set(m.venueId, []);
    matchesByVenue.get(m.venueId).push(m);
    if (!matchesByHost.has(m.hostCountry)) matchesByHost.set(m.hostCountry, []);
    matchesByHost.get(m.hostCountry).push(m);
  });

  return {
    teamsById,
    venuesById,
    playersById,
    playersByTeam,
    matchesByTeam,
    matchesByVenue,
    matchesByHost,
  };
}
