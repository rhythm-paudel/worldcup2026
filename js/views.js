import {
  escapeHtml,
  formatDate,
  formatScore,
  formatStage,
  isRealTeam,
  statusLabel,
  getMatchDateTimeInfo,
  getTimezoneMode,
} from './utils.js';
import { computeStandings } from './standings.js';

function teamChip(teamId, teamsById, clickable = true) {
  const t = teamsById.get(teamId);
  if (!t) return `<span class="team-unknown">${escapeHtml(teamId)}</span>`;
  const real = isRealTeam(teamId, teamsById);
  if (!clickable || !real) {
    return `<span class="team-chip">${t.flag} ${escapeHtml(t.name)}</span>`;
  }
  return `<button type="button" class="team-chip link" data-action="team" data-id="${t.id}">${t.flag} ${escapeHtml(t.name)}</button>`;
}

function matchCard(m, indexes) {
  const { teamsById, venuesById } = indexes;
  const venue = venuesById.get(m.venueId);
  const live = m.status === 'live';
  const finished = m.status === 'finished';
  
  const tzMode = getTimezoneMode();
  const dtInfo = getMatchDateTimeInfo(m, tzMode);

  return `
    <article class="match-card ${live ? 'is-live' : ''} ${finished ? 'is-finished' : ''}" data-match-id="${m.id}">
      <div class="match-meta">
        <time datetime="${dtInfo.isoDate}">${dtInfo.dateLabel}</time>
        <span class="match-time">${escapeHtml(dtInfo.timeLabel)} ${escapeHtml(dtInfo.timezoneLabel)}</span>
        ${m.group ? `<span class="badge">Group ${m.group}</span>` : `<span class="badge muted">${escapeHtml(m.round)}</span>`}
        ${statusLabel(m.status) ? `<span class="status-pill ${m.status}">${statusLabel(m.status)}</span>` : ''}
      </div>
      <div class="match-teams">
        <div class="match-team home">${teamChip(m.homeTeam, teamsById)}</div>
        <div class="match-score">
          ${
            finished || live
              ? `<span class="score">${m.score.home ?? '–'} – ${m.score.away ?? '–'}</span>`
              : '<span class="vs">vs</span>'
          }
        </div>
        <div class="match-team away">${teamChip(m.awayTeam, teamsById)}</div>
      </div>
      <div class="match-venue">
        <button type="button" class="venue-link" data-action="venue" data-id="${m.venueId}">
          ${escapeHtml(venue?.name || m.venueId)}
        </button>
        <span class="host-country" data-action="host" data-id="${escapeHtml(m.hostCountry)}">${escapeHtml(m.hostCountry)}</span>
      </div>
    </article>
  `;
}

function groupMatchesByDate(matches, tzMode) {
  const groups = new Map();
  matches.forEach((m) => {
    const dtInfo = getMatchDateTimeInfo(m, tzMode);
    const key = dtInfo.groupDateKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ match: m, dtInfo });
  });
  return groups;
}

export function renderMatches(matches, indexes) {
  if (!matches.length) {
    return `<div class="empty-state"><p>No matches match your filters.</p></div>`;
  }

  const tzMode = getTimezoneMode();
  const byDate = groupMatchesByDate(matches, tzMode);
  const sortedKeys = Array.from(byDate.keys()).sort();
  let html = '';

  for (const dateKey of sortedKeys) {
    const dayMatches = byDate.get(dateKey);
    const firstMatchDtInfo = dayMatches[0].dtInfo;
    html += `<section class="day-group">
      <h3 class="day-heading">${firstMatchDtInfo.dateLabel}</h3>
      <div class="match-list">${dayMatches.map(({ match }) => matchCard(match, indexes)).join('')}</div>
    </section>`;
  }

  return html;
}

export function renderTeams(db, indexes) {
  const realTeams = db.teams
    .filter((t) => t.group && isRealTeam(t.id, indexes.teamsById))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const byGroup = new Map();
  realTeams.forEach((t) => {
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group).push(t);
  });

  let html = '';
  for (const [group, teams] of [...byGroup.entries()].sort()) {
    html += `<section class="team-group">
      <h3>Group ${group}</h3>
      <div class="team-grid">${teams
        .map(
          (t) => `
        <button type="button" class="team-card" data-action="team" data-id="${t.id}">
          <span class="team-flag">${t.flag}</span>
          <span class="team-name">${escapeHtml(t.name)}</span>
        </button>`
        )
        .join('')}</div>
    </section>`;
  }

  return html;
}

export function renderVenues(db, indexes) {
  const byHost = new Map();
  db.venues.forEach((v) => {
    if (!byHost.has(v.hostCountry)) byHost.set(v.hostCountry, []);
    byHost.get(v.hostCountry).push(v);
  });

  let html = '';
  for (const host of db.hostCountries) {
    const venues = byHost.get(host) || [];
    html += `<section class="venue-group">
      <h3>${escapeHtml(host)} <span class="count">${venues.length} venues</span></h3>
      <div class="venue-list">${venues
        .map((v) => {
          const count = indexes.matchesByVenue.get(v.id)?.length || 0;
          return `
          <button type="button" class="venue-card" data-action="venue" data-id="${v.id}">
            <span class="venue-name">${escapeHtml(v.name)}</span>
            <span class="venue-meta">${count} matches</span>
          </button>`;
        })
        .join('')}</div>
    </section>`;
  }

  return html;
}

