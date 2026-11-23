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
  showCategoryModal: false, showItemModal: false,
  // Carrinho
  cart: [], showCartModal: false, openCategoryInStore: null
};

// ===== DADOS DEMO COM TODAS AS CATEGORIAS =====
const demoData = {
  playerState: { points_balance: 45, kitchen_level: 2, last_rating: null },
  equipment: [{ equipment_code: 'batedeira', mode: 'temporary', status: 'active', acquired_at: '2026-11-21T10:00:00-03:00' }],
  storeCategories: [
    { id: 'c1', code: 'confeitos', name: '🍬 Confeitos', emoji: '🍬', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c2', code: 'corantes', name: '🎨 Corantes', emoji: '🎨', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c3', code: 'aromatizantes', name: '🌺 Aromatizantes', emoji: '🌺', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c4', code: 'gelatinas', name: '🍮 Gelatinas', emoji: '🍮', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c5', code: 'temperos-basicos', name: '🧂 Temperos Básicos', emoji: '🧂', min_price: 15, max_price: 30, level_required: 2, active: true },
    { id: 'c6', code: 'cremes-molhos', name: '🥛 Cremes e Molhos', emoji: '🥛', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c7', code: 'leites', name: '🥥 Leites Especiais', emoji: '🥥', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c8', code: 'temperos-sofisticados', name: '🌶️ Temperos Sofisticados', emoji: '🌶️', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c9', code: 'proteinas', name: '🥩 Proteínas', emoji: '🥩', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c10', code: 'verduras-legumes', name: '🥬 Verduras e Legumes', emoji: '🥬', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c11', code: 'frutas', name: '🍎 Frutas', emoji: '🍎', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c12', code: 'graos', name: '🌾 Grãos e Cereais', emoji: '🌾', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c13', code: 'secreto', name: '🎁 Ingrediente Secreto', emoji: '🎁', min_price: 15, max_price: 30, level_required: 1, active: true },
    { id: 'c14', code: 'sofisticados', name: '✨ Sofisticados', emoji: '✨', min_price: 15, max_price: 30, level_required: 1, active: true }
  ],
  storeItems: {
    'c1': [
      { id: 'i1', code: 'confeitos-estrela', name: 'Confeitos Estrela', description: 'Confeitos em formato de estrela', emoji: '⭐', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'estrela', label: 'Estrelas', emoji: '⭐' }, { id: 'coracao', label: 'Corações', emoji: '❤️' }, { id: 'flor', label: 'Flores', emoji: '🌸' }] },
      { id: 'i1b', code: 'confeitos-bolinha', name: 'Confeitos Bolinha', description: 'Confeitos redondos coloridos', emoji: '🔵', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'colorido', label: 'Colorido', emoji: '🌈' }, { id: 'dourado', label: 'Dourado', emoji: '✨' }, { id: 'prateado', label: 'Prateado', emoji: '⚪' }] }
    ],
    'c2': [
      { id: 'i2', code: 'corantes-gel', name: 'Corante em Gel', description: 'Corante concentrado', emoji: '🎨', image_url: '', base_price: 20, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'vermelho', label: 'Vermelho', emoji: '🔴' }, { id: 'azul', label: 'Azul', emoji: '🔵' }, { id: 'verde', label: 'Verde', emoji: '🟢' }] }
    ],
    'c3': [
      { id: 'i3', code: 'essencia-baunilha', name: 'Essência de Baunilha', description: 'Aroma clássico', emoji: '🌼', image_url: '', base_price: 18, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'baunilha', label: 'Baunilha', emoji: '🌼' }, { id: 'morango', label: 'Morango', emoji: '🍓' }, { id: 'coco', label: 'Coco', emoji: '🥥' }] }
    ],
    'c4': [
      { id: 'i4', code: 'gelatina-morango', name: 'Gelatina Morango', description: 'Gelatina sabor morango', emoji: '🍓', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'morango', label: 'Morango', emoji: '🍓' }, { id: 'uva', label: 'Uva', emoji: '🍇' }, { id: 'limao', label: 'Limão', emoji: '🍋' }] }
    ],
    'c5': [
      { id: 'i5', code: 'sal-fino', name: 'Sal Fino', description: 'Sal refinado', emoji: '🧂', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'sal', label: 'Sal fino', emoji: '🧂' }, { id: 'pimenta', label: 'Pimenta', emoji: '🌶️' }, { id: 'cebolinha', label: 'Cebolinha', emoji: '🌿' }] }
    ],
    'c6': [
      { id: 'i6', code: 'creme-leite', name: 'Creme de Leite', description: 'Para molhos e sobremesas', emoji: '🥛', image_url: '', base_price: 18, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'creme', label: 'Creme de leite', emoji: '🥛' }, { id: 'nata', label: 'Nata', emoji: '🍶' }, { id: 'chantilly', label: 'Chantilly', emoji: '🍦' }] }
    ],
    'c7': [
      { id: 'i7', code: 'leite-coco', name: 'Leite de Coco', description: 'Para receitas tropicais', emoji: '🥥', image_url: '', base_price: 20, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'coco', label: 'Coco', emoji: '🥥' }, { id: 'amendoas', label: 'Amêndoas', emoji: '🌰' }, { id: 'aveia', label: 'Aveia', emoji: '🌾' }] }
    ],
    'c8': [
      { id: 'i8', code: 'paprica', name: 'Páprica Defumada', description: 'Tempero especial', emoji: '🌶️', image_url: '', base_price: 22, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'paprica', label: 'Páprica', emoji: '🌶️' }, { id: 'lemon', label: 'Lemon pepper', emoji: '🍋' }, { id: 'rosa', label: 'Pimenta rosa', emoji: '🌸' }] }
    ],
    'c9': [
      { id: 'i9', code: 'frango', name: 'Peito de Frango', description: 'Proteína versátil', emoji: '🍗', image_url: '', base_price: 25, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'frango', label: 'Frango', emoji: '🍗' }, { id: 'carne', label: 'Carne moída', emoji: '🥩' }, { id: 'peixe', label: 'Filé de peixe', emoji: '🐟' }] }
    ],
    'c10': [
      { id: 'i10', code: 'alface', name: 'Alface', description: 'Verdura fresca', emoji: '🥬', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'alface', label: 'Alface', emoji: '🥬' }, { id: 'tomate', label: 'Tomate', emoji: '🍅' }, { id: 'cenoura', label: 'Cenoura', emoji: '🥕' }] }
    ],
    'c11': [
      { id: 'i11', code: 'maca', name: 'Maçã', description: 'Fruta fresca', emoji: '🍎', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'maca', label: 'Maçã', emoji: '🍎' }, { id: 'banana', label: 'Banana', emoji: '🍌' }, { id: 'morango', label: 'Morango', emoji: '🍓' }] }
    ],
    'c12': [
      { id: 'i12', code: 'arroz', name: 'Arroz', description: 'Grão básico', emoji: '🍚', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true,
        options: [{ id: 'arroz', label: 'Arroz', emoji: '🍚' }, { id: 'feijao', label: 'Feijão', emoji: '🫘' }, { id: 'aveia', label: 'Aveia', emoji: '🌾' }] }
    ],
    'c13': [
      { id: 'i13', code: 'surpresa', name: 'Surpresa do Chef', description: 'Ingrediente misterioso', emoji: '🎁', image_url: '', base_price: 25, reward_type: 'ingredient', requires_approval: true, is_suggestion: false, active: true,
        options: [{ id: 'surpresa1', label: 'Surpresa 1', emoji: '🎁' }, { id: 'surpresa2', label: 'Surpresa 2', emoji: '✨' }, { id: 'surpresa3', label: 'Surpresa 3', emoji: '🤫' }] }
    ],
    'c14': [
      { id: 'i14', code: 'yakisoba', name: 'Molho Yakisoba', description: 'Para pratos orientais', emoji: '🍜', image_url: '', base_price: 28, reward_type: 'ingredient', requires_approval: true, is_suggestion: false, active: true,
        options: [{ id: 'yakisoba', label: 'Yakisoba', emoji: '🍜' }, { id: 'panko', label: 'Farinha panko', emoji: '🍤' }, { id: 'parmesao', label: 'Parmesão', emoji: '🧀' }] }
    ]
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
const cartBtn = $('#cart-btn');
const cartCountEl = $('#cart-count');
const modalRoot = $('#modal-root');

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
function updateCartBadge() {
  const count = state.cart.length;
  if (count > 0) { cartCountEl.textContent = count; cartCountEl.style.display = 'inline-flex'; }
  else { cartCountEl.style.display = 'none'; }
}
function closeModal() { modalRoot.innerHTML = ''; }

