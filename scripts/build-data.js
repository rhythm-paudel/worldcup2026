#!/usr/bin/env node
/**
 * Transforms openfootball worldcup.json into our database format.
 * Run: node scripts/build-data.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const HOST_COUNTRY_MAP = {
  'Mexico City': 'Mexico',
  'Guadalajara (Zapopan)': 'Mexico',
  'Monterrey (Guadalupe)': 'Mexico',
  Toronto: 'Canada',
  Vancouver: 'Canada',
};

const TEAM_FLAGS = {
  Mexico: '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czech Republic': '🇨🇿',
  Canada: '🇨🇦',
  'Bosnia & Herzegovina': '🇧🇦',
  Qatar: '🇶🇦',
  Switzerland: '🇨🇭',
  Brazil: '🇧🇷',
  Morocco: '🇲🇦',
  Haiti: '🇭🇹',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸',
  Paraguay: '🇵🇾',
  Australia: '🇦🇺',
  Turkey: '🇹🇷',
  Germany: '🇩🇪',
  Curaçao: '🇨🇼',
  'Ivory Coast': '🇨🇮',
  Ecuador: '🇪🇨',
  Netherlands: '🇳🇱',
  Japan: '🇯🇵',
  Sweden: '🇸🇪',
  Tunisia: '🇹🇳',
  Belgium: '🇧🇪',
  Egypt: '🇪🇬',
  Iran: '🇮🇷',
  'New Zealand': '🇳🇿',
  Spain: '🇪🇸',
  'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  Uruguay: '🇺🇾',
  France: '🇫🇷',
  Senegal: '🇸🇳',
  Iraq: '🇮🇶',
  Norway: '🇳🇴',
  Argentina: '🇦🇷',
  Algeria: '🇩🇿',
  Austria: '🇦🇹',
  Jordan: '🇯🇴',
  Portugal: '🇵🇹',
  'DR Congo': '🇨🇩',
  Uzbekistan: '🇺🇿',
  Colombia: '🇨🇴',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Croatia: '🇭🇷',
  Ghana: '🇬🇭',
  Panama: '🇵🇦',
};

const KEY_PLAYERS = {
  Canada: [
    { name: 'Alphonso Davies', position: 'DF', number: 19 },
    { name: 'Jonathan David', position: 'FW', number: 10 },
    { name: 'Milan Borjan', position: 'GK', number: 1 },
    { name: 'Sam Adekugbe', position: 'DF', number: 3 },
    { name: 'Stephen Eustáquio', position: 'MF', number: 7 },
    { name: 'Ismaël Koné', position: 'MF', number: 8 },
    { name: 'Tajon Buchanan', position: 'FW', number: 17 },
    { name: 'Cyle Larin', position: 'FW', number: 9 },
  ],
  USA: [
    { name: 'Christian Pulisic', position: 'FW', number: 10 },
    { name: 'Tyler Adams', position: 'MF', number: 4 },
    { name: 'Weston McKennie', position: 'MF', number: 8 },
    { name: 'Matt Turner', position: 'GK', number: 1 },
    { name: 'Gio Reyna', position: 'MF', number: 7 },
    { name: 'Tim Weah', position: 'FW', number: 21 },
    { name: 'Antonee Robinson', position: 'DF', number: 5 },
    { name: 'Yunus Musah', position: 'MF', number: 6 },
  ],
  Mexico: [
    { name: 'Guillermo Ochoa', position: 'GK', number: 13 },
    { name: 'Hirving Lozano', position: 'FW', number: 22 },
    { name: 'Edson Álvarez', position: 'MF', number: 4 },
    { name: 'Raúl Jiménez', position: 'FW', number: 9 },
    { name: 'Luis Chávez', position: 'MF', number: 24 },
    { name: 'Jesús Gallardo', position: 'DF', number: 23 },
  ],
  Brazil: [
    { name: 'Alisson', position: 'GK', number: 1 },
    { name: 'Marquinhos', position: 'DF', number: 4 },
    { name: 'Casemiro', position: 'MF', number: 5 },
    { name: 'Neymar', position: 'FW', number: 10 },
    { name: 'Vinícius Júnior', position: 'FW', number: 7 },
    { name: 'Rodrygo', position: 'FW', number: 11 },
  ],
  Argentina: [
    { name: 'Emiliano Martínez', position: 'GK', number: 23 },
    { name: 'Lionel Messi', position: 'FW', number: 10 },
    { name: 'Ángel Di María', position: 'FW', number: 11 },
    { name: 'Lautaro Martínez', position: 'FW', number: 22 },
    { name: 'Rodrigo De Paul', position: 'MF', number: 7 },
    { name: 'Enzo Fernández', position: 'MF', number: 24 },
  ],
  France: [
    { name: 'Kylian Mbappé', position: 'FW', number: 10 },
    { name: 'Antoine Griezmann', position: 'FW', number: 7 },
    { name: 'Ousmane Dembélé', position: 'FW', number: 11 },
    { name: 'Aurélien Tchouaméni', position: 'MF', number: 8 },
    { name: 'William Saliba', position: 'DF', number: 2 },
    { name: 'Hugo Lloris', position: 'GK', number: 1 },
  ],
  England: [
    { name: 'Harry Kane', position: 'FW', number: 9 },
    { name: 'Jude Bellingham', position: 'MF', number: 10 },
    { name: 'Phil Foden', position: 'MF', number: 11 },
    { name: 'Bukayo Saka', position: 'FW', number: 7 },
    { name: 'Declan Rice', position: 'MF', number: 4 },
    { name: 'Jordan Pickford', position: 'GK', number: 1 },
  ],
  Germany: [
    { name: 'Manuel Neuer', position: 'GK', number: 1 },
    { name: 'Joshua Kimmich', position: 'MF', number: 6 },
    { name: 'Jamal Musiala', position: 'MF', number: 10 },
    { name: 'Kai Havertz', position: 'FW', number: 7 },
    { name: 'Florian Wirtz', position: 'MF', number: 17 },
    { name: 'Antonio Rüdiger', position: 'DF', number: 2 },
  ],
  Spain: [
    { name: 'Pedri', position: 'MF', number: 8 },
    { name: 'Gavi', position: 'MF', number: 9 },
    { name: 'Álvaro Morata', position: 'FW', number: 7 },
    { name: 'Rodri', position: 'MF', number: 16 },
    { name: 'Unai Simón', position: 'GK', number: 23 },
    { name: 'Lamine Yamal', position: 'FW', number: 19 },
  ],
  Portugal: [
    { name: 'Cristiano Ronaldo', position: 'FW', number: 7 },
    { name: 'Bruno Fernandes', position: 'MF', number: 8 },
    { name: 'Bernardo Silva', position: 'MF', number: 10 },
    { name: 'Rúben Dias', position: 'DF', number: 4 },
    { name: 'Diogo Costa', position: 'GK', number: 22 },
    { name: 'Rafael Leão', position: 'FW', number: 17 },
  ],
  Netherlands: [
    { name: 'Virgil van Dijk', position: 'DF', number: 4 },
    { name: 'Frenkie de Jong', position: 'MF', number: 21 },
    { name: 'Memphis Depay', position: 'FW', number: 10 },
    { name: 'Cody Gakpo', position: 'FW', number: 11 },
    { name: 'Matthijs de Ligt', position: 'DF', number: 3 },
  ],
  Japan: [
    { name: 'Takefusa Kubo', position: 'FW', number: 10 },
    { name: 'Kaoru Mitoma', position: 'FW', number: 7 },
    { name: 'Wataru Endo', position: 'MF', number: 6 },
    { name: 'Takehiro Tomiyasu', position: 'DF', number: 16 },
  ],
  Colombia: [
    { name: 'James Rodríguez', position: 'MF', number: 10 },
    { name: 'Luis Díaz', position: 'FW', number: 7 },
    { name: 'Davinson Sánchez', position: 'DF', number: 3 },
    { name: 'David Ospina', position: 'GK', number: 1 },
  ],
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getHostCountry(ground) {
  if (HOST_COUNTRY_MAP[ground]) return HOST_COUNTRY_MAP[ground];
  return 'USA';
}

function parseStage(round) {
  if (round.startsWith('Matchday')) return 'group';
  if (round === 'Round of 32') return 'round-of-32';
  if (round === 'Round of 16') return 'round-of-16';
  if (round === 'Quarter-final') return 'quarter-final';
  if (round === 'Semi-final') return 'semi-final';
  if (round === 'Match for third place') return 'third-place';
  if (round === 'Final') return 'final';
  return 'knockout';
}

function parseGroup(groupStr) {
  if (!groupStr) return null;
  const m = groupStr.match(/Group ([A-L])/i);
  return m ? m[1] : null;
}

function parseTime(timeStr) {
  const m = timeStr.match(/^(\d{2}:\d{2})\s*(.*)$/);
  return { time: m ? m[1] : timeStr, timezone: m ? m[2] : '' };
}

async function main() {
  const inputPath = process.argv[2] || '/tmp/wc2026.json';
  let source;

  if (fs.existsSync(inputPath)) {
    source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    const res = await fetch(SOURCE_URL);
    source = await res.json();
  }

  const teamMap = new Map();
  const venueMap = new Map();
  const matches = [];

  source.matches.forEach((m, idx) => {
    const homeName = m.team1;
    const awayName = m.team2;
    [homeName, awayName].forEach((name) => {
      if (!teamMap.has(name)) {
        const group = parseGroup(m.group);
        teamMap.set(name, {
          id: slugify(name),
          name,
          flag: TEAM_FLAGS[name] || '🏳️',
          group: group || null,
        });
      } else if (m.group) {
        const existing = teamMap.get(name);
        if (!existing.group) existing.group = parseGroup(m.group);
      }
    });

    const venueId = slugify(m.ground);
    if (!venueMap.has(venueId)) {
      venueMap.set(venueId, {
        id: venueId,
        name: m.ground,
        hostCountry: getHostCountry(m.ground),
      });
    }

    const { time, timezone } = parseTime(m.time || '12:00');
    matches.push({
      id: `match-${String(idx + 1).padStart(3, '0')}`,
      num: m.num || idx + 1,
      date: m.date,
      time,
      timezone,
      round: m.round,
      stage: parseStage(m.round),
      group: parseGroup(m.group),
      homeTeam: slugify(homeName),
      awayTeam: slugify(awayName),
      homeTeamName: homeName,
      awayTeamName: awayName,
      venueId,
      hostCountry: getHostCountry(m.ground),
      score: { home: null, away: null },
      status: 'scheduled',
    });
  });

  const players = [];
  const seenPlayers = new Set();

  for (const [teamName, roster] of Object.entries(KEY_PLAYERS)) {
    const teamId = slugify(teamName);
    if (!teamMap.has(teamName)) continue;

    const unique = [];
    const names = new Set();
    for (const p of roster) {
      if (names.has(p.name)) continue;
      names.add(p.name);
      unique.push(p);
    }

    unique.forEach((p) => {
      const id = slugify(`${teamName}-${p.name}`);
      if (seenPlayers.has(id)) return;
      seenPlayers.add(id);
      players.push({
        id,
        name: p.name,
        teamId,
        teamName,
        position: p.position,
        number: p.number,
      });
    });
  }

  // Add placeholder players for teams without roster data
  for (const [name, team] of teamMap) {
    const hasPlayers = players.some((p) => p.teamId === team.id);
    if (!hasPlayers && team.group) {
      players.push({
        id: `${team.id}-squad`,
        name: `${name} Squad`,
        teamId: team.id,
        teamName: name,
        position: '—',
        number: null,
        placeholder: true,
      });
    }
  }

  const database = {
    meta: {
      name: 'FIFA World Cup 2026',
      version: 1,
      updated: new Date().toISOString().split('T')[0],
      source: 'openfootball/worldcup.json',
      totalMatches: matches.length,
      totalTeams: teamMap.size,
    },
    hostCountries: ['USA', 'Mexico', 'Canada'],
    venues: Array.from(venueMap.values()).sort((a, b) =>
      a.hostCountry.localeCompare(b.hostCountry)
    ),
    teams: Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    players: players.sort((a, b) => a.name.localeCompare(b.name)),
    matches: matches.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.time.localeCompare(b.time);
    }),
  };

  const outPath = path.join(__dirname, '..', 'data', 'database.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(database, null, 2));
  console.log(`Wrote ${database.matches.length} matches, ${database.teams.length} teams to ${outPath}`);
}

main().catch(console.error);
