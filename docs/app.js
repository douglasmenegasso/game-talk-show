(function () {
'use strict';
const cfg = window.GAME_TALK_SHOW_CONFIG || {};
const configured = Boolean(
  cfg.supabaseUrl && cfg.supabasePublishableKey &&
  !String(cfg.supabaseUrl).includes('COLE') &&
  !String(cfg.supabasePublishableKey).includes('COLE')
);
const params = new URLSearchParams(window.location.search);
const forceDemo = params.get('demo') === '1';
let client = null;
if (configured && window.supabase && window.supabase.createClient) {
  client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
}

const state = {
  user: null, profile: null, role: null,
  demo: !configured || forceDemo, demoRole: null,
  tab: 'dashboard',
  playerState: { points_balance: 0, kitchen_level: 2, last_rating: null },
  players: [], rewards: [], missions: [], orders: [], equipment: [],
  summary: null, selectedMissionId: null, recipe: null, exportJson: '',
  comments: [], lastRecipe: null
};

const demoData = {
  playerState: { points_balance: 15, kitchen_level: 2, last_rating: null },
  equipment: [
    { equipment_code: 'batedeira', mode: 'temporary', status: 'active', acquired_at: '2026-11-21T10:00:00-03:00' }
  ],
  rewards: [
    { id: 'r1', code: 'ingrediente-especial', name: 'Ingrediente Especial', description: 'Escolher 1 dos 5 itens da última receita.', base_price: 15, reward_type: 'ingredient', active: true },
    { id: 'r2', code: 'sous-chef', name: 'Sous-Chef por um dia', description: 'Comandar uma receita com os adultos como ajudantes.', base_price: 30, reward_type: 'experience', active: true },
    { id: 'r3', code: 'utensilio-novo', name: 'Utensílio Novo', description: 'Um utensílio simples e divertido para a cozinha.', base_price: 70, reward_type: 'equipment', active: true }
  ],
  missions: [
    { id: 'm1', title: 'Bolo de chocolate com calda', kind: 'recipe', points_delta: 15, rating: null, occurred_at: '2026-11-21T14:30:00-03:00', feedback: 'Massa fofinha! Lembre-se de peneirar a farinha.' }
  ],
  orders: [
    { id: 'o1', reward_id: 'r3', reward_name: 'Utensílio Novo', requested_price: 70, status: 'pending', mode: 'temporary', created_at: '2026-11-21T15:00:00-03:00' },
    { id: 'o2', reward_id: 'r1', reward_name: 'Ingrediente Especial', requested_price: 15, status: 'approved', mode: 'permanent', created_at: '2026-11-20T10:00:00-03:00' }
  ],
  players: [{ player_id: 'demo-klara', display_name: 'Klara', points_balance: 15, kitchen_level: 2, last_rating: null }],
  summary: { pending_orders: [], recent_missions: [], active_equipment: [] },
  recipe: {
    recipe: { title: 'Bolo de chocolate com calda', yield: '1 bolo médio', steps: [{ order: 1, text: 'Adulto preaquece o forno a 180 °C.' }, { order: 2, text: 'Misturar ovos, açúcar, leite e óleo.' }] },
    tips: ['Peneire a farinha para não empelotar.', 'Confirme se é achocolatado ou cacau.'],
    ingredients: [{ item: 'ovos', quantity: '2', unit: 'unidade' }, { item: 'açúcar', quantity: '1', unit: 'xic' }],
    products: [{ name: 'achocolatado', brand: null, note: 'Marca não informada.' }],
    equipment: ['tigela grande', 'fouet', 'forno']
  },
  comments: [
    { id: 'c1', email: 'tia@familia.com', message: 'Que lindo o projeto da Klara!', created_at: '2026-11-21T16:00:00-03:00' }
  ],
  lastRecipe: { title: 'Bolo de chocolate com calda', ingredients: ['ovos', 'açúcar', 'leite', 'óleo', 'achocolatado'] }
};

const LOGIN_FLOATS = [
  { e: '🍅', x: '5%', y: '15%', s: '34px', d: '6s', delay: '0s' },
  { e: '🥄', x: '15%', y: '70%', s: '30px', d: '7s', delay: '-2s' },
  { e: '🍳', x: '85%', y: '20%', s: '38px', d: '6.5s', delay: '-1s' },
  { e: '🥣', x: '90%', y: '65%', s: '32px', d: '8s', delay: '-3s' },
  { e: '✨', x: '30%', y: '30%', s: '22px', d: '5s', delay: '-1s' },
  { e: '✨', x: '70%', y: '45%', s: '20px', d: '5.5s', delay: '-2s' }
];

const EQUIP_META = {
  'batedeira': { icon: '⚙️', name: 'Batedeira' },
  'liquidificador': { icon: '🥤', name: 'Liquidificador' },
  'micro-ondas': { icon: '⏲️', name: 'Micro-ondas' },
  'airfryer': { icon: '🍟', name: 'Airfryer' }
};

const $ = (s) => document.querySelector(s);
const view = $('#view');
const toastEl = $('#toast');
const userBadge = $('#user-badge');
const signoutBtn = $('#signout-btn');

function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function toast(msg, type) {
  toastEl.textContent = msg; toastEl.className = 'toast ' + (type || '');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.add('hidden'), 3500);
}
function fmtDate(v) {
  if (!v) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); }
  catch (_) { return String(v); }
}
function kitchenInfo(level) {
  if (level === 1) return { name: 'Cozinha Master', emoji: '✨' };
  if (level === 3) return { name: 'Cozinha de Campanha', emoji: '🛠️' };
  return { name: 'Cozinha Padrão', emoji: '🍳' };
}
function kitchenBase(level) {
  if (level === 1) return { wall: ['🪴', '🖼️', '✨'], items: [{ icon: '🍳', name: 'Fogão 6 bocas' }, { icon: '🧊', name: 'Geladeira inox' }, { icon: '🥣', name: 'Tigelas' }, { icon: '🥄', name: 'Colher de pau' }] };
  if (level === 3) return { wall: ['🕸️', '🩹'], items: [{ icon: '🍳', name: 'Fogão 2 bocas' }, { icon: '🥣', name: '1 tigela' }, { icon: '🥄', name: '1 colher' }] };
  return { wall: ['🕐', '🧂'], items: [{ icon: '🍳', name: 'Fogão 4 bocas' }, { icon: '🧊', name: 'Geladeira' }, { icon: '🥣', name: 'Tigela' }, { icon: '🥄', name: 'Colher de pau' }] };
}
function renderKitchenScene(level, equipment) {
  const base = kitchenBase(level);
  const wall = base.wall.map(w => '<span>' + w + '</span>').join('');
  const items = base.items.map(i => '<div class="utensil"><span class="icon">' + i.icon + '</span><span class="name">' + esc(i.name) + '</span></div>').join('');
  const extra = (equipment || []).map(e => {
    const meta = EQUIP_META[e.equipment_code] || { icon: '🔌', name: e.equipment_code };
    let tag = '', cls = '';
    if (level === 3) { tag = '<span class="tag locked">Bloqueado</span>'; cls = ' locked'; }
    else if (e.mode === 'temporary') { tag = '<span class="tag rent">Alugado</span>'; }
    else if (level === 1) { tag = '<span class="tag own">Seu!</span>'; }
    else { tag = '<span class="tag locked">Guardado</span>'; cls = ' locked'; }
    return '<div class="utensil equip' + cls + '"><span class="icon">' + meta.icon + '</span><span class="name">' + esc(meta.name) + '</span>' + tag + '</div>';
  }).join('');
  return '<div class="kitchen-scene"><div class="kitchen-wall">' + wall + '</div><div class="kitchen-counter">' + items + extra + '</div></div>';
}
function setKitchen(level) {
  document.body.classList.remove('kitchen-1', 'kitchen-2', 'kitchen-3');
  document.body.classList.add('kitchen-' + (level || 2));
}
function isDemoActive() { return state.demo && state.demoRole; }
function activeRole() { return isDemoActive() ? state.demoRole : state.role; }

