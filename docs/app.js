// WorldCupBench — La quiniela de las máquinas (lee data/*.json)

// Nombres en castellano por código FIFA
const TEAMS = {
  ALG: 'Argelia', ARG: 'Argentina', AUS: 'Australia', AUT: 'Austria', BEL: 'Bélgica',
  BIH: 'Bosnia', BRA: 'Brasil', CAN: 'Canadá', CIV: 'Costa de Marfil', COD: 'RD Congo',
  COL: 'Colombia', CPV: 'Cabo Verde', CRO: 'Croacia', CUW: 'Curazao', CZE: 'Chequia',
  ECU: 'Ecuador', EGY: 'Egipto', ENG: 'Inglaterra', ESP: 'España', FRA: 'Francia',
  GER: 'Alemania', GHA: 'Ghana', HAI: 'Haití', IRN: 'Irán', IRQ: 'Irak',
  JOR: 'Jordania', JPN: 'Japón', KOR: 'Corea del Sur', KSA: 'Arabia Saudí', MAR: 'Marruecos',
  MEX: 'México', NED: 'Países Bajos', NOR: 'Noruega', NZL: 'Nueva Zelanda', PAN: 'Panamá',
  PAR: 'Paraguay', POR: 'Portugal', QAT: 'Catar', RSA: 'Sudáfrica', SCO: 'Escocia',
  SEN: 'Senegal', SUI: 'Suiza', SWE: 'Suecia', TUN: 'Túnez', TUR: 'Turquía',
  URU: 'Uruguay', USA: 'Estados Unidos', UZB: 'Uzbekistán', ITA: 'Italia', POL: 'Polonia',
  DEN: 'Dinamarca', SRB: 'Serbia', UKR: 'Ucrania', NGA: 'Nigeria', CMR: 'Camerún',
};

const FLAG_OVERRIDES = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WAL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

const MAP_3TO2 = {
  MEX: 'MX', RSA: 'ZA', KOR: 'KR', CZE: 'CZ', USA: 'US', BRA: 'BR', ARG: 'AR',
  FRA: 'FR', GER: 'DE', ESP: 'ES', POR: 'PT', NED: 'NL', BEL: 'BE', CRO: 'HR', SUI: 'CH',
  URU: 'UY', COL: 'CO', ECU: 'EC', PAR: 'PY', JPN: 'JP', AUS: 'AU', IRN: 'IR', KSA: 'SA',
  QAT: 'QA', CAN: 'CA', POL: 'PL', UKR: 'UA', IRL: 'IE', DEN: 'DK', SWE: 'SE', NOR: 'NO',
  AUT: 'AT', TUR: 'TR', CIV: 'CI', GHA: 'GH', SEN: 'SN', NGA: 'NG', CMR: 'CM', EGY: 'EG',
  MAR: 'MA', TUN: 'TN', ALG: 'DZ', COD: 'CD', CPV: 'CV', CUW: 'CW', HAI: 'HT', PAN: 'PA',
  NZL: 'NZ', UZB: 'UZ', IRQ: 'IQ', JOR: 'JO', BIH: 'BA', SRB: 'RS', ITA: 'IT',
};

function codeToFlag(code) {
  if (!code) return '\u{1F3F3}';
  if (FLAG_OVERRIDES[code]) return FLAG_OVERRIDES[code];
  const c2 = MAP_3TO2[code] || code.substring(0, 2).toUpperCase();
  try {
    return String.fromCodePoint(c2.charCodeAt(0) - 65 + 0x1F1E6, c2.charCodeAt(1) - 65 + 0x1F1E6);
  } catch { return '\u{1F3F3}'; }
}

function teamName(code) { return TEAMS[code] || code; }

const $ = id => document.getElementById(id);
const pct = v => Math.round(v * 100) + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let leaderboard = null, tournament = null, summary = null, picksData = null;
let selectedId = null;

