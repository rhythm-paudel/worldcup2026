import { escapeHtml, formatDate, getMatchDateTimeInfo, getTimezoneMode } from './utils.js';
import { BRACKET_LAYOUT, isPlaceholderTeam, matchByNum } from './knockout.js';

const COL_GAPS = {
  'round-of-32': '0.5rem',
  'round-of-16': '3.25rem',
  'quarter-final': '7.5rem',
  'semi-final': '0',
};

function teamFlag(teamId, indexes) {
  return indexes.teamsById.get(teamId)?.flag || '';
}

function teamRow(m, side, indexes) {
  const teamId = side === 'home' ? m.homeTeam : m.awayTeam;
  const teamName = side === 'home' ? m.homeTeamName : m.awayTeamName;
  const flag = teamFlag(teamId, indexes);
  const finished = m.status === 'finished';
  const live = m.status === 'live';
  const score = side === 'home' ? m.score.home : m.score.away;
  const showScore = finished || live;
  const placeholder = isPlaceholderTeam(teamId, indexes.teamsById);

  const hScore = m.score.home;
  const aScore = m.score.away;
  const isWinner =
    finished && showScore && hScore !== null && aScore !== null
      ? side === 'home'
        ? hScore > aScore
        : aScore > hScore
      : false;

  const flagSpan = `<span class="bt-flag" aria-hidden="true">${flag || (placeholder ? '○' : '🏳️')}</span>`;

  const nameHtml = placeholder
    ? `<span class="bt-name tbd">${flagSpan}${escapeHtml(teamName)}</span>`
    : `<button type="button" class="bt-name link" data-action="team" data-id="${teamId}">${flagSpan}${escapeHtml(teamName)}</button>`;

  return `
    <div class="bt-row ${isWinner ? 'winner' : ''} ${placeholder ? 'is-tbd' : ''}">
      ${nameHtml}
      <span class="bt-score">${showScore && score !== null ? score : ''}</span>
    </div>`;
}

function bracketNode(m, indexes, side) {
  if (!m) return '';
  const live = m.status === 'live';
  const done = m.status === 'finished';

  return `
    <div class="bt-node ${live ? 'is-live' : ''} ${done ? 'is-done' : ''}" data-match-id="${m.id}" data-side="${side}">
      <div class="bt-node-head">M${m.num}</div>
      <div class="bt-node-body">
        ${teamRow(m, 'home', indexes)}
        ${teamRow(m, 'away', indexes)}
      </div>
      <div class="bt-node-foot">${getMatchDateTimeInfo(m, getTimezoneMode()).dateLabel}</div>
    </div>`;
}

function renderColumn(round, db, indexes, side) {
  const gap = COL_GAPS[round.key] || '0.5rem';
  const matches = round.nums.map((n) => matchByNum(db, n)).filter(Boolean);

  return `
    <div class="bt-col bt-col--${round.key} bt-col--${side}" data-side="${side}" style="--col-gap:${gap}">
      <div class="bt-col-label">${round.label}</div>
      <div class="bt-col-matches">
        ${matches.map((m) => bracketNode(m, indexes, side)).join('')}
      </div>
    </div>`;
}

function renderCenter(db, indexes) {
  const final = matchByNum(db, BRACKET_LAYOUT.center.final);
  const third = matchByNum(db, BRACKET_LAYOUT.center.third);

  return `
    <div class="bt-center">
      <div class="bt-center-label">Final</div>
      ${bracketNode(final, indexes, 'center')}
      <div class="bt-third-wrap">
        <div class="bt-center-label bt-third-label">3rd place</div>
        ${bracketNode(third, indexes, 'center')}
      </div>
    </div>`;
}

export function renderBracket(db, indexes) {
  const leftCols = BRACKET_LAYOUT.left
    .map((r) => renderColumn(r, db, indexes, 'left'))
    .join('');

  const rightCols = BRACKET_LAYOUT.right
    .map((r) => renderColumn(r, db, indexes, 'right'))
    .join('');

  return `
    <div class="bracket-wrap">
      <p class="bracket-hint">Swipe sideways to explore · Knockout only</p>
      <div class="bracket-arena" tabindex="0" aria-label="Knockout bracket">
        <div class="bt-side bt-side-left">${leftCols}</div>
        ${renderCenter(db, indexes)}
        <div class="bt-side bt-side-right">${rightCols}</div>
      </div>
    </div>`;
}

export { isPlaceholderTeam } from './knockout.js';
