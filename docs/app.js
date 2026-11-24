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
  lastRecipe: null, selectedOptionByReward: {},
  storeCategories: [], storeItemsByCategory: {},
  adminStoreTab: 'manage', editingItem: null,
  cart: [], showCartModal: false, openCategoryInStore: null,
  pointsHistory: [], scoring: null, pendingStoreOrders: []
};

const demoData = {
  playerState: { points_balance: 45, kitchen_level: 2, last_rating: null },
  equipment: [{ equipment_code: 'batedeira', mode: 'temporary', status: 'active', acquired_at: '2026-11-21T10:00:00-03:00' }],
  storeCategories: [
    { id: 'c1', code: 'confeitos', name: '🍬 Confeitos', emoji: '🍬', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c2', code: 'temperos-basicos', name: '🧂 Temperos Básicos', emoji: '🧂', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c3', code: 'cremes-molhos', name: '🥛 Cremes e Molhos', emoji: '🥛', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c4', code: 'proteinas', name: '🥩 Proteínas', emoji: '🥩', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c5', code: 'utensilios-eletricos', name: '⚙️ Utensílios Elétricos', emoji: '⚙️', min_price: 75, max_price: 150, level_required: 3, active: true }
  ],
  storeItems: {
    'c1': [{ id: 'i1', code: 'confeitos-coloridos', name: 'Confeitos Coloridos', description: 'Para decorar bolos e biscoitos', emoji: '⭐', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [{ id: 'estrela', label: 'Estrelas', emoji: '⭐' }, { id: 'coracao', label: 'Corações', emoji: '❤️' }, { id: 'flor', label: 'Flores', emoji: '🌸' }] }],
    'c2': [{ id: 'i2', code: 'temperos-basicos', name: 'Temperos Básicos', description: 'Sal, pimenta e ervas', emoji: '🧂', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [{ id: 'sal', label: 'Sal fino', emoji: '🧂' }, { id: 'pimenta', label: 'Pimenta', emoji: '🌶️' }, { id: 'cebolinha', label: 'Cebolinha', emoji: '🌿' }] }],
    'c3': [{ id: 'i3', code: 'cremes-molhos', name: 'Cremes e Molhos', description: 'Creme, ganache, caramelo', emoji: '🥛', image_url: '', base_price: 18, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [{ id: 'creme', label: 'Creme de leite', emoji: '🥛' }, { id: 'ganache', label: 'Ganache', emoji: '🍫' }, { id: 'caramelo', label: 'Caramelo', emoji: '🍯' }] }],
    'c4': [{ id: 'i4', code: 'proteinas', name: 'Proteínas', description: 'Frango, carne, peixe', emoji: '🥩', image_url: '', base_price: 25, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [{ id: 'frango', label: 'Frango', emoji: '🍗' }, { id: 'carne', label: 'Carne', emoji: '🥩' }, { id: 'peixe', label: 'Peixe', emoji: '🐟' }] }],
    'c5': [{ id: 'i5', code: 'utensilio-eletrico', name: 'Utensílio Elétrico', description: 'Só aluguel, nível 3', emoji: '⚙️', image_url: '', base_price: 75, reward_type: 'equipment', requires_approval: true, is_suggestion: false, active: true, options: [{ id: 'batedeira', label: 'Batedeira', emoji: '⚙️' }, { id: 'liquidificador', label: 'Liquidificador', emoji: '🥤' }] }]
  },
  missions: [{ id: 'm1', title: 'Bolo de chocolate com calda', kind: 'recipe', points_delta: 15, rating: 17, occurred_at: '2026-11-21T14:30:00-03:00', feedback: 'Massa fofinha! Lembre-se de peneirar a farinha.' }],
  orders: [{ id: 'o1', reward_name: 'Confeitos Coloridos', selected_option_label: 'Estrelas ⭐', requested_price: 15, status: 'pending', created_at: '2026-11-21T15:00:00-03:00', recipes_remaining: 3 }],
  players: [{ player_id: 'demo-klara', display_name: 'Klara', points_balance: 45, kitchen_level: 2, last_rating: 17 }],
  summary: { pending_orders: [], recent_missions: [], active_equipment: [] },
  pointsHistory: [
    { created_at: '2026-11-21T14:30:00-03:00', delta: 15, reason: 'Missão: Bolo de chocolate com calda' },
    { created_at: '2026-11-21T14:30:00-03:00', delta: 3, reason: 'Bônus sugestão do Chefe Triix (prato novo)' },
    { created_at: '2026-11-20T10:00:00-03:00', delta: -18, reason: 'Resgate loja: Ganache 🍫' }
  ],
  pendingStoreOrders: [{ order_id: 'o1', player_name: 'Klara', item_name: 'Confeitos Coloridos', option_label: 'Estrelas ⭐', price: 15, created_at: '2026-11-21T15:00:00-03:00' }],
  scoring: {
    criteria: [{ id: 1, label: 'Execução da receita', max_points: 8, active: true }, { id: 2, label: 'Organização e limpeza', max_points: 4, active: true }, { id: 3, label: 'Segurança', max_points: 4, active: true }, { id: 4, label: 'Criatividade e feedback', max_points: 4, active: true }],
    rules: [{ id: 1, from_level: 3, to_level: 2, required_avg: 12, required_recipes: 3 }, { id: 2, from_level: 2, to_level: 1, required_avg: 16, required_recipes: 5 }],
    players: [{ player_id: 'demo-klara', display_name: 'Klara', kitchen_level: 2, avg: 17, count: 1 }]
  },
  recipe: {
    recipe: { title: 'Bolo de chocolate com calda', yield: '1 bolo médio', steps: [{ order: 1, text: 'Adulto preaquece o forno a 180 °C.' }] },
    tips: ['Peneire a farinha.', 'Confirme se é achocolatado ou cacau.'],
    ingredients: [{ item: 'ovos', quantity: '2', unit: 'unidade' }], products: [], equipment: ['tigela grande']
  },
  lastRecipe: { title: 'Bolo de chocolate', ingredients: ['ovos', 'açúcar', 'leite'] }
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
  'batedeira': { icon: '⚙️', name: 'Batedeira' }, 'liquidificador': { icon: '🥤', name: 'Liquidificador' },
  'micro-ondas': { icon: '⏲️', name: 'Micro-ondas' }, 'airfryer': { icon: '🍟', name: 'Airfryer' }
};

const $ = (s) => document.querySelector(s);
const view = $('#view');
const toastEl = $('#toast');
const userBadge = $('#user-badge');
const signoutBtn = $('#signout-btn');
const cartBtn = $('#cart-btn');
const cartCountEl = $('#cart-count');