async function loadData() {
  const get = u => fetch(u, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [lb, tn, ps, pk] = await Promise.all([
    get('data/leaderboard.json'),
    get('data/tournament.json'),
    get('data/predictions_summary.json'),
    get('data/picks.json'),
  ]);
  leaderboard = lb; tournament = tn; summary = ps; picksData = pk;
  render();
}

// ===== Estado temporal de un partido =====
const MADRID = 'Europe/Madrid';
function kickoff(m) { return m.utc_datetime ? new Date(m.utc_datetime) : new Date(m.date + 'T20:00:00Z'); }
function isLive(m) {
  const k = kickoff(m), now = new Date();
  return now >= k && now - k < 2.25 * 3600 * 1000 && !result(m);
}
function result(m) { return picksData?.results?.[String(m.match_id)] || picksData?.results?.['GS-' + String(m.match_id).padStart(2, '0')] || null; }
function fmtTime(m) {
  return kickoff(m).toLocaleTimeString('es-ES', { timeZone: MADRID, hour: '2-digit', minute: '2-digit' });
}
function fmtDay(m) {
  const k = kickoff(m), now = new Date();
  const dayKey = d => d.toLocaleDateString('es-ES', { timeZone: MADRID });
  if (dayKey(k) === dayKey(now)) return 'HOY';
  return k.toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'short', day: 'numeric' }).replace(/[.,]/g, '').toUpperCase();
}

// ===== Render principal =====
function render() {
  if (!tournament?.matches) return;
  renderTopbar();
  renderTitular();
  renderChips();
  renderBoard();
  renderFavoritas();
  renderTabla();
  renderCalendario();
}

function renderTopbar() {
  const now = new Date();
  let d = now.toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  d = d.charAt(0).toUpperCase() + d.slice(1);
  const day = Math.max(1, Math.floor((now - new Date('2026-06-11T00:00:00Z')) / 86400000) + 1);
  $('bar-date').textContent = `${d} · Día ${day} del torneo`;
  const results = leaderboard?.total_results || 0;
  $('bar-mid').textContent = results > 0 ? `${results} de 104 partidos puntuados` : 'Hoy ruedan el balón y los modelos';
}

function renderTitular() {
  const results = leaderboard?.total_results || 0;
  const models = leaderboard?.models || [];
  if (results > 0 && models.length) {
    const top = models[0];
    $('head-tag').textContent = 'Quiniela en juego';
    $('head-meta').textContent = `${results}/104 partidos puntuados`;
    $('head-title').textContent = `${top.model_name} lidera la quiniela`;
    $('head-p').textContent = `Con ${top.correct_outcomes} aciertos y ${top.exact_scores} marcadores exactos sobre ${top.total_evaluated} partidos puntuados. La quiniela quedó congelada el 10 de junio; cada resultado oficial reparte puntos nuevos.`;
  } else {
    const next = upcomingMatches()[0];
    if (next) $('head-meta').textContent = `${next.venue?.stadium || ''} · ${fmtTime(next)}`;
  }
}

function sortedMatches() {
  return [...tournament.matches].sort((a, b) => kickoff(a) - kickoff(b));
}

function upcomingMatches() {
  const now = new Date();
  return sortedMatches().filter(m => kickoff(m) - now > -2.25 * 3600 * 1000);
}

function chipWindow() {
  const ms = sortedMatches();
  const now = new Date();
  let idx = ms.findIndex(m => now - kickoff(m) < 2.25 * 3600 * 1000);
  if (idx === -1) idx = ms.length - 1;
  const start = Math.max(0, idx - 2);
  return ms.slice(start, start + 8);
}

