(function () {
'use strict';
const cfg = window.GAME_TALK_SHOW_CONFIG || {};
const configured = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey && !String(cfg.supabaseUrl).includes('COLE'));
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
  players: [], missions: [], orders: [], equipment: [],
  summary: null, selectedMissionId: null, recipe: null, exportJson: '',
  comments: [], lastRecipe: null, selectedOptionByReward: {},
  // Loja dinâmica
  storeCategories: [], storeItemsByCategory: {},
  adminStoreTab: 'manage', editingCategory: null, editingItem: null,
  showCategoryModal: false, showItemModal: false
};

const demoData = {
  playerState: { points_balance: 45, kitchen_level: 2, last_rating: null },
  equipment: [{ equipment_code: 'batedeira', mode: 'temporary', status: 'active', acquired_at: '2026-11-21T10:00:00-03:00' }],
  storeCategories: [
    { id: 'c1', code: 'confeitos', name: '🍬 Confeitos', emoji: '🍬', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c2', code: 'temperos-basicos', name: '🧂 Temperos Básicos', emoji: '🧂', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c3', code: 'cremes-molhos', name: '🥛 Cremes e Molhos', emoji: '🥛', min_price: 15, max_price: 30, level_required: 1, active: true }
  ],
  storeItems: {
    'c1': [
      { id: 'i1', code: 'confeitos-estrela', name: 'Confeitos Estrela', description: 'Confeitos em formato de estrela', emoji: '⭐', image_url: '', base_price: 15, permanent_price: 75, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'estrela', label: 'Estrelas', emoji: '⭐' }, { id: 'coracao', label: 'Corações', emoji: '❤️' }, { id: 'flor', label: 'Flores', emoji: '🌸' }] }
    ],
    'c2': [
      { id: 'i2', code: 'temperos-sal', name: 'Sal Fino', description: 'Sal refinado', emoji: '🧂', image_url: '', base_price: 15, permanent_price: 75, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'sal', label: 'Sal fino', emoji: '🧂' }, { id: 'pimenta', label: 'Pimenta', emoji: '🌶️' }, { id: 'cebolinha', label: 'Cebolinha', emoji: '🌿' }] }
    ],
    'c3': []
  },
  missions: [{ id: 'm1', title: 'Bolo de chocolate com calda', kind: 'recipe', points_delta: 15, rating: null, occurred_at: '2026-11-21T14:30:00-03:00', feedback: 'Massa fofinha!' }],
  orders: [
    { id: 'o1', reward_id: 'i1', reward_name: 'Confeitos Estrela', selected_option_label: 'Estrelas ⭐', requested_price: 15, status: 'pending', created_at: '2026-11-21T15:00:00-03:00' }
  ],
  players: [{ player_id: 'demo-klara', display_name: 'Klara', points_balance: 45, kitchen_level: 2, last_rating: null }],
  summary: { pending_orders: [], recent_missions: [], active_equipment: [] },
  recipe: {
    recipe: { title: 'Bolo de chocolate com calda', yield: '1 bolo médio', steps: [{ order: 1, text: 'Adulto preaquece o forno a 180 °C.' }] },
    tips: ['Peneire a farinha.'], ingredients: [{ item: 'ovos', quantity: '2', unit: 'unidade' }],
    products: [], equipment: ['tigela grande']
  },
  comments: [{ id: 'c1', email: 'tia@familia.com', message: 'Que lindo!', created_at: '2026-11-21T16:00:00-03:00' }],
  lastRecipe: { title: 'Bolo de chocolate', ingredients: ['ovos', 'açúcar', 'leite', 'óleo', 'achocolatado'] }
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
  if (role === 'admin') return [['dashboard', 'Visão geral'], ['import', 'Importar'], ['orders', 'Pedidos'], ['adjust', 'Ajustar'], ['export', 'Exportar'], ['admin-store', 'Admin Loja']];
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
  return '<div class="grid cols-3"><div class="card"><span class="muted small">Saldo</span><div style="font-size:32px;font-weight:800">' + esc(ps.points_balance) + ' pts</div></div>' +
    '<div class="card"><span class="muted small">Cozinha</span><div style="font-size:24px;font-weight:800">' + kitchen.emoji + ' ' + esc(kitchen.name) + '</div></div>' +
    '<div class="card"><span class="muted small">Nível</span><div style="font-size:24px;font-weight:800">' + esc(ps.kitchen_level) + '</div></div></div>' +
    '<div class="card"><h3 style="margin:0">Sua cozinha</h3>' + renderKitchenScene(ps.kitchen_level, state.equipment) + '</div>' +
    '<div class="card"><h3>Últimas missões</h3><div class="list">' + (recent || '<p class="muted">Nenhuma missão ainda.</p>') + '</div></div>';
}

