import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

const club = (id, name, group, code, primary, secondary, flag) => ({ id, name, group, code, primary, secondary, flag, kind: 'club' });
const TEAMS = [
  { id: 'portugal', name: 'Portugal', group: 'national', flag: '🇵🇹', asset: true },
  { id: 'franca', name: 'França', group: 'national', flag: '🇫🇷', asset: true },
  { id: 'inglaterra', name: 'Inglaterra', group: 'national', flag: '🏴', asset: true },
  { id: 'brasil', name: 'Brasil', group: 'national', flag: '🇧🇷', asset: true },
  { id: 'japao', name: 'Japão', group: 'national', flag: '🇯🇵', asset: true },

  club('athletico-pr', 'Athletico Paranaense', 'brazil-a', 'CAP', '#c8102e', '#111111', '🇧🇷'),
  club('atletico-mg', 'Atlético Mineiro', 'brazil-a', 'CAM', '#111111', '#ffffff', '🇧🇷'),
  club('bahia', 'Bahia', 'brazil-a', 'BAH', '#0057a8', '#d71920', '🇧🇷'),
  club('botafogo', 'Botafogo', 'brazil-a', 'BOT', '#111111', '#ffffff', '🇧🇷'),
  club('chapecoense', 'Chapecoense', 'brazil-a', 'CHA', '#148447', '#ffffff', '🇧🇷'),
  club('corinthians', 'Corinthians', 'brazil-a', 'COR', '#111111', '#ffffff', '🇧🇷'),
  club('coritiba', 'Coritiba', 'brazil-a', 'CFC', '#087a4b', '#ffffff', '🇧🇷'),
  club('cruzeiro', 'Cruzeiro', 'brazil-a', 'CRU', '#17479e', '#ffffff', '🇧🇷'),
  club('flamengo', 'Flamengo', 'brazil-a', 'FLA', '#c8102e', '#111111', '🇧🇷'),
  club('fluminense', 'Fluminense', 'brazil-a', 'FLU', '#7a0026', '#14734b', '🇧🇷'),
  club('gremio', 'Grêmio', 'brazil-a', 'GRE', '#1597d4', '#111111', '🇧🇷'),
  club('internacional', 'Internacional', 'brazil-a', 'INT', '#d71920', '#ffffff', '🇧🇷'),
  club('mirassol', 'Mirassol', 'brazil-a', 'MIR', '#f2c500', '#178447', '🇧🇷'),
  club('palmeiras', 'Palmeiras', 'brazil-a', 'PAL', '#0b6b3a', '#ffffff', '🇧🇷'),
  club('bragantino', 'Red Bull Bragantino', 'brazil-a', 'RBB', '#d71920', '#ffffff', '🇧🇷'),
  club('remo', 'Remo', 'brazil-a', 'REM', '#102c5b', '#ffffff', '🇧🇷'),
  club('santos', 'Santos', 'brazil-a', 'SAN', '#111111', '#ffffff', '🇧🇷'),
  club('sao-paulo', 'São Paulo', 'brazil-a', 'SAO', '#d71920', '#111111', '🇧🇷'),
  club('vasco', 'Vasco da Gama', 'brazil-a', 'VAS', '#111111', '#ffffff', '🇧🇷'),
  club('vitoria', 'Vitória', 'brazil-a', 'VIT', '#d71920', '#111111', '🇧🇷'),

  club('america-mg', 'América Mineiro', 'brazil-b', 'AME', '#0a8b4c', '#ffffff', '🇧🇷'),
  club('athletic-mg', 'Athletic Club', 'brazil-b', 'ATH', '#111111', '#ffffff', '🇧🇷'),
  club('atletico-go', 'Atlético Goianiense', 'brazil-b', 'AGO', '#d71920', '#111111', '🇧🇷'),
  club('avai', 'Avaí', 'brazil-b', 'AVA', '#1776bd', '#ffffff', '🇧🇷'),
  club('botafogo-sp', 'Botafogo-SP', 'brazil-b', 'BFC', '#d71920', '#111111', '🇧🇷'),
  club('ceara', 'Ceará', 'brazil-b', 'CEA', '#111111', '#ffffff', '🇧🇷'),
  club('crb', 'CRB', 'brazil-b', 'CRB', '#d71920', '#ffffff', '🇧🇷'),
  club('criciuma', 'Criciúma', 'brazil-b', 'CRI', '#f2c500', '#111111', '🇧🇷'),
  club('cuiaba', 'Cuiabá', 'brazil-b', 'CUI', '#178447', '#f2c500', '🇧🇷'),
  club('fortaleza', 'Fortaleza', 'brazil-b', 'FOR', '#17479e', '#d71920', '🇧🇷'),
  club('goias', 'Goiás', 'brazil-b', 'GOI', '#087a4b', '#ffffff', '🇧🇷'),
  club('juventude', 'Juventude', 'brazil-b', 'JUV', '#087a4b', '#ffffff', '🇧🇷'),
  club('londrina', 'Londrina', 'brazil-b', 'LEC', '#1776bd', '#ffffff', '🇧🇷'),
  club('nautico', 'Náutico', 'brazil-b', 'NAU', '#d71920', '#ffffff', '🇧🇷'),
  club('novorizontino', 'Novorizontino', 'brazil-b', 'NOV', '#f2c500', '#111111', '🇧🇷'),
  club('operario-pr', 'Operário-PR', 'brazil-b', 'OPE', '#111111', '#ffffff', '🇧🇷'),
  club('ponte-preta', 'Ponte Preta', 'brazil-b', 'PON', '#111111', '#ffffff', '🇧🇷'),
  club('sao-bernardo', 'São Bernardo', 'brazil-b', 'SBE', '#f2c500', '#111111', '🇧🇷'),
  club('sport', 'Sport Recife', 'brazil-b', 'SCR', '#d71920', '#111111', '🇧🇷'),
  club('vila-nova', 'Vila Nova', 'brazil-b', 'VIL', '#d71920', '#ffffff', '🇧🇷'),

  club('arsenal', 'Arsenal', 'europe', 'ARS', '#d71920', '#ffffff', '🏴'),
  club('chelsea', 'Chelsea', 'europe', 'CHE', '#034694', '#ffffff', '🏴'),
  club('liverpool', 'Liverpool', 'europe', 'LIV', '#c8102e', '#ffffff', '🏴'),
  club('manchester-city', 'Manchester City', 'europe', 'MCI', '#6cabdd', '#1c2c5b', '🏴'),
  club('manchester-united', 'Manchester United', 'europe', 'MUN', '#da291c', '#fbe122', '🏴'),
  club('tottenham', 'Tottenham', 'europe', 'TOT', '#132257', '#ffffff', '🏴'),
  club('barcelona', 'Barcelona', 'europe', 'BAR', '#004d98', '#a50044', '🇪🇸'),
  club('real-madrid', 'Real Madrid', 'europe', 'RMA', '#ffffff', '#5f4bb6', '🇪🇸'),
  club('atletico-madrid', 'Atlético de Madrid', 'europe', 'ATM', '#d71920', '#1b2a55', '🇪🇸'),
  club('milan', 'Milan', 'europe', 'ACM', '#d71920', '#111111', '🇮🇹'),
  club('inter-milan', 'Inter de Milão', 'europe', 'INT', '#00529f', '#111111', '🇮🇹'),
  club('juventus', 'Juventus', 'europe', 'JUV', '#111111', '#ffffff', '🇮🇹'),
  club('napoli', 'Napoli', 'europe', 'NAP', '#12a0d8', '#ffffff', '🇮🇹'),
  club('roma', 'Roma', 'europe', 'ROM', '#8e1f2f', '#f0bc42', '🇮🇹'),
  club('atalanta', 'Atalanta', 'europe', 'ATA', '#1261a0', '#111111', '🇮🇹'),
  club('psg', 'Paris Saint-Germain', 'europe', 'PSG', '#004170', '#da291c', '🇫🇷'),
  club('marseille', 'Olympique de Marseille', 'europe', 'OM', '#2faee0', '#ffffff', '🇫🇷'),
  club('monaco', 'Monaco', 'europe', 'ASM', '#d71920', '#ffffff', '🇫🇷'),
  club('bayern', 'Bayern de Munique', 'europe', 'FCB', '#dc052d', '#0066b2', '🇩🇪'),
  club('dortmund', 'Borussia Dortmund', 'europe', 'BVB', '#fdeb00', '#111111', '🇩🇪'),
  club('leverkusen', 'Bayer Leverkusen', 'europe', 'B04', '#e32219', '#111111', '🇩🇪'),
  club('benfica', 'Benfica', 'europe', 'SLB', '#e30613', '#ffffff', '🇵🇹'),
  club('porto', 'Porto', 'europe', 'FCP', '#0055a4', '#ffffff', '🇵🇹'),
  club('sporting', 'Sporting', 'europe', 'SCP', '#0b8f45', '#ffffff', '🇵🇹'),
  club('ajax', 'Ajax', 'europe', 'AJA', '#d2122e', '#ffffff', '🇳🇱'),
  club('psv', 'PSV', 'europe', 'PSV', '#e61b23', '#ffffff', '🇳🇱'),
  club('celtic', 'Celtic', 'europe', 'CEL', '#008749', '#ffffff', '🏴'),
  club('rangers', 'Rangers', 'europe', 'RAN', '#1b4da1', '#d71920', '🏴'),
  club('galatasaray', 'Galatasaray', 'europe', 'GAL', '#f6a800', '#a90432', '🇹🇷'),
  club('fenerbahce', 'Fenerbahçe', 'europe', 'FEN', '#ffed00', '#002d72', '🇹🇷')
];

