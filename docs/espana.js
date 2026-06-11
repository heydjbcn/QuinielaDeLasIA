// España — La Roja en la quiniela de las IA (lee data/*.json + data/espana.json)

const TEAMS = {
  CPV: 'Cabo Verde', KSA: 'Arabia Saudí', URU: 'Uruguay', ESP: 'España',
};
const MAP_3TO2 = { ESP: 'ES', CPV: 'CV', KSA: 'SA', URU: 'UY' };

function codeToFlag(code) {
  if (!code) return '';
  const cc = (MAP_3TO2[code] || code.substring(0, 2)).toLowerCase();
  return `<img class="flag" src="https://flagcdn.com/${cc}.svg" alt="${code}" loading="lazy">`;
}
function teamName(code) { return TEAMS[code] || code; }

const $ = id => document.getElementById(id);
const pct = v => Math.round(v * 100) + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MADRID = 'Europe/Madrid';

let tournament = null, summary = null, picksData = null, espana = null, leaderboard = null;

async function loadData() {
  const get = u => fetch(u, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  [tournament, summary, picksData, espana, leaderboard] = await Promise.all([
    get('data/tournament.json'),
    get('data/predictions_summary.json'),
    get('data/picks.json'),
    get('data/espana.json'),
    get('data/leaderboard.json'),
  ]);
  render();
}

function espMatches() {
  return (tournament?.matches || [])
    .filter(m => m.home_team === 'ESP' || m.away_team === 'ESP')
    .sort((a, b) => kickoff(a) - kickoff(b));
}
function kickoff(m) { return m.utc_datetime ? new Date(m.utc_datetime) : new Date(m.date + 'T20:00:00Z'); }
function isLive(m) {
  const k = kickoff(m), now = new Date();
  return now >= k && now - k < 2.25 * 3600 * 1000 && !result(m);
}
function gsId(m) { return typeof m.match_id === 'number' ? 'GS-' + String(m.match_id).padStart(2, '0') : String(m.match_id); }
function result(m) { return picksData?.results?.[gsId(m)] || null; }
function matchPicks(m) {
  const byModel = picksData?.picks?.[gsId(m)] || {};
  return (picksData?.models || []).map(md => ({ md, p: byModel[md.name] })).filter(e => e.p);
}
function fmtTime(m) { return kickoff(m).toLocaleTimeString('es-ES', { timeZone: MADRID, hour: '2-digit', minute: '2-digit' }); }
function fmtDate(m) {
  let d = kickoff(m).toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'long', day: 'numeric', month: 'long' });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function render() {
  if (!tournament?.matches) return;
  const now = new Date();
  let d = now.toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('bar-date').textContent = d.charAt(0).toUpperCase() + d.slice(1);
  renderMatches();
  renderEstado();
  renderRival();
  renderPicksTable();
  renderNoticias();
}

