// Los grupos — clasificación en vivo (lee data/tournament.json + data/picks.json + data/live.json)

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
  URU: 'Uruguay', USA: 'Estados Unidos', UZB: 'Uzbekistán',
};
const FLAG_SPECIAL = { ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls' };
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
  if (!code) return '';
  const cc = FLAG_SPECIAL[code] || (MAP_3TO2[code] || code.substring(0, 2)).toLowerCase();
  return `<img class="flag" src="https://flagcdn.com/${cc}.svg" alt="${code}" loading="lazy">`;
}
function teamName(code) { return TEAMS[code] || code; }
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MADRID = 'Europe/Madrid';

let tournament = null, picksData = null, live = null;

function gsId(m) { return typeof m.match_id === 'number' ? 'GS-' + String(m.match_id).padStart(2, '0') : String(m.match_id); }
function result(m) {
  const r = picksData?.results?.[gsId(m)];
  if (r) return r;
  const lv = live?.matches?.[gsId(m)];
  if (lv && lv.status === 'FINISHED') return { s: lv.s, o: lv.s[0] > lv.s[1] ? 'home' : lv.s[0] < lv.s[1] ? 'away' : 'draw' };
  return null;
}
function isPlaying(m) {
  const lv = live?.matches?.[gsId(m)];
  return !!(lv && lv.status !== 'FINISHED');
}
function liveScore(m) {
  const lv = live?.matches?.[gsId(m)];
  return lv && lv.status !== 'FINISHED' ? lv : null;
}
function kickoff(m) { return m.utc_datetime ? new Date(m.utc_datetime) : new Date(m.date + 'T20:00:00Z'); }
function fmtTime(m) { return kickoff(m).toLocaleTimeString('es-ES', { timeZone: MADRID, hour: '2-digit', minute: '2-digit' }); }
function fmtDay(m) {
  const k = kickoff(m), now = new Date();
  const dayKey = d => d.toLocaleDateString('es-ES', { timeZone: MADRID });
  if (dayKey(k) === dayKey(now)) return 'HOY';
  return k.toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'short', day: 'numeric' }).replace(/[.,]/g, '').toUpperCase();
}
function consensus(m) {
  const byModel = picksData?.picks?.[gsId(m)] || {};
  const counts = {};
  let n = 0;
  Object.values(byModel).forEach(p => { n++; const k = p.s.join('–'); counts[k] = (counts[k] || 0) + 1; });
  const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!mode) return null;
  // signo del consenso (marcador moda)
  const [h, a] = mode[0].split('–').map(Number);
  return { score: mode[0], n, votes: mode[1], sign: h > a ? 'home' : h < a ? 'away' : 'draw' };
}