function render() {
  const role = activeRole();
  document.body.classList.toggle('login-mode', !role);
  if (!role) { renderLogin(); return; }
  userBadge.classList.remove('hidden'); signoutBtn.classList.remove('hidden');
  const name = isDemoActive() ? (role === 'admin' ? 'Douglas • demo' : 'Klara • demo') : (state.profile?.display_name || state.user?.email || 'Usuário');
  userBadge.textContent = name + (role === 'admin' ? ' • admin' : ' • jogador');
  // Carrinho só visível para jogador
  if (role === 'admin') { cartBtn.classList.add('hidden'); }
  else { cartBtn.classList.remove('hidden'); updateCartBadge(); }
  renderApp();
}

function renderLogin() {
  userBadge.classList.add('hidden'); signoutBtn.classList.add('hidden'); cartBtn.classList.add('hidden'); setKitchen(2);
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

// ===== LOJA DA CRIANÇA COM CARRINHO =====
function renderStore() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const categories = (state.storeCategories || []).filter(c => c.active && c.level_required <= ps.kitchen_level);

  if (ps.kitchen_level === 3) {
    return '<div class="card"><h3>Loja</h3><p class="muted">Na Cozinha de Campanha (Nível 3), o resgate de ingredientes está suspenso.</p></div>';
  }

  let html = '<div class="notice ok">🛒 Adicione itens ao carrinho e finalize o pedido. Itens alimentícios devem ser usados em até 3 receitas!</div>';

  categories.forEach(cat => {
    const items = (state.storeItemsByCategory[cat.id] || []).filter(i => i.active);
    const isOpen = state.openCategoryInStore === cat.id;
    html += '<div class="store-category">';
    html += '<div class="store-category-header" data-action="toggle-store-cat" data-id="' + esc(cat.id) + '">' +
      '<div class="cat-info"><h4>' + esc(cat.name) + '</h4><div class="cat-meta">Nível ' + esc(cat.level_required) + ' • R$ ' + esc(cat.min_price) + ' a R$ ' + esc(cat.max_price) + ' • ' + items.length + ' itens</div></div>' +
      '<div>' + (isOpen ? '▲ Recolher' : '▼ Ver itens') + '</div></div>';
    if (isOpen) {
      html += '<div class="store-items-list open">';
      if (items.length === 0) {
        html += '<p class="muted small">Nenhum item disponível nesta categoria.</p>';
      } else {
        items.forEach(item => {
          const inCart = state.cart.find(c => c.itemId === item.id);
          const canAfford = ps.points_balance >= item.base_price;
          html += '<div class="store-item-row">' +
            '<div class="item-info"><div class="item-name">' + esc(item.emoji) + ' ' + esc(item.name) + '</div>' +
            '<div class="item-price">' + esc(item.base_price) + ' pts</div>' +
            '<div class="meta small">' + esc(item.description || '') + '</div></div>' +
            '<div class="item-actions">' +
            (inCart ? '<button class="btn small bad" data-action="remove-from-cart" data-item="' + esc(item.id) + '">Remover</button>' :
              '<button class="btn small" data-action="add-to-cart" data-item="' + esc(item.id) + '" data-cat="' + esc(cat.id) + '" ' + (!canAfford ? 'disabled' : '') + '>' + (canAfford ? '🛒 Adicionar' : 'Pontos insuficientes') + '</button>') +
            '</div></div>';
        });
      }
      html += '</div>';
    }
    html += '</div>';
  });

  // Modal do carrinho
  if (state.showCartModal) {
    html += renderCartModal(ps);
  }

  return html;
}