function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function toast(msg, type) { toastEl.textContent = msg; toastEl.className = 'toast ' + (type || ''); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.add('hidden'), 3500); }
function fmtDate(v) { if (!v) return ''; try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); } catch (_) { return String(v); } }
function kitchenInfo(level) { if (level === 1) return { name: 'Cozinha Master', emoji: '✨' }; if (level === 3) return { name: 'Cozinha de Campanha', emoji: '🛠️' }; return { name: 'Cozinha Padrão', emoji: '🍳' }; }
function kitchenBase(level) {
  if (level === 1) return { wall: ['🪴', '🖼️', '✨'], items: [{ icon: '🍳', name: 'Fogão 6 bocas' }, { icon: '🧊', name: 'Geladeira inox' }, { icon: '🥣', name: 'Tigelas' }, { icon: '🥄', name: 'Colher de pau' }] };
  if (level === 3) return { wall: ['🕸️', '🩹'], items: [{ icon: '🍳', name: 'Fogão 2 bocas' }, { icon: '🥣', name: '1 tigela' }, { icon: '🥄', name: '1 colher' }] };
  return { wall: ['🕐', '🧂'], items: [{ icon: '🍳', name: 'Fogão 4 bocas' }, { icon: '🧊', name: 'Geladeira' }, { icon: '🥣', name: 'Tigela' }, { icon: '🥄', name: 'Colher de pau' }] };
}
function renderKitchenScene(level, equipment) {
  const base = kitchenBase(level);
  const wall = base.wall.map(w => '<span>' + w + '</span>').join('');
  const items = base.items.map(i =>
    '<div class="utensil"><span class="icon">' + i.icon + '</span><span class="name">' + esc(i.name) + '</span></div>'
  ).join('');
  const extra = (equipment || []).map(e => {
    const meta = EQUIP_META[e.equipment_code] || { icon: '🔌', name: e.equipment_code };
    let tag = '', cls = '';
    if (level === 3) { tag = '<span class="tag locked">Bloqueado</span>'; cls = ' locked'; }
    else if (e.mode === 'temporary') { tag = '<span class="tag rent">Alugado</span>'; }
    else if (level === 1) { tag = '<span class="tag own">Seu!</span>'; }
    else { tag = '<span class="tag locked">Guardado</span>'; cls = ' locked'; }
    return '<div class="utensil equip' + cls + '"><span class="icon">' + meta.icon + '</span><span class="name">' + esc(meta.name) + '</span>' + tag + '</div>';
  }).join('');

  // Lista de utensílios disponíveis (sem os bloqueados)
  const availableItems = base.items.map(i => i.name).join(', ');
  const availableEquips = (equipment || [])
    .filter(e => !(level === 3 && e.mode === 'temporary') && !(e.mode === 'permanent' && level !== 1))
    .map(e => {
      const meta = EQUIP_META[e.equipment_code] || { name: e.equipment_code };
      return meta.name;
    })
    .join(', ');
  const availableList = [availableItems, availableEquips].filter(s => s).join(' • ');

  return '<div class="kitchen-scene"><div class="kitchen-wall">' + wall + '</div><div class="kitchen-counter">' + items + extra + '</div>' +
    '<div style="padding:10px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)">' +
    '<strong>✅ Disponíveis para receitas:</strong> ' + (availableList || 'Nenhum') + '</div></div>';
}
function setKitchen(level) { document.body.classList.remove('kitchen-1', 'kitchen-2', 'kitchen-3'); document.body.classList.add('kitchen-' + (level || 2)); }
function isDemoActive() { return state.demo && state.demoRole; }
function activeRole() { return isDemoActive() ? state.demoRole : state.role; }
function updateCartBadge() { const c = state.cart.length; if (c > 0) { cartCountEl.textContent = c; cartCountEl.style.display = 'inline-flex'; } else { cartCountEl.style.display = 'none'; } }

function render() {
  const role = activeRole();
  document.body.classList.toggle('login-mode', !role);
  if (!role) { renderLogin(); return; }
  userBadge.classList.remove('hidden'); signoutBtn.classList.remove('hidden');
  const name = isDemoActive() ? (role === 'admin' ? 'Douglas • demo' : 'Klara • demo') : (state.profile?.display_name || state.user?.email || 'Usuário');
  userBadge.textContent = name + (role === 'admin' ? ' • admin' : ' • jogador');
  if (role === 'admin') { cartBtn.classList.add('hidden'); } else { cartBtn.classList.remove('hidden'); updateCartBadge(); }
  renderApp();
}

function renderLogin() {
  userBadge.classList.add('hidden');
  signoutBtn.classList.add('hidden');
  setKitchen(2);
  const floats = LOGIN_FLOATS.map(f =>
    '<span class="float-item" style="--x:' + f.x + ';--y:' + f.y + ';--s:' + f.s + ';--d:' + f.d + ';--delay:' + f.delay + '">' + f.e + '</span>'
  ).join('');
  const demoButtons = state.demo
    ? '<div class="row mt"><button class="btn secondary" data-action="demo-login" data-role="player">Ver como Klara</button><button class="btn secondary" data-action="demo-login" data-role="admin">Ver como Douglas</button></div>'
    : '';
  const demoNotice = state.demo
    ? '<div class="notice">Modo de demonstração: configure <code class="inline">config.js</code> com a URL e a chave publishable do Supabase para usar dados reais.</div>'
    : '';
  view.innerHTML =
    '<div class="login-float">' + floats + '</div>' +
    '<div class="login-wrap"><div class="card login-card">' +
    '<div class="login-logo-wrap">' +
    '<img class="login-logo-img" src="assets/logo-klara.png" alt="Logo Chef Klara" onerror="this.outerHTML=\'<div style=\\\'font-size:80px;margin-bottom:8px\\\'>🍳</div>\'">' +
    '</div>' +
    '<h2 class="login-title">Game Talk Show</h2>' +
    '<p class="login-sub">Cozinhando com a Klara • Chefe Triix</p>' +
    demoNotice +
    '<form id="login-form">' +
    '<div class="field"><label for="email">E-mail</label><input class="input" id="email" type="email" placeholder="seu@email.com" autocomplete="username" required /></div>' +
    '<div class="field"><label for="password">Senha</label><input class="input" id="password" type="password" placeholder="••••••••" autocomplete="current-password" required /></div>' +
    '<button class="btn" type="submit" style="width:100%;padding:14px;font-size:16px">Entrar</button>' +
    '</form>' +
    demoButtons + '</div></div>';
  const form = $('#login-form');
  if (form) form.addEventListener('submit', onLogin);
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
  if (role === 'admin') return [['dashboard', 'Visão geral'], ['import', 'Importar'], ['orders', 'Pedidos'], ['adjust', 'Ajustar'], ['scoring', 'Pontuação'], ['export', 'Exportar'], ['admin-store', 'Admin Loja']];
  return [['dashboard', 'Cozinha'], ['missions', 'Missões'], ['store', 'Loja'], ['orders', 'Meus Pedidos'], ['points', 'Meus Pontos']];
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
  if (state.tab === 'points') return renderPlayerPoints();
  return renderPlayerDashboard();
}

function renderPlayerDashboard() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const kitchen = kitchenInfo(ps.kitchen_level); setKitchen(ps.kitchen_level);
  const recent = (state.missions || []).slice(0, 3).map(m =>
    '<div class="list-item"><div><div class="title">' + esc(m.title) + '</div><div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div></div><div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' + (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span></div></div>'
  ).join('');
  return '<div class="grid cols-3"><div class="card stat"><span class="muted small">Saldo</span><div style="font-size:28px;font-weight:800">' + esc(ps.points_balance) + ' pts</div></div>' +
    '<div class="card stat"><span class="muted small">Cozinha</span><div style="font-size:22px;font-weight:800">' + kitchen.emoji + ' ' + esc(kitchen.name) + '</div></div>' +
    '<div class="card stat"><span class="muted small">Nível</span><div style="font-size:22px;font-weight:800">' + esc(ps.kitchen_level) + '</div></div></div>' +
    '<div class="card"><h3 style="margin:0">Sua cozinha</h3>' + renderKitchenScene(ps.kitchen_level, state.equipment) + '</div>' +
    '<div class="card"><h3>Últimas missões</h3><div class="list">' + (recent || '<p class="muted">Nenhuma missão ainda.</p>') + '</div></div>';
}