// ===== Tarjetas de partidos =====
function renderMatches() {
  const ms = espMatches();
  $('esp-matches').innerHTML = ms.map(m => {
    const rivalCode = m.home_team === 'ESP' ? m.away_team : m.home_team;
    const res = result(m);
    const live = isLive(m);
    const entries = matchPicks(m);
    const n = entries.length;

    // consenso
    const counts = {};
    entries.forEach(e => { const k = e.p.s.join('–'); counts[k] = (counts[k] || 0) + 1; });
    const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ['–', 0];
    const avg = n ? [0, 1, 2].map(i => entries.reduce((s, e) => s + e.p.p[i], 0) / n) : [0, 0, 0];
    const espIdx = m.home_team === 'ESP' ? 0 : 2;
    const rivIdx = m.home_team === 'ESP' ? 2 : 0;

    let status;
    if (live) status = '<span class="wcb-blink" style="color: #C8372D; font-weight: 800;">&#9679; EN VIVO</span>';
    else if (res) status = `<span class="bebas" style="font-size: 38px; color: #0A5B2D;">${res.s[0]}–${res.s[1]}</span><br><span style="font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: #8A8470;">FINAL</span>`;
    else status = `<span class="bebas" style="font-size: 30px;">${fmtTime(m)} h</span><br><span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #6B675C;">${esc(fmtDate(m)).toUpperCase()}</span>`;

    return `
      <div style="background: #FBF7EA; border: 2.5px solid #17150F; border-radius: 4px; box-shadow: 6px 6px 0 #17150F; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 2px solid #17150F; background: #C8372D; color: #F6F0E1; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">
          <span>Grupo ${esc(m.group || 'H')}</span>
          <span>${esc(m.venue?.stadium || '')} &middot; ${esc(m.venue?.city || '')}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 18px 14px 10px;">
          <div style="text-align: center;">
            <div style="font-size: 34px; line-height: 1;">${codeToFlag(m.home_team)}</div>
            <div class="bebas" style="font-size: 22px; margin-top: 4px;">${esc(teamName(m.home_team))}</div>
          </div>
          <div style="text-align: center; min-width: 90px;">${status}</div>
          <div style="text-align: center;">
            <div style="font-size: 34px; line-height: 1;">${codeToFlag(m.away_team)}</div>
            <div class="bebas" style="font-size: 22px; margin-top: 4px;">${esc(teamName(m.away_team))}</div>
          </div>
        </div>
        <div style="padding: 4px 16px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #6B675C;">
            <span>Consenso IA: <span class="bebas" style="font-size: 18px; color: #0A5B2D; letter-spacing: 0.02em;">${mode[0]}</span> (${mode[1]}/${n})</span>
            <span>ESP ${pct(avg[espIdx])} &middot; X ${pct(avg[1])} &middot; ${esc(rivalCode)} ${pct(avg[rivIdx])}</span>
          </div>
          <div style="display: flex; height: 10px; border: 1.5px solid #17150F; border-radius: 2px; overflow: hidden; background: #FBF7EA; margin-top: 6px;">
            <div style="width: ${pct(avg[0])}; background: ${m.home_team === 'ESP' ? '#C8372D' : '#B9AF94'};"></div>
            <div style="width: ${pct(avg[1])}; background: #DCD3BC;"></div>
            <div style="width: ${pct(avg[2])}; background: ${m.away_team === 'ESP' ? '#C8372D' : '#B9AF94'};"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== Así llega España =====
function renderEstado() {
  if (espana?.estado_espana) $('estado-espana').textContent = espana.estado_espana;
  stamp('stamp-espana');

  const votos = (summary || []).filter(s => s.champion === 'ESP').map(s => s.model_name);
  const total = (summary || []).length;
  const ms = espMatches();
  const jugados = ms.filter(m => result(m));
  let gf = 0, gc = 0;
  jugados.forEach(m => {
    const r = result(m);
    if (m.home_team === 'ESP') { gf += r.s[0]; gc += r.s[1]; } else { gf += r.s[1]; gc += r.s[0]; }
  });
  $('esp-sub').textContent = jugados.length ? `${jugados.length} de 3 partidos jugados` : 'Pre-torneo';

  const dato = (big, label) => `
    <div style="background: #FBF7EA; border: 2px solid #17150F; border-radius: 4px; box-shadow: 4px 4px 0 #17150F; padding: 14px 16px; text-align: center;">
      <div class="bebas" style="font-size: 34px; line-height: 1; color: #C8372D;">${big}</div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #6B675C; margin-top: 4px;">${label}</div>
    </div>`;
  let html = dato(`${votos.length}/${total}`, 'IA que la hacen campeona');
  if (votos.length) html += `<div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">${votos.map(v => `<span style="border: 1.5px solid #17150F; border-radius: 2px; padding: 2px 6px; background: #FBF7EA;">${esc(v)}</span>`).join('')}</div>`;
  if (jugados.length) html += dato(`${gf}–${gc}`, 'Goles a favor y en contra');
  const next = ms.find(m => !result(m) && !isLive(m));
  if (next) {
    const rival = next.home_team === 'ESP' ? next.away_team : next.home_team;
    html += dato(`${fmtTime(next)} h`, `Próximo: vs ${teamName(rival)} · ${fmtDate(next)}`);
  }
  $('esp-datos').innerHTML = html;
}

// ===== El rival =====
function renderRival() {
  const name = espana?.rival_name || teamName(espana?.rival_code) || '';
  if (name) {
    $('rival-title').innerHTML = `El rival: ${codeToFlag(espana.rival_code)} ${esc(name)}`;
    $('rival-sub').textContent = 'Próximo partido de España';
  }
  if (espana?.estado_rival) $('estado-rival').textContent = espana.estado_rival;
  stamp('stamp-rival');
}

// ===== Tabla de picks ESP =====
function renderPicksTable() {
  const ms = espMatches();
  $('esp-picks-head').innerHTML = '<span>Modelo</span>' + ms.map(m => {
    const rival = m.home_team === 'ESP' ? m.away_team : m.home_team;
    return `<span style="text-align: center;">vs ${esc(rival)}</span>`;
  }).join('');

  const models = picksData?.models || [];
  $('esp-picks-rows').innerHTML = models.map(md => {
    const cells = ms.map(m => {
      const p = (picksData?.picks?.[gsId(m)] || {})[md.name];
      if (!p) return '<span style="text-align: center; color: #8A8470;">—</span>';
      const res = result(m);
      let bg = 'transparent', star = '';
      if (res) {
        const o = res.o || (res.s[0] > res.s[1] ? 'home' : res.s[0] < res.s[1] ? 'away' : 'draw');
        bg = p.r === o ? '#BFE3C6' : '#EFC9C4';
        if (p.s[0] === res.s[0] && p.s[1] === res.s[1]) star = ' <span style="font-size: 12px;">&#9733;</span>';
      }
      return `<span class="bebas" style="text-align: center; font-size: 22px; color: #0A5B2D; background: ${bg}; border-radius: 3px; padding: 2px 0;">${p.s.join('–')}${star}</span>`;
    }).join('');
    return `
      <div class="wcb-row" style="display: grid; grid-template-columns: minmax(170px, 1.4fr) repeat(3, 1fr); gap: 12px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #DCD3BC;">
        <div style="min-width: 0;">
          <div style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(md.name)}</div>
          <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.14em; color: #8A8470; text-transform: uppercase;">${esc(md.provider)}</div>
        </div>
        ${cells}
      </div>`;
  }).join('');
}

// ===== Noticias =====
function renderNoticias() {
  if (espana?.resumen_noticias) $('resumen-noticias').textContent = espana.resumen_noticias;
  stamp('stamp-noticias', 'Resumen redactado por IA');
  const news = espana?.noticias || [];
  $('news-sub').textContent = news.length ? `${news.length} titulares · Google News` : '';
  $('news-list').innerHTML = news.map(n => `
    <a href="${esc(n.link)}" target="_blank" rel="noopener" class="wcb-row" style="display: block; padding: 12px 4px; border-bottom: 1px solid #DCD3BC; text-decoration: none; color: #17150F;">
      <div style="font-weight: 700; font-size: 14px; line-height: 1.4;">${esc(n.title)}</div>
      <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8A8470; margin-top: 3px;">${esc(n.source || '')}${n.date ? ' · ' + esc(fmtNewsDate(n.date)) : ''}</div>
    </a>`).join('');
}

function fmtNewsDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('es-ES', { timeZone: MADRID, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function stamp(id, prefix = 'Redactado por IA') {
  const el = $(id);
  if (!el) return;
  if (espana?.generated_at) {
    const dt = new Date(espana.generated_at);
    el.textContent = `${prefix} · actualizado ${dt.toLocaleString('es-ES', { timeZone: MADRID, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  } else {
    el.textContent = prefix;
  }
}

loadData();
setInterval(loadData, 60000);