export function renderTeamDetail(teamId, db, indexes) {
  const team = indexes.teamsById.get(teamId);
  if (!team) return '<p>Team not found.</p>';

  const matches = indexes.matchesByTeam.get(teamId) || [];
  const players = (indexes.playersByTeam.get(teamId) || []).filter((p) => !p.placeholder);

  return `
    <div class="detail-header">
      <span class="detail-flag">${team.flag}</span>
      <div>
        <h2>${escapeHtml(team.name)}</h2>
        ${team.group ? `<p class="detail-sub">Group ${team.group}</p>` : ''}
      </div>
    </div>

    <section class="detail-section">
      <h3>Squad</h3>
      ${
        players.length
          ? `<ul class="player-list">${players
              .map(
                (p) => `
            <li>
              <button type="button" class="player-row" data-action="player" data-id="${p.id}">
                <span class="player-num">${p.number ?? '—'}</span>
                <span class="player-name">${escapeHtml(p.name)}</span>
                <span class="player-pos">${escapeHtml(p.position)}</span>
              </button>
            </li>`
              )
              .join('')}</ul>`
          : '<p class="muted">Squad data not yet available.</p>'
      }
    </section>

    <section class="detail-section">
      <h3>Matches (${matches.length})</h3>
      <div class="detail-matches">${matches.map((m) => matchCard(m, indexes)).join('')}</div>
    </section>
  `;
}

export function renderPlayerDetail(playerId, db, indexes) {
  const player = indexes.playersById.get(playerId);
  if (!player) return '<p>Player not found.</p>';

  const team = indexes.teamsById.get(player.teamId);
  const matches = indexes.matchesByTeam.get(player.teamId) || [];

  return `
    <div class="detail-header">
      <span class="detail-flag">${team?.flag || '🏳️'}</span>
      <div>
        <h2>${escapeHtml(player.name)}</h2>
        <p class="detail-sub">
          <button type="button" class="inline-link" data-action="team" data-id="${player.teamId}">
            ${team?.flag || ''} ${escapeHtml(player.teamName)}
          </button>
          · ${escapeHtml(player.position)}${player.number ? ` · #${player.number}` : ''}
        </p>
      </div>
    </div>

    <section class="detail-section">
      <h3>Team matches</h3>
      <div class="detail-matches">${matches.map((m) => matchCard(m, indexes)).join('')}</div>
    </section>
  `;
}

export function renderVenueDetail(venueId, db, indexes) {
  const venue = indexes.venuesById.get(venueId);
  if (!venue) return '<p>Venue not found.</p>';

  const matches = indexes.matchesByVenue.get(venueId) || [];

  return `
    <div class="detail-header">
      <div>
        <h2>${escapeHtml(venue.name)}</h2>
        <p class="detail-sub">
          <button type="button" class="inline-link" data-action="host" data-id="${escapeHtml(venue.hostCountry)}">
            ${escapeHtml(venue.hostCountry)}
          </button>
          · ${matches.length} matches
        </p>
      </div>
    </div>

    <section class="detail-section">
      <h3>Fixtures at this venue</h3>
      <div class="detail-matches">${matches.map((m) => matchCard(m, indexes)).join('')}</div>
    </section>
  `;
}

export function renderStandings(db, indexes) {
  const standings = computeStandings(db, indexes.teamsById);
  const groups = Object.keys(standings).sort();

  if (!groups.length) {
    return '<div class="empty-state"><p>No group standings yet.</p></div>';
  }

  let html = '<div class="standings-grid">';

  for (const group of groups) {
    const rows = standings[group];
    html += `
      <section class="standings-card">
        <h3 class="standings-group-title">Group ${group}</h3>
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row, i) => {
                const qual = i < 2 ? 'qualifying' : i < 3 ? 'possible' : '';
                return `
              <tr class="${qual}">
                <td>${i + 1}</td>
                <td>
                  <button type="button" class="standings-team" data-action="team" data-id="${row.team.id}">
                    ${row.team.flag} ${escapeHtml(row.team.name)}
                  </button>
                </td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.drawn}</td>
                <td>${row.lost}</td>
                <td>${row.gd > 0 ? '+' : ''}${row.gd}</td>
                <td class="pts">${row.points}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </section>`;
  }

  html += '</div>';
  html += '<p class="standings-note">Top 2 qualify · 3rd may advance as best third-place teams</p>';
  return html;
}

export function renderHostDetail(hostCountry, db, indexes) {
  const matches = indexes.matchesByHost.get(hostCountry) || [];
  const venues = db.venues.filter((v) => v.hostCountry === hostCountry);

  return `
    <div class="detail-header">
      <div>
        <h2>Matches in ${escapeHtml(hostCountry)}</h2>
        <p class="detail-sub">${matches.length} matches · ${venues.length} venues</p>
      </div>
    </div>

    <section class="detail-section">
      <h3>Venues</h3>
      <div class="chip-row">${venues
        .map(
          (v) =>
            `<button type="button" class="chip-btn" data-action="venue" data-id="${v.id}">${escapeHtml(v.name)}</button>`
        )
        .join('')}</div>
    </section>

    <section class="detail-section">
      <h3>All matches</h3>
      <div class="detail-matches">${matches.map((m) => matchCard(m, indexes)).join('')}</div>
    </section>
  `;
}
