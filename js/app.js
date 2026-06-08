import { loadDatabase, buildIndexes } from './data.js';
import { getTimezoneMode } from './utils.js';
import {
  createFilterState,
  filterMatches,
  getActiveChips,
  populateFilterOptions,
} from './filters.js';
import { renderBracket } from './bracket.js';
import {
  renderHostDetail,
  renderMatches,
  renderPlayerDetail,
  renderStandings,
  renderTeamDetail,
  renderTeams,
  renderVenueDetail,
  renderVenues,
} from './views.js';

const FULL_WIDTH_VIEWS = new Set(['bracket', 'standings', 'teams', 'venues']);

const state = {
  db: null,
  indexes: null,
  filters: createFilterState(),
};

const els = {
  layout: document.getElementById('layout'),
  viewRoot: document.getElementById('view-root'),
  resultCount: document.getElementById('result-count'),
  detailPanel: document.getElementById('detail-panel'),
  detailContent: document.getElementById('detail-content'),
  activeFilters: document.getElementById('active-filters'),
  filterChips: document.getElementById('filter-chips'),
  filtersPanel: document.getElementById('filters-panel'),
  search: document.getElementById('filter-search'),
  host: document.getElementById('filter-host'),
  team: document.getElementById('filter-team'),
  group: document.getElementById('filter-group'),
  stage: document.getElementById('filter-stage'),
  status: document.getElementById('filter-status'),
  date: document.getElementById('filter-date'),
};

async function init() {
  try {
    state.db = await loadDatabase();
    state.indexes = buildIndexes(state.db);
    populateFilterOptions(state.db, els);
    bindEvents();
    updateTimezoneButtonUI();
    render();
  } catch (err) {
    els.viewRoot.innerHTML = `<div class="empty-state"><p>Could not load data. ${err.message}</p></div>`;
  }
}

function updateTimezoneButtonUI() {
  const btnTz = document.getElementById('toggle-timezone');
  if (!btnTz) return;
  const current = getTimezoneMode();
  const textSpan = btnTz.querySelector('.timezone-text');
  
  if (current === 'local') {
    btnTz.classList.add('is-local');
    if (textSpan) textSpan.textContent = 'My Time';
  } else {
    btnTz.classList.remove('is-local');
    if (textSpan) textSpan.textContent = 'Venue Time';
  }
}

function bindEvents() {
  document.querySelectorAll('.nav-tab[data-view]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.filters.view = tab.dataset.view;
      render();
    });
  });

  const filterInputs = [
    ['search', 'input'],
    ['host', 'change'],
    ['team', 'change'],
    ['group', 'change'],
    ['stage', 'change'],
    ['status', 'change'],
    ['date', 'change'],
  ];

  filterInputs.forEach(([key, event]) => {
    const map = {
      search: 'search',
      host: 'hostCountry',
      team: 'team',
      group: 'group',
      stage: 'stage',
      status: 'status',
      date: 'date',
    };
    els[key].addEventListener(event, () => {
      state.filters[map[key]] = els[key].value;
      syncFiltersToUI();
      render();
    });
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    state.filters = { ...createFilterState(), view: state.filters.view };
    syncFiltersToUI();
    render();
  });

  document.getElementById('close-detail').addEventListener('click', closeDetail);
  document.getElementById('toggle-filters').addEventListener('click', toggleFilters);
  document.getElementById('filters-backdrop').addEventListener('click', closeFilters);

  const btnTz = document.getElementById('toggle-timezone');
  if (btnTz) {
    btnTz.addEventListener('click', () => {
      const current = getTimezoneMode();
      const next = current === 'venue' ? 'local' : 'venue';
      localStorage.setItem('wc2026-timezone-preference', next);
      updateTimezoneButtonUI();
      render();
    });
  }

  els.filterChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chip]');
    if (!btn) return;
    const key = btn.dataset.chip;
    const map = {
      search: 'search',
      hostCountry: 'host',
      team: 'team',
      group: 'group',
      stage: 'stage',
      status: 'status',
      date: 'date',
    };
    state.filters[key] = '';
    if (els[map[key]]) els[map[key]].value = '';
    render();
  });

  els.viewRoot.addEventListener('click', handleAction);
  els.detailContent.addEventListener('click', handleAction);
}

function handleAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  const { action, id } = el.dataset;

  if (action === 'team') {
    setFilter('team', id);
    openDetail(() => renderTeamDetail(id, state.db, state.indexes));
  } else if (action === 'player') {
    openDetail(() => renderPlayerDetail(id, state.db, state.indexes));
  } else if (action === 'venue') {
    openDetail(() => renderVenueDetail(id, state.db, state.indexes));
  } else if (action === 'host') {
    setFilter('hostCountry', id);
    openDetail(() => renderHostDetail(id, state.db, state.indexes));
  }
}

function setFilter(key, value) {
  state.filters[key] = value;
  syncFiltersToUI();
  if (state.filters.view === 'matches') render();
}

function syncFiltersToUI() {
  els.search.value = state.filters.search;
  els.host.value = state.filters.hostCountry;
  els.team.value = state.filters.team;
  els.group.value = state.filters.group;
  els.stage.value = state.filters.stage;
  els.status.value = state.filters.status;
  els.date.value = state.filters.date;

  const chips = getActiveChips(state.filters, state.indexes);
  els.activeFilters.hidden = chips.length === 0;
  els.filterChips.innerHTML = chips
    .map((c) => `<button type="button" class="chip" data-chip="${c.key}">${c.label} ×</button>`)
    .join('');
}

function openDetail(renderFn) {
  els.detailContent.innerHTML = renderFn();
  els.detailPanel.hidden = false;
  els.detailPanel.classList.add('open');
}

function closeDetail() {
  els.detailPanel.hidden = true;
  els.detailPanel.classList.remove('open');
}

function toggleFilters() {
  const open = els.filtersPanel.classList.toggle('open');
  document.getElementById('filters-backdrop').classList.toggle('open', open);
}

function closeFilters() {
  els.filtersPanel.classList.remove('open');
  document.getElementById('filters-backdrop').classList.remove('open');
}

function render() {
  syncFiltersToUI();
  const { db, indexes, filters } = state;
  const fullWidth = FULL_WIDTH_VIEWS.has(filters.view);

  els.layout.classList.toggle('layout-full', fullWidth);
  els.filtersPanel.classList.toggle('hidden-view', fullWidth);

  if (filters.view === 'bracket') {
    els.viewRoot.innerHTML = renderBracket(db, indexes);
    els.resultCount.textContent = 'Knockout bracket';
    return;
  }

  if (filters.view === 'standings') {
    els.viewRoot.innerHTML = renderStandings(db, indexes);
    els.resultCount.textContent = 'Group standings';
    return;
  }

  if (filters.view === 'teams') {
    els.viewRoot.innerHTML = renderTeams(db, indexes);
    els.resultCount.textContent = `${db.teams.filter((t) => t.group).length} teams`;
    return;
  }

  if (filters.view === 'venues') {
    els.viewRoot.innerHTML = renderVenues(db, indexes);
    els.resultCount.textContent = `${db.venues.length} venues`;
    return;
  }

  const filtered = filterMatches(db.matches, filters, indexes);
  els.viewRoot.innerHTML = renderMatches(filtered, indexes);
  els.resultCount.textContent = `${filtered.length} of ${db.matches.length} matches`;
}

init();