function render() {
  const role = activeRole();
  document.body.classList.toggle('login-mode', !role);
  if (!role) { renderLogin(); return; }
  userBadge.classList.remove('hidden'); signoutBtn.classList.remove('hidden');
  const name = isDemoActive() ? (role === 'admin' ? 'Douglas • demo' : 'Klara • demo') : (state.profile?.display_name || state.user?.email || 'Usuário');
  userBadge.textContent = name + (role === 'admin' ? ' • admin' : ' • jogador');
  renderApp();
}

function renderLogin() {
  userBadge.classList.add('hidden'); signoutBtn.classList.add('hidden'); setKitchen(2);
  const floats = LOGIN_FLOATS.map(f => '<span class="float-item" style="--x:' + f.x + ';--y:' + f.y + ';--s:' + f.s + ';--d:' + f.d + ';--delay:' + f.delay + '">' + f.e + '</span>').join('');
  const demoButtons = state.demo ? '<div class="row mt"><button class="btn secondary" data-action="demo-login" data-role="player">Ver como Klara</button><button class="btn secondary" data-action="demo-login" data-role="admin">Ver como Douglas</button></div>' : '';
  view.innerHTML = '<div class="login-float">' + floats + '</div><div class="login-wrap"><div class="card login-card">' +
    '<img class="login-logo-img" src="assets/logo-klara.png" alt="Logo" onerror="this.style.display=\'none\'">' +
    '<h2 class="login-title">Game Talk Show</h2><p class="login-sub">Cozinhando com a Klara • Chefe Triix</p>' +
    '<form id="login-form"><div class="field"><label>E-mail</label><input class="input" id="email" type="email" required /></div>' +
    '<div class="field"><label>Senha</label><input class="input" id="password" type="password" required /></div>' +
    '<button class="btn" type="submit" style="width:100%">Entrar</button></form>' + demoButtons + '</div></div>';
  const form = $('#login-form'); if (form) form.addEventListener('submit', onLogin);
}