async function loadData() {
  const get = u => fetch(u, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  [tournament, picksData, live] = await Promise.all([
    get('data/tournament.json'),
    get('data/picks.json'),
    get('data/live.json'),
  ]);
  render();
}

// ===== Clasificación =====
function groupMatches(g) { return (tournament?.matches || []).filter(m => m.group === g); }

function emptyStats(code) { return { code, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }; }

function buildStats(matches, useResult) {
  const teams = {};
  matches.forEach(m => { teams[m.home_team] = teams[m.home_team] || emptyStats(m.home_team); teams[m.away_team] = teams[m.away_team] || emptyStats(m.away_team); });
  matches.forEach(m => {
    const res = useResult(m);
    if (!res) return;
    const [gh, ga] = res.s;
    const th = teams[m.home_team], ta = teams[m.away_team];
    th.pj++; ta.pj++;
    th.gf += gh; th.gc += ga; ta.gf += ga; ta.gc += gh;
    if (gh > ga) { th.g++; ta.p++; th.pts += 3; }
    else if (gh < ga) { ta.g++; th.p++; ta.pts += 3; }
    else { th.e++; ta.e++; th.pts++; ta.pts++; }
  });
  Object.values(teams).forEach(t => { t.dg = t.gf - t.gc; });
  return teams;
}

// Orden FIFA: pts > DG > GF > enfrentamiento directo (pts, DG, GF) > fair play/sorteo
function sortGroup(g) {
  const matches = groupMatches(g);
  const teams = buildStats(matches, result);
  let list = Object.values(teams).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || teamName(a.code).localeCompare(teamName(b.code), 'es'));

  const notes = [];
  // detectar pares adyacentes empatados a puntos y explicar el criterio decisivo
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    if (a.pts !== b.pts || a.pj === 0) continue;
    if (a.dg !== b.dg) {
      notes.push(`${teamName(a.code)} por delante de ${teamName(b.code)} por diferencia de goles (${fmtDg(a.dg)} / ${fmtDg(b.dg)}).`);
    } else if (a.gf !== b.gf) {
      notes.push(`${teamName(a.code)} por delante de ${teamName(b.code)} por goles a favor (${a.gf} / ${b.gf}).`);
    } else {
      // enfrentamiento directo entre todos los empatados con a y b
      const tied = list.filter(t => t.pts === a.pts && t.dg === a.dg && t.gf === a.gf).map(t => t.code);
      const h2hMatches = matches.filter(m => tied.includes(m.home_team) && tied.includes(m.away_team));
      const h2h = buildStats(h2hMatches, result);
      const ha = h2h[a.code], hb = h2h[b.code];
      if (ha && hb && (ha.pts !== hb.pts || ha.dg !== hb.dg || ha.gf !== hb.gf)) {
        // reordenar el bloque empatado por el directo
        const block = list.filter(t => tied.includes(t.code)).sort((x, y) => {
          const hx = h2h[x.code], hy = h2h[y.code];
          return hy.pts - hx.pts || hy.dg - hx.dg || hy.gf - hx.gf;
        });
        const start = list.findIndex(t => tied.includes(t.code));
        block.forEach((t, k) => { list[start + k] = t; });
        notes.push(`${teamName(block[0].code)} por delante: gana el enfrentamiento directo.`);
      } else {
        notes.push(`${teamName(a.code)} y ${teamName(b.code)}: empate total — decidiría el fair play o el sorteo FIFA.`);
      }
    }
  }
  return { list, notes, matches };
}

function fmtDg(v) { return v > 0 ? '+' + v : String(v); }

