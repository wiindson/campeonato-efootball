(() => {
  'use strict';

  const STORAGE_KEY = 'campeonato-efootball-v2';
  const LEGACY_STORAGE_KEY = 'campeonato-efootball-v1';
  const PLAYER_KEY = 'campeonato-efootball-current-player';
  const TEAMS = [
    { id: 'portugal', name: 'Portugal', flag: '🇵🇹' },
    { id: 'franca', name: 'França', flag: '🇫🇷' },
    { id: 'inglaterra', name: 'Inglaterra', flag: '🏴' },
    { id: 'brasil', name: 'Brasil', flag: '🇧🇷' },
    { id: 'japao', name: 'Japão', flag: '🇯🇵' }
  ];
  const LEGACY_PLAYERS = [
    { id: 'arthur', name: 'Arthur', teamId: 'portugal' },
    { id: 'emerson', name: 'Emerson', teamId: 'franca' },
    { id: 'juninho', name: 'Juninho', teamId: 'inglaterra' },
    { id: 'waltinho', name: 'Waltinho', teamId: 'brasil' },
    { id: 'windson', name: 'Windson', teamId: 'japao' }
  ];

  const emptyKnockout = () => ({
    semi1: { homeScore: null, awayScore: null, penaltyWinnerId: null },
    semi2: { homeScore: null, awayScore: null, penaltyWinnerId: null },
    final: { homeScore: null, awayScore: null, penaltyWinnerId: null }
  });
  const freshState = () => ({ version: 2, players: [], league: [], knockout: emptyKnockout(), updatedAt: null });

  let state = loadState();
  let currentPlayerId = localStorage.getItem(PLAYER_KEY);
  let deferredInstallPrompt = null;
  let toastTimer = null;

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const getPlayer = id => state.players.find(player => player.id === id);
  const getTeam = id => TEAMS.find(team => team.id === id);
  const teamName = player => getTeam(player?.teamId)?.name || 'Sem seleção';
  const crestSrc = player => `./assets/teams/${player.teamId}.svg`;
  const crestImg = (player, className = 'mini-crest') => `<img class="${className}" src="${crestSrc(player)}" alt="Escudo de ${escapeHtml(teamName(player))}" />`;
  const isScore = value => Number.isInteger(value) && value >= 0 && value <= 99;
  const completedLeague = () => state.league.filter(match => isScore(match.homeScore) && isScore(match.awayScore));
  const leagueFinished = () => state.league.length > 0 && completedLeague().length === state.league.length;
  const hasResults = () => completedLeague().length > 0 || Object.values(state.knockout).some(match => isScore(match.homeScore) || isScore(match.awayScore));

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed?.version === 2 && Array.isArray(parsed.players) && Array.isArray(parsed.league)) return parsed;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
      if (legacy?.version === 1 && Array.isArray(legacy.league)) {
        return { version: 2, players: LEGACY_PLAYERS, league: legacy.league, knockout: legacy.knockout || emptyKnockout(), updatedAt: legacy.updatedAt || null };
      }
    } catch {}
    return freshState();
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
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function parseScore(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(99, Math.floor(number))) : 0;
  }

  function slugify(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'jogador';
  }

  function uniquePlayerId(name) {
    const base = slugify(name);
    let id = base;
    let suffix = 2;
    while (getPlayer(id)) id = `${base}-${suffix++}`;
    return id;
  }

  function shuffled(values) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index--) {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const target = random[0] % (index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function generateFixtures() {
    if (state.players.length < 2) {
      state.league = [];
      state.knockout = emptyKnockout();
      return;
    }
    const ids = shuffled(state.players.map(player => player.id));
    if (ids.length % 2) ids.push(null);
    const fixed = ids[0];
    let rotating = ids.slice(1);
    const fixtures = [];
    let matchNumber = 1;
    for (let round = 1; round < ids.length; round++) {
      const order = [fixed, ...rotating];
      for (let index = 0; index < order.length / 2; index++) {
        const first = order[index];
        const second = order[order.length - 1 - index];
        if (!first || !second) continue;
        const reverse = (round + index) % 2 === 0;
        fixtures.push({ id:`L${matchNumber++}`, round, homeId:reverse ? second : first, awayId:reverse ? first : second, homeScore:null, awayScore:null });
      }
      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }
    state.league = fixtures;
    state.knockout = emptyKnockout();
  }

  function getStandings() {
    const stats = new Map(state.players.map((player, seed) => [player.id, { id:player.id, seed, j:0, v:0, e:0, d:0, gp:0, gc:0, sg:0, pts:0 }]));
    completedLeague().forEach(match => {
      const home = stats.get(match.homeId), away = stats.get(match.awayId);
      if (!home || !away) return;
      home.j++; away.j++; home.gp += match.homeScore; home.gc += match.awayScore; away.gp += match.awayScore; away.gc += match.homeScore;
      if (match.homeScore > match.awayScore) { home.v++; away.d++; home.pts += 3; }
      else if (match.homeScore < match.awayScore) { away.v++; home.d++; away.pts += 3; }
      else { home.e++; away.e++; home.pts++; away.pts++; }
    });
    stats.forEach(item => { item.sg = item.gp - item.gc; });
    let ordered = [...stats.values()].sort((a,b) => b.pts-a.pts || b.sg-a.sg || b.gp-a.gp || a.seed-b.seed);
    const groups = [];
    ordered.forEach(item => {
      const key = `${item.pts}|${item.sg}|${item.gp}`;
      const last = groups.at(-1);
      if (!last || last.key !== key) groups.push({ key, items:[item] }); else last.items.push(item);
    });
    ordered = groups.flatMap(group => {
      if (group.items.length < 2) return group.items;
      const ids = new Set(group.items.map(item => item.id));
      const mini = new Map(group.items.map(item => [item.id, { pts:0, gf:0, ga:0, gd:0 }]));
      completedLeague().forEach(match => {
        if (!ids.has(match.homeId) || !ids.has(match.awayId)) return;
        const home = mini.get(match.homeId), away = mini.get(match.awayId);
        home.gf += match.homeScore; home.ga += match.awayScore; away.gf += match.awayScore; away.ga += match.homeScore;
        if (match.homeScore > match.awayScore) home.pts += 3; else if (match.homeScore < match.awayScore) away.pts += 3; else { home.pts++; away.pts++; }
      });
      mini.forEach(item => { item.gd = item.gf - item.ga; });
      return group.items.slice().sort((a,b) => { const x=mini.get(a.id), y=mini.get(b.id); return y.pts-x.pts || y.gd-x.gd || y.gf-x.gf || a.seed-b.seed; });
    });
    return ordered;
  }

  function knockoutWinner(match, homeId, awayId) {
    if (!homeId || !awayId || !isScore(match.homeScore) || !isScore(match.awayScore)) return null;
    if (match.homeScore > match.awayScore) return homeId;
    if (match.awayScore > match.homeScore) return awayId;
    return [homeId, awayId].includes(match.penaltyWinnerId) ? match.penaltyWinnerId : null;
  }

  function getKnockoutParticipants() {
    if (!leagueFinished() || state.players.length < 4) return null;
    const table = getStandings();
    const semi1 = { homeId:table[0].id, awayId:table[3].id }, semi2 = { homeId:table[1].id, awayId:table[2].id };
    const winner1 = knockoutWinner(state.knockout.semi1, semi1.homeId, semi1.awayId), winner2 = knockoutWinner(state.knockout.semi2, semi2.homeId, semi2.awayId);
    return { semi1, semi2, final:winner1 && winner2 ? { homeId:winner1, awayId:winner2 } : null };
  }

  function renderAccess() {
    if (currentPlayerId && !getPlayer(currentPlayerId)) { currentPlayerId=null; localStorage.removeItem(PLAYER_KEY); }
    const current = getPlayer(currentPlayerId), locked = hasResults();
    $('#registrationStatus').textContent = locked ? 'Inscrições encerradas' : `${state.players.length} de ${TEAMS.length} vagas preenchidas`;
    if (current) {
      const options = TEAMS.filter(team => team.id === current.teamId || !state.players.some(player => player.teamId === team.id)).map(team => `<option value="${team.id}" ${team.id===current.teamId?'selected':''}>${team.flag} ${team.name}</option>`).join('');
      $('#accessContent').innerHTML = `<div class="profile-panel"><div class="profile-panel__identity">${crestImg(current,'profile-crest')}<div><span>Você está jogando como</span><strong>${escapeHtml(current.name)}</strong><small>${escapeHtml(teamName(current))}</small></div></div><div class="profile-panel__actions">
        <label class="field field--compact"><span>Minha seleção</span><select id="myTeamSelect" ${locked?'disabled':''}>${options}</select></label>
        <button id="saveTeamBtn" class="btn btn--secondary" type="button" ${locked?'disabled':''}>Salvar seleção</button><button id="leaveProfileBtn" class="btn btn--ghost" type="button">Trocar jogador</button><button id="removePlayerBtn" class="btn btn--danger" type="button" ${locked?'disabled':''}>Cancelar inscrição</button></div></div>
        ${locked?'<p class="access-note">A seleção fica bloqueada depois do primeiro resultado para manter a tabela consistente.</p>':''}`;
      $('#saveTeamBtn').addEventListener('click', saveMyTeam);
      $('#leaveProfileBtn').addEventListener('click', () => { currentPlayerId=null; localStorage.removeItem(PLAYER_KEY); renderAccess(); renderPlayers(); });
      $('#removePlayerBtn').addEventListener('click', removeCurrentPlayer);
      return;
    }
    const available = TEAMS.filter(team => !state.players.some(player => player.teamId===team.id));
    const teamOptions = available.map(team => `<option value="${team.id}">${team.flag} ${team.name}</option>`).join('');
    const playerOptions = state.players.map(player => `<option value="${player.id}">${escapeHtml(player.name)} · ${escapeHtml(teamName(player))}</option>`).join('');
    const canRegister = !locked && available.length > 0;
    $('#accessContent').innerHTML = `<div class="access-grid"><form id="registrationForm" class="access-box"><div><span class="section-kicker">NOVA INSCRIÇÃO</span><h3>Entre no campeonato</h3><p>Informe seu nome e escolha uma seleção ainda disponível.</p></div>
      <label class="field"><span>Seu nome</span><input id="playerNameInput" maxlength="32" autocomplete="name" placeholder="Ex.: Rafael" required ${canRegister?'':'disabled'} /></label><label class="field"><span>Sua seleção</span><select id="teamSelect" ${canRegister?'':'disabled'}>${teamOptions||'<option>Nenhuma seleção disponível</option>'}</select></label><button class="btn btn--primary" type="submit" ${canRegister?'':'disabled'}>Confirmar inscrição</button></form>
      <form id="loginForm" class="access-box access-box--muted"><div><span class="section-kicker">JÁ ESTOU INSCRITO</span><h3>Acessar meu perfil</h3><p>Selecione seu nome para entrar neste aparelho.</p></div><label class="field"><span>Jogador</span><select id="playerSelect" ${state.players.length?'':'disabled'}>${playerOptions||'<option>Nenhum jogador inscrito</option>'}</select></label><button class="btn btn--secondary" type="submit" ${state.players.length?'':'disabled'}>Entrar como jogador</button><button id="redrawBtn" class="btn btn--ghost" type="button" ${state.players.length>=2&&!locked?'':'disabled'}>Sortear confrontos novamente</button></form></div>`;
    $('#registrationForm').addEventListener('submit', registerPlayer); $('#loginForm').addEventListener('submit', enterAsPlayer); $('#redrawBtn').addEventListener('click', redrawFixtures);
  }

  function registerPlayer(event) {
    event.preventDefault();
    if (hasResults()) return showToast('As inscrições já foram encerradas.');
    const name=$('#playerNameInput').value.trim().replace(/\s+/g,' '), teamId=$('#teamSelect').value;
    if (name.length<2) return showToast('Informe um nome com pelo menos 2 caracteres.');
    if (state.players.some(player => player.name.localeCompare(name,'pt-BR',{sensitivity:'base'})===0)) return showToast('Já existe um jogador com esse nome.');
    if (!getTeam(teamId) || state.players.some(player => player.teamId===teamId)) return showToast('Essa seleção não está mais disponível.');
    const player={id:uniquePlayerId(name),name,teamId}; state.players.push(player); currentPlayerId=player.id; localStorage.setItem(PLAYER_KEY,currentPlayerId);
    generateFixtures(); saveState(); renderAll(); showToast('Inscrição confirmada e tabela atualizada!');
  }

  function enterAsPlayer(event) { event.preventDefault(); const id=$('#playerSelect').value; if (!getPlayer(id)) return; currentPlayerId=id; localStorage.setItem(PLAYER_KEY,id); renderAccess(); renderPlayers(); }
  function saveMyTeam() { const player=getPlayer(currentPlayerId), teamId=$('#myTeamSelect').value; if (!player||hasResults()) return; if (state.players.some(other=>other.id!==player.id&&other.teamId===teamId)) return showToast('Essa seleção já foi escolhida.'); player.teamId=teamId; saveState(); renderAll(); showToast('Sua seleção foi atualizada.'); }
  function removeCurrentPlayer() { if (hasResults()||!getPlayer(currentPlayerId)||!confirm('Cancelar sua inscrição e refazer os confrontos?')) return; state.players=state.players.filter(player=>player.id!==currentPlayerId); currentPlayerId=null; localStorage.removeItem(PLAYER_KEY); generateFixtures(); saveState(); renderAll(); showToast('Inscrição cancelada.'); }
  function redrawFixtures() { if (hasResults()||state.players.length<2) return; generateFixtures(); saveState(); renderAll(); showToast('Novo sorteio realizado!'); }

  function renderPlayers() {
    $('#participantCount').textContent=state.players.length; $('#participantsMeta').textContent=state.players.length?`${state.players.length} inscritos · ${TEAMS.length-state.players.length} vagas`:'Aguardando inscrições';
    if (!state.players.length) { $('#playersGrid').innerHTML='<div class="empty-state empty-state--full">Nenhum jogador inscrito. Seja o primeiro a escolher uma seleção.</div>'; return; }
    $('#playersGrid').innerHTML=state.players.map(player=>`<article class="player-card ${player.id===currentPlayerId?'player-card--current':''}">${player.id===currentPlayerId?'<span class="you-badge">VOCÊ</span>':''}<div class="player-card__crest-wrap">${crestImg(player,'player-card__crest')}</div><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(teamName(player))}</span></article>`).join('');
  }

  function renderStandings() {
    const table=getStandings();
    $('#standingsBody').innerHTML=table.length?table.map((item,index)=>{ const player=getPlayer(item.id),sg=item.sg>0?`+${item.sg}`:item.sg; return `<tr class="${index<4&&state.players.length>=4?'qualifier':''} ${index===0?'leader':''}"><td class="rank-cell">${index+1}º</td><td><div class="player-cell">${crestImg(player)}<span>${escapeHtml(player.name)}</span></div></td><td>${item.j}</td><td>${item.v}</td><td>${item.e}</td><td>${item.d}</td><td>${item.gp}</td><td>${item.gc}</td><td>${sg}</td><td class="points-cell">${item.pts}</td></tr>`; }).join(''):'<tr><td colspan="10" class="table-empty">A classificação aparecerá após as inscrições.</td></tr>';
    $('.standings-note').textContent=state.players.length>=4?'Os quatro primeiros avançam às semifinais.':'São necessários pelo menos quatro participantes para formar as semifinais.';
  }

  function renderMatches() {
    const done=completedLeague().length,total=state.league.length; $('#leagueStatus').textContent=total?`${done} de ${total} concluídos`:'Aguardando participantes'; $('#progressValue').textContent=`${done} / ${total}`; $('#leagueProgressBar').style.width=`${total?done/total*100:0}%`;
    if (!total) { $('#matchesList').innerHTML='<div class="empty-state">Os confrontos serão sorteados automaticamente quando houver dois participantes.</div>'; return; }
    $('#matchesList').innerHTML=state.league.map((match,index)=>{ const home=getPlayer(match.homeId),away=getPlayer(match.awayId),finished=isScore(match.homeScore)&&isScore(match.awayScore); return `<article class="match-row"><div class="match-number">R${match.round||1} · J${index+1}</div><div><div class="match-row__teams"><span class="match-team-name">${crestImg(home,'match-mini-crest')}<span>${escapeHtml(home.name)}</span></span><span class="x">×</span><span class="match-team-name">${crestImg(away,'match-mini-crest')}<span>${escapeHtml(away.name)}</span></span></div><div class="match-status ${finished?'done':''}">${finished?'✓ Concluído':'Aguardando'}</div></div><div class="match-score"><strong>${finished?`${match.homeScore} × ${match.awayScore}`:'— × —'}</strong><button class="icon-btn" type="button" data-edit-league="${match.id}">${finished?'Editar':'Lançar'}</button></div></article>`; }).join('');
    document.querySelectorAll('[data-edit-league]').forEach(button=>button.addEventListener('click',()=>scrollToMatch(button.dataset.editLeague)));
  }

  function descriptorForTarget(targetId) {
    const league=state.league.find(match=>match.id===targetId); if (league) return {type:'league',id:league.id,homeId:league.homeId,awayId:league.awayId,state:league};
    if (!['semi1','semi2','final'].includes(targetId)) return null; const participants=getKnockoutParticipants(); if (!participants?.[targetId]) return null; return {type:targetId,id:targetId,...participants[targetId],state:state.knockout[targetId]};
  }
  function nextMatchDescriptor() {
    const league=state.league.find(match=>!isScore(match.homeScore)||!isScore(match.awayScore)); if (league) return descriptorForTarget(league.id);
    const p=getKnockoutParticipants(); if (!p) return null; if (!knockoutWinner(state.knockout.semi1,p.semi1.homeId,p.semi1.awayId)) return descriptorForTarget('semi1'); if (!knockoutWinner(state.knockout.semi2,p.semi2.homeId,p.semi2.awayId)) return descriptorForTarget('semi2'); if (p.final&&!knockoutWinner(state.knockout.final,p.final.homeId,p.final.awayId)) return descriptorForTarget('final'); return null;
  }
  const phaseTitle=type=>type==='league'?'FASE DE LIGA':type==='final'?'GRANDE FINAL':type?'SEMIFINAL':'AGUARDANDO';

  function renderNextMatch(targetId=null) {
    const descriptor=targetId?descriptorForTarget(targetId):nextMatchDescriptor(); $('#phaseLabel').textContent=descriptor?phaseTitle(descriptor.type):leagueFinished()?'ENCERRADO':'AGUARDANDO';
    if (!descriptor) { const p=getKnockoutParticipants(),championId=p?.final?knockoutWinner(state.knockout.final,p.final.homeId,p.final.awayId):null; if (championId) $('#nextMatchContent').innerHTML=championMarkup(championId); else if (leagueFinished()&&state.players.length<4) $('#nextMatchContent').innerHTML='<div class="empty-state">A liga terminou. São necessários quatro jogadores para disputar o mata-mata.</div>'; else $('#nextMatchContent').innerHTML='<div class="empty-state">Inscreva pelo menos dois jogadores para sortear o primeiro confronto.</div>'; return; }
    const home=getPlayer(descriptor.homeId),away=getPlayer(descriptor.awayId),homeScore=isScore(descriptor.state.homeScore)?descriptor.state.homeScore:0,awayScore=isScore(descriptor.state.awayScore)?descriptor.state.awayScore:0,knockout=descriptor.type!=='league';
    $('#nextMatchContent').innerHTML=`<div class="match-console"><div class="match-console__teams"><div class="team-display">${crestImg(home,'team-display__crest')}<strong>${escapeHtml(home.name)}</strong><span>${escapeHtml(teamName(home))}</span></div><div class="versus">VS</div><div class="team-display">${crestImg(away,'team-display__crest')}<strong>${escapeHtml(away.name)}</strong><span>${escapeHtml(teamName(away))}</span></div></div><div class="score-editor"><div class="score-box"><button type="button" data-score="home-minus">−</button><input id="homeScoreInput" inputmode="numeric" value="${homeScore}" aria-label="Placar de ${escapeHtml(home.name)}" /><button type="button" data-score="home-plus">+</button></div><div class="score-separator">×</div><div class="score-box"><button type="button" data-score="away-minus">−</button><input id="awayScoreInput" inputmode="numeric" value="${awayScore}" aria-label="Placar de ${escapeHtml(away.name)}" /><button type="button" data-score="away-plus">+</button></div></div>${knockout?`<div id="penaltyChoice" class="penalty-choice" ${homeScore===awayScore?'':'hidden'}><p>Empate no mata-mata: quem venceu nos pênaltis?</p><div class="penalty-choice__buttons"><button type="button" class="btn ${descriptor.state.penaltyWinnerId===home.id?'btn--primary':'btn--secondary'}" data-penalty="${home.id}">${escapeHtml(home.name)}</button><button type="button" class="btn ${descriptor.state.penaltyWinnerId===away.id?'btn--primary':'btn--secondary'}" data-penalty="${away.id}">${escapeHtml(away.name)}</button></div></div>`:''}<div class="match-console__actions"><button id="saveMatchBtn" class="btn btn--primary" type="button">Confirmar resultado</button>${targetId?'<button id="backToNextBtn" class="btn btn--secondary" type="button">Voltar ao próximo jogo</button>':''}</div></div>`;
    const homeInput=$('#homeScoreInput'),awayInput=$('#awayScoreInput'),syncPenalty=()=>{const box=$('#penaltyChoice');if(box)box.hidden=parseScore(homeInput.value)!==parseScore(awayInput.value);}; [homeInput,awayInput].forEach(input=>input.addEventListener('input',syncPenalty));
    document.querySelectorAll('[data-score]').forEach(button=>button.addEventListener('click',()=>{const input=button.dataset.score.startsWith('home')?homeInput:awayInput;input.value=Math.max(0,Math.min(99,parseScore(input.value)+(button.dataset.score.endsWith('plus')?1:-1)));syncPenalty();}));
    document.querySelectorAll('[data-penalty]').forEach(button=>button.addEventListener('click',()=>{descriptor.state.penaltyWinnerId=button.dataset.penalty;document.querySelectorAll('[data-penalty]').forEach(item=>item.className='btn btn--secondary');button.className='btn btn--primary';}));
    $('#saveMatchBtn').addEventListener('click',()=>saveMatch(descriptor,homeInput,awayInput)); $('#backToNextBtn')?.addEventListener('click',()=>renderNextMatch());
  }

  function saveMatch(descriptor,homeInput,awayInput) {
    const homeScore=parseScore(homeInput.value),awayScore=parseScore(awayInput.value);
    if (descriptor.type==='league') { const changed=isScore(descriptor.state.homeScore)&&(descriptor.state.homeScore!==homeScore||descriptor.state.awayScore!==awayScore); if(changed&&Object.values(state.knockout).some(match=>isScore(match.homeScore))&&!confirm('A classificação pode mudar. Apagar os resultados do mata-mata e continuar?'))return;if(changed)state.knockout=emptyKnockout();descriptor.state.homeScore=homeScore;descriptor.state.awayScore=awayScore; }
    else { const previous=knockoutWinner(descriptor.state,descriptor.homeId,descriptor.awayId);descriptor.state.homeScore=homeScore;descriptor.state.awayScore=awayScore;if(homeScore!==awayScore)descriptor.state.penaltyWinnerId=null;if(homeScore===awayScore&&![descriptor.homeId,descriptor.awayId].includes(descriptor.state.penaltyWinnerId))return showToast('Escolha o vencedor nos pênaltis.');const next=knockoutWinner(descriptor.state,descriptor.homeId,descriptor.awayId);if(descriptor.type!=='final'&&previous&&previous!==next&&isScore(state.knockout.final.homeScore))state.knockout.final=emptyKnockout().final; }
    saveState();renderAll();showToast('Resultado salvo. Classificação atualizada.');
  }
  function scrollToMatch(id){renderNextMatch(id);$('.next-match-panel').scrollIntoView({behavior:'smooth',block:'start'});}

  function renderKnockout() {
    const root=$('#knockoutContent'); if(state.players.length<4){root.innerHTML='<div class="empty-state">O mata-mata será habilitado quando houver pelo menos quatro participantes.</div>';return;} if(!leagueFinished()){root.innerHTML=`<div class="empty-state">As semifinais serão montadas automaticamente quando os ${state.league.length} jogos da primeira fase terminarem.</div>`;return;}
    const p=getKnockoutParticipants(),winner1=knockoutWinner(state.knockout.semi1,p.semi1.homeId,p.semi1.awayId),winner2=knockoutWinner(state.knockout.semi2,p.semi2.homeId,p.semi2.awayId),champion=p.final?knockoutWinner(state.knockout.final,p.final.homeId,p.final.awayId):null;
    root.innerHTML=`<div class="knockout-bracket">${koCard('SEMIFINAL 1','semi1',p.semi1,winner1)}${koCard('SEMIFINAL 2','semi2',p.semi2,winner2)}${p.final?koCard('GRANDE FINAL','final',p.final,champion,true):'<article class="ko-card ko-card--final"><div class="ko-card__label">GRANDE FINAL</div><div class="empty-state">Aguardando os vencedores.</div></article>'}</div>${champion?championMarkup(champion):''}`;root.querySelectorAll('[data-edit-ko]').forEach(button=>button.addEventListener('click',()=>scrollToMatch(button.dataset.editKo)));
  }
  function koCard(label,key,p,winnerId,final=false){const home=getPlayer(p.homeId),away=getPlayer(p.awayId),match=state.knockout[key],complete=isScore(match.homeScore)&&isScore(match.awayScore);return `<article class="ko-card ${final?'ko-card--final':''}"><div class="ko-card__label">${label}</div><div class="ko-card__teams"><div class="ko-team ${winnerId===home.id?'winner':''}"><span class="ko-team__identity">${crestImg(home,'ko-team__crest')}<span>${escapeHtml(home.name)}</span></span><strong>${complete?match.homeScore:'—'}</strong></div><div class="ko-team ${winnerId===away.id?'winner':''}"><span class="ko-team__identity">${crestImg(away,'ko-team__crest')}<span>${escapeHtml(away.name)}</span></span><strong>${complete?match.awayScore:'—'}</strong></div></div><div class="ko-card__actions"><button class="icon-btn" type="button" data-edit-ko="${key}">${complete?'Editar resultado':'Lançar resultado'}</button></div></article>`;}
  function championMarkup(id){const player=getPlayer(id);return `<div class="champion-card"><div class="crown">🏆</div><span class="section-kicker">CAMPEÃO</span>${crestImg(player,'champion-crest')}<h3>${escapeHtml(player.name)}</h3><p>${escapeHtml(teamName(player))}</p></div>`;}
  function renderSavedAt(){if(!state.updatedAt){$('#savedAt').textContent='Salvamento automático';return;}$('#savedAt').textContent=`Salvo às ${new Date(state.updatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;}
  function renderAll(){renderAccess();renderPlayers();renderStandings();renderMatches();renderKnockout();renderNextMatch();renderSavedAt();}

  function exportBackup(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:'Campeonato de eFootball'},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`campeonato-efootball-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);showToast('Backup baixado.');}
  async function importBackup(file){try{const parsed=JSON.parse(await file.text());if(parsed?.version!==2||!Array.isArray(parsed.players)||!Array.isArray(parsed.league)||!parsed.knockout)throw new Error();if(!confirm('Restaurar este backup substituirá o campeonato atual. Continuar?'))return;state=parsed;currentPlayerId=null;localStorage.removeItem(PLAYER_KEY);saveState();renderAll();showToast('Backup restaurado.');}catch{showToast('Não foi possível restaurar este arquivo.');}}
  function resetTournament(){if(!confirm('Apagar inscrições, sorteio e TODOS os resultados?')||!confirm('Última confirmação: faça um backup antes se quiser recuperar os dados.'))return;state=freshState();currentPlayerId=null;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_STORAGE_KEY);localStorage.removeItem(PLAYER_KEY);renderAll();showToast('Campeonato reiniciado.');}
  function setupControls(){ $('#exportBtn').addEventListener('click',exportBackup);$('#importInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(file)importBackup(file);event.target.value='';});$('#resetBtn').addEventListener('click',resetTournament);window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;$('#installBtn').hidden=false;});$('#installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').hidden=true;});const updateConnection=()=>{$('#connectionBadge').textContent=navigator.onLine?'Online':'Offline • funcionando';};window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);updateConnection(); }
  function setupPwa(){if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

  renderAll();setupControls();setupPwa();
})();
