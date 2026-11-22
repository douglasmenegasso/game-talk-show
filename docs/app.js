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
  const options = (state.players || []).map(p =>
    '<option value="' + esc(p.player_id) + '">' + esc(p.display_name) + '</option>'
  ).join('');
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
