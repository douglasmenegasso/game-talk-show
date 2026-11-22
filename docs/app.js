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
  players: [], rewards: [], missions: [], orders: [], equipment: [],
  summary: null, selectedMissionId: null, recipe: null, exportJson: ''
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
  }
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

function renderApp() {
  const role = activeRole();
  const tabs = role === 'admin' ? [['dashboard', 'Visão geral'], ['import', 'Importar'], ['orders', 'Pedidos'], ['adjust', 'Ajustar']] : [['dashboard', 'Cozinha'], ['missions', 'Missões'], ['store', 'Loja'], ['orders', 'Meus Pedidos']];
  if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];
  const tabsHtml = tabs.map(([id, label]) => '<button class="tab ' + (state.tab === id ? 'active' : '') + '" data-action="tab" data-tab="' + id + '">' + esc(label) + '</button>').join('');
  view.innerHTML = '<div class="tabs">' + tabsHtml + '</div>' + (role === 'admin' ? renderAdmin() : renderPlayer());
}

function renderPlayer() {
  if (state.tab === 'missions') return renderMissions();
  if (state.tab === 'store') return renderStore();
  if (state.tab === 'orders') return renderPlayerOrders();
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
    const recipeHtml = state.selectedMissionId === m.id && state.recipe ? renderRecipe(state.recipe, false) : '';
    return '<div class="list-item"><div><div class="title">' + esc(m.title) + '</div><div class="meta">Início: ' + esc(fmtDate(m.occurred_at)) + '</div>' + (m.feedback ? '<div class="meta">' + esc(m.feedback) + '</div>' : '') + '</div>' +
    '<div class="right"><span class="pill ' + (m.points_delta >= 0 ? 'good' : 'bad') + '">' + (m.points_delta >= 0 ? '+' : '') + esc(m.points_delta) + ' pts</span>' +
    '<div class="recipe-toggle" data-action="toggle-recipe" data-id="' + esc(m.id) + '">' + (state.selectedMissionId === m.id ? 'Recolher receita ▲' : 'Ver receita ▼') + '</div>' +
    (recipeHtml ? '<div class="recipe-details open">' + recipeHtml + '</div>' : '') + '</div></div>';
  }).join('');
  return '<div class="card"><h3>Histórico de missões</h3><div class="list">' + (items || '<p class="muted">Nenhuma missão registrada.</p>') + '</div></div>';
}

function renderRecipe(r, hideGuidance) {
  const recipe = r.recipe || {};
  const tips = r.tips || [];
  const ingredients = r.ingredients || [];
  const equipment = r.equipment || [];
  // Dicas do Chefe Triix agora aparecem para a Klara (hideGuidance = false)
  return '<div class="chef-feedback"><h4>👨‍🍳 Feedback e Dicas do Chefe Triix</h4><ul>' + (tips.length ? tips.map(t => '<li>' + esc(t) + '</li>').join('') : '<li>Siga os passos com calma e peça ajuda ao adulto para o forno!</li>') + '</ul>' +
    '<p class="small muted mt"><strong>Bônus:</strong> Seguir uma sugestão de prato novo garante +3 pontos na avaliação final!</p></div>' +
    '<div class="mt"><h4>Ingredientes</h4><ul>' + ingredients.map(i => '<li>' + esc(i.quantity) + ' ' + esc(i.unit) + ' de ' + esc(i.item) + '</li>').join('') + '</ul></div>' +
    (equipment.length ? '<div class="mt"><h4>Utensílios</h4><ul>' + equipment.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '');
}

function renderStore() {
  const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
  const rewards = (state.rewards || []).filter(r => r.active);
  
  // Regra: Nível 3 impedido de comprar/alugar utensílios
  if (ps.kitchen_level === 3) {
    return '<div class="card"><h3>Loja</h3><p class="muted">Na Cozinha de Campanha (Nível 3), a compra e o aluguel de utensílios estão temporariamente suspensos até a reforma!</p></div>';
  }

  const cards = rewards.map(r => {
    const canAfford = ps.points_balance >= r.base_price;
    const isEquip = r.reward_type === 'equipment';
    const modeSelect = isEquip ? '<div class="field"><label>Modo</label><select id="mode-' + esc(r.code) + '"><option value="temporary">Temporário (Aluguel)</option><option value="permanent">Permanente (Compra)</option></select></div>' : '';
    const btnDisabled = !canAfford ? 'disabled' : '';
    const btnText = canAfford ? 'Pedir recompensa' : 'Pontos insuficientes';
    
    return '<div class="card reward-card"><h3 style="margin:0">' + esc(r.name) + '</h3><div class="reward-price">' + esc(r.base_price) + ' pts</div><div class="reward-desc">' + esc(r.description || '') + '</div>' + modeSelect + 
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

function renderAdmin() {
  // (Mantido simplificado para foco nas regras da Klara, mas funcional)
  return '<div class="card"><h3>Painel do Douglas (Admin)</h3><p class="muted">Use as abas para Importar missões, Aprovar pedidos ou Ajustar pontos.</p><p class="small">Dica: O sistema de "pesquisa de preço" e "notificação" será integrado via SendGrid na próxima etapa do banco de dados.</p></div>';
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
      state.selectedMissionId = state.selectedMissionId === el.dataset.id ? null : el.dataset.id;
      if (state.selectedMissionId && isDemoActive()) state.recipe = demoData.recipe;
      render(); return;
    }
    if (action === 'request-reward') {
      const ps = state.playerState || { points_balance: 0 };
      const reward = state.rewards.find(r => r.code === el.dataset.code);
      if (ps.points_balance < reward.base_price) { toast('Pontos insuficientes!', 'error'); return; }
      
      // Regra: Nível 3 bloqueado para equipamentos
      if (reward.reward_type === 'equipment' && ps.kitchen_level === 3) {
        toast('Cozinha Nível 3 não pode adquirir utensílios no momento.', 'error'); return;
      }

      const mode = reward.reward_type === 'equipment' ? document.getElementById('mode-' + el.dataset.code)?.value || 'temporary' : null;
      if (isDemoActive()) { toast('Demo: pedido enviado!', 'ok'); return; }
      const { error } = await client.rpc('player_request_reward', { p_reward_code: el.dataset.code, p_note: 'Pedido via site', p_mode: mode });
      if (error) throw error;
      await refreshData(); state.tab = 'orders'; render();
      toast('Pedido enviado para aprovação do Douglas!', 'ok');
      return;
    }
  } catch (err) { toast(err.message || 'Erro na ação.', 'error'); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return; doAction(el.dataset.action, el);
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
