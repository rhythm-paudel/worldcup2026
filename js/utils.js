const STAGE_LABELS = {
  group: 'Group stage',
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
  'quarter-final': 'Quarter-finals',
  'semi-final': 'Semi-finals',
  'third-place': 'Third place',
  final: 'Final',
  knockout: 'Knockout',
};

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatStage(stage) {
  return STAGE_LABELS[stage] || stage;
}

export function formatScore(match) {
  const { home, away } = match.score;
  if (home === null || away === null) return '—';
  return `${home} – ${away}`;
}

export function statusLabel(status) {
  if (status === 'live') return 'Live';
  if (status === 'finished') return 'FT';
  return '';
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isRealTeam(teamId, teamsById) {
  const t = teamsById.get(teamId);
  if (!t) return false;
  return !/^\d|[WL]\d|3[A-Z]/.test(t.name) && !t.name.includes('/');
}