const TEAM_GROUPS = [
  ['brazil-a', 'Clubes brasileiros · Série A'],
  ['europe', 'Clubes europeus · Destaques']
];
const COMPETITIONS = {
  brazil: { label: 'Campeonato brasileiro', group: 'brazil-a', flag: '🇧🇷' },
  europe: { label: 'Campeonato europeu', group: 'europe', flag: '🇪🇺' }
};
const selectableTeams = competitionType => TEAMS.filter(item => item.group === COMPETITIONS[competitionType]?.group);
const competitionLabel = type => COMPETITIONS[type]?.label || 'Campeonato';
const roomTeamLimit = room => selectableTeams(room?.competition_type).length || 20;

const config = window.NOSSO_CAMPEONATO_CONFIG || {};
const configured = /^https:\/\/.+\.supabase\.co\/?$/i.test(config.supabaseUrl || '') && /^(sb_publishable_|eyJ)/.test(config.supabasePublishableKey || '');
const app = document.querySelector('#onlineApp');
const statusBadge = document.querySelector('#onlineStatus');
const inviteCode = new URLSearchParams(location.search).get('c')?.trim().toUpperCase() || '';
let client = null;
let user = null;
let championship = null;
let snapshot = null;
let pollTimer = null;
let toastTimer = null;

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const team = id => TEAMS.find(item => item.id === id);
const crest = (teamId, className = 'mini-crest') => {
  const selected = team(teamId);
  if (!selected) return '';
  if (selected.asset) return `<img class="${className}" src="./assets/teams/${teamId}.svg" alt="Escudo de ${escapeHtml(selected.name)}" />`;
  return `<span class="club-crest ${className}" style="--club-primary:${selected.primary};--club-secondary:${selected.secondary}" role="img" aria-label="Emblema estilizado de ${escapeHtml(selected.name)}">${escapeHtml(selected.code)}</span>`;
};