async function onLogin(e) {
  e.preventDefault();
  if (!client) { toast('Supabase não configurado.', 'error'); return; }
  try {
    const { error } = await client.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
    if (error) throw error; await bootRealSession();
  } catch (err) { toast(err.message || 'Falha no login.', 'error'); }
}

function tabsFor(role) {
  if (role === 'admin') return [['dashboard', 'Visão geral'], ['import', 'Importar'], ['orders', 'Pedidos'], ['adjust', 'Ajustar'], ['export', 'Exportar']];
  return [['dashboard', 'Cozinha'], ['missions', 'Missões'], ['store', 'Loja'], ['orders', 'Meus Pedidos'], ['comments', 'Comentários']];
}

function renderApp() {
  const role = activeRole();
  const tabs = tabsFor(role);
  if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];
  const tabsHtml = tabs.map(([id, label]) => '<button class="tab ' + (state.tab === id ? 'active' : '') + '" data-action="tab" data-tab="' + id + '">' + esc(label) + '</button>').join('');
  view.innerHTML = '<div class="tabs">' + tabsHtml + '</div>' + (role === 'admin' ? renderAdmin() : renderPlayer());
}

function renderPlayer() {
  if (state.tab === 'missions') return renderMissions();
  if (state.tab === 'store') return renderStore();
  if (state.tab === 'orders') return renderPlayerOrders();
  if (state.tab === 'comments') return renderComments();
  return renderPlayerDashboard();
}

function renderPlayerDashboard() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const kitchen = kitchenInfo(ps.kitchen_level); setKitchen(ps.kitchen_level);
  const recent = (state.missions || []).slice(0, 3).map(m =>
    '<div class="list-item"><div><div class="title">' + esc(m.title) + '</div><div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div></div><div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' + (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span></div></div>'
  ).join('');
  const suggestions = renderChefSuggestions();
  return '<div class="grid cols-3"><div class="card stat"><span class="label">Saldo</span><span class="value">' + esc(ps.points_balance) + ' pts</span></div>' +
    '<div class="card stat"><span class="label">Cozinha</span><span class="value">' + kitchen.emoji + ' ' + esc(kitchen.name) + '</span><span class="hint">Nível ' + esc(ps.kitchen_level) + '</span></div>' +
    '<div class="card stat"><span class="label">Próxima recompensa</span><span class="value" style="font-size:20px">Ingrediente Especial</span><span class="hint">15 pontos</span></div></div>' +
    '<div class="card"><h3 style="margin:0">Sua cozinha</h3>' + renderKitchenScene(ps.kitchen_level, state.equipment) + '</div>' +
    suggestions +
    '<div class="card"><h3>Últimas missões</h3><div class="list">' + (recent || '<p class="muted">Nenhuma missão ainda.</p>') + '</div></div>';
}

function renderChefSuggestions() {
  const suggestions = [
    'Que tal tentar um bolo de cenoura com cobertura de chocolate? Você já sabe fazer massa de bolo!',
    'Panquecas doces são ótimas para o café da manhã e usam ingredientes simples.',
    'Brigadeiro é fácil e você já conhece o processo de mexer no fogo (com adulto).'
  ];
  return '<div class="chef-feedback"><h4>👨‍🍳 Sugestões do Chefe Triix</h4><ul>' + 
    suggestions.map(s => '<li>' + esc(s) + '</li>').join('') + 
    '</ul><p class="small muted mt"><strong>Bônus:</strong> Seguir uma sugestão de prato novo garante +3 pontos na avaliação final!</p></div>';
}

