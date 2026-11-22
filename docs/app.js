(function () {
  'use strict';

  const cfg = window.GAME_TALK_SHOW_CONFIG || {};
  const configured = Boolean(
    cfg.supabaseUrl &&
    cfg.supabasePublishableKey &&
    !String(cfg.supabaseUrl).includes('COLE') &&
    !String(cfg.supabasePublishableKey).includes('COLE')
  );
  const forceDemo = new URLSearchParams(window.location.search).get('demo') === '1';

  let client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  }

  const state = {
    user: null,
    profile: null,
    role: null,
    demo: !configured || forceDemo,
    demoRole: null,
    tab: 'dashboard',
    playerState: { points_balance: 0, kitchen_level: 2, last_rating: null },
    players: [],
    rewards: [],
    missions: [],
    orders: [],
    summary: null,
    selectedMissionId: null,
    recipe: null,
    exportJson: ''
  };

  const demoData = {
    playerState: { points_balance: 15, kitchen_level: 2, last_rating: null },
    rewards: [
      { id: 'r1', code: 'ingrediente-especial', name: 'Ingrediente Especial', description: 'Escolher um ingrediente novo e acessível para uma próxima receita, com aprovação do adulto.', base_price: 15, reward_type: 'ingredient', active: true, config: {} },
      { id: 'r2', code: 'sous-chef', name: 'Sous-Chef por um dia', description: 'Comandar uma receita com os adultos como ajudantes, mantendo as regras de segurança.', base_price: 30, reward_type: 'experience', active: true, config: {} },
      { id: 'r3', code: 'escolha-cardapio', name: 'Escolha do Cardápio', description: 'Escolher o cardápio de uma refeição da família, com aprovação do adulto.', base_price: 50, reward_type: 'experience', active: true, config: {} },
      { id: 'r4', code: 'utensilio-novo', name: 'Utensílio Novo', description: 'Um utensílio simples e divertido para a cozinha, aprovado pelo adulto.', base_price: 70, reward_type: 'utensil', active: true, config: {} }
    ],
    missions: [
      { id: 'm1', title: 'Bolo de chocolate com calda', kind: 'recipe', points_delta: 15, rating: null, occurred_at: '2026-11-21T00:00:00-03:00', feedback: 'Massa fofinha, sabor agradável e doce no ponto. Dificuldades: começou a misturar antes da orientação completa e adicionou farinha fora da ordem.' }
    ],
    orders: [],
    players: [
      { player_id: 'demo-klara', display_name: 'Klara', points_balance: 15, kitchen_level: 2, last_rating: null }
    ],
    summary: {
      players: [{ player_id: 'demo-klara', display_name: 'Klara', points_balance: 15, kitchen_level: 2, last_rating: null }],
      pending_orders: [],
      recent_missions: [{ mission_id: 'm1', player_id: 'demo-klara', title: 'Bolo de chocolate com calda', kind: 'recipe', points_delta: 15, rating: null, occurred_at: '2026-11-21T00:00:00-03:00' }],
      active_equipment: []
    },
    recipe: {
      recipe: {
        title: 'Bolo de chocolate com calda',
        yield: '1 bolo médio',
        steps: [
          { order: 1, text: 'Adulto preaquece o forno a 180 °C e prepara a forma média untada.' },
          { order: 2, text: 'Misturar ovos, açúcar, leite, óleo e achocolatado até ficar homogêneo.' },
          { order: 3, text: 'Adicionar a farinha aos poucos e com delicadeza, depois o fermento.' },
          { order: 4, text: 'Adulto coloca no forno por cerca de 35 a 40 minutos.' },
          { order: 5, text: 'Enquanto assa, lavar e organizar a bancada.' },
          { order: 6, text: 'Preparar a calda nos minutos finais ou durante o descanso do bolo.' },
          { order: 7, text: 'Adulto desenforma e aplica a calda com segurança.' }
        ],
        safety: [
          'Forno, panela quente e calda quente são tarefas do adulto.',
          'Klara pode misturar ingredientes frios e organizar a bancada com supervisão.'
        ]
      },
      tips: [
        'Esperar a instrução completa antes de executar: ouviu, entendeu, executou.',
        'Separar e medir os ingredientes antes de misturar.',
        'Integrar os líquidos antes de adicionar a farinha para evitar pelotas.',
        'Confirmar se o produto é chocolate em pó/cacau ou achocolatado antes de ajustar açúcar.',
        'Limpar e organizar durante o tempo de forno.'
      ],
      ingredients: [
        { item: 'ovos', quantity: '2', unit: 'unidade' },
        { item: 'açúcar', quantity: '1', unit: 'xic', note: 'para a massa' },
        { item: 'leite', quantity: '1', unit: 'xic', note: 'para a massa' },
        { item: 'óleo', quantity: '1/2', unit: 'xic' },
        { item: 'achocolatado', quantity: '1', unit: 'xic', note: 'para a massa' },
        { item: 'farinha de trigo', quantity: '2', unit: 'xic' },
        { item: 'fermento em pó', quantity: '1', unit: 'colher de sopa' },
        { item: 'leite', quantity: '1', unit: 'xic', note: 'para a calda' },
        { item: 'achocolatado', quantity: '1/2', unit: 'xic', note: 'para a calda' },
        { item: 'açúcar', quantity: '2', unit: 'colheres de sopa', note: 'para a calda' }
      ],
      products: [{ name: 'achocolatado', brand: null, note: 'Marca não informada no histórico.' }],
      equipment: ['forma média', 'tigela grande', 'colher de pau ou fouet', 'panela média', 'forno']
    }
  };

  const $ = (s) => document.querySelector(s);
  const view = $('#view');
  const noticeEl = $('#notice');
  const toastEl = $('#toast');
  const userBadge = $('#user-badge');
  const signoutBtn = $('#signout-btn');

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + (type || '');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.add('hidden'), 3500);
  }

  function notice(msg, type) {
    if (!msg) {
      noticeEl.classList.add('hidden');
      noticeEl.innerHTML = '';
      return;
    }
    noticeEl.className = 'notice ' + (type || '');
    noticeEl.innerHTML = msg;
    noticeEl.classList.remove('hidden');
  }

  function fmtDate(v) {
    if (!v) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));
    } catch (_) {
      return String(v);
    }
  }

  function kindLabel(kind) {
    return ({ recipe: 'Receita', household: 'Casa', school: 'Escola', other: 'Outra' })[kind] || kind;
  }

  function statusPill(status) {
    const map = {
      pending: ['warn', 'Pendente'],
      approved: ['good', 'Aprovado'],
      rejected: ['bad', 'Recusado'],
      cancelled: ['muted', 'Cancelado'],
      fulfilled: ['info', 'Entregue']
    };
    const m = map[status] || ['muted', status];
    return '<span class="pill ' + m[0] + '">' + esc(m[1]) + '</span>';
  }

  function kitchenInfo(level) {
    if (level === 1) return { name: 'Cozinha Master', emoji: '✨', items: ['Fogão completo', 'Geladeira inox', 'Batedeira liberada', 'Liquidificador liberado', 'Bancada brilhante', 'Utensílios completos'] };
    if (level === 3) return { name: 'Cozinha de Campanha', emoji: '🛠️', items: ['1 tigela', '1 colher', '1 panela', 'Utensílios mínimos', 'Sem elétricos', 'Precisa de reforma'] };
    return { name: 'Cozinha Padrão', emoji: '🍳', items: ['Tigela', 'Colher de pau', 'Fouet', 'Panela média', 'Forma média', 'Elétricos só temporários'] };
  }

  function setKitchen(level) {
    document.body.classList.remove('kitchen-1', 'kitchen-2', 'kitchen-3');
    document.body.classList.add('kitchen-' + (level || 2));
  }

  function isDemoActive() {
    return state.demo && state.demoRole;
  }

  function activeRole() {
    return isDemoActive() ? state.demoRole : state.role;
  }

  function render() {
    const role = activeRole();
    if (!role) {
      renderLogin();
      return;
    }
    userBadge.classList.remove('hidden');
    signoutBtn.classList.remove('hidden');
    const name = isDemoActive()
      ? (role === 'admin' ? 'Douglas • demo' : 'Klara • demo')
      : (state.profile && state.profile.display_name) || (state.user && state.user.email) || 'Usuário';
    userBadge.textContent = name + (role === 'admin' ? ' • admin' : ' • jogador');
    renderApp();
  }

  function renderLogin() {
    userBadge.classList.add('hidden');
    signoutBtn.classList.add('hidden');
    setKitchen(2);
    const demoButtons = state.demo
      ? '<div class="row mt"><button class="btn secondary" data-action="demo-login" data-role="player">Ver como Klara</button><button class="btn secondary" data-action="demo-login" data-role="admin">Ver como Douglas</button></div>'
      : '';
    const demoNotice = state.demo
      ? '<div class="notice">Modo de demonstração: configure <code class="inline">config.js</code> com a URL e a chave publishable do Supabase para usar dados reais.</div>'
      : '';
    view.innerHTML = `
      <div class="login-wrap">
        <div class="card">
          <div class="login-logo">🍳</div>
          <h2 class="login-title">Game Talk Show</h2>
          <p class="login-sub">Cozinhando com a Klara • acompanhe pontos, receitas e recompensas</p>
          ${demoNotice}
          <form id="login-form">
            <div class="field">
              <label for="email">E-mail</label>
              <input class="input" id="email" type="email" autocomplete="username" required />
            </div>
            <div class="field">
              <label for="password">Senha</label>
              <input class="input" id="password" type="password" autocomplete="current-password" required />
            </div>
            <button class="btn" type="submit" style="width:100%">Entrar</button>
          </form>
          ${demoButtons}
        </div>
      </div>`;
    const form = $('#login-form');
    if (form) form.addEventListener('submit', onLogin);
  }

  async function onLogin(e) {
    e.preventDefault();
    if (!client) {
      toast('Supabase não configurado. Use o modo demonstração ou edite config.js.', 'error');
      return;
    }
    const email = $('#email').value.trim();
    const password = $('#password').value;
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await bootRealSession();
    } catch (err) {
      toast(err.message || 'Falha no login.', 'error');
    }
  }

  function tabsFor(role) {
    if (role === 'admin') {
      return [
        ['dashboard', 'Visão geral'],
        ['import', 'Importar missão'],
        ['orders', 'Pedidos'],
        ['adjust', 'Ajustar pontos'],
        ['export', 'Exportar resumo']
      ];
    }
    return [
      ['dashboard', 'Cozinha'],
      ['missions', 'Missões'],
      ['store', 'Loja'],
      ['orders', 'Meus pedidos']
    ];
  }

  function renderApp() {
    const role = activeRole();
    const tabs = tabsFor(role);
    if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];
    const tabsHtml = tabs.map(([id, label]) =>
      `<button class="tab ${state.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}">${esc(label)}</button>`
    ).join('');
    let body = '';
    if (role === 'admin') body = renderAdmin();
    else body = renderPlayer();
    view.innerHTML = `<div class="tabs">${tabsHtml}</div>${body}`;
  }

  function renderPlayer() {
    if (state.tab === 'missions') return renderMissions();
    if (state.tab === 'store') return renderStore();
    if (state.tab === 'orders') return renderPlayerOrders();
    return renderPlayerDashboard();
  }

  function renderPlayerDashboard() {
    const ps = state.playerState || { points_balance: 0, kitchen_level: 2 };
    const kitchen = kitchenInfo(ps.kitchen_level);
    setKitchen(ps.kitchen_level);
    const activeRewards = (state.rewards || []).filter(r => r.active).sort((a, b) => a.base_price - b.base_price);
    const next = activeRewards.find(r => r.base_price > ps.points_balance) || activeRewards[0];
    const pct = next ? Math.min(100, Math.round((ps.points_balance / next.base_price) * 100)) : 0;
    const recent = (state.missions || []).slice(0, 3).map(m => `
      <div class="list-item">
        <div>
          <div class="title">${esc(m.title)}</div>
          <div class="meta">${esc(kindLabel(m.kind))} • ${esc(fmtDate(m.occurred_at))}</div>
        </div>
        <div class="right"><span class="pill ${m.points_delta >= 0 ? 'good' : 'bad'}">${m.points_delta >= 0 ? '+' : ''}${esc(m.points_delta)} pts</span></div>
      </div>`).join('');
    return `
      <div class="grid cols-3">
        <div class="card stat">
          <span class="label">Saldo de pontos</span>
          <span class="value">${esc(ps.points_balance)}</span>
          <span class="hint">Pontos acumulados para recompensas</span>
        </div>
        <div class="card stat">
          <span class="label">Cozinha atual</span>
          <span class="value">${kitchen.emoji} ${esc(kitchen.name)}</span>
          <span class="hint">Nível ${esc(ps.kitchen_level)}</span>
        </div>
        <div class="card stat">
          <span class="label">Próxima recompensa</span>
          <span class="value" style="font-size:20px">${next ? esc(next.name) : 'Sem recompensas ativas'}</span>
          <span class="hint">${next ? esc(next.base_price) + ' pontos' : ''}</span>
          <div class="progress mt"><span style="width:${pct}%"></span></div>
        </div>
      </div>
      <div class="card">
        <div class="kitchen-title">
          <h3 style="margin:0">Sua cozinha</h3>
          <span class="pill info">Briefing de equipamentos</span>
        </div>
        <div class="kitchen-scene">
          <div class="kitchen-items">
            ${kitchen.items.map(i => `<span class="item-chip">${esc(i)}</span>`).join('')}
          </div>
        </div>
        <p class="muted small mt">Antes de cada receita, o Chefe Triix informa quais utensílios podem ser usados. Elétricos permanentes só na Cozinha Master.</p>
      </div>
      <div class="card">
        <h3>Últimas missões</h3>
        <div class="list">${recent || '<p class="muted">Nenhuma missão ainda.</p>'}</div>
      </div>`;
  }

  function renderMissions() {
    const items = (state.missions || []).map(m => `
      <div class="list-item">
        <div>
          <div class="title">${esc(m.title)}</div>
          <div class="meta">${esc(kindLabel(m.kind))} • ${esc(fmtDate(m.occurred_at))}</div>
          ${m.feedback ? `<div class="meta">${esc(m.feedback)}</div>` : ''}
        </div>
        <div class="right">
          <span class="pill ${m.points_delta >= 0 ? 'good' : 'bad'}">${m.points_delta >= 0 ? '+' : ''}${esc(m.points_delta)} pts</span>
          <div class="mt"><button class="btn small secondary" data-action="view-recipe" data-id="${esc(m.id)}">Ver receita</button></div>
        </div>
      </div>`).join('');
    let recipeHtml = '';
    if (state.selectedMissionId && state.recipe) recipeHtml = renderRecipe(state.recipe);
    return `
      <div class="card">
        <h3>Histórico de missões</h3>
        <div class="list">${items || '<p class="muted">Nenhuma missão registrada.</p>'}</div>
      </div>
      ${recipeHtml}`;
  }

  function renderRecipe(r) {
    const recipe = r.recipe || {};
    const ingredients = r.ingredients || [];
    const tips = r.tips || [];
    const products = r.products || [];
    const equipment = r.equipment || [];
    const steps = recipe.steps || [];
    const safety = recipe.safety || [];
    return `
      <div class="card">
        <h3>${esc(recipe.title || 'Receita')}</h3>
        ${recipe.yield ? `<p class="muted small">Rendimento: ${esc(recipe.yield)}</p>` : ''}
        <div class="recipe-block">
          <h4>Ingredientes</h4>
          <ul>${ingredients.map(i => `<li>${esc(i.quantity || '')} ${esc(i.unit || '')} de ${esc(i.item || '')}${i.note ? ' — ' + esc(i.note) : ''}</li>`).join('')}</ul>
        </div>
        <div class="recipe-block">
          <h4>Modo de preparo</h4>
          <ol>${steps.map(s => `<li>${esc(s.text || s)}</li>`).join('')}</ol>
        </div>
        <div class="recipe-block">
          <h4>Dicas do Chefe Triix</h4>
          <ul>${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        ${equipment.length ? `<div class="recipe-block"><h4>Utensílios</h4><ul>${equipment.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
        ${products.length ? `<div class="recipe-block"><h4>Produtos usados</h4><ul>${products.map(p => `<li>${esc(p.name)}${p.brand ? ' — ' + esc(p.brand) : ''}${p.note ? ' — ' + esc(p.note) : ''}</li>`).join('')}</ul></div>` : ''}
        ${safety.length ? `<div class="recipe-block"><h4>Segurança</h4><ul>${safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
      </div>`;
  }

  function renderStore() {
    const rewards = (state.rewards || []).filter(r => r.active);
    const cards = rewards.map(r => {
      const isEquip = r.reward_type === 'equipment';
      const modeSelect = isEquip ? `
        <div class="field">
          <label>Modo</label>
          <select id="mode-${esc(r.code)}">
            <option value="temporary">Temporário por tarefa</option>
            <option value="permanent">Permanente</option>
          </select>
        </div>` : '';
      return `
        <div class="card reward-card">
          <h3 style="margin:0">${esc(r.name)}</h3>
          <div class="reward-price">${esc(r.base_price)} pts</div>
          <div class="reward-desc">${esc(r.description || '')}</div>
          ${modeSelect}
          <button class="btn" data-action="request-reward" data-code="${esc(r.code)}" data-type="${esc(r.reward_type)}">Pedir recompensa</button>
        </div>`;
    }).join('');
    return `
      <div class="notice ok">Pedidos ficam pendentes até o Douglas aprovar. Pontos só são descontados na aprovação.</div>
      <div class="grid cols-2">${cards || '<div class="card"><p class="muted">Nenhuma recompensa ativa.</p></div>'}</div>`;
  }

  function rewardNameById(id) {
    const r = (state.rewards || []).find(x => x.id === id);
    return r ? r.name : id;
  }

  function renderPlayerOrders() {
    const rows = (state.orders || []).map(o => `
      <div class="list-item">
        <div>
          <div class="title">${esc(rewardNameById(o.reward_id))}</div>
          <div class="meta">${esc(fmtDate(o.created_at))} • ${esc(o.requested_price)} pts${o.mode ? ' • ' + esc(o.mode) : ''}</div>
          ${o.notes ? `<div class="meta">${esc(o.notes)}</div>` : ''}
        </div>
        <div class="right">
          ${statusPill(o.status)}
          ${o.status === 'pending' ? `<div class="mt"><button class="btn small bad" data-action="cancel-order" data-id="${esc(o.id)}">Cancelar</button></div>` : ''}
        </div>
      </div>`).join('');
    return `<div class="card"><h3>Meus pedidos</h3><div class="list">${rows || '<p class="muted">Nenhum pedido ainda.</p>'}</div></div>`;
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
    const playerRows = players.map(p => `
      <tr>
        <td>${esc(p.display_name)}</td>
        <td>${esc(p.points_balance)}</td>
        <td>${esc(p.kitchen_level)}</td>
        <td>${p.last_rating == null ? '—' : esc(p.last_rating)}</td>
      </tr>`).join('');
    const pendingRows = pending.map(o => `
      <div class="list-item">
        <div>
          <div class="title">${esc(o.reward_name)}</div>
          <div class="meta">${esc(playerNameById(o.player_id))} • ${esc(o.requested_price)} pts${o.mode ? ' • ' + esc(o.mode) : ''}</div>
        </div>
        <div class="right">${statusPill('pending')}</div>
      </div>`).join('');
    const recentRows = recent.map(m => `
      <div class="list-item">
        <div>
          <div class="title">${esc(m.title)}</div>
          <div class="meta">${esc(playerNameById(m.player_id))} • ${esc(fmtDate(m.occurred_at))}</div>
        </div>
        <div class="right"><span class="pill ${m.points_delta >= 0 ? 'good' : 'bad'}">${m.points_delta >= 0 ? '+' : ''}${esc(m.points_delta)} pts</span></div>
      </div>`).join('');
    return `
      <div class="grid cols-3">
        <div class="card stat"><span class="label">Jogadores</span><span class="value">${esc(players.length)}</span></div>
        <div class="card stat"><span class="label">Pedidos pendentes</span><span class="value">${esc(pending.length)}</span></div>
        <div class="card stat"><span class="label">Missões recentes</span><span class="value">${esc(recent.length)}</span></div>
      </div>
      <div class="card">
        <div class="row"><h3 style="margin:0">Jogadores</h3><span class="space"></span><button class="btn small secondary" data-action="admin-refresh">Atualizar</button></div>
        <table class="table mt">
          <thead><tr><th>Nome</th><th>Pontos</th><th>Cozinha</th><th>Última nota</th></tr></thead>
          <tbody>${playerRows || '<tr><td colspan="4" class="muted">Nenhum jogador.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="grid cols-2">
        <div class="card"><h3>Pedidos pendentes</h3><div class="list">${pendingRows || '<p class="muted">Nenhum pedido pendente.</p>'}</div></div>
        <div class="card"><h3>Missões recentes</h3><div class="list">${recentRows || '<p class="muted">Nenhuma missão recente.</p>'}</div></div>
      </div>`;
  }

  function exampleMissionPayload() {
    return {
      mission: {
        kind: 'recipe',
        title: 'Nova receita',
        occurred_at: new Date().toISOString(),
        feedback: 'Feedback da Klara e do Douglas.',
        rating: null,
        points_delta: 20,
        kitchen_level_after: 2,
        points_breakdown: [
          { label: 'Execução da receita', points: 10 },
          { label: 'Limpeza e organização', points: 5 },
          { label: 'Feedback', points: 5 }
        ]
      },
      recipe: {
        title: 'Nova receita',
        yield: 'Informar rendimento',
        equipment: ['forma média', 'tigela grande'],
        ingredients: [{ item: 'ingrediente', quantity: '1', unit: 'xic' }],
        products: [{ name: 'produto', brand: null, note: 'Confirmar rótulo' }],
        steps: [{ order: 1, text: 'Passo orientado pelo Chefe Triix.' }],
        safety: ['Tarefas quentes ficam com o adulto.'],
        tips: ['Esperar a instrução completa antes de executar.']
      }
    };
  }

  function renderAdminImport() {
    const options = (state.players || []).map(p => `<option value="${esc(p.player_id)}">${esc(p.display_name)}</option>`).join('');
    return `
      <div class="card">
        <h3>Importar missão gerada pelo Chefe Triix</h3>
        <p class="muted small">Cole o JSON da missão. O jogador selecionado será adicionado automaticamente como <code class="inline">player_id</code>.</p>
        <div class="field">
          <label for="import-player">Jogador</label>
          <select id="import-player">${options || '<option value="">Nenhum jogador</option>'}</select>
        </div>
        <div class="field">
          <label for="import-json">JSON da missão</label>
          <textarea id="import-json" placeholder="Cole aqui o JSON..."></textarea>
        </div>
        <div class="row">
          <button class="btn secondary" data-action="load-example">Carregar exemplo</button>
          <button class="btn" data-action="admin-import">Importar missão</button>
        </div>
      </div>`;
  }

  function renderAdminOrders() {
    const pending = (state.summary && state.summary.pending_orders) || [];
    const rows = pending.map(o => {
      const missionInput = o.mode === 'temporary'
        ? `<div class="field mt"><label>ID da missão para equipamento temporário</label><input class="input" id="mission-${esc(o.order_id)}" placeholder="uuid da missão" /></div>`
        : '';
      return `
        <div class="card">
          <div class="row">
            <div>
              <h3 style="margin:0">${esc(o.reward_name)}</h3>
              <div class="meta muted small">${esc(playerNameById(o.player_id))} • ${esc(o.requested_price)} pts${o.mode ? ' • ' + esc(o.mode) : ''} • ${esc(fmtDate(o.created_at))}</div>
            </div>
            <span class="space"></span>
            ${statusPill('pending')}
          </div>
          ${o.notes ? `<p class="muted small">${esc(o.notes)}</p>` : ''}
          ${missionInput}
          <div class="row mt">
            <button class="btn good" data-action="admin-approve" data-id="${esc(o.order_id)}" data-mode="${esc(o.mode || '')}">Aprovar</button>
            <button class="btn bad" data-action="admin-reject" data-id="${esc(o.order_id)}">Recusar</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="notice ok">Aprovar desconta pontos e registra no histórico. Recusar não altera saldo.</div>
      ${rows || '<div class="card"><p class="muted">Nenhum pedido pendente.</p></div>'}`;
  }

  function renderAdminAdjust() {
    const options = (state.players || []).map(p => `<option value="${esc(p.player_id)}">${esc(p.display_name)} — ${esc(p.points_balance)} pts</option>`).join('');
    return `
      <div class="card">
        <h3>Ajustar pontos manualmente</h3>
        <p class="muted small">Use apenas para correções. O motivo fica registrado no histórico.</p>
        <div class="field">
          <label for="adjust-player">Jogador</label>
          <select id="adjust-player">${options || '<option value="">Nenhum jogador</option>'}</select>
        </div>
        <div class="field">
          <label for="adjust-delta">Pontos (+ ou -)</label>
          <input class="input" id="adjust-delta" type="number" step="1" placeholder="Ex.: 5 ou -3" />
        </div>
        <div class="field">
          <label for="adjust-reason">Motivo</label>
          <input class="input" id="adjust-reason" placeholder="Ex.: correção de bônus de limpeza" />
        </div>
        <button class="btn" data-action="admin-adjust">Salvar ajuste</button>
      </div>`;
  }

  function renderAdminExport() {
    return `
      <div class="card">
        <h3>Exportar resumo para o Chefe Triix</h3>
        <p class="muted small">Gere um JSON com saldo, pedidos pendentes, missões recentes e equipamentos ativos. Você pode colar esse resumo no chat para eu consultar o estado atual.</p>
        <div class="row">
          <button class="btn" data-action="admin-export">Gerar resumo</button>
          <button class="btn secondary" data-action="copy-export">Copiar JSON</button>
        </div>
        <div class="field mt">
          <label for="export-json">Resumo</label>
          <textarea id="export-json" readonly>${esc(state.exportJson || '')}</textarea>
        </div>
      </div>`;
  }

  async function bootRealSession() {
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      state.user = null;
      state.profile = null;
      state.role = null;
      render();
      return;
    }
    state.user = session.user;
    const { data: profile, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) throw error;
    state.profile = profile;
    state.role = profile.role;
    await refreshData();
    render();
  }

  async function refreshData() {
    if (isDemoActive()) {
      loadDemoData();
      return;
    }
    if (!client || !state.user) return;
    if (state.role === 'admin') await loadAdminData();
    else await loadPlayerData();
  }

  function loadDemoData() {
    if (state.demoRole === 'admin') {
      state.players = demoData.players;
      state.summary = demoData.summary;
      state.rewards = demoData.rewards;
    } else {
      state.playerState = demoData.playerState;
      state.rewards = demoData.rewards;
      state.missions = demoData.missions;
      state.orders = demoData.orders;
    }
  }

  async function loadPlayerData() {
    const uid = state.user.id;
    const [psRes, missionsRes, rewardsRes, ordersRes] = await Promise.all([
      client.from('player_state').select('*').eq('player_id', uid).maybeSingle(),
      client.from('missions').select('*').eq('player_id', uid).order('occurred_at', { ascending: false }).limit(50),
      client.from('rewards').select('*').eq('active', true).order('base_price'),
      client.from('reward_orders').select('*').eq('player_id', uid).order('created_at', { ascending: false }).limit(50)
    ]);
    if (psRes.error) throw psRes.error;
    if (missionsRes.error) throw missionsRes.error;
    if (rewardsRes.error) throw rewardsRes.error;
    if (ordersRes.error) throw ordersRes.error;
    state.playerState = psRes.data || { points_balance: 0, kitchen_level: 2, last_rating: null };
    state.missions = missionsRes.data || [];
    state.rewards = rewardsRes.data || [];
    state.orders = ordersRes.data || [];
  }

  async function loadAdminData() {
    const [playersRes, summaryRes] = await Promise.all([
      client.rpc('admin_list_players'),
      client.rpc('admin_export_summary')
    ]);
    if (playersRes.error) throw playersRes.error;
    if (summaryRes.error) throw summaryRes.error;
    state.players = playersRes.data || [];
    state.summary = summaryRes.data || { pending_orders: [], recent_missions: [], active_equipment: [] };
  }

  async function doAction(action, el) {
    try {
      if (action === 'tab') {
        state.tab = el.dataset.tab;
        render();
        return;
      }
      if (action === 'demo-login') {
        state.demoRole = el.dataset.role;
        state.tab = 'dashboard';
        loadDemoData();
        render();
        return;
      }
      if (action === 'logout') {
        if (isDemoActive()) {
          state.demoRole = null;
          render();
          return;
        }
        if (client) await client.auth.signOut();
        state.user = null;
        state.profile = null;
        state.role = null;
        render();
        return;
      }
      if (action === 'admin-refresh') {
        await refreshData();
        render();
        toast('Dados atualizados.', 'ok');
        return;
      }
      if (action === 'load-example') {
        $('#import-json').value = JSON.stringify(exampleMissionPayload(), null, 2);
        return;
      }
      if (action === 'view-recipe') {
        await viewRecipe(el.dataset.id);
        return;
      }
      if (action === 'request-reward') {
        await requestReward(el.dataset.code, el.dataset.type);
        return;
      }
      if (action === 'cancel-order') {
        await cancelOrder(el.dataset.id);
        return;
      }
      if (action === 'admin-approve') {
        await reviewOrder(el.dataset.id, true, el.dataset.mode);
        return;
      }
      if (action === 'admin-reject') {
        await reviewOrder(el.dataset.id, false, '');
        return;
      }
      if (action === 'admin-import') {
        await importMission();
        return;
      }
      if (action === 'admin-adjust') {
        await adjustPoints();
        return;
      }
      if (action === 'admin-export') {
        await exportSummary();
        return;
      }
      if (action === 'copy-export') {
        await copyExport();
        return;
      }
    } catch (err) {
      toast(err.message || 'Erro na ação.', 'error');
    }
  }

  async function viewRecipe(missionId) {
    state.selectedMissionId = missionId;
    if (isDemoActive()) {
      state.recipe = demoData.recipe;
      render();
      return;
    }
    const { data, error } = await client.from('mission_recipes').select('*').eq('mission_id', missionId).maybeSingle();
    if (error) throw error;
    state.recipe = data;
    if (!data) toast('Esta missão não tem receita vinculada.', 'error');
    render();
  }

  async function requestReward(code, type) {
    let mode = null;
    if (type === 'equipment') {
      const sel = document.getElementById('mode-' + code);
      mode = sel ? sel.value : 'temporary';
    }
    const note = window.prompt('Observação para o Douglas (opcional):') || null;
    if (isDemoActive()) {
      toast('Demo: pedido enviado para aprovação.', 'ok');
      return;
    }
    const { error } = await client.rpc('player_request_reward', { p_reward_code: code, p_note: note, p_mode: mode });
    if (error) throw error;
    await refreshData();
    state.tab = 'orders';
    render();
    toast('Pedido enviado para aprovação.', 'ok');
  }

  async function cancelOrder(id) {
    if (isDemoActive()) {
      toast('Demo: pedido cancelado.', 'ok');
      return;
    }
    const { error } = await client.rpc('player_cancel_reward_order', { p_order_id: id });
    if (error) throw error;
    await refreshData();
    render();
    toast('Pedido cancelado.', 'ok');
  }

  async function reviewOrder(id, approve, mode) {
    let missionId = null;
    if (approve && mode === 'temporary') {
      const input = document.getElementById('mission-' + id);
      missionId = input ? input.value.trim() : '';
      if (!missionId) throw new Error('Informe o ID da missão para o equipamento temporário.');
    }
    const note = window.prompt('Observação da revisão (opcional):') || null;
    if (isDemoActive()) {
      toast(approve ? 'Demo: pedido aprovado.' : 'Demo: pedido recusado.', 'ok');
      return;
    }
    const { error } = await client.rpc('admin_review_reward_order', {
      p_order_id: id,
      p_approve: approve,
      p_note: note,
      p_mission_id: missionId
    });
    if (error) throw error;
    await refreshData();
    render();
    toast(approve ? 'Pedido aprovado.' : 'Pedido recusado.', 'ok');
  }

  async function importMission() {
    const playerId = $('#import-player').value;
    if (!playerId) throw new Error('Selecione um jogador.');
    const raw = $('#import-json').value.trim();
    if (!raw) throw new Error('Cole o JSON da missão.');
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      throw new Error('JSON inválido.');
    }
    payload.player_id = playerId;
    if (isDemoActive()) {
      toast('Demo: missão importada.', 'ok');
      return;
    }
    const { data, error } = await client.rpc('admin_import_mission', { payload });
    if (error) throw error;
    await refreshData();
    render();
    toast(data && data.status === 'already_imported' ? 'Missão já importada.' : 'Missão importada.', 'ok');
  }

  async function adjustPoints() {
    const playerId = $('#adjust-player').value;
    const delta = parseInt($('#adjust-delta').value, 10);
    const reason = $('#adjust-reason').value.trim();
    if (!playerId) throw new Error('Selecione um jogador.');
    if (!Number.isFinite(delta) || delta === 0) throw new Error('Informe pontos diferentes de zero.');
    if (!reason) throw new Error('Informe o motivo.');
    if (isDemoActive()) {
      toast('Demo: ajuste registrado.', 'ok');
      return;
    }
    const { error } = await client.rpc('admin_adjust_points', { p_player_id: playerId, p_delta: delta, p_reason: reason });
    if (error) throw error;
    await refreshData();
    render();
    toast('Ajuste registrado.', 'ok');
  }

  async function exportSummary() {
    if (isDemoActive()) {
      state.exportJson = JSON.stringify(demoData.summary, null, 2);
      render();
      return;
    }
    const { data, error } = await client.rpc('admin_export_summary');
    if (error) throw error;
    state.exportJson = JSON.stringify(data, null, 2);
    render();
    toast('Resumo gerado.', 'ok');
  }

  async function copyExport() {
    const text = state.exportJson || ($('#export-json') ? $('#export-json').value : '');
    if (!text) {
      toast('Gere o resumo primeiro.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('JSON copiado.', 'ok');
    } catch (_) {
      const ta = $('#export-json');
      if (ta) {
        ta.select();
        document.execCommand('copy');
        toast('JSON copiado.', 'ok');
      }
    }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    doAction(el.dataset.action, el);
  });
  signoutBtn.addEventListener('click', () => doAction('logout', signoutBtn));

  async function init() {
    if (forceDemo) {
      notice('Modo de demonstração ativo pela URL. Nenhum dado real será alterado.', '');
      render();
      return;
    }
    if (!configured) {
      notice('Modo de demonstração ativo. Para conectar ao Supabase, edite <code class="inline">config.js</code>.', '');
      render();
      return;
    }
    if (!client) {
      notice('Não foi possível carregar o cliente Supabase. Verifique a conexão e o CDN.', 'error');
      render();
      return;
    }
    try {
      await bootRealSession();
      client.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          state.user = null;
          state.profile = null;
          state.role = null;
          render();
        }
      });
    } catch (err) {
      notice('Erro ao iniciar sessão: ' + esc(err.message || String(err)), 'error');
      render();
    }
  }

  init();
})();