function showToast(message, error = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.toggle('toast--error', error);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function setStatus(text, online = true) {
  statusBadge.textContent = text;
  statusBadge.classList.toggle('status-badge--error', !online);
}

function friendlyError(error) {
  const message = error?.message || String(error || 'Erro inesperado');
  const known = [
    ['team_taken', 'Esse time acabou de ser escolhido por outro jogador.'],
    ['already_joined', 'Você já está inscrito neste campeonato.'],
    ['championship_not_found', 'Campeonato não encontrado. Confira o código do convite.'],
    ['registration_closed', 'As inscrições deste campeonato já foram encerradas.'],
    ['owner_only', 'Somente o organizador pode realizar esta ação.'],
    ['minimum_participants', 'São necessários pelo menos dois participantes para sortear.'],
    ['invalid_score', 'Informe placares válidos entre 0 e 99.'],
    ['invalid_team', 'Escolha um clube válido.'],
    ['championship_full', 'A sala atingiu o limite de clubes disponíveis para esta competição.'],
    ['team_wrong_competition', 'Esse clube não pertence ao tipo de campeonato escolhido.'],
    ['invalid_competition', 'Escolha campeonato brasileiro ou europeu.'],
    ['rate_limit_exceeded', 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.']
  ];
  return known.find(([code]) => message.includes(code))?.[1] || message;
}

async function rpc(name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}

function teamOptions(competitionType, taken = []) {
  const competition = COMPETITIONS[competitionType];
  if (!competition) return '<option value="" selected>Selecione primeiro o tipo de campeonato</option>';
  const label = TEAM_GROUPS.find(([group]) => group === competition.group)?.[1] || competition.label;
  const options = selectableTeams(competitionType).map(item => `<option value="${item.id}" ${taken.includes(item.id) ? 'disabled' : ''}>${item.flag} ${item.name}${taken.includes(item.id) ? ' · escolhido' : ''}</option>`).join('');
  return `<option value="" selected disabled>Escolha seu clube</option><optgroup label="${label}">${options}</optgroup>`;
}

function renderSetup() {
  setStatus('Configuração pendente', false);
  app.innerHTML = `<section class="soft-card section-card setup-card"><div class="section-heading"><div class="section-heading__title"><h2>Conectar ao Supabase</h2><span class="section-kicker">Configuração inicial</span></div></div>
    <div class="setup-steps"><div class="setup-step"><strong>1</strong><div><h3>Execute o banco</h3><p>Abra o SQL Editor do Supabase e execute <code>supabase/02_online.sql</code>.</p></div></div>
    <div class="setup-step"><strong>2</strong><div><h3>Habilite o acesso anônimo</h3><p>Em Authentication → Sign In / Providers, ative Anonymous Sign-Ins.</p></div></div>
    <div class="setup-step"><strong>3</strong><div><h3>Configure a conexão</h3><p>Preencha <code>config.js</code> com a Project URL e a Publishable key. Nunca use uma chave secreta.</p></div></div></div></section>`;
}

async function ensureIdentity() {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user) return sessionData.session.user;
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

function renderLanding() {
  stopPolling();
  setStatus('Online');
  app.innerHTML = `<section class="soft-card section-card online-welcome"><div class="section-heading"><div class="section-heading__title"><h2>Como você quer começar?</h2><span class="section-kicker">Sala online</span></div></div>
    <div class="access-grid"><form id="createChampionshipForm" class="access-box"><div><span class="section-kicker">ORGANIZADOR</span><h3>Criar campeonato</h3><p>Você cria a sala, recebe o convite e controla o sorteio e os placares.</p></div>
      <label class="field"><span>Nome do campeonato</span><input id="championshipName" maxlength="60" placeholder="Ex.: Copa dos Amigos" required /></label>
      <label class="field"><span>Seu nome</span><input id="ownerName" maxlength="32" placeholder="Ex.: Rafael" required /></label>
      <label class="field"><span>Tipo de campeonato</span><select id="competitionType" required><option value="" selected disabled>Escolha a competição</option><option value="brazil">🇧🇷 Campeonato brasileiro</option><option value="europe">🇪🇺 Campeonato europeu</option></select><small class="field-hint">Todos os participantes jogarão com clubes da categoria escolhida.</small></label>
      <label class="field"><span>Seu clube</span><select id="ownerTeam" required disabled>${teamOptions('')}</select><small id="teamCatalogHint" class="field-hint">Escolha o tipo de campeonato para ver os clubes.</small></label>
      <button class="btn btn--primary" type="submit">Criar sala</button></form>
    <form id="openInviteForm" class="access-box access-box--muted"><div><span class="section-kicker">JOGADOR</span><h3>Entrar com convite</h3><p>Use o código enviado pelo organizador para encontrar o campeonato.</p></div>
      <label class="field"><span>Código do convite</span><input id="inviteCodeInput" class="code-input" maxlength="8" placeholder="ABC123" autocomplete="off" required /></label>
      <button class="btn btn--secondary" type="submit">Localizar campeonato</button></form></div></section>`;
  document.querySelector('#createChampionshipForm').addEventListener('submit', createChampionship);
  document.querySelector('#competitionType').addEventListener('change', event => {
    const type = event.currentTarget.value;
    const select = document.querySelector('#ownerTeam');
    select.innerHTML = teamOptions(type);
    select.disabled = false;
    document.querySelector('#teamCatalogHint').textContent = type === 'brazil' ? '20 clubes da Série A disponíveis.' : '30 clubes europeus em destaque disponíveis.';
  });
  document.querySelector('#openInviteForm').addEventListener('submit', event => {
    event.preventDefault();
    const code = document.querySelector('#inviteCodeInput').value.trim().toUpperCase();
    if (code) location.href = `${location.pathname}?c=${encodeURIComponent(code)}`;
  });
}

async function createChampionship(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const name = document.querySelector('#championshipName').value.trim();
    const playerName = document.querySelector('#ownerName').value.trim();
    const competitionType = document.querySelector('#competitionType').value;
    const teamId = document.querySelector('#ownerTeam').value;
    if (name.length < 3 || playerName.length < 2) throw new Error('Preencha o nome do campeonato e o seu nome.');
    if (!COMPETITIONS[competitionType]) throw new Error('Escolha o tipo de campeonato.');
    if (!selectableTeams(competitionType).some(item => item.id === teamId)) throw new Error('Escolha um clube válido para a competição.');
    const created = await rpc('nc_create_championship_secure', { p_name: name, p_competition_type: competitionType });
    const room = Array.isArray(created) ? created[0] : created;
    await rpc('nc_join_championship_secure', { p_invite_code: room.invite_code, p_display_name: playerName, p_team_id: teamId });
    location.href = `${location.pathname}?c=${encodeURIComponent(room.invite_code)}`;
  } catch (error) {
    showToast(friendlyError(error), true);
    button.disabled = false;
  }
}

async function findChampionship(code) {
  const data = await rpc('nc_find_championship_secure', { p_invite_code: code });
  championship = Array.isArray(data) ? data[0] : data;
  if (!championship?.id) throw new Error('championship_not_found');
  const memberSnapshot = await rpc('nc_snapshot', { p_championship_id: championship.id });
  if (memberSnapshot) {
    snapshot = memberSnapshot;
    renderRoom();
    startPolling();
  } else {
    renderJoin();
  }
}

function renderJoin() {
  setStatus('Convite encontrado');
  const taken = championship.taken_team_ids || [];
  app.innerHTML = `<section class="soft-card section-card join-card"><div class="room-heading"><div><span class="section-kicker">CONVITE PARA</span><h2>${escapeHtml(championship.name)}</h2><p>${escapeHtml(competitionLabel(championship.competition_type))} · ${championship.participant_count || 0} participante(s) na sala</p></div><span class="invite-code">${escapeHtml(championship.invite_code)}</span></div>
    <form id="joinChampionshipForm" class="join-form"><label class="field"><span>Seu nome</span><input id="joinName" maxlength="32" placeholder="Como seus amigos te chamam?" required /></label>
      <label class="field"><span>Escolha seu clube · ${escapeHtml(competitionLabel(championship.competition_type))}</span><select id="joinTeam" required>${teamOptions(championship.competition_type, taken)}</select><small class="field-hint">As opções já escolhidas aparecem bloqueadas.</small></label><button class="btn btn--primary" type="submit">Confirmar minha inscrição</button></form>
    <p class="access-note">Sua identidade fica salva neste navegador. Não é necessário criar senha.</p></section>`;
  document.querySelector('#joinChampionshipForm').addEventListener('submit', joinChampionship);
}

async function joinChampionship(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const name = document.querySelector('#joinName').value.trim();
    const teamId = document.querySelector('#joinTeam').value;
    if (name.length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');
    if (!selectableTeams(championship.competition_type).some(item => item.id === teamId)) throw new Error('Escolha um clube válido para a competição.');
    await rpc('nc_join_championship_secure', { p_invite_code: championship.invite_code, p_display_name: name, p_team_id: teamId });
    await refreshSnapshot(true);
    startPolling();
    showToast('Inscrição confirmada! Bem-vindo ao campeonato.');
  } catch (error) {
    showToast(friendlyError(error), true);
    button.disabled = false;
  }
}

function getStandings() {
  const participants = snapshot.participants || [];
  const stats = new Map(participants.map((participant, seed) => [participant.id, { ...participant, seed, j:0, v:0, e:0, d:0, gp:0, gc:0, sg:0, pts:0 }]));
  (snapshot.matches || []).filter(match => match.phase === 'league' && match.status === 'finished').forEach(match => {
    const home = stats.get(match.home_participant_id), away = stats.get(match.away_participant_id);
    if (!home || !away) return;
    home.j++; away.j++; home.gp += match.home_score; home.gc += match.away_score; away.gp += match.away_score; away.gc += match.home_score;
    if (match.home_score > match.away_score) { home.v++; away.d++; home.pts += 3; }
    else if (match.away_score > match.home_score) { away.v++; home.d++; away.pts += 3; }
    else { home.e++; away.e++; home.pts++; away.pts++; }
  });
  stats.forEach(item => { item.sg = item.gp - item.gc; });
  return [...stats.values()].sort((a,b) => b.pts-a.pts || b.sg-a.sg || b.gp-a.gp || a.seed-b.seed);
}

function participant(id) {
  return (snapshot.participants || []).find(item => item.id === id);
}

function renderRoom() {
  const room = snapshot.championship;
  championship = room;
  const participants = snapshot.participants || [];
  const matches = snapshot.matches || [];
  const isOwner = room.owner_id === user.id;
  const waiting = room.status === 'registration';
  const inviteUrl = `${location.origin}${location.pathname}?c=${encodeURIComponent(room.invite_code)}`;
  setStatus(waiting ? 'Inscrições abertas' : 'Campeonato em andamento');
  app.innerHTML = `<section class="soft-card section-card room-overview"><div class="room-heading"><div><span class="section-kicker">${isOwner ? 'VOCÊ É O ORGANIZADOR' : 'VOCÊ ESTÁ INSCRITO'}</span><h2>${escapeHtml(room.name)}</h2><p>${escapeHtml(competitionLabel(room.competition_type))} · ${participants.length} participante(s) · ${waiting ? 'aguardando sorteio' : `${matches.length} partidas`}</p></div><span class="invite-code">${escapeHtml(room.invite_code)}</span></div>
    <div class="invite-bar"><div><span>Convide seus amigos</span><strong>${escapeHtml(inviteUrl)}</strong></div><button id="copyInviteBtn" class="btn btn--secondary" type="button">Copiar convite</button></div>
    ${isOwner && waiting ? `<button id="drawBtn" class="btn btn--primary draw-button" type="button" ${participants.length < 2 ? 'disabled' : ''}>Sortear ${participants.length >= 2 ? `${participants.length * (participants.length - 1) / 2} confrontos` : 'confrontos'}</button>` : ''}</section>
    <section class="soft-card section-card"><div class="section-heading"><div class="section-heading__title"><h2>Participantes</h2><span class="section-kicker">Sala</span></div><span class="section-meta">${participants.length} de ${roomTeamLimit(room)} vagas</span></div>
      <div class="players-grid">${participants.map(item => `<article class="player-card ${item.user_id === user.id ? 'player-card--current' : ''}">${item.user_id === user.id ? '<span class="you-badge">VOCÊ</span>' : ''}<div class="player-card__crest-wrap">${crest(item.team_id,'player-card__crest')}</div><strong>${escapeHtml(item.display_name)}</strong><span>${escapeHtml(team(item.team_id)?.name)}</span></article>`).join('')}</div></section>
    ${waiting ? waitingMarkup(isOwner) : competitionMarkup(isOwner)}`;
  document.querySelector('#copyInviteBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(inviteUrl); showToast('Link de convite copiado.'); } catch { showToast(`Código: ${room.invite_code}`); }
  });
  document.querySelector('#drawBtn')?.addEventListener('click', drawChampionship);
  document.querySelectorAll('[data-save-match]').forEach(button => button.addEventListener('click', () => saveResult(button.dataset.saveMatch)));
}