function renderMissions() {
  const items = (state.missions || []).map(m => {
    const isOpen = state.selectedMissionId === m.id;
    const recipeHtml = isOpen && state.recipe ? renderRecipe(state.recipe, false) : '';
    return '<div class="list-item"><div><div class="title">' + esc(m.title) + '</div><div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div>' + (m.feedback ? '<div class="meta">' + esc(m.feedback) + '</div>' : '') + '</div>' +
    '<div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' + (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span>' +
    '<div class="recipe-toggle" data-action="toggle-recipe" data-id="' + esc(m.id) + '">' + (isOpen ? 'Recolher receita ▲' : 'Ver receita ▼') + '</div></div>' +
    (recipeHtml ? '<div class="recipe-details open">' + recipeHtml + '</div>' : '') + '</div>';
  }).join('');
  return '<div class="card"><h3>Histórico de missões</h3><div class="list">' + (items || '<p class="muted">Nenhuma missão registrada.</p>') + '</div></div>';
}

function renderRecipe(r, hideGuidance) {
  const recipe = r.recipe || {};
  const tips = r.tips || [];
  const ingredients = r.ingredients || [];
  const equipment = r.equipment || [];
  return '<div class="chef-feedback"><h4>👨‍🍳 Feedback e Dicas do Chefe Triix</h4><ul>' + (tips.length ? tips.map(t => '<li>' + esc(t) + '</li>').join('') : '<li>Siga os passos com calma!</li>') + '</ul></div>' +
    '<div class="mt"><h4>Ingredientes</h4><ul>' + ingredients.map(i => '<li>' + esc(i.quantity) + ' ' + esc(i.unit) + ' de ' + esc(i.item) + '</li>').join('') + '</ul></div>' +
    (equipment.length ? '<div class="mt"><h4>Utensílios</h4><ul>' + equipment.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '');
}

// ===== LOJA DO PLAYER (lê do banco) =====
function renderStore() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const categories = state.storeCategories || [];
  const visibleCats = categories.filter(c => c.level_required <= ps.kitchen_level && c.active);

  if (ps.kitchen_level === 3) {
    return '<div class="card"><h3>Loja</h3><p class="muted">Na Cozinha de Campanha (Nível 3), o resgate de ingredientes está suspenso.</p></div>';
  }

  let html = '<div class="card" style="cursor:pointer" data-action="show-balance"><span class="muted small">Saldo disponível</span><div style="font-size:32px;font-weight:800;color:var(--accent)">' + esc(ps.points_balance) + ' pts</div><p class="muted small mt">Clique para ver histórico</p></div>';
  html += '<div class="notice ok">⚠️ Itens comprados devem ser usados em até 3 receitas!</div>';

  visibleCats.forEach(cat => {
    const items = (state.storeItemsByCategory[cat.id] || []).filter(i => i.active);
    html += '<div class="store-category"><h4>' + esc(cat.name) + ' <span class="small muted">(R$ ' + cat.min_price + ' a R$ ' + cat.max_price + ')</span></h4><div class="grid cols-3">';
    items.forEach(item => {
      const canAfford = ps.points_balance >= item.base_price;
      const isSuggestion = item.is_suggestion || item.base_price > cat.max_price;
      const btnDisabled = !canAfford ? 'disabled' : '';
      const btnText = canAfford ? (isSuggestion ? 'Sugerir' : 'Pedir resgate') : 'Pontos insuficientes';
      const selectedOpt = state.selectedOptionByReward[item.id];
      const options = item.options || [];
      const optionsHtml = options.map(opt =>
        '<div class="option-chip ' + (selectedOpt === opt.id ? 'selected' : '') + '" data-action="select-option" data-item="' + esc(item.id) + '" data-option="' + esc(opt.id) + '">' +
          '<span class="opt-emoji">' + esc(opt.emoji || '🔹') + '</span><span class="opt-label">' + esc(opt.label) + '</span></div>'
      ).join('');

      html += '<div class="reward-card-new">' +
        (item.image_url ? '<img class="reward-img" src="' + esc(item.image_url) + '" alt="' + esc(item.name) + '" onerror="this.outerHTML=\'<div class=\\\'reward-img-fallback\\\'>' + esc(item.emoji) + '</div>\'">' : '<div class="reward-img-fallback">' + esc(item.emoji) + '</div>') +
        '<h5>' + esc(item.name) + (isSuggestion ? '<span class="suggestion-badge">sugestão</span>' : '') + '</h5>' +
        '<div class="reward-desc">' + esc(item.description || '') + '</div>' +
        '<div class="reward-price' + (isSuggestion ? ' suggestion' : '') + '">' + esc(item.base_price) + ' pts' + (item.permanent_price ? '<br><span class="small muted">ou ' + esc(item.permanent_price) + ' pts (permanente)</span>' : '') + '</div>' +
        '<div class="options-grid">' + optionsHtml + '</div>' +
        '<button class="btn btn-request" data-action="request-reward" data-item="' + esc(item.id) + '" data-cat="' + esc(cat.id) + '" ' + btnDisabled + '>' + btnText + '</button>' +
      '</div>';
    });
    html += '</div></div>';
  });

  if (state.showPurchaseModal) {
    html += '<div class="modal-overlay" data-action="close-modal"><div class="modal-content"><h3>📦 Histórico de Compras</h3><p class="muted">Em breve: lista de compras com validade de 3 receitas.</p><button class="btn mt" data-action="close-modal">Fechar</button></div></div>';
  }
  return html;
}