function renderChips() {
  const ms = chipWindow();
  if (!selectedId || !ms.some(m => String(m.match_id) === selectedId)) {
    const live = ms.find(isLive);
    selectedId = String((live || ms.find(m => !result(m)) || ms[0]).match_id);
  }
  $('chips').innerHTML = ms.map(m => {
    const id = String(m.match_id);
    const active = id === selectedId;
    const res = result(m);
    let meta, metaColor;
    if (isLive(m)) { meta = '● EN VIVO'; metaColor = active ? '#FFD23F' : '#C8372D'; }
    else if (res) { meta = `FINAL ${res.s[0]}–${res.s[1]}`; metaColor = active ? 'rgba(246,240,225,0.8)' : '#0A6B33'; }
    else { meta = `${fmtDay(m)} · ${fmtTime(m)}`; metaColor = active ? 'rgba(246,240,225,0.8)' : '#8A8470'; }
    return `
      <button onclick="selectMatch('${id}')" style="flex: none; display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; background: ${active ? '#0A6B33' : '#FBF7EA'}; color: ${active ? '#F6F0E1' : '#17150F'}; border: 2px ${active ? 'solid' : 'dashed'} #17150F; border-radius: 3px; font-family: 'Archivo', sans-serif;">
        <span style="font-size: 16px; letter-spacing: 2px;">${codeToFlag(m.home_team)} ${codeToFlag(m.away_team)}</span>
        <span class="bebas" style="font-size: 18px; letter-spacing: 0.04em; white-space: nowrap;">${esc(m.home_team)}–${esc(m.away_team)}</span>
        <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: ${metaColor}; white-space: nowrap;">${meta}</span>
      </button>`;
  }).join('');
}

window.selectMatch = id => { selectedId = id; renderChips(); renderBoard(); };

function matchPicks(m) {
  const byModel = picksData?.picks?.[String(m.match_id)]
    || picksData?.picks?.['GS-' + String(m.match_id).padStart(2, '0')] || {};
  return (picksData?.models || []).map(md => ({ md, p: byModel[md.name] })).filter(e => e.p);
}

function renderBoard() {
  const m = sortedMatches().find(x => String(x.match_id) === selectedId);
  if (!m) return;
  const entries = matchPicks(m);
  const n = entries.length;
  const res = result(m);

  $('f-group').textContent = 'GRUPO ' + (m.group || '?');
  $('f-venue').textContent = `${m.venue?.stadium || ''} · ${m.venue?.city || ''}`;

  const st = $('f-status');
  if (isLive(m)) {
    st.style.color = '#FFD23F';
    st.innerHTML = '<span class="wcb-blink" style="width: 8px; height: 8px; border-radius: 50%; background: #FFD23F; display: inline-block;"></span> EN VIVO';
  } else if (res) {
    st.style.color = '#F6F0E1';
    st.textContent = 'FINAL';
  } else {
    st.style.color = 'rgba(246,240,225,0.85)';
    st.textContent = `${fmtDay(m)} · ${fmtTime(m)}`;
  }

  $('f-home-flag').textContent = codeToFlag(m.home_team);
  $('f-home-name').textContent = teamName(m.home_team);
  $('f-away-flag').textContent = codeToFlag(m.away_team);
  $('f-away-name').textContent = teamName(m.away_team);

  // marcador: real si lo hay; si no, moda del consenso
  const scoreCount = {};
  entries.forEach(e => { const k = e.p.s.join('–'); scoreCount[k] = (scoreCount[k] || 0) + 1; });
  const mode = Object.entries(scoreCount).sort((a, b) => b[1] - a[1])[0] || ['–', 0];
  if (res) {
    $('f-score-label').textContent = 'Resultado oficial';
    $('f-score').textContent = `${res.s[0]}–${res.s[1]}`;
    const exact = entries.filter(e => e.p.s[0] === res.s[0] && e.p.s[1] === res.s[1]).length;
    $('f-score-count').textContent = exact > 0 ? `${exact} de ${n} lo clavaron` : `nadie lo clavó · consenso era ${mode[0]}`;
  } else {
    $('f-score-label').textContent = 'Marcador consenso';
    $('f-score').textContent = mode[0];
    $('f-score-count').textContent = `${mode[1]} de ${n} modelos`;
  }

  // barra de probabilidades medias
  if (n) {
    const avg = [0, 1, 2].map(i => entries.reduce((s, e) => s + e.p.p[i], 0) / n);
    $('f-bar-h').style.width = pct(avg[0]);
    $('f-bar-d').style.width = pct(avg[1]);
    $('f-bar-a').style.width = pct(avg[2]);
    $('f-pct-h').textContent = `${m.home_team} ${pct(avg[0])}`;
    $('f-pct-d').textContent = `Empate ${pct(avg[1])}`;
    $('f-pct-a').textContent = `${m.away_team} ${pct(avg[2])}`;

    const votes = { home: 0, draw: 0, away: 0 };
    entries.forEach(e => { votes[e.p.r] = (votes[e.p.r] || 0) + 1; });
    let line;
    if (votes.home === n) line = `Las ${n} máquinas marcan victoria de ${teamName(m.home_team)} en su quiniela.`;
    else if (votes.away === n) line = `Las ${n} máquinas marcan victoria de ${teamName(m.away_team)} en su quiniela.`;
    else line = `${votes.home} marcan local · ${votes.draw} empate · ${votes.away} visitante.`;
    if (res) {
      const o = res.o || (res.s[0] > res.s[1] ? 'home' : res.s[0] < res.s[1] ? 'away' : 'draw');
      const ok = votes[o] || 0;
      line = `${ok} de ${n} acertaron el signo. ` + line.replace(/^Las/, 'Antes del partido, las');
    }
    $('f-voteline').textContent = '— ' + line;
  }

  renderQuiniela(m, entries, res);
}

