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

export function getTimezoneMode() {
  return localStorage.getItem('wc2026-timezone-preference') || 'venue';
}

export function parseMatchDateTime(dateStr, timeStr, timezoneStr) {
  const offsetPart = timezoneStr.replace('UTC', '').trim();
  let offset = 0;
  if (offsetPart) {
    const sign = offsetPart.startsWith('+') ? 1 : -1;
    const hours = parseInt(offsetPart.replace(/[+-]/, ''), 10);
    offset = sign * hours * 60;
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min] = timeStr.split(':').map(Number);
  
  const utcMs = Date.UTC(year, month - 1, day, hour, min);
  return new Date(utcMs - offset * 60000);
}

export function getLocalTimezoneName(date) {
  try {
    const formatter = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : '';
  } catch (e) {
    return '';
  }
}

export function getMatchDateTimeInfo(m, timezoneMode) {
  const utcDate = parseMatchDateTime(m.date, m.time, m.timezone);

  if (timezoneMode === 'local') {
    const localDateStr = utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    const localTimeStr = utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const localTz = getLocalTimezoneName(utcDate);
    
    const yyyy = utcDate.getFullYear();
    const mm = String(utcDate.getMonth() + 1).padStart(2, '0');
    const dd = String(utcDate.getDate()).padStart(2, '0');
    const localIsoDate = `${yyyy}-${mm}-${dd}`;

    return {
      dateLabel: localDateStr,
      timeLabel: localTimeStr,
      timezoneLabel: localTz || 'Local',
      groupDateKey: localIsoDate,
      isoDate: localIsoDate,
    };
  }

  const venueDateLabel = formatDate(m.date);
  return {
    dateLabel: venueDateLabel,
    timeLabel: m.time,
    timezoneLabel: m.timezone,
    groupDateKey: m.date,
    isoDate: m.date,
  };
}