// ===== Render =====
function render() {
  if (!tournament?.matches) return;
  let d = new Date().toLocaleDateString('es-ES', { timeZone: MADRID, weekday: 'long', day: 'numeric', month: 'long' });
  $('bar-date').textContent = d.charAt(0).toUpperCase() + d.slice(1);

  const groups = [...new Set(tournament.matches.map(m => m.group))].sort();
  $('grupos-grid').innerHTML = groups.map(g => {
    const { list, notes, matches } = sortGroup(g);
    const liveNow = matches.some(isPlaying);
    const played = matches.filter(m => result(m));

    const rows = list.map((t, i) => `
      <tr class="${i < 2 ? 'pos-q' : i === 2 ? 'pos-3' : ''}">
        <td><span class="bebas" style="color: #8A8470; font-size: 13px; margin-right: 6px;">${i + 1}</span> <span style="font-size: 14px;">${codeToFlag(t.code)}</span> <strong>${esc(t.code)}</strong></td>
        <td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td>
        <td>${t.gf}</td><td>${t.gc}</td><td style="font-weight: 700;">${fmtDg(t.dg)}</td>
        <td class="bebas" style="font-size: 18px; color: #0A5B2D;">${t.pts}</td>
      </tr>`).join('');

    const fixtures = [...matches].sort((a, b) => kickoff(a) - kickoff(b)).map(m => {
      const r = result(m);
      const lv = liveScore(m);
      const cons = consensus(m);
      let centro, ia = '';
      if (lv) {
        centro = `<span class="bebas" style="font-size: 28px; line-height: 1; color: #C8372D;">${lv.s[0]}–${lv.s[1]}</span><span class="wcb-blink" style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #C8372D;">&#9679; EN VIVO</span>`;
      } else if (r) {
        centro = `<span class="bebas" style="font-size: 28px; line-height: 1; color: #17150F;">${r.s[0]}–${r.s[1]}</span>`;
      } else {
        centro = `<span style="font-size: 12px; font-weight: 800; letter-spacing: 0.08em; color: #4A463A;">${fmtDay(m)} · ${fmtTime(m)} h</span>`;
      }
      if (cons) {
        if (r) {
          const o = r.o || (r.s[0] > r.s[1] ? 'home' : r.s[0] < r.s[1] ? 'away' : 'draw');
          const ok = cons.sign === o;
          const exact = cons.score === `${r.s[0]}–${r.s[1]}`;
          ia = `<span style="font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: ${ok ? '#0A5B2D' : '#C8372D'};">IA: ${cons.score} ${exact ? '&#9733;' : ok ? '&#10003;' : '&#10005;'}</span>`;
        } else {
          ia = `<span style="font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: #8A8470;">IA: ${cons.score}</span>`;
        }
      }
      return `
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px dashed #DCD3BC;">
          <span style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0;">
            <span class="bebas" style="font-size: 19px; letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(teamName(m.home_team))}</span>
            <span style="font-size: 20px; flex: none;">${codeToFlag(m.home_team)}</span>
          </span>
          <span style="display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 120px;">
            ${centro}
            ${ia}
          </span>
          <span style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span style="font-size: 20px; flex: none;">${codeToFlag(m.away_team)}</span>
            <span class="bebas" style="font-size: 19px; letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(teamName(m.away_team))}</span>
          </span>
        </div>`;
    }).join('');

    const playedLine = `
      <div style="margin-top: 12px; border-top: 2px solid #17150F; padding-top: 4px;">
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #6B675C; padding: 4px 0 2px;">Partidos</div>
        ${fixtures}
      </div>`;

    const notesHtml = notes.length
      ? `<div style="margin-top: 10px; padding: 8px 10px; background: #F3ECD8; border: 1.5px dashed #17150F; border-radius: 3px; font-size: 11px; line-height: 1.5; color: #4A463A;">${notes.map(esc).join('<br>')}</div>`
      : '';

    return `
      <div style="background: #FBF7EA; border: 2.5px solid #17150F; border-radius: 4px; box-shadow: 6px 6px 0 #17150F; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 2px solid #17150F; background: #0A6B33; color: #F6F0E1;">
          <span class="bebas" style="font-size: 20px; letter-spacing: 0.06em;">GRUPO ${esc(g)}</span>
          ${liveNow ? '<span class="wcb-blink" style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: #FFD23F;">&#9679; EN VIVO</span>' : `<span style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(246,240,225,0.7);">${played.length}/6 JUGADOS</span>`}
        </div>
        <div style="padding: 8px 14px 14px;">
          <table class="g-table">
            <thead><tr><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${playedLine}
          ${notesHtml}
        </div>
      </div>`;
  }).join('');

  renderTerceros(groups);
}

function renderTerceros(groups) {
  const terceros = groups.map(g => {
    const { list } = sortGroup(g);
    return { ...list[2], grupo: g };
  }).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || teamName(a.code).localeCompare(teamName(b.code), 'es'));

  $('terceros-table').innerHTML = `
    <thead><tr><th>#</th><th>Equipo</th><th>Grupo</th><th>PJ</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead>
    <tbody>${terceros.map((t, i) => `
      <tr class="${i < 8 ? 'pos-q' : ''}">
        <td style="text-align: left;"><span class="bebas" style="color: #8A8470; font-size: 13px;">${i + 1}</span></td>
        <td style="text-align: left; white-space: nowrap;"><span style="font-size: 14px;">${codeToFlag(t.code)}</span> ${esc(teamName(t.code))}</td>
        <td>${esc(t.grupo)}</td><td>${t.pj}</td><td>${t.gf}</td><td>${t.gc}</td><td style="font-weight: 700;">${fmtDg(t.dg)}</td>
        <td class="bebas" style="font-size: 18px; color: #0A5B2D;">${t.pts}</td>
      </tr>`).join('')}</tbody>`;
}

loadData();
setInterval(loadData, 60000);