function renderMissions() {
  const items = (state.missions || []).map(m => {
    const isOpen = state.selectedMissionId === m.id;
    const recipeHtml = isOpen && state.recipe ? renderRecipe(state.recipe, false) : '';
    return '<div class="list-item">' +
      '<div><div class="title">' + esc(m.title) + '</div>' +
      '<div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div>' +
      (m.feedback ? '<div class="meta">' + esc(m.feedback) + '</div>' : '') +
      '</div>' +
      '<div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' +
      (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span>' +
      '<div class="recipe-toggle" data-action="toggle-recipe" data-id="' + esc(m.id) + '">' +
      (isOpen ? 'Recolher receita ▲' : 'Ver receita ▼') + '</div></div>' +
      (recipeHtml ? '<div class="recipe-details open">' + recipeHtml + '</div>' : '') +
      '</div>';
  }).join('');
  return '<div class="card"><h3>Histórico de missões</h3><div class="list">' +
    (items || '<p class="muted">Nenhuma missão registrada.</p>') + '</div></div>';
}

function renderRecipe(r, hideGuidance) {
  const recipe = r.recipe || {};
  const tips = r.tips || [];
  const ingredients = r.ingredients || [];
  const equipment = r.equipment || [];
  return '<div class="chef-feedback"><h4>👨‍🍳 Feedback e Dicas do Chefe Triix</h4><ul>' + (tips.length ? tips.map(t => '<li>' + esc(t) + '</li>').join('') : '<li>Siga os passos com calma e peça ajuda ao adulto para o forno!</li>') + '</ul>' +
    '<p class="small muted mt"><strong>Bônus:</strong> Seguir uma sugestão de prato novo garante +3 pontos na avaliação final!</p></div>' +
    '<div class="mt"><h4>Ingredientes</h4><ul>' + ingredients.map(i => '<li>' + esc(i.quantity) + ' ' + esc(i.unit) + ' de ' + esc(i.item) + '</li>').join('') + '</ul></div>' +
    (equipment.length ? '<div class="mt"><h4>Utensílios</h4><ul>' + equipment.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '');
}

function renderStore() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const rewards = (state.rewards || []).filter(r => r.active);
  if (ps.kitchen_level === 3) {
    return '<div class="card"><h3>Loja</h3><p class="muted">Na Cozinha de Campanha (Nível 3), a compra e o aluguel de utensílios estão temporariamente suspensos até a reforma!</p></div>';
  }
  const cards = rewards.map(r => {
    const canAfford = ps.points_balance >= r.base_price;
    const isEquip = r.reward_type === 'equipment';
    const modeSelect = isEquip ? '<div class="field"><label>Modo</label><select id="mode-' + esc(r.code) + '"><option value="temporary">Temporário (Aluguel)</option><option value="permanent">Permanente (Compra)</option></select></div>' : '';
    const btnDisabled = !canAfford ? 'disabled' : '';
    const btnText = canAfford ? 'Pedir recompensa' : 'Pontos insuficientes';
    let ingredientSelect = '';
    if (r.code === 'ingrediente-especial') {
      const lastIngredients = state.lastRecipe?.ingredients || ['ovos', 'açúcar', 'leite', 'óleo', 'achocolatado'];
      ingredientSelect = '<div class="field"><label>Escolha 1 ingrediente da última receita</label><select id="ingredient-' + esc(r.code) + '">' + 
        lastIngredients.slice(0, 5).map(ing => '<option value="' + esc(ing) + '">' + esc(ing) + '</option>').join('') + '</select></div>';
    }
    return '<div class="card reward-card"><h3 style="margin:0">' + esc(r.name) + '</h3><div class="reward-price">' + esc(r.base_price) + ' pts</div><div class="reward-desc">' + esc(r.description || '') + '</div>' + ingredientSelect + modeSelect + 
    '<button class="btn" data-action="request-reward" data-code="' + esc(r.code) + '" data-type="' + esc(r.reward_type) + '" ' + btnDisabled + '>' + btnText + '</button></div>';
  }).join('');
  return '<div class="notice ok">Pedidos ficam pendentes até o Douglas aprovar. Pontos só são descontados na aprovação.</div><div class="grid cols-2">' + cards + '</div>';
}

function renderPlayerOrders() {
  const orders = state.orders || [];
  const pending = orders.filter(o => o.status === 'pending');
  const approved = orders.filter(o => o.status === 'approved');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const equipmentHistory = state.equipment || [];
  const renderList = (list) => list.length ? list.map(o => 
    '<div class="list-item"><div><div class="title">' + esc(o.reward_name || 'Item') + '</div><div class="meta">' + esc(fmtDate(o.created_at)) + ' • ' + esc(o.requested_price) + ' pts' + (o.mode ? ' • ' + esc(o.mode) : '') + '</div></div><div class="right"><span class="pill ' + (o.status === 'approved' ? 'good' : o.status === 'cancelled' ? 'bad' : 'warn') + '">' + esc(o.status === 'approved' ? 'Aprovado' : o.status === 'cancelled' ? 'Cancelado' : 'Aguardando') + '</span></div></div>'
  ).join('') : '<p class="muted small">Nenhum registro nesta categoria.</p>';
  const equipList = equipmentHistory.length ? equipmentHistory.map(e => {
    const meta = EQUIP_META[e.equipment_code] || { name: e.equipment_code };
    return '<div class="list-item"><div><div class="title">' + esc(meta.name) + '</div><div class="meta">Adquirido em: ' + esc(fmtDate(e.acquired_at)) + ' • Modo: ' + esc(e.mode) + '</div></div><div class="right"><span class="pill info">Ativo</span></div></div>';
  }).join('') : '<p class="muted small">Nenhum utensílio adquirido ainda.</p>';
  return '<div class="card"><h3>Meus Pedidos</h3>' +
    '<div class="order-category"><h4>⏳ Aguardando Aprovação</h4><div class="list">' + renderList(pending) + '</div></div>' +
    '<div class="order-category"><h4>✅ Aprovados</h4><div class="list">' + renderList(approved) + '</div></div>' +
    '<div class="order-category"><h4>❌ Cancelados</h4><div class="list">' + renderList(cancelled) + '</div></div>' +
    '<div class="order-category"><h4>🍳 Meus Utensílios</h4><div class="list">' + equipList + '</div></div></div>';
}