function renderQuiniela(m, entries, res) {
  $('picks-subtitle').textContent = `${m.home_team} vs ${m.away_team} · congelada el 10 de junio`;
  const realOutcome = res ? (res.o || (res.s[0] > res.s[1] ? 'home' : res.s[0] < res.s[1] ? 'away' : 'draw')) : null;

  const rows = entries.map(e => {
    const conf = Math.max(...e.p.p);
    const r = e.p.r;
    const hit = realOutcome && r === realOutcome;
    const miss = realOutcome && r !== realOutcome;
    const exact = res && e.p.s[0] === res.s[0] && e.p.s[1] === res.s[1];
    const pickBg = hit ? '#BFE3C6' : miss ? '#EFC9C4' : '#F3E2B8';
    return { e, conf, r, pickBg, exact };
  }).sort((a, b) => b.conf - a.conf);

  $('picks-rows').innerHTML = rows.map(({ e, conf, r, pickBg, exact }) => {
    const circle = (mark, on) => `<span style="width: 34px; height: 34px; border: 2px solid #17150F; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 18px; color: #C8372D; background: ${on ? pickBg : 'transparent'};">${on ? '✕' : ''}</span>`;
    return `
      <div class="wcb-row" style="display: grid; grid-template-columns: minmax(190px, 1.5fr) 80px 150px minmax(130px, 1fr) 80px; gap: 12px; align-items: center; padding: 11px 18px; border-bottom: 1px solid #DCD3BC;">
        <div style="min-width: 0;">
          <div style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(e.md.name)}</div>
          <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.14em; color: #8A8470; text-transform: uppercase;">${esc(e.md.provider)}</div>
        </div>
        <div class="bebas" style="font-size: 26px; text-align: center; color: #0A5B2D;">${e.p.s.join('–')}${exact ? ' <span style="font-size: 14px;">★</span>' : ''}</div>
        <div style="display: grid; grid-template-columns: repeat(3, 34px); gap: 8px; justify-content: center;">
          ${circle('L', r === 'home')}${circle('E', r === 'draw')}${circle('V', r === 'away')}
        </div>
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; height: 10px; border: 1.5px solid #17150F; border-radius: 2px; overflow: hidden; background: #FBF7EA;">
            <div style="width: ${pct(e.p.p[0])}; background: #0A6B33;"></div>
            <div style="width: ${pct(e.p.p[1])}; background: #B9AF94;"></div>
            <div style="width: ${pct(e.p.p[2])}; background: #C8372D;"></div>
          </div>
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #6B675C;">${Math.round(e.p.p[0] * 100)} · ${Math.round(e.p.p[1] * 100)} · ${Math.round(e.p.p[2] * 100)}</div>
        </div>
        <div class="bebas" style="font-size: 22px; text-align: right; color: #17150F;">${pct(conf)}</div>
      </div>`;
  }).join('');
}

