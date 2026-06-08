import { checkAdminAccess } from './admin-auth.js';
import {
  clearLocalDatabase,
  exportDatabase,
  loadDatabase,
  saveDatabase,
  buildIndexes,
} from './data.js';
import {
  assignTeamToSlot,
  getOpenSlots,
  isPlaceholderTeam,
  processKnockoutResult,
} from './knockout.js';
import { STAGE_OPTIONS } from './standings.js';
import { renderStandings } from './views.js';
import { formatDate } from './utils.js';

let db = null;
let indexes = null;
let scoreStage = 'group';
let knockoutStage = 'round-of-32';
let selectedMatchId = null;

const adminApp = document.getElementById('admin-app');
const accessDenied = document.getElementById('access-denied');

async function init() {
  const allowed = await checkAdminAccess();

  if (!allowed) {
    accessDenied.hidden = false;
    return;
  }

  adminApp.hidden = false;
  await showDashboard();
}

async function showDashboard() {
  db = await loadDatabase();
  indexes = buildIndexes(db);
  buildStageTabs();
  bindAdminEvents();
  renderScorePanel();
  renderKnockoutPanel();
  renderStandingsPanel();
}

function getRealTeams() {
  return db.teams
    .filter((t) => t.group && !/^\d|[WL]\d|3[A-Z]/.test(t.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function teamOptions(selectedId, filter = '') {
  const q = filter.toLowerCase();
  return getRealTeams()
    .filter((t) => !q || t.name.toLowerCase().includes(q))
    .map(
      (t) =>
        `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${t.flag} ${t.name}</option>`
    )
    .join('');
}

function buildStageTabs() {
  document.getElementById('score-stage-tabs').innerHTML = STAGE_OPTIONS.map(
    (s) =>
      `<button type="button" class="stage-pill ${s.value === scoreStage ? 'active' : ''}" data-score-stage="${s.value}">${s.label}</button>`
  ).join('');

  document.getElementById('knockout-stage-tabs').innerHTML = STAGE_OPTIONS.filter(
    (s) => s.value !== 'group'
  )
    .map(
      (s) =>
        `<button type="button" class="stage-pill ${s.value === knockoutStage ? 'active' : ''}" data-ko-stage="${s.value}">${s.label}</button>`
    )
    .join('');
}

function matchesForStage(stage) {
  return db.matches.filter((m) => m.stage === stage).sort((a, b) => a.num - b.num);
}

function flash(msg) {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function saveAndRefresh(message) {
  saveDatabase(db);
  indexes = buildIndexes(db);
  if (message) flash(message);
  renderKnockoutPanel();
  renderStandingsPanel();
}

function renderScorePanel() {
  const container = document.getElementById('score-editor');
  const matches = matchesForStage(scoreStage);

  if (!matches.length) {
    container.innerHTML = '<p class="muted">No matches in this stage.</p>';
    return;
  }

  if (!selectedMatchId || !matches.find((m) => m.id === selectedMatchId)) {
    selectedMatchId = matches[0].id;
  }

  const match = db.matches.find((m) => m.id === selectedMatchId);
  const isKnockout = match.stage !== 'group';

  container.innerHTML = `
    <div class="editor-grid">
      <label class="editor-field full">
        <span>Match</span>
        <select id="score-match-select">
          ${matches
            .map(
              (m) =>
                `<option value="${m.id}" ${m.id === selectedMatchId ? 'selected' : ''}>
                  M${m.num} · ${formatDate(m.date)} · ${m.homeTeamName} vs ${m.awayTeamName}
                </option>`
            )
            .join('')}
        </select>
      </label>

      <div class="score-box">
        <div class="score-team">
          <span class="score-label">${match.homeTeamName}</span>
          <input type="number" id="score-home" min="0" value="${match.score.home ?? ''}" placeholder="0" />
        </div>
        <span class="score-sep">–</span>
        <div class="score-team">
          <span class="score-label">${match.awayTeamName}</span>
          <input type="number" id="score-away" min="0" value="${match.score.away ?? ''}" placeholder="0" />
        </div>
      </div>

      <label class="editor-field">
        <span>Status</span>
        <select id="score-status">
          <option value="scheduled" ${match.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
          <option value="live" ${match.status === 'live' ? 'selected' : ''}>Live</option>
          <option value="finished" ${match.status === 'finished' ? 'selected' : ''}>Finished</option>
        </select>
      </label>

      <button type="button" class="btn-primary" id="save-score-btn">Save score</button>
    </div>

    ${
      isKnockout
        ? '<p class="admin-hint">Saving a <strong>finished</strong> knockout match auto-advances the winner to the next round on the bracket.</p>'
        : ''
    }

    <div class="match-quick-list">
      ${matches
        .map((m) => {
          const done = m.status === 'finished';
          const live = m.status === 'live';
          const sc = m.score.home !== null ? `${m.score.home}–${m.score.away}` : '—';
          return `
          <button type="button" class="quick-match ${m.id === selectedMatchId ? 'active' : ''} ${done ? 'done' : ''} ${live ? 'live' : ''}" data-match-id="${m.id}">
            <span class="qm-teams">M${m.num} ${m.homeTeamName} vs ${m.awayTeamName}</span>
            <span class="qm-score">${sc}</span>
          </button>`;
        })
        .join('')}
    </div>`;

  document.getElementById('score-match-select').addEventListener('change', (e) => {
    selectedMatchId = e.target.value;
    renderScorePanel();
  });

  container.querySelectorAll('.quick-match').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMatchId = btn.dataset.matchId;
      renderScorePanel();
    });
  });

  document.getElementById('save-score-btn').addEventListener('click', () => {
    const m = db.matches.find((x) => x.id === selectedMatchId);
    const home = document.getElementById('score-home').value;
    const away = document.getElementById('score-away').value;
    m.score.home = home === '' ? null : Number(home);
    m.score.away = away === '' ? null : Number(away);
    m.status = document.getElementById('score-status').value;

    saveDatabase(db);

    let msg = 'Score saved.';
    if (m.stage !== 'group' && m.status === 'finished') {
      const advanced = processKnockoutResult(db, m);
      if (advanced.length) {
        const winner =
          m.score.home > m.score.away ? m.homeTeamName : m.awayTeamName;
        msg = `${winner} advanced to the next round.`;
        saveDatabase(db);
      }
    }

    indexes = buildIndexes(db);
    flash(msg);
    renderScorePanel();
    renderKnockoutPanel();
    renderStandingsPanel();
  });
}

