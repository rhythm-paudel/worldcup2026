import { isRealTeam } from './utils.js';

function initRow(team) {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

export function computeStandings(db, teamsById) {
  const groups = {};

  db.teams.forEach((t) => {
    if (!t.group || !isRealTeam(t.id, teamsById)) return;
    if (!groups[t.group]) groups[t.group] = new Map();
    groups[t.group].set(t.id, initRow(t));
  });

  db.matches
    .filter((m) => m.stage === 'group' && m.status === 'finished')
    .forEach((m) => {
      if (!m.group) return;
      const table = groups[m.group];
      if (!table) return;

      const home = table.get(m.homeTeam);
      const away = table.get(m.awayTeam);
      if (!home || !away) return;

      const h = m.score.home;
      const a = m.score.away;
      if (h === null || a === null) return;

      home.played++;
      away.played++;
      home.gf += h;
      home.ga += a;
      away.gf += a;
      away.ga += h;

      if (h > a) {
        home.won++;
        away.lost++;
        home.points += 3;
      } else if (h < a) {
        away.won++;
        home.lost++;
        away.points += 3;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }

      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
    });

  const sorted = {};
  for (const [group, table] of Object.entries(groups)) {
    sorted[group] = [...table.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });
  }

  return sorted;
}

export const STAGE_OPTIONS = [
  { value: 'group', label: 'Group stage' },
  { value: 'round-of-32', label: 'Round of 32' },
  { value: 'round-of-16', label: 'Round of 16' },
  { value: 'quarter-final', label: 'Quarter-finals' },
  { value: 'semi-final', label: 'Semi-finals' },
  { value: 'third-place', label: 'Third place' },
  { value: 'final', label: 'Final' },
];

export const KNOCKOUT_STAGES = STAGE_OPTIONS.filter((s) => s.value !== 'group').map(
  (s) => s.value
);