function renderComments() {
  const comments = state.comments || demoData.comments;
  const commentList = comments.map(c => 
    '<div class="comment-item"><span class="author">' + esc(c.email) + '</span><span class="date">' + esc(fmtDate(c.created_at)) + '</span><div class="text">' + esc(c.message) + '</div></div>'
  ).join('');
  return '<div class="card"><h3>Comentários de Visitantes</h3><p class="muted small">Deixe seu recado para a Chef Klara!</p>' +
    '<form class="comment-form" id="comment-form"><div class="field"><label>Seu e-mail</label><input class="input" id="comment-email" type="email" required /></div>' +
    '<div class="field"><label>Mensagem</label><textarea class="input" id="comment-message" rows="3" required></textarea></div>' +
    '<button class="btn" type="submit">Enviar comentário</button></form>' +
    '<div class="comment-list">' + (commentList || '<p class="muted">Nenhum comentário ainda. Seja o primeiro!</p>') + '</div></div>';
}

function renderAdmin() {
  if (state.tab === 'import') return renderAdminImport();
  if (state.tab === 'orders') return renderAdminOrders();
  if (state.tab === 'adjust') return renderAdminAdjust();
  if (state.tab === 'export') return renderAdminExport();
  return renderAdminDashboard();
}

function playerNameById(id) {
  const p = (state.players || []).find(x => x.player_id === id);
  return p ? p.display_name : id;
}