function renderCartModal(ps) {
  const cart = state.cart || [];
  const total = cart.reduce((sum, c) => sum + c.price, 0);
  const canAfford = ps.points_balance >= total;

  const itemsHtml = cart.map(c =>
    '<div class="cart-item"><div class="ci-info"><div class="ci-name">' + esc(c.emoji) + ' ' + esc(c.name) + '</div><div class="ci-cat">' + esc(c.categoryName) + (c.optionLabel ? ' • ' + esc(c.optionLabel) : '') + '</div></div>' +
    '<div class="ci-price">' + esc(c.price) + ' pts</div>' +
    '<button class="btn small bad" data-action="remove-from-cart" data-item="' + esc(c.itemId) + '">✕</button></div>'
  ).join('');

  return '<div class="modal-overlay" data-action="close-modal"><div class="modal-content">' +
    '<h3>🛒 Seu Carrinho</h3>' +
    '<div class="cart-warning">⚠️ <strong>Atenção:</strong> Itens alimentícios têm validade para usar em até <strong>3 receitas</strong>. Uma vez usado, o item não é mais válido e será removido do seu inventário.</div>' +
    '<div style="margin-top:14px">' + (itemsHtml || '<p class="muted">Carrinho vazio.</p>') + '</div>' +
    (cart.length > 0 ? '<div class="cart-total"><span>Total:</span><span>' + esc(total) + ' pts' + (canAfford ? '' : ' <span class="pill bad">Saldo insuficiente</span>') + '</span></div>' +
    '<div class="modal-actions"><button class="btn secondary" data-action="close-modal">Continuar comprando</button>' +
    '<button class="btn good" data-action="finalize-cart" ' + (!canAfford ? 'disabled' : '') + '>Finalizar pedido (' + esc(total) + ' pts)</button></div>' :
    '<div class="modal-actions"><button class="btn" data-action="close-modal">Fechar</button></div>') +
    '</div></div>';
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
    return '<div class="list-item"><div><div class="title">' + esc(meta.name) + '</div><div class="meta">Adquirido: ' + esc(fmtDate(e.acquired_at)) + ' • Modo: ' + esc(e.mode) + '</div></div><div class="right"><span class="pill info">Ativo</span></div></div>';
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

// ===== ADMIN LOJA COMPLETA =====
function renderAdminStore() {
  const categories = state.storeCategories || [];
  const subTabs = [['manage', 'Gerenciar'], ['add-cat', 'Nova Categoria']];
  const tabsHtml = subTabs.map(([id, label]) => '<button class="tab ' + (state.adminStoreTab === id ? 'active' : '') + '" data-action="admin-store-tab" data-tab="' + id + '">' + esc(label) + '</button>').join('');

  let content = '';
  if (state.adminStoreTab === 'manage') {
    content = categories.map(cat => {
      const items = state.storeItemsByCategory[cat.id] || [];
      const itemsHtml = items.map(item =>
        '<div class="admin-item-mini"><div><div class="item-name">' + esc(item.emoji) + ' ' + esc(item.name) + (item.active ? '' : ' <span class="pill muted">inativo</span>') + '</div><div class="item-price">' + esc(item.base_price) + ' pts' + (item.requires_approval ? ' • aprovação' : '') + '</div></div>' +
        '<div class="item-actions">' +
        '<button class="btn small secondary" data-action="toggle-item" data-id="' + esc(item.id) + '">' + (item.active ? 'Desativar' : 'Ativar') + '</button>' +
        '<button class="btn small secondary" data-action="edit-item" data-id="' + esc(item.id) + '">Editar</button>' +
        '<button class="btn small bad" data-action="delete-item" data-id="' + esc(item.id) + '">Excluir</button></div></div>'
      ).join('');
      return '<div class="admin-cat-card"><div class="admin-cat-header" data-action="toggle-admin-cat" data-id="' + esc(cat.id) + '"><div><h4>' + esc(cat.name) + (cat.active ? '' : ' <span class="pill muted">inativa</span>') + '</h4><div class="admin-cat-meta">Nível ' + esc(cat.level_required) + ' • R$ ' + esc(cat.min_price) + ' a R$ ' + esc(cat.max_price) + ' • ' + items.length + ' itens</div></div><div><button class="btn small secondary" data-action="toggle-cat" data-id="' + esc(cat.id) + '">' + (cat.active ? 'Desativar' : 'Ativar') + '</button> <button class="btn small secondary" data-action="edit-category" data-id="' + esc(cat.id) + '">Editar</button> <button class="btn small bad" data-action="delete-category" data-id="' + esc(cat.id) + '">Excluir</button></div></div>' +
        '<div class="admin-items-scroll">' + (itemsHtml || '<p class="muted small">Sem itens. Clique em "Adicionar item" abaixo.</p>') + '</div>' +
        '<div style="margin-top:10px"><button class="btn small" data-action="add-item-to-cat" data-cat="' + esc(cat.id) + '">+ Adicionar item</button></div></div>';
    }).join('');
    if (!categories.length) content = '<div class="card"><p class="muted">Nenhuma categoria. Crie a primeira!</p></div>';
  } else if (state.adminStoreTab === 'add-cat') {
    content = renderCategoryForm();
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

function renderItemForm(item, categoryId) {
  const i = item || { id: null, category_id: categoryId || '', code: '', name: '', description: '', emoji: '🔹', image_url: '', base_price: 15, reward_type: 'ingredient', requires_approval: false, is_suggestion: false, active: true, options: [] };
  const opts = i.options || [];
  const optsHtml = opts.map((o, idx) =>
    '<div class="option-row"><input class="input" data-opt-id="' + idx + '" value="' + esc(o.id) + '" placeholder="id" /><input class="input" data-opt-label="' + idx + '" value="' + esc(o.label) + '" placeholder="label" /><input class="input" data-opt-emoji="' + idx + '" value="' + esc(o.emoji) + '" placeholder="🔹" /><button class="btn-icon" data-action="remove-opt" data-idx="' + idx + '">✕</button></div>'
  ).join('');

  return '<div class="card"><h3>' + (item ? 'Editar' : 'Novo') + ' Item</h3>' +
    '<div class="field"><label>Código (sem espaços)</label><input class="input" id="item-code" value="' + esc(i.code) + '" /></div>' +
    '<div class="field"><label>Nome</label><input class="input" id="item-name" value="' + esc(i.name) + '" /></div>' +
    '<div class="field"><label>Descrição</label><textarea class="input" id="item-desc" rows="2">' + esc(i.description) + '</textarea></div>' +
    '<div class="field"><label>Emoji</label><input class="input" id="item-emoji" value="' + esc(i.emoji) + '" /></div>' +
    '<div class="field"><label>URL da imagem (opcional)</label><input class="input" id="item-image" value="' + esc(i.image_url) + '" placeholder="https://..." /></div>' +
    '<div class="field"><label>Preço (pts)</label><input class="input" id="item-price" type="number" value="' + esc(i.base_price) + '" /></div>' +
    '<div class="field"><label>Tipo</label><select id="item-type"><option value="ingredient" ' + (i.reward_type === 'ingredient' ? 'selected' : '') + '>Ingrediente (apenas temporário)</option><option value="equipment" ' + (i.reward_type === 'equipment' ? 'selected' : '') + '>Equipamento</option><option value="experience" ' + (i.reward_type === 'experience' ? 'selected' : '') + '>Experiência</option></select></div>' +
    '<div class="field"><label><input type="checkbox" id="item-approval" ' + (i.requires_approval ? 'checked' : '') + ' /> Requer aprovação do admin</label></div>' +
    '<div class="field"><label><input type="checkbox" id="item-suggestion" ' + (i.is_suggestion ? 'checked' : '') + ' /> É sugestão (acima do máximo)</label></div>' +
    '<div class="field"><label><input type="checkbox" id="item-active" ' + (i.active ? 'checked' : '') + ' /> Ativo</label></div>' +
    '<h4 style="margin:20px 0 10px">Opções (sabores/formatos) — apenas para ingredientes</h4><div class="options-editor" id="options-editor">' + optsHtml + '</div>' +
    '<button class="btn small secondary mt" data-action="add-option">+ Adicionar opção</button>' +
    '<div style="margin-top:20px"><button class="btn" data-action="save-item" data-id="' + esc(i.id || '') + '" data-cat="' + esc(categoryId || i.category_id || '') + '">Salvar item</button></div></div>';
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

    // ===== LOJA CRIANÇA =====
    if (action === 'toggle-store-cat') {
      state.openCategoryInStore = state.openCategoryInStore === el.dataset.id ? null : el.dataset.id;
      render(); return;
    }
    if (action === 'add-to-cart') {
      const itemId = el.dataset.item;
      const catId = el.dataset.cat;
      const cat = (state.storeCategories || []).find(c => c.id === catId);
      const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === itemId);
      if (!item || !cat) { toast('Item não encontrado.', 'error'); return; }
      const ps = state.playerState || { points_balance: 0 };
      if (ps.points_balance < item.base_price) { toast('Pontos insuficientes!', 'error'); return; }
      if (state.cart.find(c => c.itemId === itemId)) { toast('Item já está no carrinho.', 'error'); return; }
      state.cart.push({ itemId: item.id, categoryId: cat.id, name: item.name, emoji: item.emoji, price: item.base_price, categoryName: cat.name, optionLabel: null });
      updateCartBadge(); render(); toast('Adicionado ao carrinho!', 'ok'); return;
    }
    if (action === 'remove-from-cart') {
      const itemId = el.dataset.item;
      state.cart = state.cart.filter(c => c.itemId !== itemId);
      updateCartBadge(); render(); return;
    }
    if (action === 'open-cart') { state.showCartModal = true; render(); return; }
    if (action === 'close-modal') { state.showCartModal = false; state.showCategoryModal = false; state.showItemModal = false; closeModal(); render(); return; }
    if (action === 'finalize-cart') {
      if (state.cart.length === 0) { toast('Carrinho vazio.', 'error'); return; }
      const ps = state.playerState || { points_balance: 0 };
      const total = state.cart.reduce((sum, c) => sum + c.price, 0);
      if (ps.points_balance < total) { toast('Pontos insuficientes!', 'error'); return; }
      if (isDemoActive()) {
        toast('Demo: ' + state.cart.length + ' itens enviados para aprovação! Lembre-se: validade de 3 receitas.', 'ok');
        state.cart = []; state.showCartModal = false; updateCartBadge(); render(); return;
      }
      // Envia cada item como pedido separado
      for (const cartItem of state.cart) {
        const { error } = await client.rpc('player_request_reward', { p_reward_code: cartItem.itemId, p_note: 'Pedido via carrinho', p_mode: null });
        if (error) { toast('Erro ao enviar: ' + error.message, 'error'); return; }
      }
      toast('🛒 ' + state.cart.length + ' itens enviados! Lembre-se: validade de 3 receitas.', 'ok');
      state.cart = []; state.showCartModal = false; updateCartBadge();
      state.tab = 'orders'; render(); return;
    }

    // ===== ADMIN LOJA =====
    if (action === 'admin-store-tab') {
      state.adminStoreTab = el.dataset.tab;
      state.editingCategory = null; state.editingItem = null;
      render(); return;
    }
    if (action === 'toggle-admin-cat') {
      // Apenas visual - expandir/contrair (já está sempre aberto no admin)
      return;
    }
    if (action === 'toggle-cat') {
      const id = el.dataset.id;
      const cat = (state.storeCategories || []).find(c => c.id === id);
      if (cat) { cat.active = !cat.active; render(); toast('Categoria ' + (cat.active ? 'ativada' : 'desativada'), 'ok'); }
      return;
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
          const newId = 'c' + Date.now();
          state.storeCategories.push({ id: newId, ...payload });
          state.storeItemsByCategory[newId] = [];
        }
        state.adminStoreTab = 'manage'; render(); toast('Categoria salva (demo).', 'ok'); return;
      }
      const { data, error } = await client.rpc('admin_store_save_category', payload);
      if (error) throw error;
      await refreshData(); state.adminStoreTab = 'manage'; render(); toast('Categoria salva.', 'ok'); return;
    }
    if (action === 'add-item-to-cat') {
      state.editingItem = null;
      state.showItemModal = true;
      state._pendingItemCatId = el.dataset.cat;
      openItemModal(el.dataset.cat);
      return;
    }
    if (action === 'edit-item') {
      const id = el.dataset.id;
      for (const catId in state.storeItemsByCategory) {
        const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === id);
        if (item) {
          state.editingItem = item;
          state._pendingItemCatId = catId;
          openItemModal(catId, item);
          return;
        }
      }
      return;
    }
    if (action === 'toggle-item') {
      const id = el.dataset.id;
      for (const catId in state.storeItemsByCategory) {
        const item = (state.storeItemsByCategory[catId] || []).find(i => i.id === id);
        if (item) { item.active = !item.active; render(); toast('Item ' + (item.active ? 'ativado' : 'desativado'), 'ok'); return; }
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
      const catId = el.dataset.cat || state._pendingItemCatId;
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
        p_category_id: catId,
        p_code: $('#item-code').value.trim(),
        p_name: $('#item-name').value.trim(),
        p_description: $('#item-desc').value.trim(),
        p_emoji: $('#item-emoji').value.trim() || '🔹',
        p_image_url: $('#item-image').value.trim(),
        p_base_price: parseInt($('#item-price').value, 10) || 15,
        p_permanent_price: null, // Itens alimentares não têm compra permanente
        p_reward_type: $('#item-type').value,
        p_requires_approval: $('#item-approval').checked,
        p_is_suggestion: $('#item-suggestion').checked,
        p_active: $('#item-active').checked
      };
      if (!payload.p_code || !payload.p_name || !catId) { toast('Preencha código, nome e categoria.', 'error'); return; }
      if (isDemoActive()) {
        if (id) {
          for (const cId in state.storeItemsByCategory) {
            const item = state.storeItemsByCategory[cId].find(i => i.id === id);
            if (item) Object.assign(item, payload, { options });
          }
        } else {
          if (!state.storeItemsByCategory[catId]) state.storeItemsByCategory[catId] = [];
          state.storeItemsByCategory[catId].push({ id: 'i' + Date.now(), ...payload, options });
        }
        closeModal(); state.showItemModal = false; render(); toast('Item salvo (demo).', 'ok'); return;
      }
      const { data: itemId, error } = await client.rpc('admin_store_save_item', payload);
      if (error) throw error;
      if (options.length && itemId) {
        const { error: optErr } = await client.rpc('admin_store_save_options', { p_item_id: itemId, p_options: options });
        if (optErr) throw optErr;
      }
      await refreshData(); closeModal(); state.showItemModal = false; render(); toast('Item salvo.', 'ok'); return;
    }

    // ===== ADMIN OUTROS =====
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

function openItemModal(catId, item) {
  const html = renderItemForm(item, catId);
  modalRoot.innerHTML = '<div class="modal-overlay" data-action="close-modal"><div class="modal-content">' + html.replace('<div class="card">', '').replace(/<\/div>$/, '') + '</div></div>';
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