function renderPlayerOrders() {
  const orders = state.orders || [];
  const pending = orders.filter(o => o.status === 'pending');
  const approved = orders.filter(o => o.status === 'approved');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const equipmentHistory = state.equipment || [];
  const renderList = (list) => list.length ? list.map(o =>
    '<div class="list-item"><div><div class="title">' + esc(o.reward_name || 'Item') + '</div>' +
    (o.selected_option_label ? '<div class="order-selected-option">' + esc(o.selected_option_label) + '</div>' : '') +
    '<div class="meta">' + esc(fmtDate(o.created_at)) + ' • ' + esc(o.requested_price) + ' pts</div></div>' +
    '<div class="right"><span class="pill ' + (o.status === 'approved' ? 'good' : o.status === 'cancelled' ? 'bad' : 'warn') + '">' +
    esc(o.status === 'approved' ? 'Aprovado' : o.status === 'cancelled' ? 'Cancelado' : 'Aguardando') + '</span></div></div>'
  ).join('') : '<p class="muted small">Nenhum registro.</p>';
  const equipList = equipmentHistory.length ? equipmentHistory.map(e => {
    const meta = EQUIP_META[e.equipment_code] || { name: e.equipment_code };
    return '<div class="list-item"><div><div class="title">' + esc(meta.name) + '</div><div class="meta">Adquirido: ' + esc(fmtDate(e.acquired_at)) + '</div></div><div class="right"><span class="pill info">Ativo</span></div></div>';
  }).join('') : '<p class="muted small">Nenhum utensílio.</p>';
  return '<div class="card"><h3>Meus Pedidos</h3>' +
    '<div class="order-category"><h4>⏳ Aguardando</h4><div class="list">' + renderList(pending) + '</div></div>' +
    '<div class="order-category"><h4>✅ Aprovados</h4><div class="list">' + renderList(approved) + '</div></div>' +
    '<div class="order-category"><h4>❌ Cancelados</h4><div class="list">' + renderList(cancelled) + '</div></div>' +
    '<div class="order-category"><h4>🍳 Utensílios</h4><div class="list">' + equipList + '</div></div></div>';
}

function renderComments() {
  const comments = state.comments || [];
  const list = comments.map(c => '<div class="comment-item"><span class="author">' + esc(c.email) + '</span><span class="date">' + esc(fmtDate(c.created_at)) + '</span><div class="text">' + esc(c.message) + '</div></div>').join('');
  return '<div class="card"><h3>Comentários</h3><form class="comment-form" id="comment-form"><div class="field"><label>E-mail</label><input class="input" id="comment-email" type="email" required /></div><div class="field"><label>Mensagem</label><textarea class="input" id="comment-message" rows="3" required></textarea></div><button class="btn" type="submit">Enviar</button></form><div class="comment-list">' + (list || '<p class="muted">Nenhum comentário.</p>') + '</div></div>';
}

// ===== ADMIN =====
function renderAdmin() {
  if (state.tab === 'import') return renderAdminImport();
  if (state.tab === 'orders') return renderAdminOrders();
  if (state.tab === 'adjust') return renderAdminAdjust();
  if (state.tab === 'export') return renderAdminExport();
  if (state.tab === 'admin-store') return renderAdminStore();
  return renderAdminDashboard();
}

function playerNameById(id) { const p = (state.players || []).find(x => x.player_id === id); return p ? p.display_name : id; }

function renderAdminDashboard() {
  const players = state.players || [];
  const summary = state.summary || {};
  const pending = summary.pending_orders || [];
  const recent = summary.recent_missions || [];
  const playerRows = players.map(p => '<tr><td>' + esc(p.display_name) + '</td><td>' + esc(p.points_balance) + '</td><td>' + esc(p.kitchen_level) + '</td><td>' + (p.last_rating == null ? '—' : esc(p.last_rating)) + '</td></tr>').join('');
  return '<div class="grid cols-3"><div class="card stat"><span class="label">Jogadores</span><span class="value">' + players.length + '</span></div><div class="card stat"><span class="label">Pedidos pendentes</span><span class="value">' + pending.length + '</span></div><div class="card stat"><span class="label">Missões</span><span class="value">' + recent.length + '</span></div></div>' +
    '<div class="card"><table class="table mt"><thead><tr><th>Nome</th><th>Pontos</th><th>Cozinha</th><th>Nota</th></tr></thead><tbody>' + (playerRows || '<tr><td colspan="4">Nenhum jogador.</td></tr>') + '</tbody></table></div>';
}