function renderAdminDashboard() {
  const players = state.players || [];
  const summary = state.summary || {};
  const pending = summary.pending_orders || [];
  const recent = summary.recent_missions || [];
  const playerRows = players.map(p =>
    '<tr><td>' + esc(p.display_name) + '</td><td>' + esc(p.points_balance) +
    '</td><td>' + esc(p.kitchen_level) + '</td><td>' +
    (p.last_rating == null ? '—' : esc(p.last_rating)) + '</td></tr>'
  ).join('');
  const pendingRows = pending.map(o =>
    '<div class="list-item"><div><div class="title">' + esc(o.reward_name) +
    '</div><div class="meta">' + esc(playerNameById(o.player_id)) +
    ' • ' + esc(o.requested_price) + ' pts' +
    (o.mode ? ' • ' + esc(o.mode) : '') + '</div></div><div class="right">' +
    '<span class="pill warn">Pendente</span></div></div>'
  ).join('');
  const recentRows = recent.map(m =>
    '<div class="list-item"><div><div class="title">' + esc(m.title) +
    '</div><div class="meta">' + esc(playerNameById(m.player_id)) +
    ' • ' + esc(fmtDate(m.occurred_at)) + '</div></div><div class="right"><span class="pill ' +
    (m.points_delta >= 0 ? 'good' : 'bad') + '">' +
    (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span></div></div>'
  ).join('');
  return '<div class="grid cols-3">' +
    '<div class="card stat"><span class="label">Jogadores</span><span class="value">' + esc(players.length) + '</span></div>' +
    '<div class="card stat"><span class="label">Pedidos pendentes</span><span class="value">' + esc(pending.length) + '</span></div>' +
    '<div class="card stat"><span class="label">Missões recentes</span><span class="value">' + esc(recent.length) + '</span></div>' +
    '</div>' +
    '<div class="card"><div class="row"><h3 style="margin:0">Jogadores</h3><span class="space"></span>' +
    '<button class="btn small secondary" data-action="admin-refresh">Atualizar</button></div>' +
    '<table class="table mt"><thead><tr><th>Nome</th><th>Pontos</th><th>Cozinha</th><th>Última nota</th></tr></thead><tbody>' +
    (playerRows || '<tr><td colspan="4" class="muted">Nenhum jogador.</td></tr>') +
    '</tbody></table></div>' +
    '<div class="grid cols-2">' +
    '<div class="card"><h3>Pedidos pendentes</h3><div class="list">' +
    (pendingRows || '<p class="muted">Nenhum pedido pendente.</p>') + '</div></div>' +
    '<div class="card"><h3>Missões recentes</h3><div class="list">' +
    (recentRows || '<p class="muted">Nenhuma missão recente.</p>') + '</div></div></div>';
}

function exampleMissionPayload() {
  return {
    mission: { kind: 'recipe', title: 'Nova receita', occurred_at: new Date().toISOString(), feedback: 'Feedback da Klara e do Douglas.', rating: null, points_delta: 20, kitchen_level_after: 2, points_breakdown: [{ label: 'Execução da receita', points: 10 }, { label: 'Limpeza e organização', points: 5 }, { label: 'Feedback', points: 5 }] },
    recipe: { title: 'Nova receita', yield: 'Informar rendimento', equipment: ['forma média', 'tigela grande'], ingredients: [{ item: 'ingrediente', quantity: '1', unit: 'xic' }], products: [{ name: 'produto', brand: null, note: 'Confirmar rótulo' }], steps: [{ order: 1, text: 'Passo orientado pelo Chefe Triix.' }], safety: ['Tarefas quentes ficam com o adulto.'], tips: ['Esperar a instrução completa antes de executar.'] }
  };
}

function renderAdminImport() {
  const options = (state.players || []).map(p => '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + '</option>').join('');
  return '<div class="card"><h3>Importar missão gerada pelo Chefe Triix</h3>' +
    '<p class="muted small">Cole o JSON da missão. O jogador selecionado será adicionado automaticamente como <code class="inline">player_id</code>. Dicas e segurança ficam salvas no banco, mas não aparecem para a Klara.</p>' +
    '<div class="field"><label for="import-player">Jogador</label><select id="import-player">' +
    (options || '<option value="">Nenhum jogador</option>') + '</select></div>' +
    '<div class="field"><label for="import-json">JSON da missão</label><textarea id="import-json" placeholder="Cole aqui o JSON..."></textarea></div>' +
    '<div class="row"><button class="btn secondary" data-action="load-example">Carregar exemplo</button>' +
    '<button class="btn" data-action="admin-import">Importar missão</button></div></div>';
}

function renderAdminOrders() {
  const pending = (state.summary && state.summary.pending_orders) || [];
  const rows = pending.map(o => {
    const missionInput = o.mode === 'temporary'
      ? '<div class="field mt"><label>ID da missão para equipamento temporário</label><input class="input" id="mission-' + esc(o.order_id) + '" placeholder="uuid da missão" /></div>'
      : '';
    return '<div class="card"><div class="row"><div><h3 style="margin:0">' + esc(o.reward_name) +
      '</h3><div class="meta muted small">' + esc(playerNameById(o.player_id)) +
      ' • ' + esc(o.requested_price) + ' pts' +
      (o.mode ? ' • ' + esc(o.mode) : '') + ' • ' + esc(fmtDate(o.created_at)) +
      '</div></div><span class="space"></span><span class="pill warn">Pendente</span></div>' +
      (o.notes ? '<p class="muted small">' + esc(o.notes) + '</p>' : '') + missionInput +
      '<div class="row mt"><button class="btn good" data-action="admin-approve" data-id="' + esc(o.order_id) +
      '" data-mode="' + esc(o.mode || '') + '">Aprovar</button>' +
      '<button class="btn bad" data-action="admin-reject" data-id="' + esc(o.order_id) + '">Recusar</button></div></div>';
  }).join('');
  return '<div class="notice ok">Aprovar desconta pontos e registra no histórico. Recusar não altera saldo.</div>' +
    (rows || '<div class="card"><p class="muted">Nenhum pedido pendente.</p></div>');
}

function renderAdminAdjust() {
  const options = (state.players || []).map(p =>
    '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + ' — ' + esc(p.points_balance) + ' pts</option>'
  ).join('');
  return '<div class="card"><h3>Ajustar pontos manualmente</h3>' +
    '<p class="muted small">Use apenas para correções. O motivo fica registrado no histórico.</p>' +
    '<div class="field"><label for="adjust-player">Jogador</label><select id="adjust-player">' +
    (options || '<option value="">Nenhum jogador</option>') + '</select></div>' +
    '<div class="field"><label for="adjust-delta">Pontos (+ ou -)</label><input class="input" id="adjust-delta" type="number" step="1" placeholder="Ex.: 5 ou -3" /></div>' +
    '<div class="field"><label for="adjust-reason">Motivo</label><input class="input" id="adjust-reason" placeholder="Ex.: correção de bônus de limpeza" /></div>' +
    '<button class="btn" data-action="admin-adjust">Salvar ajuste</button></div>';
}

function renderAdminExport() {
  return '<div class="card"><h3>Exportar resumo para o Chefe Triix</h3>' +
    '<p class="muted small">Gere um JSON com saldo, pedidos pendentes, missões recentes e equipamentos ativos. Você pode colar esse resumo no chat para eu consultar o estado atual.</p>' +
    '<div class="row"><button class="btn" data-action="admin-export">Gerar resumo</button>' +
    '<button class="btn secondary" data-action="copy-export">Copiar JSON</button></div>' +
    '<div class="field mt"><label for="export-json">Resumo</label><textarea id="export-json" readonly>' +
    esc(state.exportJson || '') + '</textarea></div></div>';
}

async function bootRealSession() {
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (!session) { state.user = null; state.profile = null; state.role = null; render(); return; }
  state.user = session.user;
  const { data: profile, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw error;
  state.profile = profile; state.role = profile.role;
  await refreshData(); render();
}

async function refreshData() {
  if (isDemoActive()) { loadDemoData(); return; }
  if (!client || !state.user) return;
  if (state.role === 'admin') {
    const [pRes, sRes] = await Promise.all([client.rpc('admin_list_players'), client.rpc('admin_export_summary')]);
    state.players = pRes.data || []; state.summary = sRes.data || { pending_orders: [], recent_missions: [] };
  } else {
    const uid = state.user.id;
    const [psRes, mRes, rRes, oRes, eRes] = await Promise.all([
      client.from('player_state').select('*').eq('player_id', uid).maybeSingle(),
      client.from('missions').select('*').eq('player_id', uid).order('occurred_at', { ascending: false }).limit(50),
      client.from('rewards').select('*').eq('active', true).order('base_price'),
      client.from('reward_orders').select('*').eq('player_id', uid).order('created_at', { ascending: false }),
      client.from('equipment_unlocks').select('*').eq('player_id', uid).eq('status', 'active')
    ]);
    state.playerState = psRes.data || { points_balance: 0, kitchen_level: 2 };
    state.missions = mRes.data || []; state.rewards = rRes.data || [];
    state.orders = oRes.data || []; state.equipment = eRes.data || [];
  }
}

function loadDemoData() {
  if (state.demoRole === 'admin') { state.players = demoData.players; state.summary = demoData.summary; }
  else {
    const pv = parseInt(params.get('preview'), 10);
    const lvl = (pv >= 1 && pv <= 3) ? pv : demoData.playerState.kitchen_level;
    state.playerState = Object.assign({}, demoData.playerState, { kitchen_level: lvl });
    state.rewards = demoData.rewards; state.missions = demoData.missions;
    state.orders = demoData.orders; state.equipment = demoData.equipment;
    state.comments = demoData.comments; state.lastRecipe = demoData.lastRecipe;
  }
}

async function doAction(action, el) {
  try {
    if (action === 'tab') { state.tab = el.dataset.tab; render(); return; }
    if (action === 'demo-login') { state.demoRole = el.dataset.role; state.tab = 'dashboard'; loadDemoData(); render(); return; }
    if (action === 'logout') {
      if (isDemoActive()) { state.demoRole = null; render(); return; }
      if (client) await client.auth.signOut();
      state.user = null; state.profile = null; state.role = null; render(); return;
    }
    if (action === 'toggle-recipe') {
      const id = el.dataset.id;
      if (state.selectedMissionId === id) {
        state.selectedMissionId = null;
        state.recipe = null;
        render();
        return;
      }
      state.selectedMissionId = id;
      state.recipe = null;
      if (isDemoActive()) {
        state.recipe = demoData.recipe;
      } else {
        const { data, error } = await client
          .from('mission_recipes')
          .select('*')
          .eq('mission_id', id)
          .maybeSingle();
        if (error) throw error;
        state.recipe = data || null;
        if (!data) toast('Esta missão não tem receita vinculada.', 'error');
      }
      render();
      return;
    }
    if (action === 'request-reward') {
      const ps = state.playerState || { points_balance: 0 };
      const reward = state.rewards.find(r => r.code === el.dataset.code);
      if (ps.points_balance < reward.base_price) { toast('Pontos insuficientes!', 'error'); return; }
      if (reward.reward_type === 'equipment' && ps.kitchen_level === 3) {
        toast('Cozinha Nível 3 não pode adquirir utensílios no momento.', 'error'); return;
      }
      const mode = reward.reward_type === 'equipment' ? document.getElementById('mode-' + el.dataset.code)?.value || 'temporary' : null;
      const ingredient = reward.code === 'ingrediente-especial' ? document.getElementById('ingredient-' + el.dataset.code)?.value : null;
      if (isDemoActive()) { 
        toast('Demo: pedido enviado! (ingrediente: ' + (ingredient || 'N/A') + ')', 'ok'); 
        return; 
      }
      const { error } = await client.rpc('player_request_reward', { p_reward_code: el.dataset.code, p_note: 'Ingrediente: ' + (ingredient || 'N/A'), p_mode: mode });
      if (error) throw error;
      await refreshData(); state.tab = 'orders'; render();
      toast('Pedido enviado para aprovação do Douglas!', 'ok');
      return;
    }
    if (action === 'admin-refresh') { await refreshData(); render(); toast('Dados atualizados.', 'ok'); return; }
    if (action === 'load-example') { $('#import-json').value = JSON.stringify(exampleMissionPayload(), null, 2); return; }
    if (action === 'admin-import') {
      const playerId = $('#import-player').value;
      if (!playerId) throw new Error('Selecione um jogador.');
      const raw = $('#import-json').value.trim();
      if (!raw) throw new Error('Cole o JSON da missão.');
      let payload; try { payload = JSON.parse(raw); } catch (_) { throw new Error('JSON inválido.'); }
      payload.player_id = playerId;
      if (isDemoActive()) { toast('Demo: missão importada.', 'ok'); return; }
      const { data, error } = await client.rpc('admin_import_mission', { payload });
      if (error) throw error;
      await refreshData(); render();
      toast(data && data.status === 'already_imported' ? 'Missão já importada.' : 'Missão importada.', 'ok');
      return;
    }
    if (action === 'admin-approve') {
      const id = el.dataset.id; const mode = el.dataset.mode;
      let missionId = null;
      if (mode === 'temporary') {
        const input = document.getElementById('mission-' + id);
        missionId = input ? input.value.trim() : '';
        if (!missionId) throw new Error('Informe o ID da missão para o equipamento temporário.');
      }
      if (isDemoActive()) { toast('Demo: pedido aprovado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_reward_order', { p_order_id: id, p_approve: true, p_note: null, p_mission_id: missionId });
      if (error) throw error;
      await refreshData(); render(); toast('Pedido aprovado.', 'ok');
      return;
    }
    if (action === 'admin-reject') {
      const id = el.dataset.id;
      if (isDemoActive()) { toast('Demo: pedido recusado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_reward_order', { p_order_id: id, p_approve: false, p_note: null, p_mission_id: null });
      if (error) throw error;
      await refreshData(); render(); toast('Pedido recusado.', 'ok');
      return;
    }
    if (action === 'admin-adjust') {
      const playerId = $('#adjust-player').value;
      const delta = parseInt($('#adjust-delta').value, 10);
      const reason = $('#adjust-reason').value.trim();
      if (!playerId) throw new Error('Selecione um jogador.');
      if (!Number.isFinite(delta) || delta === 0) throw new Error('Informe pontos diferentes de zero.');
      if (!reason) throw new Error('Informe o motivo.');
      if (isDemoActive()) { toast('Demo: ajuste registrado.', 'ok'); return; }
      const { error } = await client.rpc('admin_adjust_points', { p_player_id: playerId, p_delta: delta, p_reason: reason });
      if (error) throw error;
      await refreshData(); render(); toast('Ajuste registrado.', 'ok');
      return;
    }
    if (action === 'admin-export') {
      if (isDemoActive()) { state.exportJson = JSON.stringify(demoData.summary, null, 2); render(); return; }
      const { data, error } = await client.rpc('admin_export_summary');
      if (error) throw error;
      state.exportJson = JSON.stringify(data, null, 2); render(); toast('Resumo gerado.', 'ok');
      return;
    }
    if (action === 'copy-export') {
      const text = state.exportJson || ($('#export-json') ? $('#export-json').value : '');
      if (!text) { toast('Gere o resumo primeiro.', 'error'); return; }
      try { await navigator.clipboard.writeText(text); toast('JSON copiado.', 'ok'); }
      catch (_) { const ta = $('#export-json'); if (ta) { ta.select(); document.execCommand('copy'); toast('JSON copiado.', 'ok'); } }
      return;
    }
    if (action === 'submit-comment') {
      const email = $('#comment-email').value.trim();
      const message = $('#comment-message').value.trim();
      if (!email || !message) { toast('Preencha e-mail e mensagem.', 'error'); return; }
      if (isDemoActive()) {
        state.comments.unshift({ id: 'c' + Date.now(), email, message, created_at: new Date().toISOString() });
        render(); toast('Comentário enviado! (demo)', 'ok');
        return;
      }
      const { error } = await client.from('visitor_comments').insert({ email, message });
      if (error) throw error;
      await refreshData(); render(); toast('Comentário enviado!', 'ok');
      return;
    }
  } catch (err) { toast(err.message || 'Erro na ação.', 'error'); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return; doAction(el.dataset.action, el);
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'comment-form') {
    e.preventDefault();
    doAction('submit-comment', e.target);
  }
});
signoutBtn.addEventListener('click', () => doAction('logout', signoutBtn));

async function init() {
  if (forceDemo) { loadDemoData(); render(); return; }
  if (!configured) { loadDemoData(); render(); return; }
  if (!client) { toast('Erro ao carregar Supabase.', 'error'); return; }
  try {
    await bootRealSession();
    client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { state.user = null; state.profile = null; state.role = null; render(); } });
  } catch (err) { toast('Erro ao iniciar sessão: ' + err.message, 'error'); render(); }
}
init();
})();
