import { formatStage } from './utils.js';

export function createFilterState() {
  return {
    search: '',
    hostCountry: '',
    team: '',
    group: '',
    stage: '',
    status: '',
    date: '',
    view: 'matches',
  };
}

function teamPlayerNames(teamId, indexes) {
  return (indexes.playersByTeam.get(teamId) || [])
    .map((p) => p.name)
    .join(' ');
}

export function filterMatches(matches, filters, indexes) {
  const { teamsById, venuesById } = indexes;
  const q = filters.search.trim().toLowerCase();

  return matches.filter((m) => {
    if (filters.hostCountry && m.hostCountry !== filters.hostCountry) return false;
    if (filters.team && m.homeTeam !== filters.team && m.awayTeam !== filters.team)
      return false;
    if (filters.group && m.group !== filters.group) return false;
    if (filters.stage && m.stage !== filters.stage) return false;
    if (filters.status && m.status !== filters.status) return false;
    if (filters.date && m.date !== filters.date) return false;

    if (q) {
      const venue = venuesById.get(m.venueId);
      const home = teamsById.get(m.homeTeam);
      const away = teamsById.get(m.awayTeam);
      const haystack = [
        m.homeTeamName,
        m.awayTeamName,
        home?.name,
        away?.name,
        m.hostCountry,
        venue?.name,
        m.round,
        m.group ? `Group ${m.group}` : '',
        formatStage(m.stage),
        teamPlayerNames(m.homeTeam, indexes),
        teamPlayerNames(m.awayTeam, indexes),
        m.score.home !== null ? String(m.score.home) : '',
        m.score.away !== null ? String(m.score.away) : '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function getActiveChips(filters, indexes) {
  const chips = [];
  const { teamsById } = indexes;

  if (filters.search) chips.push({ key: 'search', label: `Search: ${filters.search}` });
  if (filters.hostCountry)
    chips.push({ key: 'hostCountry', label: `Host: ${filters.hostCountry}` });
  if (filters.team) {
    const t = teamsById.get(filters.team);
    chips.push({ key: 'team', label: `Team: ${t?.name || filters.team}` });
  }
  if (filters.group) chips.push({ key: 'group', label: `Group ${filters.group}` });
  if (filters.stage)
    chips.push({ key: 'stage', label: formatStage(filters.stage) });
  if (filters.status)
    chips.push({ key: 'status', label: filters.status });
  if (filters.date) chips.push({ key: 'date', label: filters.date });

  return chips;
}

export function populateFilterOptions(db, els) {
  const realTeams = db.teams
    .filter((t) => t.group && !/^\d|[WL]\d|3[A-Z]/.test(t.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  els.host.innerHTML =
    '<option value="">All hosts</option>' +
    db.hostCountries.map((c) => `<option value="${c}">${c}</option>`).join('');

  els.team.innerHTML =
    '<option value="">All teams</option>' +
    realTeams.map((t) => `<option value="${t.id}">${t.flag} ${t.name}</option>`).join('');

  const groups = [...new Set(realTeams.map((t) => t.group).filter(Boolean))].sort();
  els.group.innerHTML =
    '<option value="">All groups</option>' +
    groups.map((g) => `<option value="${g}">Group ${g}</option>`).join('');

  const stages = [...new Set(db.matches.map((m) => m.stage))];
  const stageOrder = [
    'group',
    'round-of-32',
    'round-of-16',
    'quarter-final',
    'semi-final',
    'third-place',
    'final',
  ];
  stages.sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));

  els.stage.innerHTML =
    '<option value="">All stages</option>' +
    stages.map((s) => `<option value="${s}">${formatStage(s)}</option>`).join('');
}