// ===== ADMIN LOJA =====
function renderAdminStore() {
  const categories = state.storeCategories || [];
  const subTabs = [['manage', 'Gerenciar'], ['add-cat', 'Nova Categoria'], ['add-item', 'Novo Item']];
  const tabsHtml = subTabs.map(([id, label]) => '<button class="tab ' + (state.adminStoreTab === id ? 'active' : '') + '" data-action="admin-store-tab" data-tab="' + id + '">' + esc(label) + '</button>').join('');

  let content = '';
  if (state.adminStoreTab === 'manage') {
    content = categories.map(cat => {
      const items = state.storeItemsByCategory[cat.id] || [];
      const itemsHtml = items.map(item =>
        '<div class="store-item-mini"><div class="item-name">' + esc(item.emoji) + ' ' + esc(item.name) + '</div><div class="item-price">' + esc(item.base_price) + ' pts' + (item.permanent_price ? ' / ' + esc(item.permanent_price) + ' perm' : '') + '</div>' +
        '<div class="item-actions"><button class="btn small secondary" data-action="edit-item" data-id="' + esc(item.id) + '">Editar</button><button class="btn small bad" data-action="delete-item" data-id="' + esc(item.id) + '">Excluir</button></div></div>'
      ).join('');
      return '<div class="store-cat-card"><div class="store-cat-header" data-action="toggle-cat" data-id="' + esc(cat.id) + '"><div><h4>' + esc(cat.name) + '</h4><div class="store-cat-meta">Nível ' + esc(cat.level_required) + ' • R$ ' + esc(cat.min_price) + ' a R$ ' + esc(cat.max_price) + ' • ' + items.length + ' itens' + (cat.active ? '' : ' • INATIVA') + '</div></div><div><button class="btn small secondary" data-action="edit-category" data-id="' + esc(cat.id) + '">Editar</button> <button class="btn small bad" data-action="delete-category" data-id="' + esc(cat.id) + '">Excluir</button></div></div>' +
        (itemsHtml ? '<div class="store-items-grid">' + itemsHtml + '</div>' : '<p class="muted small" style="margin:10px 0 0">Sem itens nesta categoria.</p>') + '</div>';
    }).join('');
    if (!categories.length) content = '<div class="card"><p class="muted">Nenhuma categoria. Crie a primeira!</p></div>';
  } else if (state.adminStoreTab === 'add-cat') {
    content = renderCategoryForm();
  } else if (state.adminStoreTab === 'add-item') {
    content = renderItemForm();
  }

  return '<div class="tabs">' + tabsHtml + '</div>' + content;
}

function renderCategoryForm(cat) {
  const c = cat || { id: null, code: '', name: '', emoji: '🔹', min_price: 15, max_price: 30, level_required: 2, active: true };
  return '<div class="card"><h3>' + (cat ? 'Editar' : 'Nova') + ' Categoria</h3>' +
    '<div class="field"><label>Código (sem espaços)</label><input class="input" id="cat-code" value="' + esc(c.code) + '" /></div>' +
    '<div class="field"><label>Nome (com emoji)</label><input class="input" id="cat-name" value="' + esc(c.name) + '" /></div>' +
    '<div class="field"><label>Emoji</label><input class="input" id="cat-emoji" value="' + esc(c.emoji) + '" /></div>' +
    '<div class="grid cols-2"><div class="field"><label>Preço mínimo (pts)</label><input class="input" id="cat-min" type="number" value="' + esc(c.min_price) + '" /></div><div class="field"><label>Preço máximo (pts)</label><input class="input" id="cat-max" type="number" value="' + esc(c.max_price) + '" /></div></div>' +
    '<div class="field"><label>Nível necessário</label><select id="cat-level"><option value="1" ' + (c.level_required === 1 ? 'selected' : '') + '>Nível 1</option><option value="2" ' + (c.level_required === 2 ? 'selected' : '') + '>Nível 2</option><option value="3" ' + (c.level_required === 3 ? 'selected' : '') + '>Nível 3</option></select></div>' +
    '<div class="field"><label><input type="checkbox" id="cat-active" ' + (c.active ? 'checked' : '') + ' /> Ativa</label></div>' +
    '<button class="btn" data-action="save-category" data-id="' + esc(c.id || '') + '">Salvar categoria</button></div>';
}

