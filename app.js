(() => {
  'use strict';

  const STORAGE_KEY = 'campeonato-efootball-v1';

  const players = [
    { id: 'arthur', name: 'Arthur', team: 'Portugal', teamId: 'portugal', flag: '🇵🇹' },
    { id: 'emerson', name: 'Emerson', team: 'França', teamId: 'franca', flag: '🇫🇷' },
    { id: 'juninho', name: 'Juninho', team: 'Inglaterra', teamId: 'inglaterra', flag: '🏴' },
    { id: 'waltinho', name: 'Waltinho', team: 'Brasil', teamId: 'brasil', flag: '🇧🇷' },
    { id: 'windson', name: 'Windson', team: 'Japão', teamId: 'japao', flag: '🇯🇵' }
  ];

  const leagueTemplate = [
    ['emerson','windson'],
    ['juninho','waltinho'],
    ['arthur','windson'],
    ['emerson','juninho'],
    ['arthur','waltinho'],
    ['windson','juninho'],
    ['waltinho','emerson'],
    ['arthur','juninho'],
    ['waltinho','windson'],
    ['arthur','emerson']
  ];

  const freshState = () => ({
    version: 1,
    league: leagueTemplate.map((pair, index) => ({ id: `L${index + 1}`, homeId: pair[0], awayId: pair[1], homeScore: null, awayScore: null })),
    knockout: {
      semi1: { homeScore: null, awayScore: null, penaltyWinnerId: null },
      semi2: { homeScore: null, awayScore: null, penaltyWinnerId: null },
      final: { homeScore: null, awayScore: null, penaltyWinnerId: null }
    },
    updatedAt: null
  });

  let state = loadState();
  let deferredInstallPrompt = null;
  let toastTimer = null;

  const $ = (selector) => document.querySelector(selector);
  const getPlayer = (id) => players.find(p => p.id === id);
  const crestSrc = (id) => {
    const player = getPlayer(id);
    const teamAsset = player?.teamId || id;
    return `./assets/teams/${teamAsset}.svg`;
  };
  const crestImg = (player, className = 'mini-crest') => `<img class="${className}" src="${crestSrc(player.id)}" alt="" aria-hidden="true" />`;
  const isScore = (value) => Number.isInteger(value) && value >= 0 && value <= 99;
  const completedLeague = () => state.league.filter(m => isScore(m.homeScore) && isScore(m.awayScore));
  const leagueFinished = () => completedLeague().length === state.league.length;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.league)) return freshState();
      return parsed;
    } catch {
      return freshState();
    }
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderSavedAt();
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function parseScore(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(99, Math.floor(n))) : 0;
  }

  function getStandings() {
    const stats = new Map(players.map((p, seed) => [p.id, {
      id: p.id, seed, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0
    }]));

    completedLeague().forEach(match => {
      const h = stats.get(match.homeId);
      const a = stats.get(match.awayId);
      h.j++; a.j++;
      h.gp += match.homeScore; h.gc += match.awayScore;
      a.gp += match.awayScore; a.gc += match.homeScore;
      if (match.homeScore > match.awayScore) { h.v++; a.d++; h.pts += 3; }
      else if (match.homeScore < match.awayScore) { a.v++; h.d++; a.pts += 3; }
      else { h.e++; a.e++; h.pts++; a.pts++; }
    });

    stats.forEach(s => { s.sg = s.gp - s.gc; });
    let ordered = Array.from(stats.values()).sort((a,b) =>
      b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || a.seed - b.seed
    );

    // Critério final: confronto direto (mini-liga entre os empatados em PTS, SG e GP).
    const groups = [];
    ordered.forEach(item => {
      const key = `${item.pts}|${item.sg}|${item.gp}`;
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) groups.push({ key, items: [item] });
      else last.items.push(item);
    });

    ordered = groups.flatMap(group => {
      if (group.items.length < 2) return group.items;
      const ids = new Set(group.items.map(i => i.id));
      const mini = new Map(group.items.map(i => [i.id, { pts: 0, gf: 0, ga: 0, gd: 0 }]));
      completedLeague().forEach(m => {
        if (!ids.has(m.homeId) || !ids.has(m.awayId)) return;
        const h = mini.get(m.homeId), a = mini.get(m.awayId);
        h.gf += m.homeScore; h.ga += m.awayScore;
        a.gf += m.awayScore; a.ga += m.homeScore;
        if (m.homeScore > m.awayScore) h.pts += 3;
        else if (m.homeScore < m.awayScore) a.pts += 3;
        else { h.pts++; a.pts++; }
      });
      mini.forEach(s => s.gd = s.gf - s.ga);
      return group.items.slice().sort((a,b) => {
        const ma = mini.get(a.id), mb = mini.get(b.id);
        return mb.pts - ma.pts || mb.gd - ma.gd || mb.gf - ma.gf || a.seed - b.seed;
      });
    });

    return ordered;
  }

  function getKnockoutParticipants() {
    if (!leagueFinished()) return null;
    const table = getStandings();
    const s1Home = table[0].id, s1Away = table[3].id;
    const s2Home = table[1].id, s2Away = table[2].id;
    const s1Winner = knockoutWinner(state.knockout.semi1, s1Home, s1Away);
    const s2Winner = knockoutWinner(state.knockout.semi2, s2Home, s2Away);
    return {
      semi1: { homeId: s1Home, awayId: s1Away },
      semi2: { homeId: s2Home, awayId: s2Away },
      final: s1Winner && s2Winner ? { homeId: s1Winner, awayId: s2Winner } : null
    };
  }

  function knockoutWinner(matchState, homeId, awayId) {
    if (!homeId || !awayId || !isScore(matchState.homeScore) || !isScore(matchState.awayScore)) return null;
    if (matchState.homeScore > matchState.awayScore) return homeId;
    if (matchState.awayScore > matchState.homeScore) return awayId;
    return matchState.penaltyWinnerId === homeId || matchState.penaltyWinnerId === awayId ? matchState.penaltyWinnerId : null;
  }

  function knockoutHasData() {
    return Object.values(state.knockout).some(m => isScore(m.homeScore) || isScore(m.awayScore) || m.penaltyWinnerId);
  }

  function clearKnockout() {
    state.knockout = freshState().knockout;
  }

  function renderPlayers() {
    $('#playersGrid').innerHTML = players.map(p => `
      <article class="player-card" data-player="${p.id}">
        <div class="player-card__crest-wrap">${crestImg(p, 'player-card__crest')}</div>
        <strong>${p.name}</strong>
        <span>${p.team}</span>
      </article>`).join('');
  }

  function renderStandings() {
    const table = getStandings();
    $('#standingsBody').innerHTML = table.map((s, idx) => {
      const p = getPlayer(s.id);
      const sg = s.sg > 0 ? `+${s.sg}` : s.sg;
      return `<tr class="${idx < 4 ? 'qualifier' : ''} ${idx === 0 ? 'leader' : ''}">
        <td class="rank-cell">${idx + 1}º</td>
        <td><div class="player-cell">${crestImg(p, 'mini-crest')}<span>${p.name}</span></div></td>
        <td>${s.j}</td><td>${s.v}</td><td>${s.e}</td><td>${s.d}</td>
        <td>${s.gp}</td><td>${s.gc}</td><td>${sg}</td><td class="points-cell">${s.pts}</td>
      </tr>`;
    }).join('');
  }

  function renderMatches() {
    const done = completedLeague().length;
    $('#leagueStatus').textContent = `${done} de ${state.league.length} concluídos`;
    $('#progressValue').textContent = `${done} / ${state.league.length}`;
    $('#matchesList').innerHTML = state.league.map((m, idx) => {
      const h = getPlayer(m.homeId), a = getPlayer(m.awayId);
      const finished = isScore(m.homeScore) && isScore(m.awayScore);
      const score = finished ? `${m.homeScore} × ${m.awayScore}` : '— × —';
      return `<article class="match-row">
        <div class="match-number">J${idx + 1}</div>
        <div>
          <div class="match-row__teams">
            <span class="match-team-name">${crestImg(h, 'match-mini-crest')}<span>${h.name}</span></span>
            <span class="x">×</span>
            <span class="match-team-name">${crestImg(a, 'match-mini-crest')}<span>${a.name}</span></span>
          </div>
          <div class="match-status ${finished ? 'done' : ''}">${finished ? '✓ Concluído' : 'Aguardando'}</div>
        </div>
        <div class="match-score">
          <strong>${score}</strong>
          <button class="icon-btn" type="button" data-edit-league="${m.id}">${finished ? 'Editar' : 'Lançar'}</button>
        </div>
      </article>`;
    }).join('');

    document.querySelectorAll('[data-edit-league]').forEach(btn => {
      btn.addEventListener('click', () => scrollToLeagueMatch(btn.dataset.editLeague));
    });
  }

  function getNextMatchDescriptor() {
    const nextLeague = state.league.find(m => !(isScore(m.homeScore) && isScore(m.awayScore)));
    if (nextLeague) return { type: 'league', id: nextLeague.id, homeId: nextLeague.homeId, awayId: nextLeague.awayId, state: nextLeague };

    const kp = getKnockoutParticipants();
    if (!kp) return null;
    const s1Winner = knockoutWinner(state.knockout.semi1, kp.semi1.homeId, kp.semi1.awayId);
    if (!s1Winner) return { type: 'semi1', id: 'semi1', homeId: kp.semi1.homeId, awayId: kp.semi1.awayId, state: state.knockout.semi1 };
    const s2Winner = knockoutWinner(state.knockout.semi2, kp.semi2.homeId, kp.semi2.awayId);
    if (!s2Winner) return { type: 'semi2', id: 'semi2', homeId: kp.semi2.homeId, awayId: kp.semi2.awayId, state: state.knockout.semi2 };
    if (kp.final) {
      const finalWinner = knockoutWinner(state.knockout.final, kp.final.homeId, kp.final.awayId);
      if (!finalWinner) return { type: 'final', id: 'final', homeId: kp.final.homeId, awayId: kp.final.awayId, state: state.knockout.final };
    }
    return null;
  }

  function phaseTitle(type) {
    if (type === 'league') return 'FASE DE LIGA';
    if (type === 'semi1' || type === 'semi2') return 'SEMIFINAL';
    if (type === 'final') return 'GRANDE FINAL';
    return 'ENCERRADO';
  }

  function descriptorForTarget(targetId) {
    const league = state.league.map(m => ({ type:'league', id:m.id, homeId:m.homeId, awayId:m.awayId, state:m })).find(x => x.id === targetId);
    if (league) return league;
    if (!['semi1','semi2','final'].includes(targetId)) return null;
    const kp = getKnockoutParticipants();
    if (!kp || !kp[targetId]) return null;
    return { type: targetId, id: targetId, homeId: kp[targetId].homeId, awayId: kp[targetId].awayId, state: state.knockout[targetId] };
  }

  function renderNextMatch(targetId = null) {
    const descriptor = targetId ? descriptorForTarget(targetId) : getNextMatchDescriptor();

    const phase = descriptor ? phaseTitle(descriptor.type) : (leagueFinished() ? 'ENCERRADO' : 'FASE DE LIGA');
    $('#phaseLabel').textContent = phase;

    if (!descriptor) {
      const kp = getKnockoutParticipants();
      const championId = kp?.final ? knockoutWinner(state.knockout.final, kp.final.homeId, kp.final.awayId) : null;
      const champion = championId ? getPlayer(championId) : null;
      $('#nextMatchContent').innerHTML = champion
        ? `<div class="champion-card"><div class="crown">🏆</div><span class="section-kicker">CAMPEÃO</span>${crestImg(champion, 'champion-crest')}<h3>${champion.name}</h3><p>${champion.team}</p></div>`
        : `<div class="empty-state">Nenhum jogo disponível no momento.</div>`;
      return;
    }

    const home = getPlayer(descriptor.homeId), away = getPlayer(descriptor.awayId);
    const currentH = isScore(descriptor.state.homeScore) ? descriptor.state.homeScore : 0;
    const currentA = isScore(descriptor.state.awayScore) ? descriptor.state.awayScore : 0;
    const isKnockout = descriptor.type !== 'league';
    const savedPenalty = descriptor.state.penaltyWinnerId;

    $('#nextMatchContent').innerHTML = `<div class="match-console" data-active-match="${descriptor.id}" data-match-type="${descriptor.type}">
      <div class="match-console__teams">
        <div class="team-display">${crestImg(home, 'team-display__crest')}<strong>${home.name}</strong><span>${home.team}</span></div>
        <div class="versus">VS</div>
        <div class="team-display">${crestImg(away, 'team-display__crest')}<strong>${away.name}</strong><span>${away.team}</span></div>
      </div>
      <div class="score-editor">
        <div class="score-box">
          <button type="button" data-score-action="home-minus" aria-label="Diminuir placar de ${home.name}">−</button>
          <input id="homeScoreInput" inputmode="numeric" pattern="[0-9]*" min="0" max="99" value="${currentH}" aria-label="Placar de ${home.name}" />
          <button type="button" data-score-action="home-plus" aria-label="Aumentar placar de ${home.name}">+</button>
        </div>
        <div class="score-separator">×</div>
        <div class="score-box">
          <button type="button" data-score-action="away-minus" aria-label="Diminuir placar de ${away.name}">−</button>
          <input id="awayScoreInput" inputmode="numeric" pattern="[0-9]*" min="0" max="99" value="${currentA}" aria-label="Placar de ${away.name}" />
          <button type="button" data-score-action="away-plus" aria-label="Aumentar placar de ${away.name}">+</button>
        </div>
      </div>
      ${isKnockout ? `<div id="penaltyChoice" class="penalty-choice" ${currentH === currentA ? '' : 'hidden'}>
        <p>Empate no mata-mata: quem venceu nos pênaltis?</p>
        <div class="penalty-choice__buttons">
          <button type="button" class="btn ${savedPenalty === home.id ? 'btn--primary' : 'btn--secondary'}" data-penalty-winner="${home.id}">${home.name} • ${home.team}</button>
          <button type="button" class="btn ${savedPenalty === away.id ? 'btn--primary' : 'btn--secondary'}" data-penalty-winner="${away.id}">${away.name} • ${away.team}</button>
        </div>
      </div>` : ''}
      <div class="match-console__actions">
        <button id="saveMatchBtn" type="button" class="btn btn--primary">${descriptor.type === 'league' ? 'Finalizar partida' : 'Confirmar resultado'}</button>
        ${targetId ? '<button id="backToNextBtn" type="button" class="btn btn--secondary">Voltar ao próximo jogo</button>' : ''}
      </div>
    </div>`;

    const hInput = $('#homeScoreInput'), aInput = $('#awayScoreInput');
    const syncPenalty = () => {
      const box = $('#penaltyChoice');
      if (!box) return;
      if (parseScore(hInput.value) === parseScore(aInput.value)) box.hidden = false;
      else box.hidden = true;
    };
    hInput.addEventListener('input', syncPenalty);
    aInput.addEventListener('input', syncPenalty);

    document.querySelectorAll('[data-score-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.scoreAction;
        const input = action.startsWith('home') ? hInput : aInput;
        const delta = action.endsWith('plus') ? 1 : -1;
        input.value = Math.max(0, Math.min(99, parseScore(input.value) + delta));
        syncPenalty();
      });
    });

    document.querySelectorAll('[data-penalty-winner]').forEach(btn => {
      btn.addEventListener('click', () => {
        descriptor.state.penaltyWinnerId = btn.dataset.penaltyWinner;
        document.querySelectorAll('[data-penalty-winner]').forEach(b => b.className = 'btn btn--secondary');
        btn.className = 'btn btn--primary';
      });
    });

    $('#saveMatchBtn').addEventListener('click', () => saveActiveMatch(descriptor, hInput, aInput));
    $('#backToNextBtn')?.addEventListener('click', () => { renderNextMatch(); $('.next-match-panel').scrollIntoView({ behavior:'smooth', block:'start' }); });
  }

  function saveActiveMatch(descriptor, hInput, aInput) {
    const homeScore = parseScore(hInput.value), awayScore = parseScore(aInput.value);
    if (descriptor.type === 'league') {
      const wasDone = isScore(descriptor.state.homeScore) && isScore(descriptor.state.awayScore);
      const scoreChanged = wasDone && (descriptor.state.homeScore !== homeScore || descriptor.state.awayScore !== awayScore);
      if (scoreChanged && knockoutHasData()) {
        if (!confirm('Alterar este resultado pode mudar a classificação. Os resultados das semifinais e da final serão apagados. Continuar?')) return;
        clearKnockout();
      }
      descriptor.state.homeScore = homeScore;
      descriptor.state.awayScore = awayScore;
      saveState();
      showToast('Resultado salvo. Classificação atualizada.');
      renderAll();
      return;
    }

    const previous = {
      homeScore: descriptor.state.homeScore,
      awayScore: descriptor.state.awayScore,
      penaltyWinnerId: descriptor.state.penaltyWinnerId
    };
    const oldWinner = knockoutWinner(descriptor.state, descriptor.homeId, descriptor.awayId);
    descriptor.state.homeScore = homeScore;
    descriptor.state.awayScore = awayScore;
    if (homeScore !== awayScore) descriptor.state.penaltyWinnerId = null;
    if (homeScore === awayScore) {
      const homeId = descriptor.homeId, awayId = descriptor.awayId;
      if (descriptor.state.penaltyWinnerId !== homeId && descriptor.state.penaltyWinnerId !== awayId) {
        showToast('Escolha o vencedor nos pênaltis.');
        renderNextMatch(descriptor.id);
        return;
      }
    }
    const newWinner = knockoutWinner(descriptor.state, descriptor.homeId, descriptor.awayId);
    if ((descriptor.type === 'semi1' || descriptor.type === 'semi2') && oldWinner && newWinner && oldWinner !== newWinner && (isScore(state.knockout.final.homeScore) || isScore(state.knockout.final.awayScore))) {
      if (!confirm('O vencedor desta semifinal mudou. O resultado da final será apagado para montar o confronto correto. Continuar?')) {
        descriptor.state.homeScore = previous.homeScore;
        descriptor.state.awayScore = previous.awayScore;
        descriptor.state.penaltyWinnerId = previous.penaltyWinnerId;
        renderAll();
        return;
      }
      state.knockout.final = freshState().knockout.final;
    }
    saveState();
    showToast(descriptor.type === 'final' ? 'Final registrada!' : 'Resultado do mata-mata salvo.');
    renderAll();
  }

  function scrollToLeagueMatch(matchId) {
    renderNextMatch(matchId);
    $('.next-match-panel').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function renderKnockout() {
    const root = $('#knockoutContent');
    if (!leagueFinished()) {
      root.innerHTML = `<div class="empty-state">As semifinais serão montadas automaticamente quando os 10 jogos da primeira fase terminarem.</div>`;
      return;
    }

    const kp = getKnockoutParticipants();
    const s1w = knockoutWinner(state.knockout.semi1, kp.semi1.homeId, kp.semi1.awayId);
    const s2w = knockoutWinner(state.knockout.semi2, kp.semi2.homeId, kp.semi2.awayId);
    const finalWinner = kp.final ? knockoutWinner(state.knockout.final, kp.final.homeId, kp.final.awayId) : null;

    root.innerHTML = `<div class="knockout-bracket">
      ${koCard('SEMIFINAL 1', kp.semi1, state.knockout.semi1, s1w)}
      ${koCard('SEMIFINAL 2', kp.semi2, state.knockout.semi2, s2w)}
      ${kp.final ? koCard('GRANDE FINAL', kp.final, state.knockout.final, finalWinner, true) : `<article class="ko-card ko-card--final"><div class="ko-card__label">GRANDE FINAL</div><div class="empty-state">Aguardando os vencedores das semifinais.</div></article>`}
    </div>
    ${finalWinner ? championMarkup(finalWinner) : ''}`;
    root.querySelectorAll('[data-edit-ko]').forEach(btn => btn.addEventListener('click', () => {
      renderNextMatch(btn.dataset.editKo);
      $('.next-match-panel').scrollIntoView({ behavior:'smooth', block:'start' });
    }));
  }

  function koCard(label, participants, matchState, winnerId, isFinal = false) {
    const h = getPlayer(participants.homeId), a = getPlayer(participants.awayId);
    const hasScore = isScore(matchState.homeScore) && isScore(matchState.awayScore);
    const scoreH = hasScore ? matchState.homeScore : '—';
    const scoreA = hasScore ? matchState.awayScore : '—';
    const key = label === 'SEMIFINAL 1' ? 'semi1' : label === 'SEMIFINAL 2' ? 'semi2' : 'final';
    return `<article class="ko-card ${isFinal ? 'ko-card--final' : ''}">
      <div class="ko-card__label">${label}</div>
      <div class="ko-card__teams">
        <div class="ko-team ${winnerId === h.id ? 'winner' : ''}"><span class="ko-team__identity">${crestImg(h, 'ko-team__crest')}<span>${h.name}</span></span><strong>${scoreH}</strong></div>
        <div class="ko-team ${winnerId === a.id ? 'winner' : ''}"><span class="ko-team__identity">${crestImg(a, 'ko-team__crest')}<span>${a.name}</span></span><strong>${scoreA}</strong></div>
      </div>
      <div class="ko-card__actions"><button type="button" class="icon-btn" data-edit-ko="${key}">${hasScore ? 'Editar resultado' : 'Lançar resultado'}</button></div>
    </article>`;
  }

  function championMarkup(id) {
    const p = getPlayer(id);
    return `<div class="champion-card"><div class="crown">🏆</div><span class="section-kicker">CAMPEÃO</span>${crestImg(p, 'champion-crest')}<h3>${p.name}</h3><p>${p.team}</p></div>`;
  }

  function renderSavedAt() {
    const el = $('#savedAt');
    if (!state.updatedAt) { el.textContent = 'Salvamento automático'; return; }
    const d = new Date(state.updatedAt);
    el.textContent = `Salvo às ${d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`;
  }

  function renderAll() {
    renderPlayers();
    renderStandings();
    renderMatches();
    renderKnockout();
    renderNextMatch();
    renderSavedAt();
  }

  function exportBackup() {
    const payload = { ...state, exportedAt: new Date().toISOString(), app: 'Campeonato de eFootball' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campeonato-efootball-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup baixado.');
  }

  async function importBackup(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.league) || !parsed.knockout) throw new Error('Formato inválido');
      if (!confirm('Restaurar este backup substituirá os resultados atuais. Continuar?')) return;
      state = parsed;
      saveState();
      renderAll();
      showToast('Backup restaurado.');
    } catch {
      showToast('Não foi possível restaurar este arquivo.');
    }
  }

  function resetTournament() {
    if (!confirm('Tem certeza que deseja apagar TODOS os resultados e reiniciar o campeonato?')) return;
    if (!confirm('Última confirmação: esta ação não pode ser desfeita sem um backup.')) return;
    state = freshState();
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    showToast('Campeonato reiniciado.');
  }

  function setupControls() {
    $('#exportBtn').addEventListener('click', exportBackup);
    $('#importInput').addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) importBackup(file);
      e.target.value = '';
    });
    $('#resetBtn').addEventListener('click', resetTournament);

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); deferredInstallPrompt = e;
      $('#installBtn').hidden = false;
    });
    $('#installBtn').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $('#installBtn').hidden = true;
    });

    const updateConnection = () => {
      const badge = $('#connectionBadge');
      badge.textContent = navigator.onLine ? 'Online' : 'Offline • funcionando';
    };
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    updateConnection();
  }

  function setupPwa() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  }

  renderAll();
  setupControls();
  setupPwa();
})();