function waitingMarkup(isOwner) {
  return `<section class="soft-card section-card"><div class="empty-state"><strong>${isOwner ? 'Compartilhe o convite e aguarde seus amigos.' : 'Aguardando o organizador realizar o sorteio.'}</strong><br />A tabela será criada automaticamente de acordo com o número de inscritos.</div></section>`;
}

function competitionMarkup(isOwner) {
  const standings = getStandings();
  const matches = snapshot.matches || [];
  const done = matches.filter(match => match.status === 'finished').length;
  return `<section class="soft-card section-card standings-section"><div class="section-heading"><div class="section-heading__title"><h2>Classificação</h2><span class="section-kicker">Ao vivo</span></div><span class="section-meta">${done} de ${matches.length} jogos</span></div><div class="table-wrap"><table class="standings-table"><thead><tr><th>#</th><th>Jogador</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead><tbody>${standings.map((item,index) => `<tr class="${index===0?'leader':''}"><td class="rank-cell">${index+1}º</td><td><div class="player-cell">${crest(item.team_id)}<span>${escapeHtml(item.display_name)}</span></div></td><td>${item.j}</td><td>${item.v}</td><td>${item.e}</td><td>${item.d}</td><td>${item.gp}</td><td>${item.gc}</td><td>${item.sg>0?'+':''}${item.sg}</td><td class="points-cell">${item.pts}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="soft-card section-card"><div class="section-heading"><div class="section-heading__title"><h2>Confrontos</h2><span class="section-kicker">Agenda</span></div><span class="section-meta">Atualização automática</span></div><div class="matches-list">${matches.map(match => matchMarkup(match,isOwner)).join('')}</div></section>`;
}

function matchMarkup(match, isOwner) {
  const home = participant(match.home_participant_id), away = participant(match.away_participant_id), finished = match.status === 'finished';
  return `<article class="match-row online-match"><div class="match-number">R${match.round_number} · J${match.match_order}</div><div><div class="match-row__teams"><span class="match-team-name">${crest(home.team_id,'match-mini-crest')}<span>${escapeHtml(home.display_name)}</span></span><span class="x">×</span><span class="match-team-name">${crest(away.team_id,'match-mini-crest')}<span>${escapeHtml(away.display_name)}</span></span></div><div class="match-status ${finished?'done':''}">${finished?'✓ Concluído':'Aguardando resultado'}</div></div>
    ${isOwner ? `<div class="inline-score"><input data-home-score="${match.id}" inputmode="numeric" min="0" max="99" value="${finished?match.home_score:''}" aria-label="Placar de ${escapeHtml(home.display_name)}" /><span>×</span><input data-away-score="${match.id}" inputmode="numeric" min="0" max="99" value="${finished?match.away_score:''}" aria-label="Placar de ${escapeHtml(away.display_name)}" /><button class="icon-btn" type="button" data-save-match="${match.id}">Salvar</button></div>` : `<div class="match-score"><strong>${finished?`${match.home_score} × ${match.away_score}`:'— × —'}</strong></div>`}</article>`;
}

async function drawChampionship(event) {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await rpc('nc_draw_championship', { p_championship_id: championship.id });
    await refreshSnapshot(true);
    showToast('Sorteio concluído! A tabela está pronta.');
  } catch (error) {
    showToast(friendlyError(error), true);
    button.disabled = false;
  }
}

async function saveResult(matchId) {
  const home = Number(document.querySelector(`[data-home-score="${matchId}"]`).value);
  const away = Number(document.querySelector(`[data-away-score="${matchId}"]`).value);
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 99 || away > 99) return showToast('Informe os dois placares entre 0 e 99.', true);
  try {
    await rpc('nc_save_result', { p_match_id: matchId, p_home_score: home, p_away_score: away });
    await refreshSnapshot(true);
    showToast('Resultado salvo.');
  } catch (error) { showToast(friendlyError(error), true); }
}

async function refreshSnapshot(render = false) {
  const data = await rpc('nc_snapshot', { p_championship_id: championship.id });
  if (!data) throw new Error('Você não tem acesso a este campeonato.');
  const changed = JSON.stringify(data) !== JSON.stringify(snapshot);
  snapshot = data;
  if (render || changed) renderRoom();
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => refreshSnapshot().catch(() => setStatus('Reconectando', false)), 8000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function init() {
  if (!configured) return renderSetup();
  try {
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    user = await ensureIdentity();
    setStatus('Online');
    if (inviteCode) await findChampionship(inviteCode); else renderLanding();
  } catch (error) {
    setStatus('Falha na conexão', false);
    app.innerHTML = `<section class="soft-card section-card"><div class="empty-state"><strong>Não foi possível conectar ao campeonato.</strong><br />${escapeHtml(friendlyError(error))}</div></section>`;
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}

window.addEventListener('online', () => { setStatus('Online'); if (championship?.id) refreshSnapshot().catch(() => {}); });
window.addEventListener('offline', () => setStatus('Sem conexão', false));
window.addEventListener('beforeunload', stopPolling);
setupPwa();
init();