function renderItemForm(item) {
  const categories = state.storeCategories || [];
  const i = item || { id: null, category_id: categories[0]?.id || '', code: '', name: '', description: '', emoji: '🔹', image_url: '', base_price: 15, permanent_price: null, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [] };
  const catOptions = categories.map(c => '<option value="' + esc(c.id) + '" ' + (i.category_id === c.id ? 'selected' : '') + '>' + esc(c.name) + '</option>').join('');
  const opts = i.options || [];
  const optsHtml = opts.map((o, idx) =>
    '<div class="option-row"><input class="input" data-opt-id="' + idx + '" value="' + esc(o.id) + '" placeholder="id" /><input class="input" data-opt-label="' + idx + '" value="' + esc(o.label) + '" placeholder="label" /><input class="input" data-opt-emoji="' + idx + '" value="' + esc(o.emoji) + '" placeholder="🔹" /><button class="btn-icon" data-action="remove-opt" data-idx="' + idx + '">✕</button></div>'
  ).join('');

  return '<div class="card"><h3>' + (item ? 'Editar' : 'Novo') + ' Item</h3>' +
    '<div class="field"><label>Categoria</label><select id="item-cat">' + catOptions + '</select></div>' +
    '<div class="field"><label>Código (sem espaços)</label><input class="input" id="item-code" value="' + esc(i.code) + '" /></div>' +
    '<div class="field"><label>Nome</label><input class="input" id="item-name" value="' + esc(i.name) + '" /></div>' +
    '<div class="field"><label>Descrição</label><textarea class="input" id="item-desc" rows="2">' + esc(i.description) + '</textarea></div>' +
    '<div class="field"><label>Emoji</label><input class="input" id="item-emoji" value="' + esc(i.emoji) + '" /></div>' +
    '<div class="field"><label>URL da imagem</label><input class="input" id="item-image" value="' + esc(i.image_url) + '" placeholder="https://..." /></div>' +
    '<div class="grid cols-2"><div class="field"><label>Preço aluguel (pts)</label><input class="input" id="item-price" type="number" value="' + esc(i.base_price) + '" /></div><div class="field"><label>Preço permanente (pts, opcional)</label><input class="input" id="item-perm" type="number" value="' + esc(i.permanent_price || '') + '" /></div></div>' +
    '<div class="field"><label>Tipo</label><select id="item-type"><option value="ingredient" ' + (i.reward_type === 'ingredient' ? 'selected' : '') + '>Ingrediente</option><option value="equipment" ' + (i.reward_type === 'equipment' ? 'selected' : '') + '>Equipamento</option><option value="experience" ' + (i.reward_type === 'experience' ? 'selected' : '') + '>Experiência</option></select></div>' +
    '<div class="field"><label><input type="checkbox" id="item-approval" ' + (i.requires_approval ? 'checked' : '') + ' /> Requer aprovação</label></div>' +
    '<div class="field"><label><input type="checkbox" id="item-suggestion" ' + (i.is_suggestion ? 'checked' : '') + ' /> É sugestão (acima do máximo)</label></div>' +
    '<div class="field"><label><input type="checkbox" id="item-active" ' + (i.active ? 'checked' : '') + ' /> Ativo</label></div>' +
    '<h4 style="margin:20px 0 10px">Opções (sabores/formatos)</h4><div class="options-editor" id="options-editor">' + optsHtml + '</div>' +
    '<button class="btn small secondary mt" data-action="add-option">+ Adicionar opção</button>' +
    '<div style="margin-top:20px"><button class="btn" data-action="save-item" data-id="' + esc(i.id || '') + '">Salvar item</button></div></div>';
}

function renderAdminImport() {
  const options = (state.players || []).map(p => '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + '</option>').join('');
  return '<div class="card"><h3>Importar missão</h3><div class="field"><label>Jogador</label><select id="import-player">' + (options || '<option value="">Nenhum</option>') + '</select></div><div class="field"><label>JSON</label><textarea id="import-json"></textarea></div><div class="row"><button class="btn secondary" data-action="load-example">Exemplo</button><button class="btn" data-action="admin-import">Importar</button></div></div>';
}

function renderAdminOrders() {
  const pending = (state.summary && state.summary.pending_orders) || [];
  const rows = pending.map(o => '<div class="card"><div class="row"><div><h3 style="margin:0">' + esc(o.reward_name) + '</h3><div class="meta muted small">' + esc(playerNameById(o.player_id)) + ' • ' + esc(o.requested_price) + ' pts • ' + esc(fmtDate(o.created_at)) + '</div></div><span class="space"></span><span class="pill warn">Pendente</span></div><div class="row mt"><button class="btn good" data-action="admin-approve" data-id="' + esc(o.order_id) + '">Aprovar</button><button class="btn bad" data-action="admin-reject" data-id="' + esc(o.order_id) + '">Recusar</button></div></div>').join('');
  return '<div class="notice ok">Aprovar desconta pontos.</div>' + (rows || '<div class="card"><p class="muted">Nenhum pedido pendente.</p></div>');
}

function renderAdminAdjust() {
  const options = (state.players || []).map(p => '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + ' — ' + esc(p.points_balance) + ' pts</option>').join('');
  return '<div class="card"><h3>Ajustar pontos</h3><div class="field"><label>Jogador</label><select id="adjust-player">' + (options || '<option value="">Nenhum</option>') + '</select></div><div class="field"><label>Pontos (+/-)</label><input class="input" id="adjust-delta" type="number" /></div><div class="field"><label>Motivo</label><input class="input" id="adjust-reason" /></div><button class="btn" data-action="admin-adjust">Salvar</button></div>';
}

function renderAdminExport() {
  return '<div class="card"><h3>Exportar resumo</h3><div class="row"><button class="btn" data-action="admin-export">Gerar</button><button class="btn secondary" data-action="copy-export">Copiar</button></div><div class="field mt"><label>Resumo</label><textarea id="export-json" readonly>' + esc(state.exportJson || '') + '</textarea></div></div>';
}

function exampleMissionPayload() {
  return { mission: { kind: 'recipe', title: 'Nova receita', occurred_at: new Date().toISOString(), feedback: 'Feedback.', rating: null, points_delta: 20, kitchen_level_after: 2, points_breakdown: [{ label: 'Execução', points: 10 }] }, recipe: { title: 'Nova receita', yield: '1', equipment: [], ingredients: [], products: [], steps: [{ order: 1, text: 'Passo 1.' }], safety: [], tips: [] } };
}

// ========== DADOS ==========
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
    const [pRes, sRes, catRes] = await Promise.all([
      client.rpc('admin_list_players'),
      client.rpc('admin_export_summary'),
      client.rpc('admin_store_list')
    ]);
    state.players = pRes.data || [];
    state.summary = sRes.data || { pending_orders: [], recent_missions: [] };
    // Parse categorias e itens do admin_store_list
    const cats = catRes.data || [];
    state.storeCategories = cats.map(c => ({ id: c.id, code: c.code, name: c.name, emoji: c.emoji, min_price: c.min_price, max_price: c.max_price, level_required: c.level_required, active: c.active }));
    const itemsByCat = {};
    cats.forEach(c => { itemsByCat[c.id] = c.items || []; });
    state.storeItemsByCategory = itemsByCat;
  } else {
    const uid = state.user.id;
    const [psRes, mRes, oRes, eRes, catRes] = await Promise.all([
      client.from('player_state').select('*').eq('player_id', uid).maybeSingle(),
      client.from('missions').select('*').eq('player_id', uid).order('occurred_at', { ascending: false }).limit(50),
      client.from('reward_orders').select('*').eq('player_id', uid).order('created_at', { ascending: false }),
      client.from('equipment_unlocks').select('*').eq('player_id', uid).eq('status', 'active'),
      client.rpc('store_list_categories', { p_level: state.playerState?.kitchen_level || 2 })
    ]);
    state.playerState = psRes.data || { points_balance: 0, kitchen_level: 2 };
    state.missions = mRes.data || [];
    state.orders = oRes.data || [];
    state.equipment = eRes.data || [];
    const cats = catRes.data || [];
    state.storeCategories = cats;
    // Carrega itens de cada categoria
    const itemsByCat = {};
    await Promise.all(cats.map(async c => {
      const { data } = await client.rpc('store_list_items', { p_category_id: c.id });
      itemsByCat[c.id] = data || [];
    }));
    state.storeItemsByCategory = itemsByCat;
  }
}