function bindTeamPick(select) {
  select.addEventListener('change', () => {
    if (!select.value) return;
    const match = db.matches.find((m) => m.id === select.dataset.match);
    const team = db.teams.find((t) => t.id === select.value);
    if (!match || !team) return;
    assignTeamToSlot(match, select.dataset.slot, team, db);
    saveAndRefresh(`${team.name} added to M${match.num}`);
  });
}

function renderKnockoutPanel() {
  const container = document.getElementById('knockout-editor');
  const matches = matchesForStage(knockoutStage);
  const openSlots = getOpenSlots(db, indexes.teamsById, knockoutStage);

  let html = '';

  if (openSlots.length) {
    html += `
      <div class="open-slots-box">
        <h3>Open slots — pick a team to fill instantly</h3>
        <div class="open-slots-list">
          ${openSlots
            .map(
              (s) => `
            <div class="open-slot-row">
              <div class="open-slot-info">
                <strong>M${s.match.num}</strong>
                <span class="open-slot-pos">${s.slot === 'home' ? 'Home' : 'Away'}</span>
                <span class="tbd-tag">${s.label}</span>
              </div>
              <select class="instant-team-pick" data-match="${s.match.id}" data-slot="${s.slot}">
                <option value="">Choose team…</option>
                ${teamOptions('')}
              </select>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  html += `<div class="ko-match-grid">`;

  if (!matches.length) {
    html += '<p class="muted">No matches in this round.</p>';
  } else {
    html += matches
      .map((m) => {
        const homeTbd = isPlaceholderTeam(m.homeTeam, indexes.teamsById);
        const awayTbd = isPlaceholderTeam(m.awayTeam, indexes.teamsById);

        return `
        <article class="ko-match-card">
          <header>
            <span class="ko-num">Match ${m.num}</span>
            <span class="ko-date">${formatDate(m.date)}</span>
          </header>
          <div class="ko-slots">
            <label>
              <span>Home ${homeTbd ? `<em class="tbd-tag">${m.homeTeamName}</em>` : `· ${m.homeTeamName}`}</span>
              <select class="team-pick" data-match="${m.id}" data-slot="home">
                <option value="">${homeTbd ? 'Assign team…' : 'Change team…'}</option>
                ${teamOptions(homeTbd ? '' : m.homeTeam)}
              </select>
            </label>
            <label>
              <span>Away ${awayTbd ? `<em class="tbd-tag">${m.awayTeamName}</em>` : `· ${m.awayTeamName}`}</span>
              <select class="team-pick" data-match="${m.id}" data-slot="away">
                <option value="">${awayTbd ? 'Assign team…' : 'Change team…'}</option>
                ${teamOptions(awayTbd ? '' : m.awayTeam)}
              </select>
            </label>
          </div>
        </article>`;
      })
      .join('');
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.instant-team-pick, .team-pick').forEach(bindTeamPick);
}

function renderStandingsPanel() {
  indexes = buildIndexes(db);
  document.getElementById('admin-standings-root').innerHTML = renderStandings(db, indexes);
}

function bindAdminEvents() {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
      if (tab.dataset.tab === 'standings') renderStandingsPanel();
      if (tab.dataset.tab === 'teams') renderKnockoutPanel();
    });
  });

  document.getElementById('score-stage-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-score-stage]');
    if (!btn) return;
    scoreStage = btn.dataset.scoreStage;
    selectedMatchId = null;
    buildStageTabs();
    renderScorePanel();
  });

  document.getElementById('knockout-stage-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ko-stage]');
    if (!btn) return;
    knockoutStage = btn.dataset.koStage;
    buildStageTabs();
    renderKnockoutPanel();
  });

  document.getElementById('export-data').addEventListener('click', () => exportDatabase(db));

  document.getElementById('import-data').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      db = JSON.parse(await file.text());
      saveDatabase(db);
      indexes = buildIndexes(db);
      buildStageTabs();
      renderScorePanel();
      renderKnockoutPanel();
      renderStandingsPanel();
      flash('Data imported.');
    } catch {
      alert('Invalid JSON file.');
    }
    e.target.value = '';
  });

  document.getElementById('reset-local').addEventListener('click', () => {
    if (confirm('Remove all local edits and reload from database.json?')) {
      clearLocalDatabase();
      location.reload();
    }
  });
}

init();