function renderMissions() {
  const items = (state.missions || []).map(m => {
    const isOpen = state.selectedMissionId === m.id;
    const recipeHtml = isOpen && state.recipe ? renderRecipe(state.recipe) : '';
    return '<div class="list-item"><div><div class="title">' + esc(m.title) + '</div><div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div>' + (m.feedback ? '<div class="meta">' + esc(m.feedback) + '</div>' : '') + '</div>' +
      '<div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' + (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span>' +
      '<div class="recipe-toggle" data-action="toggle-recipe" data-id="' + esc(m.id) + '">' + (isOpen ? 'Recolher receita ▲' : 'Ver receita ▼') + '</div></div>' +
      (recipeHtml ? '<div class="recipe-details open">' + recipeHtml + '</div>' : '') + '</div>';
  }).join('');
  return '<div class="card"><h3>Histórico de missões</h3><div class="list">' + (items || '<p class="muted">Nenhuma missão registrada.</p>') + '</div></div>';
}

function renderRecipe(r) {
  const recipe = r.recipe || {};
  const tips = r.tips || [];
  const ingredients = r.ingredients || [];
  const equipment = r.equipment || [];
  return '<div class="chef-feedback"><h4>👨‍🍳 Feedback e Dicas do Chefe Triix</h4><ul>' + (tips.length ? tips.map(t => '<li>' + esc(t) + '</li>').join('') : '<li>Siga os passos com calma!</li>') + '</ul>' +
    '<p class="small muted mt"><strong>Bônus:</strong> seguir sugestão de prato novo garante +3 pontos na avaliação!</p></div>' +
    '<div class="mt"><h4>Ingredientes</h4><ul>' + ingredients.map(i => '<li>' + esc(i.quantity) + ' ' + esc(i.unit) + ' de ' + esc(i.item) + '</li>').join('') + '</ul></div>' +
    (equipment.length ? '<div class="mt"><h4>Utensílios</h4><ul>' + equipment.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '');
}

function renderStore() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  if (ps.kitchen_level === 3) {
    return '<div class="card"><h3>Loja</h3><p class="muted">Na Cozinha de Campanha (Nível 3), o resgate de ingredientes está suspenso. Apenas utensílios elétricos por aluguel, quando a receita exigir.</p></div>';
  }
  const categories = (state.storeCategories || []).filter(c => c.active && c.level_required <= ps.kitchen_level);
  let html = '<div class="card" style="cursor:pointer" data-action="open-cart"><span class="muted small">Saldo disponível</span><div style="font-size:28px;font-weight:800;color:var(--accent)">' + esc(ps.points_balance) + ' pts</div><p class="muted small mt">🛒 Clique no carrinho no topo para finalizar</p></div>';
  html += '<div class="notice ok">⚠️ Itens alimentícios valem para até <strong>3 receitas</strong>. Depois disso, perdem o direito de uso.</div>';
  categories.forEach(cat => {
    const items = (state.storeItemsByCategory[cat.id] || []).filter(i => i.active);
    const isOpen = state.openCategoryInStore === cat.id;
    html += '<div class="store-category"><div class="store-category-header" data-action="toggle-store-cat" data-id="' + esc(cat.id) + '">' +
      '<div class="cat-info"><h4>' + esc(cat.name) + '</h4><div class="cat-meta">Nível ' + esc(cat.level_required) + ' • ' + esc(cat.min_price) + ' a ' + esc(cat.max_price) + ' pts • ' + items.length + ' itens</div></div>' +
      '<div>' + (isOpen ? '▲ Recolher' : '▼ Ver itens') + '</div></div>';
    if (isOpen) {
      html += '<div class="store-items-list">';
      if (!items.length) html += '<p class="muted small">Nenhum item disponível nesta categoria.</p>';
      items.forEach(item => {
        const inCart = state.cart.find(c => c.itemId === item.id);
        const canAfford = ps.points_balance >= item.base_price;
        html += '<div class="store-item-row"><div class="item-info"><div class="item-name">' + esc(item.emoji) + ' ' + esc(item.name) + '</div>' +
          '<div class="item-price">' + esc(item.base_price) + ' pts</div><div class="meta small">' + esc(item.description || '') + '</div></div>' +
          '<div class="item-actions">' + (inCart
            ? '<button class="btn small bad" data-action="remove-from-cart" data-item="' + esc(item.id) + '">Remover</button>'
            : '<button class="btn small" data-action="add-to-cart" data-item="' + esc(item.id) + '" data-cat="' + esc(cat.id) + '" ' + (!canAfford ? 'disabled' : '') + '>' + (canAfford ? '🛒 Adicionar' : 'Pontos insuficientes') + '</button>') +
          '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  if (state.showCartModal) html += renderCartModal(ps);
  return html;
}

function renderCartModal(ps) {
  const cart = state.cart || [];
  const total = cart.reduce((s, c) => s + c.price, 0);
  const canAfford = ps.points_balance >= total;
  const itemsHtml = cart.map(c =>
    '<div class="cart-item"><div class="ci-info"><div class="ci-name">' + esc(c.emoji) + ' ' + esc(c.name) + '</div><div class="ci-cat">' + esc(c.categoryName) + '</div></div>' +
    '<div class="ci-price">' + esc(c.price) + ' pts</div><button class="btn small bad" data-action="remove-from-cart" data-item="' + esc(c.itemId) + '">✕</button></div>'
  ).join('');
  return '<div class="modal-overlay"><div class="modal-content"><h3>🛒 Seu Carrinho</h3>' +
    '<div class="cart-warning">⚠️ Itens alimentícios têm validade para usar em até <strong>3 receitas</strong>. Uma vez usado, o item perde o direito de uso.</div>' +
    '<div style="margin-top:12px">' + (itemsHtml || '<p class="muted">Carrinho vazio.</p>') + '</div>' +
    (cart.length ? '<div class="cart-total"><span>Total:</span><span>' + esc(total) + ' pts' + (canAfford ? '' : ' <span class="pill bad">Saldo insuficiente</span>') + '</span></div>' +
      '<div class="modal-actions"><button class="btn secondary" data-action="close-cart">Continuar comprando</button>' +
      '<button class="btn good" data-action="finalize-cart" ' + (!canAfford ? 'disabled' : '') + '>Finalizar pedido</button></div>'
      : '<div class="modal-actions"><button class="btn" data-action="close-cart">Fechar</button></div>') +
    '</div></div>';
}

function renderPlayerOrders() {
  const orders = state.orders || [];
  const pending = orders.filter(o => o.status === 'pending');
  const approved = orders.filter(o => o.status === 'approved');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const renderList = (list) => list.length ? list.map(o =>
    '<div class="list-item"><div><div class="title">' + esc(o.reward_name || 'Item') + '</div>' +
    (o.selected_option_label ? '<div class="meta">' + esc(o.selected_option_label) + '</div>' : '') +
    (o.recipes_remaining !== undefined && o.recipes_remaining !== null ? '<div class="meta">⏰ Usar em ' + esc(o.recipes_remaining) + ' receitas</div>' : '') +
    '<div class="meta">' + esc(fmtDate(o.created_at)) + ' • ' + esc(o.requested_price) + ' pts</div></div>' +
    '<div class="right"><span class="pill ' + (o.status === 'approved' ? 'good' : o.status === 'cancelled' ? 'bad' : 'warn') + '">' +
    esc(o.status === 'approved' ? 'Aprovado' : o.status === 'cancelled' ? 'Cancelado' : 'Aguardando') + '</span></div></div>'
  ).join('') : '<p class="muted small">Nenhum registro.</p>';
  const equipList = (state.equipment || []).length ? (state.equipment || []).map(e => {
    const meta = EQUIP_META[e.equipment_code] || { name: e.equipment_code };
    return '<div class="list-item"><div><div class="title">' + esc(meta.name) + '</div><div class="meta">Adquirido: ' + esc(fmtDate(e.acquired_at)) + ' • ' + esc(e.mode) + '</div></div><div class="right"><span class="pill info">Ativo</span></div></div>';
  }).join('') : '<p class="muted small">Nenhum utensílio.</p>';
  return '<div class="card"><h3>Meus Pedidos</h3>' +
    '<div class="order-category"><h4>⏳ Aguardando</h4><div class="list">' + renderList(pending) + '</div></div>' +
    '<div class="order-category"><h4>✅ Aprovados</h4><div class="list">' + renderList(approved) + '</div></div>' +
    '<div class="order-category"><h4>❌ Cancelados</h4><div class="list">' + renderList(cancelled) + '</div></div>' +
    '<div class="order-category"><h4>🍳 Utensílios</h4><div class="list">' + equipList + '</div></div></div>';
}

function renderPlayerPoints() {
  const hist = state.pointsHistory || [];
  const rows = hist.map(h =>
    '<div class="list-item"><div><div class="title">' + esc(h.reason || 'Ajuste') + '</div><div class="meta">' + esc(fmtDate(h.created_at)) + '</div></div>' +
    '<div class="right"><span class="pill ' + (h.delta >= 0 ? 'good' : 'bad') + '">' + (h.delta >= 0 ? '+' : '') + esc(h.delta) + ' pts</span></div></div>'
  ).join('');
  const extras = hist.filter(h => h.delta > 0 && /bônus|sugest/i.test(h.reason || ''));
  return '<div class="card"><h3>Meus Pontos</h3>' +
    '<p class="muted small">Todo ponto que você ganhou ou gastou, com a descrição. Bônus de sugestão do Chefe Triix aparecem destacados!</p>' +
    (extras.length ? '<div class="notice ok">⭐ Você tem ' + extras.length + ' bônus de sugestão! Cada prato novo seguido rende +3 pts.</div>' : '') +
    '<div class="list mt">' + (rows || '<p class="muted">Nenhum lançamento ainda.</p>') + '</div></div>';
}

function renderAdmin() {
  if (state.tab === 'import') return renderAdminImport();
  if (state.tab === 'orders') return renderAdminOrders();
  if (state.tab === 'adjust') return renderAdminAdjust();
  if (state.tab === 'scoring') return renderAdminScoring();
  if (state.tab === 'export') return renderAdminExport();
  if (state.tab === 'admin-store') return renderAdminStore();
  return renderAdminDashboard();
}
function playerNameById(id) { const p = (state.players || []).find(x => x.player_id === id); return p ? p.display_name : id; }

function renderAdminDashboard() {
  const players = state.players || [];
  const summary = state.summary || {};
  const pending = (state.pendingStoreOrders || []).length ? state.pendingStoreOrders : (summary.pending_orders || []);
  const recent = summary.recent_missions || [];
  const playerRows = players.map(p => '<tr><td>' + esc(p.display_name) + '</td><td>' + esc(p.points_balance) + '</td><td>' + esc(p.kitchen_level) + '</td><td>' + (p.last_rating == null ? '—' : esc(p.last_rating)) + '</td></tr>').join('');
  return '<div class="grid cols-3"><div class="card stat"><span class="label">Jogadores</span><span class="value">' + players.length + '</span></div><div class="card stat"><span class="label">Pedidos pendentes</span><span class="value">' + pending.length + '</span></div><div class="card stat"><span class="label">Missões</span><span class="value">' + recent.length + '</span></div></div>' +
    '<div class="card"><table class="table mt"><thead><tr><th>Nome</th><th>Pontos</th><th>Cozinha</th><th>Nota</th></tr></thead><tbody>' + (playerRows || '<tr><td colspan="4">Nenhum jogador.</td></tr>') + '</tbody></table></div>';
}

function renderAdminScoring() {
  const sc = state.scoring || demoData.scoring;
  const critRows = (sc.criteria || []).map((c, i) =>
    '<div class="scoring-row"><input class="input" data-c-label="' + i + '" value="' + esc(c.label) + '" />' +
    '<input class="input" data-c-max="' + i + '" type="number" value="' + esc(c.max_points) + '" />' +
    '<label class="small"><input type="checkbox" data-c-active="' + i + '" ' + (c.active ? 'checked' : '') + ' /> ativo</label></div>'
  ).join('');
  const ruleRows = (sc.rules || []).map((r, i) =>
    '<div class="scoring-row"><select class="input" data-r-from="' + i + '"><option value="3" ' + (r.from_level === 3 ? 'selected' : '') + '>Nível 3</option><option value="2" ' + (r.from_level === 2 ? 'selected' : '') + '>Nível 2</option></select>' +
    '<select class="input" data-r-to="' + i + '"><option value="2" ' + (r.to_level === 2 ? 'selected' : '') + '>→ 2</option><option value="1" ' + (r.to_level === 1 ? 'selected' : '') + '>→ 1</option></select>' +
    '<div class="small muted">média</div></div>' +
    '<div class="scoring-row"><input class="input" data-r-avg="' + i + '" type="number" step="0.5" value="' + esc(r.required_avg) + '" />' +
    '<input class="input" data-r-rec="' + i + '" type="number" value="' + esc(r.required_recipes) + '" /><span class="small muted">receitas</span></div>'
  ).join('');
  const totalMax = (sc.criteria || []).filter(c => c.active).reduce((s, c) => s + (c.max_points || 0), 0);
  const playerRows = (sc.players || []).map(p =>
    '<tr><td>' + esc(p.display_name) + '</td><td>Nível ' + esc(p.kitchen_level) + '</td><td>' + (p.avg == null ? '—' : esc(p.avg)) + '</td><td>' + esc(p.count || 0) + '</td>' +
    '<td><button class="btn small secondary" data-action="apply-level" data-id="' + esc(p.player_id) + '">Recalcular nível</button></td></tr>'
  ).join('');
  return '<div class="card"><h3>Critérios de avaliação por receita</h3>' +
    '<p class="muted small">Total máximo atual: <strong>' + totalMax + ' pts</strong> + bônus sugestão (+3). A nota da receita define os pontos ganhos.</p>' +
    '<div class="scoring-row"><span class="small muted">Critério</span><span class="small muted">Máx pts</span><span class="small muted">Ativo</span></div>' +
    critRows + '</div>' +
    '<div class="card"><h3>Regras de promoção de nível</h3>' + ruleRows + '</div>' +
    '<div class="card"><h3>Situação dos jogadores</h3><table class="table"><thead><tr><th>Nome</th><th>Nível</th><th>Média (5 últ.)</th><th>Receitas</th><th></th></tr></thead><tbody>' + (playerRows || '<tr><td colspan="5">Nenhum jogador.</td></tr>') + '</tbody></table></div>' +
    '<div class="row"><button class="btn" data-action="save-scoring">Salvar configuração</button></div>';
}

function renderAdminStore() {
  const categories = state.storeCategories || [];
  const subTabs = [['manage', 'Gerenciar'], ['add-cat', 'Nova Categoria']];
  const tabsHtml = subTabs.map(([id, label]) => '<button class="tab ' + (state.adminStoreTab === id ? 'active' : '') + '" data-action="admin-store-tab" data-tab="' + id + '">' + esc(label) + '</button>').join('');
  let content = '';
  if (state.adminStoreTab === 'manage') {
    content = categories.map(cat => {
      const items = state.storeItemsByCategory[cat.id] || [];
      const itemsHtml = items.map(item =>
        '<div class="admin-item-mini"><div><div class="item-name">' + esc(item.emoji) + ' ' + esc(item.name) + (item.active ? '' : ' <span class="pill muted">inativo</span>') + '</div><div class="item-price">' + esc(item.base_price) + ' pts</div></div>' +
        '<div class="item-actions"><button class="btn small secondary" data-action="toggle-item" data-id="' + esc(item.id) + '">' + (item.active ? 'Desativar' : 'Ativar') + '</button>' +
        '<button class="btn small secondary" data-action="edit-item" data-id="' + esc(item.id) + '">Editar</button>' +
        '<button class="btn small bad" data-action="delete-item" data-id="' + esc(item.id) + '">Excluir</button></div></div>'
      ).join('');
      return '<div class="admin-cat-card"><div class="admin-cat-header"><div><h4>' + esc(cat.name) + (cat.active ? '' : ' <span class="pill muted">inativa</span>') + '</h4><div class="admin-cat-meta">Nível ' + esc(cat.level_required) + ' • ' + esc(cat.min_price) + ' a ' + esc(cat.max_price) + ' pts • ' + items.length + ' itens</div></div>' +
        '<div class="row"><button class="btn small secondary" data-action="toggle-cat" data-id="' + esc(cat.id) + '">' + (cat.active ? 'Desativar' : 'Ativar') + '</button><button class="btn small secondary" data-action="edit-category" data-id="' + esc(cat.id) + '">Editar</button><button class="btn small bad" data-action="delete-category" data-id="' + esc(cat.id) + '">Excluir</button></div></div>' +
        '<div class="admin-items-scroll">' + (itemsHtml || '<p class="muted small">Sem itens.</p>') + '</div>' +
        '<div class="mt"><button class="btn small" data-action="add-item-to-cat" data-cat="' + esc(cat.id) + '">+ Adicionar item</button></div></div>';
    }).join('');
    if (!categories.length) content = '<div class="card"><p class="muted">Nenhuma categoria.</p></div>';
  } else {
    content = renderCategoryForm();
  }
  return '<div class="tabs">' + tabsHtml + '</div>' + content;
}

function renderCategoryForm(cat) {
  const c = cat || { id: null, code: '', name: '', emoji: '🔹', min_price: 15, max_price: 30, level_required: 2, active: true };
  return '<div class="card"><h3>' + (cat ? 'Editar' : 'Nova') + ' Categoria</h3>' +
    '<div class="field"><label>Código</label><input class="input" id="cat-code" value="' + esc(c.code) + '" /></div>' +
    '<div class="field"><label>Nome</label><input class="input" id="cat-name" value="' + esc(c.name) + '" /></div>' +
    '<div class="field"><label>Emoji</label><input class="input" id="cat-emoji" value="' + esc(c.emoji) + '" /></div>' +
    '<div class="grid cols-2"><div class="field"><label>Preço mínimo</label><input class="input" id="cat-min" type="number" value="' + esc(c.min_price) + '" /></div><div class="field"><label>Preço máximo</label><input class="input" id="cat-max" type="number" value="' + esc(c.max_price) + '" /></div></div>' +
    '<div class="field"><label>Nível</label><select id="cat-level"><option value="1" ' + (c.level_required === 1 ? 'selected' : '') + '>Nível 1</option><option value="2" ' + (c.level_required === 2 ? 'selected' : '') + '>Nível 2</option><option value="3" ' + (c.level_required === 3 ? 'selected' : '') + '>Nível 3</option></select></div>' +
    '<div class="field"><label><input type="checkbox" id="cat-active" ' + (c.active ? 'checked' : '') + ' /> Ativa</label></div>' +
    '<button class="btn" data-action="save-category" data-id="' + esc(c.id || '') + '">Salvar categoria</button></div>';
}

function renderItemForm(item, categoryId) {
  const i = item || { id: null, code: '', name: '', description: '', emoji: '🔹', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [] };
  const opts = i.options || [];
  const optsHtml = opts.map((o, idx) =>
    '<div class="option-row"><input class="input" data-opt-id="' + idx + '" value="' + esc(o.id) + '" placeholder="id" /><input class="input" data-opt-label="' + idx + '" value="' + esc(o.label) + '" placeholder="label" /><input class="input" data-opt-emoji="' + idx + '" value="' + esc(o.emoji) + '" placeholder="🔹" /><button class="btn-icon" data-action="remove-opt" data-idx="' + idx + '">✕</button></div>'
  ).join('');
  return '<h3 style="margin-top:0">' + (item ? 'Editar' : 'Novo') + ' Item</h3>' +
    '<div class="field"><label>Código</label><input class="input" id="item-code" value="' + esc(i.code) + '" /></div>' +
    '<div class="field"><label>Nome</label><input class="input" id="item-name" value="' + esc(i.name) + '" /></div>' +
    '<div class="field"><label>Descrição</label><textarea class="input" id="item-desc" rows="2">' + esc(i.description) + '</textarea></div>' +
    '<div class="field"><label>Emoji</label><input class="input" id="item-emoji" value="' + esc(i.emoji) + '" /></div>' +
    '<div class="field"><label>URL da imagem</label><input class="input" id="item-image" value="' + esc(i.image_url) + '" placeholder="https://..." /></div>' +
    '<div class="field"><label>Preço (pts)</label><input class="input" id="item-price" type="number" value="' + esc(i.base_price) + '" /></div>' +
    '<div class="field"><label>Tipo</label><select id="item-type"><option value="ingredient" ' + (i.reward_type === 'ingredient' ? 'selected' : '') + '>Ingrediente (só temporário)</option><option value="equipment" ' + (i.reward_type === 'equipment' ? 'selected' : '') + '>Equipamento</option></select></div>' +
    '<div class="field"><label><input type="checkbox" id="item-approval" ' + (i.requires_approval ? 'checked' : '') + ' /> Requer aprovação</label></div>' +
    '<div class="field"><label><input type="checkbox" id="item-active" ' + (i.active ? 'checked' : '') + ' /> Ativo</label></div>' +
    '<h4 style="margin:16px 0 8px">Opções</h4><div class="options-editor" id="options-editor">' + optsHtml + '</div>' +
    '<button class="btn small secondary mt" data-action="add-option">+ Adicionar opção</button>' +
    '<div class="modal-actions"><button class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn" data-action="save-item" data-id="' + esc(i.id || '') + '" data-cat="' + esc(categoryId || '') + '">Salvar item</button></div>';
}

function renderAdminImport() {
  const options = (state.players || []).map(p => '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + '</option>').join('');
  return '<div class="card"><h3>Importar missão</h3><p class="muted small">Inclua em points_breakdown o bônus "+3 sugestão" quando ela seguir um prato novo. Informe a nota (rating) de 0 ao máximo dos critérios.</p><div class="field"><label>Jogador</label><select id="import-player">' + (options || '<option value="">Nenhum</option>') + '</select></div><div class="field"><label>JSON</label><textarea id="import-json"></textarea></div><div class="row"><button class="btn secondary" data-action="load-example">Exemplo</button><button class="btn" data-action="admin-import">Importar</button></div></div>';
}

function renderAdminOrders() {
  const pending = state.pendingStoreOrders || [];
  const rows = pending.map(o => '<div class="card"><div class="row"><div><h3 style="margin:0">' + esc(o.item_name) + '</h3><div class="meta muted small">' + esc(o.player_name) + ' • ' + esc(o.option_label || '') + ' • ' + esc(o.price) + ' pts • ' + esc(fmtDate(o.created_at)) + '</div></div><span class="space"></span><span class="pill warn">Pendente</span></div>' +
    '<div class="row mt"><button class="btn good" data-action="approve-store-order" data-id="' + esc(o.order_id) + '">Aprovar</button><button class="btn bad" data-action="reject-store-order" data-id="' + esc(o.order_id) + '">Recusar</button></div></div>').join('');
  return '<div class="notice ok">Aprovar desconta pontos e registra no histórico. Itens aprovados valem por 3 receitas.</div>' + (rows || '<div class="card"><p class="muted">Nenhum pedido pendente.</p></div>');
}

function renderAdminAdjust() {
  const options = (state.players || []).map(p => '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + ' — ' + esc(p.points_balance) + ' pts</option>').join('');
  return '<div class="card"><h3>Ajustar pontos</h3><div class="field"><label>Jogador</label><select id="adjust-player">' + (options || '<option value="">Nenhum</option>') + '</select></div><div class="field"><label>Pontos (+/-)</label><input class="input" id="adjust-delta" type="number" /></div><div class="field"><label>Motivo (aparece para a Klara em "Meus Pontos")</label><input class="input" id="adjust-reason" /></div><button class="btn" data-action="admin-adjust">Salvar</button></div>';
}

function renderAdminExport() {
  return '<div class="card"><h3>Exportar resumo</h3><div class="row"><button class="btn" data-action="admin-export">Gerar</button><button class="btn secondary" data-action="copy-export">Copiar</button></div><div class="field mt"><label>Resumo</label><textarea id="export-json" readonly>' + esc(state.exportJson || '') + '</textarea></div></div>';
}

function exampleMissionPayload() {
  return { mission: { kind: 'recipe', title: 'Nova receita', occurred_at: new Date().toISOString(), feedback: 'Feedback.', rating: 17, points_delta: 20, kitchen_level_after: 2, points_breakdown: [{ label: 'Execução da receita', points: 8 }, { label: 'Organização e limpeza', points: 3 }, { label: 'Segurança', points: 3 }, { label: 'Criatividade e feedback', points: 3 }, { label: 'Bônus sugestão do Chefe Triix', points: 3 }] }, recipe: { title: 'Nova receita', yield: '1', equipment: [], ingredients: [], products: [], steps: [{ order: 1, text: 'Passo 1.' }], safety: [], tips: [] } };
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
    const [pRes, sRes, catRes, scRes, pendRes] = await Promise.all([
      client.rpc('admin_list_players'), client.rpc('admin_export_summary'),
      client.rpc('admin_store_list'), client.rpc('admin_get_scoring'), client.rpc('admin_store_pending')
    ]);
    state.players = pRes.data || [];
    state.summary = sRes.data || { pending_orders: [], recent_missions: [] };
    const cats = catRes.data || [];
    state.storeCategories = cats.map(c => ({ id: c.id, code: c.code, name: c.name, emoji: c.emoji, min_price: c.min_price, max_price: c.max_price, level_required: c.level_required, active: c.active }));
    const itemsByCat = {}; cats.forEach(c => { itemsByCat[c.id] = c.items || []; });
    state.storeItemsByCategory = itemsByCat;
    state.scoring = scRes.data || null;
    state.pendingStoreOrders = pendRes.data || [];
  } else {
    const uid = state.user.id;
    const [psRes, mRes, oRes, eRes, catRes, histRes] = await Promise.all([
      client.from('player_state').select('*').eq('player_id', uid).maybeSingle(),
      client.from('missions').select('*').eq('player_id', uid).order('occurred_at', { ascending: false }).limit(50),
      client.from('reward_orders').select('*').eq('player_id', uid).order('created_at', { ascending: false }),
      client.from('equipment_unlocks').select('*').eq('player_id', uid).eq('status', 'active'),
      client.rpc('store_list_categories', { p_level: state.playerState?.kitchen_level || 2 }),
      client.rpc('player_get_points_history')
    ]);
    state.playerState = psRes.data || { points_balance: 0, kitchen_level: 2 };
    state.missions = mRes.data || [];
    state.orders = oRes.data || [];
    state.equipment = eRes.data || [];
    state.pointsHistory = histRes.data || [];
    const cats = catRes.data || [];
    state.storeCategories = cats;
    const itemsByCat = {};
    // Carrega itens de cada categoria com tratamento de erro
    await Promise.all(cats.map(async c => {
      try {
        const { data } = await client.rpc('store_list_items', { p_category_id: c.id });
        itemsByCat[c.id] = data || [];
      } catch (err) {
        console.warn('Erro ao carregar itens da categoria', c.code, err);
        itemsByCat[c.id] = [];
      }
    }));
    state.storeItemsByCategory = itemsByCat;
  }
}

function loadDemoData() {
  if (state.demoRole === 'admin') {
    state.players = demoData.players; state.summary = demoData.summary;
    state.storeCategories = demoData.storeCategories; state.storeItemsByCategory = demoData.storeItems;
    state.scoring = demoData.scoring; state.pendingStoreOrders = demoData.pendingStoreOrders;
  } else {
    const pv = parseInt(params.get('preview'), 10);
    const lvl = (pv >= 1 && pv <= 3) ? pv : demoData.playerState.kitchen_level;
    state.playerState = Object.assign({}, demoData.playerState, { kitchen_level: lvl });
    state.storeCategories = demoData.storeCategories; state.storeItemsByCategory = demoData.storeItems;
    state.missions = demoData.missions; state.orders = demoData.orders;
    state.equipment = demoData.equipment; state.lastRecipe = demoData.lastRecipe;
    state.pointsHistory = demoData.pointsHistory;
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
      else { const { data } = await client.from('mission_recipes').select('*').eq('mission_id', id).maybeSingle(); state.recipe = data || null; if (!data) toast('Missão sem receita vinculada.', 'error'); }
      render(); return;
    }
    // ===== LOJA / CARRINHO =====
    if (action === 'toggle-store-cat') { state.openCategoryInStore = state.openCategoryInStore === el.dataset.id ? null : el.dataset.id; render(); return; }
    if (action === 'add-to-cart') {
      const itemId = el.dataset.item, catId = el.dataset.cat;
      const cat = (state.storeCategories || []).find(c => c.id === catId);
      const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === itemId);
      if (!item || !cat) { toast('Item não encontrado.', 'error'); return; }
      const ps = state.playerState || { points_balance: 0 };
      const totalCart = state.cart.reduce((s, c) => s + c.price, 0);
      if (ps.points_balance - totalCart < item.base_price) { toast('Pontos insuficientes para este pedido.', 'error'); return; }
      if (state.cart.find(c => c.itemId === itemId)) { toast('Já está no carrinho.', 'error'); return; }
      state.cart.push({ itemId: item.id, categoryId: cat.id, name: item.name, emoji: item.emoji, price: item.base_price, categoryName: cat.name });
      updateCartBadge(); render(); toast('Adicionado ao carrinho!', 'ok'); return;
    }
    if (action === 'remove-from-cart') { state.cart = state.cart.filter(c => c.itemId !== el.dataset.item); updateCartBadge(); render(); return; }
    if (action === 'open-cart') { state.showCartModal = true; render(); return; }
    if (action === 'close-cart') { state.showCartModal = false; render(); return; }
    if (action === 'finalize-cart') {
      if (!state.cart.length) { toast('Carrinho vazio.', 'error'); return; }
      if (isDemoActive()) { toast('🛒 Demo: ' + state.cart.length + ' itens enviados! Validade: 3 receitas.', 'ok'); state.cart = []; state.showCartModal = false; updateCartBadge(); render(); return; }
      for (const ci of state.cart) {
        const { error } = await client.rpc('player_request_store_item', { p_item_id: ci.itemId, p_option_label: ci.name });
        if (error) { toast('Erro: ' + error.message, 'error'); return; }
      }
      toast('🛒 ' + state.cart.length + ' itens enviados! ⚠️ Validade: use em até 3 receitas.', 'ok');
      state.cart = []; state.showCartModal = false; updateCartBadge();
      await refreshData(); state.tab = 'orders'; render(); return;
    }
    // ===== ADMIN LOJA =====
    if (action === 'admin-store-tab') { state.adminStoreTab = el.dataset.tab; state.editingItem = null; render(); return; }
    if (action === 'toggle-cat') {
      const id = el.dataset.id; const cat = (state.storeCategories || []).find(c => c.id === id);
      if (cat) {
        if (isDemoActive()) { cat.active = !cat.active; render(); toast('Categoria alterada (demo).', 'ok'); return; }
        const { error } = await client.rpc('admin_store_save_category', { p_id: cat.id, p_code: cat.code, p_name: cat.name, p_emoji: cat.emoji, p_min_price: cat.min_price, p_max_price: cat.max_price, p_level_required: cat.level_required, p_active: !cat.active });
        if (error) throw error; await refreshData(); render(); toast('Categoria atualizada.', 'ok');
      }
      return;
    }
    if (action === 'edit-category') {
      const cat = (state.storeCategories || []).find(c => c.id === el.dataset.id);
      if (cat) { state.adminStoreTab = 'add-cat'; state._editCat = cat; render(); $('#view').innerHTML = '<div class="tabs"></div>' + renderCategoryForm(cat); }
      return;
    }
    if (action === 'delete-category') {
      const id = el.dataset.id;
      if (!confirm('Excluir categoria e itens?')) return;
      if (isDemoActive()) { state.storeCategories = state.storeCategories.filter(c => c.id !== id); delete state.storeItemsByCategory[id]; render(); return; }
      const { error } = await client.rpc('admin_store_delete_category', { p_id: id });
      if (error) throw error; await refreshData(); render(); toast('Excluída.', 'ok'); return;
    }
    if (action === 'save-category') {
      const id = el.dataset.id || null;
      const payload = { p_id: id, p_code: $('#cat-code').value.trim(), p_name: $('#cat-name').value.trim(), p_emoji: $('#cat-emoji').value.trim() || '🔹', p_min_price: parseInt($('#cat-min').value, 10) || 15, p_max_price: parseInt($('#cat-max').value, 10) || 30, p_level_required: parseInt($('#cat-level').value, 10) || 2, p_active: $('#cat-active').checked };
      if (!payload.p_code || !payload.p_name) { toast('Preencha código e nome.', 'error'); return; }
      if (isDemoActive()) {
        if (id) { const c = state.storeCategories.find(x => x.id === id); if (c) Object.assign(c, { code: payload.p_code, name: payload.p_name, emoji: payload.p_emoji, min_price: payload.p_min_price, max_price: payload.p_max_price, level_required: payload.p_level_required, active: payload.p_active }); }
        else { const nid = 'c' + Date.now(); state.storeCategories.push({ id: nid, ...payload, code: payload.p_code, name: payload.p_name, emoji: payload.p_emoji, min_price: payload.p_min_price, max_price: payload.p_max_price, level_required: payload.p_level_required, active: payload.p_active }); state.storeItemsByCategory[nid] = []; }
        state.adminStoreTab = 'manage'; render(); toast('Categoria salva (demo).', 'ok'); return;
      }
      const { error } = await client.rpc('admin_store_save_category', payload);
      if (error) throw error; await refreshData(); state.adminStoreTab = 'manage'; render(); toast('Categoria salva.', 'ok'); return;
    }
    if (action === 'add-item-to-cat') { openItemModal(el.dataset.cat); return; }
    if (action === 'edit-item') {
      const id = el.dataset.id;
      for (const catId in state.storeItemsByCategory) {
        const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === id);
        if (item) { openItemModal(catId, item); return; }
      }
      return;
    }
    if (action === 'toggle-item') {
      const id = el.dataset.id;
      for (const catId in state.storeItemsByCategory) {
        const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === id);
        if (item) {
          if (isDemoActive()) { item.active = !item.active; render(); return; }
          const cat = (state.storeCategories || []).find(c => c.id === catId);
          const { error } = await client.rpc('admin_store_save_item', { p_id: item.id, p_category_id: catId, p_code: item.code, p_name: item.name, p_description: item.description, p_emoji: item.emoji, p_image_url: item.image_url, p_base_price: item.base_price, p_permanent_price: null, p_reward_type: item.reward_type, p_requires_approval: item.requires_approval, p_is_suggestion: item.is_suggestion, p_active: !item.active });
          if (error) throw error; await refreshData(); render(); toast('Item atualizado.', 'ok'); return;
        }
      }
      return;
    }
    if (action === 'delete-item') {
      const id = el.dataset.id;
      if (!confirm('Excluir item?')) return;
      if (isDemoActive()) { for (const c in state.storeItemsByCategory) state.storeItemsByCategory[c] = state.storeItemsByCategory[c].filter(i => i.id !== id); render(); return; }
      const { error } = await client.rpc('admin_store_delete_item', { p_id: id });
      if (error) throw error; await refreshData(); render(); toast('Excluído.', 'ok'); return;
    }
    if (action === 'add-option') {
      const editor = $('#options-editor');
      if (editor) { const idx = editor.children.length; const row = document.createElement('div'); row.className = 'option-row'; row.innerHTML = '<input class="input" data-opt-id="' + idx + '" placeholder="id" /><input class="input" data-opt-label="' + idx + '" placeholder="label" /><input class="input" data-opt-emoji="' + idx + '" placeholder="🔹" /><button class="btn-icon" data-action="remove-opt" data-idx="' + idx + '">✕</button>'; editor.appendChild(row); }
      return;
    }
    if (action === 'remove-opt') { const row = document.querySelector('[data-opt-id="' + el.dataset.idx + '"]')?.parentElement; if (row) row.remove(); return; }
    if (action === 'close-modal') { $('#modal-root').innerHTML = ''; return; }
    if (action === 'save-item') {
      const id = el.dataset.id || null; const catId = el.dataset.cat;
      const options = [];
      document.querySelectorAll('.option-row').forEach(row => {
        const oid = row.querySelector('[data-opt-id]')?.value?.trim();
        const label = row.querySelector('[data-opt-label]')?.value?.trim();
        const emoji = row.querySelector('[data-opt-emoji]')?.value?.trim() || '🔹';
        if (oid && label) options.push({ id: oid, label, emoji });
      });
      const payload = { p_id: id, p_category_id: catId, p_code: $('#item-code').value.trim(), p_name: $('#item-name').value.trim(), p_description: $('#item-desc').value.trim(), p_emoji: $('#item-emoji').value.trim() || '🔹', p_image_url: $('#item-image').value.trim(), p_base_price: parseInt($('#item-price').value, 10) || 15, p_permanent_price: null, p_reward_type: $('#item-type').value, p_requires_approval: $('#item-approval').checked, p_is_suggestion: false, p_active: $('#item-active').checked };
      if (!payload.p_code || !payload.p_name || !catId) { toast('Preencha código, nome e categoria.', 'error'); return; }
      if (isDemoActive()) {
        if (id) { for (const c in state.storeItemsByCategory) { const it = state.storeItemsByCategory[c].find(i => i.id === id); if (it) Object.assign(it, payload, { options }); } }
        else { if (!state.storeItemsByCategory[catId]) state.storeItemsByCategory[catId] = []; state.storeItemsByCategory[catId].push({ id: 'i' + Date.now(), ...payload, options }); }
        $('#modal-root').innerHTML = ''; render(); toast('Item salvo (demo).', 'ok'); return;
      }
      const { data: itemId, error } = await client.rpc('admin_store_save_item', payload);
      if (error) throw error;
      if (options.length && itemId) { const { error: oe } = await client.rpc('admin_store_save_options', { p_item_id: itemId, p_options: options }); if (oe) throw oe; }
      await refreshData(); $('#modal-root').innerHTML = ''; render(); toast('Item salvo.', 'ok'); return;
    }
    // ===== ADMIN PEDIDOS (loja) =====
    if (action === 'approve-store-order') {
      const id = el.dataset.id;
      if (isDemoActive()) { state.pendingStoreOrders = state.pendingStoreOrders.filter(o => o.order_id !== id); render(); toast('Demo: aprovado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_store_order', { p_order_id: id, p_approve: true });
      if (error) throw error; await refreshData(); render(); toast('Aprovado. Item vale por 3 receitas.', 'ok'); return;
    }
    if (action === 'reject-store-order') {
      const id = el.dataset.id;
      if (isDemoActive()) { state.pendingStoreOrders = state.pendingStoreOrders.filter(o => o.order_id !== id); render(); toast('Demo: recusado.', 'ok'); return; }
      const { error } = await client.rpc('admin_review_store_order', { p_order_id: id, p_approve: false });
      if (error) throw error; await refreshData(); render(); toast('Recusado.', 'ok'); return;
    }
    // ===== PONTUAÇÃO =====
    if (action === 'save-scoring') {
      const crit = [];
      document.querySelectorAll('[data-c-label]').forEach(inp => {
        const i = inp.dataset.cLabel;
        crit.push({ label: inp.value.trim(), max_points: parseInt(document.querySelector('[data-c-max="' + i + '"]').value, 10) || 0, active: document.querySelector('[data-c-active="' + i + '"]').checked, sort_order: parseInt(i, 10) + 1 });
      });
      const rules = [];
      document.querySelectorAll('[data-r-from]').forEach(sel => {
        const i = sel.dataset.rFrom;
        rules.push({ from_level: parseInt(sel.value, 10), to_level: parseInt(document.querySelector('[data-r-to="' + i + '"]').value, 10), required_avg: parseFloat(document.querySelector('[data-r-avg="' + i + '"]').value) || 0, required_recipes: parseInt(document.querySelector('[data-r-rec="' + i + '"]').value, 10) || 1 });
      });
      if (isDemoActive()) { state.scoring = { criteria: crit, rules, players: state.scoring?.players || [] }; render(); toast('Configuração salva (demo).', 'ok'); return; }
      const { error } = await client.rpc('admin_save_scoring', { p_criteria: crit, p_rules: rules });
      if (error) throw error; await refreshData(); render(); toast('Configuração salva.', 'ok'); return;
    }
    if (action === 'apply-level') {
      const id = el.dataset.id;
      if (isDemoActive()) { toast('Demo: recálculo disponível no modo real.', 'ok'); return; }
      const { data, error } = await client.rpc('admin_apply_level', { p_player_id: id });
      if (error) throw error; await refreshData(); render(); toast(String(data || 'Feito.'), 'ok'); return;
    }
    // ===== ADMIN GERAL =====
    if (action === 'admin-refresh') { await refreshData(); render(); toast('Atualizado.', 'ok'); return; }
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
      if (error) throw error; await refreshData(); render(); toast('Missão importada.', 'ok'); return;
    }
    if (action === 'admin-adjust') {
      const playerId = $('#adjust-player').value;
      const delta = parseInt($('#adjust-delta').value, 10);
      const reason = $('#adjust-reason').value.trim();
      if (!playerId || !delta || !reason) { toast('Preencha tudo.', 'error'); return; }
      if (isDemoActive()) { toast('Demo: ajuste registrado.', 'ok'); return; }
      const { error } = await client.rpc('admin_adjust_points', { p_player_id: playerId, p_delta: delta, p_reason: reason });
      if (error) throw error; await refreshData(); render(); toast('Ajuste registrado.', 'ok'); return;
    }
    if (action === 'admin-export') {
      if (isDemoActive()) { state.exportJson = JSON.stringify(demoData.summary, null, 2); render(); return; }
      const { data, error } = await client.rpc('admin_export_summary');
      if (error) throw error; state.exportJson = JSON.stringify(data, null, 2); render(); toast('Resumo gerado.', 'ok'); return;
    }
    if (action === 'copy-export') {
      const text = state.exportJson || ($('#export-json') ? $('#export-json').value : '');
      if (!text) { toast('Gere o resumo primeiro.', 'error'); return; }
      try { await navigator.clipboard.writeText(text); toast('Copiado.', 'ok'); } catch (_) { toast('Erro ao copiar.', 'error'); }
      return;
    }
  } catch (err) { toast(err.message || 'Erro na ação.', 'error'); }
}

function openItemModal(catId, item) {
  $('#modal-root').innerHTML = '<div class="modal-overlay"><div class="modal-content">' + renderItemForm(item, catId) + '</div></div>';
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (e.target.classList && e.target.classList.contains('modal-overlay')) { $('#modal-root').innerHTML = ''; state.showCartModal = false; render(); return; }
  doAction(el.dataset.action, el);
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