function renderFavoritas() {
  const models = summary || [];
  if (!models.length) return;
  const counts = {};
  models.forEach(m => {
    const c = m.champion || '?';
    (counts[c] = counts[c] || []).push(m.model_name);
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  const rotations = [-1.2, 0.8, -0.7, 1.1];
  $('fav-cards').innerHTML = sorted.map(([code, names], i) => `
    <div style="position: relative; background: ${i === 0 ? 'linear-gradient(160deg, #F9EBC0, #FBF7EA 55%)' : '#FBF7EA'}; border: 2.5px solid #17150F; border-radius: 4px; box-shadow: 6px 6px 0 #17150F; padding: 24px 18px 18px; transform: rotate(${rotations[i]}deg); display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;">
      ${i === 0 ? '<div style="position: absolute; top: -12px; right: 12px; background: #C8372D; color: #F6F0E1; font-weight: 900; font-size: 10px; letter-spacing: 0.16em; padding: 5px 12px; transform: rotate(3deg); text-transform: uppercase; box-shadow: 2px 2px 0 #17150F;">Favorita</div>' : ''}
      <span style="font-size: 64px; line-height: 1;">${codeToFlag(code)}</span>
      <span class="bebas" style="font-size: 40px; line-height: 1;">${teamName(code)}</span>
      <span class="bebas" style="font-size: 20px; color: #0A5B2D;">${names.length} / ${models.length} votos</span>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: #4A463A; text-transform: uppercase;">
        ${names.map(nm => `<span style="border: 1.5px solid #17150F; border-radius: 2px; padding: 2px 6px; background: #FBF7EA;">${esc(nm)}</span>`).join('')}
      </div>
    </div>`).join('');
}

function renderTabla() {
  const results = leaderboard?.total_results || 0;
  const models = leaderboard?.models || [];
  const byName = {};
  (summary || []).forEach(s => { byName[s.model_name] = s; });

  $('table-sub').textContent = results > 0 ? `En juego · ${results}/104 evaluados` : 'Pre-torneo · 0/104 evaluados';
  $('table-sub').style.color = results > 0 ? '#0A6B33' : '#C8372D';

  const provider = {};
  (picksData?.models || []).forEach(m => { provider[m.name] = m.provider; });

  $('table-rows').innerHTML = models.map((m, i) => {
    const s = byName[m.model_name] || {};
    const scored = m.total_evaluated > 0;
    const dash = '<span style="color: #8A8470;">—</span>';
    return `
      <div class="wcb-trow" style="display: grid; grid-template-columns: 40px minmax(190px, 1.6fr) 120px 130px 90px 90px 80px; gap: 12px; align-items: center; padding: 11px 14px; border-bottom: 1px solid #DCD3BC;">
        <span class="bebas" style="font-size: 18px; color: ${scored ? '#17150F' : '#8A8470'};">${scored ? i + 1 : '—'}</span>
        <div><div style="font-weight: 700; font-size: 14px;">${esc(m.model_name)}</div><div style="font-size: 9px; font-weight: 600; letter-spacing: 0.14em; color: #8A8470; text-transform: uppercase;">${esc(provider[m.model_name] || '')}</div></div>
        <span style="font-size: 13px; font-weight: 700;">${codeToFlag(s.champion)} ${s.champion || '—'}</span>
        <span style="font-size: 13px; color: #6B675C;">${codeToFlag(s.runner_up)} ${s.runner_up || '—'}</span>
        <span style="text-align: right;">${scored ? m.correct_outcomes : dash}</span>
        <span style="text-align: right;">${scored ? m.exact_scores : dash}</span>
        <span style="text-align: right;">${m.brier_avg != null ? m.brier_avg : dash}</span>
      </div>`;
  }).join('');

  const next = upcomingMatches().find(m => !result(m) && !isLive(m));
  if (results === 0 && next) {
    $('table-foot').textContent = `La puntuación arranca con el pitido inicial · ${next.home_team}–${next.away_team} · ${fmtTime(next)} · ${next.venue?.stadium || ''}`;
  } else if (next) {
    $('table-foot').textContent = `Próximo partido · ${next.home_team}–${next.away_team} · ${fmtDay(next)} ${fmtTime(next)} · ${next.venue?.stadium || ''}`;
  } else {
    $('table-foot').textContent = '';
  }
}

// ===== Calendario completo =====
let selectedGroup = 'all';

function renderCalendario() {
  const groups = [...new Set(tournament.matches.map(m => m.group))].sort();
  const btn = (id, label) => {
    const active = selectedGroup === id;
    return `<button onclick="filterGroup('${id}')" style="cursor: pointer; padding: 6px 14px; background: ${active ? '#0A6B33' : '#FBF7EA'}; color: ${active ? '#F6F0E1' : '#17150F'}; border: 2px ${active ? 'solid' : 'dashed'} #17150F; border-radius: 3px; font-family: 'Archivo', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">${label}</button>`;
  };
  $('group-filters').innerHTML = btn('all', 'Todos') + groups.map(g => btn(g, 'Grupo ' + g)).join('');

  const ms = sortedMatches().filter(m => selectedGroup === 'all' || m.group === selectedGroup);
  $('matches-grid').innerHTML = ms.map(m => {
    const res = result(m);
    const live = isLive(m);
    let status;
    if (live) status = '<span class="wcb-blink" style="color: #C8372D; font-weight: 800;">● EN VIVO</span>';
    else if (res) status = `<span class="bebas" style="font-size: 22px; color: #0A5B2D;">${res.s[0]}–${res.s[1]}</span> <span style="color: #8A8470; font-weight: 800;">FINAL</span>`;
    else status = `<span style="color: #4A463A; font-weight: 700;">${fmtDay(m)} · ${fmtTime(m)} h</span>`;
    return `
      <div style="background: #FBF7EA; border: 2px solid #17150F; border-radius: 4px; box-shadow: 3px 3px 0 #17150F; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #6B675C; border-bottom: 1px solid #DCD3BC; padding-bottom: 6px;">
          <span>Grupo ${esc(m.group || '?')}</span>
          <span>${esc(m.venue?.city || '')}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px;">
          <div style="text-align: center; flex: 1; min-width: 0;">
            <div style="font-size: 26px; line-height: 1;">${codeToFlag(m.home_team)}</div>
            <div class="bebas" style="font-size: 16px; margin-top: 2px;">${esc(m.home_team)}</div>
          </div>
          <div style="font-size: 10px; font-weight: 800; color: #8A8470;">VS</div>
          <div style="text-align: center; flex: 1; min-width: 0;">
            <div style="font-size: 26px; line-height: 1;">${codeToFlag(m.away_team)}</div>
            <div class="bebas" style="font-size: 16px; margin-top: 2px;">${esc(m.away_team)}</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: 11px; letter-spacing: 0.06em;">${status}</div>
      </div>`;
  }).join('');
}

window.filterGroup = g => { selectedGroup = g; renderCalendario(); };

loadData();
setInterval(loadData, 60000);