function loadDemoData() {
  if (state.demoRole === 'admin') {
    state.players = demoData.players; state.summary = demoData.summary;
    state.storeCategories = demoData.storeCategories;
    state.storeItemsByCategory = demoData.storeItems;
  } else {
    const pv = parseInt(params.get('preview'), 10);
    const lvl = (pv >= 1 && pv <= 3) ? pv : demoData.playerState.kitchen_level;
    state.playerState = Object.assign({}, demoData.playerState, { kitchen_level: lvl });
    state.storeCategories = demoData.storeCategories;
    state.storeItemsByCategory = demoData.storeItems;
    state.missions = demoData.missions; state.orders = demoData.orders;
    state.equipment = demoData.equipment; state.comments = demoData.comments;
    state.lastRecipe = demoData.lastRecipe;
  }
}

// ========== AÇÕES ==========
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
      if (state.selectedMissionId === id) { state.selectedMissionId = null; state.recipe = null; render(); return; }
      state.selectedMissionId = id; state.recipe = null;
      if (isDemoActive()) { state.recipe = demoData.recipe; }
      else { const { data } = await client.from('mission_recipes').select('*').eq('mission_id', id).maybeSingle(); state.recipe = data || null; }
      render(); return;
    }
    if (action === 'select-option') {
      const key = el.dataset.item || el.dataset.reward;
      state.selectedOptionByReward[key] = el.dataset.option;
      render(); return;
    }
    if (action === 'show-balance') { state.showPurchaseModal = !state.showPurchaseModal; render(); return; }
    if (action === 'close-modal') { state.showPurchaseModal = false; render(); return; }

    // ADMIN LOJA
    if (action === 'admin-store-tab') {
      state.adminStoreTab = el.dataset.tab;
      state.editingCategory = null; state.editingItem = null;
      render(); return;
    }
    if (action === 'edit-category') {
      const id = el.dataset.id;
      const cat = (state.storeCategories || []).find(c => c.id === id);
      if (cat) { state.editingCategory = cat; state.adminStoreTab = 'add-cat'; render(); }
      return;
    }
    if (action === 'delete-category') {
      const id = el.dataset.id;
      if (!confirm('Excluir esta categoria e todos os itens?')) return;
      if (isDemoActive()) {
        state.storeCategories = state.storeCategories.filter(c => c.id !== id);
        delete state.storeItemsByCategory[id];
        render(); toast('Categoria excluída (demo).', 'ok'); return;
      }
      const { error } = await client.rpc('admin_store_delete_category', { p_id: id });
      if (error) throw error;
      await refreshData(); render(); toast('Categoria excluída.', 'ok'); return;
    }
    if (action === 'save-category') {
      const id = el.dataset.id || null;
      const payload = {
        p_id: id || null,
        p_code: $('#cat-code').value.trim(),
        p_name: $('#cat-name').value.trim(),
        p_emoji: $('#cat-emoji').value.trim() || '🔹',
        p_min_price: parseInt($('#cat-min').value, 10) || 15,
        p_max_price: parseInt($('#cat-max').value, 10) || 30,
        p_level_required: parseInt($('#cat-level').value, 10) || 2,
        p_active: $('#cat-active').checked
      };
      if (!payload.p_code || !payload.p_name) { toast('Preencha código e nome.', 'error'); return; }
      if (isDemoActive()) {
        if (id) {
          const cat = state.storeCategories.find(c => c.id === id);
          if (cat) Object.assign(cat, payload);
        } else {
          state.storeCategories.push({ id: 'c' + Date.now(), ...payload });
        }
        render(); toast('Categoria salva (demo).', 'ok'); return;
      }
      const { data, error } = await client.rpc('admin_store_save_category', payload);
      if (error) throw error;
      await refreshData(); state.adminStoreTab = 'manage'; render(); toast('Categoria salva.', 'ok'); return;
    }
    if (action === 'edit-item') {
      const id = el.dataset.id;
      for (const catId in state.storeItemsByCategory) {
        const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === id);
        if (item) { state.editingItem = item; state.adminStoreTab = 'add-item'; render(); return; }
      }
      return;
    }
    if (action === 'delete-item') {
      const id = el.dataset.id;
      if (!confirm('Excluir este item?')) return;
      if (isDemoActive()) {
        for (const catId in state.storeItemsByCategory) {
          state.storeItemsByCategory[catId] = (state.storeItemsByCategory[catId] || []).filter(i => i.id !== id);
        }
        render(); toast('Item excluído (demo).', 'ok'); return;
      }
      const { error } = await client.rpc('admin_store_delete_item', { p_id: id });
      if (error) throw error;
      await refreshData(); render(); toast('Item excluído.', 'ok'); return;
    }
    if (action === 'add-option') {
      const editor = $('#options-editor');
      if (editor) {
        const idx = editor.children.length;
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = '<input class="input" data-opt-id="' + idx + '" placeholder="id" /><input class="input" data-opt-label="' + idx + '" placeholder="label" /><input class="input" data-opt-emoji="' + idx + '" placeholder="🔹" /><button class="btn-icon" data-action="remove-opt" data-idx="' + idx + '">✕</button>';
        editor.appendChild(row);
      }
      return;
    }
    if (action === 'remove-opt') {
      const idx = el.dataset.idx;
      const row = document.querySelector('[data-opt-id="' + idx + '"]')?.parentElement;
      if (row) row.remove();
      return;
    }
    if (action === 'save-item') {
      const id = el.dataset.id || null;
      const categoryId = $('#item-cat').value;
      // Coleta opções
      const optRows = document.querySelectorAll('.option-row');
      const options = [];
      optRows.forEach(row => {
        const oid = row.querySelector('[data-opt-id]')?.value?.trim();
        const label = row.querySelector('[data-opt-label]')?.value?.trim();
        const emoji = row.querySelector('[data-opt-emoji]')?.value?.trim() || '🔹';
        if (oid && label) options.push({ id: oid, label, emoji });
      });
      const payload = {
        p_id: id || null,
        p_category_id: categoryId,
        p_code: $('#item-code').value.trim(),
        p_name: $('#item-name').value.trim(),
        p_description: $('#item-desc').value.trim(),
        p_emoji: $('#item-emoji').value.trim() || '🔹',
        p_image_url: $('#item-image').value.trim(),
        p_base_price: parseInt($('#item-price').value, 10) || 15,
        p_permanent_price: $('#item-perm').value ? parseInt($('#item-perm').value, 10) : null,
        p_reward_type: $('#item-type').value,
        p_requires_approval: $('#item-approval').checked,
        p_is_suggestion: $('#item-suggestion').checked,
        p_active: $('#item-active').checked
      };
      if (!payload.p_code || !payload.p_name || !categoryId) { toast('Preencha código, nome e categoria.', 'error'); return; }
      if (isDemoActive()) {
        if (id) {
          for (const catId in state.storeItemsByCategory) {
            const item = state.storeItemsByCategory[catId].find(i => i.id === id);
            if (item) Object.assign(item, payload, { options });
          }
        } else {
          if (!state.storeItemsByCategory[categoryId]) state.storeItemsByCategory[categoryId] = [];
          state.storeItemsByCategory[categoryId].push({ id: 'i' + Date.now(), ...payload, options });
        }
        render(); toast('Item salvo (demo).', 'ok'); return;
      }
      const { data: itemId, error } = await client.rpc('admin_store_save_item', payload);
      if (error) throw error;
      if (options.length && itemId) {
        const { error: optErr } = await client.rpc('admin_store_save_options', { p_item_id: itemId, p_options: options });
        if (optErr) throw optErr;
      }
      await refreshData(); state.adminStoreTab = 'manage'; render(); toast('Item salvo.', 'ok'); return;
    }

    // PLAYER: pedir recompensa
    if (action === 'request-reward') {
      const itemId = el.dataset.item;
      const catId = el.dataset.cat;
      const cat = (state.storeCategories || []).find(c => c.id === catId);
      const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === itemId);
      if (!item || !cat) { toast('Item não encontrado.', 'error'); return; }
      const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
      if (ps.points_balance < item.base_price) { toast('Pontos insuficientes!', 'error'); return; }
      const selectedOptId = state.selectedOptionByReward[itemId];
      if (!selectedOptId) { toast('Selecione uma opção.', 'error'); return; }
      const selectedOpt = (item.options || []).find(o => o.id === selectedOptId);
      if (!selectedOpt) { toast('Opção inválida.', 'error'); return; }
      const isSuggestion = item.is_suggestion || item.base_price > cat.max_price;
      const note = (isSuggestion ? 'SUGESTÃO ' : '') + 'Opção: ' + selectedOpt.label;
      if (isDemoActive()) { toast('Demo: pedido enviado! Opção: ' + selectedOpt.label, 'ok'); return; }
      const { error } = await client.rpc('player_request_reward', { p_reward_code: item.code, p_note: note, p_mode: null });
      if (error) throw error;
      await refreshData(); state.tab = 'orders'; render();
      toast('⚠️ Item deve ser usado em 3 receitas! Pedido enviado.', 'ok'); return;
    }

    // ADMIN: outras ações
    if (action === 'admin-refresh') { await refreshData(); render(); toast('Dados atualizados.', 'ok'); return; }
    if (action === 'load-example') { $('#import-json').value = JSON.stringify(exampleMissionPayload(), null, 2); return; }
    if (action === 'admin-import') {
      const playerId = $('#import-player').value;
      if (!playerId) throw new Error('Selecione um jogador.');
      const raw = $('#import-json').value.trim();
      if (!raw) throw new Error('Cole o JSON.');
      let payload; try { payload = JSON.parse(raw); } catch (_) { throw new Error('JSON inválido.'); }
      payload.player_id = playerId;
      if (isDemoActive()) { toast('Demo: missão importada.', 'ok'); return; }
      const { data, error } = await client.rpc('admin_import_mission', { payload });
      if (error) throw error;
      await refreshData(); render(); toast('Missão importada.', 'ok'); return;
    }
    if (action === 'admin-approve') {
      const id = el.dataset.id;
      if (isDemoActive()) { toast('Demo: aprovado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_reward_order', { p_order_id: id, p_approve: true, p_note: null, p_mission_id: null });
      if (error) throw error;
      await refreshData(); render(); toast('Aprovado.', 'ok'); return;
    }
    if (action === 'admin-reject') {
      const id = el.dataset.id;
      if (isDemoActive()) { toast('Demo: recusado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_reward_order', { p_order_id: id, p_approve: false, p_note: null, p_mission_id: null });
      if (error) throw error;
      await refreshData(); render(); toast('Recusado.', 'ok'); return;
    }
    if (action === 'admin-adjust') {
      const playerId = $('#adjust-player').value;
      const delta = parseInt($('#adjust-delta').value, 10);
      const reason = $('#adjust-reason').value.trim();
      if (!playerId || !delta || !reason) { toast('Preencha tudo.', 'error'); return; }
      if (isDemoActive()) { toast('Demo: ajuste registrado.', 'ok'); return; }
      const { error } = await client.rpc('admin_adjust_points', { p_player_id: playerId, p_delta: delta, p_reason: reason });
      if (error) throw error;
      await refreshData(); render(); toast('Ajuste registrado.', 'ok'); return;
    }
    if (action === 'admin-export') {
      if (isDemoActive()) { state.exportJson = JSON.stringify(demoData.summary, null, 2); render(); return; }
      const { data, error } = await client.rpc('admin_export_summary');
      if (error) throw error;
      state.exportJson = JSON.stringify(data, null, 2); render(); toast('Resumo gerado.', 'ok'); return;
    }
    if (action === 'copy-export') {
      const text = state.exportJson || ($('#export-json') ? $('#export-json').value : '');
      if (!text) { toast('Gere o resumo primeiro.', 'error'); return; }
      try { await navigator.clipboard.writeText(text); toast('Copiado.', 'ok'); } catch (_) { toast('Erro ao copiar.', 'error'); }
      return;
    }
    if (action === 'submit-comment') {
      const email = $('#comment-email').value.trim();
      const message = $('#comment-message').value.trim();
      if (!email || !message) { toast('Preencha tudo.', 'error'); return; }
      if (isDemoActive()) { state.comments.unshift({ id: 'c' + Date.now(), email, message, created_at: new Date().toISOString() }); render(); toast('Comentário enviado! (demo)', 'ok'); return; }
      const { error } = await client.from('visitor_comments').insert({ email, message });
      if (error) throw error;
      await refreshData(); render(); toast('Comentário enviado!', 'ok'); return;
    }
  } catch (err) { toast(err.message || 'Erro na ação.', 'error'); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return; doAction(el.dataset.action, el);
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'comment-form') { e.preventDefault(); doAction('submit-comment', e.target); }
});
signoutBtn.addEventListener('click', () => doAction('logout', signoutBtn));

async function init() {
  if (forceDemo) { loadDemoData(); render(); return; }
  if (!configured) { loadDemoData(); render(); return; }
  if (!client) { toast('Erro ao carregar Supabase.', 'error'); return; }
  try {
    await bootRealSession();
    client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { state.user = null; state.profile = null; state.role = null; render(); } });
  } catch (err) { toast('Erro ao iniciar: ' + err.message, 'error'); render(); }
}
init();
})();
